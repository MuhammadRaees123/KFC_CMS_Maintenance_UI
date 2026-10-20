import React, { useState } from "react";
import { Search, CalendarDays, AlertTriangle } from "lucide-react";

export default function ComplaintKeywordTable({ rows = [] }: any) {

  const [search, setSearch] = useState("");

  const filtered = rows.filter((r: any) =>
    r.complaintComment?.toLowerCase().includes(search.toLowerCase()) ||
    r.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    r.orderNo?.includes(search)
  );

  return (
    <div className="space-y-4">

      {/* SEARCH BAR */}
      <div className="flex justify-between items-center">

        <div className="text-sm text-gray-500">
          Showing <b>{filtered.length}</b> complaints
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, item, complaint..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>

      </div>

      {/* TABLE */}
      <div className="overflow-auto rounded-xl border shadow-sm">

        <table className="min-w-full text-sm">

          {/* HEADER */}
          <thead className="sticky top-0 bg-gray-100 text-gray-700 shadow z-10">
            <tr>
              <th className="p-3 text-left">Order #</th>
              <th className="p-3 text-left">Item</th>
              {/* <th className="p-3 text-left">Family</th> */}
              <th className="p-3 text-left">Branch</th>
              <th className="p-3 text-left">Complaint</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500 flex flex-col items-center gap-3">

                  <AlertTriangle size={30} className="text-gray-300" />
                  <p>No complaints match your search</p>

                </td>
              </tr>
            ) : (
              filtered.map((r: any, i: number) => (
                <tr
                  key={i}
                  className="border-b hover:bg-red-50/40 transition"
                >

                  {/* ORDER */}
                  <td className="p-3 whitespace-nowrap font-semibold">
                    {r.orderNo}
                  </td>

                  {/* ITEM */}
                  <td className="p-3 font-semibold text-blue-600">
                    {r.itemName}
                  </td>

                  {/* FAMILY */}
                  {/* <td className="p-3 text-gray-600">
                    {r.familyName}
                  </td> */}

                  {/* BRANCH */}
                  <td className="p-3 text-xs text-gray-500">
                    {r.branchName}
                  </td>

                  {/* COMMENT */}
                  <td className="p-3 text-gray-700 max-w-xl whitespace-pre-wrap">
                    {r.complaintComment}
                  </td>

                  {/* DATE */}
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-600 w-fit">
                      <CalendarDays size={12} />
                      {r.createdDate
                        ? new Date(r.createdDate).toLocaleString()
                        : "-"
                      }
                    </div>
                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}
