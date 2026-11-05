import React, { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  closeMaintenance,
  getBranchesForDashboard,
  getMaintenanceById,
  getMaintenanceHistory,
  getMaintenanceList,
  getUsers,
  reopenMaintenance,
} from "@/services/api";
import { getCurrentUser } from "@/types/auth";
import InventoryModal from "./components/InventoryModal";
import MaintenanceReadOnlyView from "./components/MaintenanceReadOnlyView";
import StatusBadge from "./components/StatusBadge";
import {
  apiErrorMessage,
  calculateRemainingJobTime,
  complaintRowClassName,
  formatDateTime,
  formatJobTime,
  isBranchComplaintActiveStatus,
  pickField,
  PRIORITIES,
} from "./constants";

type MaintenanceRow = Record<string, unknown>;

const PAGE_SIZE = 20;

const complaintRowsFromResponse = (data: unknown) => {
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

const resolveUserBranchId = (): number | null => {
  const parsed = Number(getCurrentUser()?.branchId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const BranchComplaint: React.FC = () => {
  const userBranchId = resolveUserBranchId();
  const defaultBranchFilter = userBranchId ? String(userBranchId) : "";

  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [userNameMap, setUserNameMap] = useState<Map<number, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [verifyRequestId, setVerifyRequestId] = useState<number | null>(null);
  const [reopenRequestId, setReopenRequestId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState(defaultBranchFilter);
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [now, setNow] = useState(() => Date.now());

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewDetail, setViewDetail] = useState<MaintenanceRow | null>(null);
  const [viewHistory, setViewHistory] = useState<MaintenanceRow[]>([]);
  const [viewRequestId, setViewRequestId] = useState<number | null>(null);

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

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getMaintenanceList({
        branchId: branchId ? Number(branchId) : userBranchId,
        priority: priority || null,
        search: search || null,
      });
      const all = complaintRowsFromResponse(res.data);
      setRows(
        all.filter((row) =>
          isBranchComplaintActiveStatus(
            String(pickField(row, "status", "Status") ?? ""),
          ),
        ),
      );
      setPageNumber(1);
    } catch (error: unknown) {
      setRows([]);
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load branch complaints."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadBranches();
      await loadUsers();
      await fetchList();
    };
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
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
    [rows],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(pageNumber, totalPages);
  const pagedRows = sortedRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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

  const openVerifyConfirm = (requestId: number) => {
    if (!requestId) return;
    setVerifyRequestId(requestId);
  };

  const verifyComplaint = async (requestId: number) => {
    if (!requestId) return;
    setActionSaving(true);
    try {
      const res = await closeMaintenance(requestId, { Comments: null });
      toast({
        title: "Success",
        description: res.data?.message || "Complaint verified and closed.",
      });
      setVerifyRequestId(null);
      await fetchList();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to verify complaint."),
        variant: "destructive",
      });
    } finally {
      setActionSaving(false);
    }
  };

  const reopenComplaint = async (requestId: number) => {
    if (!requestId) return;
    setActionSaving(true);
    try {
      const res = await reopenMaintenance(requestId, { Comments: null });
      toast({
        title: "Success",
        description: res.data?.message || "Complaint reopened successfully.",
      });
      setReopenRequestId(null);
      await fetchList();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to reopen complaint."),
        variant: "destructive",
      });
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#bc3342]">Branch Complaint</h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={() => void fetchList()}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Filters</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="kfc-label">Branch</label>
            <select
              className="kfc-input"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.length > 1 && <option value="">All Branches</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
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
              disabled={loading}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Active Branch Complaints</div>
        <div className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
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
                    const rowStatus = String(
                      pickField(row, "status", "Status") ?? "",
                    );
                    const remaining = calculateRemainingJobTime(
                      pickField(row, "assignedDate", "AssignedDate"),
                      pickField(row, "jobTimeHours", "JobTimeHours"),
                      rowStatus,
                      pickField(row, "completedDate", "CompletedDate"),
                      now,
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
                          {pickField(row, "serialNumber", "SerialNumber") || "-"}
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
                            pickField(row, "reportedDate", "ReportedDate"),
                          )}
                        </td>
                        <td className="border px-3 py-1.5 text-center">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            <button
                              type="button"
                              title="View"
                              className="kfc-btn-outline p-1.5 rounded-md"
                              onClick={() => openView(row)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {rowStatus === "Repaired" && requestId > 0 && (
                              <>
                                <button
                                  type="button"
                                  className="kfc-btn-outline"
                                  disabled={actionSaving}
                                  onClick={() => setReopenRequestId(requestId)}
                                >
                                  Reopen
                                </button>
                                <button
                                  type="button"
                                  className="kfc-btn"
                                  disabled={actionSaving}
                                  onClick={() => openVerifyConfirm(requestId)}
                                >
                                  Verify
                                </button>
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
                      colSpan={11}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No active branch complaints found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {sortedRows.length > PAGE_SIZE && (
          <div className="p-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="kfc-btn-outline"
              disabled={currentPage <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="kfc-btn-outline"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPageNumber((p) => Math.min(totalPages, p + 1))
              }
            >
              Next
            </button>
          </div>
        )}
      </div>

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
                onClick={() => void verifyComplaint(verifyRequestId)}
              >
                {actionSaving ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </InventoryModal>
      )}

      {reopenRequestId && (
        <InventoryModal
          title="Confirm Reopen"
          onClose={() => {
            if (actionSaving) return;
            setReopenRequestId(null);
          }}
        >
          <div className="space-y-3 text-sm">
            <p>
              Reopen this repaired complaint and return it to InProgress for the
              previously assigned technician?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                disabled={actionSaving}
                onClick={() => setReopenRequestId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving}
                onClick={() => void reopenComplaint(reopenRequestId)}
              >
                {actionSaving ? "Reopening..." : "Reopen"}
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

export default BranchComplaint;
