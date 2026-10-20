// /src/pages/Dashboards/CustomerSentimentDashboard.tsx

import React, { useEffect, useMemo, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import CountUp from "react-countup";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Loader2,
  ArrowUp,
  Users,
  UserCheck,
  UserX,
  PercentCircle,
  Timer,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- FILTER ACCESS + REGION/BRANCH ----------
import {
  getDashboardFilterAccess,
  getRegionsForDashboard,
  getBranchesForDashboard,
  getCustomerTrend,
  getCustomerSegmentation,
  getReorderTimeDistribution 
} from "@/services/api";

// ---------- CUSTOMER SENTIMENT ENDPOINTS ----------
import {
  getReorderRaw,
  getReorderFrequency,
  getReorderBuckets,
  getBranchWiseReorder,
  getHighValueRiskCustomers,
  getCustomerJourney,
  getReorderKPI,
} from "@/services/api.ts"; // adjust path if needed
import DashboardFilters from "@/components/DashboardFilters";

// ---------- TYPES ----------
type Region = { id: number; name: string };
type Branch = { id: number; name: string };

type KpiState = {
  totalComplaints: number;
  totalComplaintTickets: number;
  totalCustomers: number;
  returned: number;
  notReturned: number;
  reorderPct: number;
  avgDays: number;
  highRisk: number;
};

type SegmentationState = {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  loyalCustomers: number;
  atRiskCustomers: number;
  lostCustomers: number;
};

export default function CustomerSentimentDashboard() {
  // ---------------------- FILTERS ----------------------
  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);

  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showRules, setShowRules] = useState(false);
  // ---------------------- KPI STATES ----------------------
  const emptyKpi: KpiState = {
    totalComplaints: 0,
    totalComplaintTickets: 0,
    totalCustomers: 0,
    returned: 0,
    notReturned: 0,
    reorderPct: 0,
    avgDays: 0,
    highRisk: 0,
  };

  const [kpisRaw, setKpisRaw] = useState<KpiState>(emptyKpi);
  const [kpisDisplay, setKpisDisplay] = useState<KpiState>(emptyKpi);

  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingKPI, setLoadingKPI] = useState(false);

  // ---------------------- TREND ----------------------
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [rangeType, setRangeType] = useState<"day" | "week" | "month">("day");

  // ---------------------- SEGMENTATION ----------------------
  const emptySeg: SegmentationState = {
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    loyalCustomers: 0,
    atRiskCustomers: 0,
    lostCustomers: 0,
  };


  const [segmentationRaw, setSegmentationRaw] =
    useState<SegmentationState>(emptySeg);
  const [segmentationDisplay, setSegmentationDisplay] =
    useState<SegmentationState>(emptySeg);

const [reorderSummary, setReorderSummary] = useState<any>(null);
const [reorderBranchSummary, setReorderBranchSummary] = useState<any[]>([]);
const [reorderTrend, setReorderTrend] = useState<any[]>([]);
const [loadingReorder, setLoadingReorder] = useState(false);

// user view mode for rule-set
const [viewMode, setViewMode] = useState<"Last90" | "Custom" | "FullYear">("Last90");


  // ---------------------- PIE CHART OPTIONS ----------------------
  const complaintOutcomeOptions = useMemo<Highcharts.Options>(() => {
    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
      },
      title: {
        text: "",
      },
      tooltip: {
        pointFormat: "<b>{point.y}</b> customers ({point.percentage:.1f}%)",
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f}%",
          },
        },
      },
      series: [
        {
          name: "Customers",
          type: "pie",
          data: [
            {
              name: "Reordered (Retained)",
              y: kpisDisplay.returned,
              color: "#22c55e",
            },
            {
              name: "No Reorder (Churned)",
              y: kpisDisplay.notReturned,
              color: "#ef4444",
            },
          ],
        } as Highcharts.SeriesPieOptions,
      ],
    };
  }, [kpisDisplay.returned, kpisDisplay.notReturned]);

  // ---------------------- GAUGE CHART OPTIONS ----------------------
  const avgDaysGaugeOptions: Highcharts.Options = {
    chart: {
      type: "gauge",
      backgroundColor: "transparent",
      height: 300,
    },

    title: { text: "" },

    pane: {
      startAngle: -150,
      endAngle: 150,
      background: [
        {
          outerRadius: "100%",
          innerRadius: "60%",
          backgroundColor: "#f3f4f6",
          borderWidth: 0,
        },
      ],
    },

    yAxis: {
      min: 0,
      max: 30,
      minorTickInterval: "auto",
      tickPixelInterval: 30,
      tickWidth: 1,
      labels: { rotation: undefined },
      title: { text: "" },
      plotBands: [
        { from: 0, to: 5, color: "#16a34a" },
        { from: 5, to: 15, color: "#f59e0b" },
        { from: 15, to: 30, color: "#dc2626" },
      ],
    },

    series: [
      {
        name: "Avg Days",
        type: "gauge",
        data: [kpisDisplay.avgDays],
        tooltip: { valueSuffix: " days" },
        dial: { backgroundColor: "#374151", radius: "90%" },
        pivot: { backgroundColor: "#111827", radius: 6 },
      },
    ],
  };

  // ---------------------- INIT: FILTER ACCESS + DEFAULT DATES ----------------------
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
            const branchRes = await getBranchesForDashboard(
              res.data.defaultRegionId
            );
            if (branchRes?.data) setBranches(branchRes.data);
          }

          if (res.data.defaultRegionId)
            setSelectedRegion(res.data.defaultRegionId);
          if (res.data.defaultBranchId)
            setSelectedBranch(res.data.defaultBranchId);
        }
      } catch (error) {
        console.error("Filter access error:", error);
      }

      // default date range = last 7 days
      const today = new Date();
      const prev = new Date();
      prev.setDate(today.getDate() - 7);
      const toISO = (d: Date) => d.toISOString().slice(0, 16);
      setStartDate(toISO(prev));
      setEndDate(toISO(today));

      // run once after filters/date ready
      setTimeout(() => {
        refreshAll();
      }, 250);
    };

    init();
  }, []);



// ---------------------- LOAD REORDER TIME DISTRIBUTION ----------------------
const loadReorderDistribution = async () => {
  try {
    setLoadingReorder(true);

    const res = await getReorderTimeDistribution(
      selectedRegion != null ? selectedRegion.toString() : null,
      selectedBranch != null ? selectedBranch.toString() : null,
      startDate,
      endDate,
      "Custom"   // OR Last90 etc.
    );

    setReorderSummary(res.summary || null);
    setReorderBranchSummary(res.branchSummary || []);
    setReorderTrend(res.trend || []);
  } catch (err) {
    console.error("loadReorderDistribution:", err);
  } finally {
    setLoadingReorder(false);
  }
};



  // ---------------------- KPI LOADER (returns RAW KPIs) ----------------------
  const loadKPIs = async (startDate, endDate, selectedRegion, selectedBranch): Promise<KpiState | null> => {
    try {
      const res = await getReorderKPI(
        startDate,
        endDate,
        selectedRegion,
        selectedBranch
      );

      if (!res) return null;

      const payload = (res as any).data ?? res;

      const k: KpiState = {
        totalComplaints:
          payload.TotalComplaints ?? payload.totalComplaints ?? 0,
        totalComplaintTickets:
          payload.TotalComplaintTickets ?? payload.totalComplaintTickets ?? 0,
        totalCustomers:
          payload.TotalCustomers ?? payload.totalCustomers ?? 0,
        returned:
          payload.ReorderedCustomers ??
          payload.reorderedCustomers ??
          payload.returned ??
          0,
        notReturned:
          payload.NoReorderCustomer ??
          payload.noReorderCustomers ??
          payload.notReturned ??
          payload.NeverReturned ??
          0,
        reorderPct: payload.TotalComplaints
          ? Number(
            (
              ((payload.ReorderedCustomers ??
                payload.reorderedCustomers ??
                0) /
                (payload.TotalComplaints ??
                  payload.totalComplaints ??
                  1)) *
              100
            ).toFixed(1)
          )
          : 0,
        avgDays:
          payload.AvgDaysToNextOrder ??
          payload.avgDaysToNextOrder ??
          payload.avgDays ??
          0,
        highRisk:
          payload.NeverReturned ??
          payload.neverReturned ??
          payload.noReorderCustomers ??
          0,
      };

      return k;
    } catch (err) {
      console.error("loadKPIs:", err);
      return null;
    }
  };

  // ---------------------- SEGMENTATION LOADER (returns RAW segmentation) ----------------------
  const loadSegmentation = async (rId, bId, eDate): Promise<SegmentationState | null> => {
    try {
      const res = await getCustomerSegmentation(
        rId,
        bId,
        eDate
      );

      if (!res) return null;

      const payload = (res as any).data ?? res;

      const s: SegmentationState = {
        totalCustomers:
          payload.totalCustomers ?? payload.TotalCustomers ?? 0,
        newCustomers: payload.newCustomers ?? payload.NewCustomers ?? 0,
        returningCustomers:
          payload.returningCustomers ?? payload.ReturningCustomers ?? 0,
        loyalCustomers: payload.loyalCustomers ?? payload.LoyalCustomers ?? 0,
        atRiskCustomers:
          payload.atRiskCustomers ?? payload.AtRiskCustomers ?? 0,
        lostCustomers: payload.lostCustomers ?? payload.LostCustomers ?? 0,
      };

      return s;
    } catch (err) {
      console.error("loadSegmentation:", err);
      return null;
    }
  };

  // ---------------------- CUSTOMER TREND NORMALIZER ----------------------
  const normalizeCustomerTrend = (
    data: any[],
    rt: string,
    totalCustomers: number
  ) => {
    return data.map((item) => {
      let label = "";

      if (rt === "day") {
        label = item.trendDate?.split("T")[0] || "";
      } else if (rt === "week") {
        const start = item.weekStart?.split("T")[0];
        const end = item.weekEnd?.split("T")[0];
        label = `${start} - ${end}`;
      } else if (rt === "month") {
        label = item.trendLabel;
      }

      return {
        label,
        y: item.newCustomers ?? 0,
        totalCustomers: totalCustomers,
      };
    });
  };

  const fetchCustomerTrend = async (
    type: "day" | "week" | "month",
    start?: string,
    end?: string
  ) => {
    setLoadingTrend(true);
    try {
      const res = await getCustomerTrend(
        type,
        start,
        end,
        selectedRegion,
        selectedBranch
      );

      if (res?.data?.trend) {
        const normalized = normalizeCustomerTrend(
          res.data.trend,
          type,
          res.data.totalCustomers
        );
        setTrendData(normalized);
      } else {
        setTrendData([]);
      }
    } catch (error) {
      console.error("Error fetching customer trend", error);
    } finally {
      setLoadingTrend(false);
    }
  };

  // ---------------------- STUB LOADERS ----------------------
  const loadDelayData = async () => { };
  const loadFrequencyData = async () => { };
  const loadBucketData = async () => { };
  const loadBranchWiseReorders = async () => { };
  const loadHighValueRiskCustomers = async () => { };
  const loadCustomerJourney = async (custId: number | null) => { };

  // ---------------------- REFRESH ALL (Apply Filter + Initial) ----------------------
  // const refreshAll = async () => {
  //   setLoadingKPI(true);
  //   // setLoadingPage(true); // if you want full-screen overlay

  //   try {
  //     const [kRaw, , , , , , , sRaw] = await Promise.all([
  //       loadKPIs(),
  //       loadDelayData(),
  //       loadFrequencyData(),
  //       loadBucketData(),
  //       loadBranchWiseReorders(),
  //       loadHighValueRiskCustomers(),
  //       loadCustomerJourney(null),
  //       loadSegmentation(),
  //     ]);

  //     if (kRaw) {
  //       setKpisRaw(kRaw);
  //       setKpisDisplay(kRaw); // CountUp animates because value changed
  //     }

  //     if (sRaw) {
  //       setSegmentationRaw(sRaw);
  //       setSegmentationDisplay(sRaw); // same logic for segmentation
  //     }

  //     //await loadReorderDistribution();
  //     // also refresh trend with current range
  //     await fetchCustomerTrend(rangeType, startDate, endDate);
  //   } catch (err) {
  //     console.error("refreshAll:", err);
  //   } finally {
  //     setLoadingKPI(false);
  //     // setLoadingPage(false);
  //   }
  // };


  const refreshAll = async (
  sDate = startDate,
  eDate = endDate,
  rId = selectedRegion,
  bId = selectedBranch
) => {
  setLoadingKPI(true);

  try {
    const [kRaw, , , , , , , sRaw] = await Promise.all([
      loadKPIs(sDate, eDate, rId, bId),
      loadDelayData(),
      loadFrequencyData(),
      loadBucketData(),
      loadBranchWiseReorders(),
      loadHighValueRiskCustomers(),
      loadCustomerJourney(null),
      loadSegmentation(rId, bId, eDate),
    ]);

    if (kRaw) {
      setKpisRaw(kRaw);
      setKpisDisplay(kRaw);
    }

    if (sRaw) {
      setSegmentationRaw(sRaw);
      setSegmentationDisplay(sRaw);
    }

    await fetchCustomerTrend(rangeType, sDate, eDate);

  } catch (err) {
    console.error("refreshAll:", err);
  } finally {
    setLoadingKPI(false);
  }
};


  // ---------------------- KPI CARD CONFIG ----------------------
  const accentColors = ["#1e1b4b", "#22c55e", "#f3752dff"];
  const cardList = [
    {
      title: "Total Customers Having Complaints",
      value: kpisDisplay.totalCustomers,
      accent: {
        color: "#2563eb",
        bg: "from-blue-50 to-blue-100",
        icon: Users,
      },
    },
    {
      title: "Customers Reordered",
      value: kpisDisplay.returned,
      accent: {
        color: "#127e3a",
        bg: "from-green-50 to-green-100",
        icon: UserCheck,
      },
    },
    {
      title: "Customers Not Reordered",
      value: kpisDisplay.highRisk,
      accent: {
        color: "#c57e13ff",
        bg: "from-orange-50 to-orange-100",
        icon: AlertTriangle,
      },
    },
  ];

  const churnRate = kpisDisplay.totalComplaints
    ? Number(
      ((kpisDisplay.notReturned / kpisDisplay.totalComplaints) * 100).toFixed(
        1
      )
    )
    : 0;

  const returnRate = kpisDisplay.totalComplaints
    ? Number(
      ((kpisDisplay.returned / kpisDisplay.totalComplaints) * 100).toFixed(1)
    )
    : 0;

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

  // ---------------------- Segmentation Card ----------------------
  const SegCard = ({
    label,
    value,
    color,
    bg,
    icon: Icon,
    loading,
  }: {
    label: string;
    value: number;
    color: string;
    bg: string;
    icon: any;
    loading: boolean;
  }) => {
    return (
      <div
        className={`relative rounded-2xl p-4 bg-gradient-to-br ${bg} border border-gray-100 shadow hover:shadow-xl transition-all`}
      >
        {/* ICON */}
        <div
          className="absolute -top-3 right-3 p-2 rounded-full shadow"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* LABEL */}
        <div className="text-xs font-medium text-gray-600">{label}</div>

        {/* VALUE OR LOADER */}
        <div className="mt-2 flex items-center h-8">
          {loading ? (
            <Loader2 className="animate-spin h-5 w-5" style={{ color }} />
          ) : (
            <div className="text-2xl font-bold" style={{ color }}>
              <CountUp end={value ?? 0} duration={1.2} separator="," />
             
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------- Render ----------------------
  return (
    <div className="space-y-6 animate-fadeIn">
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
    refreshAll(startDate, endDate, regionId, branchId);

  }}
/>

      {/* ---------------------- CUSTOMER SEGMENTATION ---------------------- */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 mt-3">
        <SegCard
          label="Total Customers"
          value={segmentationDisplay.totalCustomers}
          color="#0D47A1"
          bg="from-blue-50 to-blue-100"
          icon={Users}
          loading={loadingKPI}
        />

        <SegCard
          label="New (Last 30d)"
          value={segmentationDisplay.newCustomers}
          color="#16a34a"
          bg="from-green-50 to-green-100"
          icon={Users}
          loading={loadingKPI}
        />

        <SegCard
          label="Returning"
          value={segmentationDisplay.returningCustomers}
          color="#d97706"
          bg="from-amber-50 to-amber-100"
          icon={UserCheck}
          loading={loadingKPI}
        />

        <SegCard
          label="Loyal"
          value={segmentationDisplay.loyalCustomers}
          color="#7e22ce"
          bg="from-purple-50 to-purple-100"
          icon={PercentCircle}
          loading={loadingKPI}
        />

        <SegCard
          label="At Risk"
          value={segmentationDisplay.atRiskCustomers}
          color="#ea580c"
          bg="from-orange-50 to-orange-100"
          icon={Timer}
          loading={loadingKPI}
        />

        <SegCard
          label="Lost"
          value={segmentationDisplay.lostCustomers}
          color="#b91c1c"
          bg="from-red-50 to-red-100"
          icon={UserX}
          loading={loadingKPI}
        />
      </div>

      {/* Segmentation legend */}
     <div className="mt-4 p-4 bg-white rounded-xl shadow border border-gray-200">

  {/* ----- HEADER (clickable) ------ */}
  <div
    className="flex justify-between items-center mb-2 cursor-pointer select-none"
    onClick={() => setShowRules(!showRules)}
  >
    <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
      Segmentation Rules
    </h3>

    <div
      className={`transition-transform duration-300 ${
        showRules ? "rotate-180" : "rotate-0"
      }`}
    >
      <ChevronDown className="h-5 w-5 text-gray-600" />
    </div>
  </div>

  {/* ----- CONTENT (animated expand/collapse) ------ */}
  <div
    className={`
      transition-all duration-500 overflow-hidden
      ${showRules ? "max-h-[300px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}
    `}
  >
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">

      <div className="flex gap-2">
        <span className="font-semibold text-blue-600">New:</span>
        First order in last <b>30 days</b>
      </div>

      <div className="flex gap-2">
        <span className="font-semibold text-green-600">Returning:</span>
        At least <b>2 orders</b> in last <b>30 days</b>
      </div>

      <div className="flex gap-2">
        <span className="font-semibold text-purple-600">Loyal:</span>
        <b>4+ orders</b> in last <b>60 days</b>
      </div>

      <div className="flex gap-2">
        <span className="font-semibold text-orange-600">At Risk:</span>
        No order in <b>30–89 days</b>
      </div>

      <div className="flex gap-2">
        <span className="font-semibold text-red-600">Lost:</span>
        No order in <b>90+ days</b>
      </div>

    </div>
  </div>
</div>



      {/* ---------------------- KPI CARDS ---------------------- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-3">
        {cardList.map((c, idx) => {
          const Icon = c.accent.icon;
          return (
            <div
              key={c.title}
              className={`relative rounded-2xl p-5 bg-gradient-to-br ${c.accent.bg} border border-gray-100 shadow-md hover:shadow-xl transition-all`}
            >
              <div
                className="absolute -top-4 right-4 p-2 rounded-full shadow"
                style={{
                  backgroundColor: `${c.accent.color}22`,
                  color: c.accent.color,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="text-sm font-medium text-gray-700">
                {c.title}
              </div>

              <div className="mt-3 flex items-baseline gap-2 h-10">
                {loadingKPI ? (
                  <Loader2
                    className="animate-spin h-6 w-6"
                    style={{ color: c.accent.color }}
                  />
                ) : (
                  <h3
                    className="text-3xl font-bold tracking-tight"
                    style={{ color: c.accent.color }}
                  >
                    <CountUp end={c.value ?? 0} duration={1.2} separator="," />
                  </h3>
                )}
              </div>

              <div
                className="h-1 mt-4 rounded-full"
                style={{ backgroundColor: `${accentColors[idx]}40` }}
              ></div>
            </div>
          );
        })}
      </div>

      {/* ---------------------- CHURN RATE BIG CARD ---------------------- */}
      <div className="mt-4">
        <div className="bg-gradient-to-br from-rose-50 to-red-100 border border-red-200 shadow-md rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          {/* LEFT SIDE - CHURN RATE */}
          <div className="text-center md:text-left mb-4 md:mb-0">
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              Churn Rate
            </div>

            <div className="text-5xl font-extrabold text-red-600 mt-1">
              {loadingKPI ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <CountUp
                  end={churnRate ?? 0}
                  duration={1.6}
                  decimals={1}
                  suffix="%"
                />
              )}
            </div>

            <div className="text-sm text-gray-600 mt-1">
              Customers never reordered after complaint
            </div>
          </div>

          {/* RIGHT SIDE - RETURN RATE */}
          <div className="text-center md:text-right">
            <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Returned Customers
            </div>

            <div className="text-3xl font-bold text-green-600 mt-1">
              {loadingKPI ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <CountUp
                  end={returnRate ?? 0}
                  duration={1.6}
                  decimals={1}
                  suffix="%"
                />
              )}
            </div>

            <div className="text-sm text-gray-600 mt-1">
              Customers who returned after complaint
            </div>
          </div>
        </div>
      </div>
















      {/* ---------------------- CHARTS ROW ---------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">
        {/* CUSTOMER TREND CARD */}
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Customer Trend
            </h3>

            <Select
              value={rangeType}
              onValueChange={(v: any) => {
                setRangeType(v);
                fetchCustomerTrend(v, startDate, endDate);
              }}
            >
              <SelectTrigger className="w-[140px] border-gray-300 text-gray-700 bg-white/60 rounded-md">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingTrend ? (
            <div className="flex justify-center items-center h-[280px]">
              <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
            </div>
          ) : (
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: {
                  type: "column",
                  backgroundColor: "transparent",
                  height: 280,
                },
                title: { text: "" },
                xAxis: {
                  categories: trendData.map((d) => d.label),
                  labels: { style: { color: "#555" } },
                },
                yAxis: {
                  title: { text: "" },
                  gridLineColor: "rgba(0,0,0,0.05)",
                },
                legend: { enabled: false },
                tooltip: {
                  shared: false,
                  useHTML: true,
                  formatter: function () {
                    // @ts-ignore
                    return `
                      <b>${this.point.label}</b><br/>
                      New Customers: <b>${this.y}</b><br/>
                      Total Customers: <b>${this.point.totalCustomers}</b>
                    `;
                  },
                },
                plotOptions: {
                  column: {
                    borderRadius: 6,
                    colorByPoint: true,
                    colors: ["#00c292", "#0d47a1", "#b81e26"],
                    dataLabels: {
                      enabled: true,
                      format: "{point.y}",
                      style: {
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#0a0a0aff",
                        textOutline: "none",
                      },
                    },
                  },
                },
                series: [
                  {
                    name: "New Customers",
                    data: trendData,
                  },
                ],
              }}
            />
          )}
        </div>

        
      </div>

     
      {/* Loading overlay (currently not used; you can enable via loadingPage) */}
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

      <BackToTopButton />
    </div>
  );

  // placeholder
  async function loadRepeatData() {
    return;
  }
}
