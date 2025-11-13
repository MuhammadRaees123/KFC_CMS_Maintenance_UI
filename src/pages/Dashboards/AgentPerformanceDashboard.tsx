import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const AgentPerformanceDashboard = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900">Agent Performance Dashboard</h1>
      <p className="text-gray-500">Monitor agent workload, efficiency, and escalations.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Cases Assigned vs. Resolved</CardTitle></CardHeader>
          <CardContent>📈 Chart placeholder</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Average Resolution Time</CardTitle></CardHeader>
          <CardContent>⏱ Trend graph</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Escalation Rate Per Agent</CardTitle></CardHeader>
          <CardContent>⚠ Escalation metric</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentPerformanceDashboard;
