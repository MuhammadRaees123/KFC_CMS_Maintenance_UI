import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, MessageSquare, FileText } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const stats = [
  { title: "Total Sales", value: "$45,231", change: "+20.1%", icon: TrendingUp },
  { title: "Active Users", value: "2,345", change: "+15.3%", icon: Users },
  { title: "Complaints", value: "89", change: "-5.2%", icon: MessageSquare },
  { title: "Reports", value: "156", change: "+8.7%", icon: FileText },
];

const lineChartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "Sales",
      data: [12, 19, 3, 5, 2, 3],
      borderColor: "hsl(348, 100%, 45%)",
      backgroundColor: "hsl(348, 100%, 45%, 0.1)",
      tension: 0.4,
    },
  ],
};

const barChartData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Orders",
      data: [65, 59, 80, 81, 56, 55, 40],
      backgroundColor: "hsl(348, 100%, 45%)",
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "hsl(0, 0%, 90%)",
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to KFC CMS Portal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
