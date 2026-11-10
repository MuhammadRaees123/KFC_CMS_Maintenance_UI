import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Loader2, RefreshCcw, Search } from "lucide-react";
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getRoles,
  getBranchesForDashboard,
  getRegionsForDashboard,
  saveBranchAccess,
  getInventoryCategories,
  getTechnicianCategories,
  replaceTechnicianCategories,
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

function toCategoryLookup(list: unknown[]): LookupItem[] {
  return (Array.isArray(list) ? list : [])
    .map((item) => {
      const rec = item as Record<string, unknown>;
      const id = Number(
        rec.inventoryCategoryId ??
          rec.InventoryCategoryId ??
          rec.id ??
          rec.Id ??
          0,
      );
      const name = String(
        rec.categoryName ?? rec.CategoryName ?? rec.name ?? rec.Name ?? "",
      );
      return { id, name };
    })
    .filter((item) => item.id > 0 && item.name);
}

function isTechnicianAccessType(accessType: string) {
  return accessType.trim().toLowerCase() === "technician";
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
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [wasTechnicianOnEdit, setWasTechnicianOnEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<"grid" | "form">("grid");

  const isTechnicianSelected = isTechnicianAccessType(formData.Access_Type);

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((branch) =>
      branch.name.toLowerCase().includes(q),
    );
  }, [branches, branchSearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(q),
    );
  }, [categories, categorySearch]);

  const lookupName = (list: LookupItem[], id: unknown) => {
    const num = Number(id);
    if (!num) return "-";
    return list.find((x) => x.id === num)?.name || String(id);
  };

  const fetchLookups = async () => {
    try {
      const [rolesRes, branchRes, regionRes, categoryRes] = await Promise.all([
        getRoles(),
        getBranchesForDashboard(),
        getRegionsForDashboard(),
        getInventoryCategories({ includeInactive: false }),
      ]);
      setRoles(toRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []));
      setBranches(
        toLookup(Array.isArray(branchRes.data) ? branchRes.data : []),
      );
      setRegions(toLookup(Array.isArray(regionRes.data) ? regionRes.data : []));
      setCategories(
        toCategoryLookup(
          Array.isArray(categoryRes.data) ? categoryRes.data : [],
        ),
      );
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
      RoleText: roleText,
    }));
    if (!isTechnicianAccessType(accessType)) {
      setSelectedCategoryIds([]);
      setCategorySearch("");
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setSelectedBranchIds([]);
    setSelectedCategoryIds([]);
    setBranchSearch("");
    setCategorySearch("");
    setWasTechnicianOnEdit(false);
    setIsEditing(false);
  };

  const toggleSelectedCategory = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const handleCancel = () => {
    resetForm();
    setActiveTab("grid");
  };

  const toggleSelectedBranch = (branchId: number) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId],
    );
  };

  const handleEdit = async (row: UserRow) => {
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

    const userId = Number(pickField<number>(row, "id") || 0);
    const technicianOnEdit = isTechnicianAccessType(accessType);

    setFormData({
      id: userId,
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
    setSelectedBranchIds([]);
    setSelectedCategoryIds([]);
    setBranchSearch("");
    setCategorySearch("");
    setWasTechnicianOnEdit(technicianOnEdit);
    setIsEditing(true);
    setActiveTab("form");

    if (technicianOnEdit && userId > 0) {
      setLoadingCategories(true);
      try {
        const res = await getTechnicianCategories(userId);
        const assigned = (Array.isArray(res.data) ? res.data : [])
          .map((item: Record<string, unknown>) =>
            Number(
              item.inventoryCategoryId ??
                item.InventoryCategoryId ??
                item.id ??
                0,
            ),
          )
          .filter((id: number) => id > 0);
        setSelectedCategoryIds(assigned);
      } catch (error: unknown) {
        toast({
          title: "Warning",
          description: apiErrorMessage(
            error,
            "Failed to load assigned item categories.",
          ),
          variant: "destructive",
        });
      } finally {
        setLoadingCategories(false);
      }
    }
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

    const technicianSelected = isTechnicianAccessType(formData.Access_Type);
    if (technicianSelected && selectedCategoryIds.length === 0) {
      toast({
        title: "Validation",
        description:
          "Select at least one Item Category for a Technician user.",
        variant: "destructive",
      });
      return;
    }

    if (saving) return;
    setSaving(true);
    try {
      const branchForUser = isEditing
        ? formData.Branch
          ? Number(formData.Branch)
          : 0
        : selectedBranchIds[0] ?? 0;

      const payload = {
        Name: formData.Name.trim(),
        UserName: formData.UserName.trim(),
        Password: formData.Password.trim() || null,
        Access_Type: formData.Access_Type.trim(),
        Branch: branchForUser,
        Address: formData.Address.trim() || null,
        Designation: formData.Designation.trim() || null,
        CellNumber: formData.CellNumber.trim() || null,
        regionID: Number(formData.regionID),
        RoleId: formData.RoleId.trim() || null,
        RoleText: formData.RoleText.trim() || formData.Access_Type.trim(),
        email: formData.email.trim() || null,
      };

      if (isEditing) {
        const res = await updateUser(formData.id, payload);
        let categoryError: string | null = null;

        if (technicianSelected) {
          try {
            await replaceTechnicianCategories(
              formData.id,
              selectedCategoryIds,
            );
          } catch (catError: unknown) {
            categoryError = apiErrorMessage(
              catError,
              "Category assignments were not saved.",
            );
          }
        } else if (wasTechnicianOnEdit) {
          try {
            await replaceTechnicianCategories(formData.id, []);
          } catch (catError: unknown) {
            categoryError = apiErrorMessage(
              catError,
              "Previous category assignments could not be cleared.",
            );
          }
        }

        if (categoryError) {
          toast({
            title: "User updated",
            description: `Account was updated, but item categories were not fully saved. ${categoryError}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: res.data?.message || "User updated successfully.",
          });
        }
        resetForm();
        fetchUsers();
        setActiveTab("grid");
        return;
      }

      const createdUserName = formData.UserName.trim();
      const branchesToAssign = [...selectedBranchIds];
      const categoriesToAssign = [...selectedCategoryIds];
      const roleIdForAccess = Number(formData.RoleId);

      const res = await addUser({
        ...payload,
        Password: formData.Password.trim(),
      });

      const newUserId = Number(
        pickField(res.data?.data, "id", "Id") || 0,
      );
      const shouldAssignBranches =
        branchesToAssign.length > 0 && roleIdForAccess > 0;
      const shouldAssignCategories =
        technicianSelected && categoriesToAssign.length > 0;

      if (
        (shouldAssignBranches || shouldAssignCategories) &&
        newUserId <= 0
      ) {
        toast({
          title: "User created",
          description: `Account "${createdUserName}" was created, but follow-up assignments could not be saved (missing user id). Assign branches/categories manually.`,
          variant: "destructive",
        });
        resetForm();
        fetchUsers();
        setActiveTab("grid");
        return;
      }

      let branchError: string | null = null;
      let categoryError: string | null = null;

      if (shouldAssignBranches) {
        try {
          await saveBranchAccess(
            branchesToAssign.map((branchId) => ({
              RoleID: roleIdForAccess,
              UserID: newUserId,
              BranchID: branchId,
              IsActive: true,
              CreatedBy: 1,
            })),
          );
        } catch (accessError: unknown) {
          branchError = apiErrorMessage(
            accessError,
            "Assign branches manually in Branch Access Management.",
          );
        }
      }

      if (shouldAssignCategories) {
        try {
          await replaceTechnicianCategories(newUserId, categoriesToAssign);
        } catch (catError: unknown) {
          categoryError = apiErrorMessage(
            catError,
            "Assign item categories by editing the user.",
          );
        }
      }

      if (branchError || categoryError) {
        toast({
          title: "User created",
          description: [
            `Account "${createdUserName}" was created.`,
            branchError ? `Branch access: ${branchError}` : null,
            categoryError ? `Categories: ${categoryError}` : null,
          ]
            .filter(Boolean)
            .join(" "),
          variant: "destructive",
        });
        resetForm();
        fetchUsers();
        setActiveTab("grid");
        return;
      }

      toast({
        title: "Success",
        description:
          res.data?.message ||
          (shouldAssignBranches || shouldAssignCategories
            ? "User saved with access assignments successfully."
            : "User saved successfully."),
      });
      resetForm();
      fetchUsers();
      setActiveTab("grid");
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
      if (formData.id === id) {
        resetForm();
        setActiveTab("grid");
      }
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

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "grid" | "form")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="form">Create Form</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
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
        </TabsContent>

        <TabsContent value="form">
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
              <div className={isEditing ? undefined : "col-span-full"}>
                <label className="kfc-label">
                  {isEditing ? "Branch" : "Branches"}
                </label>
                {isEditing ? (
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
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        className="kfc-input pl-9"
                        placeholder="Search branches..."
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1 bg-white">
                      {branches.length === 0 ? (
                        <p className="text-sm text-gray-500 px-1 py-2">
                          No branches available.
                        </p>
                      ) : filteredBranches.length === 0 ? (
                        <p className="text-sm text-gray-500 px-1 py-2">
                          No branches match your search.
                        </p>
                      ) : (
                        filteredBranches.map((branch) => {
                          const checked = selectedBranchIds.includes(branch.id);
                          return (
                            <label
                              key={branch.id}
                              className={`flex items-center justify-between gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer transition ${
                                checked
                                  ? "bg-[#fff5f6] border-[#bc3342]"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                            >
                              <span className="font-medium">{branch.name}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelectedBranch(branch.id)}
                                className="h-4 w-4 accent-[#bc3342]"
                                disabled={saving}
                              />
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                {!isEditing && selectedBranchIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedBranchIds.length} branch
                    {selectedBranchIds.length === 1 ? "" : "es"} selected
                  </p>
                )}
              </div>
              {isTechnicianSelected && (
                <div className="col-span-full">
                  <label className="kfc-label">Assigned Item Categories</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        className="kfc-input pl-9"
                        placeholder="Search item categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        disabled={saving || loadingCategories}
                      />
                    </div>
                    <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1 bg-white">
                      {loadingCategories ? (
                        <p className="text-sm text-gray-500 px-1 py-2 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading categories...
                        </p>
                      ) : categories.length === 0 ? (
                        <p className="text-sm text-gray-500 px-1 py-2">
                          No item categories available.
                        </p>
                      ) : filteredCategories.length === 0 ? (
                        <p className="text-sm text-gray-500 px-1 py-2">
                          No item categories match your search.
                        </p>
                      ) : (
                        filteredCategories.map((category) => {
                          const checked = selectedCategoryIds.includes(
                            category.id,
                          );
                          return (
                            <label
                              key={category.id}
                              className={`flex items-center justify-between gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer transition ${
                                checked
                                  ? "bg-[#fff5f6] border-[#bc3342]"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                            >
                              <span className="font-medium">{category.name}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleSelectedCategory(category.id)
                                }
                                className="h-4 w-4 accent-[#bc3342]"
                                disabled={saving || loadingCategories}
                              />
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                  {selectedCategoryIds.length > 0 ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedCategoryIds.length} categor
                      {selectedCategoryIds.length === 1 ? "y" : "ies"} selected
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 mt-1">
                      At least one item category is required for Technicians.
                    </p>
                  )}
                </div>
              )}
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
                    onClick={handleCancel}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Users;
