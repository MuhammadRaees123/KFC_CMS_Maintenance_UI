import React, { useEffect, useMemo, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import {
  Loader2,
  Boxes,
  CheckCircle2,
  Wrench,
  Ban,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getBranchesForDashboard,
  getInventoryAssets,
} from "@/services/api";
import StatusBadge from "@/pages/Inventory/components/StatusBadge";
import {
  apiErrorMessage,
  formatDate,
  INVENTORY_CONDITIONS,
  INVENTORY_STATUSES,
  PRIORITIES,
  pickField,
} from "@/pages/Inventory/constants";
import DashboardChartCard from "../shared/DashboardChartCard";
import DashboardKpiCard from "../shared/DashboardKpiCard";
import DashboardKpiCardGrid from "../shared/DashboardKpiCardGrid";
import DashboardSectionHeader from "../shared/DashboardSectionHeader";
import DashboardStatusDetailModal from "../shared/DashboardStatusDetailModal";
import { getDefaultMonthToTodayRange } from "../shared/dateRange";
import InventoryComplaintSection from "./InventoryComplaintSection";

type AnalyticsCounts = {
  all: number;
  active: number;
  underRepair: number;
  inactive: number;
  disposed: number;
};

type DetailRow = Record<string, unknown>;

type StatusCardKey =
  | "all"
  | "Active"
  | "UnderRepair"
  | "Inactive"
  | "Disposed";

type AppliedFilters = {
  branchId: string;
  condition: string;
  priority: string;
  fromDate: string;
  toDate: string;
  /** Date filter is applied only after the user clicks Apply Filters. */
  useDates: boolean;
};

export type BranchInventorySectionProps = {
  refreshKey?: number;
  embedded?: boolean;
  /** When false, omit nested complaints (e.g. GeneralDashboard already shows them). */
  includeComplaintAnalytics?: boolean;
};

const emptyCounts: AnalyticsCounts = {
  all: 0,
  active: 0,
  underRepair: 0,
  inactive: 0,
  disposed: 0,
};

const STATUS_CARDS: {
  key: StatusCardKey;
  label: string;
  statusFilter: string | null;
  icon: React.ReactNode;
}[] = [
  {
    key: "all",
    label: "All Items",
    statusFilter: null,
    icon: <Boxes className="h-6 w-6" />,
  },
  {
    key: "Active",
    label: "Active",
    statusFilter: "Active",
    icon: <CheckCircle2 className="h-6 w-6" />,
  },
  {
    key: "UnderRepair",
    label: "UnderRepair",
    statusFilter: "UnderRepair",
    icon: <Wrench className="h-6 w-6" />,
  },
  {
    key: "Inactive",
    label: "Inactive",
    statusFilter: "Inactive",
    icon: <Ban className="h-6 w-6" />,
  },
  {
    key: "Disposed",
    label: "Disposed",
    statusFilter: "Disposed",
    icon: <Trash2 className="h-6 w-6" />,
  },
];

const normalizeStatus = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

const countForCard = (counts: AnalyticsCounts, key: StatusCardKey): number => {
  switch (key) {
    case "all":
      return counts.all;
    case "Active":
      return counts.active;
    case "UnderRepair":
      return counts.underRepair;
    case "Inactive":
      return counts.inactive;
    case "Disposed":
      return counts.disposed;
    default:
      return 0;
  }
};

const aggregateCounts = (rows: DetailRow[]): AnalyticsCounts => {
  const counts = { ...emptyCounts };
  rows.forEach((row) => {
    const status = normalizeStatus(pickField(row, "status", "Status"));
    counts.all += 1;
    switch (status) {
      case "active":
        counts.active += 1;
        break;
      case "underrepair":
        counts.underRepair += 1;
        break;
      case "inactive":
        counts.inactive += 1;
        break;
      case "disposed":
        counts.disposed += 1;
        break;
      default:
        break;
    }
  });
  return counts;
};

const extractRows = (payload: unknown): DetailRow[] => {
  if (Array.isArray(payload)) return payload as DetailRow[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as DetailRow[];
    if (Array.isArray(record.items)) return record.items as DetailRow[];
    if (Array.isArray(record.result)) return record.result as DetailRow[];
  }
  return [];
};

const matchesStatus = (row: DetailRow, statusFilter: string | null): boolean => {
  if (!statusFilter) return true;
  return (
    normalizeStatus(pickField(row, "status", "Status")) ===
    normalizeStatus(statusFilter)
  );
};

const BranchInventorySection: React.FC<BranchInventorySectionProps> = ({
  refreshKey = 0,
  embedded = false,
  includeComplaintAnalytics = true,
}) => {
  const defaultRange = getDefaultMonthToTodayRange();

  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [branchId, setBranchId] = useState("");
  const [condition, setCondition] = useState("");
  const [priority, setPriority] = useState("");
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [complaintSyncKey, setComplaintSyncKey] = useState(0);

  // Applied filters: Branch/Condition drive inventory; Priority/dates drive
  // complaints only (dates stay off until Apply so first load is unscoped).
  const [applied, setApplied] = useState<AppliedFilters>({
    branchId: "",
    condition: "",
    priority: "",
    fromDate: "",
    toDate: "",
    useDates: false,
  });

  const [rows, setRows] = useState<DetailRow[]>([]);
  const [counts, setCounts] = useState<AnalyticsCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalStatus, setModalStatus] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);

  const loadBranches = async () => {
    try {
      const res = await getBranchesForDashboard();
      const data = Array.isArray(res.data) ? res.data : [];
      setBranches(
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

  const loadAnalytics = async (filters: AppliedFilters = applied) => {
    if (
      filters.useDates &&
      filters.fromDate &&
      filters.toDate &&
      filters.fromDate > filters.toDate
    ) {
      toast({
        title: "Invalid date range",
        description: "From Date cannot be later than To Date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await getInventoryAssets({
        branchId: filters.branchId ? Number(filters.branchId) : null,
        status: null,
        condition: filters.condition || null,
        search: null,
      });

      // Dates / Priority apply only to Complaints Analytics — not inventory.
      const data = extractRows(res.data);

      setRows(data);
      setCounts(aggregateCounts(data));

      if (modalOpen) {
        const nextDetails = data.filter((row) =>
          matchesStatus(row, modalStatus),
        );
        setDetailRows(nextDetails);
        setModalTitle(
          modalStatus
            ? `${modalStatus} Items (${nextDetails.length})`
            : `All Items (${nextDetails.length})`,
        );
      }
    } catch (error: unknown) {
      setRows([]);
      setCounts(emptyCounts);
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load branch inventory analytics.",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const next: AppliedFilters = {
      branchId,
      condition,
      priority,
      fromDate,
      toDate,
      useDates: true,
    };
    setApplied(next);
    void loadAnalytics(next);
  };

  const handleRefresh = () => {
    setComplaintSyncKey((key) => key + 1);
    void loadAnalytics(applied);
  };

  useEffect(() => {
    void loadBranches();
    void loadAnalytics(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const chartOptions: Highcharts.Options = useMemo(
    () => ({
      chart: { type: "column", height: 320, backgroundColor: "transparent" },
      title: { text: "" },
      credits: { enabled: false },
      xAxis: {
        categories: [...INVENTORY_STATUSES],
        labels: { style: { fontSize: "12px" } },
      },
      yAxis: {
        min: 0,
        allowDecimals: false,
        title: { text: "Inventory Item Count" },
      },
      legend: { enabled: false },
      tooltip: { pointFormat: "<b>{point.y}</b> items" },
      plotOptions: {
        column: {
          borderRadius: 6,
          colorByPoint: true,
          colors: ["#16a34a", "#f59e0b", "#64748b", "#bc3342"],
          dataLabels: { enabled: true, format: "{y}" },
        },
      },
      series: [
        {
          type: "column",
          name: "Items",
          data: [
            counts.active,
            counts.underRepair,
            counts.inactive,
            counts.disposed,
          ],
        },
      ],
    }),
    [counts],
  );

  const openDetails = (card: (typeof STATUS_CARDS)[number]) => {
    const filtered = rows.filter((row) =>
      matchesStatus(row, card.statusFilter),
    );
    const count = countForCard(counts, card.key);
    setModalStatus(card.statusFilter);
    setModalTitle(
      card.key === "all"
        ? `All Items (${count})`
        : `${card.label} Items (${count})`,
    );
    setDetailRows(filtered);
    setModalOpen(true);
  };

  return (
    <div className={embedded ? "space-y-4" : "p-4 space-y-4"}>
      <DashboardSectionHeader
        title="Branch Inventory Analytics"
        onRefresh={handleRefresh}
        refreshing={loading}
      />

      <div className="kfc-card">
        <div className="kfc-card-header">Filters</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
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
            <label className="kfc-label">Condition</label>
            <select
              className="kfc-input"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">All</option>
              {INVENTORY_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {includeComplaintAnalytics && (
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
          )}
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
              onClick={handleApplyFilters}
              disabled={loading}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <DashboardKpiCardGrid>
        {STATUS_CARDS.map((card, index) => (
          <DashboardKpiCard
            key={card.key}
            label={card.label}
            value={countForCard(counts, card.key)}
            loading={loading}
            onClick={() => openDetails(card)}
            disabled={loading}
            toneIndex={index}
            icon={card.icon}
          />
        ))}
      </DashboardKpiCardGrid>

      {(loading || counts.all > 0) && (
        <DashboardChartCard title="Inventory Items by Status" loading={loading}>
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        </DashboardChartCard>
      )}

      {!loading && counts.all === 0 && (
        <div className="kfc-card p-6 text-center text-sm text-gray-500">
          No inventory items found for the selected filters.
        </div>
      )}

      {includeComplaintAnalytics && (
        <div className="pt-2 border-t border-gray-100">
          <InventoryComplaintSection
            embedded
            hideFilters
            hideHeader
            title="Complaints Analytics"
            refreshKey={refreshKey + complaintSyncKey}
            externalBranches={branches}
            externalFilters={{
              branchId: applied.branchId,
              priority: applied.priority,
              fromDate: applied.useDates ? applied.fromDate : "",
              toDate: applied.useDates ? applied.toDate : "",
            }}
          />
        </div>
      )}

      <DashboardStatusDetailModal
        open={modalOpen}
        title={modalTitle}
        onClose={() => {
          setModalOpen(false);
          setDetailRows([]);
          setModalStatus(null);
        }}
      >
        {detailRows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            {modalStatus
              ? "No items found for this status."
              : "No inventory items found."}
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-3">Serial Number</th>
                  <th className="py-2 pr-3">Asset Tag</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Item Code</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Branch</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Condition</th>
                  <th className="py-2 pr-3">Purchase Date</th>
                  <th className="py-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, index) => {
                  const id = Number(
                    pickField(row, "inventoryItemId", "InventoryItemId") ??
                      index,
                  );
                  return (
                    <tr key={id} className="border-b align-top">
                      <td className="py-2 pr-3">
                        {String(
                          pickField(row, "serialNumber", "SerialNumber") ?? "-",
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {String(pickField(row, "assetTag", "AssetTag") ?? "-")}
                      </td>
                      <td className="py-2 pr-3 font-medium">
                        {String(pickField(row, "itemName", "ItemName") ?? "-")}
                      </td>
                      <td className="py-2 pr-3">
                        {String(pickField(row, "itemCode", "ItemCode") ?? "-")}
                      </td>
                      <td className="py-2 pr-3">
                        {String(
                          pickField(row, "categoryName", "CategoryName") ?? "-",
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {String(
                          pickField(row, "branchName", "BranchName") ??
                            pickField(row, "branchId", "BranchId") ??
                            "-",
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge
                          value={String(
                            pickField(row, "status", "Status") ?? "",
                          )}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge
                          value={String(
                            pickField(row, "condition", "Condition") ?? "",
                          )}
                          kind="condition"
                        />
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDate(
                          pickField(row, "purchaseDate", "PurchaseDate"),
                        )}
                      </td>
                      <td className="py-2">
                        {String(pickField(row, "location", "Location") ?? "-")}
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

export default BranchInventorySection;
