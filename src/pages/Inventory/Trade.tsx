import React, { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Loader2, RefreshCcw } from "lucide-react";
import {
  getInventoryCategories,
  getTrades,
  createTrade,
  updateTrade,
  deleteTrade,
} from "@/services/api";
import { apiErrorMessage, pickField } from "./constants";

type TradeRow = {
  id?: number;
  Id?: number;
  tradeName?: string;
  TradeName?: string;
  tradeCode?: string;
  TradeCode?: string;
};

type CategoryOption = {
  inventoryCategoryId?: number;
  InventoryCategoryId?: number;
  categoryName?: string;
  CategoryName?: string;
  categoryCode?: string;
  CategoryCode?: string;
};

const emptyForm = {
  Id: 0,
  HelperCategoryId: "",
  TradeName: "",
  TradeCode: "",
};

const Trade: React.FC = () => {
  const [rows, setRows] = useState<TradeRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ ...emptyForm });

  const loadCategories = async () => {
    try {
      const res = await getInventoryCategories({ includeInactive: false });
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load categories."),
        variant: "destructive",
      });
    }
  };

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await getTrades();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load trades."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    fetchTrades();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(pickField(r, "tradeName", "TradeName") || "").toLowerCase();
      const code = String(pickField(r, "tradeCode", "TradeCode") || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [rows, search]);

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
  };

  const handleCategoryHelperChange = (categoryId: string) => {
    const selected = categories.find(
      (c) =>
        String(
          pickField(c, "inventoryCategoryId", "InventoryCategoryId") || ""
        ) === categoryId
    );

    setFormData((prev) => ({
      ...prev,
      HelperCategoryId: categoryId,
      TradeName: selected
        ? String(pickField(selected, "categoryName", "CategoryName") || "")
        : prev.TradeName,
      TradeCode: selected
        ? String(pickField(selected, "categoryCode", "CategoryCode") || "")
        : prev.TradeCode,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (row: TradeRow) => {
    setFormData({
      Id: Number(pickField(row, "id", "Id") || 0),
      HelperCategoryId: "",
      TradeName: String(pickField(row, "tradeName", "TradeName") || ""),
      TradeCode: String(pickField(row, "tradeCode", "TradeCode") || ""),
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.TradeName.trim() || !formData.TradeCode.trim()) {
      toast({
        title: "Validation",
        description: "Trade Name and Trade Code are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        TradeName: formData.TradeName.trim(),
        TradeCode: formData.TradeCode.trim(),
      };
      const res =
        formData.Id > 0
          ? await updateTrade(formData.Id, payload)
          : await createTrade(payload);

      toast({
        title: "Success",
        description: res.data?.message || "Trade saved successfully.",
      });
      resetForm();
      fetchTrades();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to save trade."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this trade?")) return;

    setDeletingId(id);
    try {
      const res = await deleteTrade(id);
      toast({
        title: "Success",
        description: res.data?.message || "Trade deleted successfully.",
      });
      if (formData.Id === id) resetForm();
      fetchTrades();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to delete trade."),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">Trade</h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={fetchTrades}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit Trade" : "Add Trade"}
        </div>
        <form onSubmit={handleSubmit} className="kfc-form p-4">
          <div>
            <label className="kfc-label">Inventory Category</label>
            <select
              className="kfc-input"
              value={formData.HelperCategoryId}
              onChange={(e) => handleCategoryHelperChange(e.target.value)}
            >
              <option value="">-- Select Category (optional helper) --</option>
              {categories.map((c) => {
                const id = pickField(c, "inventoryCategoryId", "InventoryCategoryId");
                return (
                  <option key={String(id)} value={String(id)}>
                    {String(pickField(c, "categoryName", "CategoryName") || "")}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecting a category fills Trade Name and Code for review. It does
              not create a category-trade mapping.
            </p>
          </div>
          <div>
            <label className="kfc-label">Trade Name</label>
            <input
              name="TradeName"
              value={formData.TradeName}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div>
            <label className="kfc-label">Trade Code</label>
            <input
              name="TradeCode"
              value={formData.TradeCode}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div className="col-span-full flex justify-end gap-2 mt-2">
            {isEditing && (
              <button type="button" className="kfc-btn-outline" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="kfc-btn" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Trade" : "Save Trade"}
            </button>
          </div>
        </form>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header flex items-center justify-between gap-3">
          <span>Active Trades</span>
          <input
            className="kfc-input max-w-xs"
            placeholder="Search trades..."
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
                  <th className="border px-3 py-2 text-left">Trade ID</th>
                  <th className="border px-3 py-2 text-left">Trade Name</th>
                  <th className="border px-3 py-2 text-left">Trade Code</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((row, idx) => {
                    const id = Number(pickField(row, "id", "Id") || 0);
                    return (
                      <tr key={id || idx} className="hover:bg-gray-50">
                        <td className="border px-3 py-1.5">{id || "-"}</td>
                        <td className="border px-3 py-1.5 font-medium">
                          {String(pickField(row, "tradeName", "TradeName") || "-")}
                        </td>
                        <td className="border px-3 py-1.5">
                          {String(pickField(row, "tradeCode", "TradeCode") || "-")}
                        </td>
                        <td className="border px-3 py-1.5 text-center space-x-2">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => handleEdit(row)}
                            className="kfc-btn-outline p-1.5 rounded-md hover:border-[#bc3342] hover:text-[#bc3342]"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            disabled={deletingId === id}
                            onClick={() => handleDelete(id)}
                            className="kfc-btn p-1.5 rounded-md bg-[#bc3342] hover:bg-[#a82d3a] disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="border px-3 py-4 text-center text-gray-500">
                      No active trades found.
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

export default Trade;
