import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getStoreWiseComplaintsHeatmap } from "@/services/api";

// --- Types
interface HeatmapPoint {
  branchID: number;
  branchName: string;
  regionName: string;
  latitude: number;
  longitude: number;
  totalComplaints: number;
}

interface Props {
  startDate?: string;
  endDate?: string;
  regionId?: number | null;
}

/* 🧩 Heat layer with dynamic map fitting */
const HeatLayer: React.FC<{ points: HeatmapPoint[] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Clear previous heat layers before re-render
   // 🧹 Clear previous heat layers (type-safe)
map.eachLayer((layer: any) => {
  if ((layer as any)._latlngs && typeof (layer as any).addLatLng === "function") {
    map.removeLayer(layer);
  }
});


    if (points.length === 0) {
      // Fallback view to Pakistan center if no data
      map.setView([30.3753, 69.3451], 6);
      return;
    }

    // Prepare heat data
    const heatData = points.map((p) => [
      p.latitude,
      p.longitude,
      Math.min(p.totalComplaints / 100, 1),
    ]);

    // Add heat layer
    const heat = (L as any).heatLayer(heatData, {
      radius: 30,
      blur: 25,
      maxZoom: 10,
      gradient: {
        0.1: "#fee2e2",
        0.4: "#f87171",
        0.7: "#dc2626",
        1.0: "#7f1d1d",
      },
    }).addTo(map);

    // Fit bounds to data
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]) as [number, number][]);

    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [50, 50], duration: 2 }); // smooth zoom animation
    } else {
      map.setView([30.3753, 69.3451], 6);
    }

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
};

// --- Main Heatmap Component
const StoreWiseHeatmap: React.FC<Props> = ({ startDate, endDate, regionId }) => {
  const [data, setData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const mapCenter: LatLngExpression = [30.3753, 69.3451]; // Pakistan center

  const fetchData = async (start?: string, end?: string, region?: number | null) => {
    setLoading(true);
    try {
      const res = await getStoreWiseComplaintsHeatmap(start, end, region);
      if (Array.isArray(res.data)) setData(res.data);
      else setData([]);
    } catch (err) {
      console.error("Error fetching heatmap data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Default Load (Last 7 Days)
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const defaultStart = sevenDaysAgo.toISOString();
    const defaultEnd = today.toISOString();

    fetchData(defaultStart, defaultEnd, null);
  }, []);

  // 🔁 Refresh on Filter Change
  useEffect(() => {
    if (startDate && endDate) {
      fetchData(startDate, endDate, regionId ?? null);
    }
  }, [startDate, endDate, regionId]);

  return (
    <Card className="border border-gray-100 shadow-sm mt-4">
      <CardHeader>
        <CardTitle className="text-red-600 text-lg font-semibold">
          Store-Wise Complaint Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <Loader2 className="animate-spin text-red-600 h-6 w-6" />
          </div>
        ) : (
          <div className="h-[500px] w-full rounded-lg overflow-hidden shadow-inner">
            <MapContainer
              center={mapCenter}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <HeatLayer points={data} />
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StoreWiseHeatmap;
