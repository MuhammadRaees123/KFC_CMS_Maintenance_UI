type Props = {
  region: string;
  trxCurrent: number;
  trxLast: number;
};

export default function RegionSummaryCard({
  region,
  trxCurrent,
  trxLast
}: Props) {

  const growth =
    trxLast === 0 ? 0 : ((trxCurrent - trxLast) * 100) / trxLast;

  const isPositive = growth >= 0;

  // 🎨 Background colors
  const getBg = () => {
    if (region === "Nationwide") return "from-gray-800 to-black"; // 🔥 premium
    if (region === "Central") return "from-blue-500 to-blue-700";
    if (region === "South") return "from-red-500 to-red-700";
    if (region === "North") return "from-green-500 to-green-700";
    return "from-gray-500 to-gray-700";
  };

  const isNationwide = region === "Nationwide";

  return (
    <div
      className={`bg-gradient-to-r ${getBg()} text-white rounded-2xl px-6 py-5 shadow-xl text-center transform transition hover:scale-105
      ${isNationwide ? "w-[240px] transform transition hover:scale-105 " : "w-[260px]"}`}
    >

      {/* REGION */}
      <div className="text-xl font-bold tracking-wide mb-2">
        {region}
      </div>

      {/* TRANSACTIONS */}
      <div className="text-sm opacity-90">
        Transactions
      </div>

      <div className="text-lg font-semibold mb-2">
        {trxCurrent.toLocaleString()} vs {trxLast.toLocaleString()}
      </div>

      {/* GROWTH */}
      <div className="text-sm opacity-90">
        Growth vs LY
      </div>

      <div
        className={`text-xl font-bold mt-1 ${
          isPositive ? "text-green-200" : "text-yellow-200"
        }`}
      >
        {isPositive ? "▲" : "▼"} {growth.toFixed(0)}%
      </div>

    </div>
  );
}