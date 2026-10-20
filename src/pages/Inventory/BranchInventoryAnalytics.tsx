import React, { useEffect, useMemo, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getBranchInventoryAnalytics,
  getBranchInventoryAnalyticsItems,
} from "@/services/api";
import InventoryModal from "./components/InventoryModal";
import StatusBadge from "./components/StatusBadge";
import {
  apiErrorMessage,
  formatDate,
  INVENTORY_STATUSES,
  pickField,
} from "./constants";

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
}[] = [
  { key: "all", label: "All Items", statusFilter: null },
  { key: "Active", label: "Active", statusFilter: "Active" },
  { key: "UnderRepair", label: "UnderRepair", statusFilter: "UnderRepair" },
  { key: "Inactive", label: "Inactive", statusFilter: "Inactive" },
  { key: "Disposed", label: "Disposed", statusFilter: "Disposed" },
];

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

const normalizeAnalytics = (raw: unknown): AnalyticsCounts => {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    all: Number(data.all ?? 0) || 0,
    active: Number(data.active ?? 0) || 0,
    underRepair: Number(data.underRepair ?? data.UnderRepair ?? 0) || 0,
    inactive: Number(data.inactive ?? 0) || 0,
    disposed: Number(data.disposed ?? 0) || 0,
  };
};

const BranchInventoryAnalytics: React.FC = () => {
  const [counts, setCounts] = useState<AnalyticsCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalStatus, setModalStatus] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await getBranchInventoryAnalytics();
      setCounts(normalizeAnalytics(res.data));
    } catch (error: unknown) {
      setCounts(emptyCounts);
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load branch inventory analytics."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

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
    [counts]
  );

  const openDetails = async (card: (typeof STATUS_CARDS)[number]) => {
    const count = countForCard(counts, card.key);
    setModalStatus(card.statusFilter);
    setModalTitle(
      card.key === "all"
        ? `All Items (${count})`
        : `${card.label} Items (${count})`
    );
    setModalOpen(true);
    setDetailLoading(true);
    setDetailRows([]);
    try {
      const res = await getBranchInventoryAnalyticsItems(card.statusFilter);
      setDetailRows(Array.isArray(res.data) ? (res.data as DetailRow[]) : []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load inventory items."),
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#bc3342]">
          Branch Inventory Analytics
        </h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <Loader2 className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Inventory Items by Status</div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading chart...
            </div>
          ) : (
            <HighchartsReact highcharts={Highcharts} options={chartOptions} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {STATUS_CARDS.map((card) => {
          const value = countForCard(counts, card.key);
          return (
            <button
              key={card.key}
              type="button"
              className="kfc-card text-left p-4 hover:shadow-md transition-shadow border-[#bc3342]/20 focus:outline-none focus:ring-2 focus:ring-[#bc3342]/40"
              onClick={() => openDetails(card)}
              disabled={loading}
            >
              <div className="text-sm font-medium text-[#bc3342]">{card.label}</div>
              <div className="text-2xl font-semibold text-gray-800 mt-2">
                {loading ? "—" : value}
              </div>
            </button>
          );
        })}
      </div>

      {modalOpen && (
        <InventoryModal
          title={modalTitle}
          wide
          onClose={() => {
            setModalOpen(false);
            setDetailRows([]);
            setModalStatus(null);
          }}
        >
          {detailLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading items...
            </div>
          ) : detailRows.length === 0 ? (
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
                      pickField(row, "inventoryItemId", "InventoryItemId") ?? index
                    );
                    return (
                      <tr key={id} className="border-b align-top">
                        <td className="py-2 pr-3">
                          {String(pickField(row, "serialNumber", "SerialNumber") ?? "-")}
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
                          {String(pickField(row, "categoryName", "CategoryName") ?? "-")}
                        </td>
                        <td className="py-2 pr-3">
                          {String(pickField(row, "branchName", "BranchName") ?? "-")}
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge
                            value={String(pickField(row, "status", "Status") ?? "")}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge
                            value={String(pickField(row, "condition", "Condition") ?? "")}
                            kind="condition"
                          />
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatDate(pickField(row, "purchaseDate", "PurchaseDate"))}
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
        </InventoryModal>
      )}
    </div>
  );
};

export default BranchInventoryAnalytics;
