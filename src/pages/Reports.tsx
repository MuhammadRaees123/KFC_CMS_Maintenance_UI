import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

const reports = [
  { id: 1, name: "Monthly Sales Report", date: "2024-01-31", size: "2.4 MB" },
  { id: 2, name: "Customer Feedback Summary", date: "2024-01-30", size: "1.8 MB" },
  { id: 3, name: "Inventory Analysis", date: "2024-01-29", size: "3.2 MB" },
  { id: 4, name: "Employee Performance", date: "2024-01-28", size: "1.5 MB" },
  { id: 5, name: "Financial Overview", date: "2024-01-27", size: "4.1 MB" },
];

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and download reports</p>
        </div>
        <Button>Generate Report</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{report.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report.date} • {report.size}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
