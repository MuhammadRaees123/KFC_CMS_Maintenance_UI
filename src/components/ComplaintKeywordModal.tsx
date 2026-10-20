import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import ComplaintKeywordTable from "../components/ComplaintKeywordTable";
import { getComplaintKeywordDetails } from "@/services/api";

export default function ComplaintKeywordModal({
  keyword,
  startDate,
  endDate,
  regionId,
  branchId,
  onClose
}: any) {

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, [keyword]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getComplaintKeywordDetails(
        startDate,
        endDate,
        regionId,
        branchId,
        keyword
      );
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">

      <div className="bg-white w-[90%] max-w-6xl rounded-xl shadow-lg animate-fadeIn overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-[#d9232e] uppercase tracking-wide">
            Complaints for "{keyword}"
          </h2>

          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-100"
          >
            <X className="text-red-600" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 max-h-[75vh] overflow-y-auto">

          {loading ? (

            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-red-600 w-10 h-10" />
            </div>

          ) : (

            <ComplaintKeywordTable rows={rows} />

          )}

        </div>
      </div>

    </div>
  );
}
