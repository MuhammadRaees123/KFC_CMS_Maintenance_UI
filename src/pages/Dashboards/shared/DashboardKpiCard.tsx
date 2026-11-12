import React from "react";
import CountUp from "react-countup";

type DashboardKpiTone = {
  gradient: string;
  accent: string;
};

const DASHBOARD_KPI_TONES: DashboardKpiTone[] = [
  { gradient: "from-[#fff5f5] to-[#ffe3e3]", accent: "#d9232e" },
  { gradient: "from-[#fff8e1] to-[#fff3cd]", accent: "#eab308" },
  { gradient: "from-[#e8f0ff] to-[#dde7ff]", accent: "#2563eb" },
  { gradient: "from-[#e8ffef] to-[#c6f6d5]", accent: "#16a34a" },
  { gradient: "from-[#f3e8ff] to-[#e9d5ff]", accent: "#7c3aed" },
  { gradient: "from-[#fff1e6] to-[#ffd8b5]", accent: "#ea580c" },
  { gradient: "from-[#e0f2fe] to-[#bae6fd]", accent: "#0284c7" },
  { gradient: "from-[#fce7f3] to-[#fbcfe8]", accent: "#db2777" },
  { gradient: "from-[#f1f5f9] to-[#e2e8f0]", accent: "#64748b" },
];

type DashboardKpiCardProps = {
  label: string;
  value: number | string;
  loading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  toneIndex?: number;
  tone?: DashboardKpiTone;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
};

const DashboardKpiCard: React.FC<DashboardKpiCardProps> = ({
  label,
  value,
  loading = false,
  onClick,
  disabled = false,
  className = "",
  toneIndex = 0,
  tone,
  icon,
  footer,
}) => {
  const resolvedTone =
    tone ?? DASHBOARD_KPI_TONES[toneIndex % DASHBOARD_KPI_TONES.length];

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, ""));
  const canAnimate = Number.isFinite(numericValue);

  const body = (
    <>
      {icon && (
        <div
          className="absolute -top-4 right-4 p-3 rounded-full shadow-md"
          style={{
            backgroundColor: `${resolvedTone.accent}20`,
            color: resolvedTone.accent,
          }}
        >
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-600 tracking-wide pr-10">
        {label}
      </h3>

      <h2
        className="text-4xl font-bold mt-3"
        style={{ color: resolvedTone.accent }}
      >
        {loading ? (
          "—"
        ) : canAnimate ? (
          <CountUp end={numericValue} duration={1.2} separator="," />
        ) : (
          value
        )}
      </h2>

      {footer}

      <div
        className="h-1 mt-4 rounded-full"
        style={{ backgroundColor: `${resolvedTone.accent}40` }}
      />
    </>
  );

  const sharedClassName = `relative rounded-3xl p-6 text-left bg-gradient-to-br ${resolvedTone.gradient} border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-[#bc3342]/30 disabled:opacity-60 disabled:hover:translate-y-0 ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={sharedClassName}
        onClick={onClick}
        disabled={disabled || loading}
      >
        {body}
      </button>
    );
  }

  return <div className={sharedClassName}>{body}</div>;
};

export default DashboardKpiCard;
