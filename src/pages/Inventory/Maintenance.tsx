import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Eye, Loader2, RefreshCcw } from "lucide-react";
import {
  getBranchesForDashboard,
  getInventoryCategories,
  getMaintenanceList,
} from "@/services/api";
import StatusBadge from "./components/StatusBadge";
import {
  apiErrorMessage,
  calculateRemainingJobTime,
  complaintRowClassName,
  formatDateTime,
  formatJobTime,
  MAINTENANCE_STATUSES,
  PRIORITIES,
} from "./constants";

const PAGE_SIZE = 20;

type SortDirection = "asc" | "desc";

const pageList = (current: number, total: number): Array<number | "ellipsis"> => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
};

const Maintenance: React.FC = () => {
  const navigate = useNavigate();
  const requestSeq = useRef(0);
  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const branchName = (id?: number | null) => {
    if (!id) return "-";
    return branches.find((b) => b.id === id)?.name || `Branch ${id}`;
  };

  const loadBranches = async () => {
    try {
      const res = await getBranchesForDashboard();
      const data = Array.isArray(res.data) ? res.data : [];
      setBranches(
        data.map((b: any) => ({
          id: b.id ?? b.BranchID ?? b.branchId,
          name: b.name ?? b.BranchName ?? b.branchName ?? `Branch ${b.id}`,
        }))
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load branches."),
        variant: "destructive",
      });
    }
  };

  const loadCategories = async () => {
    try {
      const res = await getInventoryCategories({ includeInactive: false });
      const data = Array.isArray(res.data) ? res.data : [];
      setCategories(
        data
          .map((category: any) => ({
            id: Number(category.inventoryCategoryId ?? category.InventoryCategoryId),
            name: category.categoryName ?? category.CategoryName ?? "",
          }))
          .filter(
            (category: { id: number; name: string }) =>
              category.name && Number.isFinite(category.id)
          )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load categories."),
        variant: "destructive",
      });
    }
  };

  const fetchList = async (page = 1, direction: SortDirection = sortDirection) => {
    const requestId = ++requestSeq.current;
    setLoading(true);
    try {
      const res = await getMaintenanceList({
        branchId: branchId ? Number(branchId) : null,
        status: status || null,
        priority: priority || null,
        search: search || null,
        categoryId: categoryId ? Number(categoryId) : null,
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
        payload?.totalPages ?? (total > 0 ? Math.ceil(total / PAGE_SIZE) : 0)
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
      setPageNumber(Number.isFinite(resolvedPage) && resolvedPage > 0 ? resolvedPage : page);
      setSortDirection(direction);
    } catch (error: any) {
      if (requestId !== requestSeq.current) return;
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load maintenance requests."),
        variant: "destructive",
      });
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    loadCategories();
    fetchList(1, "desc");
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#bc3342]">Maintenance Requests</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="kfc-btn-outline flex items-center gap-1"
            onClick={() => fetchList(1, sortDirection)}
            disabled={loading}
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            className="kfc-btn"
            onClick={() => navigate("/inventory/assets")}
          >
            Create from Asset
          </button>
        </div>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Filters</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
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
            <label className="kfc-label">Category</label>
            <select
              className="kfc-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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
              onClick={() => fetchList(1, sortDirection)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Requests</div>
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
                  <th className="border px-3 py-2 text-left">Category Name</th>
                  <th className="border px-3 py-2 text-left">Serial</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-left">Type</th>
                  <th className="border px-3 py-2 text-left">Priority</th>
                  <th className="border px-3 py-2 text-left">Status</th>
                  <th className="border px-3 py-2 text-left">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold"
                      onClick={() =>
                        fetchList(1, sortDirection === "desc" ? "asc" : "desc")
                      }
                    >
                      Reported {sortDirection === "desc" ? "↓" : "↑"}
                    </button>
                  </th>
                  <th className="border px-3 py-2 text-left">Assigned To</th>
                  <th className="border px-3 py-2 text-left">Job Time</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row) => {
                    const remaining = calculateRemainingJobTime(
                      row.assignedDate ?? row.AssignedDate,
                      row.jobTimeHours ?? row.JobTimeHours,
                      row.status ?? row.Status,
                      row.completedDate ?? row.CompletedDate,
                      now
                    );
                    return (
                    <tr
                      key={row.maintenanceRequestId}
                      className={complaintRowClassName(remaining.isExpired)}
                    >
                      <td className="border px-3 py-1.5">{row.maintenanceRequestId}</td>
                      <td className="border px-3 py-1.5 font-medium">{row.title}</td>
                      <td className="border px-3 py-1.5">
                        <div>{row.itemName || "-"}</div>
                        <div className="text-xs text-gray-500">{row.itemCode}</div>
                      </td>
                      <td className="border px-3 py-1.5">{row.categoryName || "-"}</td>
                      <td className="border px-3 py-1.5">{row.serialNumber || "-"}</td>
                      <td className="border px-3 py-1.5">{branchName(row.branchId)}</td>
                      <td className="border px-3 py-1.5">{row.complaintType || "-"}</td>
                      <td className="border px-3 py-1.5">
                        <StatusBadge value={row.priority} kind="priority" />
                      </td>
                      <td className="border px-3 py-1.5">
                        <StatusBadge value={row.status} />
                      </td>
                      <td className="border px-3 py-1.5">
                        <div>{formatDateTime(row.reportedDate)}</div>
                        <div className="text-xs text-gray-500">By: {row.reportedBy ?? "-"}</div>
                      </td>
                      <td className="border px-3 py-1.5">
                        {row.assignedToName || row.AssignedToName || row.assignedTo || "-"}
                      </td>
                      <td className="border px-3 py-1.5">
                        {formatJobTime(row.jobTimeHours ?? row.JobTimeHours)}
                      </td>
                      <td className="border px-3 py-1.5 text-center">
                        <button
                          type="button"
                          title="View"
                          className="kfc-btn-outline p-1.5 rounded-md"
                          onClick={() =>
                            navigate(`/inventory/maintenance/${row.maintenanceRequestId}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="border px-3 py-4 text-center text-gray-500">
                      No maintenance requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {!loading && totalRecords > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 text-sm">
            <span>
              Showing {(pageNumber - 1) * PAGE_SIZE + 1}–
              {Math.min(pageNumber * PAGE_SIZE, totalRecords)} of {totalRecords}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={pageNumber <= 1}
                onClick={() => fetchList(pageNumber - 1, sortDirection)}
              >
                Previous
              </button>
              {pageList(pageNumber, totalPages).map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`px-3 py-1 border rounded ${
                      item === pageNumber ? "bg-[#bc3342] text-white" : ""
                    }`}
                    onClick={() => fetchList(item, sortDirection)}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={pageNumber >= totalPages}
                onClick={() => fetchList(pageNumber + 1, sortDirection)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Maintenance;
