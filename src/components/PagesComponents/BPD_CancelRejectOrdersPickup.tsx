import React, { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "@/config/highchartsSetup";
import { Loader2 } from "lucide-react";
import { GetCancelRejectOrders } from "@/services/api";

type Props = {
  startDate: string;
  endDate: string;
  regionId?: number | null;
  branchId?: number | null;
  refreshKey: number;
};

export default function BPD_CancelRejectOrdersPickup({
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
      const res = await GetCancelRejectOrders(startDate, endDate, regionId, branchId);
      setData(res || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    load();
  }, [refreshKey, startDate, endDate, regionId, branchId]);

  // ---------------------------------------------
  // PREPARE CHART DATA
  // API returns 1 row only:
  // { deliveryCancelCount, deliveryRejectCount }
  // ---------------------------------------------

  const row = data[0] || {};

  const categories = ["Cancel Orders", "Reject Orders", "Re-Orders"];

  const seriesData = [
    row.pickupCancelCount || 0,
    row.pickupRejectCount || 0,
    row.reorderPickupCount || 0
  ];

  // ---------------------------------------------
  // HIGHCHART OPTIONS
  // ---------------------------------------------
  const options: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      options3d: {
        enabled: true,
        alpha: 10,
        beta: 15,
        depth: 80,
        viewDistance: 25
      }
    },

    title: { text: "" },

    xAxis: {
      categories,
      labels: {
        style: { fontSize: "12px", fontWeight: "bold" }
      }
    },

    yAxis: {
      title: { text: "Orders Count" }
    },

    plotOptions: {
      column: {
        depth: 40,
        colorByPoint: true,
        dataLabels: {
          enabled: true,
          style: { fontSize: "12px", fontWeight: "bold" }
        }
      }
    },

    series: [
      {
        type: "column",
        name: "Orders",
        data: seriesData
      }
    ],

    legend: { enabled: false },

    tooltip: {
      backgroundColor: "#fff",
      borderRadius: 10,
      pointFormat: "<b>{point.y}</b> Orders"
    },

    credits: { enabled: false }
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all border border-gray-100 p-5">

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
          Cancel & Reject (PICKUP ONLY)
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
