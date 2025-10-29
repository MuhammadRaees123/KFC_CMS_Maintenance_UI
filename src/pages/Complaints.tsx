import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

const complaints = [
  { id: 1, customer: "John Doe", subject: "Order delayed", status: "pending", date: "2024-01-15" },
  { id: 2, customer: "Jane Smith", subject: "Wrong item received", status: "resolved", date: "2024-01-14" },
  { id: 3, customer: "Bob Johnson", subject: "Cold food", status: "in-progress", date: "2024-01-13" },
  { id: 4, customer: "Alice Brown", subject: "Missing items", status: "pending", date: "2024-01-12" },
  { id: 5, customer: "Charlie Wilson", subject: "Poor service", status: "resolved", date: "2024-01-11" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500";
    case "in-progress":
      return "bg-blue-500";
    case "resolved":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const Complaints = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">Manage customer complaints</p>
        </div>
        <Button>Add Complaint</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{complaint.customer}</h3>
                    <Badge className={getStatusColor(complaint.status)}>
                      {complaint.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{complaint.subject}</p>
                  <p className="text-xs text-muted-foreground">{complaint.date}</p>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Complaints;
