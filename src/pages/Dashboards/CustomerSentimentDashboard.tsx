import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const CustomerSentimentDashboard = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900">Customer Sentiment Dashboard</h1>
      <p className="text-gray-500">Analyze feedback, ratings, and customer sentiment trends.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Feedback Score Trends</CardTitle></CardHeader>
          <CardContent>📈 Average score over time</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Common Feedback Tags</CardTitle></CardHeader>
          <CardContent>🏷 Keyword cloud</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Negative Rating Correlations</CardTitle></CardHeader>
          <CardContent>🔍 Branch / rider correlations</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerSentimentDashboard;
