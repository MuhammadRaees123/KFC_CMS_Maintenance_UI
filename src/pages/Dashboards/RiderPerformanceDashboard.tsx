// /src/pages/Dashboards/RiderPerformanceDashboard.tsx

import React, { useEffect, useMemo, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import CountUp from "react-countup";
import {
  Loader2,
  ArrowUp,
  Bike,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Timer,
  Users,
} from "lucide-react";

// ---------- FILTER ACCESS + REGION/BRANCH ----------
import {
  getDashboardFilterAccess,
  getRegionsForDashboard,
  getBranchesForDashboard,
} from "@/services/api";

// ---------- RIDER DASHBOARD ENDPOINT ----------
import { getRiderPerformanceSummary } from "@/services/api.ts";
import DashboardFilters from "@/components/DashboardFilters";

// ---------- TYPES ----------
type Region = { id: number; name: string };
type Branch = { id: number; name: string };

type RiderRow = {
  region: string;
  branchName: string;
  branchRiderID: number;
  riderName: string;
  employeeID: string;
  riderStatus: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelRejectOrders: number;
  cancelRejectPct: number;
  complaints: number;
  complaintPct: number;
  invalidComplaints: number;
  sosPct: number;
  sosMinutes: number;
  istMinutes: number;
  istPct: number;
  workingDays: number;
  productivity: number;
  perDayOrders: number;
};

export default function RiderPerformanceDashboard() {
  // ---------------------- FILTERS ----------------------

  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);

  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // ---------------- RAG STATUS LOGIC ----------------

  const getStatusBadge = (value: number, type: "sos" | "ist" | "complaint" | "productivity") => {
    switch (type) {
      case "sos":
      case "ist":
        if (value >= 85) return { label: "GOOD", color: "bg-green-500 text-white" };
        if (value >= 70) return { label: "WARN", color: "bg-yellow-400 text-gray-900" };
        return { label: "BAD", color: "bg-red-500 text-white" };

      case "complaint":
        if (value < 2) return { label: "GOOD", color: "bg-green-500 text-white" };
        if (value <= 5) return { label: "WARN", color: "bg-yellow-400 text-gray-900" };
        return { label: "BAD", color: "bg-red-500 text-white" };

      case "productivity":
        if (value >= 3) return { label: "GOOD", color: "bg-green-500 text-white" };
        if (value >= 2) return { label: "WARN", color: "bg-yellow-400 text-gray-900" };
        return { label: "BAD", color: "bg-red-500 text-white" };

      default:
        return { label: "N/A", color: "bg-gray-400 text-white" };
    }
  };

  const Badge = ({ status }: { status: { label: string; color: string } }) => (
    <span className={`px-2 py-[2px] text-[10px] font-bold rounded ml-2 ${status.color}`}>
      {status.label}
    </span>
  );

  const [selectedRider, setSelectedRider] = useState<RiderRow | null>(null);
const [showModal, setShowModal] = useState(false);

const openRiderModal = (rider: RiderRow) => {
  setSelectedRider(rider);
  setShowModal(true);
};

const closeModal = () => {
  setSelectedRider(null);
  setShowModal(false);
};


  // ---------------------- DATA ----------------------
  const [riders, setRiders] = useState<RiderRow[]>([]);

  // ---------------------- INIT: FILTER ACCESS + DEFAULT DATES ----------------------
  // useEffect(() => {
  //   const init = async () => {
  //     try {
  //       const res = await getDashboardFilterAccess();
  //       if (res?.data) {
  //         setCanViewRegion(res.data.canViewRegion);
  //         setCanViewBranch(res.data.canViewBranch);

  //         if (res.data.canViewRegion) {
  //           const regionRes = await getRegionsForDashboard();
  //           if (regionRes?.data) setRegions(regionRes.data);
  //         }

  //         if (res.data.canViewBranch && res.data.defaultRegionId) {
  //           const branchRes = await getBranchesForDashboard(
  //             res.data.defaultRegionId
  //           );
  //           if (branchRes?.data) setBranches(branchRes.data);
  //         }

  //         if (res.data.defaultRegionId)
  //           setSelectedRegion(res.data.defaultRegionId);
  //         if (res.data.defaultBranchId)
  //           setSelectedBranch(res.data.defaultBranchId);
  //       }
  //     } catch (err) {
  //       console.error("Filter access error:", err);
  //     }

  //     // Default last 7 days (10:00 window is in SP, here just datetime-local)
  //     const today = new Date();
  //     const prev = new Date();
  //     prev.setDate(today.getDate() - 7);
  //     const toISO = (d: Date) => d.toISOString().slice(0, 16);
  //     setStartDate(toISO(prev));
  //     setEndDate(toISO(today));

  //     setTimeout(() => {
  //       refreshAll();
  //     }, 250);
  //   };

  //   init();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);


// ---------------------- INITIAL LOAD ----------------------
  useEffect(() => {
    const init = async () => {
      try {
        const res = await getDashboardFilterAccess();

        if (res?.data) {
          setCanViewRegion(res.data.canViewRegion);
          setCanViewBranch(res.data.canViewBranch);

          if (res.data.canViewRegion) {
            const regionRes = await getRegionsForDashboard();
            if (regionRes?.data) setRegions(regionRes.data);
          }

          if (res.data.canViewBranch && res.data.defaultRegionId) {
            const branchRes = await getBranchesForDashboard(res.data.defaultRegionId);
            if (branchRes?.data) setBranches(branchRes.data);
          }

          // Pre-select defaults (optional)
          if (res.data.defaultRegionId)
            setSelectedRegion(res.data.defaultRegionId);

          if (res.data.defaultBranchId)
            setSelectedBranch(res.data.defaultBranchId);
        }
      } catch (err) {
        console.error("Filter access error:", err);
      }

      // ---- Default Dates (Last 7 Days) ----
      const today = new Date();
      const prev = new Date();
      prev.setDate(today.getDate() - 7);

      const toISO = (d: Date) => d.toISOString().slice(0, 16);
      setStartDate(toISO(prev));
      setEndDate(toISO(today));

      // Mark dashboard as READY
      setReady(true);
    };

    init();
  }, []);


 // ---------------------- FIRST LOAD + APPLY FILTER ----------------------
  useEffect(() => {
    if (!ready) return;
    if (!startDate || !endDate) return;

    // REGION + BRANCH ARE OPTIONAL → no blocking condition
    setRefreshKey(k => k + 1);
  }, [ready, startDate, endDate, selectedRegion, selectedBranch]);

  // ---------------------- LOAD RIDER DATA ----------------------
  const refreshAll = async () => {
    //if (!startDate || !endDate) return;

    setLoadingData(true);
    // setLoadingPage(true);

    try {
      const data = await getRiderPerformanceSummary(
        startDate,
        endDate,
        selectedRegion,
        selectedBranch,
        null
      );

      // normalize keys to RiderRow (in case backend sends PascalCase)
      const mapped: RiderRow[] = (data || []).map((r: any) => ({
        region: r.region ?? r.Region ?? "",
        branchName: r.branchName ?? r.BranchName ?? "",
        branchRiderID: r.branchRiderID ?? r.BranchRiderID ?? 0,
        riderName: r.riderName ?? r.RiderName ?? "",
        employeeID: r.employeeID ?? r.EmployeeID ?? "-",
        riderStatus: r.riderStatus ?? r.RiderStatus ?? "",
        totalOrders: r.totalOrders ?? r.TotalOrders ?? 0,
        deliveredOrders: r.deliveredOrders ?? r.DeliveredOrders ?? 0,
        cancelRejectOrders:
          r.cancelRejectOrders ?? r.CancelRejectOrders ?? 0,
        cancelRejectPct: r.cancelRejectPct ?? r.CancelRejectPct ?? 0,
        complaints: r.complaints ?? r.Complaints ?? 0,
        complaintPct: r.complaintPct ?? r.ComplaintPct ?? 0,
        invalidComplaints:
          r.invalidComplaints ?? r.InvalidComplaints ?? 0,
        sosPct: r.sosPct ?? r.SOSPct ?? 0,
        sosMinutes: r.sosMinutes ?? r.SOSMinutes ?? 0,
        istMinutes: r.istMinutes ?? r.ISTMinutes ?? 0,
        istPct: r.istPct ?? r.ISTPct ?? 0,
        workingDays: r.workingDays ?? r.WorkingDays ?? 0,
        productivity: r.productivity ?? r.Productivity ?? 0,
        perDayOrders: r.perDayOrders ?? r.PerDayOrders ?? 0,
      }));

      setRiders(mapped);
    } catch (err) {
      console.error("refreshAll rider performance:", err);
    } finally {
      setLoadingData(false);
      // setLoadingPage(false);
    }
  };


    useEffect(() => {
    if (!ready) return;
    refreshAll();
  }, [refreshKey]);

  // ---------------------- AGGREGATE KPIs ----------------------
  const kpis = useMemo(() => {
    if (!riders.length) {
      return {
        totalOrders: 0,
        delivered: 0,
        cancel: 0,
        cancelPct: 0,
        complaints: 0,
        complaintPct: 0,
        avgSosPct: 0,
        avgIstPct: 0,
        avgSosMinutes: 0,
        avgIstMinutes: 0,
        avgProductivity: 0,
        avgPerDayOrders: 0,
        totalRiders: 0,
      };
    }


    const totalRiders = riders.length;
    const sum = (sel: (r: RiderRow) => number) =>
      riders.reduce((acc, r) => acc + (sel(r) || 0), 0);

    const totalOrders = sum((r) => r.totalOrders);
    const delivered = sum((r) => r.deliveredOrders);
    const cancel = sum((r) => r.cancelRejectOrders);
    const complaints = sum((r) => r.complaints);

    const avgSosPct = sum((r) => r.sosPct) / totalRiders;
    const avgIstPct = sum((r) => r.istPct) / totalRiders;
    const avgSosMinutes = sum((r) => r.sosMinutes) / totalRiders;
    const avgIstMinutes = sum((r) => r.istMinutes) / totalRiders;
    const avgProductivity = sum((r) => r.productivity) / totalRiders;
    const avgPerDayOrders = sum((r) => r.perDayOrders) / totalRiders;

    const cancelPct =
      totalOrders > 0 ? (cancel * 100) / totalOrders : 0;
    const complaintPct =
      delivered > 0 ? (complaints * 100) / delivered : 0;


    // ---------------- ALERT ENGINE ----------------






    return {
      totalOrders,
      delivered,
      cancel,
      cancelPct,
      complaints,
      complaintPct,
      avgSosPct,
      avgIstPct,
      avgSosMinutes,
      avgIstMinutes,
      avgProductivity,
      avgPerDayOrders,
      totalRiders,
    };
  }, [riders]);


  const buildAlerts = (kpis: any): string[] => {
    const alerts: string[] = [];

    if (kpis.avgSosPct < 70)
      alerts.push(`SOS performance CRITICAL (${kpis.avgSosPct.toFixed(1)}%)`);

    if (kpis.avgIstPct < 70)
      alerts.push(`IST performance CRITICAL (${kpis.avgIstPct.toFixed(1)}%)`);

    if (kpis.complaintPct > 5)
      alerts.push(`High complaint rate (${kpis.complaintPct.toFixed(2)}%)`);

    if (kpis.avgProductivity < 2)
      alerts.push(`Low productivity (${kpis.avgProductivity.toFixed(2)} orders/hr)`);

    return alerts;
  };
  const alerts = useMemo(() => buildAlerts(kpis), [kpis]);

  // ---------------------- TOP RIDERS (for chart & highlight) ----------------------
  const topByProductivity = useMemo(
    () =>
      [...riders]
        .sort((a, b) => (b.productivity || 0) - (a.productivity || 0))
        .slice(0, 8),
    [riders]
  );

  const topBySos = useMemo(
    () =>
      [...riders]
        .sort((a, b) => (b.sosPct || 0) - (a.sosPct || 0))
        .slice(0, 5),
    [riders]
  );

  const worstByComplaint = useMemo(
    () =>
      [...riders]
        .filter((r) => r.totalOrders > 0)
        .sort((a, b) => (b.complaintPct || 0) - (a.complaintPct || 0))
        .slice(0, 5),
    [riders]
  );

  // ---------------------- Highcharts: Top Productivity Chart ----------------------
  const productivityChartOptions: Highcharts.Options = useMemo(
    () => ({
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 280,
      },
      title: { text: "" },
      xAxis: {
        categories: topByProductivity.map(
          (r) => r.riderName || `#${r.branchRiderID}`
        ),
        labels: { style: { color: "#4b5563", fontSize: "11px" } },
      },
      yAxis: {
        title: { text: "Orders / Hour" },
        gridLineColor: "rgba(0,0,0,0.05)",
      },
      legend: { enabled: false },
      tooltip: {
        shared: false,
        useHTML: true,
        formatter: function () {
          // @ts-ignore
          const p = this.point;
          return `
            <b>${p.category}</b><br/>
            Productivity: <b>${p.y?.toFixed(2)}</b> orders/hour<br/>
            Branch: <b>${p.branchName}</b>
          `;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 6,
          colorByPoint: true,
          colors: ["#b81e26", "#0d47a1", "#00c292"],
          dataLabels: {
            enabled: true,
            format: "{point.y:.1f}",
            style: {
              fontSize: "11px",
              fontWeight: "600",
              color: "#0f172a",
              textOutline: "none",
            },
          },
        },
      },
      series: [
        {
          name: "Productivity",
          type: "column",
          data: topByProductivity.map((r) => ({
            y: r.productivity || 0,
            branchName: r.branchName,
          })),
        },
      ],
    }),
    [topByProductivity]
  );

  // ---------------------- Back To Top ----------------------
  const BackToTopButton = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      const toggleVisibility = () => setVisible(window.scrollY > 200);
      window.addEventListener("scroll", toggleVisibility);
      return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () =>
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

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

  // ---------------------- Render ----------------------
  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ---------------- RED ZONE ALERT BANNER ---------------- */}
      {alerts.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-900 p-4 rounded-lg shadow flex items-start gap-3">
          <div className="text-2xl">🚨</div>
          <div>
            <div className="font-semibold uppercase tracking-wide">
              Operational Alert
            </div>
            <ul className="text-sm mt-1 list-disc ml-4">
              {alerts.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}



      {/* ---------------------- FILTERS ---------------------- */}
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

    //refreshAll();
    setRefreshKey(k => k + 1);

  }}
/>

      {/* ---------------------- KPI CARDS ---------------------- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-3">
        {/* Total Riders */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 shadow-md hover:shadow-xl transition-all">
          <div className="absolute -top-4 right-4 p-2 rounded-full shadow bg-white text-[#d9232e]">
            <Bike className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            Active Riders
          </div>
          <div className="mt-3 flex items-baseline gap-2 h-10">
            {loadingData ? (
              <Loader2 className="animate-spin h-6 w-6 text-[#d9232e]" />
            ) : (
              <h3 className="text-3xl font-bold tracking-tight text-[#111827]">
                <CountUp
                  end={kpis.totalRiders}
                  duration={1.2}
                  separator=","
                />
              </h3>
            )}
          </div>
          <div className="h-1 mt-4 rounded-full bg-[#d9232e33]" />
        </div>

        {/* Total Orders */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-100 shadow-md hover:shadow-xl transition-all">
          <div className="absolute -top-4 right-4 p-2 rounded-full shadow bg-white text-blue-700">
            <Users className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            Total Orders
          </div>
          <div className="mt-3 flex items-baseline gap-2 h-10">
            {loadingData ? (
              <Loader2 className="animate-spin h-6 w-6 text-blue-700" />
            ) : (
              <h3 className="text-3xl font-bold tracking-tight text-blue-800">
                <CountUp
                  end={kpis.totalOrders}
                  duration={1.2}
                  separator=","
                />
              </h3>
            )}
          </div>
          <div className="h-1 mt-4 rounded-full bg-blue-300" />
        </div>

        {/* SOS & IST */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-green-50 to-green-100 border border-green-100 shadow-md hover:shadow-xl transition-all">
          <div className="absolute -top-4 right-4 p-2 rounded-full shadow bg-white text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            Avg SOS % / IST %
          </div>
          <div className="mt-3 flex flex-col gap-1 h-10 justify-center">
            {loadingData ? (
              <Loader2 className="animate-spin h-6 w-6 text-green-700" />
            ) : (
              <>
                {(() => {
                  const status = getStatusBadge(kpis.avgSosPct, "sos");
                  return (
                    <div className="text-lg font-bold text-green-700 flex items-center gap-2">
                      SOS:
                      <CountUp end={Number(kpis.avgSosPct.toFixed(1))} duration={1.2} decimals={1} suffix="%" />
                      <Badge status={status} />
                    </div>
                  );
                })()}
                {(() => {
                  const status = getStatusBadge(kpis.avgIstPct, "ist");
                  return (
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      IST:
                      <CountUp end={Number(kpis.avgIstPct.toFixed(1))} duration={1.2} decimals={1} suffix="%" />
                      <Badge status={status} />
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          <div className="h-1 mt-4 rounded-full bg-green-300" />
        </div>

        {/* Productivity */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-100 shadow-md hover:shadow-xl transition-all">
          <div className="absolute -top-4 right-4 p-2 rounded-full shadow bg-white text-amber-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            Avg Productivity (Orders / Hour)
          </div>
          <div className="mt-3 flex items-baseline gap-2 h-10">
            {loadingData ? (
              <Loader2 className="animate-spin h-6 w-6 text-amber-700" />
            ) : (
              <h3 className="text-3xl font-bold tracking-tight text-amber-800">
                <CountUp
                  end={Number(kpis.avgProductivity.toFixed(2))}
                  duration={1.2}
                  decimals={2}
                />
              </h3>
            )}
          </div>
          <div className="h-1 mt-4 rounded-full bg-amber-300" />
        </div>
      </div>

      {/* ---------------------- SECONDARY KPI ROW ---------------------- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-3">
        {/* Complaint Rate */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-rose-50 to-red-100 border border-red-200 shadow-md hover:shadow-xl transition-all">
          <div className="absolute -top-4 right-4 p-2 rounded-full shadow bg-white text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            Complaint Rate
          </div>
          <div className="mt-3 flex items-baseline gap-2 h-10">
            {loadingData ? (
              <Loader2 className="animate-spin h-6 w-6 text-red-700" />
            ) : (
              <h3 className="text-3xl font-bold tracking-tight text-red-700">
                {(() => {
                  const status = getStatusBadge(kpis.complaintPct, "complaint");
                  return (
                    <div className="flex items-center gap-2">
                      <CountUp end={Number(kpis.complaintPct.toFixed(2))} duration={1.2} decimals={2} suffix="%" />
                      <Badge status={status} />
                    </div>
                  );
                })()}
              </h3>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Complaints per delivered order
          </div>
        </div>

        {/* Cancel/Reject Rate */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 shadow-md hover:shadow-xl transition-all">
          <div className="absolute -top-4 right-4 p-2 rounded-full shadow bg-white text-orange-700">
            <Timer className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            Cancel + Reject Rate
          </div>
          <div className="mt-3 flex items-baseline gap-2 h-10">
            {loadingData ? (
              <Loader2 className="animate-spin h-6 w-6 text-orange-700" />
            ) : (
              <h3 className="text-3xl font-bold tracking-tight text-orange-700">
                {(() => {
                  const status = getStatusBadge(kpis.avgProductivity, "productivity");
                  return (
                    <div className="flex items-center gap-2">
                      <CountUp end={Number(kpis.avgProductivity.toFixed(2))} decimals={2} />
                      <Badge status={status} />
                    </div>
                  );
                })()}

              </h3>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Based on total orders
          </div>
        </div>

        {/* Avg Times */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-md hover:shadow-xl transition-all">
          <div className="absolute -top-4 right-4 p-2 rounded-full shadow bg-white text-slate-700">
            <Timer className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-gray-700">
            Avg SOS / IST Minutes
          </div>
          <div className="mt-3 flex flex-col gap-1 h-10 justify-center">
            {loadingData ? (
              <Loader2 className="animate-spin h-6 w-6 text-slate-700" />
            ) : (
              <>
                <div className="text-lg font-bold text-slate-800">
                  SOS:{" "}
                  <CountUp
                    end={Number(kpis.avgSosMinutes.toFixed(1))}
                    duration={1.2}
                    decimals={1}
                    suffix=" min"
                  />
                </div>
                <div className="text-xs text-gray-600">
                  IST:{" "}
                  <CountUp
                    end={Number(kpis.avgIstMinutes.toFixed(1))}
                    duration={1.2}
                    decimals={1}
                    suffix=" min"
                  />
                </div>
              </>
            )}
          </div>
          <div className="h-1 mt-4 rounded-full bg-slate-300" />
        </div>
      </div>

      {/* ---------------------- CHARTS & HIGHLIGHTS ---------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Top Productivity Chart */}
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Top Riders by Productivity
            </h3>
          </div>

          {loadingData ? (
            <div className="flex justify-center items-center h-[260px]">
              <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
            </div>
          ) : riders.length === 0 ? (
            <div className="flex justify-center items-center h-[260px] text-gray-400 text-sm">
              No data available for selected filters.
            </div>
          ) : (
            <HighchartsReact
              highcharts={Highcharts}
              options={productivityChartOptions}
            />
          )}
        </div>

        {/* Highlights */}
        <div className="bg-white p-5 shadow-lg hover:shadow-2xl transition-all border border-gray-100 flex flex-col gap-4">
          <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase border-b pb-2">
            Rider Highlights
          </h3>

          {/* === RIDER HIGHLIGHTS CARDS === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* BEST SOS RIDERS */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-green-700 mb-2 uppercase flex items-center gap-1">
                🟢 Best SOS Riders
              </h4>

              {topBySos.length === 0 ? (
                <div className="text-xs text-gray-400">No data available</div>
              ) : (
                topBySos.map((r) => (
                  // <div
                  //   key={r.branchRiderID}
                  //   className="flex justify-between items-center p-2 rounded-md bg-white cursor-pointer hover:shadow transition"
                  // >
                    <div
  onClick={() => openRiderModal(r)}
  className="flex justify-between items-center p-2 rounded-md bg-white cursor-pointer hover:shadow-lg hover:scale-[1.02] transition"
>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {r.riderName}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {r.branchName}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-green-700 font-bold">
                        {r.sosPct.toFixed(1)}%
                      </div>
                      <span className="px-2 py-[2px] rounded-full bg-green-100 text-green-700 text-[9px] font-bold">
                        ON-TIME
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>


            {/* HIGH COMPLAINT RIDERS */}
            <div className="bg-gradient-to-br from-rose-50 to-red-100 border border-red-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-red-700 mb-2 uppercase flex items-center gap-1">
                🔴 High Complaint Riders
              </h4>

              {worstByComplaint.length === 0 ? (
                <div className="text-xs text-gray-400">No data available</div>
              ) : (
                worstByComplaint.map((r) => (
                  // <div
                  //   key={r.branchRiderID}
                  //   className="flex justify-between items-center p-2 rounded-md bg-white cursor-pointer hover:shadow transition"
                  // >
                    <div
  onClick={() => openRiderModal(r)}
  className="flex justify-between items-center p-2 rounded-md bg-white cursor-pointer hover:shadow-lg hover:scale-[1.02] transition"
>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {r.riderName}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {r.branchName}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-red-700 font-bold">
                        {r.complaintPct.toFixed(2)}%
                      </div>
                      <span className="px-2 py-[2px] rounded-full bg-red-100 text-red-700 text-[9px] font-bold">
                        RISK
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>






        </div>



      </div>

      {/* ---------------------- RIDER TABLE ---------------------- */}
      {/* <div className="mt-6 bg-white p-4 shadow border border-gray-100 rounded-2xl">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-sm font-semibold text-[#d9232e] uppercase">
            Rider Performance Detail
          </h3>
          <div className="text-xs text-gray-500">
            Showing {riders.length} riders
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Region</th>
                <th className="px-3 py-2 text-left">Branch</th>
                <th className="px-3 py-2 text-left">Rider</th>
                <th className="px-3 py-2 text-left">Emp ID</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Orders</th>
                <th className="px-3 py-2 text-right">Delivered</th>
                <th className="px-3 py-2 text-right">Cancel/Reject</th>
                <th className="px-3 py-2 text-right">Cancel %</th>
                <th className="px-3 py-2 text-right">Complaints</th>
                <th className="px-3 py-2 text-right">Compl %</th>
                <th className="px-3 py-2 text-right">SOS %</th>
                <th className="px-3 py-2 text-right">SOS Min</th>
                <th className="px-3 py-2 text-right">IST %</th>
                <th className="px-3 py-2 text-right">IST Min</th>
                <th className="px-3 py-2 text-right">
                  Prod<br />Ord/Hr
                </th>
                <th className="px-3 py-2 text-right">
                  Orders /<br />Day
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td
                    colSpan={17}
                    className="text-center py-10 text-gray-400"
                  >
                    <Loader2 className="h-6 w-6 animate-spin inline-block text-[#d9232e]" />{" "}
                    Loading rider performance...
                  </td>
                </tr>
              ) : riders.length === 0 ? (
                <tr>
                  <td
                    colSpan={17}
                    className="text-center py-10 text-gray-400"
                  >
                    No data found for selected filters.
                  </td>
                </tr>
              ) : (
                riders.map((r) => (
                  <tr
                    key={r.branchRiderID}
                    className="border-b last:border-0 hover:bg-gray-50/70"
                  >
                    <td className="px-3 py-2 text-gray-700">
                      {r.region}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {r.branchName}
                    </td>
                    <td className="px-3 py-2 text-gray-900 font-semibold">
                      {r.riderName}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {r.employeeID}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {r.riderStatus}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.totalOrders}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.deliveredOrders}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.cancelRejectOrders}
                    </td>
                    <td className="px-3 py-2 text-right text-orange-700">
                      {r.cancelRejectPct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.complaints}
                    </td>
                    <td className="px-3 py-2 text-right text-red-700">
                      {r.complaintPct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right text-green-700">
                      {r.sosPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.sosMinutes.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700">
                      {r.istPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.istMinutes.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-amber-800">
                      {r.productivity.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.perDayOrders.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div> */}

      {/* Loading overlay (optional) */}
      {loadingPage && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
            <div className="mt-2 text-gray-600 text-sm font-medium">
              Loading data...
            </div>
          </div>
        </div>
      )}


      {showModal && selectedRider && (
  <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center">
    <div className="bg-white rounded-xl shadow-2xl w-[380px] animate-fadeIn relative p-6">

      {/* Close Button */}
      <button
        onClick={closeModal}
        className="absolute top-2 right-3 text-gray-400 hover:text-red-600 text-lg"
      >
        ✖
      </button>

      <h3 className="text-lg font-bold text-[#d9232e] mb-4 border-b pb-1">
        Rider Performance Summary
      </h3>

      <div className="space-y-2 text-sm">

        <div className="flex justify-between">
          <span className="text-gray-500">Rider</span>
          <span className="font-semibold">{selectedRider.riderName}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Branch</span>
          <span className="font-semibold">{selectedRider.branchName}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Employee ID</span>
          <span className="font-semibold">{selectedRider.employeeID}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <span className="font-semibold">{selectedRider.riderStatus}</span>
        </div>

        <hr />

        <div className="grid grid-cols-2 gap-2 text-center">

          <div className="bg-gray-100 p-2 rounded">
            <div className="text-xs text-gray-500">Orders</div>
            <div className="font-bold text-gray-800">
              {selectedRider.totalOrders}
            </div>
          </div>

          <div className="bg-green-100 p-2 rounded">
            <div className="text-xs text-green-600">Delivered</div>
            <div className="font-bold text-green-700">
              {selectedRider.deliveredOrders}
            </div>
          </div>

          <div className="bg-purple-100 p-2 rounded">
            <div className="text-xs text-purple-600">SOS</div>
            <div className="font-bold text-purple-700">
              {selectedRider.sosPct.toFixed(1)}%
            </div>
          </div>

          <div className="bg-blue-100 p-2 rounded">
            <div className="text-xs text-blue-600">IST</div>
            <div className="font-bold text-blue-700">
              {selectedRider.istPct.toFixed(1)}%
            </div>
          </div>

          <div className="bg-red-100 p-2 rounded">
            <div className="text-xs text-red-600">Complaints</div>
            <div className="font-bold text-red-700">
              {selectedRider.complaints}
            </div>
          </div>

          <div className="bg-amber-100 p-2 rounded">
            <div className="text-xs text-amber-600">Productivity</div>
            <div className="font-bold text-amber-700">
              {selectedRider.productivity.toFixed(2)}
            </div>
          </div>

        </div>
      </div>

      <div className="mt-4 text-center">
        <button
          className="bg-[#d9232e] hover:bg-[#b71c1c] transition text-white text-sm px-4 py-2 rounded"
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


      <BackToTopButton />
    </div>
  );
}
