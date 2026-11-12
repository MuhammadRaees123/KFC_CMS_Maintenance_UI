import { getCurrentUser } from "@/types/auth";

/** Verified technician RoleId used by backend maintenance SPs. */
export const TECHNICIAN_ROLE_ID = 14;

export type DashboardSectionFlags = {
  technicianWorkload: boolean;
  branchInventory: boolean;
  inventoryComplaint: boolean;
};

const normalizePath = (value: string): string => {
  const trimmed = (value || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const readAllowedRoutes = (): string[] => {
  try {
    const raw = localStorage.getItem("allowedRoutes");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((route) => normalizePath(String(route ?? "")))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const hasRoute = (routes: string[], target: string): boolean => {
  const normalizedTarget = normalizePath(target);
  return routes.some((route) => route === normalizedTarget);
};

/**
 * Frontend UX resolver only — backend JWT/SPs remain authoritative for data.
 * CRM Complaint Analytics is intentionally excluded from GeneralDashboard.
 */
export const resolveDashboardSections = (
  allowedRoutes?: string[],
): DashboardSectionFlags => {
  const routes = allowedRoutes ?? readAllowedRoutes();

  return {
    technicianWorkload: hasRoute(routes, "/inventory/technician-dashboard"),
    branchInventory: hasRoute(
      routes,
      "/inventory/branch-inventory-analytics",
    ),
    inventoryComplaint: hasRoute(routes, "/inventory/complaint-analytics"),
  };
};

export const hasAnyDashboardSection = (
  flags: DashboardSectionFlags,
): boolean =>
  flags.technicianWorkload ||
  flags.branchInventory ||
  flags.inventoryComplaint;

export const getLoggedInRoleId = (): number | null => {
  const raw = getCurrentUser()?.roleId;
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};
