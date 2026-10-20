import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2, RefreshCcw, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { approveMaintenance, assignMaintenance, closeMaintenance, createMaintenanceComplaint, getBranchesForDashboard,
  getInventoryAssets, getInventoryCategories, getMaintenanceAssignUsers, getMaintenanceById, getMaintenanceHistoryByInventoryItem,
  getMaintenanceList, getUsers,} from "@/services/api";

import { getCurrentUser } from "@/types/auth";
import InventoryModal from "./components/InventoryModal";
import MaintenanceImagePicker from "./components/MaintenanceImagePicker";
import MaintenanceReadOnlyView from "./components/MaintenanceReadOnlyView";
import StatusBadge from "./components/StatusBadge";

import { apiErrorMessage, calculateRemainingJobTime, complaintRowClassName, COMPLAINT_TYPES, DEFAULT_JOB_TIME_HOURS, formatDate,
  formatJobTime, formatMoney, INVENTORY_CONDITIONS, INVENTORY_STATUSES, pickField, PRIORITIES} from "./constants";

type AssetRow = { inventoryItemId: number; itemId: number; itemCode?: string; itemName?: string; categoryName?: string; branchId: number;
  serialNumber: string; assetTag?: string; status?: string; condition?: string; purchaseDate?: string; purchasePrice?: number; location?: string;};

type LatestRequest = {
  id: number;
  date: number;
};

type RepairedComplaintTimer = {
  requestId: number;
  repairedAtMs: number | null;
};

// Note: The auto-close timer is set to 2 miuntes (for testing) and 24 hours (Production) after the complaint is marked as "Repaired".
// const AUTO_CLOSE_REPAIRED_MS = 2 * 60 * 1000;
const AUTO_CLOSE_REPAIRED_MS = 24 * 60 * 60 * 1000;

// Note: The auto-close retry timer is set to 5 seconds after the complaint is marked as "Repaired".
const AUTO_CLOSE_RETRY_MS = 500;
// Note: The maximum timeout value for setTimeout is 2,147,483,647 milliseconds (approximately 24.8 days). This is the maximum value that can be passed to setTimeout in JavaScript.
const MAX_AUTO_CLOSE_TIMEOUT_MS = 2_147_483_647;

//
const repairTimestampMs = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = new Date(value as string | number | Date).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const ACTIVE_ASSIGN_COUNT_STATUSES = new Set([
  "Assigned",
  "InProgress",
  "WorkLoad",
  "Pending",
  "SparePartRequired",
]);

const displayUserName = (user: any) =>
  user.userName ??
  user.username ??
  user.fullName ??
  user.Name ??
  `User ${user.userID ?? user.userId ?? user.id}`;

const complaintRowsFromResponse = (data: unknown) => {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  return [];
};

const latestActiveComplaint = (
  complaints: Record<string, unknown>[],
  inventoryItemId: number
) => {
  let best: Record<string, unknown> | null = null;
  let bestDate = -1;
  let bestId = 0;

  complaints.forEach((row) => {
    const itemId = Number(
      pickField(row, "inventoryItemId", "InventoryItemId")
    );
    if (itemId !== inventoryItemId) return;

    const status = String(pickField(row, "status", "Status") ?? "");
    if (status === "Closed") return;

    const requestId = Number(
      pickField(row, "maintenanceRequestId", "MaintenanceRequestId")
    );
    if (!Number.isFinite(requestId) || requestId <= 0) return;

    const date = new Date(
      String(pickField(row, "reportedDate", "ReportedDate") ?? "")
    ).getTime();
    const safeDate = Number.isNaN(date) ? 0 : date;

    if (
      !best ||
      safeDate > bestDate ||
      (safeDate === bestDate && requestId > bestId)
    ) {
      best = row;
      bestDate = safeDate;
      bestId = requestId;
    }
  });

  return best;
};

const resolveUserBranchId = (): number | null => {
  const parsed = Number(getCurrentUser()?.branchId);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const InventoryComplaint: React.FC = () => {
  const userBranchId = resolveUserBranchId();
  const defaultBranchFilter = userBranchId ? String(userBranchId) : "";

  const [rows, setRows] = useState<AssetRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<
    { id: number; name: string }[]
  >([]);
  const [userNameMap, setUserNameMap] = useState<Map<number, string>>(
    () => new Map()
  );

  const [loading, setLoading] = useState(false);

  const [filterBranchId, setFilterBranchId] =
    useState(defaultBranchFilter);
  const [filterCategoryName, setFilterCategoryName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [showComplaint, setShowComplaint] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  const [complaintForm, setComplaintForm] = useState({
    ComplaintType: "Broken",
    Priority: "Medium",
    Title: "",
    Description: "",
    Notes: "",
    Condition: "",
  });
  const [complaintImage, setComplaintImage] = useState<File | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewDetail, setViewDetail] = useState<Record<string, unknown> | null>( null );
  const [viewHistory, setViewHistory] = useState<Record<string, unknown>[]>([]);
  const [viewRequestId, setViewRequestId] = useState<number | null>(null);
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRequestId, setAssignRequestId] = useState<number | null>(null);
  const [assignApproved, setAssignApproved] = useState(false);
  const [assignUsers, setAssignUsers] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [assignUsersLoading, setAssignUsersLoading] = useState(false);
  const [verifyRequestId, setVerifyRequestId] = useState<number | null>(null);
  const actionSaveCountRef = useRef(0);
  const autoCloseTimersRef = useRef<Map<number, number>>(new Map());
  const autoCloseAttemptedRef = useRef<Set<number>>(new Set());
  const verifyInFlightRef = useRef<Set<number>>(new Set());
  const closedRequestIdsRef = useRef<Set<number>>(new Set());
  const missingRepairTimestampRef = useRef<Set<number>>(new Set());
  const repairedComplaintsRef = useRef<RepairedComplaintTimer[]>([]);
  const refreshPageRef = useRef<() => Promise<void>>(async () => {});
  const refreshQueueRef = useRef<Promise<void>>(Promise.resolve());
  const autoCloseComplaintRef = useRef<(requestId: number) => Promise<void>>(    async () => {}  );
  const scheduleAutoCloseRef = useRef< (requestId: number, delay: number) => void  >(() => {});

  const beginActionSave = useCallback(() => { actionSaveCountRef.current += 1; setActionSaving(true); }, []);

  const endActionSave = useCallback(() => {
    actionSaveCountRef.current = Math.max(0, actionSaveCountRef.current - 1);
    if (actionSaveCountRef.current === 0) {
      setActionSaving(false);
    }
  }, []);

  const clearAutoCloseTimer = useCallback((requestId: number) => {
    const timerId = autoCloseTimersRef.current.get(requestId);
    if (timerId === undefined) return;
    window.clearTimeout(timerId);
    autoCloseTimersRef.current.delete(requestId);
  }, []);

  const branchName = (id?: number | null) => {
    if (!id) return "-";

    return (
      branches.find((branch) => branch.id === Number(id))?.name ||
      `Branch ${id}`
    );
  };

  const actionByName = (id?: number | null) => {
    if (id === null || id === undefined || !Number.isFinite(Number(id))) {
      return "-";
    }

    const numericId = Number(id);
    if (numericId <= 0) return "-";

    return userNameMap.get(numericId) || String(numericId);
  };

  const loadLookups = async () => {
    try {
      const [branchRes, categoryRes] = await Promise.all([
        getBranchesForDashboard(),
        getInventoryCategories({ includeInactive: false }),
      ]);

      const branchData = Array.isArray(branchRes.data)
        ? branchRes.data
        : [];

      setBranches(
        branchData.map((branch: any) => ({
          id: Number(
            branch.id ??
              branch.BranchID ??
              branch.branchId
          ),
          name:
            branch.name ??
            branch.BranchName ??
            branch.branchName ??
            `Branch ${branch.id}`,
        }))
      );

      setCategories(
        Array.isArray(categoryRes.data)
          ? categoryRes.data
          : []
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load filters."
        ),
        variant: "destructive",
      });
    }

    try {
      const userRes = await getUsers();
      const users = Array.isArray(userRes.data) ? userRes.data : [];
      const map = new Map<number, string>();

      users.forEach((user: any) => {
        const userId = Number(user.id ?? user.Id);
        if (!Number.isFinite(userId) || userId <= 0) return;

        const userName = String(
          user.userName ?? user.UserName ?? user.name ?? user.Name ?? ""
        ).trim();

        if (userName) map.set(userId, userName);
      });

      setUserNameMap(map);
    } catch {
      setUserNameMap(new Map());
    }
  };

  const fetchAssets = async (branchFilter?: string) => {
    const selectedBranch =
      branchFilter ?? filterBranchId;

    const parsedBranchId = Number(selectedBranch);

    const branchId =
      selectedBranch &&
      Number.isFinite(parsedBranchId) &&
      parsedBranchId > 0
        ? parsedBranchId
        : null;

    setLoading(true);

    try {
      const res = await getInventoryAssets({
        branchId,
        status: filterStatus || null,
        condition: filterCondition || null,
        categoryName: filterCategoryName || null,
        search: filterSearch || null,
      });

      setRows(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load inventory items."
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await getMaintenanceList();
      setComplaints(complaintRowsFromResponse(res.data));
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load complaint timers."
        ),
        variant: "destructive",
      });
      setComplaints([]);
    }
  };

  const loadAssignUsers = async () => {
    setAssignUsersLoading(true);
    try {
      const [usersRes, listRes] = await Promise.all([
        getMaintenanceAssignUsers(),
        getMaintenanceList(),
      ]);
      const technicians = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.data || [];
      const complaintRows = complaintRowsFromResponse(listRes.data);
      const countByUser = new Map<string, number>();

      complaintRows.forEach((row) => {
        const status = String(pickField(row, "status", "Status") ?? "");
        if (!ACTIVE_ASSIGN_COUNT_STATUSES.has(status)) return;
        const assignedId = pickField(row, "assignedTo", "AssignedTo");
        if (assignedId === null || assignedId === undefined || assignedId === "") {
          return;
        }
        const key = String(assignedId);
        countByUser.set(key, (countByUser.get(key) ?? 0) + 1);
      });

      const enriched = technicians.map((user: any) => {
        const userId = user.userID ?? user.userId ?? user.Id ?? user.id;
        return {
          ...user,
          activeTaskCount: countByUser.get(String(userId)) ?? 0,
        };
      });

      enriched.sort((a: any, b: any) => {
        if (a.activeTaskCount !== b.activeTaskCount) {
          return a.activeTaskCount - b.activeTaskCount;
        }
        return String(displayUserName(a)).localeCompare(String(displayUserName(b)));
      });
      setAssignUsers(enriched);
    } catch (error: any) {
      setAssignUsers([]);
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load users."),
        variant: "destructive",
      });
    } finally {
      setAssignUsersLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadLookups();
      await Promise.all([
        fetchAssets(defaultBranchFilter),
        fetchComplaints(),
      ]);
    };

    initialize();
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const activeComplaintByItem = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    const itemIds = new Set<number>();
    complaints.forEach((row) => {
      const itemId = Number(
        pickField(row, "inventoryItemId", "InventoryItemId")
      );
      if (Number.isFinite(itemId) && itemId > 0) itemIds.add(itemId);
    });
    itemIds.forEach((itemId) => {
      const active = latestActiveComplaint(complaints, itemId);
      if (active) map.set(itemId, active);
    });
    return map;
  }, [complaints]);

  const repairedComplaints = useMemo(() => {
    const pending: RepairedComplaintTimer[] = [];

    const addRepaired = (
      status: unknown,
      requestIdValue: unknown,
      completedDate: unknown
    ) => {
      if (String(status ?? "") !== "Repaired") return;
      const requestId = Number(requestIdValue);
      if (!Number.isFinite(requestId) || requestId <= 0) return;

      const repairedAtMs = repairTimestampMs(completedDate);
      const existing = pending.find((item) => item.requestId === requestId);
      if (existing) {
        if (existing.repairedAtMs == null && repairedAtMs != null) {
          existing.repairedAtMs = repairedAtMs;
        }
        return;
      }

      pending.push({ requestId, repairedAtMs });
    };

    rows.forEach((row) => {
      const activeComplaint = activeComplaintByItem.get(row.inventoryItemId);
      if (!activeComplaint) return;
      addRepaired(
        pickField(activeComplaint, "status", "Status"),
        pickField(
          activeComplaint,
          "maintenanceRequestId",
          "MaintenanceRequestId"
        ),
        pickField(activeComplaint, "completedDate", "CompletedDate")
      );
    });

    if (viewOpen && viewDetail) {
      addRepaired(
        pickField(viewDetail, "status", "Status"),
        viewRequestId,
        pickField(viewDetail, "completedDate", "CompletedDate")
      );
    }

    pending.sort((left, right) => left.requestId - right.requestId);
    return pending;
  }, [rows, activeComplaintByItem, viewOpen, viewDetail, viewRequestId]);

  repairedComplaintsRef.current = repairedComplaints;
  const repairedComplaintKey = repairedComplaints
    .map(
      (complaint) => `${complaint.requestId}:${complaint.repairedAtMs ?? ""}`
    )
    .join("|");

  const resolveCondition = (value?: string) =>
    INVENTORY_CONDITIONS.includes(
      value as (typeof INVENTORY_CONDITIONS)[number]
    )
      ? value!
      : "";

  const openComplaint = (row: AssetRow) => {
    setSelected(row);

    setComplaintForm({
      ComplaintType: "Broken",
      Priority: "Medium",
      Title: "",
      Description: "",
      Notes: "",
      Condition: resolveCondition(row.condition),
    });
    setComplaintImage(null);

    setShowComplaint(true);
  };

  const openView = async (row: AssetRow) => {
    const inventoryItemId = Number(row.inventoryItemId);
    if (!inventoryItemId) return;

    setViewOpen(true);
    setViewLoading(true);
    setViewDetail(null);
    setViewHistory([]);
    setViewRequestId(null);

    try {
      const historyRes = await getMaintenanceHistoryByInventoryItem(
        inventoryItemId
      );

      const history = Array.isArray(historyRes.data)
        ? (historyRes.data as Record<string, unknown>[])
        : [];

      if (history.length === 0) {
        toast({
          title: "No complaint found",
          description:
            "No maintenance complaint exists for this inventory item.",
        });
        setViewOpen(false);
        setViewLoading(false);
        return;
      }

      setViewHistory(history);

      const latest = history.reduce<LatestRequest>(
        (best, item) => {
          const requestId = Number(
            pickField(item, "maintenanceRequestId", "MaintenanceRequestId")
          );
          if (!Number.isFinite(requestId) || requestId <= 0) return best;

          const date = new Date(
            String(pickField(item, "reportedDate", "ReportedDate") ?? "")
          ).getTime();
          const safeDate = Number.isNaN(date) ? 0 : date;

          if (
            !best.id ||
            safeDate > best.date ||
            (safeDate === best.date && requestId > best.id)
          ) {
            return { id: requestId, date: safeDate };
          }

          return best;
        },
        { id: 0, date: 0 }
      );

      if (!latest.id) {
        toast({
          title: "No complaint found",
          description:
            "No maintenance complaint exists for this inventory item.",
        });
        setViewOpen(false);
        setViewLoading(false);
        return;
      }

      setViewRequestId(latest.id);

      const detailRes = await getMaintenanceById(latest.id);
      setViewDetail((detailRes.data || null) as Record<string, unknown> | null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load maintenance detail."
        ),
        variant: "destructive",
      });
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const submitComplaint = async () => {
    if (!selected) return;

    if (
      !complaintForm.ComplaintType ||
      !complaintForm.Title.trim()
    ) {
      toast({
        title: "Validation",
        description:
          "Complaint Type and Title are required.",
        variant: "destructive",
      });

      return;
    }

    if (!complaintForm.Condition) {
      toast({
        title: "Validation",
        description: "Condition is required.",
        variant: "destructive",
      });

      return;
    }

    beginActionSave();

    try {
      const formData = new FormData();
      formData.append("InventoryItemId", String(selected.inventoryItemId));
      formData.append("ItemId", String(selected.itemId));
      formData.append("BranchId", String(selected.branchId));
      formData.append("ComplaintType", complaintForm.ComplaintType);
      formData.append("Priority", complaintForm.Priority || "Medium");
      formData.append("Title", complaintForm.Title.trim());
      if (complaintForm.Description?.trim()) {
        formData.append("Description", complaintForm.Description.trim());
      }
      if (complaintForm.Notes?.trim()) {
        formData.append("Notes", complaintForm.Notes.trim());
      }
      formData.append("Condition", complaintForm.Condition);
      if (complaintImage) {
        formData.append("image", complaintImage);
      }

      const res = await createMaintenanceComplaint(formData);
      const created = (res.data?.data ?? res.data) as Record<string, unknown>;
      const requestId = Number(
        pickField(created, "maintenanceRequestId", "MaintenanceRequestId")
      );

      toast({
        title: "Success",
        description: [
          res.data?.message || "Maintenance complaint created successfully.",
          `Item: ${selected.itemName || "-"}`,
          selected.itemCode ? `Code: ${selected.itemCode}` : null,
          selected.serialNumber ? `Serial: ${selected.serialNumber}` : null,
          selected.assetTag ? `Asset Tag: ${selected.assetTag}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      });

      await Promise.all([fetchAssets(), fetchComplaints()]);
      setComplaintImage(null);
      setShowComplaint(false);

      if (!Number.isFinite(requestId) || requestId <= 0) {
        toast({
          title: "Error",
          description:
            "Complaint was created, but its id was not returned for assignment.",
          variant: "destructive",
        });
        return;
      }

      setAssignRequestId(requestId);
      setAssignApproved(false);
      setAssignedTo("");
      setAssignOpen(true);
      await loadAssignUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to create complaint."
        ),
        variant: "destructive",
      });
    } finally {
      endActionSave();
    }
  };

  const submitAssign = async () => {
    if (!assignRequestId) return;

    const technicianId = Number(assignedTo);
    if (!technicianId) {
      toast({
        title: "Validation",
        description: "Please select a technician.",
        variant: "destructive",
      });
      return;
    }

    beginActionSave();
    try {
      if (!assignApproved) {
        try {
          await approveMaintenance(assignRequestId, { Comments: null });
          setAssignApproved(true);
        } catch (error: any) {
          toast({
            title: "Error",
            description: apiErrorMessage(error, "Failed to approve complaint."),
            variant: "destructive",
          });
          await Promise.all([fetchAssets(), fetchComplaints()]);
          return;
        }
      }

      try {
        await assignMaintenance(assignRequestId, {
          AssignedTo: technicianId,
          JobTimeHours: DEFAULT_JOB_TIME_HOURS,
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: apiErrorMessage(error, "Failed to assign technician."),
          variant: "destructive",
        });
        await Promise.all([fetchAssets(), fetchComplaints()]);
        return;
      }

      toast({
        title: "Success",
        description: `Technician assigned. Job time is ${formatJobTime(DEFAULT_JOB_TIME_HOURS)}.`,
      });
      setAssignOpen(false);
      setAssignRequestId(null);
      setAssignApproved(false);
      setAssignedTo("");
      await Promise.all([fetchAssets(), fetchComplaints()]);
    } finally {
      endActionSave();
    }
  };

  const reloadOpenComplaint = async (requestId?: number | null) => {
    const id = requestId ?? viewRequestId;
    if (!viewOpen || !id) return;

    const detailRes = await getMaintenanceById(id);
    const detail = (detailRes.data || null) as Record<string, unknown> | null;
    setViewDetail(detail);
    setViewRequestId(id);

    const inventoryItemId = Number(
      pickField(detail, "inventoryItemId", "InventoryItemId")
    );
    if (!inventoryItemId) return;

    const historyRes = await getMaintenanceHistoryByInventoryItem(inventoryItemId);
    setViewHistory(
      Array.isArray(historyRes.data)
        ? (historyRes.data as Record<string, unknown>[])
        : []
    );
  };

  const refreshPage = async () => {
    await Promise.all([fetchAssets(), fetchComplaints()]);
    try {
      await reloadOpenComplaint();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to refresh complaint details."
        ),
        variant: "destructive",
      });
    }
  };

  refreshPageRef.current = refreshPage;

  const enqueueAutoCloseRefresh = () => {
    const nextRefresh = refreshQueueRef.current
      .catch(() => undefined)
      .then(() => refreshPageRef.current());
    refreshQueueRef.current = nextRefresh.then(
      () => undefined,
      () => undefined
    );
    return nextRefresh;
  };

  const openVerifyConfirm = (requestId: number) => {
    if (!requestId) return;
    setVerifyRequestId(requestId);
  };

  const submitVerifiedClose = async (requestId: number) => {
    const res = await closeMaintenance(requestId, { Comments: null });
    toast({
      title: "Success",
      description: res.data?.message || "Complaint verified and closed.",
    });
  };

  const verifyComplaint = async (requestId: number) => {
    if (!requestId || closedRequestIdsRef.current.has(requestId)) return;
    if (verifyInFlightRef.current.has(requestId)) return;

    verifyInFlightRef.current.add(requestId);
    beginActionSave();
    try {
      await submitVerifiedClose(requestId);
      closedRequestIdsRef.current.add(requestId);
      autoCloseAttemptedRef.current.add(requestId);
      clearAutoCloseTimer(requestId);
      await Promise.all([fetchAssets(), fetchComplaints()]);
      if (viewOpen && viewRequestId === requestId) {
        await reloadOpenComplaint(requestId);
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to verify complaint."),
        variant: "destructive",
      });
    } finally {
      verifyInFlightRef.current.delete(requestId);
      endActionSave();
    }
  };

  autoCloseComplaintRef.current = async (requestId: number) => {
    const complaint = repairedComplaintsRef.current.find(
      (item) => item.requestId === requestId
    );
    if (
      !requestId ||
      !complaint ||
      complaint.repairedAtMs == null ||
      closedRequestIdsRef.current.has(requestId) ||
      autoCloseAttemptedRef.current.has(requestId)
    ) {
      return;
    }

    if (verifyInFlightRef.current.has(requestId)) {
      scheduleAutoCloseRef.current(requestId, AUTO_CLOSE_RETRY_MS);
      return;
    }

    verifyInFlightRef.current.add(requestId);
    autoCloseAttemptedRef.current.add(requestId);
    beginActionSave();
    try {
      await submitVerifiedClose(requestId);
      closedRequestIdsRef.current.add(requestId);
      clearAutoCloseTimer(requestId);
      setVerifyRequestId((current) => (current === requestId ? null : current));
      await enqueueAutoCloseRefresh();
    } catch (error: unknown) {
      if (closedRequestIdsRef.current.has(requestId)) {
        console.error(
          "Failed to refresh complaints after automatic closure.",
          error
        );
      } else {
        toast({
          title: "Error",
          description: apiErrorMessage(error, "Failed to verify complaint."),
          variant: "destructive",
        });
      }
    } finally {
      verifyInFlightRef.current.delete(requestId);
      endActionSave();
    }
  };

  useEffect(() => {
    let disposed = false;
    const complaints = repairedComplaintsRef.current;
    const timers = autoCloseTimersRef.current;

    const schedule = (requestId: number, delay: number) => {
      if (disposed) return;
      clearAutoCloseTimer(requestId);
      let timerId = 0;
      timerId = window.setTimeout(() => {
        if (disposed) return;
        if (timers.get(requestId) === timerId) {
          timers.delete(requestId);
        }
        run(requestId);
      }, delay);
      timers.set(requestId, timerId);
    };

    const run = (requestId: number) => {
      if (disposed) return;
      if (
        closedRequestIdsRef.current.has(requestId) ||
        autoCloseAttemptedRef.current.has(requestId)
      ) {
        return;
      }

      const complaint = repairedComplaintsRef.current.find(
        (item) => item.requestId === requestId
      );
      if (!complaint || complaint.repairedAtMs == null) return;

      const remaining =
        complaint.repairedAtMs + AUTO_CLOSE_REPAIRED_MS - Date.now();
      if (remaining > 0) {
        schedule(requestId, Math.min(remaining, MAX_AUTO_CLOSE_TIMEOUT_MS));
        return;
      }

      if (verifyInFlightRef.current.has(requestId)) {
        schedule(requestId, AUTO_CLOSE_RETRY_MS);
        return;
      }

      void autoCloseComplaintRef.current(requestId);
    };

    scheduleAutoCloseRef.current = schedule;

    complaints.forEach((complaint) => {
      if (
        autoCloseAttemptedRef.current.has(complaint.requestId) ||
        closedRequestIdsRef.current.has(complaint.requestId) ||
        timers.has(complaint.requestId)
      ) {
        return;
      }

      if (complaint.repairedAtMs == null) {
        if (!missingRepairTimestampRef.current.has(complaint.requestId)) {
          missingRepairTimestampRef.current.add(complaint.requestId);
          console.warn(
            `Automatic complaint closure skipped for request ${complaint.requestId}: CompletedDate is missing or invalid.`
          );
        }
        return;
      }

      const remaining =
        complaint.repairedAtMs + AUTO_CLOSE_REPAIRED_MS - Date.now();
      if (remaining <= 0) {
        run(complaint.requestId);
      } else {
        schedule(
          complaint.requestId,
          Math.min(remaining, MAX_AUTO_CLOSE_TIMEOUT_MS)
        );
      }
    });

    return () => {
      disposed = true;
      scheduleAutoCloseRef.current = () => {};
      timers.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      timers.clear();
    };
  }, [repairedComplaintKey, clearAutoCloseTimer]);

  return (
    <div className="p-4 space-y-4">
      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">
          Inventory Items
        </h1>

        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={() => refreshPage()}
          disabled={loading}
        >
          <RefreshCcw
            className={`w-4 h-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Inventory Items */}
      <div className="kfc-card">
        <div className="kfc-card-header">
          Inventory Items
        </div>

        {/* Filters */}
        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Branch */}
            <div>
              <label className="kfc-label">
                Branch
              </label>

              <select
                className="kfc-input"
                value={filterBranchId}
                onChange={(e) =>
                  setFilterBranchId(e.target.value)
                }
              >
                {/* <option value="">
                  All Branches
                </option> */}

                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="kfc-label">
                Category
              </label>

              <select
                className="kfc-input"
                value={filterCategoryName}
                onChange={(e) =>
                  setFilterCategoryName(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All Categories
                </option>

                {categories.map((category: any) => {
                  const name =
                    category.categoryName ??
                    category.CategoryName;

                  const id =
                    category.inventoryCategoryId ??
                    category.InventoryCategoryId ??
                    name;

                  if (!name) return null;

                  return (
                    <option
                      key={id}
                      value={name}
                    >
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="kfc-label">
                Status
              </label>

              <select
                className="kfc-input"
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value)
                }
              >
                <option value="">
                  All Statuses
                </option>

                {INVENTORY_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="kfc-label">
                Condition
              </label>

              <select
                className="kfc-input"
                value={filterCondition}
                onChange={(e) =>
                  setFilterCondition(e.target.value)
                }
              >
                <option value="">
                  All Conditions
                </option>

                {INVENTORY_CONDITIONS.map(
                  (condition) => (
                    <option
                      key={condition}
                      value={condition}
                    >
                      {condition}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="kfc-label">
                Search
              </label>

              <input
                className="kfc-input"
                placeholder="Serial / tag / item..."
                value={filterSearch}
                onChange={(e) =>
                  setFilterSearch(e.target.value)
                }
              />
            </div>

            {/* Apply */}
            <div>
              <button
                type="button"
                className="kfc-btn"
                onClick={() => fetchAssets()}
                disabled={loading}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-[#fff6f6] text-[#bc3342]">
                <tr>
                  <th className="border px-3 py-2 text-left">
                    Serial Number
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Asset Tag
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Item
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Category
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Branch
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Status
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Condition
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Purchase
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Location
                  </th>

                  <th className="border px-3 py-2 text-left">
                    Job Time
                  </th>

                  <th className="border px-3 py-2 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.length > 0 ? (
                  rows.map((row) => {
                    const activeComplaint = activeComplaintByItem.get(
                      row.inventoryItemId
                    );
                    const complaintStatus = String(
                      pickField(activeComplaint, "status", "Status") ?? ""
                    );
                    const complaintRequestId = Number(
                      pickField(
                        activeComplaint,
                        "maintenanceRequestId",
                        "MaintenanceRequestId"
                      )
                    );
                    const remaining = calculateRemainingJobTime(
                      pickField(
                        activeComplaint,
                        "assignedDate",
                        "AssignedDate"
                      ),
                      pickField(
                        activeComplaint,
                        "jobTimeHours",
                        "JobTimeHours"
                      ),
                      complaintStatus,
                      pickField(
                        activeComplaint,
                        "completedDate",
                        "CompletedDate"
                      ),
                      now
                    );
                    return (
                    <tr
                      key={row.inventoryItemId}
                      className={complaintRowClassName(remaining.isExpired)}
                    >
                      <td className="border px-3 py-1.5 font-medium">
                        {row.serialNumber}
                      </td>

                      <td className="border px-3 py-1.5">
                        {row.assetTag || "-"}
                      </td>

                      <td className="border px-3 py-1.5">
                        <div>
                          {row.itemName || "-"}
                        </div>

                        <div className="text-xs text-gray-500">
                          {row.itemCode}
                        </div>
                      </td>

                      <td className="border px-3 py-1.5">
                        {row.categoryName || "-"}
                      </td>

                      <td className="border px-3 py-1.5">
                        {branchName(row.branchId)}
                      </td>

                      <td className="border px-3 py-1.5">
                        <StatusBadge
                          value={row.status}
                        />
                      </td>

                      <td className="border px-3 py-1.5">
                        <StatusBadge
                          value={row.condition}
                          kind="condition"
                        />
                      </td>

                      <td className="border px-3 py-1.5">
                        <div>
                          {formatDate(
                            row.purchaseDate
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          {formatMoney(
                            row.purchasePrice
                          )}
                        </div>
                      </td>

                      <td className="border px-3 py-1.5">
                        {row.location || "-"}
                      </td>

                      <td className="border px-3 py-1.5 tabular-nums">
                        {remaining.formattedTime}
                      </td>

                      <td className="border px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="View"
                            className="kfc-btn-outline p-1.5 rounded-md"
                            onClick={() => openView(row)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!activeComplaint && (
                            <button
                              type="button"
                              title="Create Complaint"
                              className="kfc-btn-outline p-1.5 rounded-md"
                              onClick={() =>
                                openComplaint(row)
                              }
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          )}
                          {complaintStatus === "Repaired" &&
                            complaintRequestId > 0 && (
                              <button
                                type="button"
                                className="kfc-btn"
                                disabled={actionSaving}
                                onClick={() =>
                                  openVerifyConfirm(complaintRequestId)
                                }
                              >
                                Verify
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
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Complaint Modal */}
      {showComplaint && selected && (
        <InventoryModal
          title="Create Maintenance Complaint"
          onClose={() => {
            setComplaintImage(null);
            setShowComplaint(false);
          }}
        >
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 border rounded p-3 space-y-1">
              <div>
                <strong>Item:</strong>{" "}
                {selected.itemName} (
                {selected.itemCode})
              </div>

              <div>
                <strong>Serial Number:</strong>{" "}
                {selected.serialNumber}
              </div>

              <div>
                <strong>Branch:</strong>{" "}
                {branchName(selected.branchId)}
              </div>
            </div>

            <div>
              <label className="kfc-label">
                Complaint Type
              </label>

              <select
                className="kfc-input"
                value={
                  complaintForm.ComplaintType
                }
                onChange={(e) =>
                  setComplaintForm(
                    (prev) => ({
                      ...prev,
                      ComplaintType:
                        e.target.value,
                    })
                  )
                }
              >
                {COMPLAINT_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="kfc-label">
                Priority
              </label>

              <select
                className="kfc-input"
                value={complaintForm.Priority}
                onChange={(e) =>
                  setComplaintForm(
                    (prev) => ({
                      ...prev,
                      Priority: e.target.value,
                    })
                  )
                }
              >
                {PRIORITIES.map((priority) => (
                  <option
                    key={priority}
                    value={priority}
                  >
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="kfc-label">
                Condition
              </label>

              <select
                className="kfc-input"
                value={complaintForm.Condition}
                onChange={(e) =>
                  setComplaintForm(
                    (prev) => ({
                      ...prev,
                      Condition: e.target.value,
                    })
                  )
                }
              >
                <option value="">
                  Select Condition
                </option>

                {INVENTORY_CONDITIONS.map(
                  (condition) => (
                    <option
                      key={condition}
                      value={condition}
                    >
                      {condition}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="kfc-label">
                Title
              </label>

              <input
                className="kfc-input"
                value={complaintForm.Title}
                onChange={(e) =>
                  setComplaintForm(
                    (prev) => ({
                      ...prev,
                      Title: e.target.value,
                    })
                  )
                }
              />
            </div>

            <div>
              <label className="kfc-label">
                Description
              </label>

              <textarea
                className="kfc-input min-h-[70px]"
                value={
                  complaintForm.Description
                }
                onChange={(e) =>
                  setComplaintForm(
                    (prev) => ({
                      ...prev,
                      Description:
                        e.target.value,
                    })
                  )
                }
              />
            </div>

            <div>
              <label className="kfc-label">
                Notes
              </label>

              <textarea
                className="kfc-input min-h-[60px]"
                value={complaintForm.Notes}
                onChange={(e) =>
                  setComplaintForm(
                    (prev) => ({
                      ...prev,
                      Notes: e.target.value,
                    })
                  )
                }
              />
            </div>

            <MaintenanceImagePicker
              label="Image"
              file={complaintImage}
              onChange={setComplaintImage}
              onError={(message) =>
                toast({
                  title: "Validation",
                  description: message,
                  variant: "destructive",
                })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                onClick={() => {
                  setComplaintImage(null);
                  setShowComplaint(false);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving}
                onClick={submitComplaint}
              >
                {actionSaving
                  ? "Submitting..."
                  : "Create Complaint"}
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
            <div className="space-y-3">
              <MaintenanceReadOnlyView
                detail={viewDetail}
                history={viewHistory}
                branchName={branchName}
                actionByName={actionByName}
                groupHistoryByRequest
              />
              {String(pickField(viewDetail, "status", "Status") ?? "") ===
                "Repaired" &&
                Number(viewRequestId) > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="kfc-btn"
                      disabled={actionSaving}
                      onClick={() => openVerifyConfirm(Number(viewRequestId))}
                    >
                      {actionSaving ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                )}
            </div>
          )}
        </InventoryModal>
      )}

      {verifyRequestId && (
        <InventoryModal
          title="Confirm Verification"
          onClose={() => {
            if (actionSaving) return;
            setVerifyRequestId(null);
          }}
        >
          <div className="space-y-3 text-sm">
            <p>Are you sure you want to verify this repaired complaint?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                disabled={actionSaving}
                onClick={() => setVerifyRequestId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving}
                onClick={() => {
                  const requestId = verifyRequestId;
                  void verifyComplaint(requestId).finally(() =>
                    setVerifyRequestId(null)
                  );
                }}
              >
                {actionSaving ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </InventoryModal>
      )}

      {assignOpen && assignRequestId && (
        <InventoryModal
          title="Assign Technician"
          onClose={() => {
            if (actionSaving) return;
            setAssignOpen(false);
          }}
        >
          <div className="space-y-3 text-sm">
            <div>
              <strong>Complaint #{assignRequestId}</strong>
            </div>
            <div>
              <strong>Job Time:</strong> {formatJobTime(DEFAULT_JOB_TIME_HOURS)}
            </div>
            <div>
              <label className="kfc-label">Technician</label>
              <select
                className="kfc-input"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={assignUsersLoading || actionSaving}
              >
                <option value="">-- Select Technician --</option>
                {assignUsers.map((user: any) => {
                  const userId = user.userID ?? user.userId ?? user.Id ?? user.id;
                  const count = Number(user.activeTaskCount ?? 0);
                  return (
                    <option key={userId} value={userId}>
                      {`${displayUserName(user)} (${count})`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                disabled={actionSaving}
                onClick={() => setAssignOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving || assignUsersLoading}
                onClick={submitAssign}
              >
                {actionSaving ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </InventoryModal>
      )}
    </div>
  );
};

export default InventoryComplaint;