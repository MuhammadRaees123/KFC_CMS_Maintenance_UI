import React, { useEffect, useMemo, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import CountUp from "react-countup";
import { Loader2, ArrowUp, Activity, Box, Users, Clock, CheckCircle } from "lucide-react";
import { getDashboardFilterAccess, getRegionsForDashboard, getBranchesForDashboard } from "@/services/api";
import {
  UserCheck,
  UserX,
  PercentCircle,
  Timer,
  AlertTriangle
} from "lucide-react";
// --- The following are the khadim-specific endpoints — implement on backend if not present
// getKhadimSummary() -> { total, open, inProgress, resolved, closed, parking }
// getKhadimStatusCounts() -> [{ status: 'Open', count: 12 }, ...]
// getKhadimDepartmentCounts() -> [{ department: 'IT', count: 10 }, ...]
// getKhadimCategoryCounts() -> [{ category: 'KDS', count: 5 }, ...]
// getKhadimBranchLeaderboard() -> [{ branchName, region, totalComplaints, categories: { ... } }, ...]
// getKhadimLatestComplaints() -> [{ cid, department, category, comments, Branch_Name, createdBy, UpdatedBy, CompStatus, createdAt }, ...]
import {
  getKhadimSummary,
  getKhadimCategorySummary,
  getKhadimDepartmentSummary,
  getKhadimDepartmentTrend,
  getKhadimBranchLeaderboard,
  getKhadimRepeatComplaints,
  getComplaintAgingReport,
  getTechnicianPerformance
  // getKhadimStatusCounts,
  // getKhadimDepartmentCounts,
  // getKhadimCategoryCounts,
  // getKhadimBranchLeaderboard,
  // getKhadimLatestComplaints,
} from "@/services/api"; // <-- please create this file mapping to server endpoints (or replace with existing service calls)

type Region = { id: number; name: string };
type Branch = { id: number; name: string };

const smallCardAccent = [
  { bg: "from-[#fff5f5] to-[#ffe3e3]", color: "#d9232e", icon: Activity },
  { bg: "from-[#fff8e1] to-[#fff3cd]", color: "#f59e0b", icon: Clock },
  { bg: "from-[#e8f0ff] to-[#dde7ff]", color: "#2563eb", icon: Users },
  { bg: "from-[#e8ffef] to-[#c6f6d5]", color: "#16a34a", icon: CheckCircle },
  { bg: "from-[#fff1f2] to-[#ffe4e6]", color: "#b91c1c", icon: Box },
  { bg: "from-[#f0f9ff] to-[#dbeafe]", color: "#2563eb", icon: Activity },
];

export default function KhadimDashboard() {
  // filters & access
  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  // date range
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // summary / widgets
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    parking: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(false);

  // charts data
  const [statusCounts, setStatusCounts] = useState<{ status: string; count: number }[]>([]);
  const [deptCounts, setDeptCounts] = useState<{ department: string; count: number }[]>([]);
  const [catCounts, setCatCounts] = useState<{ category: string; count: number }[]>([]);
  const [branchLeaderboard, setBranchLeaderboard] = useState<any[]>([]);
  const [latestComplaints, setLatestComplaints] = useState<any[]>([]);

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [categorySummary, setCategorySummary] = useState<{ category: string; total: number }[]>([]);
  const [loadingCategorySummary, setLoadingCategorySummary] = useState(false);
  const [deptSummary, setDeptSummary] = useState<{ department: string; total: number; open: number; inProgress: number; resolved: number; closed: number; parking: number; resolutionRatePct: number }[]>([]);
  const [loadingDeptSummary, setLoadingDeptSummary] = useState(false);
  const [deptTrend, setDeptTrend] = useState<{ department: string; series: { date: string; total: number; resolved: number }[] }[]>([]);
  const [loadingDeptTrend, setLoadingDeptTrend] = useState(false);
  const [repeatData, setRepeatData] = useState([]);
  const [loadingRepeat, setLoadingRepeat] = useState(false);
  const maxTotal = Math.max(...repeatData.map(r => r.totalComplaints), 1);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [drillCategory, setDrillCategory] = useState("");
  const [drillBranches, setDrillBranches] = useState<any[]>([]);
  const [selectedCategoryAging, setSelectedCategoryAging] = useState<any>(null);
  const openAgingDonut = (item) => { setSelectedCategoryAging(item); };
  const [agingData, setAgingData] = useState<any[]>([]);
  const [loadingAging, setLoadingAging] = useState(false);
  const [techPerformance, setTechPerformance] = useState<any[]>([]);
  const [loadingTech, setLoadingTech] = useState(false);
  const [techData, setTechData] = useState<any[]>([]);


  // small UI helpers
  useEffect(() => {
    // default date range = last 7 days
    const today = new Date();
    const prev = new Date();
    prev.setDate(today.getDate() - 7);
    const toISO = (d: Date) => d.toISOString().slice(0, 16);
    setStartDate(toISO(prev));
    setEndDate(toISO(today));

    // load filter access & options
    (async function loadAccess() {
      try {
        const res = await getDashboardFilterAccess();
        if (res && res.data) {
          setCanViewRegion(res.data.canViewRegion);
          setCanViewBranch(res.data.canViewBranch);
          if (res.data.canViewRegion) {
            const r = await getRegionsForDashboard();
            if (r?.data) setRegions(r.data);
            if (res.data.defaultRegionId) setSelectedRegion(res.data.defaultRegionId);
          }
          // if (res.data.canViewBranch) {
          //   const b = await getBranchesForDashboard(res.data.defaultRegionId);
          //   if (b?.data) setBranches(b.data);
          //   if (res.data.defaultBranchId) setSelectedBranch(res.data.defaultBranchId);
          // }
        }
      } catch (err) {
        console.error("Filter access error", err);
      }
    })();
  }, []);

  // unified fetch
  useEffect(() => {
    // small delay until default dates are set
    const t = setTimeout(() => {
      refreshAll();
    }, 200);
    return () => clearTimeout(t);
  }, [selectedRegion, selectedBranch, startDate, endDate]);

  const refreshAll = async () => {
    await Promise.all([
      loadSummary(),
      // loadStatusCounts(),
      // loadDeptCounts(),
      // loadCategoryCounts(),
      // loadBranchLeaderboard(),
      // loadLatestComplaints(),
      loadCategorySummary(startDate, endDate, selectedRegion, selectedBranch),
      loadDeptCounts(startDate, endDate, selectedRegion, selectedBranch),
      loadDeptTrend(startDate, endDate, selectedRegion, selectedBranch, 5),
      loadBranchLeaderboard(),
      loadRepeatComplaints(),
      loadAgingReport(),
      loadTechnicianPerformance(),

    ]);
  };

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

  const loadAgingReport = async () => {
    setLoadingAging(true);

    try {
      const res = await getComplaintAgingReport(
        startDate,
        endDate,
        selectedRegion,
        selectedBranch
      );

      setAgingData(res.map(a => ({ category: a.category, totalComplaints: a.totalComplaints, avgAgingHours: a.avgAgingHours ?? a.AvgAgingHours, minAgingHours: a.minAgingHours ?? a.MinAgingHours, maxAgingHours: a.maxAgingHours ?? a.MaxAgingHours })));
    } catch (e) {
      console.error(e);
      setAgingData([]);
    } finally {
      setLoadingAging(false);
    }
  };

  const loadTechnicianPerformance = async () => {
    setLoadingTech(true);
    try {
      const res = await getTechnicianPerformance(
        startDate,
        endDate,
        selectedRegion,
        selectedBranch
      );

      if (Array.isArray(res)) {
        setTechData(res);
      } else {
        setTechData([]);
      }
    } catch (err) {
      console.error("loadTechnicianPerformance:", err);
      setTechData([]);
    } finally {
      setLoadingTech(false);
    }
  };


  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await getKhadimSummary(startDate, endDate, selectedRegion, selectedBranch);
      // expected res.data = { total, open, inProgress, resolved, closed, parking }
      if (res?.data) {
        setSummary({
          total: res.data.total ?? 0,
          open: res.data.open ?? 0,
          inProgress: res.data.inProgress ?? 0,
          resolved: res.data.resolved ?? 0,
          closed: res.data.closed ?? 0,
          parking: res.data.parking ?? 0,
        });
      } else {
        setSummary({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, parking: 0 });
      }
    } catch (err) {
      console.error("loadSummary", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const openBranchDrilldown = (category) => {
    const item = repeatData.find((x) => x.category === category);
    setDrillBranches(item?.branchWise || []);
    setDrillCategory(category);
    setShowBranchModal(true);
  };


  const loadRepeatComplaints = async () => {
    setLoadingRepeat(true);
    try {
      const res = await getKhadimRepeatComplaints(startDate, endDate, selectedRegion, selectedBranch);
      setRepeatData(res);
    } catch (e) {
      console.error(e);
      setRepeatData([]);
    } finally {
      setLoadingRepeat(false);
    }
  };


  const loadCategorySummary = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null
  ) => {
    try {
      setLoadingCategorySummary(true);

      const res = await getKhadimCategorySummary(
        start ?? startDate,
        end ?? endDate,
        regionId ?? selectedRegion,
        branchId ?? selectedBranch
      );

      if (Array.isArray(res)) {
        setCategorySummary(
          res.map((x: any) => ({
            category: x.category,
            total: x.total
          }))
        );
      } else {
        setCategorySummary([]);
      }
    } catch (err) {
      console.error("Error loading category summary:", err);
    } finally {
      setLoadingCategorySummary(false);
    }
  };


  const loadDeptCounts = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null
  ) => {
    try {
      setLoadingDeptSummary(true);
      const res = await getKhadimDepartmentSummary(start ?? startDate, end ?? endDate, regionId ?? selectedRegion, branchId ?? selectedBranch);
      if (Array.isArray(res)) {
        setDeptSummary(res.map((r: any) => ({
          department: r.department,
          total: r.total,
          open: r.open,
          inProgress: r.inProgress,
          resolved: r.resolved,
          closed: r.closed,
          parking: r.parking,
          resolutionRatePct: Number(r.resolutionRatePct) || 0
        })));
      } else {
        setDeptSummary([]);
      }
    } catch (err) {
      console.error("loadDeptCounts", err);
      setDeptSummary([]);
    } finally {
      setLoadingDeptSummary(false);
    }
  };

  const loadDeptTrend = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null,
    topN = 5
  ) => {
    try {
      setLoadingDeptTrend(true);
      const res = await getKhadimDepartmentTrend(start ?? startDate, end ?? endDate, regionId ?? selectedRegion, branchId ?? selectedBranch, topN);
      if (Array.isArray(res)) {
        setDeptTrend(res.map((r: any) => ({
          department: r.department,
          series: r.series
        })));
      } else {
        setDeptTrend([]);
      }
    } catch (err) {
      console.error("loadDeptTrend", err);
      setDeptTrend([]);
    } finally {
      setLoadingDeptTrend(false);
    }
  };


  const deptBarOptions = useMemo(() => {
    const data = deptSummary.slice(0, 10); // top 10

    // 🎨 Gradient color list (auto-applied to bars)
    const gradients = [
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#ff4d4f"], [1, "#b30000"]] }, // Red
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#ffb300"], [1, "#ff6f00"]] }, // Orange
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#4dabf7"], [1, "#1d4ed8"]] }, // Blue
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#4ade80"], [1, "#15803d"]] }, // Green
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#f472b6"], [1, "#be185d"]] }, // Pink
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#a78bfa"], [1, "#5b21b6"]] }, // Purple
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#67e8f9"], [1, "#0891b2"]] }, // Cyan
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#facc15"], [1, "#b45309"]] }, // Yellow
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#9ca3af"], [1, "#4b5563"]] }, // Gray
      { linearGradient: [0, 0, 0, 300], stops: [[0, "#ff9eaa"], [1, "#d24654"]] }, // Soft red
    ];

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 380,
        options3d: {
          enabled: true,
          alpha: 12,
          beta: 20,
          depth: 60,
          viewDistance: 25
        }
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            enabled: true,       // show the hamburger button
            symbolStroke: "#666",
            symbolFill: "#fff",
            menuItems: [
              "viewFullscreen",
              "printChart",
              "separator",
              "downloadPNG",
              "downloadJPEG",
              "downloadSVG"
            ]
          }
        }
      },
      navigation: {
        buttonOptions: {
          align: "right",
          verticalAlign: "top",
          y: 0
        }
      },

      title: { text: "" },

      xAxis: {
        categories: data.map(d => d.department),
        labels: {
          rotation: -45,
          style: { color: "#444", fontSize: 11, fontWeight: 600 }
        }
      },

      yAxis: {
        title: { text: "" },
        gridLineColor: "rgba(0,0,0,0.05)"
      },

      plotOptions: {
        column: {
          depth: 35,
          borderRadius: 6,
          pointPadding: 0.15,
          groupPadding: 0.05,
          colorByPoint: true,

          // 🌟 Hover glow
          states: {
            hover: {
              brightness: 0.15,
              halo: { size: 12, opacity: 0.25 }
            }
          },

          dataLabels: {
            enabled: true,
            format: "{point.y}",
            style: { fontSize: "11px", color: "#333", fontWeight: "600", textOutline: "none" }
          }
        }
      },

      tooltip: {
        backgroundColor: "#fff",
        borderColor: "#ddd",
        borderRadius: 6,
        shadow: true,
        pointFormat: "<b>{point.y}</b> complaints"
      },

      series: [
        {
          name: "Complaints",
          data: data.map((d, i) => ({
            y: d.total,
            color: gradients[i % gradients.length] // 🎨 apply gradients
          }))
        }
      ]
    };
  }, [deptSummary]);



  const deptTrendOptions = useMemo(() => {
    if (!deptTrend || deptTrend.length === 0) {
      return { chart: { height: 280, backgroundColor: "transparent" } };
    }

    // --- Unique sorted dates
    const datesSet = new Set<string>();
    deptTrend.forEach((d) => d.series.forEach((s) => datesSet.add(s.date)));
    const dates = Array.from(datesSet).sort();

    // 🌈 Gradient color generator
    const getGradient = (start: string, end: string) => ({
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [
        [0, start],
        [1, end],
      ],
    });

    // 🎨 Department Colors
    const deptColors = {
      IT: {
        total: getGradient("#1e90ff", "#0a3d62"),      // blue → navy
        resolved: getGradient("#87cefa", "#1e90ff"),  // light blue → blue
      },
      Maintenance: {
        total: getGradient("#6b46c1", "#3b2475"),      // purple → dark purple
        resolved: getGradient("#b794f4", "#6b46c1"),   // light purple → purple
      },
      // add more departments if needed
    };

    const series: any[] = [];

    // Build TOTAL + RESOLVED series for each department
    deptTrend.forEach((d) => {
      const colorSet = deptColors[d.department] || {
        total: getGradient("#184bd8ff", "#25ced4ff"),
        resolved: getGradient("#218f0bff", "#9fdf38ff"),
      };

      // TOTAL BAR
      series.push({
        name: `${d.department} - Total`,
        type: "column",
        data: dates.map((dt) => {
          const f = d.series.find((s) => s.date === dt);
          return f ? f.total : 0;
        }),
        color: colorSet.total,
        borderRadius: 4,
      });

      // RESOLVED BAR
      series.push({
        name: `${d.department} - Resolved`,
        type: "column",
        data: dates.map((dt) => {
          const f = d.series.find((s) => s.date === dt);
          return f ? f.resolved : 0;
        }),
        color: colorSet.resolved,
        borderRadius: 4,
      });
    });

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 380,
        options3d: {
          enabled: true,
          alpha: 10,
          beta: 12,
          depth: 55,
          viewDistance: 35,
        },
      },

      title: { text: "" },

      xAxis: {
        categories: dates,
        labels: { rotation: -45, style: { fontWeight: 600, color: "#555" } },
      },

      yAxis: {
        min: 0,
        title: { text: "Complaints" },
        gridLineColor: "rgba(0,0,0,0.1)",
      },

      legend: {
        align: "center",
        verticalAlign: "top",
        layout: "horizontal",
      },

      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function () {
          let s = `<b>${this.key}</b><br/>`;
          this.points.forEach((p) => {
            s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${p.y}</b><br/>`;
          });
          return s;
        },
      },

      plotOptions: {
        column: {
          grouping: true,
          groupPadding: 0.12,
          pointPadding: 0.03,
          depth: 40,
        },
      },

      series,
    };
  }, [deptTrend]);


  const agingDonutOptions = useMemo(() => {
    if (!selectedCategoryAging) return {};

    const c = selectedCategoryAging;

    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 280,
        style: { fontFamily: "Inter" }
      },

      title: {
        text: `${c.category} Aging`,
        style: { fontSize: "14px", fontWeight: "600" }
      },

      plotOptions: {
        pie: {
          innerSize: "55%",
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            style: { fontSize: "12px", textOutline: "none", fontWeight: "600" }
          },
          states: {
            hover: { brightness: 0.15 }
          }
        }
      },

      tooltip: {
        pointFormat: "<b>{point.y}</b> hours",
        backgroundColor: "#fff",
        borderColor: "#ccc",
        shadow: true
      },

      series: [
        {
          name: "Aging",
          data: [
            {
              name: "Avg Hours",
              y: c.avgAgingHours,
              color: {
                linearGradient: [0, 0, 0, 200],
                stops: [
                  [0, "#4dabf7"],
                  [1, "#1e40af"]
                ]
              }
            },
            {
              name: "Min Hours",
              y: c.minAgingHours,
              color: {
                linearGradient: [0, 0, 0, 200],
                stops: [
                  [0, "#86efac"],
                  [1, "#15803d"]
                ]
              }
            },
            {
              name: "Max Hours",
              y: c.maxAgingHours,
              color: {
                linearGradient: [0, 0, 0, 200],
                stops: [
                  [0, "#fca5a5"],
                  [1, "#b91c1c"]
                ]
              }
            }
          ]
        }
      ]
    };
  }, [selectedCategoryAging]);




  const loadBranchLeaderboard = async () => {
    setLoadingBranches(true);
    try {
      const data = await getKhadimBranchLeaderboard(
        startDate,
        endDate,
        selectedRegion,
        selectedBranch
      );

      if (Array.isArray(data)) {
        setBranchLeaderboard(data);
      } else {
        setBranchLeaderboard([]);
      }
    } catch (err) {
      console.error("loadBranchLeaderboard:", err);
    } finally {
      setLoadingBranches(false);
    }
  };



  const techBarOptions = useMemo(() => {
    if (!techData || techData.length === 0) {
      return { chart: { height: 260, backgroundColor: "transparent" } };
    }

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 360,
      },

      title: { text: "" },

      xAxis: {
        categories: techData.map(t => t.technician),
        labels: { style: { fontSize: "12px", fontWeight: 600, color: "#444" } },
      },

      yAxis: {
        title: { text: "Resolved Complaints" },
        gridLineColor: "rgba(0,0,0,0.1)",
      },

      plotOptions: {
        column: {
          borderRadius: 6,
          pointPadding: 0.1,
          groupPadding: 0.05,
        }
      },

      exporting: { enabled: true },

      series: [
        {
          name: "Resolved",
          data: techData.map(t => t.resolvedCount),
          color: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, "#4dabf7"],
              [1, "#1d4ed8"]
            ]
          }
        }
      ]
    };
  }, [techData]);





  const categoryCylinderHeatmapChart = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 360,
    },

    title: { text: "" },

    xAxis: {
      categories: categorySummary.map((x) => x.category),
      labels: {
        rotation: -45,
        style: { color: "#fff", fontSize: "12px", fontWeight: 600 },
      },
    },

    yAxis: {
      title: { text: "" },
      // ⭐ Show visible grid lines
      gridLineColor: "#e5e7eb",     // light grey grid lines
      gridLineWidth: 1,
      lineColor: "#d1d5db",
      tickColor: "#d1d5db",
      labels: { style: { color: "#eee" } },
    },

    legend: { enabled: false },

    tooltip: {
      backgroundColor: "#fff",
      borderRadius: 6,
      borderColor: "#d9232e",
      useHTML: true,
      formatter: function () {
        return `<b>${this.key}</b><br/>Complaints: <b>${this.y}</b>`;
      },
    },

    // 🌡 HEAT-MAP LOGIC (0 → 1 scale)
    colors: categorySummary.map((x) => {
      const max = Math.max(...categorySummary.map((c) => c.total)) || 1;
      const pct = x.total / max;

      // gradient stops for heat-map
      if (pct < 0.33)
        return {
          linearGradient: [0, 0, 0, 200],
          stops: [
            [0, "#4f8cff"], // blue top
            [1, "#1e3a8a"], // dark blue bottom
          ],
        };

      if (pct < 0.66)
        return {
          linearGradient: [0, 0, 0, 200],
          stops: [
            [0, "#ffd54f"], // light yellow
            [1, "#f59e0b"], // amber
          ],
        };

      return {
        linearGradient: [0, 0, 0, 200],
        stops: [
          [0, "#ff6b6b"], // hot red
          [1, "#b30000"], // dark red
        ],
      };
    }),

    plotOptions: {
      column: {
        colorByPoint: true,
        borderRadius: 6,
        pointPadding: 0.08,
        groupPadding: 0.18,

        states: {
          hover: {
            brightness: 0.18,
            halo: { size: 12, opacity: 0.35 }, // smooth glow
          },
        },

        dataLabels: {
          enabled: true,
          style: {
            color: "#250303ff",
            fontWeight: "bold",
            textOutline: "none",
            fontSize: "12px",
          },
        },
      },
    },

    series: [
      {
        name: "Complaints",
        data: categorySummary.map((x) => x.total),
      },
    ],
  };



  // const loadStatusCounts = async () => {
  //   setLoadingStatus(true);
  //   try {
  //     const res = await getKhadimStatusCounts(startDate, endDate, selectedRegion, selectedBranch);
  //     if (Array.isArray(res?.data)) setStatusCounts(res.data);
  //     else setStatusCounts([]);
  //   } catch (err) {
  //     console.error("loadStatusCounts", err);
  //     setStatusCounts([]);
  //   } finally {
  //     setLoadingStatus(false);
  //   }
  // };

  // const loadDeptCounts = async () => {
  //   setLoadingDept(true);
  //   try {
  //     const res = await getKhadimDepartmentCounts(startDate, endDate, selectedRegion, selectedBranch);
  //     if (Array.isArray(res?.data)) setDeptCounts(res.data);
  //     else setDeptCounts([]);
  //   } catch (err) {
  //     console.error("loadDeptCounts", err);
  //     setDeptCounts([]);
  //   } finally {
  //     setLoadingDept(false);
  //   }
  // };

  // const loadCategoryCounts = async () => {
  //   setLoadingCat(true);
  //   try {
  //     const res = await getKhadimCategoryCounts(startDate, endDate, selectedRegion, selectedBranch);
  //     if (Array.isArray(res?.data)) setCatCounts(res.data);
  //     else setCatCounts([]);
  //   } catch (err) {
  //     console.error("loadCategoryCounts", err);
  //     setCatCounts([]);
  //   } finally {
  //     setLoadingCat(false);
  //   }
  // };

  // const loadBranchLeaderboard = async () => {
  //   setLoadingBranches(true);
  //   try {
  //     const res = await getKhadimBranchLeaderboard(startDate, endDate, selectedRegion, selectedBranch);
  //     if (Array.isArray(res?.data)) setBranchLeaderboard(res.data);
  //     else setBranchLeaderboard([]);
  //   } catch (err) {
  //     console.error("loadBranchLeaderboard", err);
  //     setBranchLeaderboard([]);
  //   } finally {
  //     setLoadingBranches(false);
  //   }
  // };

  // const loadLatestComplaints = async () => {
  //   setLoadingLatest(true);
  //   try {
  //     const res = await getKhadimLatestComplaints(startDate, endDate, selectedRegion, selectedBranch);
  //     if (Array.isArray(res?.data)) setLatestComplaints(res.data);
  //     else setLatestComplaints([]);
  //   } catch (err) {
  //     console.error("loadLatestComplaints", err);
  //     setLatestComplaints([]);
  //   } finally {
  //     setLoadingLatest(false);
  //   }
  // };

  const accentColors = ["#d9232e", "#eab308", "#2563eb", "#16a34a", "#d9232e", "#2563eb"];
  // --- Highcharts options derived from data
  const statusChartOptions = useMemo(() => {
    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 320,
      },
      title: { text: "" },
      xAxis: {
        categories: statusCounts.map((s) => s.status),
        labels: { style: { color: "#444", fontWeight: 600 } },
      },
      yAxis: { title: { text: "" }, gridLineColor: "rgba(0,0,0,0.05)" },
      legend: { enabled: false },
      tooltip: { shared: true, backgroundColor: "#fff" },
      plotOptions: {
        column: {
          borderRadius: 6,
          colorByPoint: true,
          dataLabels: { enabled: true, format: "{point.y}", style: { color: "#333" } },
        },
      },
      series: [
        {
          name: "Complaints",
          data: statusCounts.map((s) => s.count),
          colors: statusCounts.map((s, i) => {
            // map colors by status (open = red, in-progress = amber, resolved/closed = green)
            const key = (s.status || "").toLowerCase();
            if (key.includes("open")) return "#d9232e";
            if (key.includes("in progress") || key.includes("progress")) return "#f59e0b";
            if (key.includes("resolved") || key.includes("closed")) return "#16a34a";
            if (key.includes("parking")) return "#64748b";
            return "#1f2937";
          }),
        },
      ],
    };
  }, [statusCounts]);

  const deptChartOptions = useMemo(() => {
    return {
      chart: { type: "pie", backgroundColor: "transparent", height: 300 },
      title: { text: "" },
      legend: { enabled: true, align: "right", verticalAlign: "middle", layout: "vertical" },
      plotOptions: {
        pie: {
          innerSize: "50%",
          dataLabels: { enabled: true, format: "{point.y}" },
        },
      },
      series: [
        {
          name: "Departments",
          data: deptCounts.map((d) => ({ name: d.department, y: d.count })),
        },
      ],
    };
  }, [deptCounts]);

  const catChartOptions = useMemo(() => {
    return {
      chart: {
        type: "column",
        options3d: { enabled: true, alpha: 8, beta: 20, depth: 60 },
        backgroundColor: "transparent",
        height: 300,
      },
      title: { text: "" },
      xAxis: {
        categories: catCounts.map((c) => c.category),
        labels: { style: { color: "#444" } },
      },
      yAxis: { title: { text: "" } },
      plotOptions: {
        column: {
          depth: 30,
          borderRadius: 6,
          colorByPoint: true,
        },
      },
      series: [{ name: "Complaints", data: catCounts.map((c) => c.count) }],
    };
  }, [catCounts]);

  const trendChartOptions = useMemo(() => {
    // if latestComplaints contains createdAt we can produce a time series; otherwise fallback to statusCounts
    const categories = latestComplaints
      .slice()
      .reverse()
      .map((r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : r.cid));
    const seriesData = latestComplaints.slice().reverse().map((r) => 1); // just show frequency
    return {
      chart: { type: "line", backgroundColor: "transparent", height: 200 },
      title: { text: "" },
      xAxis: { categories, labels: { style: { color: "#666", fontSize: "11px" } } },
      yAxis: { title: { text: "" }, gridLineColor: "rgba(0,0,0,0.05)" },
      series: [{ name: "Complaints", data: seriesData }],
    };
  }, [latestComplaints]);

  // cards data
  const cardData = [
    { title: "Total Complaints", value: summary.total, accent: smallCardAccent[0] },
    { title: "Open", value: summary.open, accent: smallCardAccent[1] },
    { title: "In Progress", value: summary.inProgress, accent: smallCardAccent[2] },
    { title: "Resolved", value: summary.resolved, accent: smallCardAccent[3] },
    { title: "Closed", value: summary.closed, accent: smallCardAccent[4] },
    { title: "Parking", value: summary.parking, accent: smallCardAccent[5] },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
        {canViewRegion && (
          <div className="flex flex-col">
            <label className="text-gray-600 text-sm font-medium">Region</label>
            <select
              value={selectedRegion ?? ""}
              onChange={async (e) => {
                const v = parseInt(e.target.value) || null;
                setSelectedRegion(v);
                // reload branches when region changes
                if (v) {
                  try {
                    const b = await getBranchesForDashboard(v);
                    if (b?.data) setBranches(b.data);
                  } catch (err) {
                    console.error("getBranchesForDashboard", err);
                  }
                } else {
                  setBranches([]);
                }
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">-- All Regions --</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {canViewBranch && (
          <div className="flex flex-col">
            <label className="text-gray-600 text-sm font-medium">Branch</label>
            <select
              value={selectedBranch ?? ""}
              onChange={(e) => setSelectedBranch(parseInt(e.target.value) || null)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">-- All Branches --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label className="text-gray-600 text-sm font-medium">Start Date</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-gray-600 text-sm font-medium">End Date</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-center mt-2">
          <button
            onClick={refreshAll}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded text-sm font-semibold transition"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6 mt-6">
        {cardData.map((c, idx) => {
          const Icon = c.accent.icon;
          return (
            <div
              key={c.title}
              className={`relative rounded-2xl p-5 bg-gradient-to-br ${c.accent.bg} border border-gray-100 shadow-md hover:shadow-xl transform transition`}
            >
              <div
                className="absolute -top-4 right-4 p-2 rounded-full shadow"
                style={{ backgroundColor: `${c.accent.color}22`, color: c.accent.color }}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="text-sm font-medium text-gray-600">{c.title}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <h3 className="text-3xl font-bold" style={{ color: c.accent.color }}>
                  <CountUp end={c.value} duration={1.2} separator="," />
                </h3>
              </div>

              {/* Footer line (always visible) */}
              <div
                className="h-1 mt-4 rounded-full"
                style={{ backgroundColor: `${accentColors[idx]}40` }}
              ></div>
            </div>
          );
        })}
      </div>

      {/* Charts top row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Status chart */}
        <div className="bg-white p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">Top Departments</h4>

            <button
              onClick={() => loadDeptCounts()}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xs transition"
            >
              ⟳
            </button>
          </div>
          {loadingDeptSummary ? (<div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
          </div>) : deptSummary.length === 0 ? (
            <p className="text-center text-gray-200 py-10">No data available.</p>
          ) : <HighchartsReact highcharts={Highcharts} options={deptBarOptions} />}
        </div>

        <div className="bg-white p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">Resolution Trend (Top Depts)</h4>
            <button onClick={() => loadDeptTrend(undefined, undefined, undefined, undefined, 5)} className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xs transition"
            >
              ⟳</button>
          </div>
          {loadingDeptTrend ? (<div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
          </div>) : deptTrend.length === 0 ? (
            <p className="text-center text-gray-200 py-10">No data available.</p>
          ) : <HighchartsReact highcharts={Highcharts} options={deptTrendOptions} />}
        </div>

      </div>

      {/* Middle row: trend + leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">



        {/* CATEGORY SUMMARY – 3D COLUMN */}
        <div className="col-span-3 bg-white p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">
              Category Wise Complaints
            </h4>

            <button
              onClick={() => loadCategorySummary()}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xs transition"
            >
              ⟳
            </button>
          </div>

          {/* CHART GOES HERE */}
          {loadingCategorySummary ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-white h-6 w-6" />
            </div>
          ) : categorySummary.length === 0 ? (
            <p className="text-center text-gray-200 py-10">No data available.</p>
          ) : (
            <HighchartsReact highcharts={Highcharts} options={categoryCylinderHeatmapChart} />
          )}
        </div>
      </div>





      {/* Repeat Complaints Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="col-span-3 bg-white p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">
              Repeat Complaints (Top 6 Category Wise & Branch Drilldown)
            </h4>
            <button
              onClick={loadRepeatComplaints}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center">
              ⟳
            </button>
          </div>

          {/* Grid for Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 ">

            {repeatData.length === 0 ? (
              <p className="text-center text-gray-400 py-10">No data available</p>
            ) : (
              repeatData.map((r, idx) => {
                const rate = Number(((r.repeatCount / r.totalCount) * 100).toFixed(1));
                const donutColors = [
                  { dark: "#16a34a", light: "#bbf7d0" }, // green
                  { dark: "#dc2626", light: "#fecaca" }, // red
                  { dark: "#2563eb", light: "#bfdbfe" }, // blue
                  { dark: "#d97706", light: "#fde68a" }, // amber
                  { dark: "#7c3aed", light: "#ddd6fe" }, // purple
                ];

                const color = donutColors[idx % donutColors.length];
                return (
                  <div
                    key={idx}
                    className="bg-white border rounded-xl shadow hover:shadow-lg transition p-4"
                  >
                    {/* TOP COUNT */}
                    <div className="text-gray-700 text-xs font-semibold">
                      {r.totalCount.toLocaleString()} COMPLAINTS
                    </div>

                    {/* CATEGORY TITLE */}
                    <div className="font-bold text-lg mt-1 flex items-center justify-between">
                      {r.category}
                      <button
                        onClick={() => openBranchDrilldown(r.category)}
                        className="text-green-500 hover:text-red-800"
                      >
                        View Branch Wise
                      </button>
                    </div>

                    {/* DONUT CHART */}
                    <div className="relative flex justify-center my-3">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={{
                          chart: {
                            type: "pie",
                            height: 180,
                            backgroundColor: "transparent",
                          },
                          title: { text: "" },
                          plotOptions: {
                            pie: {
                              innerSize: "70%",
                              borderWidth: 0,
                              dataLabels: { enabled: false },
                            },
                          },
                          tooltip: { enabled: false },
                          series: [
                            {
                              data: [
                                { y: rate, color: color.dark },
                                { y: 100 - rate, color: color.light },
                              ],
                            },
                          ],
                        }}
                      />

                      {/* CENTERED TEXT */}
                      <div className="absolute flex flex-col items-center justify-center top-[55px]">
                        <div className="text-xs text-gray-600">Repeat Rate</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {rate}%
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM DETAILS */}
                    <div className="text-center text-xs text-gray-600 mt-2">
                      {/* <div>Resolved: <b>{r.totalCount - r.repeatCount}</b></div> */}
                      <div>Repeat: <b className="text-blue-700">{r.repeatCount}</b></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Leaderboard */}
        <div className=" col-span-1 bg-white  p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">
              Branch Leaderboard (Top 5)
            </h4>

            <button
              onClick={() => loadBranchLeaderboard()}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xs transition"
            >
              ⟳
            </button>
          </div>

          {loadingBranches ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
            </div>
          ) : branchLeaderboard.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No data available</p>
          ) : (
            // added px-3 so left & right both have breathing room
            <div className="space-y-4 max-h-[460px] overflow-y-auto px-3">
              {(() => {
                const maxVal = Math.max(...branchLeaderboard.map((b) => b.totalComplaints || 0), 1);

                return branchLeaderboard.map((b: any, i: number) => {
                  const pct = Math.round(((b.totalComplaints || 0) / maxVal) * 100);

                  return (
                    // increased left padding (pl-10) to accomodate negative left badge
                    <div
                      key={b.branchID || i}
                      className="relative p-3 pl-10 pr-5 rounded-lg border border-gray-100 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Rank Badge */}
                      <div
                        className={`absolute -left-3 top-3 w-8 h-8 flex items-center justify-center rounded-full text-white font-bold shadow 
                  ${i === 0
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                            : i === 1
                              ? "bg-gradient-to-br from-gray-300 to-gray-500"
                              : i === 2
                                ? "bg-gradient-to-br from-orange-300 to-orange-500"
                                : "bg-gradient-to-br from-gray-400 to-gray-700"
                          }`}
                      >
                        {i + 1}
                      </div>

                      {/* Branch Info */}
                      <div className="ml-0">
                        <div className="font-semibold text-gray-800 text-sm">
                          {b.branchName}
                        </div>
                        <div className="text-xs text-gray-500">{b.region}</div>
                      </div>

                      {/* Count Badge */}
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-[#d9232e] to-[#a60f1a] text-white px-3 py-1 rounded-md shadow-sm text-sm font-semibold">
                        {b.totalComplaints}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#d9232e] to-[#ff6b6b]"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
        {/* SLA Compliance */}
        <div className="col-span-2 bg-white p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">
              SLA Compliance
            </h4>

            <button

              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xs transition"
            >
              ⟳
            </button>
          </div>

        </div>
      </div>


      {/* AGING CATEGORY LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className=" col-span-2 bg-white  p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">
              Complaint Aging Summary (Top 5 Categories)
            </h4>
            <button
              onClick={loadAgingReport}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xs"
            >
              ⟳
            </button>
          </div>

          {/* 3 Column Layout: Table (2 cols) + Donut (1 col) */}
          <div className="grid grid-cols-1  gap-6">

            {/* TABLE AREA */}
            <div className="lg:col-span-2">
              <div className="max-h-[360px] overflow-y-auto rounded-lg border shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-left bg-gray-100">Category</th>
                      <th className="p-2 text-center bg-gray-100">Total Complaints</th>
                      <th className="p-2 text-center bg-gray-100">Avg (hrs)</th>
                      <th className="p-2 text-center bg-gray-100">Min (hrs)</th>
                      <th className="p-2 text-center bg-gray-100">Max (hrs)</th>
                      <th className="p-2 text-center bg-gray-100">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {agingData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-400 py-6">
                          No data available
                        </td>
                      </tr>
                    )}

                    {agingData.map((a, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition">
                        <td className="p-2 font-medium">{a.category}</td>
                        <td className="p-2 text-center">{a.totalComplaints}</td>
                        <td className="p-2 text-center">{a.avgAgingHours}</td>
                        <td className="p-2 text-center text-green-700 font-semibold">
                          {a.minAgingHours}
                        </td>
                        <td className="p-2 text-center text-red-600 font-semibold">
                          {a.maxAgingHours}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            className="text-xs bg-[#d9232e] text-white px-3 py-1 rounded shadow hover:bg-[#b81824] transition"
                            onClick={() => openAgingDonut(a)}
                          >
                            View Donut
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            {/* DONUT AREA */}
            {/* <div className="flex items-center justify-center">
        {selectedCategoryAging ? (
          <HighchartsReact
            highcharts={Highcharts}
            options={agingDonutOptions}
          />
        ) : (
          <p className="text-gray-400 text-center">Select a category</p>
        )}
      </div> */}

          </div>
        </div>

        <div className="col-span-1 bg-white  p-4 shadow border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-sm font-semibold text-[#d9232e] uppercase">
              Technician Performance
            </h4>

            <button
              onClick={loadTechnicianPerformance}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xs"
            >
              ⟳
            </button>
          </div>

          {/* {loadingTech ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
            </div>
          ) : techData.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No data available</p>
          ) : (
            <HighchartsReact
              highcharts={Highcharts}
              options={techBarOptions}
            />
          )} */}

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">

            {techData.length === 0 ? (
              <p className="text-center text-gray-400 py-10">No data available</p>
            ) : (
              techData
                .sort((a, b) => b.resolvedCount - a.resolvedCount)
                .map((t, idx) => {
                  const max = Math.max(...techData.map(x => x.resolvedCount), 1);
                  const pct = Math.round((t.resolvedCount / max) * 100);

                  return (
                    <div
                      key={idx}
                      className="relative rounded-xl p-4 pl-14 bg-white shadow hover:shadow-lg transition-all border border-gray-100"
                    >

                      {/* Rank Badge */}
                      <div
                        className={`absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-white font-bold shadow-lg
              ${idx === 0
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                            : idx === 1
                              ? "bg-gradient-to-br from-gray-300 to-gray-500"
                              : "bg-gradient-to-br from-orange-300 to-orange-500"
                          }
            `}
                      >
                        {idx + 1}
                      </div>

                      {/* Name */}
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-gray-800">{t.technician}</h4>

                        {/* Resolved badge */}
                        <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow">
                          {t.resolvedCount} Resolved
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            )}

          </div>


        </div>
      </div>





      {/* Branch Drilldown Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
          <div className="bg-white w-[420px] rounded-xl shadow-xl p-5 relative">

            {/* Close button */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowBranchModal(false)}
            >
              ✖
            </button>

            <h2 className="text-lg font-semibold text-[#d9232e] mb-4">
              {drillCategory} — Branch-wise Breakdown
            </h2>

            {drillBranches.length === 0 ? (
              <p className="text-gray-500 text-sm">No branch-level data found.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {drillBranches.map((b: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-white border shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{b.branch_Name}</div>
                        <div className="text-xs text-gray-500">
                          Repeats: {b.count}
                        </div>
                      </div>

                      <div className="text-sm font-bold bg-red-500 text-white px-3 py-1 rounded-lg shadow">
                        {b.Count}
                      </div>
                    </div>

                    <div className="h-2 mt-2 w-full bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-gradient-to-r from-[#d9232e] to-[#ff6b6b] rounded-full"
                        style={{ width: `${Math.min(b.Count, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Complaint Aging Modal */}
      {selectedCategoryAging && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
          <div className="bg-white w-[420px] rounded-xl shadow-xl p-5 relative">

            {/* Close button */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setSelectedCategoryAging(null)}
            >
              ✖
            </button>

            <h2 className="text-lg font-semibold text-[#d9232e] mb-4">
              {selectedCategoryAging.category} – Aging Comparison
            </h2>

            <HighchartsReact
              highcharts={Highcharts}
              options={agingDonutOptions}
            />

          </div>
        </div>
      )}

      <BackToTopButton />
    </div>
  );
}
