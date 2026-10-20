import React, { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Loader2, RefreshCcw } from "lucide-react";
import { getRoles, addRole, updateRole, deleteRole } from "@/services/api";

type RoleRow = {
  id?: number;
  name?: string;
  access_Type?: string;
  Access_Type?: string;
  description?: string;
  is_Active?: boolean;
  roleId?: string;
  RoleId?: string;
};

const emptyForm = {
  id: 0,
  Name: "",
  Access_Type: "",
  Description: "",
  RoleId: "",
};

function apiErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (typeof error !== "object" || error === null) {
    return typeof error === "string" && error ? error : fallback;
  }

  const err = error as {
    response?: { data?: { message?: string } | string };
    message?: string;
  };
  const data = err.response?.data;

  if (data && typeof data === "object" && data.message) return data.message;
  if (typeof data === "string" && data) return data;
  if (err.message) return err.message;
  return fallback;
}

function pickField<T = string | number>(
  obj: unknown,
  ...keys: string[]
): T | undefined {
  if (obj === null || obj === undefined || typeof obj !== "object")
    return undefined;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

const UserRoles: React.FC = () => {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ ...emptyForm });

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await getRoles();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load roles."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const accessType = (
        pickField<string>(r, "access_Type", "Access_Type") || ""
      ).toLowerCase();
      const description = (r.description || "").toLowerCase();
      return (
        name.includes(q) || accessType.includes(q) || description.includes(q)
      );
    });
  }, [rows, search]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
  };

  const handleEdit = (row: RoleRow) => {
    setFormData({
      id: Number(pickField<number>(row, "id") || 0),
      Name: row.name || "",
      Access_Type: pickField<string>(row, "access_Type", "Access_Type") || "",
      Description: row.description || "",
      RoleId: pickField<string>(row, "roleId", "RoleId") || "",
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Name.trim()) {
      toast({
        title: "Validation",
        description: "Role Name is required.",
        variant: "destructive",
      });
      return;
    }

    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        Name: formData.Name.trim(),
        Access_Type: formData.Access_Type.trim() || null,
        Description: formData.Description.trim() || null,
        RoleId: formData.RoleId.trim() || null,
      };

      const res = isEditing
        ? await updateRole(formData.id, payload)
        : await addRole(payload);

      toast({
        title: "Success",
        description:
          res.data?.message ||
          (isEditing
            ? "Role updated successfully."
            : "Role saved successfully."),
      });
      resetForm();
      fetchRoles();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          isEditing ? "Failed to update role." : "Failed to save role.",
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    if (deletingId !== null) return;

    setDeletingId(id);
    try {
      await deleteRole(id);
      toast({
        title: "Deleted",
        description: "Role deleted successfully.",
      });
      if (formData.id === id) resetForm();
      fetchRoles();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to delete role."),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">User Roles</h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={fetchRoles}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit Role" : "Add Role"}
        </div>
        <form onSubmit={handleSubmit} className="kfc-form p-4">
          <div>
            <label className="kfc-label">Role Name</label>
            <input
              name="Name"
              value={formData.Name}
              onChange={handleChange}
              className="kfc-input"
              placeholder="e.g. Call Center Agent"
              required
            />
          </div>
          <div>
            <label className="kfc-label">Access Type</label>
            <select
              name="Access_Type"
              value={formData.Access_Type}
              onChange={handleChange}
              className="kfc-input"
            >
              <option value="">Select Access Type</option>
              <option value="Admin">Admin</option>
              <option value="Branch Manager">Branch Manager</option>
              <option value="Regional Manager">Regional Manager</option>
              <option value="Technician">Technician</option>
            </select>
          </div>
          {/* <div>
            <label className="kfc-label">RoleId</label>
            <input
              name="RoleId"
              value={formData.RoleId}
              onChange={handleChange}
              className="kfc-input"
              placeholder="Optional"
            />
          </div> */}
          <div className="col-span-full">
            <label className="kfc-label">Description</label>
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              className="kfc-input min-h-[70px]"
            />
          </div>
          <div className="col-span-full flex justify-end gap-2 mt-2">
            {isEditing && (
              <button
                type="button"
                className="kfc-btn-outline"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="kfc-btn" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Role" : "Save Role"}
            </button>
          </div>
        </form>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header flex items-center justify-between gap-3">
          <span>Roles</span>
          <input
            className="kfc-input max-w-xs"
            placeholder="Search roles..."
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
                  <th className="border px-3 py-2 text-left">ID</th>
                  <th className="border px-3 py-2 text-left">Role Name</th>
                  <th className="border px-3 py-2 text-left">Access Type</th>
                  <th className="border px-3 py-2 text-left">Description</th>
                  <th className="border px-3 py-2 text-center">Status</th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((row, idx) => {
                    const id = Number(pickField<number>(row, "id") ?? idx);
                    const accessType =
                      pickField<string>(row, "access_Type", "Access_Type") ||
                      "-";
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="border px-3 py-1.5">{id}</td>
                        <td className="border px-3 py-1.5 font-medium">
                          {row.name || "-"}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600">
                          {accessType}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600">
                          {row.description || "-"}
                        </td>
                        <td className="border px-3 py-1.5 text-center">
                          {row.is_Active !== false ? (
                            <span className="text-green-600 font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="text-red-500 font-semibold">
                              Inactive
                            </span>
                          )}
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
                    <td
                      colSpan={6}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No roles found.
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

export default UserRoles;
