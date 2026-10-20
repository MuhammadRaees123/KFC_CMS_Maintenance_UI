import Highcharts from "highcharts";
import HighchartsMoreImport from "highcharts/highcharts-more";
import SolidGaugeImport from "highcharts/modules/solid-gauge";
import Highcharts3D from "highcharts/highcharts-3d";
import Cylinder from "highcharts/modules/cylinder";
import exporting from "highcharts/modules/exporting";
import FunnelModule from "highcharts/modules/funnel";

import SankeyModule from "highcharts/modules/sankey";

const SankeyMod =
  typeof SankeyModule === "function"
    ? SankeyModule
    : (SankeyModule as any).default;

if (typeof SankeyMod === "function") {
  SankeyMod(Highcharts);
}


// Normalize Cylinder
const cylinder =
  typeof Cylinder === "function" ? Cylinder : (Cylinder as any).default;

// Normalize Funnel module
const FunnelMod =
  typeof FunnelModule === "function"
    ? FunnelModule
    : (FunnelModule as any).default;

// Normalize More module
const HighchartsMore =
  typeof HighchartsMoreImport === "function"
    ? HighchartsMoreImport
    : (HighchartsMoreImport as any).default;

// Normalize SolidGauge
const SolidGauge =
  typeof SolidGaugeImport === "function"
    ? SolidGaugeImport
    : (SolidGaugeImport as any).default;

// Normalize 3D
const hg =
  typeof Highcharts3D === "function"
    ? Highcharts3D
    : (Highcharts3D as any).default;

// Normalize exporting
const exp =
  typeof exporting === "function"
    ? exporting
    : (exporting as any).default;

// Initialize modules
if (typeof HighchartsMore === "function") HighchartsMore(Highcharts);
if (typeof SolidGauge === "function") SolidGauge(Highcharts);
if (typeof hg === "function") hg(Highcharts);
if (typeof cylinder === "function") cylinder(Highcharts);

if (typeof exp === "function") {
  exp(Highcharts); // ✅ FIXED
}

if (typeof FunnelMod === "function") {
  FunnelMod(Highcharts); // ✅ Funnel activated
}

export default Highcharts;
