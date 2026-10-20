import React, { useEffect, useState } from "react";
import StoreComparisonFilters from "@/components/StoreComparisonFilters";
import { GetStoreComparison, getRegionsForDashboard, getBranchesForDashboard, exportStoreComparisonReport } from "@/services/api";
import RegionSummaryCard from "@/components/PagesComponents/RegionSummaryCard";


export default function BranchComparisonReport() {

  // 🔹 Data
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Filters
  const [currentFrom, setCurrentFrom] = useState("");
  const [currentTo, setCurrentTo] = useState("");
  const [lastFrom, setLastFrom] = useState("");
  const [lastTo, setLastTo] = useState("");
  const [regionId, setRegionId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // 🔹 Region / Branch
  const [regions, setRegions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // ----------------------------
  // LOAD REGIONS (same as dashboard)
  // ----------------------------
  useEffect(() => {
    loadRegions();
  }, []);


  const renderIndicator = (val: number) => {
  const num = Number(val ?? 0);
  const isPositive = num >= 0;

  return (
    <div className="flex items-center justify-end gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          isPositive ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className={isPositive ? "text-green-600" : "text-red-600"}>
         {isPositive ? "▲" : "▼"}{num.toFixed(2)}%
      </span>
    </div>
  );
};

  const loadRegions = async () => {
    try {
      const res = await getRegionsForDashboard();
      setRegions(res?.data || []);
    } catch (err) {
      console.error("Error loading regions", err);
    }
  };

  // ----------------------------
  // LOAD BRANCHES ON REGION CHANGE
  // ----------------------------
  const loadBranches = async (regionId: number) => {
    try {
      const res = await getBranchesForDashboard(regionId);
      setBranches(res?.data || []);
    } catch (err) {
      console.error("Error loading branches", err);
    }
  };

  const regionSummary = (() => {

  const grouped: any = {};

  data.forEach((item: any) => {
    if (!grouped[item.region]) {
      grouped[item.region] = {
        region: item.region,
        trxCurrent: 0,
        trxLast: 0
      };
    }

    grouped[item.region].trxCurrent += Number(item.trx_Current ?? 0);
    grouped[item.region].trxLast += Number(item.trx_Last ?? 0);
  });

  const regions = Object.values(grouped);

  // 🔥 Nationwide calculation
  const totalCurrent = regions.reduce((sum: number, r: any) => sum + r.trxCurrent, 0);
  const totalLast = regions.reduce((sum: number, r: any) => sum + r.trxLast, 0);

  const nationwide = {
    region: "Nationwide",
    trxCurrent: totalCurrent,
    trxLast: totalLast
  };

  // 👇 IMPORTANT: add at start
  return [nationwide, ...regions];

})();

  // ----------------------------
  // MAIN DATA LOAD
  // ----------------------------
  useEffect(() => {
    if (!currentFrom || !currentTo) return;

    loadData();
  }, [refreshKey]);


const handleExport = async () => {
  setIsExporting(true);
  try {
    await exportStoreComparisonReport(
      currentFrom,
      currentTo,
      lastFrom,
      lastTo,
      regionId,
      branchId
    );
  } catch (err) {
    console.error("Export failed:", err);
  } finally {
    setIsExporting(false);
  }
};
  

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await GetStoreComparison(
        currentFrom,
        currentTo,
        lastFrom,
        lastTo,
        regionId,
        branchId
      );

      setData(res || []);
    } catch (err) {
      console.error("Error loading comparison", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };


   

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div className="space-y-4">

      {/* 🔥 FILTERS */}
      <StoreComparisonFilters
        regions={regions}
        branches={branches}
        onRegionChange={(id) => loadBranches(id)}
        onApply={(f) => {
          setCurrentFrom(f.currentFrom);
          setCurrentTo(f.currentTo);
          setLastFrom(f.lastFrom);
          setLastTo(f.lastTo);
          setRegionId(f.regionId);
          setBranchId(f.branchId);

          setRefreshKey((prev) => prev + 1);
        }}
        onExport={handleExport}        // ✅ HERE
        isExporting={isExporting}          // ✅ HERE
      />


      <div className="flex justify-center items-center gap-4 mb-6">
  {regionSummary.map((r: any, i) => (
    <RegionSummaryCard
      key={i}
      region={r.region}
      trxCurrent={r.trxCurrent}
      trxLast={r.trxLast}
    />
  ))}
</div>

      {/* 🔥 TABLE */}
      <div className="bg-white border shadow rounded">

        <div className="bg-[#d9232e] text-white text-center py-2 font-bold">
          Store Comparison
        </div>

        <div className="overflow-x-auto">

          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              Loading...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs uppercase">
                <tr>
                  <th className="p-2 text-left">Region</th>
                  <th className="p-2 text-left">Store</th>
                  <th className="p-2 text-right">Trx Current</th>
                  <th className="p-2 text-right">Net Current</th>
                  <th className="p-2 text-right">Trx Last</th>
                  <th className="p-2 text-right">Net Last</th>
                  <th className="p-2 text-right">Trx %</th>
                  <th className="p-2 text-right">Net %</th>
                </tr>
              </thead>

              <tbody>
                {data.map((x, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{x.region}</td>
                    <td className="p-2 font-medium">{x.store}</td>

                    <td className="p-2 text-right">{x.trx_Current}</td>
                    <td className="p-2 text-right">{x.amt_Current}</td>

                    <td className="p-2 text-right">{x.trx_Last}</td>
                    <td className="p-2 text-right">{x.amt_Last}</td>

                    <td className="p-2 text-right">
  {renderIndicator(x.trx_Percentage)}
</td>

<td className="p-2 text-right">
  {renderIndicator(x.amt_Percentage)}
</td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}

        </div>
      </div>

    </div>
  );
}