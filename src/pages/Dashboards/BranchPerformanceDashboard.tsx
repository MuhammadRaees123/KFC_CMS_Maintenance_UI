import React, { useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import { Channel3DChart } from "@/components/Channel3DChart";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Loader2,
  ArrowUp
} from "lucide-react";

import {
  getDashboardFilterAccess,
  getRegionsForDashboard,
  getBranchesForDashboard,
  getBranchPerformance,
  getBranchPerformancePickup
} from "@/services/api";

import DashboardFilters from "@/components/DashboardFilters";
import PaymentMode3DChart from "@/components/PagesComponents/PaymentMode3DChart";
import PaymentMode3DChartPickup from "@/components/PagesComponents/PaymemtMode3DChartPickup";
import BPD_CancelRejectOrders from "@/components/PagesComponents/BPD_CancelRejectOrders";
import BPD_CancelRejectOrdersPickup from "@/components/PagesComponents/BPD_CancelRejectOrdersPickup";
import BPD_CancelRejectReasonWise from "@/components/PagesComponents/BPD_CancelRejectReasonWise";
import CollapsibleCard from "@/components/Collapse/CollapsibleCard";

type Region = { id: number; name: string };
type Branch = { id: number; name: string };

type BranchRow = {
  branchName: string;
  sosPct: number;
  complaintPct: number;
  cancelRejectPct: number;
  totalTransactions: number;
  branchHealthScore: number;
  foodPanda?: number;
  webApp?: number;
  callCenter?: number;
  // ✅ CATEGORY COUNTERS
  Accuracy: number;
  DBD: number;

  mtdTransactions?: number;
  mtdAverage?: number;
  mtdComplaints?: number;
  mtdComplaintPct?: number;
};


// =================== KPI CARD ==================
const CATEGORY_KEYS = [
  "Accuracy",
  "DBD",
  "Hospitality",
  "ProductQuality",
  "SOS",
  "Others"
];





const CATEGORY_MAP: any = {
  Accuracy: "accuracy",
  DBD: "dbd",
  Hospitality: "hospitality",
  ProductQuality: "productQuality",
  SOS: "sosComplaints",
  Others: "otherComplaints"
};

const buildCategoryDonuts = (
  rows: any[],
  selectedBranch: number | null
) => {
  let summary: Record<string, number> = {};

  CATEGORY_KEYS.forEach(k => (summary[k] = 0));

  const targetRows = selectedBranch ? rows.slice(0, 1) : rows;

  targetRows.forEach(r => {
    CATEGORY_KEYS.forEach(k => {
      const apiKey = CATEGORY_MAP[k];
      const val = r?.[k] ?? r?.[apiKey] ?? 0;   // ✅ BOTH SAFE
      summary[k] += Number(val);
    });
  });

  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  const donuts = CATEGORY_KEYS.map(k => ({
    key: k,
    label: k.replace("ProductQuality", "Product Quality"),
    count: summary[k],
    pct: total ? Number(((summary[k] / total) * 100).toFixed(1)) : 0
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, selectedBranch ? 6 : 5);

  return donuts;
};


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
    {/* Icon */}
    <div
      className="absolute -top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-md"
      style={{
        background: color.icon + "22",
        boxShadow: `0 8px 20px ${color.icon}55`,
        //border: `1px solid ${color.icon}33`,
        color: color.icon
      }}
    >
      {icon}
    </div>

    {/* Title */}
    <div className="text-xs uppercase tracking-wider text-gray-600">
      {title}
    </div>

    {/* Value OR Loader */}
    <div
      className="mt-4 text-4xl font-bold flex items-center gap-2"
      style={{ color: color.primary }}
    >
      {loading ? (
        <Loader2 className="animate-spin" style={{ color: color.primary }} />
      ) : (
        <CountUp end={value} decimals={decimals} duration={1.4} suffix={suffix} separator="," />
      )}
    </div>

    {/* Bottom Bar */}
    <div
      className="h-[3px] mt-4 rounded-full"
      style={{
        background: `linear-gradient(90deg, ${color.primary}, ${color.primary}55)`
      }}
    />
  </div>
);



// =================== PAGE ==================

export default function BranchPerformanceDashboard() {


  const [refreshKey, setRefreshKey] = useState(0);  // ✅ YAHAN
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rows, setRows] = useState<BranchRow[]>([]);

  const [rowsP, setRowsPickup] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(false);

  // INIT
  useEffect(() => {
    const load = async () => {
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

      const t = new Date();
      const p = new Date();
      p.setDate(t.getDate() - 7);
      setStartDate(p.toISOString().slice(0, 16));
      setEndDate(t.toISOString().slice(0, 16));

      //setTimeout(loadData, 250);

       setTimeout(() => {
      loadData();        // Delivery API
      loadDataPickup();  // PICKUP API FIX
    }, 250);
    };

    load();
  }, []);







  // LOAD DATA
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getBranchPerformance(startDate, endDate, selectedRegion, selectedBranch);



      const mapped = (data || []).map((b: any) => ({
        branchName: b.branchName ?? "",
        sosPct: Number(b.sosPct) || 0,
        complaintPct: Number(b.complaintPct) || 0,
        cancelRejectPct: Number(b.cancelRejectPct) || 0,
        totalTransactions: Number(b.totalTransactions) || 0,
        branchHealthScore: Number(b.branchHealthScore) || 0,

        // ✅ SAFELY CONVERT CATEGORY COUNTS
        Accuracy: Number(b.accuracy) || 0,
        DBD: Number(b.dbd) || 0,
        Hospitality: Number(b.hospitality) || 0,
        ProductQuality: Number(b.productQuality) || 0,
        SOS: Number(b.sosComplaints) || 0,
        Others: Number(b.otherComplaints) || 0,


        foodPanda: Number(b.foodPanda) || 0,
        webApp: Number(b.webApp) || 0,
        callCenter: Number(b.callCenter) || 0,


        mtdTransactions: Number(b.mtdTransactions) || 0,
        mtdAverage: Number(b.mtdAverage) || 0,
        mtdComplaints: Number(b.mtdComplaints) || 0,
        mtdComplaintPct: Number(b.mtdComplaintPct) || 0
      }));

      setRows(mapped);
      console.log("First Row:", mapped[0]);
    } finally {
      setLoading(false);
    }
  };


  const loadDataPickup = async () => {
    setLoading(true);
    try {
      const data = await getBranchPerformancePickup(startDate, endDate, selectedRegion, selectedBranch);
      //     const mapped = (data || []).map((b: any) => ({
      //       branchName: b.branchName,
      //       sosPct: b.sosPct || 0,
      //       complaintPct: b.complaintPct || 0,
      //       cancelRejectPct: b.cancelRejectPct || 0,
      //       totalTransactions: b.totalTransactions || 0,
      //       branchHealthScore: b.branchHealthScore || 0,

      //       // ✅ CATEGORY COUNTERS (REAL API KEYS)
      // Accuracy: Number(b.accuracy || 0),
      // DBD: Number(b.dbd || 0),
      // Hospitality: Number(b.hospitality || 0),
      // ProductQuality: Number(b.productQuality || 0),
      // SOS: Number(b.sosComplaints || 0),
      // Others: Number(b.otherComplaints || 0)
      //     }));


      const mapped = (data || []).map((b: any) => ({
        branchName: b.branchName ?? "",
        sosPct: Number(b.sosPct) || 0,
        complaintPct: Number(b.complaintPct) || 0,
        cancelRejectPct: Number(b.cancelRejectPct) || 0,
        totalTransactions: Number(b.totalTransactions) || 0,
        branchHealthScore: Number(b.branchHealthScore) || 0,

        // ✅ SAFELY CONVERT CATEGORY COUNTS
        Accuracy: Number(b.accuracy) || 0,
        DBD: Number(b.dbd) || 0,
        Hospitality: Number(b.hospitality) || 0,
        ProductQuality: Number(b.productQuality) || 0,
        SOS: Number(b.sosComplaints) || 0,
        Others: Number(b.otherComplaints) || 0,


        foodPanda: Number(b.foodPanda) || 0,
        webApp: Number(b.webApp) || 0,
        callCenter: Number(b.callCenter) || 0,


        mtdTransactions: Number(b.mtdTransactions) || 0,
        mtdAverage: Number(b.mtdAverage) || 0,
        mtdComplaints: Number(b.mtdComplaints) || 0,
        mtdComplaintPct: Number(b.mtdComplaintPct) || 0
      }));

      setRowsPickup(mapped);
      console.log("First Row:", mapped[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (!startDate || !endDate) return;
  loadData();
  loadDataPickup();
}, [refreshKey]);   // ✅ Har apply per data reload


  // KPIs
  const kpi = useMemo(() => {
    if (!rows.length) return { orders: 0, delivered: 0, complaints: 0, health: 0 };
    const avg = (f: any) => rows.reduce((a, b) => a + f(b), 0) / rows.length;

    return {
      orders: rows.reduce((a, b) => a + b.totalTransactions, 0),
      delivered: avg((r: BranchRow) => r.sosPct), // replace later if you add delivered count
      complaints: avg((r: BranchRow) => r.complaintPct),
      health: avg((r: BranchRow) => r.branchHealthScore)
    };
  }, [rows]);



    const kpiP = useMemo(() => {
    if (!rowsP.length) return { orders: 0, delivered: 0, complaints: 0, health: 0 };
    const avg = (f: any) => rowsP.reduce((a, b) => a + f(b), 0) / rowsP.length;

    return {
      orders: rowsP.reduce((a, b) => a + b.totalTransactions, 0),
      delivered: avg((r: BranchRow) => r.sosPct), // replace later if you add delivered count
      complaints: avg((r: BranchRow) => r.complaintPct),
      health: avg((r: BranchRow) => r.branchHealthScore)
    };
  }, [rowsP]);

  // CHART
  const chartOptions: Highcharts.Options = {
    chart: { type: "column", height: 280, backgroundColor: "transparent" },
    title: { text: "" },
    xAxis: { categories: rows.map(r => r.branchName), labels: { rotation: -35 } },
    yAxis: { max: 100, title: { text: "" } },
    legend: { enabled: false },
    plotOptions: {
      column: {
        borderRadius: 8,
        colorByPoint: true,
        colors: ["#22c55e", "#2563eb", "#ef4444"],
        dataLabels: { enabled: true, format: "{y:.0f}%" }
      }
    },
    series: [{ type: "column", data: rows.map(r => r.sosPct) }]
  };


  const DonutCard = ({ title, value, pct, color }: any) => (
    <div className="relative rounded-2xl bg-white/70 backdrop-blur-xl border shadow-lg p-4 hover:shadow-xl">

      <h4 className="font-semibold text-gray-700 text-sm mb-2">{title}</h4>

      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: { type: "pie", height: 180, backgroundColor: "transparent" },
          title: {
            text: `${pct}%`,
            align: "center",
            verticalAlign: "middle",
            style: { fontSize: "20px", color }
          },
          tooltip: {
            pointFormat: "<b>{point.y}</b> complaints"
          },
          plotOptions: {
            pie: {
              innerSize: "70%",
              dataLabels: { enabled: false }
            }
          },
          series: [{
            type: "pie",
            data: [
              { y: value, color },
              { y: Math.max(100 - pct, 0), color: "#eee" }
            ]
          }]
        }}
      />

      <div className="text-center text-sm font-semibold" style={{ color }}>
        {value} complaints
      </div>
    </div>
  );


  // COLOR MAP
  const COLORS = [
    { bg: "#f0f6ff", primary: "#2563eb", icon: "#2563eb" },
    { bg: "#ecfdf5", primary: "#16a34a", icon: "#16a34a" },
    { bg: "#fff1f2", primary: "#d9232e", icon: "#d9232e" },
    { bg: "#fff7ed", primary: "#f59e0b", icon: "#f59e0b" }
  ];

  const categoryDonuts = useMemo(() => {
    return buildCategoryDonuts(rows as any[], selectedBranch);
  }, [rows, selectedBranch]);


    const categoryDonutsP = useMemo(() => {
    return buildCategoryDonuts(rowsP as any[], selectedBranch);
  }, [rowsP, selectedBranch]);

  const channelSummary = useMemo(() => {
    if (!rows.length) {
      return { foodPanda: 0, webApp: 0, callCenter: 0, branchName: "All Branches" };
    }

    // ✅ If branch selected → show that one
    if (selectedBranch) {
      return {
        foodPanda: Number(rows[0]?.foodPanda || 0),
        webApp: Number(rows[0]?.webApp || 0),
        callCenter: Number(rows[0]?.callCenter || 0),
        branchName: rows[0]?.branchName || ""
      };
    }

    // ✅ Otherwise SUM ALL branches
    return rows.reduce(
      (acc: any, cur: any) => {
        acc.foodPanda += Number(cur.foodPanda || 0);
        acc.webApp += Number(cur.webApp || 0);
        acc.callCenter += Number(cur.callCenter || 0);
        return acc;
      },
      { foodPanda: 0, webApp: 0, callCenter: 0, branchName: "All Branches" }
    );
  }, [rows, selectedBranch]);



  const channelSummaryP = useMemo(() => {
    if (!rowsP.length) {
      return { foodPanda: 0, webApp: 0, callCenter: 0, branchName: "All Branches" };
    }

    // ✅ If branch selected → show that one
    if (selectedBranch) {
      return {
        foodPanda: Number(rowsP[0]?.foodPanda || 0),
        webApp: Number(rowsP[0]?.webApp || 0),
        callCenter: Number(rowsP[0]?.callCenter || 0),
        branchName: rowsP[0]?.branchName || ""
      };
    }

    // ✅ Otherwise SUM ALL branches
    return rowsP.reduce(
      (acc: any, cur: any) => {
        acc.foodPanda += Number(cur.foodPanda || 0);
        acc.webApp += Number(cur.webApp || 0);
        acc.callCenter += Number(cur.callCenter || 0);
        return acc;
      },
      { foodPanda: 0, webApp: 0, callCenter: 0, branchName: "All Branches" }
    );
  }, [rowsP, selectedBranch]);


  const mtdSummary = useMemo(() => {

    if (!rows.length) {
      return {
        mtdTransactions: 0,
        mtdAverage: 0,
        mtdComplaints: 0,
        mtdComplaintPct: 0,
        sosPct: 0,
        cancelRejectPct: 0
      };
    }

    // ✅ If branch selected → use that
    if (selectedBranch) {
      const b = rows[0];
      return {
        mtdTransactions: Number(b.mtdTransactions || 0),
        mtdAverage: Number(b.mtdAverage || 0),
        mtdComplaints: Number(b.mtdComplaints || 0),
        mtdComplaintPct: Number(b.mtdComplaintPct || 0),
        sosPct: Number(b.sosPct || 0),
        cancelRejectPct: Number(b.cancelRejectPct || 0)
      };
    }

    // ✅ All branches aggregated
    const totalOrders = rows.reduce((s, r: any) => s + Number(r.mtdTransactions || 0), 0);
    const totalComplaints = rows.reduce((s, r: any) => s + Number(r.mtdComplaints || 0), 0);
    const avgSOS = rows.length
      ? rows.reduce((s, r: any) => s + Number(r.sosPct || 0), 0) / rows.length
      : 0;


    return {
      mtdTransactions: totalOrders,
      mtdAverage: Math.round(totalOrders / new Date().getDate()),
      mtdComplaints: totalComplaints,
      mtdComplaintPct: totalOrders ? Number(((totalComplaints / totalOrders) * 100).toFixed(2)) : 0,
      sosPct: Number(avgSOS.toFixed(1)),
      cancelRejectPct:
        rows.reduce((s, r: any) => s + Number(r.cancelRejectPct || 0), 0) / rows.length
    };

  }, [rows, selectedBranch]);


const BackToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 bg-[#d9232e] text-white p-3 rounded-full shadow-lg hover:bg-[#b71c1c] transition-all duration-300"
      title="Back to Top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};



  return (
   <div className="space-y-6 animate-fadeIn">

      {/* FILTER BAR */}
   
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
        setSelectedRegion(regionId);
        setSelectedBranch(branchId);
    
        //loadData();
        setRefreshKey(k => k + 1);
      }}
    />


{/* <div className="w-full my-6">
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-2">
    <h2 className="text-lg font-semibold tracking-wide text-red-700 uppercase text-center">
      DELIVERY Only
    </h2>
  </div>
</div> */}


<CollapsibleCard title="Delivery Only">


      {/* KPI CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Orders" value={kpi.orders} icon={<Users />} color={COLORS[0]} loading={loading} />
        <KPICard title="Delivered Orders" value={Math.round(kpi.delivered)} suffix="%" icon={<CheckCircle />} color={COLORS[1]} loading={loading} />
        <KPICard title="Total Complaints" value={Math.round(kpi.complaints)} suffix="%" icon={<AlertTriangle />} color={COLORS[2]} loading={loading} />
        <KPICard title="Branch Health Score" value={kpi.health} decimals={1} icon={<TrendingUp />} color={COLORS[3]} loading={loading} />
      </div>


      <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">

          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Channel Wise Orders (Delivery Only)
            </h3>
          </div>

          {/* ✅ LOADER OR CHART */}
          <div className="h-[340px] flex items-center justify-center">
            {loading ? (
              <Loader2 className="animate-spin text-red-600 w-10 h-10" />
            ) : (
              <Channel3DChart branch={channelSummary} />
            )}
          </div>

        </div>





 <BPD_CancelRejectOrders
        key={refreshKey}
  startDate={startDate}
  endDate={endDate}
  regionId={selectedRegion}
  branchId={selectedBranch}
  refreshKey={refreshKey}
/>


      </div>


<div className="grid grid-cols-2 lg:grid-cols-1 gap-12 mt-12">

   <BPD_CancelRejectReasonWise
        key={refreshKey}
  startDate={startDate}
  endDate={endDate}
  regionId={selectedRegion}
  branchId={selectedBranch}
  refreshKey={refreshKey}
/>
</div>



   <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">



               <PaymentMode3DChart
        key={refreshKey}
  startDate={startDate}
  endDate={endDate}
  regionId={selectedRegion}
  branchId={selectedBranch}
  refreshKey={refreshKey}
/>


      </div>


      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-1">
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Complaint Categories (Delivery Only)
            </h3>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">

            {loading ? (
              // ✅ SKELETON DONUT PLACEHOLDERS
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 bg-white shadow animate-pulse flex flex-col gap-3"
                >
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>

                  <div className="h-32 w-32 mx-auto rounded-full bg-gray-200"></div>

                  <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                </div>
              ))
            ) : (
              // ✅ REAL DONUTS
              categoryDonuts.map((item, i) => (
                <DonutCard
                  key={item.key}
                  title={item.key.replace("ProductQuality", "Product Quality")}
                  value={item.count}
                  count={item.count}
                  pct={item.pct}
                  color={[
                    "#d9232e",
                    "#2563eb",
                    "#16a34a",
                    "#eab308",
                    "#9333ea"
                  ][i % 5]}
                />
              ))
            )}

          </div>



        </div>


      </div>



<div className="bg-white shadow-lg border p-5 hover:shadow-2xl transition-all border-gray-100">
 <div className="flex justify-between items-center mb-4 border-b pb-2">
  <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
    Month To Date Performance (Delivery Only)
  </h3>
  </div>

  {/* ✅ LOADER */}
  {loading ? (

    // ===== SKELETON UI =====
    <div className="grid grid-cols-2 gap-4 animate-pulse">

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4 h-20"></div>
      ))}

      <div className="col-span-2 mt-3 space-y-3">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded"></div>
      </div>

    </div>

  ) : (

    <>
      {/* ✅ BADGE METRICS */}
      <div className="grid grid-cols-2 gap-4 text-sm hover:shadow-2xl transition-all border border-gray-100 p-5 rounded-xl">

        {/* ORDERS */}
        <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center">
          <span className="text-gray-500">MTD Orders</span>
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full font-bold shadow">
            <CountUp end={mtdSummary.mtdTransactions} separator="," />
          </span>
        </div>

        {/* AVG */}
        <div className="bg-green-50 p-4 rounded-xl flex justify-between items-center">
          <span className="text-gray-500">Avg / Day</span>
          <span className="bg-green-600 text-white px-3 py-1 rounded-full font-bold shadow">
            <CountUp end={mtdSummary.mtdAverage} separator="," />
          </span>
        </div>

        {/* COMPLAINTS */}
        <div className="bg-red-50 p-4 rounded-xl flex justify-between items-center">
          <span className="text-gray-500">MTD Complaints</span>
          <span className="bg-red-600 text-white px-3 py-1 rounded-full font-bold shadow">
            <CountUp end={mtdSummary.mtdComplaints} separator="," />
          </span>
        </div>

        {/* RATE */}
        <div className="bg-yellow-50 p-4 rounded-xl flex justify-between items-center">
          <span className="text-gray-500">Rate %</span>
          <span className="bg-yellow-500 text-white px-3 py-1 rounded-full font-bold shadow">
            {mtdSummary.mtdComplaintPct}%
          </span>
        </div>

      </div>

      {/* ✅ PROGRESS METRICS */}
      <div className="mt-5 space-y-3 text-sm hover:shadow-2xl transition-all border border-gray-100 p-5 rounded-xl">

        {/* SOS */}
        <div>
          <div className="flex justify-between font-medium">
            <span>SOS Compliance</span>
            <span className={`${
              mtdSummary.sosPct >= 80 ? "text-green-600" :
              mtdSummary.sosPct >= 60 ? "text-yellow-600" : "text-red-600"
            } font-bold`}>
              {mtdSummary.sosPct}%
            </span>
          </div>

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all rounded-full"
              style={{
                width: `${mtdSummary.sosPct}%`,
                background: mtdSummary.sosPct >= 80 ? "#16a34a"
                          : mtdSummary.sosPct >= 60 ? "#eab308"
                          : "#dc2626"
              }}
            />
          </div>
        </div>

        {/* CANCEL */}
        <div>
          <div className="flex justify-between font-medium">
            <span>Cancel / Reject</span>
            <span className="text-red-600 font-bold">
              {mtdSummary.cancelRejectPct ?? 0}%
            </span>
          </div>

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{
                width: `${mtdSummary.cancelRejectPct || 0}%`
              }}
            />
          </div>
        </div>

      </div>

      {/* ✅ FOOTER STATUS */}
      <div className="mt-4 flex justify-end">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          mtdSummary.mtdComplaintPct < 0.5 ? "bg-green-100 text-green-700"
          : mtdSummary.mtdComplaintPct < 1 ? "bg-yellow-100 text-yellow-700"
          : "bg-red-100 text-red-700"
        }`}>
          {
            mtdSummary.mtdComplaintPct < 0.5 ? "Healthy"
            : mtdSummary.mtdComplaintPct < 1 ? "Warning"
            : "Critical"
          }
        </span>
      </div>

    </>
  )}

</div>


</CollapsibleCard>

{/* <div className="w-full my-6">
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-2">
    <h2 className="text-lg font-semibold tracking-wide text-red-700 uppercase text-center">
      Pickup Only
    </h2>
  </div>
</div> */}


<CollapsibleCard title="PICKUP Only">

   {/* KPI CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Orders" value={kpiP.orders} icon={<Users />} color={COLORS[0]} loading={loading} />
        <KPICard title="Delivered Orders" value={Math.round(kpiP.delivered)} suffix="%" icon={<CheckCircle />} color={COLORS[1]} loading={loading} />
        <KPICard title="Total Complaints" value={Math.round(kpiP.complaints)} suffix="%" icon={<AlertTriangle />} color={COLORS[2]} loading={loading} />
        <KPICard title="Branch Health Score" value={kpiP.health} decimals={1} icon={<TrendingUp />} color={COLORS[3]} loading={loading} />
      </div>


      <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">

          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Channel Wise Orders (Pickup Only)
            </h3>
          </div>

          {/* ✅ LOADER OR CHART */}
          <div className="h-[340px] flex items-center justify-center">
            {loading ? (
              <Loader2 className="animate-spin text-red-600 w-10 h-10" />
            ) : (
              <Channel3DChart branch={channelSummaryP} />
            )}
          </div>

        </div>


 


 <BPD_CancelRejectOrdersPickup
        key={refreshKey}
  startDate={startDate}
  endDate={endDate}
  regionId={selectedRegion}
  branchId={selectedBranch}
  refreshKey={refreshKey}
/>


      </div>


<div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">



       <PaymentMode3DChartPickup
        key={refreshKey}
  startDate={startDate}
  endDate={endDate}
  regionId={selectedRegion}
  branchId={selectedBranch}
  refreshKey={refreshKey}
/>


      </div>


      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-1">
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Complaint Categories (Pickup Only)
            </h3>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">

            {loading ? (
              // ✅ SKELETON DONUT PLACEHOLDERS
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 bg-white shadow animate-pulse flex flex-col gap-3"
                >
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>

                  <div className="h-32 w-32 mx-auto rounded-full bg-gray-200"></div>

                  <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                </div>
              ))
            ) : (
              // ✅ REAL DONUTS
              categoryDonutsP.map((item, i) => (
                <DonutCard
                  key={item.key}
                  title={item.key.replace("ProductQuality", "Product Quality")}
                  value={item.count}
                  count={item.count}
                  pct={item.pct}
                  color={[
                    "#d9232e",
                    "#2563eb",
                    "#16a34a",
                    "#eab308",
                    "#9333ea"
                  ][i % 5]}
                />
              ))
            )}

          </div>



        </div>


      </div>

      </CollapsibleCard>

<BackToTopButton />
    </div>
  );
}
