import React, { useEffect, useRef, useState } from "react";
import { Eye, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getBranchesForDashboard,
  getMaintenanceById,
  getMaintenanceHistory,
  getMaintenanceList,
  getUsers,
} from "@/services/api";
import { getCurrentUser } from "@/types/auth";
import InventoryModal from "./components/InventoryModal";
import MaintenanceReadOnlyView from "./components/MaintenanceReadOnlyView";
import StatusBadge from "./components/StatusBadge";
import {
  apiErrorMessage,
  formatDateTime,
  formatJobTime,
  MAINTENANCE_STATUSES,
  pickField,
  PRIORITIES,
} from "./constants";

const PAGE_SIZE = 20;

type SortDirection = "asc" | "desc";
type MaintenanceRow = Record<string, unknown>;

const resolveUserBranchId = (): number | null => {
  const parsed = Number(getCurrentUser()?.branchId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const InventoryComplaintReport: React.FC = () => {
  const userBranchId = resolveUserBranchId();
  const requestSeq = useRef(0);

  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [userNameMap, setUserNameMap] = useState<Map<number, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(false);

  const [branchId, setBranchId] = useState(
    userBranchId ? String(userBranchId) : "",
  );
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

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

  const fetchList = async (
    page = 1,
    direction: SortDirection = sortDirection,
  ) => {
    if (fromDate && toDate && fromDate > toDate) {
      toast({
        title: "Validation",
        description: "From Date cannot be later than To Date.",
        variant: "destructive",
      });
      return;
    }

    const requestId = ++requestSeq.current;
    setLoading(true);
    try {
      const res = await getMaintenanceList({
        branchId: branchId ? Number(branchId) : userBranchId,
        status: status || null,
        priority: priority || null,
        search: search || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        pageNumber: page,
        pageSize: PAGE_SIZE,
        sortBy: "reportedDate",
        sortDirection: direction,
      });
      if (requestId !== requestSeq.current) return;

      const payload = res.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      const total = Number(payload?.totalRecords ?? list.length);
      const pages = Number(
        payload?.totalPages ??
          (total > 0 ? Math.ceil(total / PAGE_SIZE) : 0),
      );
      const resolvedPage = Number(payload?.pageNumber ?? page);
      const safeTotal = Number.isFinite(total) ? total : 0;
      const safePages = Number.isFinite(pages) ? pages : 0;

      if (list.length === 0 && page > 1 && safePages > 0) {
        await fetchList(1, direction);
        return;
      }

      setRows(list);
      setTotalRecords(safeTotal);
      setTotalPages(safePages);
      setPageNumber(
        Number.isFinite(resolvedPage) && resolvedPage > 0
          ? resolvedPage
          : page,
      );
      setSortDirection(direction);
    } catch (error: unknown) {
      if (requestId !== requestSeq.current) return;
      setRows([]);
      setTotalRecords(0);
      setTotalPages(0);
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load complaint report.",
        ),
        variant: "destructive",
      });
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadBranches();
      await loadUsers();
      await fetchList(1, "desc");
    };
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#bc3342]">
          Inventory Complaint Report
        </h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={() => void fetchList(pageNumber, sortDirection)}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Filters</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <label className="kfc-label">Status</label>
            <select
              className="kfc-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {MAINTENANCE_STATUSES.map((s) => (
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
            <label className="kfc-label">From Date</label>
            <input
              type="date"
              className="kfc-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="kfc-label">To Date</label>
            <input
              type="date"
              className="kfc-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
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
          <div className="md:col-span-3 lg:col-span-6 flex justify-end">
            <button
              type="button"
              className="kfc-btn"
              onClick={() => void fetchList(1, sortDirection)}
              disabled={loading}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header flex flex-wrap items-center justify-between gap-2">
          <span>Complaint History</span>
          <span className="text-sm text-gray-600">
            Total records: {totalRecords}
          </span>
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
                  <th className="border px-3 py-2 text-left">Request #</th>
                  <th className="border px-3 py-2 text-left">Title</th>
                  <th className="border px-3 py-2 text-left">Item</th>
                  <th className="border px-3 py-2 text-left">Serial</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-left">Technician</th>
                  <th className="border px-3 py-2 text-left">Priority</th>
                  <th className="border px-3 py-2 text-left">Status</th>
                  <th className="border px-3 py-2 text-left">Job Time</th>
                  <th className="border px-3 py-2 text-left">Reported</th>
                  <th className="border px-3 py-2 text-left">Closed</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row) => {
                    const requestId = Number(
                      pickField(
                        row,
                        "maintenanceRequestId",
                        "MaintenanceRequestId",
                      ),
                    );
                    return (
                      <tr key={requestId} className="hover:bg-gray-50">
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
                          <StatusBadge
                            value={pickField<string>(row, "status", "Status")}
                          />
                        </td>
                        <td className="border px-3 py-1.5">
                          {formatJobTime(
                            pickField(row, "jobTimeHours", "JobTimeHours"),
                          )}
                        </td>
                        <td className="border px-3 py-1.5">
                          {formatDateTime(
                            pickField(row, "reportedDate", "ReportedDate"),
                          )}
                        </td>
                        <td className="border px-3 py-1.5">
                          {formatDateTime(
                            pickField(row, "closedDate", "ClosedDate"),
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
                      No complaints found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                disabled={pageNumber <= 1 || loading}
                onClick={() => void fetchList(pageNumber - 1, sortDirection)}
              >
                Previous
              </button>
              <span>
                Page {pageNumber} / {totalPages}
              </span>
              <button
                type="button"
                className="kfc-btn-outline"
                disabled={pageNumber >= totalPages || loading}
                onClick={() => void fetchList(pageNumber + 1, sortDirection)}
              >
                Next
              </button>
            </div>
            <button
              type="button"
              className="kfc-btn-outline"
              disabled={loading}
              onClick={() =>
                void fetchList(
                  1,
                  sortDirection === "desc" ? "asc" : "desc",
                )
              }
            >
              Sort by Reported: {sortDirection === "desc" ? "Newest" : "Oldest"}
            </button>
          </div>
        )}
      </div>

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

export default InventoryComplaintReport;
