import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  getBranchesForDashboard,
  getComplaintList,
  getDashboardFilterAccess,
  getRegionsForDashboard,
  getSourcesForDashboard,
  getCategories,
  getCompStatus,
  getCompTypes,
} from "@/services/api";

// Simple reusable modal component
const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-[500px] max-w-[90%] relative">
        <div className="flex justify-between items-center border-b px-4 py-2">
          <h2 className="font-semibold text-gray-700">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const Complaints: React.FC = () => {
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [canViewRegion, setCanViewRegion] = useState(false);
  const [canViewBranch, setCanViewBranch] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [name, setName] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");

  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);

  const [sources, setSources] = useState<
    { SourceID: number; SourceName: string }[]
  >([]);
  const [categories, setCategories] = useState<
    { CatID: number; ComplaintCategory: string }[]
  >([]);
  const [compstatus, setCompStatus] = useState<
    { ID: number; ComplaintStatus: string }[]
  >([]);
  const [comptypes, setCompTypes] = useState<
    { ID: number; Type: string }[]
  >([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);

  // Pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const rowsPerPage = 10;

  const filteredComplaints = complaints.filter(
    (c) =>
      c.orderNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.complaints?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredComplaints.length / rowsPerPage);

  const ExpandableComplaintsTable: React.FC<{ complaints: any[] }> = ({
    complaints,
  }) => {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const toggleRow = (index: number) => {
      setExpandedRow(expandedRow === index ? null : index);
    };

    return (
      <table className="min-w-full text-sm text-gray-700 border-collapse">
        <thead className="bg-gray-100 border-b sticky top-0">
          <tr className="text-left">
            <th className="px-4 py-2 font-semibold">Order No.</th>
            <th className="px-4 py-2 font-semibold">Complaint</th>
            <th className="px-4 py-2 font-semibold">Category</th>
            <th className="px-4 py-2 font-semibold">Status</th>
            <th className="px-4 py-2 font-semibold">Branch</th>
            <th className="px-4 py-2 font-semibold">Created Date</th>
            <th className="px-4 py-2 font-semibold text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((c, i) => (
            <React.Fragment key={i}>
              <tr
                className={`${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-red-50 transition`}
              >
                <td className="px-4 py-2 border-t text-blue-600 underline cursor-pointer">
                  {c.orderNo ?? "-"}
                </td>
                <td
                  className="px-4 py-2 border-t max-w-[250px] truncate"
                  title={c.complaints}
                >
                  {c.complaints ?? "-"}
                </td>
                <td className="px-4 py-2 border-t text-center">
                  {c.complaintCategory ?? "-"}
                </td>
                <td className="px-4 py-2 border-t text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      c.status?.toLowerCase().includes("closed")
                        ? "bg-green-100 text-green-700"
                        : c.status?.toLowerCase().includes("pending")
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {c.status ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-2 border-t text-center">
                  {c.branchName ?? "-"}
                </td>
                <td className="px-4 py-2 border-t text-center">
                  {c.createdDate} {c.createdTime}
                </td>
                <td className="px-4 py-2 border-t text-center">
                  <button
                    onClick={() => toggleRow(i)}
                    className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center justify-center mx-auto"
                  >
                    {expandedRow === i ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" /> Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" /> Details
                      </>
                    )}
                  </button>
                </td>
              </tr>

              {expandedRow === i && (
                <tr className="bg-gray-50 animate-fadeIn">
                  <td colSpan={7} className="px-6 py-3 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold text-gray-700">
                          Phone:
                        </span>{" "}
                        {c.phone1 ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Customer:
                        </span>{" "}
                        {c.firstName ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Type:
                        </span>{" "}
                        {c.type ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Source:
                        </span>{" "}
                        {c.source ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Channel:
                        </span>{" "}
                        {c.channels ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          CC Agent:
                        </span>{" "}
                        {c.agentName ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Rider:
                        </span>{" "}
                        {c.rider ?? "-"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Branch Minutes:
                        </span>{" "}
                        {c.branchMinutes ?? "0"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          CC Minutes:
                        </span>{" "}
                        {c.ccMinutes ?? "0"}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">
                          Total Minutes:
                        </span>{" "}
                        {c.totalMinutes ?? "0"}
                      </p>

                      <div className="col-span-full mt-2 border-t pt-2 text-center">
                        <button
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-2"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setShowModal(true);
                          }}
                        >
                          Comments
                        </button>
                        |
                        <button
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium ml-2"
                          onClick={() => console.log("Edit", c.complaintID)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    );
  };

  // Fetch dropdown data and access
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [typeRes, statusRes, sourceRes, catRes, filterRes] =
          await Promise.all([
            getCompTypes(),
            getCompStatus(),
            getSourcesForDashboard(),
            getCategories(),
            getDashboardFilterAccess(),
          ]);

        if (typeRes.data)
          setCompTypes(
            typeRes.data.map((s: any) => ({ ID: s.id, Type: s.type }))
          );

        if (statusRes.data)
          setCompStatus(
            statusRes.data.map((s: any) => ({
              ID: s.id,
              ComplaintStatus: s.compstatus,
            }))
          );

        if (sourceRes.data)
          setSources(
            sourceRes.data.map((s: any) => ({
              SourceID: s.sourceID,
              SourceName: s.sourceName,
            }))
          );

        if (catRes.data)
          setCategories(
            catRes.data.map((s: any) => ({
              CatID: s.catID,
              ComplaintCategory: s.complaintCategory,
            }))
          );

        if (filterRes.data) {
          const {
            canViewRegion,
            canViewBranch,
            defaultRegionId,
            defaultBranchId,
          } = filterRes.data;
          setCanViewRegion(canViewRegion);
          setCanViewBranch(canViewBranch);

          const regionRes = await getRegionsForDashboard();
          if (regionRes.data) setRegions(regionRes.data);
          const branchRes = await getBranchesForDashboard(defaultRegionId);
          if (branchRes.data) setBranches(branchRes.data);
          setSelectedRegion(defaultRegionId);
          setSelectedBranch(defaultBranchId);
        }
      } catch (err) {
        console.error("Error loading filters:", err);
      }
    };
    loadAll();
  }, []);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Please select both Start Date and End Date.");
      return;
    }

    setLoading(true);
    try {
      const params = {
        startDate,
        endDate,
        regionId: selectedRegion,
        branchId: selectedBranch,
        orderNo,
        contactNo,
        name,
        orderStatus: status,
        complaintCategory: category,
        status,
        source,
        type,
      };
      const res = await getComplaintList(params);
      if (res && Array.isArray(res.data)) setComplaints(res.data);
      else setComplaints([]);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-gray-100 shadow-sm mt-2 mx-auto max-w-[98%]">
      <CardHeader></CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-red-600 mb-3">
            Search Order Complaint
          </h2>

          {/* 🔹 Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
           {canViewRegion && (
              <div className="flex flex-col">
                <label className="text-gray-600 text-sm font-medium mb-1">Region</label>
                <select
                  value={selectedRegion ?? ""}
                  onChange={(e) => {
                    const regionId = parseInt(e.target.value);
                    setSelectedRegion(regionId);
                    getBranchesForDashboard(regionId).then((res) => {
                      if (res.data) setBranches(res.data);
                    });
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="">-- Select Region --</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canViewBranch && (
              <div className="flex flex-col">
                <label className="text-gray-600 text-sm font-medium mb-1">Branch</label>
                <select
                  value={selectedBranch ?? ""}
                  onChange={(e) => setSelectedBranch(parseInt(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="">-- Select Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 📅 Start Date */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>

            {/* 📅 End Date */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>

            {/* ☎️ Contact No */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Contact No
              </label>
              <input
                type="text"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>

            {/* 🙍 Name */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>

            {/* 🔢 Order No */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Order No
              </label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>

            {/* ⚙️ Status */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select Source</option>
                {compstatus.map((s) => (
                  <option key={s.ID} value={s.ID}>
                    {s.ComplaintStatus}
                  </option>
                ))}
              </select>
            </div>

            {/* 🪣 Source */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select Source</option>
                {sources.map((s) => (
                  <option key={s.SourceID} value={s.SourceID}>
                    {s.SourceName}
                  </option>
                ))}
              </select>

            </div>

            {/* 🧾 Category */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((s) => (
                  <option key={s.CatID} value={s.CatID}>
                    {s.ComplaintCategory}
                  </option>
                ))}
              </select>
            </div>

            {/* 🧮 Type */}
            <div className="flex flex-col">
              <label className="text-gray-600 text-sm font-medium mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select Type</option>
                {comptypes.map((s) => (
                  <option key={s.ID} value={s.ID}>
                    {s.Type}
                  </option>
                ))}
              </select>
            </div>
         

          </div>
        
                    {/* 🔘 Search Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSearch}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Search
            </button>
          </div>

        </div>

        {/* Table */}
       {/* 🧾 Complaint Table Section */}
{loading ? (
  <div className="flex justify-center items-center py-10">
    <Loader2 className="animate-spin text-red-600 h-6 w-6" />
  </div>
) : complaints.length > 0 ? (
  <div className="mt-6 rounded-lg border border-gray-200 shadow-sm bg-white">
    {/* 🔍 Search (moved to top like DataTables) */}
    <div className="flex justify-end p-3 border-b bg-gray-50">
      <input
        type="text"
        placeholder="Search..."
        className="border border-gray-300 rounded px-3 py-1 text-sm w-60"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
      />
    </div>

    {/* 📋 Table */}
    <div className="overflow-x-auto">
      <ExpandableComplaintsTable complaints={paginatedComplaints} />
    </div>

    {/* 📄 Pagination Footer */}
    <div className="flex justify-between items-center p-3 text-sm bg-gray-50 border-t">
      <span>
        Showing {(currentPage - 1) * rowsPerPage + 1}–
        {Math.min(currentPage * rowsPerPage, filteredComplaints.length)} of{" "}
        {filteredComplaints.length}
      </span>
      <div className="flex space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </div>
) : (
  <div className="text-center text-gray-500 text-sm mt-4 py-6">
    No complaints found.
  </div>
)}
      </CardContent>

      {/* 🔹 Comments Modal */}
      {showModal && selectedComplaint && (
        <Modal
          title={`Comments for Order #${selectedComplaint.orderNo}`}
          onClose={() => setShowModal(false)}
        >
          <p className="text-gray-600 text-sm mb-2">
            Complaint ID: {selectedComplaint.complaintID}
          </p>
          <p className="text-gray-700 text-sm">
            You can load and show complaint comments here using a future API.
          </p>
        </Modal>
      )}
    </Card>
  );
};

export default Complaints;
