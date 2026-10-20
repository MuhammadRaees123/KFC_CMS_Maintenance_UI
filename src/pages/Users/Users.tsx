import React, { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Loader2, RefreshCcw } from "lucide-react";
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getRoles,
  getBranchesForDashboard,
  getRegionsForDashboard,
} from "@/services/api";

type UserRow = Record<string, unknown>;

type LookupItem = { id: number; name: string };

type RoleItem = {
  id: number;
  name: string;
  access_Type: string;
};

const emptyForm = {
  id: 0,
  Name: "",
  UserName: "",
  Password: "",
  Access_Type: "",
  RoleId: "",
  RoleText: "",
  Branch: "",
  Address: "",
  Designation: "",
  CellNumber: "",
  regionID: "",
  email: "",
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

function toLookup(list: unknown[]): LookupItem[] {
  return (Array.isArray(list) ? list : [])
    .map((item) => {
      const rec = item as Record<string, unknown>;
      const id = Number(rec.id ?? rec.Id ?? rec.branchId ?? rec.BranchID ?? 0);
      const name = String(
        rec.name ??
          rec.Name ??
          rec.branchName ??
          rec.BranchName ??
          rec.Region ??
          "",
      );
      return { id, name };
    })
    .filter((item) => item.id > 0);
}

function toRoles(list: unknown[]): RoleItem[] {
  return (Array.isArray(list) ? list : [])
    .map((item) => {
      const rec = item as Record<string, unknown>;
      const id = Number(rec.id ?? rec.Id ?? 0);
      const name = String(rec.name ?? rec.Name ?? "");
      const access_Type = String(rec.access_Type ?? rec.Access_Type ?? name);
      return { id, name, access_Type };
    })
    .filter((item) => item.id > 0);
}

const Users: React.FC = () => {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [regions, setRegions] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ ...emptyForm });

  const lookupName = (list: LookupItem[], id: unknown) => {
    const num = Number(id);
    if (!num) return "-";
    return list.find((x) => x.id === num)?.name || String(id);
  };

  const fetchLookups = async () => {
    try {
      const [rolesRes, branchRes, regionRes] = await Promise.all([
        getRoles(),
        getBranchesForDashboard(),
        getRegionsForDashboard(),
      ]);
      setRoles(toRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []));
      setBranches(
        toLookup(Array.isArray(branchRes.data) ? branchRes.data : []),
      );
      setRegions(toLookup(Array.isArray(regionRes.data) ? regionRes.data : []));
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load lookups."),
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to load users."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(pickField(r, "name", "Name") || "").toLowerCase();
      const userName = String(
        pickField(r, "userName", "UserName") || "",
      ).toLowerCase();
      const accessType = String(
        pickField(r, "access_Type", "Access_Type") || "",
      ).toLowerCase();
      const email = String(pickField(r, "email") || "").toLowerCase();
      return (
        name.includes(q) ||
        userName.includes(q) ||
        accessType.includes(q) ||
        email.includes(q)
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

  const handleAccessTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const role = roles.find((r) => String(r.id) === selectedId);
    const accessType = role?.access_Type || role?.name || "";
    const roleText = role?.name || "";
    setFormData((prev) => ({
      ...prev,
      RoleId: selectedId,
      Access_Type: accessType,
      // RoleText: accessType,
      RoleText: roleText,
    }));
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
  };

  const handleEdit = (row: UserRow) => {
    const accessType = String(
      pickField(row, "access_Type", "Access_Type") || "",
    );
    let roleId = String(pickField(row, "roleId", "RoleId") || "");
    if (!roles.some((r) => String(r.id) === roleId) && accessType) {
      const match = roles.find(
        (r) => r.access_Type === accessType || r.name === accessType,
      );
      if (match) roleId = String(match.id);
    }

    setFormData({
      id: Number(pickField<number>(row, "id") || 0),
      Name: String(pickField(row, "name", "Name") || ""),
      UserName: String(pickField(row, "userName", "UserName") || ""),
      Password: "",
      Access_Type: accessType,
      RoleId: roleId,
      RoleText: String(pickField(row, "roleText", "RoleText") || accessType),
      Branch: String(pickField(row, "branch", "Branch") || ""),
      Address: String(pickField(row, "address", "Address") || ""),
      Designation: String(pickField(row, "designation", "Designation") || ""),
      CellNumber: String(pickField(row, "cellNumber", "CellNumber") || ""),
      regionID: String(pickField(row, "regionID", "regionId") || ""),
      email: String(pickField(row, "email") || ""),
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.Name.trim() ||
      !formData.UserName.trim() ||
      !formData.Access_Type.trim() ||
      !formData.regionID
    ) {
      toast({
        title: "Validation",
        description:
          "Name, UserName, Access Type and Region are required.",
        variant: "destructive",
      });
      return;
    }

    if (!isEditing && !formData.Password.trim()) {
      toast({
        title: "Validation",
        description: "Password is required for a new user.",
        variant: "destructive",
      });
      return;
    }

    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        Name: formData.Name.trim(),
        UserName: formData.UserName.trim(),
        Password: formData.Password.trim() || null,
        Access_Type: formData.Access_Type.trim(),
        Branch: formData.Branch ? Number(formData.Branch) : 0,
        Address: formData.Address.trim() || null,
        Designation: formData.Designation.trim() || null,
        CellNumber: formData.CellNumber.trim() || null,
        regionID: Number(formData.regionID),
        RoleId: formData.RoleId.trim() || null,
        RoleText: formData.RoleText.trim() || formData.Access_Type.trim(),
        email: formData.email.trim() || null,
      };

      const res = isEditing
        ? await updateUser(formData.id, payload)
        : await addUser({ ...payload, Password: formData.Password.trim() });

      toast({
        title: "Success",
        description:
          res.data?.message ||
          (isEditing
            ? "User updated successfully."
            : "User saved successfully."),
      });
      resetForm();
      fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(
          error,
          isEditing ? "Failed to update user." : "Failed to save user.",
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    if (deletingId !== null) return;

    setDeletingId(id);
    try {
      await deleteUser(id);
      toast({
        title: "Deleted",
        description: "User deleted successfully.",
      });
      if (formData.id === id) resetForm();
      fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to delete user."),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#bc3342]">Users</h1>
        <button
          type="button"
          className="kfc-btn-outline flex items-center gap-1"
          onClick={fetchUsers}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit User" : "Add User"}
        </div>
        <form onSubmit={handleSubmit} className="kfc-form p-4">
          <div>
            <label className="kfc-label">Name</label>
            <input
              name="Name"
              value={formData.Name}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div>
            <label className="kfc-label">UserName</label>
            <input
              name="UserName"
              value={formData.UserName}
              onChange={handleChange}
              className="kfc-input"
              required
            />
          </div>
          <div>
            <label className="kfc-label">Password</label>
            <input
              type="password"
              name="Password"
              value={formData.Password}
              onChange={handleChange}
              className="kfc-input"
              placeholder={
                isEditing ? "Leave blank to keep current password" : ""
              }
              required={!isEditing}
            />
          </div>
          <div>
            <label className="kfc-label">Access Type</label>
            <select
              name="RoleId"
              value={formData.RoleId}
              onChange={handleAccessTypeChange}
              className="kfc-input"  
              required
            >
              <option value="">Select Access Type</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name || role.access_Type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Branch</label>
            <select
              name="Branch"
              value={formData.Branch}
              onChange={handleChange}
              className="kfc-input"
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Region</label>
            <select
              name="regionID"
              value={formData.regionID}
              onChange={handleChange}
              className="kfc-input"
              required
            >
              <option value="">Select Region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="kfc-label">Designation</label>
            <input
              name="Designation"
              value={formData.Designation}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Cell Number</label>
            <input
              name="CellNumber"
              value={formData.CellNumber}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div>
            <label className="kfc-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>
          <div className="col-span-full">
            <label className="kfc-label">Address</label>
            <textarea
              name="Address"
              value={formData.Address}
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
              {saving ? "Saving..." : isEditing ? "Update User" : "Save User"}
            </button>
          </div>
        </form>
      </div>

      <div className="kfc-card">
        <div className="kfc-card-header flex items-center justify-between gap-3">
          <span>Users</span>
          <input
            className="kfc-input max-w-xs"
            placeholder="Search users..."
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
            <table className="w-full table-fixed border text-sm">
              <thead className="bg-[#fff6f6] text-[#bc3342]">
                <tr>
                  <th className="border px-3 py-2 text-left">Name</th>
                  <th className="border px-3 py-2 text-left w-[140px]">
                    UserName
                  </th>
                  <th className="border px-3 py-2 text-left">Access Type</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-left">Region</th>
                  <th className="border px-3 py-2 text-left">Designation</th>
                  <th className="border px-3 py-2 text-left">Cell Number</th>
                  <th className="border px-3 py-2 text-left w-[200px]">
                    Email
                  </th>
                  <th className="border px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((row, idx) => {
                    const id = Number(pickField<number>(row, "id") ?? idx);
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="border px-3 py-1.5 font-medium">
                          {String(pickField(row, "name", "Name") || "-")}
                        </td>
                        <td className="border px-3 py-1.5 w-[140px] max-w-[140px] whitespace-normal break-all">
                          {String(
                            pickField(row, "userName", "UserName") || "-",
                          )}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600">
                          {String(
                            pickField(row, "access_Type", "Access_Type") || "-",
                          )}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600">
                          {lookupName(
                            branches,
                            pickField(row, "branch", "Branch"),
                          )}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600">
                          {lookupName(
                            regions,
                            pickField(row, "regionID", "regionId"),
                          )}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600">
                          {String(
                            pickField(row, "designation", "Designation") || "-",
                          )}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600">
                          {String(
                            pickField(row, "cellNumber", "CellNumber") || "-",
                          )}
                        </td>
                        <td className="border px-3 py-1.5 text-gray-600 w-[200px] max-w-[200px] whitespace-normal break-all">
                          {String(pickField(row, "email") || "-")}
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
                      colSpan={9}
                      className="border px-3 py-4 text-center text-gray-500"
                    >
                      No users found.
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

export default Users;
