export const COMPLAINT_TYPES = [
  "Broken",
  "Damaged",
  "NotWorking",
  "ElectricalIssue",
  "MechanicalIssue",
  "Uncomfortable",
  "MissingPart",
  "Leakage",
  "Overheating",
  "NoiseIssue",
  "PowerIssue",
  "DisplayIssue",
  "NetworkIssue",
  "Expired",
  "SafetyIssue",
  "CleaningRequired",
  "PreventiveMaintenance",
  "ReplacementRequired",
  "CalibrationRequired",
  "Other",
] as const;

export const PRIORITIES = ["Low", "Medium", "High"] as const;

export const MAINTENANCE_STATUSES = [
  "Open",
  "Approved",
  "Assigned",
  "InProgress",
  "Pending",
  "WorkLoad",
  "SparePartRequired",
  "Repaired",
  "Closed",
] as const;

export const TECHNICIAN_WORK_STATUSES = [
  "Pending",
  "WorkLoad",
  "SparePartRequired",
] as const;

export const TECHNICIAN_DASHBOARD_STATUSES = [
  "Assigned",
  "InProgress",
  "Pending",
  "WorkLoad",
  "SparePartRequired",
  "Repaired",
  "Closed",
] as const;

export const TECHNICIAN_ACTION_TYPES = [
  "Pending",
  "WorkLoad",
  "SparePartRequired",
  "JobTimeChanged",
] as const;

export const JOB_TIME_OPTIONS = [2, 4, 8] as const;

export const DEFAULT_JOB_TIME_HOURS = 2;

export const MAX_JOB_TIME_HOURS = 72;

export type RemainingJobTime = {
  remainingMilliseconds: number | null;
  formattedTime: string;
  isExpired: boolean;
};

const padTime = (value: number) => String(value).padStart(2, "0");

export function calculateRemainingJobTime(
  assignedDate?: unknown,
  jobTimeHours?: unknown,
  status?: unknown,
  completedDate?: unknown,
  now: number = Date.now()
): RemainingJobTime {
  const hours = Number(jobTimeHours);
  const assignedMs = new Date(
    assignedDate as string | number | Date
  ).getTime();

  if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(assignedMs)) {
    return {
      remainingMilliseconds: null,
      formattedTime: "-",
      isExpired: false,
    };
  }

  const statusText = String(status ?? "");
  const stopped = statusText === "Repaired" || statusText === "Closed";
  let clockMs = now;
  if (stopped) {
    const completedMs = new Date(
      completedDate as string | number | Date
    ).getTime();
    clockMs = Number.isFinite(completedMs) ? completedMs : now;
  }

  const deadlineMs = assignedMs + hours * 60 * 60 * 1000;
  const remaining = deadlineMs - clockMs;
  if (remaining <= 0) {
    return {
      remainingMilliseconds: 0,
      formattedTime: "00:00:00",
      isExpired: !stopped,
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hoursPart = Math.floor(totalSeconds / 3600);
  const minutesPart = Math.floor((totalSeconds % 3600) / 60);
  const secondsPart = totalSeconds % 60;

  return {
    remainingMilliseconds: remaining,
    formattedTime: `${padTime(hoursPart)}:${padTime(minutesPart)}:${padTime(secondsPart)}`,
    isExpired: false,
  };
}

export function complaintRowClassName(isExpired: boolean) {
  return isExpired ? "bg-red-100 hover:bg-red-200" : "hover:bg-gray-50";
}

export const INVENTORY_STATUSES = [
  "Active",
  "UnderRepair",
  "Inactive",
  "Disposed",
] as const;

export const INVENTORY_CONDITIONS = [
  "Good",
  "Fair",
  "Damaged",
  "Poor",
] as const;

export const ITEM_TYPES = ["Asset", "Consumable", "SparePart"] as const;

export function formatDate(value?: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  try {
    const d = new Date(value as string | number | Date);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

export function formatDateTime(value?: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  try {
    const d = new Date(value as string | number | Date);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export function formatMoney(value?: unknown) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatJobTime(value?: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return "-";
  return hours === 1 ? "1 Hour" : `${hours} Hours`;
}

export function parseJobTimeHours(value: string) {
  if (!value.trim()) return null;
  const hours = Number(value);
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_JOB_TIME_HOURS) return null;
  return hours;
}

export function isTechnicianWorkStatus(status?: string | null) {
  return TECHNICIAN_WORK_STATUSES.includes(status as (typeof TECHNICIAN_WORK_STATUSES)[number]);
}

export function apiErrorMessage(error: unknown, fallback = "Something went wrong.") {
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

export function pickField<T = string | number>(obj: unknown, ...keys: string[]): T | undefined {
  if (obj === null || obj === undefined || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

export const MAINTENANCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MAINTENANCE_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export function resolveMaintenanceImageUrl(path?: string | null): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:")) return trimmed;

  const { origin } = window.location;
  const API_PATH = "/KFCMaintenanceAPI";

  if (origin === "https://hds.kfcpakistan.com") {
    return `${origin}${API_PATH}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  }

  if (
    origin === "http://172.16.35.5:125" ||
    origin === "http://172.16.35.6:125"
  ) {
    return `${origin}${API_PATH}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  }

  const envBase = import.meta.env.VITE_API_BASE_URL || "https://localhost:44366/api";
  const originBase = String(envBase).replace(/\/api\/?$/i, "");
  return `${originBase}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function validateMaintenanceImageFile(file: File): string | null {
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  if (!allowedExt.includes(ext)) {
    return "Invalid image type. Allowed: JPG, JPEG, PNG, WEBP.";
  }
  if (file.size > MAINTENANCE_IMAGE_MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}
