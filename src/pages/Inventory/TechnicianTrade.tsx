import React, { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Loader2, RefreshCcw } from "lucide-react";
import {
  getUsersByRole,
  getTrades,
  getTechnicianTrades,
  createTechnicianTrade,
  updateTechnicianTrade,
  deleteTechnicianTrade,
} from "@/services/api";
import { apiErrorMessage, pickField } from "./constants";

const TECHNICIAN_ROLE_ID = 14;

type AssociationRow = {
  id?: number;
  Id?: number;
  userId?: number;
  UserId?: number;
  technicianName?: string;
  TechnicianName?: string;
  tradeId?: number;
  TradeId?: number;
  tradeName?: string;
  TradeName?: string;
};

type TechnicianOption = {
  userID?: number;
  userId?: number;
  UserID?: number;
  fullName?: string;
  FullName?: string;
  name?: string;
  Name?: string;
  username?: string;
  Username?: string;
};

type TradeOption = {
  id?: number;
  Id?: number;
  tradeName?: string;
  TradeName?: string;
};

const emptyForm = {
  Id: 0,
  UserId: "",
  TradeId: "",
};

const TechnicianTrade: React.FC = () => {
  const [rows, setRows] = useState<AssociationRow[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [trades, setTrades] = useState<TradeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ ...emptyForm });

  const loadLookups = async () => {
    try {
      const [techRes, tradeRes] = await Promise.all([
        getUsersByRole(TECHNICIAN_ROLE_ID),
        getTrades(),
      ]);
      setTechnicians(Array.isArray(techRes.data) ? techRes.data : []);
      setTrades(Array.isArray(tradeRes.data) ? tradeRes.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load dropdowns."),
        variant: "destructive",
      });
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await getTechnicianTrades();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load technician trades."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const tech = String(
        pickField(r, "technicianName", "TechnicianName") || ""
      ).toLowerCase();
      const trade = String(
        pickField(r, "tradeName", "TradeName") || ""
      ).toLowerCase();
      return tech.includes(q) || trade.includes(q);
    });
  }, [rows, search]);

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const technicianOptionId = (t: TechnicianOption) =>
    Number(
      pickField(t, "userID", "userId") ??
        pickField(t, "UserID", "UserId") ??
        0
    );

  const technicianOptionLabel = (t: TechnicianOption) => {
    const name = String(
      pickField(t, "fullName", "FullName") ||
        pickField(t, "name", "Name") ||
        ""
    );
    const username = String(pickField(t, "username", "Username") || "");
    return username ? `${name} (${username})` : name || `User ${technicianOptionId(t)}`;
  };

  const handleEdit = (row: AssociationRow) => {
    setFormData({
      Id: Number(pickField(row, "id", "Id") || 0),
      UserId: String(pickField(row, "userId", "UserId") || ""),
      TradeId: String(pickField(row, "tradeId", "TradeId") || ""),
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.UserId || !formData.TradeId) {
      toast({
        title: "Validation",
        description: "Technician and Trade are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        UserId: Number(formData.UserId),
        TradeId: Number(formData.TradeId),
      };
      const res =
        formData.Id > 0
          ? await updateTechnicianTrade(formData.Id, payload)
          : await createTechnicianTrade(payload);

      toast({
        title: "Success",
        description:
          res.data?.message || "Technician trade association saved successfully.",
      });
      resetForm();
      fetchRows();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to save technician trade association."
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this technician trade association?"
      )
    )
      return;

    setDeletingId(id);
    try {
      const res = await deleteTechnicianTrade(id);
      toast({
        title: "Success",
        description:
          res.data?.message || "Technician trade association deleted successfully.",
      });
      if (formData.Id === id) resetForm();
      fetchRows();
    } catch (error: any) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          "Failed to delete technician trade association."
        ),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">Technician Trade</h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={() => {
            loadLookups();
            fetchRows();
          }}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit Technician Trade" : "Add Technician Trade"}
        </div>
        <form onSubmit={handleSubmit} className="kfc-form p-4">
          <div>
            <label className="kfc-label">Technician</label>
            <select
              name="UserId"
              className="kfc-input"
              value={formData.UserId}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Technician --</option>
              {technicians.map((t) => {
                const id = technicianOptionId(t);
                return (
                  <option key={id} value={id}>
                    {technicianOptionLabel(t)}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="kfc-label">Trade</label>
            <select
              name="TradeId"
              className="kfc-input"
              value={formData.TradeId}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Trade --</option>
              {trades.map((t) => {
                const id = Number(pickField(t, "id", "Id") || 0);
                return (
                  <option key={id} value={id}>
                    {String(pickField(t, "tradeName", "TradeName") || "")}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="col-span-full flex justify-end gap-2 mt-2">
            {isEditing && (
              <button type="button" className="kfc-btn-outline" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="kfc-btn" disabled={saving}>
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update Association"
                  : "Save Association"}
            </button>
          </div>
        </form>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header flex items-center justify-between gap-3">
          <span>Active Technician Trades</span>
          <input
            className="kfc-input max-w-xs"
            placeholder="Search associations..."
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
                  <th className="border px-3 py-2 text-left">Association ID</th>
                  <th className="border px-3 py-2 text-left">Technician Name</th>
                  <th className="border px-3 py-2 text-left">Trade Name</th>
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
                          {String(
                            pickField(row, "technicianName", "TechnicianName") ||
                              "-"
                          )}
                        </td>
                        <td className="border px-3 py-1.5">
                          {String(pickField(row, "tradeName", "TradeName") || "-")}
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
                      No active technician trade associations found.
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

export default TechnicianTrade;
