import React from "react";

type StatusBadgeProps = {
  value?: string | null;
  kind?: "status" | "priority" | "condition";
};

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-800",
  Approved: "bg-indigo-100 text-indigo-800",
  Assigned: "bg-purple-100 text-purple-800",
  InProgress: "bg-amber-100 text-amber-800",
  Pending: "bg-orange-100 text-orange-800",
  WorkLoad: "bg-yellow-100 text-yellow-800",
  SparePartRequired: "bg-rose-100 text-rose-800",
  Repaired: "bg-teal-100 text-teal-800",
  Closed: "bg-gray-200 text-gray-700",
  Active: "bg-green-100 text-green-800",
  UnderRepair: "bg-amber-100 text-amber-800",
  Inactive: "bg-gray-100 text-gray-600",
  Disposed: "bg-red-100 text-red-800",
  Good: "bg-green-100 text-green-800",
  Fair: "bg-yellow-100 text-yellow-800",
  Damaged: "bg-red-100 text-red-800",
  Poor: "bg-orange-100 text-orange-800",
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-800",
  High: "bg-red-100 text-red-800",
  Heigh: "bg-red-100 text-red-800",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ value }) => {
  if (!value) return <span className="text-gray-400">-</span>;
  const color = STATUS_COLORS[value] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {value}
    </span>
  );
};

export default StatusBadge;
