import React, { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Pencil,
  Loader2,
  RefreshCcw,
  ArrowRightLeft,
  History,
  Wrench,
} from "lucide-react";
import {
  createMaintenanceComplaint,
  getBranchesForDashboard,
  getInventoryAssetHistory,
  getInventoryAssets,
  getInventoryCategories,
  getInventoryItemsMaster,
  saveInventoryAsset,
  transferInventoryAsset,
} from "@/services/api";
import { getCurrentUser } from "@/types/auth";
import InventoryModal from "./components/InventoryModal";
import StatusBadge from "./components/StatusBadge";
import {
  apiErrorMessage,
  COMPLAINT_TYPES,
  formatDate,
  formatDateTime,
  formatMoney,
  INVENTORY_CONDITIONS,
  INVENTORY_STATUSES,
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
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  expiryDate?: string;
  supplierId?: number | null;
  invoiceNumber?: string;
  location?: string;
  notes?: string;
  isActive?: boolean;
};

const emptyForm = {
  InventoryItemId: 0,
  ItemId: "",
  BranchId: "",
  SerialNumber: "",
  AssetTag: "",
  Status: "Active",
  Condition: "Good",
  PurchaseDate: "",
  PurchasePrice: "",
  WarrantyStartDate: "",
  WarrantyEndDate: "",
  ExpiryDate: "",
  SupplierId: "",
  InvoiceNumber: "",
  Location: "",
  Notes: "",
  IsActive: true,
};

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const resolveUserBranchId = (): number | null => {
  const parsed = Number(getCurrentUser()?.branchId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const Assets: React.FC = () => {
  const userBranchId = resolveUserBranchId();
  const defaultBranchFilter = userBranchId ? String(userBranchId) : "";

  const [rows, setRows] = useState<AssetRow[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  const [filterBranchId, setFilterBranchId] = useState(defaultBranchFilter);
  const [filterCategoryName, setFilterCategoryName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  const [transferForm, setTransferForm] = useState({
    ToBranchId: "",
    Remarks: "",
  });
  const [complaintForm, setComplaintForm] = useState({
    ComplaintType: "Broken",
    Priority: "Medium",
    Title: "",
    Description: "",
    Notes: "",
  });

  const branchName = (id?: number | null) => {
    if (!id) return "-";
    return branches.find((b) => b.id === Number(id))?.name || `Branch ${id}`;
  };

  const loadLookups = async () => {
    try {
      const [itemRes, branchRes, categoryRes] = await Promise.all([
        getInventoryItemsMaster({ includeInactive: false }),
        getBranchesForDashboard(),
        getInventoryCategories({ includeInactive: false }),
      ]);
      setItems(Array.isArray(itemRes.data) ? itemRes.data : []);
      const branchData = Array.isArray(branchRes.data) ? branchRes.data : [];
      setBranches(
        branchData.map((b: any) => ({
          id: Number(b.id ?? b.BranchID ?? b.branchId),
          name: b.name ?? b.BranchName ?? b.branchName ?? `Branch ${b.id}`,
        })),
      );
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load lookups."),
        variant: "destructive",
      });
    }
  };

  const fetchAssets = async (branchFilter?: string) => {
    const selectedBranch = branchFilter ?? filterBranchId;
    const parsed = Number(selectedBranch);
    const branchId =
      selectedBranch && Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    setLoading(true);
    try {
      const res = await getInventoryAssets({
        branchId,
        status: filterStatus || null,
        condition: filterCondition || null,
        categoryName: filterCategoryName || null,
        search: filterSearch || null,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load inventory items."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadLookups();
      await fetchAssets(defaultBranchFilter);
    })();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
  };

  const handleEdit = (row: AssetRow) => {
    setFormData({
      InventoryItemId: row.inventoryItemId,
      ItemId: String(row.itemId || ""),
      BranchId: String(row.branchId || ""),
      SerialNumber: row.serialNumber || "",
      AssetTag: row.assetTag || "",
      Status: row.status || "Active",
      Condition: row.condition || "Good",
      PurchaseDate: toDateInput(row.purchaseDate),
      PurchasePrice:
        row.purchasePrice === null || row.purchasePrice === undefined
          ? ""
          : String(row.purchasePrice),
      WarrantyStartDate: toDateInput(row.warrantyStartDate),
      WarrantyEndDate: toDateInput(row.warrantyEndDate),
      ExpiryDate: toDateInput(row.expiryDate),
      SupplierId:
        row.supplierId === null || row.supplierId === undefined
          ? ""
          : String(row.supplierId),
      InvoiceNumber: row.invoiceNumber || "",
      Location: row.location || "",
      Notes: row.notes || "",
      IsActive: row.isActive !== false,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.ItemId ||
      !formData.BranchId ||
      !formData.SerialNumber.trim()
    ) {
      toast({
        title: "Validation",
        description: "Item, Branch and Serial Number are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await saveInventoryAsset({
        InventoryItemId: formData.InventoryItemId || 0,
        ItemId: Number(formData.ItemId),
        BranchId: Number(formData.BranchId),
        SerialNumber: formData.SerialNumber.trim(),
        AssetTag: formData.AssetTag?.trim() || null,
        Status: formData.Status || "Active",
        Condition: formData.Condition || "Good",
        PurchaseDate: formData.PurchaseDate || null,
        PurchasePrice: formData.PurchasePrice
          ? Number(formData.PurchasePrice)
          : null,
        WarrantyStartDate: formData.WarrantyStartDate || null,
        WarrantyEndDate: formData.WarrantyEndDate || null,
        ExpiryDate: formData.ExpiryDate || null,
        SupplierId: formData.SupplierId ? Number(formData.SupplierId) : null,
        InvoiceNumber: formData.InvoiceNumber?.trim() || null,
        Location: formData.Location?.trim() || null,
        Notes: formData.Notes?.trim() || null,
        IsActive: !!formData.IsActive,
      });
      toast({
        title: "Success",
        description: res.data?.message || "Inventory item saved successfully.",
      });
      resetForm();
      fetchAssets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to save inventory item."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openTransfer = (row: AssetRow) => {
    setSelected(row);
    setTransferForm({ ToBranchId: "", Remarks: "" });
    setShowTransfer(true);
  };

  const openHistory = async (row: AssetRow) => {
    setSelected(row);
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const res = await getInventoryAssetHistory(row.inventoryItemId);
      setHistoryRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load history."),
        variant: "destructive",
      });
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openComplaint = (row: AssetRow) => {
    setSelected(row);
    setComplaintForm({
      ComplaintType: "Broken",
      Priority: "Medium",
      Title: "",
      Description: "",
      Notes: "",
    });
    setShowComplaint(true);
  };

  const submitTransfer = async () => {
    if (!selected) return;
    const toBranchId = Number(transferForm.ToBranchId);
    if (!toBranchId) {
      toast({
        title: "Validation",
        description: "Destination branch is required.",
        variant: "destructive",
      });
      return;
    }
    if (toBranchId === selected.branchId) {
      toast({
        title: "Validation",
        description:
          "Destination branch must be different from the current branch.",
        variant: "destructive",
      });
      return;
    }

    setActionSaving(true);
    try {
      const res = await transferInventoryAsset(selected.inventoryItemId, {
        ToBranchId: toBranchId,
        Remarks: transferForm.Remarks?.trim() || null,
      });
      toast({
        title: "Success",
        description:
          res.data?.message || "Inventory item transferred successfully.",
      });
      setShowTransfer(false);
      fetchAssets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Transfer failed."),
        variant: "destructive",
      });
    } finally {
      setActionSaving(false);
    }
  };

  const submitComplaint = async () => {
    if (!selected) return;
    if (!complaintForm.ComplaintType || !complaintForm.Title.trim()) {
      toast({
        title: "Validation",
        description: "Complaint Type and Title are required.",
        variant: "destructive",
      });
      return;
    }

    setActionSaving(true);
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

      const res = await createMaintenanceComplaint(formData);
      toast({
        title: "Success",
        description:
          res.data?.message || "Maintenance complaint created successfully.",
      });
      setShowComplaint(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to create complaint."),
        variant: "destructive",
      });
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">
          Inventory Items (Assets)
        </h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={() => fetchAssets()}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit Inventory Item" : "Add Inventory Item"}
        </div>
        <form onSubmit={handleSubmit} className="kfc-form p-4">
          <div>
            <label className="kfc-label">Item</label>
            <select
              name="ItemId"
              value={formData.ItemId}
              onChange={handleChange}
              className="kfc-input"
              required
            >
              <option value="">-- Select Item --</option>
              {items.map((item) => (
                <option key={item.itemId} value={item.itemId}>
                  {item.itemCode} — {item.itemName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Branch</label>
            <select
              name="BranchId"
              value={formData.BranchId}
              onChange={handleChange}
              className="kfc-input"
              required
            >
              <option value="">-- Select Branch --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Serial Number</label>
            <input
              name="SerialNumber"
              value={formData.SerialNumber}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div>
            <label className="kfc-label">Asset Tag</label>
            <input
              name="AssetTag"
              value={formData.AssetTag}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Status</label>
            <select
              name="Status"
              value={formData.Status}
              onChange={handleChange}
              className="kfc-input"
            >
              {INVENTORY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Condition</label>
            <select
              name="Condition"
              value={formData.Condition}
              onChange={handleChange}
              className="kfc-input"
            >
              {INVENTORY_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Purchase Date</label>
            <input
              type="date"
              name="PurchaseDate"
              value={formData.PurchaseDate}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Purchase Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="PurchasePrice"
              value={formData.PurchasePrice}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Warranty Start</label>
            <input
              type="date"
              name="WarrantyStartDate"
              value={formData.WarrantyStartDate}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Warranty End</label>
            <input
              type="date"
              name="WarrantyEndDate"
              value={formData.WarrantyEndDate}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Expiry Date</label>
            <input
              type="date"
              name="ExpiryDate"
              value={formData.ExpiryDate}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Invoice Number</label>
            <input
              name="InvoiceNumber"
              value={formData.InvoiceNumber}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Location</label>
            <input
              name="Location"
              value={formData.Location}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div className="col-span-full">
            <label className="kfc-label">Notes</label>
            <textarea
              name="Notes"
              value={formData.Notes}
              onChange={handleChange}
              className="kfc-input min-h-[70px]"
            />
          </div>
          <div className="kfc-switch">
            <span>Active</span>
            <Switch
              checked={formData.IsActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, IsActive: checked }))
              }
            />
          </div>
          <div className="col-span-full flex justify-end gap-2 mt-2">
            {isEditing && (
              <button
                type="button"
                className="kfc-btn-outline"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="kfc-btn" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Asset" : "Save Asset"}
            </button>
          </div>
        </form>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header py-6 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold whitespace-nowrap">
            Inventory Items
          </h2>

          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            <select
              className="kfc-input w-auto min-w-[150px]"
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              className="kfc-input w-auto min-w-[150px]"
              value={filterCategoryName}
              onChange={(e) => setFilterCategoryName(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c: any) => {
                const name = c.categoryName ?? c.CategoryName;
                const id =
                  c.inventoryCategoryId ?? c.InventoryCategoryId ?? name;

                if (!name) return null;

                return (
                  <option key={id} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>

            <select
              className="kfc-input w-auto min-w-[130px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {INVENTORY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="kfc-input w-auto min-w-[140px]"
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
            >
              <option value="">All Conditions</option>
              {INVENTORY_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              className="kfc-input w-auto min-w-[220px]"
              placeholder="Search serial / tag / item..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />

            <button
              type="button"
              className="kfc-btn whitespace-nowrap"
              onClick={() => fetchAssets()}
            >
              Apply
            </button>
          </div>
        </div>
        <div className="p-3 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-[#fff6f6] text-[#bc3342]">
                <tr>
                  <th className="border px-3 py-2 text-left">Serial Number</th>
                  <th className="border px-3 py-2 text-left">Asset Tag</th>
                  <th className="border px-3 py-2 text-left">Item</th>
                  <th className="border px-3 py-2 text-left">Category</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-left">Status</th>
                  <th className="border px-3 py-2 text-left">Condition</th>
                  <th className="border px-3 py-2 text-left">Purchase</th>
                  <th className="border px-3 py-2 text-left">Location</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={row.inventoryItemId} className="hover:bg-gray-50">
                      <td className="border px-3 py-1.5 font-medium">
                        {row.serialNumber}
                      </td>
                      <td className="border px-3 py-1.5">
                        {row.assetTag || "-"}
                      </td>
                      <td className="border px-3 py-1.5">
                        <div>{row.itemName || "-"}</div>
                        <div className="text-xs text-gray-500">
                          {row.itemCode}
                        </div>
                      </td>
                      <td className="border px-3 py-1.5">
                        {row.categoryName || "-"}
                      </td>
                      <td className="border px-3 py-1.5">
                        {branchName(row.branchId)}
                      </td>
                      <td className="border px-3 py-1.5">
                        <StatusBadge value={row.status} />
                      </td>
                      <td className="border px-3 py-1.5">
                        <StatusBadge value={row.condition} kind="condition" />
                      </td>
                      <td className="border px-3 py-1.5">
                        <div>{formatDate(row.purchaseDate)}</div>
                        <div className="text-xs text-gray-500">
                          {formatMoney(row.purchasePrice)}
                        </div>
                      </td>
                      <td className="border px-3 py-1.5">
                        {row.location || "-"}
                      </td>
                      <td className="border px-3 py-1.5 text-center whitespace-nowrap space-x-1">
                        <button
                          type="button"
                          title="Edit"
                          className="kfc-btn-outline p-1.5 rounded-md"
                          onClick={() => handleEdit(row)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Transfer"
                          className="kfc-btn-outline p-1.5 rounded-md"
                          onClick={() => openTransfer(row)}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="History"
                          className="kfc-btn-outline p-1.5 rounded-md"
                          onClick={() => openHistory(row)}
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {/* <button
                          type="button"
                          title="Create Complaint"
                          className="kfc-btn-outline p-1.5 rounded-md"
                          onClick={() => openComplaint(row)}
                        >
                          <Wrench className="w-4 h-4" />
                        </button> */}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showTransfer && selected && (
        <InventoryModal
          title="Transfer Inventory Item"
          onClose={() => setShowTransfer(false)}
        >
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 border rounded p-3 space-y-1">
              <div>
                <strong>Item:</strong> {selected.itemName} ({selected.itemCode})
              </div>
              <div>
                <strong>Serial Number:</strong> {selected.serialNumber}
              </div>
              <div>
                <strong>Current Branch:</strong> {branchName(selected.branchId)}
              </div>
            </div>
            <div>
              <label className="kfc-label">Destination Branch</label>
              <select
                className="kfc-input"
                value={transferForm.ToBranchId}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    ToBranchId: e.target.value,
                  }))
                }
              >
                <option value="">-- Select Branch --</option>
                {branches
                  .filter((b) => b.id !== selected.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="kfc-label">Remarks</label>
              <textarea
                className="kfc-input min-h-[70px]"
                value={transferForm.Remarks}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    Remarks: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                onClick={() => setShowTransfer(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving}
                onClick={submitTransfer}
              >
                {actionSaving ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </InventoryModal>
      )}

      {showHistory && selected && (
        <InventoryModal
          title={`History — ${selected.serialNumber}`}
          onClose={() => setShowHistory(false)}
          wide
        >
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-[#fff6f6] text-[#bc3342]">
                <tr>
                  <th className="border px-3 py-2 text-left">Date</th>
                  <th className="border px-3 py-2 text-left">Type</th>
                  <th className="border px-3 py-2 text-left">From</th>
                  <th className="border px-3 py-2 text-left">To</th>
                  <th className="border px-3 py-2 text-left">Qty</th>
                  <th className="border px-3 py-2 text-left">Remarks</th>
                  <th className="border px-3 py-2 text-left">By</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length > 0 ? (
                  historyRows.map((h, idx) => (
                    <tr
                      key={
                        pickField<string | number>(
                          h,
                          "inventoryTransactionId",
                          "InventoryTransactionId",
                        ) ?? idx
                      }
                    >
                      <td className="border px-3 py-1.5">
                        {formatDateTime(h.transactionDate)}
                      </td>
                      <td className="border px-3 py-1.5">
                        {h.transactionType}
                      </td>
                      <td className="border px-3 py-1.5">
                        {branchName(h.fromBranchId)}
                      </td>
                      <td className="border px-3 py-1.5">
                        {branchName(h.toBranchId)}
                      </td>
                      <td className="border px-3 py-1.5">
                        {h.quantity ?? "-"}
                      </td>
                      <td className="border px-3 py-1.5">{h.remarks || "-"}</td>
                      <td className="border px-3 py-1.5">
                        {h.createdBy ?? "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </InventoryModal>
      )}

      {showComplaint && selected && (
        <InventoryModal
          title="Create Maintenance Complaint"
          onClose={() => setShowComplaint(false)}
        >
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 border rounded p-3 space-y-1">
              <div>
                <strong>Item:</strong> {selected.itemName} ({selected.itemCode})
              </div>
              <div>
                <strong>Serial Number:</strong> {selected.serialNumber}
              </div>
              <div>
                <strong>Branch:</strong> {branchName(selected.branchId)}
              </div>
            </div>
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
              >
                {COMPLAINT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
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
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kfc-btn-outline"
                onClick={() => setShowComplaint(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kfc-btn"
                disabled={actionSaving}
                onClick={submitComplaint}
              >
                {actionSaving ? "Submitting..." : "Create Complaint"}
              </button>
            </div>
          </div>
        </InventoryModal>
      )}
    </div>
  );
};

export default Assets;
