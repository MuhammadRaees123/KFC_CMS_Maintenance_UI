// ✅ auth.ts — fully dynamic version

export type Role = string;  // 🔹 accept any role name from DB

export interface User {
  id?: number | string;
  name?: string;
  role?: Role;           // comes from user.roleText (dynamic)
  roleId?: number | string;
  branchId?: number;
  regionId?: number;
  accessType?: string;
  token?: string;
}

// ✅ helper: read current user safely
export const getCurrentUser = (): User | null => {
  try {
    const data = localStorage.getItem("user");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// ✅ helper: check if user is logged in
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

// ✅ helper: check role (case-insensitive, dynamic)
export const hasRole = (allowedRoles?: Role[]): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true; // allow all
  const user = getCurrentUser();
  if (!user?.role) return false;

  // normalize case for comparison
  const currentRole = user.role.toLowerCase();
  return allowedRoles.some((r) => r.toLowerCase() === currentRole);
};
