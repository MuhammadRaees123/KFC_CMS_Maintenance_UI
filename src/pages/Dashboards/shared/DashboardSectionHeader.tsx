import React from "react";
import { Loader2, RefreshCcw } from "lucide-react";

type DashboardSectionHeaderProps = {
  title: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: React.ReactNode;
};

const DashboardSectionHeader: React.FC<DashboardSectionHeaderProps> = ({
  title,
  onRefresh,
  refreshing = false,
  actions,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="text-xl font-semibold text-[#bc3342]">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
        {onRefresh && (
          <button
            type="button"
            className="kfc-btn-outline flex items-center gap-1"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardSectionHeader;
