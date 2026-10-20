import React, { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Pencil, Loader2, RefreshCcw } from "lucide-react";
import {
  getInventoryCategories,
  saveInventoryCategory,
} from "@/services/api";
import { apiErrorMessage, formatDateTime, pickField } from "./constants";

type CategoryRow = {
  inventoryCategoryId?: number;
  InventoryCategoryId?: number;
  categoryCode: string;
  categoryName: string;
  description?: string;
  isActive?: boolean;
  createdDate?: string;
};

const emptyForm = {
  InventoryCategoryId: 0,
  CategoryCode: "",
  CategoryName: "",
  Description: "",
  IsActive: true,
};

const Categories: React.FC = () => {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ ...emptyForm });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await getInventoryCategories({ includeInactive: true });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load categories."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.categoryCode?.toLowerCase().includes(q) ||
        r.categoryName?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
  };

  const handleEdit = (row: CategoryRow) => {
    setFormData({
      InventoryCategoryId: Number(
        pickField<number>(row, "inventoryCategoryId", "InventoryCategoryId") || 0
      ),
      CategoryCode: row.categoryCode || "",
      CategoryName: row.categoryName || "",
      Description: row.description || "",
      IsActive: !!row.isActive,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.CategoryCode.trim() || !formData.CategoryName.trim()) {
      toast({
        title: "Validation",
        description: "Category Code and Category Name are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await saveInventoryCategory({
        InventoryCategoryId: formData.InventoryCategoryId || 0,
        CategoryCode: formData.CategoryCode.trim(),
        CategoryName: formData.CategoryName.trim(),
        Description: formData.Description?.trim() || null,
        IsActive: !!formData.IsActive,
      });
      toast({
        title: "Success",
        description: res.data?.message || "Category saved successfully.",
      });
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to save category."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">Inventory Categories</h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={fetchCategories}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit Category" : "Add Category"}
        </div>
        <form onSubmit={handleSubmit} className="kfc-form p-4">
          <div>
            <label className="kfc-label">Category Code</label>
            <input
              name="CategoryCode"
              value={formData.CategoryCode}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div>
            <label className="kfc-label">Category Name</label>
            <input
              name="CategoryName"
              value={formData.CategoryName}
              onChange={handleChange}
              className="kfc-input"
              required
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
              {saving ? "Saving..." : isEditing ? "Update Category" : "Save Category"}
            </button>
          </div>
        </form>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header flex items-center justify-between gap-3">
          <span>Categories</span>
          <input
            className="kfc-input max-w-xs"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  <th className="border px-3 py-2 text-left">Description</th>
                  <th className="border px-3 py-2 text-center">Active</th>
                  <th className="border px-3 py-2 text-left">Created</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((row, idx) => (
                    <tr
                      key={
                        pickField<string | number>(
                          row,
                          "inventoryCategoryId",
                          "InventoryCategoryId"
                        ) ?? idx
                      }
                      className="hover:bg-gray-50"
                    >
                      <td className="border px-3 py-1.5">{row.categoryCode}</td>
                      <td className="border px-3 py-1.5 font-medium">{row.categoryName}</td>
                      <td className="border px-3 py-1.5 text-gray-600">
                        {row.description || "-"}
                      </td>
                      <td className="border px-3 py-1.5 text-center">
                        {row.isActive ? (
                          <span className="text-green-600 font-semibold">✔</span>
                        ) : (
                          <span className="text-red-500 font-semibold">✖</span>
                        )}
                      </td>
                      <td className="border px-3 py-1.5">{formatDateTime(row.createdDate)}</td>
                      <td className="border px-3 py-1.5 text-center">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => handleEdit(row)}
                          className="kfc-btn-outline p-1.5 rounded-md hover:border-[#bc3342] hover:text-[#bc3342]"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="border px-3 py-4 text-center text-gray-500">
                      No categories found.
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

export default Categories;
