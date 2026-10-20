import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import React from "react";

type KeywordItem = {
  Keyword: string;
  Frequency: number;
  ImpactLevel: string;
};

type Props = {
  data: KeywordItem[];
};

// ✅ Impact Colors
const impactColor = (level: string) => {
  if (level === "High") return "#e53935";
  if (level === "Medium") return "#fb8c00";
  return "#1eb980";
};

const getDonutOptions = (title: string, percent: number, color: string) => ({
  chart: {
    type: "pie",
    height: 200,
    backgroundColor: "transparent",
    events: {
      load: function () {
        const chart = this;
        const centerX = chart.plotWidth / 2 + chart.plotLeft;
        const centerY = chart.plotHeight / 2 + chart.plotTop;

        if (!chart.customLabel) {
          chart.customLabel = chart.renderer
            .text(`<b>${percent.toFixed(1)}%</b>`, centerX, centerY)
            .css({
              fontSize: "18px",
              color: color,
              textAnchor: "middle",
              fontWeight: "bold"
            })
            .add();
        }
      }
    }
  },

  title: { text: "" },

  tooltip: {
    pointFormat: "<b>{point.y}%</b>",
  },

  plotOptions: {
    pie: {
      startAngle: -90,
      endAngle: 90,
      innerSize: "80%",
      center: ["50%", "65%"],
      borderWidth: 0,
      dataLabels: { enabled: false },
      states: {
        hover: {
          enabled: false
        }
      }
    }
  },

  series: [{
    type: "pie",
    name: title,
    data: [
      {
        y: percent,
        color: {
          linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
          stops: [
            [0, color],
            [1, "#eee"]
          ]
        }
      },
      {
        y: 100 - percent,
        color: "#f3f3f3"
      }
    ]
  }],

  credits: { enabled: false }
});


export default function ComplaintKeywordDonuts({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.Frequency, 0);

  return (
    <div className="donut-grid">
      {data.map((item, index) => {
        const percent = (item.Frequency / total) * 100;
        const color = impactColor(item.ImpactLevel);

        return (
          <div className="donut-card" key={index}>
            <div className="card-header">
              <span className="keyword">{item.Keyword.toUpperCase()}</span>
              <span
                className={`badge ${item.ImpactLevel.toLowerCase()}`}
                title="Impact Level"
              >
                {item.ImpactLevel}
              </span>
            </div>

            <HighchartsReact
              highcharts={Highcharts}
              options={getDonutOptions(item.Keyword, percent, color)}
            />

            <div className="freq">
              {item.Frequency.toLocaleString()} complaints
            </div>
          </div>
        );
      })}
    </div>
  );
}
