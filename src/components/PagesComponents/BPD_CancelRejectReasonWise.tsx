import React, { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import { Loader2 } from "lucide-react";
import { GetCancelRejectOrdersReasonWise } from "@/services/api";

type Props = {
  startDate: string;
  endDate: string;
  regionId?: number | null;
  branchId?: number | null;
  refreshKey: number;
};

export default function BPD_CancelRejectReasonWise({
  startDate,
  endDate,
  regionId,
  branchId,
  refreshKey
}: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await GetCancelRejectOrdersReasonWise(startDate, endDate, regionId, branchId);
      setData(res || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    load();
  }, [refreshKey, startDate, endDate, regionId, branchId]);

  // ---------------------------------------------------
  // 🔥 TRANSFORM DATA (NEW LOGIC)
  // ---------------------------------------------------


  // Group by Type
   // 🔥 Step 1: Top 10 (optional but recommended)
const topData = [...data]
  .sort((a, b) => b.totalCount - a.totalCount)
  .slice(0, 10);

// 🔥 Step 2: Categories (Reasons)
const categories = topData.map(x => x.reason);

// 🔥 Step 3: Single series
const series = [
  {
    name: "Orders",
    type: "bar" as const,
    data: topData.map(x => x.totalCount)
  }
];



// // 🔥 Step 1: Sort only (no slice)
// const finalData = [...data].sort((a, b) => b.totalCount - a.totalCount);

// // 🔥 Step 2: Categories
// const categories = finalData.map(x => x.reason);

// // 🔥 Step 3: Series
// const series = [
//   {
//     name: "Orders",
//     type: "bar" as const,
//     data: finalData.map(x => x.totalCount)
//   }
// ];
// ---------------------------------------------------
// HIGHCHART OPTIONS (CLEAN VERSION)
// ---------------------------------------------------
const options: Highcharts.Options = {
  chart: {
    type: "bar",
    backgroundColor: "transparent",
    height: 400,
    
  },

  title: { text: "" },

  xAxis: {
    categories,
    labels: {
      style: {   fontSize: "10px"
    //   whiteSpace: "normal",
    //   width: 120 
    },
      formatter: function () {
        const text = this.value as string;
        return text.length > 30 ? text.substring(0, 30) + "..." : text;
        
      }
    }
  },

  yAxis: {
    title: { text: "Orders Count" }
  },

  plotOptions: {
    series: {
    //   borderRadius: 6,
      dataLabels: {
        enabled: true
      }
    }
  },

  colors: ["#d9232e"], // 🔥 KFC theme red

  tooltip: {
    pointFormat: "<b>{point.y}</b> Orders"
  },

  legend: { enabled: false },

  credits: { enabled: false },

  series
};

// const options: Highcharts.Options = {
//   chart: {
//     type: "column",
//     backgroundColor: "transparent",
//     height: 420,
//     options3d: {
//       enabled: true,
//       alpha: 10,
//       beta: 15,
//       depth: 60,
//       viewDistance: 25
//     }
//   },

//   title: { text: "" },

//   xAxis: {
//     categories,
//     labels: {
//       style: {
//         fontSize: "12px",
//         fontWeight: "500"
//       }
//     }
//   },

//   yAxis: {
//     title: { text: "Orders" },
//     gridLineDashStyle: "Dot"
//   },

//   plotOptions: {
//     column: {
//       depth: 35,
//       grouping: false,      // 🔥 space between bars
//       pointPadding: 0.2,
//       groupPadding: 0.3,
//       borderWidth: 0,
//       dataLabels: {
//         enabled: true,
//         style: {
//           fontSize: "12px",
//           fontWeight: "bold"
//         }
//       }
//     }
//   },

//   colors: [
//     "#36a2eb", // blue
//     "#6c5ce7", // purple
//     "#00c853", // green
//     "#ff7043", // orange
//     "#78909c"  // gray
//   ],

//   tooltip: {
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     pointFormat: "<b>{point.y}</b> Orders"
//   },

//   legend: { enabled: false },

//   credits: { enabled: false },

//   series: [
//     {
//       type: "column",
//       name: "Orders",
//       data: topData.map((x, i) => ({
//         name: x.reason,
//         y: x.totalCount,
//         colorIndex: i // 🔥 different color per bar
//       }))
//     }
//   ]
// };


  return (
    <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
          Cancel & Reject (Reason Wise)
        </h3>

        <button
          onClick={load}
          className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
          title="Reload Chart"
        >
          ⟳
        </button>
      </div>

      {loading ? (
        <div className="h-[300px] flex justify-center items-center">
          <Loader2 className="animate-spin text-red-600 w-8 h-8" />
        </div>
      ) : (
        <HighchartsReact highcharts={Highcharts} options={options} />
      )}
    </div>
  );
}