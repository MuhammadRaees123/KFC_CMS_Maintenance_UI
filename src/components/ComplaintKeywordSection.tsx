import { useEffect, useState, useRef } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { getComplaintKeywords } from "@/services/api";

type KeywordItem = {
  keyword: string;
  frequency: number;
  impactLevel: string;
};

export default function ComplaintKeywordSection({
  startDate,
  endDate,
  regionId,
  branchId,
  onKeywordClick
}: any) {

  const [data, setData] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Prevent duplicate API calls
  const lastArgs = useRef<string>("");
  const inFlight = useRef(false);

  const loadKeywords = async () => {

    if (inFlight.current) return;   // 🚫 block duplicate
    inFlight.current = true;

    console.log("🚀 API CALL START");

    setLoading(true);
    try {
      const result = await getComplaintKeywords(startDate, endDate, regionId, branchId);
      setData(result || []);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  };

  useEffect(() => {

    console.log("✅ Keyword useEffect triggered with:", {
      startDate,
      endDate,
      regionId,
      branchId
    });

    // 🚫 Block empty calls
    if (!startDate || !endDate) return;

    const key = `${startDate}|${endDate}|${regionId}|${branchId}`;

    // 🚫 Same filters → no repeat call
    if (lastArgs.current === key) {
      console.warn("⛔ Duplicate BLOCKED:", key);
      return;
    }

    lastArgs.current = key;
    loadKeywords();

  }, [startDate, endDate, regionId, branchId]);


  return (
    <div className="bg-white shadow-md p-6 border">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase flex items-center gap-2">
          <AlertTriangle className="text-red-500" size={18} />
          Complaint Keyword Analyzer
        </h3>
        <button
          onClick={() => {
            lastArgs.current = "";    // allow manual refresh
            loadKeywords();
          }}
          className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
          title="Reload Chart"
        >
          ⟳
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-red-500" size={32} />
        </div>
      ) : data.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No complaint keywords found
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

          {data.map((item, i) => {

            const percent = Math.min((item.frequency / data[0].frequency) * 100, 100);

            const getImpact = () => {
              if (item.impactLevel === "High") return {
                badge: "bg-red-500",
                bar: "from-red-500 to-red-600",
                glow: "shadow-red-400/60"
              };
              if (item.impactLevel === "Medium") return {
                badge: "bg-yellow-400 text-black",
                bar: "from-yellow-400 to-orange-400",
                glow: "shadow-yellow-300/60"
              };
              return {
                badge: "bg-green-500",
                bar: "from-green-400 to-green-600",
                glow: "shadow-green-400/60"
              };
            };

            const theme = getImpact();

            return (
              <div
                key={i}
                onClick={() => onKeywordClick(item.keyword)}
                className={`relative bg-white rounded-2xl border p-4 shadow hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer ${theme.glow}`}
              >

                {/* STATUS BADGE */}
                <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full text-white ${theme.badge}`}>
                  {item.impactLevel}
                </span>

                {/* TITLE */}
                <div className="font-semibold text-sm text-gray-700 uppercase">
                  {item.keyword}
                </div>

                {/* PROGRESS */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${theme.bar} transition-all`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs mt-1 text-gray-500">
                    <span>Contribution</span>
                    <span>{percent.toFixed(1)}%</span>
                  </div>
                </div>

                {/* FOOTER METRICS */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-gray-500">Complaints</div>
                  <div className="bg-gray-100 rounded-full px-3 py-1 font-bold text-sm shadow-inner">
                    {item.frequency}
                  </div>
                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}
