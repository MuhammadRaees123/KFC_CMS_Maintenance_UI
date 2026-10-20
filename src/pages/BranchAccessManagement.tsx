import React, { useState, useEffect } from "react";
import {
  getAllRoles,
  getUsersByRole,
  getBranchAccess,
  saveBranchAccess,
} from "@/services/api";
import { BranchAccess } from "@/services/api";
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

// interface BranchAccess {
//   branchId: number;
//   branchName: string;
//   regionId: number;
//   regionName?: string; // optional if not returned yet
//   isSelected: boolean;
// }

const BranchAccessManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [branchAccess, setBranchAccess] = useState<BranchAccess[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD ROLES ---------------- */
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await getAllRoles();
      const list = res.data || [];
      setRoles(list);

      if (list.length) {
        setSelectedRole(list[0].RoleID);
        await loadUsers(list[0].RoleID);
        await loadBranchAccess(list[0].RoleID, null);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive",
      });
    }
  };

  /* ---------------- USERS BY ROLE ---------------- */
  const loadUsers = async (roleId: number) => {
    try {
      const res = await getUsersByRole(roleId);
      setUsers(
        (res.data || []).map((u: any) => ({
          UserID: u.userID,
          fullName: u.fullName,
        }))
      );
    } catch {
      setUsers([]);
    }
  };

  /* ---------------- LOAD BRANCH ACCESS ---------------- */
  const loadBranchAccess = async (roleId: number, userId: number | null) => {
    setLoading(true);
    try {
      const data = await getBranchAccess(roleId, userId);
      setBranchAccess(data); // ✅ PERFECT
    } catch {
      toast({
        title: "Error",
        description: "Failed to load branch access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  /* ---------------- HANDLERS ---------------- */
  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = Number(e.target.value);
    if (!roleId) return;

    setSelectedRole(roleId);
    setSelectedUser(null);
    await loadUsers(roleId);
    await loadBranchAccess(roleId, null);
  };

  const handleUserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value ? Number(e.target.value) : null;
    setSelectedUser(userId);
    if (selectedRole) await loadBranchAccess(selectedRole, userId);
  };

  const toggleBranch = (branchId: number) => {
    setBranchAccess(prev =>
      prev.map(b =>
        b.branchId === branchId
          ? { ...b, isSelected: !b.isSelected }
          : b
      )
    );
  };

  useEffect(() => {
    console.log("Branch state:", branchAccess);
  }, [branchAccess]);

  /* ---------------- SAVE ---------------- */
  // const handleSave = async () => {
  //   if (!selectedRole) {
  //     toast({
  //       title: "Select Role",
  //       description: "Please select a role before saving.",
  //       variant: "destructive",
  //     });
  //     return;
  //   }

  //   const payload = branchAccess.map((b) => ({
  //     RoleID: selectedRole,
  //     UserID: selectedUser,
  //     BranchID: b.branchId,
  //     IsActive: b.isSelected,
  //     CreatedBy: 1,
  //   }));

  //   try {
  //     await saveBranchAccess(payload);

  //     toast({
  //       title: "✅ Success",
  //       description: "Branch access saved successfully",
  //     });
  //   } catch {
  //     toast({
  //       title: "Error",
  //       description: "Failed to save branch access",
  //       variant: "destructive",
  //     });
  //   }
  // };



  const handleSave = async () => {
  if (!selectedRole) {
    toast({
      title: "Select Role",
      description: "Please select a role before saving.",
      variant: "destructive",
    });
    return;
  }

  const payload = branchAccess.map((b) => ({
    RoleID: selectedRole,
    UserID: selectedUser,
    BranchID: b.branchId,
    IsActive: b.isSelected,
    CreatedBy: 1,
  }));

  try {
    await saveBranchAccess(payload);

    toast({
      title: "✅ Success",
      description: "Branch access saved successfully",
    });

    /* 🔄 RESET STATE (SAFE) */
    setSelectedUser(null);

    setBranchAccess(prev =>
      prev.map(b => ({ ...b, isSelected: false }))
    );

  } catch {
    toast({
      title: "Error",
      description: "Failed to save branch access",
      variant: "destructive",
    });
  }
};



  const branchesByRegion = branchAccess.reduce((acc: any, b) => {
    if (!acc[b.regionName]) acc[b.regionName] = [];
    acc[b.regionName].push(b);
    return acc;
  }, {});

  const toggleRegion = (regionName: string, checked: boolean) => {
    setBranchAccess(prev =>
      prev.map(b =>
        b.regionName === regionName
          ? { ...b, isSelected: checked }
          : b
      )
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-[#bc3342]">
        Role & Branch Access
      </h1>

      <Card className="border-l-4 border-l-[#bc3342] shadow-sm">
        <CardHeader className="py-2 border-b bg-[#fff9f9]">
          <CardTitle className="text-base text-[#bc3342] font-semibold">
            Role Branch Assignment
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Role / User */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-x-6 gap-y-4 mb-6">
            <div className="lg:col-span-3">
              <label className="text-sm font-medium">Select Role</label>
              <select
                className="border rounded px-3 py-2 min-w-[220px]"
                value={selectedRole ?? ""}
                onChange={handleRoleChange}
              >
                <option value="">-- Select Role --</option>
                {roles.map((r) => (
                  <option key={r.RoleID} value={r.RoleID}>
                    {r.RoleName}
                  </option>
                ))}
              </select>
            </div>

            {users.length > 0 && (
              <div className="lg:col-span-3">
                <label className="text-sm font-medium">Select User</label>
                <select
                  className="border rounded px-3 py-2 min-w-[220px]"
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


            <div className="lg:col-span-3 flex items-end pt-5">
              <button
                onClick={handleSave}
                className="bg-[#bc3342] hover:bg-[#a92d3b] text-white px-6 py-2 rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>






          <div className="mt-4">
            {/* Table */}
            {/* {loading ? (
            <p className="text-gray-500 text-sm">Loading branches...</p>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Region</th>
                  <th className="border px-3 py-2 text-left">Branch</th>
                  <th className="border px-3 py-2 text-center">Allow</th>
                </tr>
              </thead>
              <tbody>
                {branchAccess.map((b) => (
                  <tr key={b.branchId}>
                    <td className="border px-3 py-2">{b.regionName}</td>
                    <td className="border px-3 py-2 font-medium">
                      {b.branchName}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={b.isSelected}
                        onChange={() => toggleBranch(b.branchId)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )} */}






            {Object.keys(branchesByRegion).map(region => {
              const branches = branchesByRegion[region];
              const allChecked = branches.every((b: any) => b.isSelected);

              return (
                <div key={region} className="mb-6">
                  {/* REGION HEADER */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {region}
                    </h3>

                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => toggleRegion(region, e.target.checked)}
                        className="accent-[#bc3342]"
                      />
                      Select All
                    </label>
                  </div>

                  {/* BRANCH GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {branches.map((b: any) => (
                      <div
                        key={b.branchId}
                        className={`flex items-center justify-between border rounded-lg px-3 py-2 transition
              ${b.isSelected ? "bg-[#fff5f6] border-[#bc3342]" : "bg-white hover:bg-gray-50"}
            `}
                      >
                        <div className="pr-3">
                          <div className="font-medium text-sm">{b.branchName}</div>
                        </div>

                        <input
                          type="checkbox"
                          checked={b.isSelected}
                          onChange={() => toggleBranch(b.branchId)}
                          className="h-4 w-4 accent-[#bc3342]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}


          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchAccessManagement;
