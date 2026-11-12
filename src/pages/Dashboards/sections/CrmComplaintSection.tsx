import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  MessageSquare,
  Building2,
  PhoneCall,
  CheckCircle,
  Loader2,
  ArrowUp,
} from "lucide-react";
import {
  getComplaintSummary,
  getDashboardFilterAccess,
  getRegionsForDashboard,
  getBranchesForDashboard,
  StoreHighComplaints,
  getStoreWiseHighComplaints,
} from "@/services/api";
import CountUp from "react-countup";
import DashboardFilters from "@/components/DashboardFilters";
import DashboardSectionHeader from "../shared/DashboardSectionHeader";

export type CrmComplaintSectionProps = {
  refreshKey?: number;
  embedded?: boolean;
};

interface ComplaintStats {
  totalComplaints: number;
  pendingOnBranch: number;
  pendingOnCC: number;
  closed: number;
  valid?: number;
  invalid?: number;
  sr?: number;
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

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 bg-[#d9232e] text-white p-3 rounded-full shadow-lg hover:bg-[#b71c1c] transition-all duration-300"
      title="Back to Top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};

const CrmComplaintSection: React.FC<CrmComplaintSectionProps> = ({
  refreshKey: externalRefreshKey = 0,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<ComplaintStats>({
    totalComplaints: 0,
    pendingOnBranch: 0,
    pendingOnCC: 0,
    closed: 0,
    valid: 0,
    invalid: 0,
    sr: 0,
  });

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [storeComplaints, setStoreComplaints] = useState<StoreHighComplaints[]>(
    [],
  );
  const [loadingStoreComplaints, setLoadingStoreComplaints] = useState(false);

  useEffect(() => {
    const loadFilterAccess = async () => {
      try {
        const res = await getDashboardFilterAccess();
        if (res.data) {
          setCanViewRegion(res.data.canViewRegion);
          setCanViewBranch(res.data.canViewBranch);

          if (res.data.canViewRegion) {
            const regionRes = await getRegionsForDashboard();
            if (regionRes.data) setRegions(regionRes.data);
          }

          if (res.data.canViewBranch) {
            const branchRes = await getBranchesForDashboard(
              res.data.defaultRegionId,
            );
            if (branchRes.data) setBranches(branchRes.data);

            if (res.data.defaultRegionId)
              setSelectedRegion(res.data.defaultRegionId);
            if (res.data.defaultBranchId)
              setSelectedBranch(res.data.defaultBranchId);
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

    setStartDate(sevenDaysAgo.toISOString().slice(0, 16));
    setEndDate(today.toISOString().slice(0, 16));

    setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 100);
  }, []);

  useEffect(() => {
    if (externalRefreshKey > 0) {
      setRefreshKey((k) => k + 1);
    }
  }, [externalRefreshKey]);

  const fetchSummary = async (
    start?: string,
    end?: string,
    regionId?: number | null,
    branchId?: number | null,
  ) => {
    try {
      const res = await getComplaintSummary(
        start,
        end,
        regionId ?? selectedRegion,
        branchId ?? selectedBranch,
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

  const fetchStoreWiseComplaints = async (
    start?: string,
    end?: string,
    regionId?: number | null,
  ) => {
    setLoadingStoreComplaints(true);
    try {
      const res = await getStoreWiseHighComplaints(
        start ?? startDate,
        end ?? endDate,
        regionId?.toString() ?? selectedRegion?.toString() ?? null,
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

  useEffect(() => {
    if (!startDate || !endDate) return;

    fetchSummary(startDate, endDate);
    fetchStoreWiseComplaints(startDate, endDate);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const getCategoryGradient = (category: string): string => {
    switch (category.toLowerCase()) {
      case "sos":
        return "from-[#ffe5e5] to-[#ffb3b3]";
      case "accuracy":
        return "from-[#fff7cc] to-[#f9e17a]";
      case "product quality":
        return "from-[#ffe6f0] to-[#ffc1d6]";
      case "hospitality":
        return "from-[#e1f5fe] to-[#b3e5fc]";
      case "others":
        return "from-[#f3e8ff] to-[#e9d5ff]";
      default:
        return "from-gray-100 to-gray-200";
    }
  };

  const cards = [
    {
      title: "Total Complaints",
      value: stats.totalComplaints,
      icon: MessageSquare,
    },
    {
      title: "Pending on Branch",
      value: stats.pendingOnBranch,
      icon: Building2,
    },
    {
      title: "Pending on Call Center",
      value: stats.pendingOnCC,
      icon: PhoneCall,
    },
    {
      title: "Closed Complaints",
      value: stats.closed,
      icon: CheckCircle,
      valid: stats.valid,
      invalid: stats.invalid,
      serviceRecovery: stats.sr,
    },
  ];

  const gradients = [
    "from-[#fff5f5] to-[#ffe3e3]",
    "from-[#fff8e1] to-[#fff3cd]",
    "from-[#e8f0ff] to-[#dde7ff]",
    "from-[#e8ffef] to-[#c6f6d5]",
  ];
  const accentColors = ["#d9232e", "#eab308", "#2563eb", "#16a34a"];

  return (
    <div className="space-y-6 animate-fadeIn">
      <DashboardSectionHeader
        title="CRM Complaint Analytics"
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

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
          setRefreshKey((k) => k + 1);
        }}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`relative rounded-3xl p-6 bg-gradient-to-br ${gradients[index]} border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-transform duration-300`}
            >
              <div
                className="absolute -top-4 right-4 p-3 rounded-full shadow-md"
                style={{
                  backgroundColor: `${accentColors[index]}20`,
                  color: accentColors[index],
                }}
              >
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="text-sm font-semibold text-gray-600 tracking-wide">
                {card.title}
              </h3>

              <h2
                className="text-4xl font-bold mt-3"
                style={{ color: accentColors[index] }}
              >
                <CountUp end={card.value} duration={1.5} separator="," />
              </h2>

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

              <div
                className="h-1 mt-4 rounded-full"
                style={{ backgroundColor: `${accentColors[index]}40` }}
              />
            </div>
          );
        })}
      </div>

      {canViewBranch && storeComplaints.length > 0 && (
        <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">
          <CardHeader>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
                High Ratio Complaint Branches (Leaderboard)
              </h3>
              <button
                onClick={() => fetchStoreWiseComplaints()}
                className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
                title="Reload"
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
            ) : (
              <div className="space-y-2">
                {(() => {
                  const maxComplaints = Math.max(
                    ...storeComplaints.map((s) => s.totalComplaints),
                  );

                  return storeComplaints.slice(0, 10).map((store, index) => {
                    const topCats = Object.entries(store.categories)
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);

                    const percentage =
                      maxComplaints > 0
                        ? (store.totalComplaints / maxComplaints) * 100
                        : 0;

                    return (
                      <div
                        key={store.branchID}
                        className="relative p-3 rounded-md border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
                      >
                        <div
                          className="absolute top-0 left-0 h-full rounded-md bg-gradient-to-r from-[#d9232e22] to-[#d9232e08] z-0 transition-[width] duration-700 ease-in-out"
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold ${
                                index === 0
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
                              <p className="text-[11px] text-gray-500">
                                {store.region}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 justify-center max-w-[45%]">
                            {topCats.map(([cat, count]) => (
                              <span
                                key={cat}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm bg-gradient-to-r ${getCategoryGradient(
                                  cat,
                                )} text-gray-800 border border-white/40`}
                              >
                                {cat}: {count}
                              </span>
                            ))}
                          </div>

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
        </Card>
      )}
    </div>
  );
};

export default CrmComplaintSection;
