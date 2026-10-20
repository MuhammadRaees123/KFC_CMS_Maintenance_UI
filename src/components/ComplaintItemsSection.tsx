import ComplaintItemCard from "./ComplaintItemCard";

import { Loader2, RefreshCcw } from "lucide-react";


export default function ComplaintItemsSection({ data, loading, onRefresh }: any) {




    return (
        <div className="bg-white border p-5">

            {/* <div className="flex items-center justify-between mb-3">
  <h3 className="text-red-600 font-semibold uppercase tracking-wide text-sm">
    Top Complaint Categories
  </h3>

  <button
    onClick={onRefresh}   // 👈 function that calls API
    disabled={loading}
    className={`w-8 h-8 flex items-center justify-center rounded-full 
      bg-red-500 hover:bg-red-600 transition 
      ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    title="Refresh"
  >
    <RefreshCcw size={14} />
  </button>
</div> */}


            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
                    Top Food Items Complaints
                </h3>
                <button
                    onClick={onRefresh}
                    className="bg-white border border-gray-200 text-[#d9232e] hover:bg-[#d9232e] hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm"
                    title="Reload Chart"
                >
                    ⟳
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="animate-spin text-red-600" />
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {data.map((item: any, i: number) => (
                        <ComplaintItemCard key={i} item={item} />
                    ))}
                </div>
            )}

        </div>
    );
}
