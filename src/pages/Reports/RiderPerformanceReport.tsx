import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    getDashboardFilterAccess,
    getRegionsForDashboard,
    getBranchesForDashboard,
    getRidersForBranch,
    getRiderPerformanceReport,
    exportRiderPerformanceReport,
    RiderPerformance,
} from "@/services/api";
import RiderReportFilters from "@/components/RiderReportFilters";

const RiderPerformanceReport: React.FC = () => {
    const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
    const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
    const [riders, setRiders] = useState<{ id: number; rider: string }[]>([]);

    const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
    const [selectedRider, setSelectedRider] = useState<number | null>(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [data, setData] = useState<RiderPerformance[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false); // ✅ loader for export

    const [page, setPage] = useState(1);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [canViewRegion, setCanViewRegion] = useState(false);
    const [canViewBranch, setCanViewBranch] = useState(false);

    const pageSize = 15;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);
    const num = (v: any): number => parseFloat(String(v) || "0");

    // ✅ Load region, branch, and rider filters
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const res = await getDashboardFilterAccess();
                if (res.data) {
                    const {
                        canViewRegion,
                        canViewBranch,
                        defaultRegionId,
                        defaultBranchId,
                    } = res.data;

                    setCanViewRegion(canViewRegion);
                    setCanViewBranch(canViewBranch);

                    const regionRes = await getRegionsForDashboard();
                    setRegions(regionRes.data || []);

                    const branchRes = await getBranchesForDashboard(defaultRegionId);
                    setBranches(branchRes.data || []);

                    const riderRes = await getRidersForBranch(
                        selectedBranch || defaultBranchId
                    );
                    setRiders(riderRes.data);

                    setSelectedRegion(defaultRegionId);
                    setSelectedBranch(defaultBranchId);
                }
            } catch (err) {
                console.error("Error loading filters:", err);
            }
        };
        loadFilters();

        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        const defaultStart = sevenDaysAgo.toISOString().slice(0, 16);
        const defaultEnd = today.toISOString().slice(0, 16);

        setStartDate(defaultStart);
        setEndDate(defaultEnd);
    }, []);

    const handleShowReport = async () => {
        setLoading(true);
        try {
            const res = await getRiderPerformanceReport(
                startDate,
                endDate,
                selectedRegion,
                selectedBranch,
                selectedRider
            );
            setData(Array.isArray(res) ? res : res ? [res] : []);
        } catch (err) {
            console.error(err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Export with loader
    const handleExport = async () => {
        setExporting(true);
        try {
            await exportRiderPerformanceReport(
                startDate,
                endDate,
                selectedRegion,
                selectedBranch,
                selectedRider
            );
        } catch (err) {
            console.error("Export failed:", err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Card className="border border-gray-100 shadow-sm mt-2 mx-auto max-w-[98%]">
            <CardHeader>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-base font-semibold tracking-wide text-[#d9232e] uppercase">
                        Rider Performance Summary
                    </h2>
                </div>
            </CardHeader>

            <CardContent>
                {/* 🔍 Filters Section */}



                <RiderReportFilters
                    startDate={startDate}
                    endDate={endDate}
                    selectedRegion={selectedRegion}
                    selectedBranch={selectedBranch}
                    selectedRider={selectedRider}

                    regions={regions}
                    branches={branches}
                    riders={riders}

                    canViewRegion={canViewRegion}
                    canViewBranch={canViewBranch}

                    loading={loading}
                    exporting={exporting}

                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}

                    onRegionChange={(id) => {
                        setSelectedRegion(id);
                        getBranchesForDashboard(id).then(res => {
                            if (res.data) setBranches(res.data);
                        });
                    }}

                    onBranchChange={(id) => {
                        setSelectedBranch(id);
                        getRidersForBranch({ branchId: id }).then(res => {
                            if (res.data) setRiders(res.data);
                        });
                    }}

                    onRiderChange={setSelectedRider}

                    onShow={handleShowReport}
                    onExport={handleExport}
                />


                {/* 🚀 Rider Performance Summary Table */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-red-600 h-6 w-6" />
                    </div>
                ) : data.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-10">
                        No records found.
                    </p>
                ) : (
                    <>
                        <div className="overflow-x-auto mt-6 border border-gray-200 rounded-lg shadow-md">
                            <table className="min-w-full text-sm text-gray-700 border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-semibold">Region</th>
                                        <th className="px-3 py-2 text-left font-semibold">Branch</th>
                                        <th className="px-3 py-2 text-left font-semibold">Rider</th>
                                        <th className="px-3 py-2 text-center font-semibold">Emp ID</th>
                                        <th className="px-3 py-2 text-center font-semibold">Status</th>
                                        <th className="px-3 py-2 text-center font-semibold">Total</th>
                                        <th className="px-3 py-2 text-center font-semibold">Delivered</th>
                                        <th className="px-3 py-2 text-center font-semibold">CR%</th>
                                        <th className="px-3 py-2 text-center font-semibold">Complaints%</th>
                                        <th className="px-3 py-2 text-center font-semibold">SOS%</th>
                                        <th className="px-3 py-2 text-center font-semibold">Productivity</th>
                                        <th className="px-3 py-2 text-center font-semibold">Orders/Day</th>
                                        <th className="px-3 py-2 text-center font-semibold"></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {paginatedData.map((r, i) => {
                                        const isExpanded = expandedRow === i;
                                        return (
                                            <React.Fragment key={i}>
                                                <tr
                                                    onClick={() =>
                                                        setExpandedRow(isExpanded ? null : i)
                                                    }
                                                    className={`cursor-pointer hover:bg-red-50 transition ${i % 2 === 0 ? "bg-white" : "bg-gray-50"
                                                        }`}
                                                >
                                                    <td className="px-3 py-2 border-t">{r.region}</td>
                                                    <td className="px-3 py-2 border-t">{r.branchName}</td>
                                                    <td className="px-3 py-2 border-t">{r.riderName}</td>
                                                    <td className="px-3 py-2 border-t text-center">{r.employeeID}</td>
                                                    <td className="px-3 py-2 border-t text-center">{r.riderStatus}</td>
                                                    <td className="px-3 py-2 border-t text-center font-semibold text-gray-800">
                                                        {r.totalOrders}
                                                    </td>
                                                    <td className="px-3 py-2 border-t text-center">{r.deliveredOrders}</td>
                                                    <td className="px-3 py-2 border-t text-center text-red-600">
                                                        {r.cancelRejectPct}%
                                                    </td>
                                                    <td className="px-3 py-2 border-t text-center text-yellow-600">
                                                        {r.complaintsPct}%
                                                    </td>
                                                    <td className="px-3 py-2 border-t text-center text-blue-600">
                                                        {r.sosPct}%
                                                    </td>
                                                    <td className="px-3 py-2 border-t text-center text-green-600">
                                                        {r.productivity}
                                                    </td>
                                                    <td className="px-3 py-2 border-t text-center font-semibold">
                                                        {r.perDayOrders}
                                                    </td>
                                                    <td className="px-3 py-2 border-t text-center text-gray-500">
                                                        {isExpanded ? "▲" : "▼"}
                                                    </td>
                                                </tr>

                                                {/* 🔻 Animated Expand Row */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.tr
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.35, ease: "easeInOut" }}
                                                            className="bg-gray-50 border-t border-gray-200"
                                                        >
                                                            <td colSpan={13} className="px-5 py-4">
                                                                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">

                                                                    {/* Cancelled / Rejected */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">
                                                                            Cancelled / Rejected Orders:
                                                                        </span>{" "}
                                                                        {r.cancelRejectOrders}
                                                                        <div className="h-2 mt-1 bg-gray-200 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-red-500 transition-all duration-500"
                                                                                style={{ width: `${num(r.cancelRejectPct)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-red-500 font-medium">
                                                                            {num(r.cancelRejectPct)}%
                                                                        </span>
                                                                    </div>

                                                                    {/* Complaints */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">Complaints:</span>{" "}
                                                                        {r.complaints}
                                                                        <div className="h-2 mt-1 bg-gray-200 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-yellow-500 transition-all duration-500"
                                                                                style={{ width: `${num(r.complaintsPct)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-yellow-600 font-medium">
                                                                            {num(r.complaintsPct)}%
                                                                        </span>
                                                                    </div>

                                                                    {/* Invalid Complaints */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">Invalid Complaints:</span>{" "}
                                                                        {r.invalidComplaints}
                                                                    </div>

                                                                    {/* SOS Performance */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">SOS Minutes:</span>{" "}
                                                                        {r.sosMinutes}
                                                                        <div className="h-2 mt-1 bg-gray-200 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-blue-500 transition-all duration-500"
                                                                                style={{ width: `${num(r.sosPct)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-blue-600 font-medium">
                                                                            {num(r.sosPct)}%
                                                                        </span>
                                                                    </div>

                                                                    {/* IST Performance */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">IST Minutes:</span>{" "}
                                                                        {r.istMinutes}
                                                                        <div className="h-2 mt-1 bg-gray-200 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-purple-500 transition-all duration-500"
                                                                                style={{ width: `${num(r.istPct)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-purple-600 font-medium">
                                                                            {num(r.istPct)}%
                                                                        </span>
                                                                    </div>

                                                                    {/* Working Days */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">Working Days:</span>{" "}
                                                                        {r.workingDays}
                                                                    </div>

                                                                    {/* Productivity */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">
                                                                            Productivity (Orders/Hour):
                                                                        </span>{" "}
                                                                        {r.productivity}
                                                                        <div className="h-2 mt-1 bg-gray-200 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full transition-all duration-500 ${num(r.productivity) > 1.5
                                                                                    ? "bg-green-500"
                                                                                    : num(r.productivity) > 1
                                                                                        ? "bg-yellow-500"
                                                                                        : "bg-red-500"
                                                                                    }`}
                                                                                style={{
                                                                                    width: `${Math.min(num(r.productivity) * 50, 100)}%`,
                                                                                }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-green-700 font-medium">
                                                                            {num(r.productivity)}
                                                                        </span>
                                                                    </div>

                                                                    {/* Orders/Day */}
                                                                    <div>
                                                                        <span className="font-semibold text-gray-600">Orders per Day:</span>{" "}
                                                                        {r.perDayOrders}
                                                                    </div>

                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    )}
                                                </AnimatePresence>

                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* 📄 Pagination */}
                        <div className="flex justify-between items-center mt-4 text-sm">
                            <p className="text-gray-600">
                                Showing{" "}
                                <span className="font-semibold">
                                    {startIndex + 1}-{Math.min(endIndex, data.length)}
                                </span>{" "}
                                of {data.length}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                    className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <span className="px-3 py-1">{page}</span>
                                <button
                                    disabled={endIndex >= data.length}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default RiderPerformanceReport;
