import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  regions?: any[];
  branches?: any[];
  onRegionChange?: (id: number) => void;
  onApply: (filters: any) => void;
   onExport?: () => void;   // ✅ ADD THIS
  isExporting?: boolean;     // ✅ ADD THIS
};

export default function StoreComparisonFilters({
  regions = [],
  branches = [],
  onApply,
  onRegionChange,
   onExport,
  isExporting = false
}: Props) {

  const [currentFrom, setCurrentFrom] = useState("");
  const [currentTo, setCurrentTo] = useState("");

  const [lastFrom, setLastFrom] = useState("");
  const [lastTo, setLastTo] = useState("");

  const [regionId, setRegionId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);

  // ----------------------------
  // FORMAT (same as dashboard)
  // ----------------------------
  const format = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };



  // ----------------------------
  // DEFAULT: Last 7 days vs previous 7 days (10 AM)
  // ----------------------------
  useEffect(() => {
    const today = new Date();

    const cTo = new Date(today);
    cTo.setHours(10, 0, 0, 0);

    const cFrom = new Date();
    cFrom.setDate(today.getDate() - 7);
    cFrom.setHours(10, 0, 0, 0);

    const lTo = new Date();
    lTo.setDate(today.getDate() - 7);
    lTo.setHours(10, 0, 0, 0);

    const lFrom = new Date();
    lFrom.setDate(today.getDate() - 14);
    lFrom.setHours(10, 0, 0, 0);

    setCurrentFrom(format(cFrom));
    setCurrentTo(format(cTo));
    setLastFrom(format(lFrom));
    setLastTo(format(lTo));
  }, []);

  // ----------------------------
  // APPLY
  // ----------------------------
  const apply = () => {
    if (!currentFrom || !currentTo || !lastFrom || !lastTo) {
      alert("Please select all dates");
      return;
    }

    onApply({
      currentFrom,
      currentTo,
      lastFrom,
      lastTo,
      regionId,
      branchId
    });
  };

  return (
    <div className="bg-white shadow-lg border p-4 rounded-lg">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* CURRENT */}
        <div className="border p-3 rounded bg-gray-50">
          <h4 className="text-sm font-bold text-[#d9232e] mb-2">CURRENT</h4>

          <label className="text-xs">From</label>
          <input
            type="datetime-local"
            value={currentFrom}
            onChange={(e) => setCurrentFrom(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />

          <label className="text-xs">To</label>
          <input
            type="datetime-local"
            value={currentTo}
            onChange={(e) => setCurrentTo(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* LAST */}
        <div className="border p-3 rounded bg-gray-50">
          <h4 className="text-sm font-bold text-gray-700 mb-2">LAST</h4>

          <label className="text-xs">From</label>
          <input
            type="datetime-local"
            value={lastFrom}
            onChange={(e) => setLastFrom(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />

          <label className="text-xs">To</label>
          <input
            type="datetime-local"
            value={lastTo}
            onChange={(e) => setLastTo(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* FILTERS */}
        <div className="border p-3 rounded bg-gray-50">
          <h4 className="text-sm font-bold text-gray-700 mb-2">FILTERS</h4>

          <label className="text-xs">Region</label>
          <select
            onChange={(e) => {
              const v = e.target.value;
              const id = v && v !== "0" ? parseInt(v) : null;

              setRegionId(id);
              setBranchId(null); // reset branch on region change

              if (id !== null) onRegionChange?.(id);
            }}
            className="w-full p-2 border rounded mb-2"
          >
            <option value="0">All Regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <label className="text-xs">Branch</label>
          <select
            onChange={(e) => {
              const v = e.target.value;
              setBranchId(v && v !== "0" ? parseInt(v) : null);
            }}
            className="w-full p-2 border rounded"
          >
            <option value="0">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* APPLY BUTTON */}
      {/* <div className="flex justify-center mt-4">
        <button
          onClick={apply}
          className="bg-[#d9232e] hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow font-semibold"
        >
          Apply Comparison
        </button>
      </div> */}


<div className="flex justify-center gap-3 mt-4">

  {/* APPLY */}
  <button
    onClick={apply}
    className="bg-[#d9232e] hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow font-semibold"
  >
    Apply Comparison
  </button>

  {/* EXPORT */}
  {onExport && (
    <button
      onClick={onExport}
      disabled={isExporting}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
    >
      {isExporting && <Loader2 className="animate-spin h-4 w-4" />}
      {isExporting ? "Exporting..." : "Export to Excel"}
    </button>
  )}

</div>

    </div>
  );
}