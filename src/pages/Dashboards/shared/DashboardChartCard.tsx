import React from "react";
import { Loader2 } from "lucide-react";

type DashboardChartCardProps = {
  title: string;
  loading?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
};

const DashboardChartCard: React.FC<DashboardChartCardProps> = ({
  title,
  loading = false,
  loadingLabel = "Loading chart...",
  children,
  headerRight,
  className = "",
}) => {
  return (
    <div className={`kfc-card ${className}`}>
      <div className="kfc-card-header flex items-center justify-between gap-2">
        <span>{title}</span>
        {headerRight}
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingLabel}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default DashboardChartCard;
