import { useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  startDate: string;
  endDate: string;
  selectedRegion: number | null;
  selectedBranch: number | null;
  selectedRider: number | null;

  regions: any[];
  branches: any[];
  riders: any[];

  canViewRegion?: boolean;
  canViewBranch?: boolean;

  loading: boolean;
  exporting: boolean;

  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onRegionChange: (id: number) => void;
  onBranchChange: (id: number) => void;
  onRiderChange: (id: number) => void;

  onShow: () => void;
  onExport: () => void;
};

export default function RiderReportFilters({
  startDate,
  endDate,
  selectedRegion,
  selectedBranch,
  selectedRider,

  regions,
  branches,
  riders,

  canViewRegion = true,
  canViewBranch = true,

  loading,
  exporting,

  onStartDateChange,
  onEndDateChange,
  onRegionChange,
  onBranchChange,
  onRiderChange,

  onShow,
  onExport
}: Props) {

  const [criteria, setCriteria] = useState("");

  // ✅ 10AM business day start
  const normalize10AM = (date: Date) => {
    const d = new Date(date);
    d.setHours(10, 0, 0, 0);
    return d;
  };

  const format = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

  // ✅ CRITERIA HANDLER
  const handleCriteria = (value: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (value) {

      case "thisHour":
        start.setMinutes(0, 0, 0);
        end = new Date(start);
        end.setHours(end.getHours() + 1);
        break;

      case "prevHour":
        end.setMinutes(0, 0, 0);
        start = new Date(end);
        start.setHours(start.getHours() - 1);
        break;

      case "today":
        start = normalize10AM(now);
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        break;

      case "yesterday":
        end = normalize10AM(now);
        start = new Date(end);
        start.setDate(start.getDate() - 1);
        break;

      case "thisMonth":
        start = normalize10AM(new Date(now.getFullYear(), now.getMonth(), 1));
        end = normalize10AM(new Date(now.getFullYear(), now.getMonth() + 1, 1));
        break;

      case "lastMonth":
        start = normalize10AM(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end = normalize10AM(new Date(now.getFullYear(), now.getMonth(), 1));
        break;

      case "open":
        return;

      default:
        return;
    }

    onStartDateChange(format(start));
    onEndDateChange(format(end));
  };

  return (
    <div className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100 mb-4">

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* ✅ CRITERIA */}
        <div className="flex flex-col">
          <label className="text-gray-600 text-sm font-medium mb-1">Criteria</label>
          <select
            value={criteria}
            onChange={(e) => {
              const v = e.target.value;
              setCriteria(v);
              handleCriteria(v);
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="">Select Criteria</option>
            <option value="thisHour">This Hour</option>
            <option value="prevHour">Previous Hour</option>
            <option value="today">This Day (10AM)</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="open">Custom Range</option>
          </select>
        </div>

        {/* START DATE */}
        <div className="flex flex-col">
          <label className="text-gray-600 text-sm font-medium mb-1">Start Date</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            disabled={criteria !== "open"}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>

        {/* END DATE */}
        <div className="flex flex-col">
          <label className="text-gray-600 text-sm font-medium mb-1">End Date</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={criteria !== "open"}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>

        {/* REGION */}
        {canViewRegion && (
          <div className="flex flex-col">
            <label className="text-gray-600 text-sm font-medium mb-1">Region</label>
            <select
              value={selectedRegion ?? 0}
              onChange={(e) => onRegionChange(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="0">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* BRANCH */}
        {canViewBranch && (
          <div className="flex flex-col">
            <label className="text-gray-600 text-sm font-medium mb-1">Branch</label>
            <select
              value={selectedBranch ?? 0}
              onChange={(e) => onBranchChange(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="0">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* RIDER */}
        <div className="flex flex-col">
          <label className="text-gray-600 text-sm font-medium mb-1">Rider</label>
          <select
            value={selectedRider ?? 0}
            onChange={(e) => onRiderChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="0">All Riders</option>
            {riders.map((r) => (
              <option key={r.id} value={r.id}>{r.rider}</option>
            ))}
          </select>
        </div>

      </div>

      {/* ACTION BUTTONS */}
      <div className="col-span-full flex justify-center mt-4 gap-4">

        <button
          onClick={onShow}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" /> Loading...
            </span>
          ) : "Show"}
        </button>

        <button
          onClick={onExport}
          disabled={exporting}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition flex items-center gap-2"
        >
          {exporting && <Loader2 className="animate-spin h-4 w-4" />}
          {exporting ? "Exporting..." : "Export to Excel"}
        </button>

      </div>

    </div>
  );
}
