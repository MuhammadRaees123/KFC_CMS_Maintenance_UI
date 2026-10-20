import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { approveMaintenance, assignMaintenance, closeMaintenance,  completeMaintenanceRepair,
  getBranchesForDashboard, getMaintenanceAssignUsers, getMaintenanceById, getMaintenanceHistory,
  getMaintenanceList, getUsers,
  startMaintenance,
} from "@/services/api";
import InventoryModal from "./components/InventoryModal";
import MaintenanceImageDisplay from "./components/MaintenanceImageDisplay";
import MaintenanceImagePicker from "./components/MaintenanceImagePicker";
import StatusBadge from "./components/StatusBadge";
import {
  apiErrorMessage,
  formatDateTime,
  formatJobTime,
  formatMoney,
  isTechnicianWorkStatus,
  JOB_TIME_OPTIONS,
  MAINTENANCE_STATUSES,
  parseJobTimeHours,
  pickField,
} from "./constants";

type ActionKind = "approve" | "assign" | "start" | "complete" | "close" | null;

const ACTIVE_ASSIGN_COUNT_STATUSES = new Set([
  "Assigned",
  "InProgress",
  "WorkLoad",
  "Pending",
  "SparePartRequired",
]);

const displayUserName = (u: any) =>
  u.userName ?? u.username ?? u.fullName ?? u.Name ?? `User ${u.userID ?? u.userId ?? u.id}`;

const MaintenanceDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const requestId = Number(id);

  const [detail, setDetail] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [userLookup, setUserLookup] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionKind, setActionKind] = useState<ActionKind>(null);

  const [comments, setComments] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [jobTimeHours, setJobTimeHours] = useState("");
  const [customJobTime, setCustomJobTime] = useState("");
  const [resolution, setResolution] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [actionImage, setActionImage] = useState<File | null>(null);

  const branchName = (branchId?: number | null) => {
    if (!branchId) return "-";
    return branches.find((b) => b.id === branchId)?.name || `Branch ${branchId}`;
  };

  const userName = (userId?: number | string | null) => {
    if (userId === null || userId === undefined || userId === "") return "-";
    const found = userLookup.find((u) => String(u.id) === String(userId));
    return found?.name || String(userId);
  };

  const loadDetail = async () => {
    if (!requestId || requestId <= 0) return;
    setLoading(true);
    try {
      const detailRes = await getMaintenanceById(requestId);
      setDetail(detailRes.data || null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load maintenance request."),
        variant: "destructive",
      });
      setDetail(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const historyRes = await getMaintenanceHistory(requestId);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load maintenance history."),
        variant: "destructive",
      });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getBranchesForDashboard();
        const data = Array.isArray(res.data) ? res.data : [];
        setBranches(
          data.map((b: any) => ({
            id: b.id ?? b.BranchID ?? b.branchId,
            name: b.name ?? b.BranchName ?? b.branchName ?? `Branch ${b.id}`,
          }))
        );
      } catch {
        /* ignore */
      }
    })();
    (async () => {
      try {
        const res = await getUsers();
        const data = Array.isArray(res.data) ? res.data : [];
        setUserLookup(
          data.map((u: any) => ({
            id: u.id ?? u.Id ?? u.userID ?? u.UserID,
            name: u.name ?? u.Name ?? u.fullName ?? u.FullName ?? "",
          }))
        );
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    loadDetail();
  }, [requestId]);

  const openAction = async (kind: ActionKind) => {
    setActionKind(kind);
    setComments("");
    setResolution("");
    setActualCost("");
    setAssignedTo("");
    setJobTimeHours("");
    setCustomJobTime("");
    setUsers([]);
    setActionImage(null);

    if (kind === "assign") {
      try {
        const [usersRes, listRes] = await Promise.all([
          getMaintenanceAssignUsers(),
          getMaintenanceList({ status: null }),
        ]);
        const technicians = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data?.data || [];
        const complaints = Array.isArray(listRes.data)
          ? listRes.data
          : Array.isArray(listRes.data?.data)
            ? listRes.data.data
            : [];

        const countByUser = new Map<string, number>();
        for (const row of complaints) {
          const status = String(pickField(row, "status", "Status") ?? "");
          if (!ACTIVE_ASSIGN_COUNT_STATUSES.has(status)) continue;
          const assignedId = pickField(row, "assignedTo", "AssignedTo");
          if (assignedId === null || assignedId === undefined || assignedId === "") continue;
          const key = String(assignedId);
          countByUser.set(key, (countByUser.get(key) ?? 0) + 1);
        }

        const enriched = technicians.map((u: any) => {
          const userId = u.userID ?? u.userId ?? u.Id ?? u.id;
          return {
            ...u,
            activeTaskCount: countByUser.get(String(userId)) ?? 0,
          };
        });

        enriched.sort((a: any, b: any) => {
          if (a.activeTaskCount !== b.activeTaskCount) {
            return a.activeTaskCount - b.activeTaskCount;
          }
          return String(displayUserName(a)).localeCompare(String(displayUserName(b)));
        });
        setUsers(enriched);
      } catch (error: any) {
        toast({
          title: "Error",
          description: apiErrorMessage(error, "Failed to load users."),
          variant: "destructive",
        });
      }
    }
  };

  const submitAction = async () => {
    if (!detail) return;
    setActionSaving(true);
    try {
      let res: any;
      switch (actionKind) {
        case "approve":
          res = await approveMaintenance(requestId, {
            Comments: comments.trim() || null,
          });
          break;
        case "assign": {
          const userId = Number(assignedTo);
          if (!userId) {
            toast({
              title: "Validation",
              description: "Please select a user to assign.",
              variant: "destructive",
            });
            setActionSaving(false);
            return;
          }
          const hours = jobTimeHours === "custom"
            ? parseJobTimeHours(customJobTime)
            : parseJobTimeHours(jobTimeHours);
          if (!hours) {
            toast({
              title: "Validation",
              description: "Job Time is required and must be between 1 and 72 hours.",
              variant: "destructive",
            });
            setActionSaving(false);
            return;
          }
          res = await assignMaintenance(requestId, {
            AssignedTo: userId,
            Comments: comments.trim() || null,
            JobTimeHours: hours,
          });
          break;
        }
        case "start": {
          const formData = new FormData();
          if (comments.trim()) {
            formData.append("Comments", comments.trim());
          }
          if (actionImage) {
            formData.append("beforeImage", actionImage);
          }
          res = await startMaintenance(requestId, formData);
          break;
        }
        case "complete":
          if (!resolution.trim()) {
            toast({
              title: "Validation",
              description: "Resolution is required.",
              variant: "destructive",
            });
            setActionSaving(false);
            return;
          }
          if (actualCost && Number(actualCost) < 0) {
            toast({
              title: "Validation",
              description: "Actual cost cannot be negative.",
              variant: "destructive",
            });
            setActionSaving(false);
            return;
          }
          {
            const formData = new FormData();
            formData.append("Resolution", resolution.trim());
            if (actualCost) {
              formData.append("ActualCost", String(Number(actualCost)));
            }
            if (comments.trim()) {
              formData.append("Comments", comments.trim());
            }
            if (actionImage) {
              formData.append("afterImage", actionImage);
            }
            res = await completeMaintenanceRepair(requestId, formData);
          }
          break;
        case "close":
          res = await closeMaintenance(requestId, {
            Comments: comments.trim() || null,
          });
          break;
        default:
          setActionSaving(false);
          return;
      }

      toast({
        title: "Success",
        description: res.data?.message || "Action completed successfully.",
      });
      setActionKind(null);
      setActionImage(null);
      await loadDetail();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Action failed."),
        variant: "destructive",
      });
    } finally {
      setActionSaving(false);
    }
  };

  const status = pickField<string>(detail, "status", "Status");
  const pipelineStatus = isTechnicianWorkStatus(status) ? "InProgress" : status;

  const actionTitle =
    actionKind === "approve"
      ? "Approve Maintenance Request"
      : actionKind === "assign"
        ? "Assign Maintenance Request"
        : actionKind === "start"
          ? (status === "Assigned" ? "Start Maintenance" : "Resume Maintenance")
          : actionKind === "complete"
            ? "Complete Repair"
            : actionKind === "close"
              ? "Close Maintenance Request"
              : "";

  if (!requestId || requestId <= 0) {
    return (
      <div className="p-4">
        <p className="text-gray-600">Invalid maintenance request.</p>
        <button type="button" className="kfc-btn mt-3" onClick={() => navigate("/inventory/maintenance")}>
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/inventory/maintenance" className="kfc-btn-outline p-2 rounded-md">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-semibold text-[#bc3342]">
            Maintenance Request #{requestId}
          </h1>
        </div>
        <button type="button" className="kfc-btn-outline" onClick={loadDetail} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && !detail ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-red-600 w-8 h-8" />
        </div>
      ) : !detail ? (
        <div className="kfc-card p-6 text-center text-gray-500">
          Maintenance request not found.
        </div>
      ) : (
        <>
          <div className="kfc-card p-4">
            <div className="flex flex-wrap gap-2 items-center">
              {MAINTENANCE_STATUSES.map((s, idx) => {
                const currentIndex = MAINTENANCE_STATUSES.indexOf(
                  pipelineStatus as (typeof MAINTENANCE_STATUSES)[number]
                );
                const reached = currentIndex >= 0 && idx <= currentIndex;
                return (
                  <React.Fragment key={s}>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        s === pipelineStatus && !isTechnicianWorkStatus(status)
                          ? "bg-[#bc3342] text-white border-[#bc3342]"
                          : reached
                            ? "bg-[#fff6f6] text-[#bc3342] border-[#f0c7cb]"
                            : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}
                    >
                      {s}
                    </span>
                    {idx < MAINTENANCE_STATUSES.length - 1 && (
                      <span className="text-gray-300">→</span>
                    )}
                  </React.Fragment>
                );
              })}
              {isTechnicianWorkStatus(status) && (
                <span className="ml-2">
                  <StatusBadge value={status} />
                </span>
              )}
            </div>
          </div>

          <div className="kfc-card">
            <div className="kfc-card-header flex flex-wrap items-center justify-between gap-2">
              <span>Details</span>
              <div className="flex flex-wrap gap-2">
                {status === "Open" && (
                  <button type="button" className="kfc-btn" onClick={() => openAction("approve")}>
                    Approve
                  </button>
                )}
                {status === "Approved" && (
                  <button type="button" className="kfc-btn" onClick={() => openAction("assign")}>
                    Assign
                  </button>
                )}
                {(status === "Assigned"
                  || status === "Pending"
                  || status === "WorkLoad"
                  || status === "SparePartRequired") && (
                  <button
                    type="button"
                    className="kfc-btn disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                  >
                    {status === "Assigned" ? "Start" : "Resume"}
                  </button>
                )}
                {status === "InProgress" && (
                  <button
                    type="button"
                    className="kfc-btn disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                  >
                    Complete Repair
                  </button>
                )}
                {status === "Repaired" && (
                  <button type="button" className="kfc-btn" onClick={() => openAction("close")}>
                    Close
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <strong>Title:</strong> {pickField(detail, "title", "Title") || "-"}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <StatusBadge value={pickField<string>(detail, "status", "Status")} />
              </div>
              <div>
                <strong>Priority:</strong>{" "}
                <StatusBadge value={pickField<string>(detail, "priority", "Priority")} kind="priority" />
              </div>
              <div>
                <strong>Complaint Type:</strong>{" "}
                {pickField(detail, "complaintType", "ComplaintType") || "-"}
              </div>
              <div>
                <strong>Item:</strong> {pickField(detail, "itemName", "ItemName") || "-"} (
                {pickField(detail, "itemCode", "ItemCode") || "-"})
              </div>
              <div>
                <strong>Serial Number:</strong>{" "}
                {pickField(detail, "serialNumber", "SerialNumber") || "-"}
              </div>
              <div>
                <strong>Branch:</strong> {branchName(pickField<number>(detail, "branchId", "BranchId"))}
              </div>
              <div>
                <strong>Asset Tag:</strong> {pickField(detail, "assetTag", "AssetTag") || "-"}
              </div>
              <div>
                <strong>Reported By:</strong> {userName(pickField(detail, "reportedBy", "ReportedBy"))}
              </div>
              <div>
                <strong>Reported Date:</strong>{" "}
                {formatDateTime(pickField(detail, "reportedDate", "ReportedDate"))}
              </div>
              <div>
                <strong>Assigned To:</strong>{" "}
                {pickField(detail, "assignedToName", "AssignedToName")
                  || pickField(detail, "assignedTo", "AssignedTo")
                  || "-"}
              </div>
              <div>
                <strong>Assigned Date:</strong>{" "}
                {formatDateTime(pickField(detail, "assignedDate", "AssignedDate"))}
              </div>
              <div>
                <strong>Current Job Time:</strong>{" "}
                {formatJobTime(pickField(detail, "jobTimeHours", "JobTimeHours"))}
              </div>
              <div>
                <strong>Original Job Time:</strong>{" "}
                {formatJobTime(pickField(detail, "originalJobTimeHours", "OriginalJobTimeHours"))}
              </div>
              <div>
                <strong>Required Spare Part:</strong>{" "}
                {pickField(detail, "requiredSparePart", "RequiredSparePart") || "-"}
              </div>
              <div>
                <strong>Started Date:</strong>{" "}
                {formatDateTime(pickField(detail, "startedDate", "StartedDate"))}
              </div>
              <div>
                <strong>Completed Date:</strong>{" "}
                {formatDateTime(pickField(detail, "completedDate", "CompletedDate"))}
              </div>
              <div>
                <strong>Closed Date:</strong>{" "}
                {formatDateTime(pickField(detail, "closedDate", "ClosedDate"))}
              </div>
              <div>
                <strong>Actual Cost:</strong>{" "}
                {formatMoney(pickField(detail, "actualCost", "ActualCost"))}
              </div>
              <div className="md:col-span-2">
                <strong>Description:</strong>
                <div className="text-gray-700 mt-1">
                  {pickField(detail, "description", "Description") || "-"}
                </div>
              </div>
              <div className="md:col-span-2">
                <strong>Resolution:</strong>
                <div className="text-gray-700 mt-1">
                  {pickField(detail, "resolution", "Resolution") || "-"}
                </div>
              </div>
              <div className="md:col-span-2">
                <strong>Notes:</strong>
                <div className="text-gray-700 mt-1">{pickField(detail, "notes", "Notes") || "-"}</div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <MaintenanceImageDisplay
                  label="Complaint Image"
                  path={pickField<string>(detail, "image", "Image")}
                />
                <MaintenanceImageDisplay
                  label="Before Image"
                  path={pickField<string>(detail, "beforeImage", "BeforeImage")}
                />
                <MaintenanceImageDisplay
                  label="After Image"
                  path={pickField<string>(detail, "afterImage", "AfterImage")}
                />
              </div>
            </div>
          </div>

          <div className="kfc-card">
            <div className="kfc-card-header">History</div>
            <div className="p-3 overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-[#fff6f6] text-[#bc3342]">
                  <tr>
                    <th className="border px-3 py-2 text-left">Date</th>
                    <th className="border px-3 py-2 text-left">Old Status</th>
                    <th className="border px-3 py-2 text-left">New Status</th>
                    <th className="border px-3 py-2 text-left">Action</th>
                    <th className="border px-3 py-2 text-left">Comments</th>
                    <th className="border px-3 py-2 text-left">Image</th>
                    <th className="border px-3 py-2 text-left">Old Job Time</th>
                    <th className="border px-3 py-2 text-left">New Job Time</th>
                    <th className="border px-3 py-2 text-left">By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? (
                    history.map((h, idx) => {
                      const actionType = String(
                        pickField(h, "actionType", "ActionType") || ""
                      );
                      const historyImagePath =
                        actionType === "ComplaintCreated"
                          ? pickField<string>(detail, "image", "Image")
                          : actionType === "StartMaintenance"
                            ? pickField<string>(detail, "beforeImage", "BeforeImage")
                            : actionType === "RepairCompleted"
                              ? pickField<string>(detail, "afterImage", "AfterImage")
                              : null;
                      const historyImageLabel =
                        actionType === "ComplaintCreated"
                          ? "Complaint Image"
                          : actionType === "StartMaintenance"
                            ? "Before Image"
                            : actionType === "RepairCompleted"
                              ? "After Image"
                              : "Image";

                      return (
                      <tr
                        key={
                          pickField(h, "maintenanceHistoryId", "MaintenanceHistoryId") ?? idx
                        }
                      >
                        <td className="border px-3 py-1.5">
                          {formatDateTime(pickField(h, "actionDate", "ActionDate"))}
                        </td>
                        <td className="border px-3 py-1.5">
                          {pickField(h, "oldStatus", "OldStatus") || "-"}
                        </td>
                        <td className="border px-3 py-1.5">
                          {pickField(h, "newStatus", "NewStatus") || "-"}
                        </td>
                        <td className="border px-3 py-1.5">
                          {pickField(h, "actionType", "ActionType") || "-"}
                        </td>
                        <td className="border px-3 py-1.5">
                          {pickField(h, "comments", "Comments") || "-"}
                        </td>
                        <td className="border px-3 py-1.5">
                          {historyImagePath ? (
                            <MaintenanceImageDisplay
                              label={historyImageLabel}
                              path={historyImagePath}
                            />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="border px-3 py-1.5">
                          {formatJobTime(pickField(h, "oldJobTimeHours", "OldJobTimeHours"))}
                        </td>
                        <td className="border px-3 py-1.5">
                          {formatJobTime(pickField(h, "newJobTimeHours", "NewJobTimeHours"))}
                        </td>
                        <td className="border px-3 py-1.5">
                          {userName(pickField(h, "actionBy", "ActionBy"))}
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="border px-3 py-4 text-center text-gray-500">
                        No history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {actionKind && (
        <InventoryModal
          title={actionTitle}
          onClose={() => {
            setActionKind(null);
            setActionImage(null);
          }}
        >
          <div className="space-y-3 text-sm">
            {actionKind === "assign" && (
              <>
                <div>
                  <label className="kfc-label">Assign To</label>
                  <select
                    className="kfc-input"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">-- Select User --</option>
                    {users.map((u: any) => {
                      const name = displayUserName(u);
                      const count = Number(u.activeTaskCount ?? 0);
                      return (
                        <option
                          key={u.userID ?? u.userId ?? u.Id ?? u.id}
                          value={u.userID ?? u.userId ?? u.Id ?? u.id}
                        >
                          {`${name} (${count})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="kfc-label">Job Time</label>
                  <select
                    className="kfc-input"
                    value={jobTimeHours}
                    onChange={(e) => setJobTimeHours(e.target.value)}
                  >
                    <option value="">-- Select Job Time --</option>
                    {JOB_TIME_OPTIONS.map((hours) => (
                      <option key={hours} value={String(hours)}>
                        {hours} Hours
                      </option>
                    ))}
                    <option value="custom">Other</option>
                  </select>
                </div>
                {jobTimeHours === "custom" && (
                  <div>
                    <label className="kfc-label">Custom Job Time (hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      step="1"
                      className="kfc-input"
                      value={customJobTime}
                      onChange={(e) => setCustomJobTime(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {actionKind === "complete" && (
              <>
                <div>
                  <label className="kfc-label">Resolution</label>
                  <textarea
                    className="kfc-input min-h-[80px]"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
                <div>
                  <label className="kfc-label">Actual Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="kfc-input"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                  />
                </div>
                <MaintenanceImagePicker
                  label="After Image"
                  file={actionImage}
                  onChange={setActionImage}
                  onError={(message) =>
                    toast({
                      title: "Validation",
                      description: message,
                      variant: "destructive",
                    })
                  }
                />
              </>
            )}

            {actionKind === "start" && (
              <MaintenanceImagePicker
                label="Before Image"
                file={actionImage}
                onChange={setActionImage}
                onError={(message) =>
                  toast({
                    title: "Validation",
                    description: message,
                    variant: "destructive",
                  })
                }
              />
            )}

            <div>
              <label className="kfc-label">Comments</label>
              <textarea
                className="kfc-input min-h-[70px]"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                onClick={() => {
                  setActionKind(null);
                  setActionImage(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving}
                onClick={submitAction}
              >
                {actionSaving ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </InventoryModal>
      )}
    </div>
  );
};

export default MaintenanceDetail;
