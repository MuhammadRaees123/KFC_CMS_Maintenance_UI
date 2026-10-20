import React from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../config/highchartsSetup";



export function Channel3DChart({ branch }: { branch: any }) {

  const data = [
    { name: "Food Panda", y: Number(branch.foodPanda || 0), color: "#00c853" },
    { name: "Web / App", y: Number(branch.webApp || 0), color: "#2979ff" },
    { name: "Call Center", y: Number(branch.callCenter || 0), color: "#ff9100" }
  ];

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={{
        chart: {
          type: "column",
          height: 320,
          options3d: {
            enabled: true,
            alpha: 15,
            beta: 20,
            depth: 60,
            viewDistance: 25
          }
        },

        title: {
          text: `Channel Mix — ${branch.branchName}`,
          style: { fontSize: "13px", fontWeight: "bold" }
        },

        xAxis: {
          categories: data.map(x => x.name)
        },

        yAxis: {
          title: { text: "Orders" }
        },

        tooltip: {
          pointFormat: "<b>{point.y}</b> orders"
        },

        plotOptions: {
          column: {
            depth: 30,
            dataLabels: {
              enabled: true
            }
          }
        },

        series: [
          {
            name: "Orders",
            data
          }
        ]
      }}
    />
  );
}
