



import { useEffect, useState } from "react";

type Props = {
  regions?: any[];
  branches?: any[];
  canViewRegion?: boolean;
  canViewBranch?: boolean;
  onRegionChange?: (id: number) => void;
  onApply: (filters: any) => void;
};

export default function DashboardFilters({
  regions = [],
  branches = [],
  canViewRegion = true,
  canViewBranch = true,
  onApply,
  onRegionChange
}: Props) {

  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [criteria, setCriteria] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ----------------------------
  // DATE FORMATTER
  // ----------------------------
  const format = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // ----------------------------
  // SET DEFAULT (LAST 7 DAYS 10AM)
  // ----------------------------
  useEffect(() => {
    const end = new Date();
    end.setHours(10, 0, 0, 0);

    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(10, 0, 0, 0);

    setStartDate(format(start));
    setEndDate(format(end));
  }, []);

  // ----------------------------
  // NORMALIZE TIME TO 10AM
  // ----------------------------
  const normalize10AM = (date: Date) => {
    const d = new Date(date);
    d.setHours(10, 0, 0, 0);
    return d;
  };

  // ----------------------------
  // CRITERIA HANDLER
  // ONLY updates dates, NOT data
  // ----------------------------
  const handleCriteria = (value: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (value) {
      case "thisHour":
        start = new Date();
        start.setMinutes(0, 0, 0);
        end = new Date(start);
        end.setHours(end.getHours() + 1);
        break;

      case "prevHour":
        end = new Date();
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

        case "thisWeek": {
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)

  // Calculate how far we are from Monday
  const diffToMonday = (day === 0 ? -6 : 1 - day);

  start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start = normalize10AM(start); // Monday 10 AM

  end = new Date(start);
  end.setDate(start.getDate() + 7); // next Monday 10 AM
  break;
}

case "lastWeek": {
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);

  end = new Date(now);
  end.setDate(now.getDate() + diffToMonday);
  end = normalize10AM(end); // this Monday 10 AM

  start = new Date(end);
  start.setDate(end.getDate() - 7); // previous Monday 10 AM
  break;
}

      case "open":
        return;

      default:
        return;
    }

    setStartDate(format(start));
    setEndDate(format(end));
  };

  // ----------------------------
  // APPLY FILTER — FINAL PERFECT FIX
  // Ensures latest dates are used ALWAYS
  // ----------------------------
  const applyFilter = () => {
    if (!startDate || !endDate) {
      alert("Please select Start and End date");
      return;
    }

    // 🚀 FIX: Let React update state fully first
    setTimeout(() => {
      onApply({
        startDate,
        endDate,
        regionId: selectedRegion,
        branchId: selectedBranch
      });
    }, 0);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-lg shadow border">

      {/* CRITERIA */}
      <div>
        <label className="text-sm font-medium">Criteria</label>
        <select
          value={criteria}
          onChange={(e) => {
            const v = e.target.value;
            setCriteria(v);
            handleCriteria(v);
          }}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Criteria</option>
          <option value="thisHour">This Hour</option>
          <option value="prevHour">Previous Hour</option>
          <option value="today">This Day (10AM)</option>
          <option value="yesterday">Yesterday</option>
          <option value="thisWeek">This Week</option>
          <option value="lastWeek">Last Week</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="open">Open Criteria</option>
        </select>
      </div>

      {/* REGION */}
      {canViewRegion && (
        <div>
          <label className="text-sm font-medium">Region</label>
          <select
            onChange={(e) => {
              const v = e.target.value;
              const id = v ? parseInt(v) : null;
              setSelectedRegion(id);
              if (id !== null) onRegionChange?.(id);
            }}
            className="w-full p-2 border rounded"
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
        <div>
          <label className="text-sm font-medium">Branch</label>
          <select
            onChange={(e) => {
              const v = e.target.value;
              setSelectedBranch(v ? parseInt(v) : null);
            }}
            className="w-full p-2 border rounded"
          >
            <option value="0">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* START DATE */}
      <div>
        <label className="text-sm font-medium">Start Date</label>
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={criteria !== "open"}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* END DATE */}
      <div>
        <label className="text-sm font-medium">End Date</label>
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={criteria !== "open"}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* APPLY BUTTON */}
      <div className="col-span-full flex justify-center mt-1">
        <button
          onClick={applyFilter}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg font-semibold shadow"
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
}


