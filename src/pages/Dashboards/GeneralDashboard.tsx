import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Building2, PhoneCall, CheckCircle, Loader2 } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  getComplaintSummary,
  getComplaintTrend,
  getTopComplaintTypes,
  getDashboardFilterAccess,
  getRegionsForDashboard,
  getBranchesForDashboard,
  StoreHighComplaints, getStoreWiseHighComplaints,
  getComplaintChannelWise, getComplaintSourceWise
} from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CountUp from "react-countup";
import StoreWiseHeatmap from "@/components/Dashboard/StoreWiseHeatmap";
//import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import { ArrowUp } from "lucide-react";

// ✅ Register chart components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Types
interface ComplaintStats {
  totalComplaints: number;
  pendingOnBranch: number;
  pendingOnCC: number;
  closed: number;
  valid?: number;
  invalid?: number;
  sr?: number;
}
interface ComplaintTrend {
  label: string;
  totalComplaints: number;
}
interface ComplaintType {
  ComplaintCategory: string;
  TotalComplaints: number;
}

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

const GeneralDashboard: React.FC = () => {
  const [stats, setStats] = useState<ComplaintStats>({
    totalComplaints: 0,
    pendingOnBranch: 0,
    pendingOnCC: 0,
    closed: 0,
    valid: 0,
    invalid: 0,
    sr: 0,
  });
  const [trendData, setTrendData] = useState<ComplaintTrend[]>([]);
  const [trendTopData, setTrendTopData] = useState<ComplaintType[]>([]);
  const [rangeType, setRangeType] = useState<"day" | "week" | "month">("day");
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingTopTypes, setLoadingTopTypes] = useState(false);

  // 🗓️ Date range states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [storeComplaints, setStoreComplaints] = useState<StoreHighComplaints[]>([]);
  const [loadingStoreComplaints, setLoadingStoreComplaints] = useState(false);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [loadingChannelWise, setLoadingChannelWise] = useState(false);
  const [sourceData, setSourceData] = useState<{ source: string; totalComplaints: number }[]>([]);
  const [loadingSourceWise, setLoadingSourceWise] = useState(false);

  //   // ✅ Fetch Summary
  //   useEffect(() => {
  //     const fetchSummary = async () => {
  //       try {
  //         const res = await getComplaintSummary();
  //         if (res.data) {
  //           setStats({
  //             totalComplaints: res.data.total ?? 0,
  //             pendingOnBranch: res.data.pendingBranch ?? 0,
  //             pendingOnCC: res.data.pendingCC ?? 0,
  //             closed: res.data.closed ?? 0,
  //           });
  //         }
  //       } catch (error) {
  //         console.error("Error fetching complaint summary", error);
  //       }
  //     };
  //     fetchSummary();
  //   }, []);


  useEffect(() => {

    const loadFilterAccess = async () => {
      try {
        const res = await getDashboardFilterAccess();
        if (res.data) {
          setCanViewRegion(res.data.canViewRegion);
          setCanViewBranch(res.data.canViewBranch);

          // Load regions if allowed
          if (res.data.canViewRegion) {
            const regionRes = await getRegionsForDashboard();
            if (regionRes.data) {
              setRegions(regionRes.data);
            }
          }

          // Load branches if allowed (for preselection or region change)
          if (res.data.canViewBranch) {
            const branchRes = await getBranchesForDashboard(res.data.defaultRegionId);
            if (branchRes.data) {
              setBranches(branchRes.data);
            }

            if (res.data.defaultRegionId) setSelectedRegion(res.data.defaultRegionId);
            if (res.data.defaultBranchId) setSelectedBranch(res.data.defaultBranchId);
          }
        }
      } catch (error) {
        console.error("Error fetching filter access:", error);
      }
    };

    loadFilterAccess();


    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const defaultStart = sevenDaysAgo.toISOString().slice(0, 16);
    const defaultEnd = today.toISOString().slice(0, 16);

    setStartDate(defaultStart);
    setEndDate(defaultEnd);

    // Fetch summary + charts once defaults are ready
    setTimeout(() => {
      fetchSummary(defaultStart, defaultEnd);
      fetchTrend("day");
      fetchTopComplaintTypes();
      fetchStoreWiseComplaints(defaultStart, defaultEnd);
      fetchChannelWise(defaultStart, defaultEnd);
      fetchSourceWiseComplaints(defaultStart, defaultEnd);
    }, 200);

  }, []);

  const fetchChannelWise = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null
  ) => {
    try {
      setLoadingChannelWise(true);
      const res = await getComplaintChannelWise(
        start,
        end,
        regionId ?? selectedRegion,
        branchId ?? selectedBranch
      );

      if (Array.isArray(res)) setChannelData(res);
      else setChannelData([]);
    } catch (error) {
      console.error("Error loading channel-wise complaints:", error);
    } finally {
      setLoadingChannelWise(false);
    }
  };


  // 🧩 Fetch Source Wise Data
  const fetchSourceWiseComplaints = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null
  ) => {
    setLoadingSourceWise(true);
    try {
      const res = await getComplaintSourceWise(
        start ?? startDate,
        end ?? endDate,
        regionId ?? selectedRegion,
        branchId ?? selectedBranch
      );

      if (Array.isArray(res)) {
        setSourceData(
          res.map((item: any) => ({
            source: item.complaintSource || "Unknown",
            totalComplaints: item.totalComplaints || 0,
          }))
        );
      } else {
        setSourceData([]);
      }
    } catch (error) {
      console.error("Error fetching source-wise complaints:", error);
    } finally {
      setLoadingSourceWise(false);
    }
  };

  // ✅ Fetch Complaint Summary
  const fetchSummary = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null
  ) => {
    try {
      const res = await getComplaintSummary(
        start,
        end,
        regionId ?? selectedRegion,
        branchId ?? selectedBranch
      );

      if (res.data) {
        setStats({
          totalComplaints: res.data.total ?? 0,
          pendingOnBranch: res.data.pendingBranch ?? 0,
          pendingOnCC: res.data.pendingCC ?? 0,
          closed: res.data.closed ?? 0,
          valid: res.data.valid ?? 0,
          invalid: res.data.invalid ?? 0,
          sr: res.data.sr ?? 0,
        });
      }
    } catch (error) {
      console.error("Error fetching complaint summary", error);
    }
  };

  const getCategoryGradient = (category: string): string => {
    switch (category.toLowerCase()) {
      case "sos":
        return "from-[#ffe5e5] to-[#ffb3b3]"; // light red gradient
      case "accuracy":
        return "from-[#fff7cc] to-[#f9e17a]"; // yellow gradient
      case "product quality":
        return "from-[#ffe6f0] to-[#ffc1d6]"; // soft pink gradient
      case "hospitality":
        return "from-[#e1f5fe] to-[#b3e5fc]"; // blue gradient
      case "others":
        return "from-[#f3e8ff] to-[#e9d5ff]"; // purple gradient
      default:
        return "from-gray-100 to-gray-200"; // fallback neutral
    }
  };


  // ✅ Fetch Complaint Trend
  const fetchTrend = async (
    type: "day" | "week" | "month",
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null
  ) => {
    setLoadingTrend(true);
    try {
      const res = await getComplaintTrend(
        type,
        start,
        end,
        regionId ?? selectedRegion,
        branchId ?? selectedBranch
      );

      if (Array.isArray(res.data)) {
        setTrendData(res.data);
      } else {
        setTrendData([]);
      }
    } catch (error) {
      console.error("Error fetching complaint trend", error);
    } finally {
      setLoadingTrend(false);
    }
  };



  // ✅ Fetch Top Complaint Types
  const fetchTopComplaintTypes = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null
  ) => {
    setLoadingTopTypes(true);
    try {
      const res = await getTopComplaintTypes(
        start ?? startDate,
        end ?? endDate,
        regionId ?? selectedRegion,
        branchId ?? selectedBranch
      );

      if (Array.isArray(res.data)) {
        const formatted = res.data.map((item: any) => ({
          ComplaintCategory: item.complaintCategory,
          TotalComplaints: item.totalComplaints,
        }));
        setTrendTopData(formatted);
      } else {
        setTrendTopData([]);
      }
    } catch (error) {
      console.error("Error fetching top complaint types:", error);
    } finally {
      setLoadingTopTypes(false);
    }
  };


  const fetchStoreWiseComplaints = async (
    start?: string,
    end?: string,
    regionId?: number | null
  ) => {
    setLoadingStoreComplaints(true);
    try {
      const res = await getStoreWiseHighComplaints(
        start ?? startDate,
        end ?? endDate,
        regionId?.toString() ?? selectedRegion?.toString() ?? null
      );

      if (Array.isArray(res)) {
        setStoreComplaints(res);
      } else {
        setStoreComplaints([]);
      }
    } catch (error) {
      console.error("Error fetching store-wise complaints:", error);
      setStoreComplaints([]);
    } finally {
      setLoadingStoreComplaints(false);
    }
  };


  // 🔄 Unified fetch trigger when Apply clicked
  const handleApplyFilter = () => {
    // fetchSummary(startDate, endDate);
    // fetchTrend(rangeType, startDate, endDate);
    // fetchTopComplaintTypes();


    fetchSummary(startDate, endDate, selectedRegion, selectedBranch);
    fetchTrend(rangeType, startDate, endDate, selectedRegion, selectedBranch);
    fetchTopComplaintTypes(startDate, endDate, selectedRegion, selectedBranch);
    fetchStoreWiseComplaints(startDate, endDate, selectedRegion);
    fetchChannelWise(startDate, endDate, selectedRegion, selectedBranch);
    fetchSourceWiseComplaints(startDate, endDate, selectedRegion, selectedBranch);
  };

  // --- Chart setup (Complaint Trend)
  const chartData = {
    labels: trendData.map((d) => d.label),
    datasets: [
      {
        label: "Total Complaints",
        data: trendData.map((d) => d.totalComplaints),
        backgroundColor: "rgba(220, 38, 38, 0.8)", // KFC Red
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#555", font: { size: 12 } } },
      y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { color: "#555", font: { size: 12 } } },
    },
  };

  // --- Bar Chart setup (Top Complaint Types)
  const barChartData = {
    labels: trendTopData.map((d) => d.ComplaintCategory),
    datasets: [
      {
        label: "Total Complaints",
        data: trendTopData.map((d) => d.TotalComplaints),
        backgroundColor: "rgba(220, 38, 38, 0.8)",
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: "rgba(200,200,200,0.1)" }, ticks: { color: "#555" } },
      y: { ticks: { color: "#444" }, grid: { display: false } },
    },
  };

  // --- Cards configuration
  //   const cards = [
  //     { title: "Total Complaints", value: stats.totalComplaints, icon: MessageSquare },
  //     { title: "Pending on Branch", value: stats.pendingOnBranch, icon: Building2 },
  //     { title: "Pending on Call Center", value: stats.pendingOnCC, icon: PhoneCall },
  //     { title: "Closed Complaints", value: stats.closed, icon: CheckCircle },
  //   ];


  const cards = [
    { title: "Total Complaints", value: stats.totalComplaints, icon: MessageSquare },
    { title: "Pending on Branch", value: stats.pendingOnBranch, icon: Building2 },
    { title: "Pending on Call Center", value: stats.pendingOnCC, icon: PhoneCall },
    {
      title: "Closed Complaints", value: stats.closed, icon: CheckCircle,
      valid: stats.valid,
      invalid: stats.invalid,
      serviceRecovery: stats.sr
    },

  ];


  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      "Accuracy": "bg-yellow-100 text-yellow-700",
      "Cleanliness": "bg-green-100 text-green-700",
      "Comments": "bg-blue-100 text-blue-700",
      "Compliment": "bg-purple-100 text-purple-700",
      "DBD": "bg-orange-100 text-orange-700",
      "Hospitality": "bg-pink-100 text-pink-700",
      "Maintenance": "bg-gray-100 text-gray-700",
      "Others": "bg-slate-200 text-slate-700",
      "Product Quality": "bg-red-100 text-red-700",
      "Questions": "bg-cyan-100 text-cyan-700",
      "SOS": "bg-rose-100 text-rose-700 font-semibold",
      "Suggestions": "bg-indigo-100 text-indigo-700",
    };
    return colorMap[category] || "bg-gray-200 text-gray-700";
  };


  return (


    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      {/* <div>
        <h1 className="text-3xl font-bold text-gray-900">General Complaint Dashboard</h1>
      </div> */}

      {/* 🗓️ Date Filter Section */}
      {/* <div className="flex flex-wrap items-center gap-1 bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
        
        {(canViewRegion || canViewBranch) && (
    <div className="flex flex-wrap items-center gap-3 ">
    {canViewRegion && (
      <div className="flex items-center gap-2">
        <label className="text-gray-600 text-sm font-medium">Region:</label>
        <select
          value={selectedRegion ?? ""}
          onChange={(e) => {
            const regionId = parseInt(e.target.value);
            setSelectedRegion(regionId);
            // Reload branches when region changes
            getBranchesForDashboard(regionId).then((res) => {
              if (res.data) setBranches(res.data);
            });
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="">-- Select Region --</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
    )}

    {canViewBranch && (
      <div className="flex items-center gap-2">
        <label className="text-gray-600 text-sm font-medium">Branch:</label>
        <select
          value={selectedBranch ?? ""}
          onChange={(e) => setSelectedBranch(parseInt(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="">-- Select Branch --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
    )}
  </div>
)}
        
        <div className="flex items-center gap-2">
          <label className="text-gray-600 text-sm font-medium">Start Date:</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-600 text-sm font-medium">End Date:</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        
        <button
          onClick={handleApplyFilter}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm font-medium transition"
        >
          Apply Filter
        </button>
      </div> */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">

        {/* 🏙️ Region */}
        {canViewRegion && (
          <div className="flex items-center gap-2">
            <label className="text-gray-600 text-sm font-medium whitespace-nowrap">Region:</label>
            <select
              value={selectedRegion ?? ""}
              onChange={(e) => {
                const regionId = parseInt(e.target.value);
                setSelectedRegion(regionId);
                getBranchesForDashboard(regionId).then((res) => {
                  if (res.data) setBranches(res.data);
                });
              }}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">-- Select Region --</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 🏢 Branch */}
        {canViewBranch && (
          <div className="flex items-center gap-2">
            <label className="text-gray-600 text-sm font-medium whitespace-nowrap">Branch:</label>
            <select
              value={selectedBranch ?? ""}
              onChange={(e) => setSelectedBranch(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">-- Select Branch --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 🕒 Start Date */}
        <div className="flex items-center gap-2">
          <label className="text-gray-600 text-sm font-medium whitespace-nowrap">Start Date:</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>

        {/* 🕓 End Date */}
        <div className="flex items-center gap-2">
          <label className="text-gray-600 text-sm font-medium whitespace-nowrap">End Date:</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>

        {/* 🔘 Apply Filter — Full Row */}
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 flex justify-center mt-2">
          <button
            onClick={handleApplyFilter}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded text-sm font-semibold transition"
          >
            Apply Filter
          </button>
        </div>

      </div>





      {/* Summary Cards */}
   {/* 🧾 Summary Cards - Modern Glassy Style */}
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
  {cards.map((card, index) => {
    const Icon = card.icon;

    // 🎨 Gradient colors per card (you can tweak these)
    const gradients = [
      "from-[#fff5f5] to-[#ffe3e3]", // total
      "from-[#fff8e1] to-[#fff3cd]", // pending branch
      "from-[#e8f0ff] to-[#dde7ff]", // pending CC
      "from-[#e8ffef] to-[#c6f6d5]"  // closed
    ];

    // Corresponding text/icon colors
    const accentColors = ["#d9232e", "#eab308", "#2563eb", "#16a34a"];

    return (
      <div
        key={card.title}
        className={`relative rounded-3xl p-6 bg-gradient-to-br ${gradients[index]} border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-transform duration-300`}
      >
        {/* Icon circle */}
        <div
          className="absolute -top-4 right-4 p-3 rounded-full shadow-md"
          style={{
            backgroundColor: `${accentColors[index]}20`,
            color: accentColors[index],
          }}
        >
          <Icon className="h-6 w-6" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-600 tracking-wide">
          {card.title}
        </h3>

        {/* Value */}
        <h2
          className="text-4xl font-bold mt-3"
          style={{ color: accentColors[index] }}
        >
          <CountUp end={card.value} duration={1.5} separator="," />
        </h2>

        {/* 🟢 Sub-values only for Closed Complaints */}
        {card.title === "Closed Complaints" && (
          <div className="mt-3 flex justify-between text-xs text-gray-600 font-medium">
            <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              ✅ {card.valid}
            </span>
            <span className="flex items-center gap-1 text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
              ❌ {card.invalid}
            </span>
            <span className="flex items-center gap-1 text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              🔄 {card.serviceRecovery}
            </span>
          </div>
        )}

        {/* Footer line (always visible) */}
        <div
          className="h-1 mt-4 rounded-full"
          style={{ backgroundColor: `${accentColors[index]}40` }}
        ></div>
      </div>
    );
  })}
</div>






      {/* 📊 Complaint Trend + Top Complaint Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Complaint Trend */}
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">Complaint Trend</h3>


            <Select
              value={rangeType}
              onValueChange={(v: any) => {
                setRangeType(v);
                fetchTrend(v, startDate, endDate);
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
                tooltip: { shared: true, backgroundColor: "#fff", borderRadius: 8 },
                plotOptions: {
                  column: {
                    borderRadius: 6,
                    colorByPoint: true,
                    colors: ["#1ae29fff", "#06148dff", "#b81e26"],
                    dataLabels: {
                      enabled: true,
                      format: "{point.y}", // shows the count number
                      inside: false,       // places label *outside / on top* of the bar
                      style: {
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#333",     // dark text for visibility
                        textOutline: "none",
                      },
                    },
                  },
                },
                series: [
                  {
                    name: "Total Complaints",
                    data: trendData.map((d) => d.totalComplaints),
                  },
                ],
              }}
            />
          )}
        </div>

        {/* Top Complaint Categories */}
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Top Complaint Categories
            </h3>
            <button
              onClick={() => fetchTopComplaintTypes()}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
              title="Reload Chart"
            >
              ⟳
            </button>
          </div>

          {loadingTopTypes ? (
            <div className="flex justify-center items-center h-[280px]">
              <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
            </div>
          ) : trendTopData.length > 0 ? (
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: {
                  type: "column",
                  backgroundColor: "transparent",
                  height: 300,
                  options3d: {
                    enabled: true,
                    alpha: 10,
                    beta: 20,
                    depth: 50,
                    viewDistance: 30,
                  },
                },
                title: { text: "" },
                xAxis: {
                  categories: trendTopData.map((d) => d.ComplaintCategory),
                  labels: {
                    style: { color: "#555", fontSize: "11px", fontWeight: "500" },
                  },
                  gridLineWidth: 0,
                },
                yAxis: {
                  title: { text: "" },
                  gridLineColor: "rgba(0,0,0,0.05)",
                  labels: {
                    style: { color: "#777", fontSize: "10px" },
                  },
                },
                plotOptions: {
                  column: {
                    depth: 25,
                    borderRadius: 4,
                    colorByPoint: true,
                    colors: [
                      "#d9232e",
                      "#1941afff",
                      "#2abe0cff",
                      "#f87171",
                      "#eb8729ff",
                      "#facb4aff",
                    ],
                    dataLabels: {
                      enabled: true,
                      format: "{point.y}", // shows the count number
                      inside: false,       // places label *outside / on top* of the bar
                      style: {
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#333",     // dark text for visibility
                        textOutline: "none",
                      },
                    },
                  },

                },
                legend: { enabled: false },
                tooltip: {
                  backgroundColor: "#fff",
                  borderColor: "#d9232e",
                  borderRadius: 6,
                  shadow: true,
                  style: { fontSize: "12px" },
                  formatter: function () {
                    return `<b>${this.x}</b><br/>Complaints: <b>${this.y}</b>`;
                  },
                },
                series: [
                  {
                    name: "Complaints",
                    data: trendTopData.map((d) => d.TotalComplaints),
                  },
                ],
              }}
            />
          ) : (
            <p className="text-gray-400 text-sm text-center h-[280px] flex items-center justify-center">
              No data available
            </p>
          )}
        </div>


        {/* 📈 Complaint Channel Wise + SLA Breach Tracking */}


        {/* 📦 Complaint Channel Wise (3D Cylinder Chart) */}
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Complaints Channel Wise
            </h3>
            <button
              onClick={() => fetchChannelWise()}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
              title="Reload Chart"
            >
              ⟳
            </button>
          </div>

          {loadingChannelWise ? (
            <div className="flex justify-center items-center h-[280px]">
              <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
            </div>
          ) : channelData.length > 0 ? (
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: {
                  type: "cylinder",
                  backgroundColor: "transparent",
                  height: 300,
                  options3d: {
                    enabled: true,
                    alpha: 10,
                    beta: 15,
                    depth: 80,
                    viewDistance: 25,
                  },
                  animation: { duration: 1000 },
                },
                title: { text: "" },
                credits: { enabled: false },
                legend: { enabled: false },
                xAxis: {
                  categories: channelData.map((d) => d.complaintChannel),
                  labels: {
                    style: {
                      color: "#444",
                      fontWeight: "600",
                      fontSize: "12px",
                    },
                  },
                  gridLineColor: "rgba(0,0,0,0.05)",
                },
                yAxis: {
                  min: 0,
                  title: { text: "" },
                  gridLineColor: "rgba(0,0,0,0.05)",
                  labels: {
                    style: {
                      color: "#666",
                      fontSize: "11px",
                    },
                  },
                },
                tooltip: {
                  backgroundColor: "#fff",
                  borderColor: "#d9232e",
                  borderRadius: 8,
                  shadow: true,
                  useHTML: true,
                  formatter: function () {
                    return `
              <div style="padding:6px 10px">
                <strong style="color:#d9232e">${this.x}</strong><br/>
                Complaints: <b>${this.y}</b>
              </div>`;
                  },
                },
                plotOptions: {
                  series: {
                    depth: 40,
                    colorByPoint: true,
                    colors: [
                      "#bb1212ff", // Delivery
                      "#460ee0ff", // Takeaway
                      "#28960cff", // Dine-In
                      "#ec9025ff", // Online
                    ],
                    animation: { duration: 1200 },
                    dataLabels: {
                      enabled: true,
                      format: "{point.y}", // shows the count number
                      inside: false,       // places label *outside / on top* of the bar
                      style: {
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#333",     // dark text for visibility
                        textOutline: "none",
                      },
                    },
                  },
                  cylinder: {
                    depth: 60,
                    edgeWidth: 1,
                    colorByPoint: true,
                  },
                },
                series: [
                  {
                    name: "Complaints",
                    data: channelData.map((d) => d.totalComplaints),
                  },
                ],
              }}
            />
          ) : (
            <p className="text-gray-400 text-sm text-center h-[280px] flex items-center justify-center">
              No data available
            </p>
          )}
        </div>


        {/* 📊 Source Wise Complaints (3D Cylindrical) */}
        <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Complaints Source Wise
            </h3>
            <button
              onClick={() => fetchSourceWiseComplaints()}
              className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
              title="Reload Chart"
            >
              ⟳
            </button>
          </div>

          {loadingSourceWise ? (
            <div className="flex justify-center items-center h-[280px]">
              <Loader2 className="animate-spin text-[#d9232e] h-6 w-6" />
            </div>
          ) : sourceData.length > 0 ? (
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                chart: {
                  type: "column",
                  options3d: {
                    enabled: true,
                    alpha: 8,
                    beta: 12,
                    depth: 60,
                    viewDistance: 25,
                  },
                  backgroundColor: "transparent",
                  height: 320,
                },
                title: { text: "" },
                xAxis: {
                  categories: sourceData.map((d) => d.source),
                  labels: { style: { color: "#444", fontSize: "12px" } },
                },
                yAxis: {
                  title: { text: "" },
                  gridLineColor: "rgba(0, 0, 0, 0.05)",
                  labels: { style: { color: "#666", fontSize: "11px" } },
                },
                plotOptions: {
                  column: {
                    depth: 40,
                    borderRadius: 8,
                    colorByPoint: true,
                  },
                  series: {
                    animation: { duration: 1000 },
                    dataLabels: {
                      enabled: true,
                      format: "{point.y}",
                      style: { fontSize: "11px", fontWeight: "bold", color: "#333" },
                    },
                    states: {
                      hover: { brightness: 0.1 },
                    },
                  },
                },
                tooltip: {
                  shared: true,
                  backgroundColor: "#fff",
                  borderRadius: 6,
                  borderColor: "#e4002b",
                  style: { fontSize: "12px" },
                  pointFormat:
                    "<b style='color:#e4002b;'>{point.y}</b> Complaints via {point.category}",
                },
                legend: { enabled: false },
                colors: [
                  "#e4002b", // Call Centre - Red
                  "#ffb700", // Social Media - Yellow
                  "#2d89ef", // FoodPanda - Blue
                  "#6cc04a", // Web - Green
                  "#b51eff", // Mail - Purple
                ],
                series: [
                  {
                    name: "Complaints",
                    data: sourceData.map((d) => d.totalComplaints),
                  },
                ],
              }}
            />
          ) : (
            <p className="text-gray-400 text-sm text-center h-[280px] flex items-center justify-center">
              No data available
            </p>
          )}
        </div>







        {/* <Card className="rbg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
  <CardHeader>
      <div className="flex justify-between items-center mb-4 border-b pb-2">
     <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">High Ratio Complaint Branches</h3>
     </div>
  </CardHeader>

  <CardContent>
    {loadingStoreComplaints ? (
      <div className="flex justify-center items-center h-[200px]">
        <Loader2 className="animate-spin text-red-600 h-6 w-6" />
      </div>
    ) : storeComplaints.length === 0 ? (
      <p className="text-center text-gray-500 text-sm py-10">
        No data available for selected period.
      </p>
    ) : (
      <div className="overflow-x-auto max-h-[320px] border border-gray-200">
        <table className="min-w-full text-sm text-gray-700 border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Branch</th>
              <th className="px-3 py-2 text-left font-semibold">Region</th>
              <th className="px-3 py-2 text-center font-semibold">Total</th>
              <th className="px-3 py-2 text-left font-semibold">Top Categories</th>
            </tr>
          </thead>
          <tbody>
            {storeComplaints.map((store) => {
              // Pick top 3 complaint categories dynamically
              const topCats = Object.entries(store.categories)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <tr key={store.branchID} className="hover:bg-red-50 transition">
                  <td className="px-3 py-2 border-t font-medium text-gray-900">{store.branchName}</td>
                  <td className="px-3 py-2 border-t">{store.region}</td>
                  <td className="px-3 py-2 border-t text-center font-semibold text-red-600">
                    {store.totalComplaints}
                  </td>
                  <td className="px-3 py-2 border-t">
                    {topCats.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {topCats.map(([cat, count]) => (
                          <span
                            key={cat}
                           className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(cat)}`}
                          >
                            {cat}: {count}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No categories</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card> */}




      </div>



      {canViewBranch && (
        <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <CardHeader>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
                High Ratio Complaint Branches (Leaderboard)
              </h3>
              <button
                onClick={() => fetchStoreWiseComplaints()}
                className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
                title="Reload Chart"
              >
                ⟳
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {loadingStoreComplaints ? (
              <div className="flex justify-center items-center h-[200px]">
                <Loader2 className="animate-spin text-red-600 h-6 w-6" />
              </div>
            ) : storeComplaints.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-10">
                No data available for selected period.
              </p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const maxComplaints = Math.max(
                    ...storeComplaints.map((s) => s.totalComplaints)
                  );

                  return storeComplaints.slice(0, 10).map((store, index) => {
                    const topCats = Object.entries(store.categories)
                      .filter(([_, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);

                    const percentage = (store.totalComplaints / maxComplaints) * 100;

                    return (
                      <div
                        key={store.branchID}
                        className="relative p-3 rounded-md border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
                      >
                        {/* 🔴 Background progress bar */}
                        <div
                          className="absolute top-0 left-0 h-full rounded-md bg-gradient-to-r from-[#d9232e22] to-[#d9232e08] z-0 transition-[width] duration-700 ease-in-out"
                          style={{ width: `${percentage}%` }}
                        ></div>

                        {/* Content Row */}
                        <div className="relative z-10 flex items-center justify-between gap-2">
                          {/* Rank + Branch */}
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold ${index === 0
                                ? "bg-[#d9232e]"
                                : index === 1
                                  ? "bg-[#ef4444]"
                                  : index === 2
                                    ? "bg-[#f87171]"
                                    : "bg-gray-400"
                                }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm leading-tight">
                                {store.branchName}
                              </p>
                              <p className="text-[11px] text-gray-500">{store.region}</p>
                            </div>
                          </div>

                          {/* Categories */}
                          <div className="flex flex-wrap gap-1 justify-center max-w-[45%]">
                            {topCats.map(([cat, count]) => (
                              <span
                                key={cat}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm bg-gradient-to-r ${getCategoryGradient(
                                  cat
                                )} text-gray-800 border border-white/40`}
                              >
                                {cat}: {count}
                              </span>
                            ))}
                          </div>

                          {/* 🧾 Compact Total Complaints Box */}
                          <div className="flex flex-col items-end">
                            <div className="bg-gradient-to-r from-[#d9232e] to-[#a60f1a] text-white px-2.5 py-1 rounded-md shadow-sm">
                              <span className="text-sm font-bold tracking-wide">
                                {store.totalComplaints}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 mt-0.5">
                              Complaints
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <BackToTopButton />
              </div>

            )}
          </CardContent>
        </Card>)}




      {/* 🗺️ Store-wise Heatmap */}
      {/* <StoreWiseHeatmap
  startDate={startDate}
  endDate={endDate}
  regionId={selectedRegion ?? null}
/> */}
    </div>


  );
};

export default GeneralDashboard;
