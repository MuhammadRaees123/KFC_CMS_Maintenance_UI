import React, { useState, useEffect } from "react";
import {
  getAllRoles,
  getRoleMenuAccess,
  getUsersByRole,
  saveRoleMenuAccess,
} from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface Role {
  RoleID: number;
  RoleName: string;
}

interface User {
  UserID: number;
  fullName: string;
}

interface MenuAccess {
  MenuID: number;
  ParentMenuTitle: string;
  MenuTitle: string;
  MenuURL: string;
  IconClass: string;
  CanView: boolean;
  CanAdd: boolean;
  CanEdit: boolean;
  CanDelete: boolean;
}

const RoleMenuAccess: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [menuAccess, setMenuAccess] = useState<MenuAccess[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Load roles on mount
  useEffect(() => {
    fetchRoles();
  }, []);

  // 🔹 Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await getAllRoles();
      const rolesData = res.data || [];
      setRoles(rolesData);

      if (rolesData.length > 0) {
        const firstRole = rolesData[0].RoleID;
        setSelectedRole(firstRole);
        await loadMenuAccess(firstRole, null);
        await loadUsers(firstRole);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive",
      });
    }
  };

  // 🔹 Fetch users by role
  const loadUsers = async (roleId: number) => {
    try {
      const res = await getUsersByRole(roleId);
      const mapped = (res.data || []).map((u: any) => ({
        UserID: u.userID,
        fullName: u.fullName,
      }));
      setUsers(mapped);
    } catch (error) {
      console.error("User load error:", error);
      setUsers([]);
    }
  };

  // 🔹 Load menu access for a role or user
  const loadMenuAccess = async (roleId: number, userId: number | null) => {
    setLoading(true);
    try {
      const res = userId
        ? await getRoleMenuAccess(roleId, userId)
        : await getRoleMenuAccess(roleId);

      let data = [];
      if (typeof res.data === "string") {
        data = JSON.parse(res.data);
      } else {
        data = res.data || [];
      }
      setMenuAccess(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load menu access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔸 When role changes
  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = Number(e.target.value);
    if (!roleId || roleId === selectedRole) return;

    setSelectedRole(roleId);
    setSelectedUser(null);
    await loadMenuAccess(roleId, null);
    await loadUsers(roleId);
  };

  // 🔸 When user changes
  const handleUserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value ? Number(e.target.value) : null;
    setSelectedUser(userId);
    if (selectedRole) await loadMenuAccess(selectedRole, userId);
  };

  // 🧮 Checkbox toggle handler
  const handleCheckbox = (menuId: number, field: keyof MenuAccess) => {
    setMenuAccess((prev) =>
      prev.map((item) =>
        item.MenuID === menuId ? { ...item, [field]: !item[field] } : item
      )
    );
  };

  // 💾 Save changes
  // 💾 Save changes
const handleSave = async () => {
  if (!selectedRole) {
    toast({
      title: "Select Role",
      description: "Please select a role before saving.",
      variant: "destructive",
    });
    return;
  }

  const payload = menuAccess.map((m) => ({
    RoleID: selectedRole,
    UserID: selectedUser ?? null,
    MenuID: m.MenuID,
    CanView: m.CanView,
    CanAdd: m.CanAdd,
    CanEdit: m.CanEdit,
    CanDelete: m.CanDelete,
    CreatedBy: 1,
  }));

  try {
    const res = await saveRoleMenuAccess(payload);

    toast({
      title: "✅ Success",
      description: res.data?.message || "Access rights saved successfully!",
      variant: "default",
    });

    window.dispatchEvent(new Event("refreshSidebarMenu"));

    // 🧹 Reset state after successful save
    setSelectedRole(null);
    setSelectedUser(null);
    setUsers([]);
    setMenuAccess([]);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save access rights.",
      variant: "destructive",
    });
  }
};


  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-[#bc3342]">
        Role & Menu Access
      </h1>

      <Card className="border-l-4 border-l-[#bc3342] shadow-sm">
        <CardHeader className="py-2 border-b bg-[#fff9f9]">
          <CardTitle className="text-base text-[#bc3342] font-semibold">
            Role Menu Assignment
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Role & User Selector */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Select Role
              </label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 min-w-[220px]"
                value={selectedRole || ""}
                onChange={handleRoleChange}
              >
                <option value="">-- Select Role --</option>
                {roles.map((role) => (
                  <option key={role.RoleID} value={role.RoleID}>
                    {role.RoleName}
                  </option>
                ))}
              </select>
            </div>

            {users.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Select User
                </label>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2 min-w-[220px]"
                  value={selectedUser ?? ""}
                  onChange={handleUserChange}
                >
                  <option value="">-- All Users (Role Level) --</option>
                  {users.map((u) => (
                    <option key={u.UserID} value={u.UserID}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <p className="text-gray-500 text-sm">Loading menus...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Parent</th>
                    <th className="border px-3 py-2 text-left">Menu</th>
                    <th className="border px-3 py-2 text-center">View</th>
                    <th className="border px-3 py-2 text-center">Add</th>
                    <th className="border px-3 py-2 text-center">Edit</th>
                    <th className="border px-3 py-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {menuAccess.length > 0 ? (
                    menuAccess.map((menu) => (
                      <tr key={menu.MenuID}>
                        <td className="border px-3 py-2 text-gray-700">
                          {menu.ParentMenuTitle || "-"}
                        </td>
                        <td className="border px-3 py-2 font-medium">
                          {menu.MenuTitle}
                        </td>
                        {["CanView", "CanAdd", "CanEdit", "CanDelete"].map(
                          (perm) => (
                            <td key={perm} className="border px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={(menu as any)[perm]}
                                onChange={() =>
                                  handleCheckbox(menu.MenuID, perm as any)
                                }
                              />
                            </td>
                          )
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-3 text-gray-500">
                        No menu items found for this role/user.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-[#bc3342] hover:bg-[#a92d3b] text-white px-6 py-2 rounded-md font-medium shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleMenuAccess;
