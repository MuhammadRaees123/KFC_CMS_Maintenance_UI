import React, { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";
import MaintenanceImageDisplay from "./MaintenanceImageDisplay";
import {
  calculateRemainingJobTime,
  formatDateTime,
  formatJobTime,
  formatMoney,
  pickField,
} from "../constants";

type MaintenanceReadOnlyViewProps = {
  detail: Record<string, unknown> | null;
  history: Record<string, unknown>[];
  branchName: (id?: number | null) => string;
  actionByName?: (id?: number | null) => string;
  groupHistoryByRequest?: boolean;
};

const resolveActionByLabel = (
  row: Record<string, unknown>,
  actionByName?: (id?: number | null) => string
) => {
  const raw = pickField(row, "actionBy", "ActionBy");
  if (raw === null || raw === undefined || raw === "") return "-";

  const id = Number(raw);
  if (!Number.isFinite(id)) return String(raw);

  const resolved = actionByName?.(id);
  if (resolved && resolved.trim() && resolved !== "NaN") return resolved;

  return String(id);
};

const nonEmptyPath = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const pathFromRow = (
  row: Record<string, unknown>,
  camel: string,
  pascal: string
) => nonEmptyPath(pickField(row, camel, pascal));

const requestIdOf = (row: Record<string, unknown>) => {
  const requestId = Number(
    pickField(row, "maintenanceRequestId", "MaintenanceRequestId")
  );
  return Number.isFinite(requestId) && requestId > 0 ? requestId : null;
};

const historyImageForAction = (
  actionType: string | undefined,
  historyRow: Record<string, unknown>
) => {
  if (!actionType) return { path: null as string | null, label: "Image" };

  if (actionType === "ComplaintCreated") {
    return {
      path: pathFromRow(historyRow, "image", "Image"),
      label: "Complaint Image",
    };
  }
  if (actionType === "StartMaintenance") {
    return {
      path: pathFromRow(historyRow, "beforeImage", "BeforeImage"),
      label: "Before Image",
    };
  }
  if (actionType === "RepairCompleted") {
    return {
      path: pathFromRow(historyRow, "afterImage", "AfterImage"),
      label: "After Image",
    };
  }
  return { path: null, label: "Image" };
};

const cycleImagePath = (
  rows: Record<string, unknown>[],
  requestId: number,
  camel: string,
  pascal: string
) => {
  for (const row of rows) {
    if (requestIdOf(row) !== requestId) continue;
    const path = pathFromRow(row, camel, pascal);
    if (path) return path;
  }
  return null;
};

const HistoryTable: React.FC<{
  rows: Record<string, unknown>[];
  actionByName?: (id?: number | null) => string;
}> = ({ rows, actionByName }) => {
  return (
    <div className="overflow-x-auto">
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
          {rows.length > 0 ? (
            rows.map((h, idx) => {
              const actionType = String(
                pickField(h, "actionType", "ActionType") || ""
              );
              const imageInfo = historyImageForAction(actionType, h);
              return (
                <tr
                  key={
                    pickField(h, "maintenanceHistoryId", "MaintenanceHistoryId") ??
                    idx
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
                    {imageInfo.path ? (
                      <MaintenanceImageDisplay
                        label={imageInfo.label}
                        path={imageInfo.path}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border px-3 py-1.5">
                    {formatJobTime(
                      pickField(h, "oldJobTimeHours", "OldJobTimeHours")
                    )}
                  </td>
                  <td className="border px-3 py-1.5">
                    {formatJobTime(
                      pickField(h, "newJobTimeHours", "NewJobTimeHours")
                    )}
                  </td>
                  <td className="border px-3 py-1.5">
                    {resolveActionByLabel(h, actionByName)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={9}
                className="border px-3 py-4 text-center text-gray-500"
              >
                No history available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const groupHistoryCycles = (history: Record<string, unknown>[]) => {
  const cycles: { requestId: number; rows: Record<string, unknown>[] }[] = [];
  const indexByRequest = new Map<number, number>();

  history.forEach((row) => {
    const requestId = Number(
      pickField(row, "maintenanceRequestId", "MaintenanceRequestId")
    );
    if (!requestId) return;

    const existing = indexByRequest.get(requestId);
    if (existing === undefined) {
      indexByRequest.set(requestId, cycles.length);
      cycles.push({ requestId, rows: [row] });
      return;
    }

    cycles[existing].rows.push(row);
  });

  return cycles;
};

const RemainingJobTime: React.FC<{
  detail: Record<string, unknown>;
}> = ({ detail }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const remaining = calculateRemainingJobTime(
    pickField(detail, "assignedDate", "AssignedDate"),
    pickField(detail, "jobTimeHours", "JobTimeHours"),
    pickField(detail, "status", "Status"),
    pickField(detail, "completedDate", "CompletedDate"),
    now
  );

  return (
    <div>
      <strong>Remaining Job Time:</strong> {remaining.formattedTime}
    </div>
  );
};

const MaintenanceReadOnlyView: React.FC<MaintenanceReadOnlyViewProps> = ({
  detail,
  history,
  branchName,
  actionByName,
  groupHistoryByRequest = false,
}) => {
  if (!detail) {
    return (
      <div className="text-center text-gray-500 py-6">
        No complaint details found.
      </div>
    );
  }

  const cycles = groupHistoryByRequest ? groupHistoryCycles(history) : [];

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <strong>Title:</strong> {pickField(detail, "title", "Title") || "-"}
        </div>
        <div>
          <strong>Status:</strong>{" "}
          <StatusBadge value={pickField<string>(detail, "status", "Status")} />
        </div>
        <div>
          <strong>Priority:</strong>{" "}
          <StatusBadge
            value={pickField<string>(detail, "priority", "Priority")}
            kind="priority"
          />
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
          <strong>Branch:</strong>{" "}
          {branchName(pickField<number>(detail, "branchId", "BranchId"))}
        </div>
        <div>
          <strong>Asset Tag:</strong>{" "}
          {pickField(detail, "assetTag", "AssetTag") || "-"}
        </div>
        <div>
          <strong>Assigned To:</strong>{" "}
          {pickField(detail, "assignedToName", "AssignedToName") ||
            pickField(detail, "assignedTo", "AssignedTo") ||
            "-"}
        </div>
        <div>
          <strong>Current Job Time:</strong>{" "}
          {formatJobTime(pickField(detail, "jobTimeHours", "JobTimeHours"))}
        </div>
        <RemainingJobTime detail={detail} />
        <div>
          <strong>Original Job Time:</strong>{" "}
          {formatJobTime(
            pickField(detail, "originalJobTimeHours", "OriginalJobTimeHours")
          )}
        </div>
        <div>
          <strong>Required Spare Part:</strong>{" "}
          {pickField(detail, "requiredSparePart", "RequiredSparePart") || "-"}
        </div>
        <div>
          <strong>Reported Date:</strong>{" "}
          {formatDateTime(pickField(detail, "reportedDate", "ReportedDate"))}
        </div>
        <div>
          <strong>Assigned Date:</strong>{" "}
          {formatDateTime(pickField(detail, "assignedDate", "AssignedDate"))}
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
          <div className="text-gray-700 mt-1">
            {pickField(detail, "notes", "Notes") || "-"}
          </div>
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

      <div>
        <div className="font-semibold text-[#bc3342] mb-2">History</div>
        {groupHistoryByRequest ? (
          cycles.length > 0 ? (
            <div className="space-y-4">
              {cycles.map((cycle) => {
                const header = cycle.rows[0];
                const complaintImage = cycleImagePath(
                  cycle.rows,
                  cycle.requestId,
                  "image",
                  "Image"
                );
                const beforeImage = cycleImagePath(
                  cycle.rows,
                  cycle.requestId,
                  "beforeImage",
                  "BeforeImage"
                );
                const afterImage = cycleImagePath(
                  cycle.rows,
                  cycle.requestId,
                  "afterImage",
                  "AfterImage"
                );
                return (
                  <div key={cycle.requestId} className="border rounded">
                    <div className="px-3 py-2 bg-[#fff6f6] text-[#bc3342] font-semibold">
                      Complaint Cycle
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      <div>
                        <strong>Maintenance Request #{cycle.requestId}</strong>
                      </div>
                      <div>
                        <strong>Complaint Type:</strong>{" "}
                        {pickField(header, "complaintType", "ComplaintType") ||
                          "-"}
                      </div>
                      <div>
                        <strong>Priority:</strong>{" "}
                        {pickField(header, "priority", "Priority") || "-"}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <StatusBadge
                          value={pickField<string>(header, "status", "Status")}
                        />
                      </div>
                      <div>
                        <strong>Reported Date:</strong>{" "}
                        {formatDateTime(
                          pickField(header, "reportedDate", "ReportedDate")
                        )}
                      </div>
                      {(complaintImage || beforeImage || afterImage) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                          {complaintImage && (
                            <MaintenanceImageDisplay
                              label="Complaint Image"
                              path={complaintImage}
                            />
                          )}
                          {beforeImage && (
                            <MaintenanceImageDisplay
                              label="Before Image"
                              path={beforeImage}
                            />
                          )}
                          {afterImage && (
                            <MaintenanceImageDisplay
                              label="After Image"
                              path={afterImage}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <HistoryTable
                      rows={cycle.rows}
                      actionByName={actionByName}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <HistoryTable rows={[]} actionByName={actionByName} />
          )
        ) : (
          <HistoryTable
            rows={history}
            actionByName={actionByName}
          />
        )}
      </div>
    </div>
  );
};

export default MaintenanceReadOnlyView;
