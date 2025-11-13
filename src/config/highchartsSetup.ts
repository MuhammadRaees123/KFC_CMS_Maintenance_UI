import Highcharts from "highcharts";
import HighchartsMoreImport from "highcharts/highcharts-more";
import SolidGaugeImport from "highcharts/modules/solid-gauge";
import Highcharts3D from "highcharts/highcharts-3d";
import Cylinder from "highcharts/modules/cylinder";

const cylinder =
  typeof Cylinder === "function" ? Cylinder : (Cylinder as any).default;

if (typeof cylinder === "function") {
  cylinder(Highcharts);
}

// ✅ Normalize both CommonJS and ESM styles
const HighchartsMore =
  typeof HighchartsMoreImport === "function"
    ? HighchartsMoreImport
    : (HighchartsMoreImport as any).default;

const SolidGauge =
  typeof SolidGaugeImport === "function"
    ? SolidGaugeImport
    : (SolidGaugeImport as any).default;

const hg =
  typeof Highcharts3D === "function"
    ? Highcharts3D
    : (Highcharts3D as any).default;


// ✅ Initialize modules safely
if (typeof HighchartsMore === "function") {
  HighchartsMore(Highcharts);
}
if (typeof SolidGauge === "function") {
  SolidGauge(Highcharts);
}

if (typeof hg === "function") {
  hg(Highcharts);
}


export default Highcharts;
