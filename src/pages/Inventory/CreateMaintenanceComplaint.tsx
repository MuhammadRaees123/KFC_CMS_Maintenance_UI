import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  createMaintenanceComplaint,
  getInventoryAssets,
  getMaintenanceList,
} from "@/services/api";
import { getCurrentUser } from "@/types/auth";
import MaintenanceImagePicker from "./components/MaintenanceImagePicker";
import {
  apiErrorMessage,
  COMPLAINT_TYPES,
  INVENTORY_CONDITIONS,
  pickField,
  PRIORITIES,
} from "./constants";

type AssetRow = {
  inventoryItemId: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  categoryName?: string;
  branchId: number;
  serialNumber: string;
  assetTag?: string;
  status?: string;
  condition?: string;
};

const complaintRowsFromResponse = (data: unknown) => {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  return [];
};

const latestActiveComplaint = (
  complaints: Record<string, unknown>[],
  inventoryItemId: number,
) => {
  let best: Record<string, unknown> | null = null;
  let bestDate = -1;
  let bestId = 0;

  complaints.forEach((row) => {
    const itemId = Number(pickField(row, "inventoryItemId", "InventoryItemId"));
    if (itemId !== inventoryItemId) return;

    const status = String(pickField(row, "status", "Status") ?? "");
    if (status === "Closed") return;

    const requestId = Number(
      pickField(row, "maintenanceRequestId", "MaintenanceRequestId"),
    );
    if (!Number.isFinite(requestId) || requestId <= 0) return;

    const date = new Date(
      String(pickField(row, "reportedDate", "ReportedDate") ?? ""),
    ).getTime();
    const safeDate = Number.isNaN(date) ? 0 : date;

    if (
      !best ||
      safeDate > bestDate ||
      (safeDate === bestDate && requestId > bestId)
    ) {
      best = row;
      bestDate = safeDate;
      bestId = requestId;
    }
  });

  return best;
};

const resolveUserBranchId = (): number | null => {
  const parsed = Number(getCurrentUser()?.branchId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveCondition = (value?: string) =>
  INVENTORY_CONDITIONS.includes(value as (typeof INVENTORY_CONDITIONS)[number])
    ? value!
    : "";

const CreateMaintenanceComplaint: React.FC = () => {
  const userBranchId = resolveUserBranchId();

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("");
  const [complaintImage, setComplaintImage] = useState<File | null>(null);
  const [complaintForm, setComplaintForm] = useState({
    ComplaintType: "Broken",
    Priority: "Medium",
    Title: "",
    Description: "",
    Notes: "",
    Condition: "",
  });

  const loadData = async () => {
    if (!userBranchId) {
      setAssets([]);
      setComplaints([]);
      toast({
        title: "Error",
        description:
          "Unable to determine your branch. Please re-login and try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const [assetsRes, complaintsRes] = await Promise.all([
        getInventoryAssets({ branchId: userBranchId }),
        getMaintenanceList({ branchId: userBranchId }),
      ]);

      const assetRows = Array.isArray(assetsRes.data)
        ? (assetsRes.data as AssetRow[])
        : [];
      setAssets(assetRows);
      setComplaints(complaintRowsFromResponse(complaintsRes.data));
    } catch (error: unknown) {
      setAssets([]);
      setComplaints([]);
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to load inventory items for your branch.",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Mount-only load for logged-in branch context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eligibleAssets = useMemo(() => {
    return assets.filter((asset) => {
      const status = String(asset.status ?? "");
      if (
        status === "Disposed" ||
        status === "Lost" ||
        status === "Stolen"
      ) {
        return false;
      }
      return !latestActiveComplaint(complaints, Number(asset.inventoryItemId));
    });
  }, [assets, complaints]);

  const selected = useMemo(() => {
    const id = Number(selectedInventoryItemId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return eligibleAssets.find((row) => Number(row.inventoryItemId) === id) ?? null;
  }, [eligibleAssets, selectedInventoryItemId]);

  useEffect(() => {
    if (!selectedInventoryItemId) return;
    const stillEligible = eligibleAssets.some(
      (row) => String(row.inventoryItemId) === selectedInventoryItemId,
    );
    if (!stillEligible) {
      setSelectedInventoryItemId("");
      setComplaintForm((prev) => ({ ...prev, Condition: "" }));
    }
  }, [eligibleAssets, selectedInventoryItemId]);

  const handleSelectItem = (value: string) => {
    setSelectedInventoryItemId(value);
    const id = Number(value);
    const row = eligibleAssets.find((item) => Number(item.inventoryItemId) === id);
    setComplaintForm((prev) => ({
      ...prev,
      Condition: resolveCondition(row?.condition),
    }));
  };

  const resetForm = () => {
    setSelectedInventoryItemId("");
    setComplaintImage(null);
    setComplaintForm({
      ComplaintType: "Broken",
      Priority: "Medium",
      Title: "",
      Description: "",
      Notes: "",
      Condition: "",
    });
  };

  const submitComplaint = async () => {
    if (!userBranchId) {
      toast({
        title: "Validation",
        description: "Branch context is missing. Please re-login.",
        variant: "destructive",
      });
      return;
    }

    if (!selected) {
      toast({
        title: "Validation",
        description: "Please select an inventory item.",
        variant: "destructive",
      });
      return;
    }

    if (!complaintForm.ComplaintType || !complaintForm.Title.trim()) {
      toast({
        title: "Validation",
        description: "Complaint Type and Title are required.",
        variant: "destructive",
      });
      return;
    }

    if (!complaintForm.Condition) {
      toast({
        title: "Validation",
        description: "Condition is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("InventoryItemId", String(selected.inventoryItemId));
      formData.append("ItemId", String(selected.itemId));
      formData.append("BranchId", String(selected.branchId));
      formData.append("ComplaintType", complaintForm.ComplaintType);
      formData.append("Priority", complaintForm.Priority || "Medium");
      formData.append("Title", complaintForm.Title.trim());
      if (complaintForm.Description?.trim()) {
        formData.append("Description", complaintForm.Description.trim());
      }
      if (complaintForm.Notes?.trim()) {
        formData.append("Notes", complaintForm.Notes.trim());
      }
      formData.append("Condition", complaintForm.Condition);
      if (complaintImage) {
        formData.append("image", complaintImage);
      }

      const res = await createMaintenanceComplaint(formData);
      const created = (res.data?.data ?? res.data) as Record<string, unknown>;
      const requestId = Number(
        pickField(created, "maintenanceRequestId", "MaintenanceRequestId"),
      );

      toast({
        title: "Success",
        description: [
          res.data?.message || "Maintenance complaint created successfully.",
          `Item: ${selected.itemName || "-"}`,
          selected.itemCode ? `Code: ${selected.itemCode}` : null,
          selected.serialNumber ? `Serial: ${selected.serialNumber}` : null,
          selected.assetTag ? `Asset Tag: ${selected.assetTag}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      });

      resetForm();
      await loadData();

      if (!Number.isFinite(requestId) || requestId <= 0) {
        toast({
          title: "Notice",
          description:
            "Complaint was created, but its id was not returned. Eligible technicians can still see it once it is listed.",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to create complaint."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[#bc3342]">
          Create Maintenance Complaint
        </h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={() => void loadData()}
          disabled={loading || saving}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">Complaint Details</div>
        <div className="p-4 space-y-3 text-sm">
          {!userBranchId ? (
            <p className="text-gray-500">
              Branch context is unavailable. Please re-login and try again.
            </p>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
          ) : (
            <>
              <div>
                <label className="kfc-label">Inventory Item</label>
                <select
                  className="kfc-input"
                  value={selectedInventoryItemId}
                  onChange={(e) => handleSelectItem(e.target.value)}
                  disabled={saving || eligibleAssets.length === 0}
                >
                  <option value="">
                    {eligibleAssets.length === 0
                      ? "-- No eligible items --"
                      : "-- Select Inventory Item --"}
                  </option>
                  {eligibleAssets.map((row) => (
                    <option
                      key={row.inventoryItemId}
                      value={row.inventoryItemId}
                    >
                      {`${row.itemName || "-"} (${row.itemCode || "-"}) | SN: ${row.serialNumber}${
                        row.assetTag ? ` | Tag: ${row.assetTag}` : ""
                      }`}
                    </option>
                  ))}
                </select>
                {eligibleAssets.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No eligible inventory items for your branch. Items with an
                    active complaint or Disposed/Lost/Stolen status are
                    excluded.
                  </p>
                )}
              </div>

              {selected && (
                <div className="bg-gray-50 border rounded p-3 space-y-1">
                  <div>
                    <strong>Item:</strong> {selected.itemName} (
                    {selected.itemCode})
                  </div>
                  <div>
                    <strong>Serial Number:</strong> {selected.serialNumber}
                  </div>
                  <div>
                    <strong>Category:</strong> {selected.categoryName || "-"}
                  </div>
                  <div>
                    <strong>Branch ID:</strong> {selected.branchId}
                  </div>
                </div>
              )}

              <div>
                <label className="kfc-label">Complaint Type</label>
                <select
                  className="kfc-input"
                  value={complaintForm.ComplaintType}
                  onChange={(e) =>
                    setComplaintForm((prev) => ({
                      ...prev,
                      ComplaintType: e.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  {COMPLAINT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="kfc-label">Priority</label>
                <select
                  className="kfc-input"
                  value={complaintForm.Priority}
                  onChange={(e) =>
                    setComplaintForm((prev) => ({
                      ...prev,
                      Priority: e.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="kfc-label">Condition</label>
                <select
                  className="kfc-input"
                  value={complaintForm.Condition}
                  onChange={(e) =>
                    setComplaintForm((prev) => ({
                      ...prev,
                      Condition: e.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="">Select Condition</option>
                  {INVENTORY_CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="kfc-label">Title</label>
                <input
                  className="kfc-input"
                  value={complaintForm.Title}
                  onChange={(e) =>
                    setComplaintForm((prev) => ({
                      ...prev,
                      Title: e.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>

              <div>
                <label className="kfc-label">Description</label>
                <textarea
                  className="kfc-input min-h-[70px]"
                  value={complaintForm.Description}
                  onChange={(e) =>
                    setComplaintForm((prev) => ({
                      ...prev,
                      Description: e.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>

              <div>
                <label className="kfc-label">Notes</label>
                <textarea
                  className="kfc-input min-h-[60px]"
                  value={complaintForm.Notes}
                  onChange={(e) =>
                    setComplaintForm((prev) => ({
                      ...prev,
                      Notes: e.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>

              <MaintenanceImagePicker
                label="Image"
                file={complaintImage}
                onChange={setComplaintImage}
                onError={(message) =>
                  toast({
                    title: "Validation",
                    description: message,
                    variant: "destructive",
                  })
                }
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="kfc-btn-outline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="kfc-btn"
                  disabled={saving || !selected}
                  onClick={() => void submitComplaint()}
                >
                  {saving ? "Submitting..." : "Create Complaint"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMaintenanceComplaint;
