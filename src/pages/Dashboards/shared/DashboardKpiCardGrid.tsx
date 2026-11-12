import React, { useMemo } from "react";

const MAX_CARDS_PER_ROW = 5;

const ROW_COLS_CLASS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

type DashboardKpiCardGridProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shared KPI card layout for role dashboards:
 * max 5 cards per row; incomplete final rows fill full width equally.
 */
const DashboardKpiCardGrid: React.FC<DashboardKpiCardGridProps> = ({
  children,
  className = "",
}) => {
  const rows = useMemo(() => {
    const items = React.Children.toArray(children).filter(Boolean);
    const chunked: React.ReactNode[][] = [];
    for (let i = 0; i < items.length; i += MAX_CARDS_PER_ROW) {
      chunked.push(items.slice(i, i + MAX_CARDS_PER_ROW));
    }
    return chunked;
  }, [children]);

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid grid-cols-2 gap-4 max-md:[&>*:last-child:nth-child(odd)]:col-span-2 ${
            ROW_COLS_CLASS[row.length] ?? "md:grid-cols-5"
          }`}
        >
          {row}
        </div>
      ))}
    </div>
  );
};

export default DashboardKpiCardGrid;
