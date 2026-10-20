import React, { useEffect, useState } from "react";
import CountUp from "react-countup";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Loader2
} from "lucide-react";

import {
  getDashboardFilterAccess,
  getRegionsForDashboard,
  getBranchesForDashboard,
  getMenuKPIs,
  getMenuItemComplaintKPIs
} from "@/services/api";
import ComplaintItemsSection from "@/components/ComplaintItemsSection";
import ComplaintKeywordSection from "@/components/ComplaintKeywordSection";
import ComplaintKeywordModal from "@/components/ComplaintKeywordModal";
import DashboardFilters from "@/components/DashboardFilters";
// import ComplaintKeywordDonuts from "@/components/ComplaintKeywordDonuts";
// import "@/assets/complaintDonuts.css";


// ------------------ TYPES ------------------
type Region = { id: number; name: string };
type Branch = { id: number; name: string };

// ------------------ KPI CARD ------------------
const KPICard = ({
  title,
  value,
  color,
  icon,
  suffix = "",
  decimals = 0,
  loading = false
}: any) => (
  <div
    className="relative rounded-3xl p-6 border border-white/40 backdrop-blur-xl shadow-md hover:shadow-xl transition-all"
    style={{ background: color.bg }}
  >
    <div
      className="absolute -top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center"
      style={{
        background: color.icon + "22",
        boxShadow: `0 8px 20px ${color.icon}55`,
        color: color.icon
      }}
    >
      {icon}
    </div>

    <div className="text-xs uppercase tracking-wider text-gray-600">
      {title}
    </div>

    <div
      className="mt-4 text-4xl font-bold flex items-center"
      style={{ color: color.primary }}
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <CountUp
          end={value}
          decimals={decimals}
          duration={1.4}
          separator=","
          suffix={suffix}
        />
      )}
    </div>

    <div
      className="h-[3px] mt-4 rounded-full"
      style={{
        background: `linear-gradient(90deg, ${color.primary}, ${color.primary}55)`
      }}
    />
  </div>
);


// ------------------ COLORS ------------------
const COLORS = [
  { bg: "#f0f6ff", primary: "#2563eb", icon: "#2563eb" },
  { bg: "#ecfdf5", primary: "#16a34a", icon: "#16a34a" },
  { bg: "#fff1f2", primary: "#d9232e", icon: "#d9232e" },
  { bg: "#fff7ed", primary: "#f59e0b", icon: "#f59e0b" }
];

const dataKeyword = [
  { Keyword: "missing", Frequency: 1824, ImpactLevel: "High" },
  { Keyword: "cold food", Frequency: 558, ImpactLevel: "High" },
  { Keyword: "bad smell", Frequency: 91, ImpactLevel: "Low" },
  { Keyword: "bad taste", Frequency: 33, ImpactLevel: "Low" },
  { Keyword: "burnt food", Frequency: 24, ImpactLevel: "Low" },
  { Keyword: "low quality", Frequency: 21, ImpactLevel: "Low" },
  { Keyword: "stale food", Frequency: 19, ImpactLevel: "Low" },
  { Keyword: "raw food", Frequency: 18, ImpactLevel: "Low" },
];

// ================== PAGE ===================
export default function FoodAnalyticsDashboard() {

  const [ready, setReady] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  // const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  // const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<number>(0);
const [selectedBranch, setSelectedBranch] = useState<number>(0);

  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [menuKpis, setMenuKpis] = useState<any>(null);
  const [complaintItems, setComplaintItems] = useState<any[]>([]);
  const [complaintLoading, setComplaintLoading] = useState(false);

  // ========== INIT ==========
  useEffect(() => {

    console.log("🔁 FoodAnalyticsDashboard RENDER");

const init = async () => {
  const res = await getDashboardFilterAccess();

  if (res?.data) {
    setCanViewRegion(res.data.canViewRegion);
    setCanViewBranch(res.data.canViewBranch);

    const regionRes = await getRegionsForDashboard();
    if (regionRes?.data) setRegions(regionRes.data);

    if (res.data.defaultRegionId) {
      setSelectedRegion(res.data.defaultRegionId);
      const b = await getBranchesForDashboard(res.data.defaultRegionId);
      if (b?.data) setBranches(b.data);
    }

    if (res.data.defaultBranchId)
      setSelectedBranch(res.data.defaultBranchId);
  }

  // dates
  const t = new Date();
  const p = new Date();
  p.setDate(t.getDate() - 7);

  setStartDate(p.toISOString().slice(0, 16));
  setEndDate(t.toISOString().slice(0, 16));
};


    //init();
    init().then(() => setReady(true));
  }, []);


useEffect(() => {
  if (!ready) return;

  if (startDate && endDate) {
    console.log("🔥 Auto Load triggered once data ready");

    loadData(startDate, endDate, selectedRegion, selectedBranch);
  }
}, [ready, startDate, endDate, selectedRegion, selectedBranch]);




  // ========== LOAD KPIS ==========
  const loadData = async (
    sDate = startDate,
  eDate = endDate,
  rId = selectedRegion,
  bId = selectedBranch) => {

    console.log("📦 Parent loadData called");
    setLoading(true);
    try {
      const data = await getMenuKPIs(
        sDate,
        eDate,
        rId,
        bId
      );

      setMenuKpis(data?.[0] || data);

      const complaintData = await getMenuItemComplaintKPIs(
       sDate,
        eDate,
        rId,
        bId
      );


      setComplaintItems(complaintData || []);

    }
    finally {
      setLoading(false);
    }
  };


//   useEffect(() => {
//   if (!startDate || !endDate) return;
//   loadData();
// }, [startDate, endDate, selectedRegion, selectedBranch]);


  const loadComplaintKPIs = async (sDate, eDate, rId, bId) => {
    setComplaintLoading(true);
    const res = await getMenuItemComplaintKPIs(sDate, eDate, rId, bId);
    setComplaintItems(res || []);
    setComplaintLoading(false);
  };
  // ================== JSX ==================
  return (

    <div className="space-y-6 animate-fadeIn">

      {/* FILTER BAR */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg shadow border">

        {canViewRegion && (
          <div>
            <label className="text-sm font-medium">Region</label>
            <select
              value={selectedRegion ?? ""}
              onChange={(e) => {
                const regionId = parseInt(e.target.value);
                setSelectedRegion(regionId);
                getBranchesForDashboard(regionId)
                  .then(res => res.data && setBranches(res.data));
              }}
              className="w-full p-2 border rounded"
            >
              <option value="0">-- Select Region --</option>
              {regions.map(r =>
                <option key={r.id} value={r.id}>{r.name}</option>
              )}
            </select>
          </div>
        )}

        {canViewBranch && (
          <div>
            <label className="text-sm font-medium">Branch</label>
            <select
              value={selectedBranch ?? ""}
              onChange={(e) => setSelectedBranch(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value="0">-- Select Branch --</option>
              {branches.map(b =>
                <option key={b.id} value={b.id}>{b.name}</option>
              )}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Start Date</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="text-sm font-medium">End Date</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="col-span-full flex justify-center">
          
            <button
  onClick={() => {
    setStartDate(startDate);
    setEndDate(endDate);
    setSelectedRegion(selectedRegion);
    setSelectedBranch(selectedBranch);
  }}
   className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold"
          
>
            Apply Filter
          </button>
        </div>

      </div> */}


      <DashboardFilters
  regions={regions}
  branches={branches}
  canViewRegion={canViewRegion}
  canViewBranch={canViewBranch}
  onRegionChange={async (id) => {
    const res = await getBranchesForDashboard(id);
    setBranches(res?.data || []);
  }}
  onApply={({ startDate, endDate, regionId, branchId }) => {

    setStartDate(startDate);
    setEndDate(endDate);
     setSelectedRegion(regionId ?? 0);
  setSelectedBranch(branchId ?? 0);

    //loadData();
    loadData(startDate, endDate, regionId ?? 0, branchId ?? 0);

  }}
/>


      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

        <KPICard
          title="Total Orders"
          value={menuKpis?.totalOrders || 0}
          icon={<Users />}
          color={COLORS[0]}
          loading={loading}
        />

        <KPICard
          title="Items Sold"
          value={menuKpis?.totalItemsSold || 0}
          icon={<CheckCircle />}
          color={COLORS[1]}
          loading={loading}
        />

        <KPICard
          title="Revenue PKR"
          value={menuKpis?.totalRevenue || 0}
          //suffix=" PKR"
          icon={<TrendingUp />}
          color={COLORS[2]}
          loading={loading}
        />

        <KPICard
          title="Avg / Order"
          value={menuKpis?.avgItemsPerOrder || 0}
          decimals={2}
          icon={<AlertTriangle />}
          color={COLORS[3]}
          loading={loading}
        />

      </div>



      {/* TOP ITEM */}
      <div className="relative bg-gradient-to-br from-white to-[#fff3f3] shadow-xl rounded-2xl border border-red-100 p-6 overflow-hidden group hover:shadow-2xl transition-all">

        {/* Decorative Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition" />

        {/* HEADER */}
        <div className="flex justify-between items-start relative z-10">

          {/* LEFT */}
          <div>
            
            <h1 className="text-s tracking-wide uppercase text-red-600 font-bold"> Top Selling Item</h1>

            {loading ? (
              <div className="mt-2 h-4 w-40 bg-gray-200 rounded animate-pulse" />
            ) : (
              <h2 className="text-lg font-bold text-gray-800 leading-tight mt-1">
                {menuKpis?.topItemName ?? "N/A"}
              </h2>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Highest sales during selected period
            </p>
          </div>

          {/* ICON BADGE */}
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-red-500 to-yellow-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-bold">🔥</span>
          </div>

        </div>

        {/* BODY */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 mt-5 animate-pulse">
            <div className="bg-gray-200 h-12 rounded-xl"></div>
            <div className="bg-gray-200 h-12 rounded-xl"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-5 relative z-10">

            {/* QUANTITY */}
            <div className="bg-white rounded-xl shadow p-3 hover:scale-[1.02] transition">
              <p className="text-xs text-gray-500">Quantity Sold</p>
              <p className="text-lg font-bold text-green-600">
                {menuKpis?.topItemQuantity?.toLocaleString() ?? 0}
              </p>
            </div>

            {/* REVENUE */}
            <div className="bg-white rounded-xl shadow p-3 hover:scale-[1.02] transition">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-lg font-bold text-[#d9232e]">
                PKR {menuKpis?.topItemRevenue?.toLocaleString() ?? "0"}
              </p>
            </div>

          </div>
        )}

        {/* FOOTER */}
        {!loading && (
          <div className="mt-4 flex justify-end text-xs font-semibold text-gray-600 relative z-10">
            Performance Highlight
          </div>
        )}

      </div>

      {/* COMPLAINT ITEMS KPIs */}
      <ComplaintItemsSection
        data={complaintItems}
        loading={loading}
        onRefresh={loadComplaintKPIs}
      />


    <ComplaintKeywordSection
  startDate={startDate}
  endDate={endDate}
  regionId={selectedRegion}
  branchId={selectedBranch}
  onKeywordClick={(keyword) => setActiveKeyword(keyword)}
/>

{/* <ComplaintKeywordDonuts data={dataKeyword} />; */}

{activeKeyword && (
  <ComplaintKeywordModal
    keyword={activeKeyword}
    startDate={startDate}
    endDate={endDate}
    regionId={selectedRegion}
    branchId={selectedBranch}
    onClose={() => setActiveKeyword(null)}
  />
)}

    </div>
  );
}
