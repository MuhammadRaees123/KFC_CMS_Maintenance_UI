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
type ListMode = "assigned" | "available";
type TechnicianActionType =
  | "Pending"
  | "WorkLoad"
  | "SparePartRequired"
  | "JobTimeChanged";
type MaintenanceRow = Record<string, unknown>;

const BranchAgentTasks: React.FC = () => {
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [availableRows, setAvailableRows] = useState<MaintenanceRow[]>([]);
  const [listMode, setListMode] = useState<ListMode>("assigned");
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

  const fetchAssignedList = async () => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "Unable to determine the logged-in user.",
        variant: "destructive",
      });
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const res = await getMaintenanceList({
        branchId: branchId ? Number(branchId) : null,
        status: status || null,
        priority: priority || null,
        assignedTo: currentUserId,
        search: search || null,
      });
      const data = Array.isArray(res.data)
        ? (res.data as MaintenanceRow[])
        : [];
      setRows(
        data.filter(
          (row) =>
            Number(pickField(row, "assignedTo", "AssignedTo")) ===
            currentUserId,
        ),
      );
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load assigned tasks."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableList = async () => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "Unable to determine the logged-in user.",
        variant: "destructive",
      });
      setAvailableRows([]);
      return;
    }

    setLoading(true);
    try {
      const res = await getAvailableMaintenanceComplaints();
      let data = Array.isArray(res.data)
        ? (res.data as MaintenanceRow[])
        : [];

      if (branchId) {
        const branchFilter = Number(branchId);
        data = data.filter(
          (row) =>
            Number(pickField(row, "branchId", "BranchId")) === branchFilter,
        );
      }
      if (priority) {
        data = data.filter(
          (row) =>
            String(pickField(row, "priority", "Priority") || "") === priority,
        );
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        data = data.filter((row) => {
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

      setAvailableRows(data);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load available complaints.",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchList = async () => {
    setPageNumber(1);
    if (listMode === "available") {
      await fetchAvailableList();
    } else {
      await fetchAssignedList();
    }
  };

  const refreshBothLists = async () => {
    setPageNumber(1);
    if (!currentUserId) return;

    setLoading(true);
    try {
      const [assignedRes, availableRes] = await Promise.all([
        getMaintenanceList({
          branchId: branchId ? Number(branchId) : null,
          status: status || null,
          priority: priority || null,
          assignedTo: currentUserId,
          search: search || null,
        }),
        getAvailableMaintenanceComplaints(),
      ]);

      const assignedData = Array.isArray(assignedRes.data)
        ? (assignedRes.data as MaintenanceRow[])
        : [];
      setRows(
        assignedData.filter(
          (row) =>
            Number(pickField(row, "assignedTo", "AssignedTo")) ===
            currentUserId,
        ),
      );

      let availableData = Array.isArray(availableRes.data)
        ? (availableRes.data as MaintenanceRow[])
        : [];
      if (branchId) {
        const branchFilter = Number(branchId);
        availableData = availableData.filter(
          (row) =>
            Number(pickField(row, "branchId", "BranchId")) === branchFilter,
        );
      }
      if (priority) {
        availableData = availableData.filter(
          (row) =>
            String(pickField(row, "priority", "Priority") || "") === priority,
        );
      }
      setAvailableRows(availableData);
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
      setListMode("assigned");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to accept complaint.",
        ),
        variant: "destructive",
      });
      await fetchAvailableList();
    } finally {
      setAcceptingId(null);
    }
  };

  useEffect(() => {
    loadBranches();
    fetchAssignedList();
    fetchAvailableList();
    loadUsers();
    // Mount-only load, matching Maintenance.tsx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPageNumber(1);
  }, [rows, availableRows, listMode]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const dateA = new Date(
          String(pickField(a, "assignedDate", "AssignedDate") || ""),
        ).getTime();
        const dateB = new Date(
          String(pickField(b, "assignedDate", "AssignedDate") || ""),
        ).getTime();
        const safeA = Number.isFinite(dateA) ? dateA : 0;
        const safeB = Number.isFinite(dateB) ? dateB : 0;
        return safeB - safeA;
      }),
    [rows],
  );

  const sortedAvailableRows = useMemo(
    () =>
      [...availableRows].sort((a, b) => {
        const dateA = new Date(
          String(pickField(a, "reportedDate", "ReportedDate") || ""),
        ).getTime();
        const dateB = new Date(
          String(pickField(b, "reportedDate", "ReportedDate") || ""),
        ).getTime();
        const safeA = Number.isFinite(dateA) ? dateA : 0;
        const safeB = Number.isFinite(dateB) ? dateB : 0;
        return safeB - safeA;
      }),
    [availableRows],
  );

  const activeRows =
    listMode === "available" ? sortedAvailableRows : sortedRows;
  const totalRecords = activeRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, totalPages);
  const pagedRows = activeRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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
          Branch Agent Tasks
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={listMode === "assigned" ? "kfc-btn" : "kfc-btn-outline"}
          onClick={() => {
            setListMode("assigned");
            setPageNumber(1);
          }}
        >
          My Assigned ({rows.length})
        </button>
        <button
          type="button"
          className={listMode === "available" ? "kfc-btn" : "kfc-btn-outline"}
          onClick={() => {
            setListMode("available");
            setPageNumber(1);
            void fetchAvailableList();
          }}
        >
          Available Complaints ({availableRows.length})
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
          {listMode === "assigned" && (
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
          )}
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
              onClick={fetchList}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {listMode === "available"
            ? "Available Complaints"
            : "My Assigned Requests"}
        </div>
        <div className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
          ) : listMode === "available" ? (
            <table className="min-w-full border text-sm">
              <thead className="bg-[#fff6f6] text-[#bc3342]">
                <tr>
                  <th className="border px-3 py-2 text-left">Request #</th>
                  <th className="border px-3 py-2 text-left">Title</th>
                  <th className="border px-3 py-2 text-left">Item</th>
                  <th className="border px-3 py-2 text-left">Category / Trade</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-left">Priority</th>
                  <th className="border px-3 py-2 text-left">Status</th>
                  <th className="border px-3 py-2 text-left">Reported</th>
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
                    const categoryName =
                      pickField(row, "categoryName", "CategoryName") || "-";
                    const tradeName =
                      pickField(row, "tradeName", "TradeName") || "";
                    return (
                      <tr key={requestId} className="hover:bg-gray-50">
                        <td className="border px-3 py-1.5">{requestId}</td>
                        <td className="border px-3 py-1.5 font-medium">
                          <div>{pickField(row, "title", "Title") || "-"}</div>
                          {pickField(row, "description", "Description") ? (
                            <div className="text-xs text-gray-500 line-clamp-2">
                              {String(
                                pickField(row, "description", "Description"),
                              )}
                            </div>
                          ) : null}
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
                          {tradeName
                            ? `${categoryName} / ${tradeName}`
                            : categoryName}
                        </td>
                        <td className="border px-3 py-1.5">
                          {branchName(
                            pickField<number>(row, "branchId", "BranchId"),
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
                            pickField(row, "reportedDate", "ReportedDate"),
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
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No available complaints for your trades.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-[#fff6f6] text-[#bc3342]">
                <tr>
                  <th className="border px-3 py-2 text-left">Request #</th>
                  <th className="border px-3 py-2 text-left">Title</th>
                  <th className="border px-3 py-2 text-left">Item</th>
                  <th className="border px-3 py-2 text-left">Serial</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-left">Technician</th>
                  <th className="border px-3 py-2 text-left">Job Time</th>
                  <th className="border px-3 py-2 text-left">Priority</th>
                  <th className="border px-3 py-2 text-left">Status</th>
                  <th className="border px-3 py-2 text-left">Assigned Date</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length > 0 ? (
                  pagedRows.map((row) => {
                    const requestId = pickField(
                      row,
                      "maintenanceRequestId",
                      "MaintenanceRequestId",
                    );
                    const rowStatus = pickField<string>(
                      row,
                      "status",
                      "Status",
                    );
                    const canAction =
                      rowStatus === "Assigned" ||
                      rowStatus === "InProgress" ||
                      isTechnicianWorkStatus(rowStatus);
                    const remaining = calculateRemainingJobTime(
                      pickField(row, "assignedDate", "AssignedDate"),
                      pickField(row, "jobTimeHours", "JobTimeHours"),
                      rowStatus,
                      pickField(row, "completedDate", "CompletedDate"),
                      now
                    );
                    return (
                      <tr
                        key={requestId}
                        className={complaintRowClassName(remaining.isExpired)}
                      >
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
                          {pickField(row, "assignedToName", "AssignedToName") ||
                            pickField(row, "assignedTo", "AssignedTo") ||
                            "-"}
                        </td>
                        <td className="border px-3 py-1.5">
                          {formatJobTime(
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
                            pickField(row, "assignedDate", "AssignedDate"),
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
                                onClick={() => openAction("technician", row)}
                              >
                                Action
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No assigned maintenance tasks found.
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
