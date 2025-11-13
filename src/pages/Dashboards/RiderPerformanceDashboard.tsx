import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const RiderPerformanceDashboard = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900">Rider Performance Dashboard</h1>
      <p className="text-gray-500">Track rider complaints, timeliness, and feedback trends.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Top Complained Riders</CardTitle></CardHeader>
          <CardContent>📋 List / chart placeholder</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rider Timeliness</CardTitle></CardHeader>
          <CardContent>⏱ Average delay metrics</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer Ratings</CardTitle></CardHeader>
          <CardContent>⭐ Ratings by rider</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiderPerformanceDashboard;
