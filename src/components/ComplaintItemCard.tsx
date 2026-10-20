import React from "react";
import { AlertTriangle, Clock, Activity } from "lucide-react";

export default function ComplaintItemCard({ item }: any) {

  const risk =
    item.complaintRatePct > 4 ? "critical" :
    item.complaintRatePct > 2 ? "warning" :
    "safe";

  const badgeColor =
    risk === "critical" ? "bg-red-600" :
    risk === "warning" ? "bg-yellow-500" :
    "bg-green-600";

  return (
    <div className="relative bg-white rounded-2xl shadow-md hover:shadow-xl p-5 border">

      {/* Risk Badge */}
      <span className={`absolute top-3 right-4 text-white text-xs px-3 py-1 rounded-full ${badgeColor}`}>
        {risk.toUpperCase()}
      </span>

      {/* Title */}
      <h3 className="font-bold text-gray-800">{item.itemName}</h3>
      <p className="text-xs text-gray-500">{item.familyName}</p>

      {/* Contribution */}
      <div className="mt-3">
        <div className="text-xs font-semibold text-gray-500">Contribution</div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              item.contributionPct > 7 ? "bg-red-500" :
              item.contributionPct > 4 ? "bg-yellow-500" :
              "bg-green-500"
            }`}
            style={{ width: `${item.contributionPct}%` }}
          />
        </div>
        <div className="text-xs font-semibold mt-1 text-red-600">{item.contributionPct}%</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 text-sm mt-4">

        <div className="flex gap-2 items-center">
          <AlertTriangle size={16} className="text-red-600" />
          <span>{item.complaintCount} complaints</span>
        </div>

        <div className="flex gap-2 items-center">
          <Activity size={16} className="text-blue-600" />
          <span>{item.ordersCount} orders</span>
        </div>

        <div className="flex gap-2 items-center">
          <Clock size={16} className="text-orange-600" />
          <span>{item.daysSinceLastComplaint} days ago</span>
        </div>

        <div className="flex gap-2 items-center">
          <span className="font-bold text-red-600">{item.complaintRatePct}%</span>
          <span className="text-gray-400">rate</span>
        </div>

      </div>

      {/* Severity + Resolution */}
      <div className="flex justify-between text-sm font-semibold mt-4 border-t pt-3">

        <div className="text-gray-600">
          Severity: <span className="text-red-600">{item.severityScore}</span>
        </div>

        <div className="text-green-600">
          Resolved: {item.resolutionRatePct}%
        </div>

      </div>

    </div>
  );
}
