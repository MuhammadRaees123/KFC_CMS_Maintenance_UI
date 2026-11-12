import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getBranchesForDashboard, getMaintenanceList } from "@/services/api";
import StatusBadge from "@/pages/Inventory/components/StatusBadge";
import {
  apiErrorMessage,
  formatDateTime,
  pickField,
  PRIORITIES,
  MAINTENANCE_STATUSES,
} from "@/pages/Inventory/constants";
import DashboardChartCard from "../shared/DashboardChartCard";
import DashboardKpiCard from "../shared/DashboardKpiCard";
import DashboardKpiCardGrid from "../shared/DashboardKpiCardGrid";
import DashboardSectionHeader from "../shared/DashboardSectionHeader";
import DashboardStatusDetailModal from "../shared/DashboardStatusDetailModal";
import { getDefaultMonthToTodayRange } from "../shared/dateRange";

type DetailRow = Record<string, unknown>;
type StatusKey = (typeof MAINTENANCE_STATUSES)[number];
type StatusCounts = Record<StatusKey, number>;

export type ComplaintExternalFilters = {
  branchId: string;
  priority: string;
  fromDate: string;
  toDate: string;
};

export type InventoryComplaintSectionProps = {
  refreshKey?: number;
  embedded?: boolean;
  hideFilters?: boolean;
  hideHeader?: boolean;
  title?: string;
  externalFilters?: ComplaintExternalFilters;
  externalBranches?: { id: number; name: string }[];
};

const emptyCounts = (): StatusCounts =>
  MAINTENANCE_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as StatusCounts);

const STATUS_CARDS: {
  key: StatusKey;
  label: string;
  statusFilter: StatusKey;
}[] = MAINTENANCE_STATUSES.map((status) => ({
  key: status,
  label: status,
  statusFilter: status,
}));

const aggregateCounts = (rows: DetailRow[]): StatusCounts => {
  const counts = emptyCounts();
  rows.forEach((row) => {
    const status = String(pickField(row, "status", "Status") ?? "");
    if (status in counts) {
      counts[status as StatusKey] += 1;
    }
  });
  return counts;
};

const InventoryComplaintSection: React.FC<InventoryComplaintSectionProps> = ({
  refreshKey = 0,
  embedded = false,
  hideFilters = false,
  hideHeader = false,
  title = "Inventory Complaint Analytics",
  externalFilters,
  externalBranches,
}) => {
  const navigate = useNavigate();
  const isExternallyFiltered = Boolean(externalFilters);

  const [localBranches, setLocalBranches] = useState<
    { id: number; name: string }[]
  >([]);
  const [branchId, setBranchId] = useState("");
  const [priority, setPriority] = useState("");
  const [fromDate, setFromDate] = useState(
    () => getDefaultMonthToTodayRange().fromDate,
  );
  const [toDate, setToDate] = useState(
    () => getDefaultMonthToTodayRange().toDate,
  );

  const branches = externalBranches ?? localBranches;
  const activeBranchId = externalFilters?.branchId ?? branchId;
  const activePriority = externalFilters?.priority ?? priority;
  const activeFromDate = externalFilters?.fromDate ?? fromDate;
  const activeToDate = externalFilters?.toDate ?? toDate;

  const [rows, setRows] = useState<DetailRow[]>([]);
  const [counts, setCounts] = useState<StatusCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalStatus, setModalStatus] = useState<StatusKey | null>(null);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const branchName = (id?: number | null) => {
    if (!id) return "-";
    return branches.find((b) => b.id === id)?.name || `Branch ${id}`;
  };

  const resolveBranchName = (row: DetailRow) => {
    const fromApi = pickField(row, "branchName", "BranchName");
    if (fromApi) return String(fromApi);
    const id = Number(pickField(row, "branchId", "BranchId"));
    return branchName(Number.isFinite(id) ? id : null);
  };

  const loadBranches = async () => {
    try {
      const res = await getBranchesForDashboard();
      const data = Array.isArray(res.data) ? res.data : [];
      setLocalBranches(
        data.map((b: Record<string, unknown>) => ({
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

  const loadAnalytics = async (
    filters: {
      branchId: string;
      priority: string;
      fromDate: string;
      toDate: string;
    } = {
      branchId: activeBranchId,
      priority: activePriority,
      fromDate: activeFromDate,
      toDate: activeToDate,
    },
  ) => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      toast({
        title: "Invalid date range",
        description: "From Date cannot be later than To Date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await getMaintenanceList({
        branchId: filters.branchId ? Number(filters.branchId) : null,
        status: null,
        priority: filters.priority || null,
        search: null,
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
      });
      const data = Array.isArray(res.data) ? (res.data as DetailRow[]) : [];
      const nextCounts = aggregateCounts(data);
      setRows(data);
      setCounts(nextCounts);

      if (modalOpen && modalStatus) {
        const filtered = data.filter(
          (row) =>
            String(pickField(row, "status", "Status") ?? "") === modalStatus,
        );
        setDetailRows(filtered);
        setModalTitle(`${modalStatus} Complaints (${filtered.length})`);
      }
    } catch (error: unknown) {
      setRows([]);
      setCounts(emptyCounts());
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load complaint analytics.",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!externalBranches) {
      void loadBranches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, externalBranches]);

  // Standalone: reload only on refreshKey (Apply still uses draft state).
  useEffect(() => {
    if (isExternallyFiltered) return;
    void loadAnalytics({
      branchId,
      priority,
      fromDate,
      toDate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, isExternallyFiltered]);

  // Hosted/external: reload when parent-applied filters or refreshKey change.
  useEffect(() => {
    if (!isExternallyFiltered) return;
    void loadAnalytics({
      branchId: activeBranchId,
      priority: activePriority,
      fromDate: activeFromDate,
      toDate: activeToDate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    refreshKey,
    isExternallyFiltered,
    activeBranchId,
    activePriority,
    activeFromDate,
    activeToDate,
  ]);

  const chartOptions: Highcharts.Options = useMemo(
    () => ({
      chart: { type: "column", height: 320, backgroundColor: "transparent" },
      title: { text: "" },
      credits: { enabled: false },
      xAxis: {
        categories: [...MAINTENANCE_STATUSES],
        labels: { style: { fontSize: "12px" } },
      },
      yAxis: {
        min: 0,
        allowDecimals: false,
        title: { text: "Complaint Count" },
      },
      legend: { enabled: false },
      tooltip: { pointFormat: "<b>{point.y}</b> complaints" },
      plotOptions: {
        column: {
          borderRadius: 6,
          colorByPoint: true,
          colors: [
            "#bc3342",
            "#2563eb",
            "#f59e0b",
            "#8b5cf6",
            "#089e92",
            "#b178e3",
            "#ea580c",
            "#16a34a",
            "#64748b",
          ],
          dataLabels: { enabled: true, format: "{y}" },
        },
      },
      series: [
        {
          type: "column",
          name: "Complaints",
          data: MAINTENANCE_STATUSES.map((status) => counts[status]),
        },
      ],
    }),
    [counts],
  );

  const openDetails = (card: (typeof STATUS_CARDS)[number]) => {
    setDetailLoading(true);
    const filtered = rows.filter(
      (row) =>
        String(pickField(row, "status", "Status") ?? "") === card.statusFilter,
    );
    setModalStatus(card.statusFilter);
    setModalTitle(`${card.label} Complaints (${filtered.length})`);
    setDetailRows(filtered);
    setModalOpen(true);
    setDetailLoading(false);
  };

  return (
    <div className={embedded ? "space-y-4" : "p-4 space-y-4"}>
      {!hideHeader && (
        <DashboardSectionHeader
          title={title}
          onRefresh={() => void loadAnalytics()}
          refreshing={loading}
        />
      )}

      {hideHeader && title ? (
        <h2 className="text-lg font-semibold text-[#bc3342]">{title}</h2>
      ) : null}

      {!hideFilters && (
        <div className="kfc-card">
          <div className="kfc-card-header">Filters</div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
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
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="kfc-label">To Date</label>
              <input
                type="date"
                className="kfc-input"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="kfc-btn w-full"
                onClick={() => void loadAnalytics()}
                disabled={loading}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardKpiCardGrid>
        {STATUS_CARDS.map((card, index) => (
          <DashboardKpiCard
            key={card.key}
            label={card.label}
            value={counts[card.key]}
            loading={loading}
            onClick={() => openDetails(card)}
            disabled={loading}
            toneIndex={index}
          />
        ))}
      </DashboardKpiCardGrid>

      <DashboardChartCard title="Complaints by Status" loading={loading}>
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      </DashboardChartCard>

      <DashboardStatusDetailModal
        open={modalOpen}
        title={modalTitle}
        onClose={() => {
          setModalOpen(false);
          setDetailRows([]);
          setModalStatus(null);
        }}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading complaints...
          </div>
        ) : detailRows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No complaints found
            {modalStatus ? ` for status ${modalStatus}` : ""}.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Branch</th>
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Assigned To</th>
                  <th className="py-2 pr-3">Asset / Item</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row) => {
                  const id = Number(
                    pickField(
                      row,
                      "maintenanceRequestId",
                      "MaintenanceRequestId",
                    ),
                  );
                  const itemName = String(
                    pickField(row, "itemName", "ItemName") ?? "-",
                  );
                  const itemCode = String(
                    pickField(row, "itemCode", "ItemCode") ?? "",
                  );
                  const serial = String(
                    pickField(row, "serialNumber", "SerialNumber") ?? "",
                  );
                  return (
                    <tr
                      key={id || Math.random()}
                      className="border-b align-top"
                    >
                      <td className="py-2 pr-3 font-medium">
                        {String(pickField(row, "title", "Title") ?? "-")}
                      </td>
                      <td
                        className="py-2 pr-3 max-w-[180px] truncate"
                        title={String(
                          pickField(row, "description", "Description") ?? "",
                        )}
                      >
                        {String(
                          pickField(row, "description", "Description") ?? "-",
                        )}
                      </td>
                      <td
                        className="py-2 pr-3 max-w-[140px] truncate"
                        title={String(pickField(row, "notes", "Notes") ?? "")}
                      >
                        {String(pickField(row, "notes", "Notes") ?? "-")}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDateTime(
                          pickField(
                            row,
                            "reportedDate",
                            "ReportedDate",
                          ) as string,
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge
                          value={String(
                            pickField(row, "status", "Status") ?? "",
                          )}
                        />
                      </td>
                      <td className="py-2 pr-3">{resolveBranchName(row)}</td>
                      <td className="py-2 pr-3">
                        {String(pickField(row, "priority", "Priority") ?? "-")}
                      </td>
                      <td className="py-2 pr-3">
                        {String(
                          pickField(row, "assignedToName", "AssignedToName") ??
                            "-",
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <div>{itemName}</div>
                        <div className="text-xs text-gray-500">
                          {[itemCode, serial].filter(Boolean).join(" · ") ||
                            "-"}
                        </div>
                      </td>
                      <td className="py-2">
                        {id > 0 && (
                          <button
                            type="button"
                            className="text-[#bc3342] hover:underline text-xs"
                            onClick={() =>
                              navigate(`/inventory/maintenance/${id}`)
                            }
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardStatusDetailModal>
    </div>
  );
};

export default InventoryComplaintSection;
