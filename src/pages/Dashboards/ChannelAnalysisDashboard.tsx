import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ChannelAnalysisDashboard = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900">Channel Analysis Dashboard</h1>
      <p className="text-gray-500">View complaint volume and resolution performance per channel.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Complaint Volume by Channel</CardTitle></CardHeader>
          <CardContent>📊 Chart placeholder</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resolution Effectiveness</CardTitle></CardHeader>
          <CardContent>⚙ SLA compliance comparison</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Complaint Reopen Rate</CardTitle></CardHeader>
          <CardContent>♻ Ratio per channel</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChannelAnalysisDashboard;
