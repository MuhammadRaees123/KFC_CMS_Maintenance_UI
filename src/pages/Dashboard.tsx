import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Building2, PhoneCall, CheckCircle } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getComplaintSummary } from "@/services/api";

// Register chart components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Data structure for complaint stats
interface ComplaintStats {
  totalComplaints: number;
  pendingOnBranch: number;
  pendingOnCC: number;
  closed: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ComplaintStats>({
    totalComplaints: 0,
    pendingOnBranch: 0,
    pendingOnCC: 0,
    closed: 0,
  });

  // ✅ Fetch complaint summary from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getComplaintSummary();
        if (res.data) {
          setStats({
            totalComplaints: res.data.total ?? 0,
            pendingOnBranch: res.data.pendingBranch ?? 0,
            pendingOnCC: res.data.pendingCC ?? 0,
            closed: res.data.closed ?? 0,
          });
        }
      } catch (error) {
        console.error("Error fetching complaint summary", error);
      }
    };
    fetchData();
  }, []);

  // --- Demo chart data (replace later with trend API)
  const lineChartData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Complaints",
        data: [150, 200, 180, 230],
        borderColor: "hsl(0, 72%, 45%)", // KFC red
        backgroundColor: "hsla(0, 72%, 45%, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: "hsl(0, 0%, 90%)" } },
      x: { grid: { display: false } },
    },
  };

  // --- Card configuration
  const cards = [
    {
      title: "Total Complaints (6 Months)",
      value: stats.totalComplaints,
      icon: MessageSquare,
    },
    {
      title: "Pending on Branch",
      value: stats.pendingOnBranch,
      icon: Building2,
    },
    {
      title: "Pending on Call Center",
      value: stats.pendingOnCC,
      icon: PhoneCall,
    },
    {
      title: "Closed Complaints",
      value: stats.closed,
      icon: CheckCircle,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome to <span className="text-red-600 font-semibold">KFC CMS Portal</span>
        </p>
      </div>

      {/* Summary Cards */}
    {/* Summary Cards with KFC stripes */}
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {cards.map((card) => {
    const Icon = card.icon;
    return (
      <Card 
        key={card.title}
        className="relative overflow-hidden transition-transform duration-300 hover:scale-105 shadow-sm border border-gray-100"
      >
        {/* KFC Top Red Stripes */}
        <div className="absolute top-0 left-0 w-full flex justify-center gap-1 pt-2">
          <div className="w-3 h-1 bg-red-600 rounded-sm"></div>
          <div className="w-3 h-1 bg-red-600 rounded-sm"></div>
          <div className="w-3 h-1 bg-red-600 rounded-sm"></div>
        </div>

        <CardHeader className="flex flex-row items-center justify-between pb-2 mt-3">
          <CardTitle className="text-sm font-medium text-gray-600 text-center">
            {card.title}
          </CardTitle>
          <Icon className="h-5 w-5 text-red-600" />
        </CardHeader>

        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{card.value}</div>
        </CardContent>
      </Card>
    );
  })}
</div>


      {/* Complaint Trend Chart */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-red-600">Complaints Trend (Last Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
