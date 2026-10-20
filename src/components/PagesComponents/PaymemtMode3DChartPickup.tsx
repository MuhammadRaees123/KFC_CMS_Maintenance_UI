import React, { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import { Loader2 } from "lucide-react";
import { getPaymentModeOrders,getPaymentModeOrdersPickup } from "@/services/api";



type Props = {
  startDate: string;
  endDate: string;
  regionId?: number | null;
  branchId?: number | null;
  refreshKey: number;   // ✅ ADD THIS
};

export default function PaymentMode3DChart({
  startDate,
  endDate,
  regionId,
  branchId,
  refreshKey
}: Props) {

  const [data, setData] = useState<any[]>([]);
  const [dataP, setDataPickup] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await getPaymentModeOrders(startDate, endDate, regionId, branchId);
//       setData(res || []);
//     } finally {
//       setLoading(false);
//     }
//   };



   const loadPickup = async () => {
    setLoading(true);
    try {
      const res = await getPaymentModeOrdersPickup(startDate, endDate, regionId, branchId);
      setDataPickup(res || []);
    } finally {
      setLoading(false);
    }
  };
//   useEffect(() => {
//     if (!startDate || !endDate) return;
//     load();
//   }, [startDate, endDate, regionId, branchId]);


useEffect(() => {
  console.log("Chart refresh", refreshKey, startDate, endDate, regionId, branchId);
  if (!startDate || !endDate) return;
 // load();
  loadPickup();
}, [refreshKey, startDate, endDate, regionId, branchId]); 

  // Prepare chart
  const modesP = dataP.map(x => x.paymentMode);
  const countsP = dataP.map(x => x.ordersCount);

  const optionsP: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      options3d: {
        enabled: true,
        alpha: 10,
        beta: 18,
        depth: 80,
        viewDistance: 25
      }
    },

    title: { text: "" },

    xAxis: {
      categories: modesP,
      labels: {
        style: { fontSize: "11px", fontWeight: "bold" }
      }
    },

    yAxis: {
      title: { text: "Orders" }
    },

    plotOptions: {
      column: {
        depth: 30,
        borderWidth: 0,
        dataLabels: {
          enabled: true
        }
      }
    },

    series: [
      {
        type: "column",
        name: "Orders",
        data: countsP,
        colorByPoint: true
      }
    ],

    legend: { enabled: false },

    tooltip: {
      backgroundColor: "#fff",
      borderRadius: 10,
      pointFormat:
        "<b>{point.y}</b> Orders<br/>Contribution: <b>{point.percentage:.1f}%</b>"
    },

    credits: { enabled: false }
  };



  // Prepare chart
  const modes = data.map(x => x.paymentMode);
  const counts = data.map(x => x.ordersCount);

  const options: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      options3d: {
        enabled: true,
        alpha: 10,
        beta: 18,
        depth: 80,
        viewDistance: 25
      }
    },

    title: { text: "" },

    xAxis: {
      categories: modes,
      labels: {
        style: { fontSize: "11px", fontWeight: "bold" }
      }
    },

    yAxis: {
      title: { text: "Orders" }
    },

    plotOptions: {
      column: {
        depth: 30,
        borderWidth: 0,
        dataLabels: {
          enabled: true
        }
      }
    },

    series: [
      {
        type: "column",
        name: "Orders",
        data: counts,
        colorByPoint: true
      }
    ],

    legend: { enabled: false },

    tooltip: {
      backgroundColor: "#fff",
      borderRadius: 10,
      pointFormat:
        "<b>{point.y}</b> Orders<br/>Contribution: <b>{point.percentage:.1f}%</b>"
    },

    credits: { enabled: false }
  };






  return (
      <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">

        <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
              Payment Mode Wise Orders (Pickup Only)
            </h3>
          

        <button
          onClick={loadPickup}
          className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
              title="Reload Chart">
          ⟳
        </button>
      </div>

      {loading ? (
        <div className="h-[300px] flex justify-center items-center">
          <Loader2 className="animate-spin text-red-600 w-8 h-8" />
        </div>
      ) : (
        <HighchartsReact highcharts={Highcharts} options={optionsP} />
      )}

    </div>
  );
}
