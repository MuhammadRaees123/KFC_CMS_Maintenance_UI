import React, { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Pencil, Loader2, RefreshCcw } from "lucide-react";
import {
  getInventoryCategories,
  getInventoryItemsMaster,
  saveInventoryItemMaster,
} from "@/services/api";
import { apiErrorMessage, ITEM_TYPES } from "./constants";

type ItemRow = {
  itemId: number;
  inventoryCategoryId: number;
  categoryName?: string;
  itemCode: string;
  itemName: string;
  description?: string;
  brand?: string;
  model?: string;
  itemType?: string;
  isSerialized?: boolean;
  unitOfMeasure?: string;
  expectedLifeMonths?: number | null;
  warrantyMonths?: number | null;
  isMaintenanceRequired?: boolean;
  isActive?: boolean;
};

const emptyForm = {
  ItemId: 0,
  InventoryCategoryId: "",
  ItemCode: "",
  ItemName: "",
  Description: "",
  Brand: "",
  Model: "",
  ItemType: "Asset",
  IsSerialized: true,
  UnitOfMeasure: "",
  ExpectedLifeMonths: "",
  WarrantyMonths: "",
  IsMaintenanceRequired: false,
  IsActive: true,
};

const Items: React.FC = () => {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [formData, setFormData] = useState({ ...emptyForm });

  const loadLookups = async () => {
    try {
      const catRes = await getInventoryCategories({ includeInactive: false });
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load categories."),
        variant: "destructive",
      });
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getInventoryItemsMaster({
        inventoryCategoryId: filterCategoryId ? Number(filterCategoryId) : null,
        includeInactive: true,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load items."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [filterCategoryId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.itemCode?.toLowerCase().includes(q) ||
        r.itemName?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.model?.toLowerCase().includes(q) ||
        r.categoryName?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
  };

  const handleEdit = (row: ItemRow) => {
    setFormData({
      ItemId: row.itemId,
      InventoryCategoryId: String(row.inventoryCategoryId || ""),
      ItemCode: row.itemCode || "",
      ItemName: row.itemName || "",
      Description: row.description || "",
      Brand: row.brand || "",
      Model: row.model || "",
      ItemType: row.itemType || "Asset",
      IsSerialized: !!row.isSerialized,
      UnitOfMeasure: row.unitOfMeasure || "",
      ExpectedLifeMonths:
        row.expectedLifeMonths === null || row.expectedLifeMonths === undefined
          ? ""
          : String(row.expectedLifeMonths),
      WarrantyMonths:
        row.warrantyMonths === null || row.warrantyMonths === undefined
          ? ""
          : String(row.warrantyMonths),
      IsMaintenanceRequired: !!row.isMaintenanceRequired,
      IsActive: !!row.isActive,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.InventoryCategoryId || !formData.ItemCode.trim() || !formData.ItemName.trim()) {
      toast({
        title: "Validation",
        description: "Category, Item Code and Item Name are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await saveInventoryItemMaster({
        ItemId: formData.ItemId || 0,
        InventoryCategoryId: Number(formData.InventoryCategoryId),
        ItemCode: formData.ItemCode.trim(),
        ItemName: formData.ItemName.trim(),
        Description: formData.Description?.trim() || null,
        Brand: formData.Brand?.trim() || null,
        Model: formData.Model?.trim() || null,
        ItemType: formData.ItemType || "Asset",
        IsSerialized: !!formData.IsSerialized,
        UnitOfMeasure: formData.UnitOfMeasure?.trim() || null,
        ExpectedLifeMonths: formData.ExpectedLifeMonths
          ? Number(formData.ExpectedLifeMonths)
          : null,
        WarrantyMonths: formData.WarrantyMonths
          ? Number(formData.WarrantyMonths)
          : null,
        IsMaintenanceRequired: !!formData.IsMaintenanceRequired,
        IsActive: !!formData.IsActive,
      });
      toast({
        title: "Success",
        description: res.data?.message || "Item saved successfully.",
      });
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to save item."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">Inventory Items (Master)</h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={fetchItems}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit Item" : "Add Item"}
        </div>
        <form onSubmit={handleSubmit} className="kfc-form p-4">
          <div>
            <label className="kfc-label">Category</label>
            <select
              name="InventoryCategoryId"
              value={formData.InventoryCategoryId}
              onChange={handleChange}
              className="kfc-input"
              required
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.inventoryCategoryId} value={c.inventoryCategoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Item Code</label>
            <input
              name="ItemCode"
              value={formData.ItemCode}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div>
            <label className="kfc-label">Item Name</label>
            <input
              name="ItemName"
              value={formData.ItemName}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div>
            <label className="kfc-label">Item Type</label>
            <select
              name="ItemType"
              value={formData.ItemType}
              onChange={handleChange}
              className="kfc-input"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Brand</label>
            <input name="Brand" value={formData.Brand} onChange={handleChange} className="kfc-input" />
          </div>
          <div>
            <label className="kfc-label">Model</label>
            <input name="Model" value={formData.Model} onChange={handleChange} className="kfc-input" />
          </div>
          <div>
            <label className="kfc-label">Unit of Measure</label>
            <input
              name="UnitOfMeasure"
              value={formData.UnitOfMeasure}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Expected Life (Months)</label>
            <input
              type="number"
              name="ExpectedLifeMonths"
              value={formData.ExpectedLifeMonths}
              onChange={handleChange}
              className="kfc-input"
              min={0}
            />
          </div>
          <div>
            <label className="kfc-label">Warranty (Months)</label>
            <input
              type="number"
              name="WarrantyMonths"
              value={formData.WarrantyMonths}
              onChange={handleChange}
              className="kfc-input"
              min={0}
            />
          </div>
          <div className="col-span-full">
            <label className="kfc-label">Description</label>
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              className="kfc-input min-h-[70px]"
            />
          </div>
          <div className="kfc-switch">
            <span>Serialized</span>
            <Switch
              checked={formData.IsSerialized}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, IsSerialized: checked }))
              }
            />
          </div>
          <div className="kfc-switch">
            <span>Maintenance Required</span>
            <Switch
              checked={formData.IsMaintenanceRequired}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, IsMaintenanceRequired: checked }))
              }
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
              <button type="button" className="kfc-btn-outline" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="kfc-btn" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Item" : "Save Item"}
            </button>
          </div>
        </form>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header flex flex-wrap items-center justify-between gap-3">
          <span>Items</span>
          <div className="flex flex-wrap gap-2">
            <select
              className="kfc-input"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.inventoryCategoryId} value={c.inventoryCategoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
            <input
              className="kfc-input max-w-xs"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                  <th className="border px-3 py-2 text-left">Code</th>
                  <th className="border px-3 py-2 text-left">Name</th>
                  <th className="border px-3 py-2 text-left">Category</th>
                  <th className="border px-3 py-2 text-left">Brand</th>
                  <th className="border px-3 py-2 text-left">Model</th>
                  <th className="border px-3 py-2 text-left">Type</th>
                  <th className="border px-3 py-2 text-center">Serialized</th>
                  <th className="border px-3 py-2 text-center">Maint.</th>
                  <th className="border px-3 py-2 text-center">Active</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((row) => (
                    <tr key={row.itemId} className="hover:bg-gray-50">
                      <td className="border px-3 py-1.5">{row.itemCode}</td>
                      <td className="border px-3 py-1.5 font-medium">{row.itemName}</td>
                      <td className="border px-3 py-1.5">{row.categoryName || "-"}</td>
                      <td className="border px-3 py-1.5">{row.brand || "-"}</td>
                      <td className="border px-3 py-1.5">{row.model || "-"}</td>
                      <td className="border px-3 py-1.5">{row.itemType || "-"}</td>
                      <td className="border px-3 py-1.5 text-center">
                        {row.isSerialized ? "Yes" : "No"}
                      </td>
                      <td className="border px-3 py-1.5 text-center">
                        {row.isMaintenanceRequired ? "Yes" : "No"}
                      </td>
                      <td className="border px-3 py-1.5 text-center">
                        {row.isActive ? (
                          <span className="text-green-600 font-semibold">✔</span>
                        ) : (
                          <span className="text-red-500 font-semibold">✖</span>
                        )}
                      </td>
                      <td className="border px-3 py-1.5 text-center">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => handleEdit(row)}
                          className="kfc-btn-outline p-1.5 rounded-md"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="border px-3 py-4 text-center text-gray-500">
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Items;
