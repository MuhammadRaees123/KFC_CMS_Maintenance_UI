import React, { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Eye, Loader2, RefreshCcw } from "lucide-react";
import {
  acceptMaintenanceComplaint,
  completeMaintenanceRepair,
  getAvailableMaintenanceComplaints,
  getBranchesForDashboard,
  getMaintenanceById,
  getMaintenanceHistory,
  getMaintenanceList,
  startMaintenance,
  updateMaintenanceTechnicianStatus,
  getUsers,
} from "@/services/api";
import { getCurrentUser } from "@/types/auth";
import InventoryModal from "./components/InventoryModal";
import MaintenanceImagePicker from "./components/MaintenanceImagePicker";
import MaintenanceReadOnlyView from "./components/MaintenanceReadOnlyView";
import StatusBadge from "./components/StatusBadge";
import {
  apiErrorMessage,
  calculateRemainingJobTime,
  complaintRowClassName,
  formatDateTime,
  formatJobTime,
  isTechnicianWorkStatus,
  JOB_TIME_OPTIONS,
  parseJobTimeHours,
  pickField,
  PRIORITIES,
} from "./constants";

const PAGE_SIZE = 10;

type ActionKind = "start" | "complete" | "technician" | null;
type TaskSource = "assigned" | "available";
type TechnicianActionType =
  | "Pending"
  | "WorkLoad"
  | "SparePartRequired"
  | "JobTimeChanged";
type MaintenanceRow = Record<string, unknown>;
type UnifiedTaskRow = MaintenanceRow & { __source: TaskSource };

const maintenanceRowsFromResponse = (data: unknown): MaintenanceRow[] => {
  if (Array.isArray(data)) return data as MaintenanceRow[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as { data: MaintenanceRow[] }).data;
  }
  return [];
};

const requestIdOf = (row: MaintenanceRow): number => {
  const id = Number(
    pickField(row, "maintenanceRequestId", "MaintenanceRequestId"),
  );
  return Number.isFinite(id) && id > 0 ? id : 0;
};

/** First parseable date among camelCase/PascalCase candidates; 0 if none. */
const rowDateMs = (row: MaintenanceRow, keys: string[]): number => {
  for (const key of keys) {
    const raw = (row as Record<string, unknown>)[key];
    if (raw === null || raw === undefined || raw === "") continue;
    const ms = new Date(raw as string | number | Date).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  return 0;
};

const sortNewestFirst = (
  list: UnifiedTaskRow[],
  dateKeys: string[],
): UnifiedTaskRow[] =>
  [...list].sort((a, b) => {
    const dateDiff = rowDateMs(b, dateKeys) - rowDateMs(a, dateKeys);
    if (dateDiff !== 0) return dateDiff;
    return requestIdOf(b) - requestIdOf(a);
  });

const BranchAgentTasks: React.FC = () => {
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [availableRows, setAvailableRows] = useState<MaintenanceRow[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [userNameMap, setUserNameMap] = useState<Map<number, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  const [actionKind, setActionKind] = useState<ActionKind>(null);
  const [actionRow, setActionRow] = useState<MaintenanceRow | null>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [comments, setComments] = useState("");
  const [resolution, setResolution] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [technicianAction, setTechnicianAction] =
    useState<TechnicianActionType>("Pending");
  const [jobTimeHours, setJobTimeHours] = useState("");
  const [customJobTime, setCustomJobTime] = useState("");
  const [requiredSparePart, setRequiredSparePart] = useState("");
  const [actionImage, setActionImage] = useState<File | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewDetail, setViewDetail] = useState<MaintenanceRow | null>(null);
  const [viewHistory, setViewHistory] = useState<MaintenanceRow[]>([]);
  const [viewRequestId, setViewRequestId] = useState<number | null>(null);

  const currentUserId = Number(getCurrentUser()?.id);

  const branchName = (id?: number | null) => {
    if (!id) return "-";
    return branches.find((b) => b.id === id)?.name || `Branch ${id}`;
  };

  const loadBranches = async () => {
    try {
      const res = await getBranchesForDashboard();
      const data = Array.isArray(res.data) ? res.data : [];
      setBranches(
        data.map((b: MaintenanceRow) => ({
          id: Number(b.id ?? b.BranchID ?? b.branchId),
          name: String(
            b.name ?? b.BranchName ?? b.branchName ?? `Branch ${b.id}`,
          ),
        })),
      );
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load branches."),
        variant: "destructive",
      });
    }
  };

  const loadUsers = async () => {
    try {
      const userRes = await getUsers();
      const users = Array.isArray(userRes.data) ? userRes.data : [];
      const map = new Map<number, string>();

      users.forEach((user: MaintenanceRow) => {
        const userId = Number(user.id ?? user.Id);
        if (!Number.isFinite(userId) || userId <= 0) return;

        const userName = String(
          user.userName ?? user.UserName ?? user.name ?? user.Name ?? "",
        ).trim();

        if (userName) map.set(userId, userName);
      });

      setUserNameMap(map);
    } catch {
      setUserNameMap(new Map());
    }
  };

  const actionByName = (id?: number | null) => {
    if (id === null || id === undefined || !Number.isFinite(Number(id))) {
      return "-";
    }

    const numericId = Number(id);
    if (numericId <= 0) return "-";

    return userNameMap.get(numericId) || String(numericId);
  };

  const applyAvailableClientFilters = (data: MaintenanceRow[]) => {
    let filtered = data;
    if (branchId) {
      const branchFilter = Number(branchId);
      filtered = filtered.filter(
        (row) =>
          Number(pickField(row, "branchId", "BranchId")) === branchFilter,
      );
    }
    if (priority) {
      filtered = filtered.filter(
        (row) =>
          String(pickField(row, "priority", "Priority") || "") === priority,
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((row) => {
        const hay = [
          pickField(row, "title", "Title"),
          pickField(row, "itemName", "ItemName"),
          pickField(row, "itemCode", "ItemCode"),
          pickField(row, "serialNumber", "SerialNumber"),
          pickField(row, "description", "Description"),
          pickField(row, "categoryName", "CategoryName"),
          pickField(row, "tradeName", "TradeName"),
        ]
          .map((v) => String(v ?? "").toLowerCase())
          .join(" ");
        return hay.includes(q);
      });
    }
    return filtered;
  };

  const refreshBothLists = async (options?: { resetPage?: boolean }) => {
    const resetPage = options?.resetPage !== false;
    if (resetPage) {
      setPageNumber(1);
    }

    if (!currentUserId) {
      toast({
        title: "Error",
        description: "Unable to determine the logged-in user.",
        variant: "destructive",
      });
      setRows([]);
      setAvailableRows([]);
      return;
    }

    setLoading(true);
    try {
      const [assignedRes, availableRes] = await Promise.all([
        getMaintenanceList({
          branchId: branchId ? Number(branchId) : null,
          status: status || null,
          priority: priority || null,
          assignedTo: currentUserId,
          search: search || null,
          // Unpaged fetch — frontend owns unified pagination.
          pageNumber: null,
          pageSize: null,
        }),
        getAvailableMaintenanceComplaints(),
      ]);

      const assignedData = maintenanceRowsFromResponse(assignedRes.data).filter(
        (row) =>
          Number(pickField(row, "assignedTo", "AssignedTo")) === currentUserId,
      );
      setRows(assignedData);

      const availableData = maintenanceRowsFromResponse(availableRes.data);
      setAvailableRows(applyAvailableClientFilters(availableData));
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to refresh complaint lists."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchList = async () => {
    await refreshBothLists({ resetPage: true });
  };

  const acceptComplaint = async (row: MaintenanceRow) => {
    const requestId = Number(
      pickField(row, "maintenanceRequestId", "MaintenanceRequestId"),
    );
    if (!requestId || acceptingId) return;

    setAcceptingId(requestId);
    try {
      await acceptMaintenanceComplaint(requestId, { JobTimeHours: 2 });
      toast({
        title: "Success",
        description: "Complaint accepted successfully.",
      });
      await refreshBothLists();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to accept complaint.",
        ),
        variant: "destructive",
      });
      await refreshBothLists();
    } finally {
      setAcceptingId(null);
    }
  };

  useEffect(() => {
    loadBranches();
    void refreshBothLists({ resetPage: true });
    loadUsers();
    // Mount-only load, matching Maintenance.tsx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const unifiedRows = useMemo(() => {
    const assignedIds = new Set<number>();
    const assignedList: UnifiedTaskRow[] = [];

    rows.forEach((row) => {
      const requestId = requestIdOf(row);
      if (requestId > 0) assignedIds.add(requestId);
      assignedList.push({ ...row, __source: "assigned" });
    });

    const sortedAssignedRows = sortNewestFirst(assignedList, [
      "assignedDate",
      "AssignedDate",
      "reportedDate",
      "ReportedDate",
    ]);

    const availableList: UnifiedTaskRow[] = [];
    availableRows.forEach((row) => {
      const requestId = requestIdOf(row);
      // Prefer assigned when the same complaint appears in both datasets.
      if (requestId > 0 && assignedIds.has(requestId)) return;
      // Status filter is for My Assigned only (Open/Approved available rows
      // must remain visible after assigned rows in the unified list).
      availableList.push({ ...row, __source: "available" });
    });

    const sortedAvailableRows = sortNewestFirst(availableList, [
      "reportedDate",
      "ReportedDate",
      "createdDate",
      "CreatedDate",
    ]);

    return [...sortedAssignedRows, ...sortedAvailableRows];
  }, [rows, availableRows]);

  const totalRecords = unifiedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE) || 1);
  const currentPage = Math.min(Math.max(1, pageNumber), totalPages);
  const pagedRows = unifiedRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Clamp only when the current page exceeds the new page count (e.g. after filters).
  // Do not reset to page 1 on every rows/availableRows refresh — that broke pagination.
  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);

  const openAction = (kind: ActionKind, row: MaintenanceRow) => {
    setActionKind(kind);
    setActionRow(row);
    setComments("");
    setResolution("");
    setActualCost("");
    setTechnicianAction("Pending");
    setJobTimeHours("");
    setCustomJobTime("");
    setRequiredSparePart("");
    setActionImage(null);
  };

  const openView = async (row: MaintenanceRow) => {
    const requestId = Number(
      pickField(row, "maintenanceRequestId", "MaintenanceRequestId"),
    );
    if (!requestId) return;

    setViewOpen(true);
    setViewRequestId(requestId);
    setViewLoading(true);
    setViewDetail(null);
    setViewHistory([]);

    try {
      const detailRes = await getMaintenanceById(requestId);
      setViewDetail((detailRes.data || null) as MaintenanceRow | null);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load complaint details.",
        ),
        variant: "destructive",
      });
      setViewOpen(false);
      setViewLoading(false);
      return;
    }

    try {
      const historyRes = await getMaintenanceHistory(requestId);
      setViewHistory(
        Array.isArray(historyRes.data)
          ? (historyRes.data as MaintenanceRow[])
          : [],
      );
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load complaint history.",
        ),
        variant: "destructive",
      });
      setViewHistory([]);
    } finally {
      setViewLoading(false);
    }
  };

  const selectedJobTimeHours = () => {
    if (jobTimeHours === "custom") return parseJobTimeHours(customJobTime);
    return parseJobTimeHours(jobTimeHours);
  };

  const submitAction = async () => {
    const requestId = Number(
      pickField(actionRow, "maintenanceRequestId", "MaintenanceRequestId"),
    );
    if (!requestId) return;

    setActionSaving(true);
    try {
      let message: string | undefined;
      if (actionKind === "start") {
        const formData = new FormData();
        if (comments.trim()) {
          formData.append("Comments", comments.trim());
        }
        if (actionImage) {
          formData.append("beforeImage", actionImage);
        }
        const res = await startMaintenance(requestId, formData);
        message = res.data?.message;
      } else if (actionKind === "complete") {
        if (!resolution.trim()) {
          toast({
            title: "Validation",
            description: "Resolution is required.",
            variant: "destructive",
          });
          setActionSaving(false);
          return;
        }
        if (actualCost && Number(actualCost) < 0) {
          toast({
            title: "Validation",
            description: "Actual cost cannot be negative.",
            variant: "destructive",
          });
          setActionSaving(false);
          return;
        }
        const formData = new FormData();
        formData.append("Resolution", resolution.trim());
        if (actualCost) {
          formData.append("ActualCost", String(Number(actualCost)));
        }
        if (comments.trim()) {
          formData.append("Comments", comments.trim());
        }
        if (actionImage) {
          formData.append("afterImage", actionImage);
        }
        const res = await completeMaintenanceRepair(requestId, formData);
        message = res.data?.message;
      } else if (actionKind === "technician") {
        if (!comments.trim()) {
          toast({
            title: "Validation",
            description: "Notes are required.",
            variant: "destructive",
          });
          setActionSaving(false);
          return;
        }

        let hours: number | null = null;
        if (
          technicianAction === "WorkLoad" ||
          technicianAction === "JobTimeChanged"
        ) {
          hours = selectedJobTimeHours();
          if (!hours) {
            toast({
              title: "Validation",
              description:
                "Job Time is required and must be between 1 and 72 hours.",
              variant: "destructive",
            });
            setActionSaving(false);
            return;
          }
        }

        if (technicianAction === "JobTimeChanged") {
          const currentHours = Number(
            pickField(actionRow, "jobTimeHours", "JobTimeHours"),
          );
          if (currentHours && hours === currentHours) {
            toast({
              title: "Validation",
              description:
                "New Job Time must be different from the current Job Time.",
              variant: "destructive",
            });
            setActionSaving(false);
            return;
          }
        }

        if (
          technicianAction === "SparePartRequired" &&
          !requiredSparePart.trim()
        ) {
          toast({
            title: "Validation",
            description: "Required spare part is required.",
            variant: "destructive",
          });
          setActionSaving(false);
          return;
        }

        const res = await updateMaintenanceTechnicianStatus(requestId, {
          ActionType: technicianAction,
          Notes: comments.trim(),
          JobTimeHours: hours,
          RequiredSparePart:
            technicianAction === "SparePartRequired"
              ? requiredSparePart.trim()
              : null,
        });
        message = res.data?.message;
      } else {
        setActionSaving(false);
        return;
      }

      toast({
        title: "Success",
        description: message || "Action completed successfully.",
      });
      setActionKind(null);
      setActionRow(null);
      setActionImage(null);
      await fetchList();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Action failed."),
        variant: "destructive",
      });
    } finally {
      setActionSaving(false);
    }
  };

  const actionTitle =
    actionKind === "start"
      ? pickField<string>(actionRow, "status", "Status") === "Assigned"
        ? "Start Maintenance"
        : "Resume Maintenance"
      : actionKind === "complete"
        ? "Complete Repair"
        : actionKind === "technician"
          ? "Technician Action"
          : "";

  const statusFilterOptions = [
    // ...MAINTENANCE_STATUSES,
    // "Open",
    // "Approved",
    "Assigned",
    "InProgress",
    "Pending",
    "WorkLoad",
    "SparePartRequired",
    "Repaired",
    "Closed",
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#bc3342]">
          Technician Complaint Tasks
        </h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={fetchList}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Filters</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="kfc-label">Branch</label>
            <select
              className="kfc-input"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Status</label>
            <select
              className="kfc-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              {statusFilterOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Priority</label>
            <select
              className="kfc-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Search</label>
            <input
              className="kfc-input"
              placeholder="Title / serial / item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="kfc-btn w-full"
              onClick={() => void fetchList()}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          My Tasks ({rows.length} assigned, {availableRows.length} available)
        </div>
        <div className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-[#fff6f6] text-[#bc3342]">
                <tr>
                  <th className="border px-3 py-2 text-left">Type</th>
                  <th className="border px-3 py-2 text-left">Request #</th>
                  <th className="border px-3 py-2 text-left">Title</th>
                  <th className="border px-3 py-2 text-left">Item</th>
                  <th className="border px-3 py-2 text-left">Serial</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-left">Category / Trade</th>
                  <th className="border px-3 py-2 text-left">Job Time</th>
                  <th className="border px-3 py-2 text-left">Priority</th>
                  <th className="border px-3 py-2 text-left">Status</th>
                  <th className="border px-3 py-2 text-left">Date</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length > 0 ? (
                  pagedRows.map((row) => {
                    const requestId = Number(
                      pickField(
                        row,
                        "maintenanceRequestId",
                        "MaintenanceRequestId",
                      ),
                    );
                    const rowStatus = pickField<string>(
                      row,
                      "status",
                      "Status",
                    );
                    const isAvailable = row.__source === "available";
                    const canAction =
                      !isAvailable &&
                      (rowStatus === "Assigned" ||
                        rowStatus === "InProgress" ||
                        isTechnicianWorkStatus(rowStatus));
                    const remaining = calculateRemainingJobTime(
                      pickField(row, "assignedDate", "AssignedDate"),
                      pickField(row, "jobTimeHours", "JobTimeHours"),
                      rowStatus,
                      pickField(row, "completedDate", "CompletedDate"),
                      now,
                    );
                    const categoryName =
                      pickField(row, "categoryName", "CategoryName") || "-";
                    const tradeName =
                      pickField(row, "tradeName", "TradeName") || "";
                    return (
                      <tr
                        key={`${row.__source}-${requestId}`}
                        className={
                          isAvailable
                            ? "hover:bg-gray-50"
                            : complaintRowClassName(remaining.isExpired)
                        }
                      >
                        <td className="border px-3 py-1.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              isAvailable
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {isAvailable ? "Available" : "My Assigned"}
                          </span>
                        </td>
                        <td className="border px-3 py-1.5">{requestId}</td>
                        <td className="border px-3 py-1.5 font-medium">
                          {pickField(row, "title", "Title") || "-"}
                        </td>
                        <td className="border px-3 py-1.5">
                          <div>
                            {pickField(row, "itemName", "ItemName") || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pickField(row, "itemCode", "ItemCode")}
                          </div>
                        </td>
                        <td className="border px-3 py-1.5">
                          {pickField(row, "serialNumber", "SerialNumber") ||
                            "-"}
                        </td>
                        <td className="border px-3 py-1.5">
                          {branchName(
                            pickField<number>(row, "branchId", "BranchId"),
                          )}
                        </td>
                        <td className="border px-3 py-1.5">
                          {tradeName
                            ? `${categoryName} / ${tradeName}`
                            : categoryName}
                        </td>
                        <td className="border px-3 py-1.5">
                          {isAvailable
                            ? "-"
                            : formatJobTime(
                                pickField(row, "jobTimeHours", "JobTimeHours"),
                              )}
                        </td>
                        <td className="border px-3 py-1.5">
                          <StatusBadge
                            value={pickField<string>(
                              row,
                              "priority",
                              "Priority",
                            )}
                            kind="priority"
                          />
                        </td>
                        <td className="border px-3 py-1.5">
                          <StatusBadge value={rowStatus} />
                        </td>
                        <td className="border px-3 py-1.5">
                          {formatDateTime(
                            isAvailable
                              ? pickField(row, "reportedDate", "ReportedDate")
                              : pickField(row, "assignedDate", "AssignedDate"),
                          )}
                        </td>
                        <td className="border px-3 py-1.5">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            <button
                              type="button"
                              title="View"
                              className="kfc-btn-outline p-1.5 rounded-md"
                              onClick={() => openView(row)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {isAvailable ? (
                              <button
                                type="button"
                                className="kfc-btn"
                                disabled={acceptingId === requestId}
                                onClick={() => acceptComplaint(row)}
                              >
                                {acceptingId === requestId ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Accepting...
                                  </span>
                                ) : (
                                  "Accept Complaint"
                                )}
                              </button>
                            ) : (
                              <>
                                {rowStatus === "Assigned" && (
                                  <button
                                    type="button"
                                    className="kfc-btn"
                                    onClick={() => openAction("start", row)}
                                  >
                                    Start
                                  </button>
                                )}
                                {isTechnicianWorkStatus(rowStatus) && (
                                  <button
                                    type="button"
                                    className="kfc-btn"
                                    onClick={() => openAction("start", row)}
                                  >
                                    Resume
                                  </button>
                                )}
                                {rowStatus === "InProgress" && (
                                  <button
                                    type="button"
                                    className="kfc-btn"
                                    onClick={() => openAction("complete", row)}
                                  >
                                    Complete Repair
                                  </button>
                                )}
                                {canAction && (
                                  <button
                                    type="button"
                                    className="kfc-btn-outline"
                                    onClick={() =>
                                      openAction("technician", row)
                                    }
                                  >
                                    Action
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={12}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No assigned or available maintenance tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {!loading && totalRecords > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 text-sm">
            <span>Total records: {totalRecords}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => setPageNumber(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onClick={() => setPageNumber(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {actionKind && actionRow && (
        <InventoryModal
          title={actionTitle}
          onClose={() => {
            setActionKind(null);
            setActionImage(null);
          }}
        >
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-3 bg-gray-50">
              <div>
                <strong>Request #:</strong>{" "}
                {pickField(
                  actionRow,
                  "maintenanceRequestId",
                  "MaintenanceRequestId",
                )}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <StatusBadge
                  value={pickField<string>(actionRow, "status", "Status")}
                />
              </div>
              <div className="md:col-span-2">
                <strong>Title:</strong>{" "}
                {pickField(actionRow, "title", "Title") || "-"}
              </div>
              <div>
                <strong>Technician:</strong>{" "}
                {pickField(actionRow, "assignedToName", "AssignedToName") ||
                  pickField(actionRow, "assignedTo", "AssignedTo") ||
                  "-"}
              </div>
              <div>
                <strong>Job Time:</strong>{" "}
                {formatJobTime(
                  pickField(actionRow, "jobTimeHours", "JobTimeHours"),
                )}
              </div>
            </div>

            {actionKind === "complete" && (
              <>
                <div>
                  <label className="kfc-label">Resolution</label>
                  <textarea
                    className="kfc-input min-h-[80px]"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
                <div>
                  <label className="kfc-label">Actual Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="kfc-input"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                  />
                </div>
                <MaintenanceImagePicker
                  label="After Image"
                  file={actionImage}
                  onChange={setActionImage}
                  onError={(message) =>
                    toast({
                      title: "Validation",
                      description: message,
                      variant: "destructive",
                    })
                  }
                />
              </>
            )}

            {actionKind === "start" && (
              <MaintenanceImagePicker
                label="Before Image"
                file={actionImage}
                onChange={setActionImage}
                onError={(message) =>
                  toast({
                    title: "Validation",
                    description: message,
                    variant: "destructive",
                  })
                }
              />
            )}

            {actionKind === "technician" && (
              <>
                <div>
                  <label className="kfc-label">Status</label>
                  <select
                    className="kfc-input"
                    value={technicianAction}
                    onChange={(e) =>
                      setTechnicianAction(
                        e.target.value as TechnicianActionType,
                      )
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="WorkLoad">Work Load</option>
                    <option value="SparePartRequired">
                      Spare Part Required
                    </option>
                    <option value="JobTimeChanged">Change Job Time</option>
                  </select>
                </div>

                {technicianAction === "JobTimeChanged" && (
                  <div>
                    <label className="kfc-label">Current Job Time</label>
                    <input
                      className="kfc-input"
                      value={formatJobTime(
                        pickField(actionRow, "jobTimeHours", "JobTimeHours"),
                      )}
                      readOnly
                    />
                  </div>
                )}

                {(technicianAction === "WorkLoad" ||
                  technicianAction === "JobTimeChanged") && (
                  <>
                    <div>
                      <label className="kfc-label">
                        {technicianAction === "JobTimeChanged"
                          ? "New Job Time"
                          : "Job Time"}
                      </label>
                      <select
                        className="kfc-input"
                        value={jobTimeHours}
                        onChange={(e) => setJobTimeHours(e.target.value)}
                      >
                        <option value="">-- Select Job Time --</option>
                        {JOB_TIME_OPTIONS.map((hours) => (
                          <option key={hours} value={String(hours)}>
                            {hours} Hours
                          </option>
                        ))}
                        <option value="custom">Other</option>
                      </select>
                    </div>
                    {jobTimeHours === "custom" && (
                      <div>
                        <label className="kfc-label">
                          Custom Job Time (hours)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="72"
                          step="1"
                          className="kfc-input"
                          value={customJobTime}
                          onChange={(e) => setCustomJobTime(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                {technicianAction === "SparePartRequired" && (
                  <div>
                    <label className="kfc-label">Required Spare Part</label>
                    <input
                      className="kfc-input"
                      value={requiredSparePart}
                      onChange={(e) => setRequiredSparePart(e.target.value)}
                      placeholder="e.g. Motor belt"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="kfc-label">
                {actionKind === "technician" ? "Notes" : "Comments"}
              </label>
              <textarea
                className="kfc-input min-h-[70px]"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                onClick={() => {
                  setActionKind(null);
                  setActionImage(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving}
                onClick={submitAction}
              >
                {actionSaving
                  ? "Processing..."
                  : actionKind === "technician"
                    ? "Save"
                    : "Confirm"}
              </button>
            </div>
          </div>
        </InventoryModal>
      )}

      {viewOpen && (
        <InventoryModal
          title={`Complaint #${viewRequestId ?? ""}`}
          onClose={() => setViewOpen(false)}
          wide
        >
          {viewLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
          ) : (
            <MaintenanceReadOnlyView
              detail={viewDetail}
              history={viewHistory}
              branchName={branchName}
              actionByName={actionByName}
            />
          )}
        </InventoryModal>
      )}
    </div>
  );
};

export default BranchAgentTasks;
