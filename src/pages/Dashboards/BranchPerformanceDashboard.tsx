import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const BranchPerformanceDashboard = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900">Branch / Store Performance Dashboard</h1>
      <p className="text-gray-500">Monitor complaint and SLA trends across branches.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Complaints per Branch</CardTitle></CardHeader>
          <CardContent>🏪 Chart / list placeholder</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Packaging Accuracy</CardTitle></CardHeader>
          <CardContent>📦 Accuracy metrics</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Branch SLA Performance</CardTitle></CardHeader>
          <CardContent>✅ SLA compliance per branch</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BranchPerformanceDashboard;
