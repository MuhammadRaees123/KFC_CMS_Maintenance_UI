import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "@/hooks/use-toast";
import { navigateTo } from "@/utils/navigation";

/* ----------------------------
   Axios Base Configuration
----------------------------- */

// const resolveBaseURL = () => {
//   const { origin } = window.location;

//   // 🔴 Production – IIS Virtual Directory
//   if (origin.includes("https://kfcisb.ufone.com") ){
//     return "https://kfcisb.ufone.com/KFC_CMS_API/api";
//   }

//   // 🟡 Staging / UAT (example)
//   else if (origin.includes("172.16.35.5:125") ){
//     return "http://172.16.35.5:125/KFC_CMS_API/api";
//   }

//   else if (origin.includes("172.16.35.6:125") ){
//     return "http://172.16.35.5:125/KFC_CMS_API/api";
//   }

//   // else if (origin.includes("172.16.35.6:125") ) {
//   //   return "http://localhost:125/KFC_CMS_API/api";
//   // }

//   else
//   {
//     return import.meta.env.VITE_API_BASE_URL || "http://localhost:5027/api";
//   }

//   // else if (origin.includes("192") ){
//   //   return "http://172.16.35.5:125/KFC_CMS_API/api";
//   // }
  
//   // 🟢 Local fallback
//   //return import.meta.env.VITE_API_BASE_URL || "http://localhost:5027/api";
// };


const resolveBaseURL = () => {
  const { origin } = window.location;

  const API_PATH = "/KFCMaintenanceAPI/api";

  // 🔴 Production
  if (origin === "https://hds.kfcpakistan.com") {
    return `${origin}${API_PATH}`;
  }

  // 🟡 Internal / UAT
  if (
    origin === "http://172.16.35.5:125" ||
    origin === "http://172.16.35.6:125"
  ) {
    return `${origin}${API_PATH}`;
  }

  // 🟢 Local / fallback
  return import.meta.env.VITE_API_BASE_URL || "https://localhost:44366/api";
  //https://localhost:44366/swagger/index.html
};


const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 220000,
  headers: {
    "Content-Type": "application/json",
  },
});

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5027/api",
//   timeout: 30000,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

/* ----------------------------
   Request Interceptor
   (Check token expiry)
----------------------------- */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          // 🕒 Token expired — logout user
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("isAuthenticated");

          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          navigateTo("/login");
          throw new Error("Token expired");
        }

        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("JWT decode error:", error);
        localStorage.removeItem("token");
        navigateTo("/login");
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ----------------------------
   Response Interceptor
----------------------------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");

      navigateTo("/login");
    }

    return Promise.reject(error);
  }
);

/* ----------------------------
   Dashboard & Menu APIs
----------------------------- */
//export const getComplaintSummary = () => api.get("/dashboard/GetComplaintSummary");

export const getMenuByRole = () => api.get("/menu/GetMenuByRole");


// 🟥 1. Complaint Summary
export const getComplaintSummary = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/dashboard/GetComplaintSummary?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined)
  params.push(`regionId=${regionId}`);
if (branchId !== null && branchId !== undefined)
  params.push(`branchId=${branchId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res;
  } catch (error) {
    console.error("Error fetching complaint summary:", error);
    throw error;
  }
};



// 🟡 2. Complaint Trend
export const getComplaintTrend = async (
  rangeType: "day" | "week" | "month" = "day",
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/dashboard/GetComplaintTrend?rangeType=${rangeType}`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined)
  params.push(`regionId=${regionId}`);
if (branchId !== null && branchId !== undefined)
  params.push(`branchId=${branchId}`);

    if (params.length) url += `&${params.join("&")}`;

    const res = await api.get(url);
    return res;
  } catch (error) {
    console.error("Error fetching complaint trend:", error);
    throw error;
  }
};



// 🔵 3. Top Complaint Types
export const getTopComplaintTypes = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/dashboard/GetTopComplaintTypes?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined)
  params.push(`regionId=${regionId}`);
if (branchId !== null && branchId !== undefined)
  params.push(`branchId=${branchId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res;
  } catch (error) {
    console.error("Error fetching top complaint types:", error);
    throw error;
  }
};


export const getStoreWiseComplaintsHeatmap = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null
) => {
  try {
    let url = `/dashboard/GetStoreWiseComplaintsHeatmap?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined)
      params.push(`regionId=${regionId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res;
  } catch (error) {
    console.error("Error fetching store-wise heatmap data:", error);
    throw error;
  }
};


// Get filter access flags (role-based visibility)
export const getDashboardFilterAccess = async () => {
  const res = await api.get("/dashboard/GetDashboardFilterAccess");
  return res;
};

// Get region list
export const getRegionsForDashboard = async () => {
  const res = await api.get("/dashboard/GetRegionsForDashboard");
  return res;
};

// Get branch list (filtered by region)
export const getBranchesForDashboard = async (regionId?: number ) => {
  const res = await api.get(`/dashboard/GetBranchesForDashboard?regionId=${regionId ?? 0}`);
  return res;
};

export interface StoreHighComplaints {
  branchID: number;
  branchName: string;
  region: string;
  totalComplaints: number;
  categories: Record<string, number>;
}


export const getStoreWiseHighComplaints = async (
  startDate?: string,
  endDate?: string,
  regionId?: string | null
): Promise<StoreHighComplaints[]> => {
  try {
    let url = `/dashboard/GetStoreWiseHighComplaints?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId) params.push(`regionId=${encodeURIComponent(regionId)}`);

    if (params.length) url += params.join("&");

    const res = await api.get<StoreHighComplaints[]>(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching store-wise high complaints:", error);
    throw error;
  }
};

export interface ComplaintChannelWise {
  complaintChannel: string;
  totalComplaints: number;
}

export const getComplaintChannelWise = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
): Promise<ComplaintChannelWise[]> => {
  try {
    let url = `/dashboard/GetComplaintChannelWise?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }
    if (regionId) params.push(`regionId=${encodeURIComponent(regionId)}`);
    if (branchId) params.push(`branchId=${encodeURIComponent(branchId)}`);

    if (params.length) url += params.join("&");

    const res = await api.get<ComplaintChannelWise[]>(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching complaint channels:", error);
    throw error;
  }
};




export const getComplaintSourceWise = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
): Promise<ComplaintChannelWise[]> => {
  try {
    let url = `/dashboard/GetComplaintSourceWise?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }
    if (regionId) params.push(`regionId=${encodeURIComponent(regionId)}`);
    if (branchId) params.push(`branchId=${encodeURIComponent(branchId)}`);

    if (params.length) url += params.join("&");

    const res = await api.get<ComplaintChannelWise[]>(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching complaint channels:", error);
    throw error;
  }
};

// export const loadAllowedRoutes = async (): Promise<string[]> => {
//   try {
//     const response = await getMenuByRole();
//     const menus = Array.isArray(response.data)
//       ? response.data
//       : JSON.parse(response.data || "[]");

//     const routes: string[] = [];
//     menus.forEach((menu: any) => {
//       if (menu.url) routes.push(menu.url.toLowerCase());
//       if (Array.isArray(menu.subMenus)) {
//         menu.subMenus.forEach((sub: any) => {
//           if (sub.url) routes.push(sub.url.toLowerCase());
//         });
//       }
//     });

//     localStorage.setItem("allowedRoutes", JSON.stringify(routes));
//     return routes;
//   } catch (err) {
//     console.error("❌ Failed to load allowed routes:", err);
//     localStorage.removeItem("allowedRoutes");
//     return [];
//   }
// };


export const loadAllowedRoutes = async (): Promise<string[]> => {
  try {
    const response = await api.get("/menu/GetMenuByRole");

    // Expecting array of menus/submenus from backend
    const menus = Array.isArray(response.data)
      ? response.data
      : JSON.parse(response.data || "[]");

    const routes: string[] = [];

    const normalizeMenuUrl = (url: string): string => {
      const trimmed = url.trim().toLowerCase();
      if (!trimmed || trimmed === ".") return "";
      return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    };

    const extractRoutes = (menuList: any[]) => {
      for (const menu of menuList) {
        // only include valid, non-empty URLs
        if (menu.url && menu.url.trim() !== "." && menu.url.trim() !== "") {
          const normalized = normalizeMenuUrl(menu.url);
          if (normalized) routes.push(normalized);
        }
        if (menu.subMenus && menu.subMenus.length > 0) {
          extractRoutes(menu.subMenus);
        }
      }
    };

    extractRoutes(menus);

    // 🧠 Cache locally for use by PrivateRoute & app refresh
    localStorage.setItem("allowedRoutes", JSON.stringify(routes));
    localStorage.setItem("allowedRoutesFetchedAt", Date.now().toString());

   // console.log("✅ Routes loaded for role:", routes);
    return routes; // ✅ return usable array
  } catch (error) {
    console.error("❌ Error loading allowed routes:", error);
    return []; // return empty array safely
  }
};

export const getAllMenus = async () => await api.get("/menu/getAllMenus");

export const saveMenu = async (menu: any) => await api.post("/menu/saveMenu", menu);

export const deleteMenu = async (id: number) => await api.delete(`/menu/deleteMenu/${id}`);

export const restoreMenu = async (id: number) => await api.put(`/menu/restoreMenu/${id}`);

export const getUsersByRole = (roleId: number) =>
  api.get(`/menu/GetUsersByRole/${roleId}`);

export const getMaintenanceAssignUsers = () =>
  api.get("/menu/GetMaintenanceAssignUsers");

/* ----------------------------
   Role & Access Management
----------------------------- */
export const getAllRoles = () => api.get("/menu/GetAllRoles");

export const getRoles = () => api.get("/Role");

export const addRole = (data: {
  Name: string;
  Access_Type?: string | null;
  Description?: string | null;
  RoleId?: string | null;
}) => api.post("/Role", data);

export const updateRole = (
  id: number,
  data: {
    Name: string;
    Access_Type?: string | null;
    Description?: string | null;
    RoleId?: string | null;
  }
) => api.put(`/Role/${id}`, data);

export const deleteRole = (id: number) => api.delete(`/Role/${id}`);

export const getUsers = () => api.get("/User");

export const getUserById = (id: number) => api.get(`/User/${id}`);

export const addUser = (data: {
  Name: string;
  UserName: string;
  Password: string;
  Access_Type: string;
  Branch: number;
  Address?: string | null;
  Designation?: string | null;
  CellNumber?: string | null;
  regionID: number;
  RoleId?: string | null;
  RoleText?: string | null;
  email?: string | null;
}) => api.post("/User", data);

export const updateUser = (
  id: number,
  data: {
    Name: string;
    UserName: string;
    Password?: string | null;
    Access_Type: string;
    Branch: number;
    Address?: string | null;
    Designation?: string | null;
    CellNumber?: string | null;
    regionID: number;
    RoleId?: string | null;
    RoleText?: string | null;
    email?: string | null;
  }
) => api.put(`/User/${id}`, data);

export const deleteUser = (id: number) => api.delete(`/User/${id}`);

export const getRoleMenuAccess = (roleId: number, userId?: number) =>
  api.get(`/menu/GetRoleMenuAccess?roleId=${roleId}${userId ? `&userId=${userId}` : ""}`);

export const saveRoleMenuAccess = (data: any) =>
  api.post("/menu/SaveRoleMenuAccess", data);

/* ----------------------------
   Login & Auth Management
----------------------------- */

// ✅ Proper response interface
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    roleText?: string;
    roleId?: string;
    accessType?: string;
    branchId?: number;
    regionId?: number;
    [key: string]: any;
  };
}

// ✅ Login user (typed)
export const loginUser = async (credentials: {
  username: string;
  password: string;
}): Promise<LoginResponse> => {
  try {
    // 1️⃣ Login API call
    const res = await api.post<LoginResponse>("/auth/login", credentials);
    const data = res.data;

   // console.log("🔹 Login API Response:", data);

    if (data?.token && data?.user) {
      // 2️⃣ Store token & user immediately
      localStorage.setItem("token", data.token);

      const user = {
        id: data.user.id,
        name: data.user.name,
        role: data.user.roleText || data.user.role || data.user.roleName,
        roleId: data.user.roleId,
        branchId: data.user.branchId,
        regionId: data.user.regionId,
        accessType: data.user.accessType,
        token: data.token,
      };

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isAuthenticated", "true");

      // 3️⃣ Give the interceptor a short moment to attach token
      await new Promise((res) => setTimeout(res, 400));

      // 4️⃣ Fetch role-based menus and allowed routes
      const allowed = await loadAllowedRoutes();

     // console.log("✅ allowedRoutes fetched:", allowed);
      if (!allowed || allowed.length === 0)
        console.warn("⚠️ No routes found for this role — check /menu/GetMenuByRole");

      return data;
    } else {
      throw new Error("Invalid login response from server");
    }
  } catch (err: any) {
    console.error("❌ loginUser failed:", err);
    throw err;
  }
};


// ✅ Logout user globally
export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
  navigateTo("/login");
};


//*----------------------------
// Complaint Listing APIs
//----------------------------- */

export const getSourcesForDashboard = async () => {
  try {
    const res = await api.get("/complaint/getSourcesForDashboard");
    return res;
  } catch (error) {
    console.error("Error fetching sources:", error);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    const res = await api.get("/complaint/getCategories");
    return res;
  } catch (error) {
    console.error("Error fetching Categories:", error);
    throw error;
  }
};


export const getCompStatus = async () => {
  try {
    const res = await api.get("/complaint/getComplaintStatus");
    return res;
  } catch (error) {
    console.error("Error fetching Status:", error);
    throw error;
  }
};


export const getCompTypes = async () => {
  try {
    const res = await api.get("/complaint/getComplaintTypes");
    return res;
  } catch (error) {
    console.error("Error fetching Types:", error);
    throw error;
  }
};

// 🔹 Get Complaint List
// export const getComplaintList = async (params: {
//   startDate?: string;
//   endDate?: string;
//   regionId?: number | null;
//   orderNo?: string;
//   contactNo?: string;
//   name?: string;
//   orderStatus?: string;
//   branchId?: number | null;

//   complaintCategory?: string;
//   status?: string;
//   source?: string;
//   type?: string;
// }) => {
//   try {
//     const query = new URLSearchParams();

//     if (params.startDate) query.append("startDate", params.startDate);
//     if (params.endDate) query.append("endDate", params.endDate);
//     if (params.orderNo) query.append("orderNo", params.orderNo);
//     if (params.contactNo) query.append("contactNo", params.contactNo);
//     if (params.name) query.append("name", params.name);
//     if (params.orderStatus) query.append("orderStatus", params.orderStatus);
//     if (params.branchId) query.append("branchId", params.branchId.toString());
//     if (params.regionId) query.append("regionId", params.regionId.toString());
//     if (params.complaintCategory) query.append("complaintCategory", params.complaintCategory);
//     if (params.status) query.append("status", params.status);
//     if (params.source) query.append("source", params.source);
//     if (params.type) query.append("type", params.type);

//     const res = await api.get(`/complaint/GetComplaintList?${query.toString()}`);
//     return res;
//   } catch (error) {
//     console.error("Error fetching complaints:", error);
//     throw error;
//   }
// };


export const getComplaintList = async (params: {
  startDate?: string;
  endDate?: string;
  regionId?: number | null;
  orderNo?: string;
  contactNo?: string;
  name?: string;
  orderStatus?: string;
  branchId?: number | null;
  complaintCategory?: string;
  status?: string;
  source?: string;
  type?: string;
}) => {
  try {
    // ✅ helper to clean & format date
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);

      // Format as MM/DD/YYYY (remove time completely)
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const year = date.getFullYear();

      return `${month}/${day}/${year}`;
    };

    const query = new URLSearchParams();

    if (params.startDate) query.append("startDate", formatDate(params.startDate));
    if (params.endDate) query.append("endDate", formatDate(params.endDate));
    if (params.orderNo) query.append("orderNo", params.orderNo.trim());
    if (params.contactNo) query.append("contactNo", params.contactNo.trim());
    if (params.name) query.append("name", params.name.trim());
    if (params.orderStatus) query.append("orderStatus", params.orderStatus);
    if (params.branchId) query.append("branchId", params.branchId.toString());
    if (params.regionId) query.append("regionId", params.regionId.toString());
    if (params.complaintCategory) query.append("complaintCategory", params.complaintCategory);
    if (params.status) query.append("status", params.status);
    if (params.source) query.append("source", params.source);
    if (params.type) query.append("type", params.type);

    const res = await api.get(`/complaint/GetComplaintList?${query.toString()}`);
    return res;
  } catch (error) {
    console.error("Error fetching complaints:", error);
    throw error;
  }
};

//Report APIs can be added here similarly

export const exportRiderPerformanceReport = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null,
  riderId?: number | null
) => {
  const params = new URLSearchParams();

  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (regionId) params.append("regionId", regionId.toString());
  if (branchId) params.append("branchId", branchId.toString());
  if (riderId) params.append("riderId", riderId.toString());

  const response = await api.get(`/reports/ExportRPSummary?${params.toString()}`, {
    responseType: "blob",
  });

  // Download Excel file
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "RiderPerformanceReport.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export interface RiderPerformance {
  region: string;
  branchName: string;
  riderName: string;
  employeeID: string;
  riderStatus: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelRejectOrders: number;
  cancelRejectPct: number;
  complaints: number;
  complaintsPct: number;
  invalidComplaints: number;
  sosPct: number;
  sosMinutes: number;
  istMinutes: number;
  istPct: number;
  workingDays: number;
  productivity: number;
  perDayOrders: number;
}

export const getRiderPerformanceReport = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null,
  riderId?: number | null
): Promise<RiderPerformance[]> => {
  try {
    const res = await api.get<RiderPerformance[]>("/reports/GetRPSummary", {
      params: {
        startDate: startDate || "",
        endDate: endDate || "",
        regionId: regionId ?? 0,
        branchId: branchId ?? 0,
        riderId: riderId ?? 0,
      },
    });

    return res.data;
  } catch (error) {
    console.error("Error fetching rider performance report:", error);
    throw error;
  }
};


export const getRidersForBranch = async (params: {
  
  branchId?: number | null;
}) => {
  try {
    const query = new URLSearchParams();

    
    if (params.branchId) query.append("branchId", params.branchId.toString());
   

    const res = await api.get(`/Reports/GetRidersForBranch?${query.toString()}`);
    return res;
  } catch (error) {
    console.error("Error fetching Rider Performance Report:", error);
    throw error;
  }
};


//KHADIM APIs can be added here similarly
// 🟦 KHADIM: Summary
export const getKhadimSummary = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/khadimDashboard/GetSummary?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined)
      params.push(`regionId=${regionId}`);

    if (branchId !== null && branchId !== undefined)
      params.push(`branchId=${branchId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res;
  } catch (error) {
    console.error("Error fetching Khadim summary:", error);
    throw error;
  }
};


// 🟦  Khadim Dashboard – Category Wise Summary
export const getKhadimCategorySummary = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/khadimDashboard/GetKhadimCategorySummary?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined) {
      params.push(`regionId=${regionId}`);
    }

    if (branchId !== null && branchId !== undefined) {
      params.push(`branchId=${branchId}`);
    }

    if (params.length) {
      url += params.join("&");
    }

    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching Khadim category summary:", error);
    throw error;
  }
};

// Department summary
export const getKhadimDepartmentSummary = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/khadimDashboard/GetKhadimDepartmentSummary?`;
    const params: string[] = [];
    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }
    if (regionId !== null && regionId !== undefined) params.push(`regionId=${regionId}`);
    if (branchId !== null && branchId !== undefined) params.push(`branchId=${branchId}`);
    if (params.length) url += params.join("&");
    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching department summary", error);
    throw error;
  }
};

// Department trend
export const getKhadimDepartmentTrend = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null,
  topN: number = 5
) => {
  try {
    let url = `/khadimDashboard/GetKhadimDepartmentTrend?topN=${topN}`;
    const params: string[] = [];
    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }
    if (regionId !== null && regionId !== undefined) params.push(`regionId=${regionId}`);
    if (branchId !== null && branchId !== undefined) params.push(`branchId=${branchId}`);
    if (params.length) url += `&` + params.join("&");
    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching department trend", error);
    throw error;
  }
};


// 🟥  Branch-Wise Complaint Leaderboard
export const getKhadimBranchLeaderboard = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/khadimDashboard/GetBranchWiseSummary?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined) {
      params.push(`regionId=${regionId}`);
    }

    if (branchId !== null && branchId !== undefined) {
      params.push(`branchId=${branchId}`);
    }

    if (params.length > 0) url += params.join("&");

    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching Branch Leaderboard:", error);
    throw error;
  }
};

// 🟥  Repeat Complaints
export const getKhadimRepeatComplaints = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/KhadimDashboard/GetKhadimRepeatComplaints?`;
    const params: string[] = [];

    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    if (regionId !== null && regionId !== undefined)
      params.push(`regionId=${regionId}`);

    if (branchId !== null && branchId !== undefined)
      params.push(`branchId=${branchId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;
  } catch (err) {
    console.error("Error fetching repeat complaints:", err);
    return [];
  }
};

export const getComplaintAgingReport = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    const res = await api.get("/khadimDashboard/GetComplaintAgingReport", {
      params: {
        startDate,
        endDate,
        regionId,
        branchId
      }
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching complaint aging report:", error);
    throw error;
  }
};


export const getTechnicianPerformance = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    const res = await api.get("/khadimDashboard/GetTechnicianPerformance", {
      params: {
        startDate,
        endDate,
        regionId,
        branchId
      }
    });
    return res.data;  // API returns array
  } catch (error) {
    console.error("Error fetching technician performance:", error);
    throw error;
  }
};


// 🟦  Khadim Dashboard – Category Wise Summary


//Customer Sentiment Dashboard APIs can be added here similarly

export const getCustomerJourney = async (
  customerId?: number | null,
  startDate?: string,
  endDate?: string,
  regionId?: string | null,
  branchId?: string | null
) => {
  try {
    const res = await api.get("/customer/GetCustomerJourney", {
      params: {
        customerId,
        startDate,
        endDate,
        regionId,
        branchId,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching customer journey:", error);
    throw error;
  }
};


export const getReorderKPI = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    const res = await api.get("/customer/GetReorderKPI", {
      params: { startDate, endDate, regionId, branchId }
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching reorder KPIs:", error);
    throw error;
  }
};


export const getCustomerTrend = async (
  rangeType: "day" | "week" | "month" = "day",
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/customer/GetCustomerTrend?granularity=${rangeType}`;
    const params: string[] = [];

    // Date filter only when both start & end exist
    if (startDate && endDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }

    // Region filter
    if (regionId !== null && regionId !== undefined)
      params.push(`regionId=${regionId}`);

    // Branch filter
    if (branchId !== null && branchId !== undefined)
      params.push(`branchId=${branchId}`);

    // Attach params
    if (params.length) url += `&${params.join("&")}`;

    const res = await api.get(url);
    return res;
  } catch (error) {
    console.error("Error fetching customer trend:", error);
    throw error;
  }
};


export const getCustomerSegmentation = async (
  regionId?: number | null,
  branchId?: number | null,
  endDate?: string
) => {
  try {
    let url = `/customer/GetCustomerSegmentation?`;
    const params: string[] = [];

    if (regionId !== null && regionId !== undefined)
      params.push(`regionId=${regionId}`);

    if (branchId !== null && branchId !== undefined)
      params.push(`branchId=${branchId}`);

    if (endDate)
      params.push(`endDate=${encodeURIComponent(endDate)}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching segmentation:", error);
    throw error;
  }
};


export const getReorderTimeDistribution = async (
  regionId?: number | string | null,
  branchId?: number | string | null,
  startDate?: string | null,
  endDate?: string | null,
  viewMode: string = "Last90"
) => {
  try {
    let url = `/Customer/GetReorderTimeDistribution?`;
    const params: string[] = [];

    // Convert numbers to string
    const r = regionId != null ? regionId.toString() : null;
    const b = branchId != null ? branchId.toString() : null;

    if (r) params.push(`regionId=${encodeURIComponent(r)}`);
    if (b) params.push(`branchId=${encodeURIComponent(b)}`);

    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (viewMode) params.push(`viewMode=${encodeURIComponent(viewMode)}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;
  } catch (error) {
    console.error("Error fetching reorder distribution:", error);
    throw error;
  }
};





export const getReorderFrequency = async (
  startDate?: string,
  endDate?: string,
  regionId?: string | null,
  branchId?: string | null
) => {
  try {
    const res = await api.get("/customer/GetReorderFrequency", {
      params: { startDate, endDate, regionId, branchId }
    });
    return res.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};


export const getReorderBuckets = async (
  startDate?: string,
  endDate?: string,
  regionId?: string | null,
  branchId?: string | null
) => {
  try {
    const res = await api.get("/customer/GetReorderBuckets", {
      params: { startDate, endDate, regionId, branchId }
    });
    return res.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};


export const getBranchWiseReorder = async (
  startDate?: string,
  endDate?: string,
  regionId?: string | null,
  branchId?: string | null
) => {
  try {
    const res = await api.get("/customer/GetBranchWiseReorder", {
      params: { startDate, endDate, regionId, branchId }
    });
    return res.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};


export const getHighValueRiskCustomers = async (
  startDate?: string,
  endDate?: string,
  regionId?: string | null,
  branchId?: string | null
) => {
  try {
    const res = await api.get("/customer/GetHighValueRisk", {
      params: { startDate, endDate, regionId, branchId }
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching risk customers:", error);
    throw error;
  }
};


export const getReorderRaw = async (
  startDate?: string,
  endDate?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    const res = await api.get("/customer/GetReorderRaw", {
      params: { startDate, endDate, regionId, branchId }
    });
    return res.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};



//Customer Sentiment Dashboard APIs can be added here similarly


//Rider Dashboard APIs can be added here similarly

// ---------------- RIDER DASHBOARD API ----------------

export const getRiderPerformanceSummary = async (
  startDate?: string | null,
  endDate?: string | null,
  regionId?: number | null,
  branchId?: number | null,
  riderId?: number | null
) => {
  try {
    let url = `/Rider/GetRiderPerformanceSummary?`;
    const params: string[] = [];

    if (startDate)
      params.push(`startDate=${encodeURIComponent(startDate)}`);

    if (endDate)
      params.push(`endDate=${encodeURIComponent(endDate)}`);

    if (regionId !== null && regionId !== undefined)
      params.push(`regionId=${regionId}`);

    if (branchId !== null && branchId !== undefined)
      params.push(`branchId=${branchId}`);

    if (riderId !== null && riderId !== undefined)
      params.push(`riderId=${riderId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;

  } catch (error) {
    console.error("Error fetching Rider Performance Summary:", error);
    throw error;
  }
};




//Rider Dashboard APIs can be added here similarly


//Food Analytics Dashboard APIs can be added here similarly
// ⭐ Get Menu KPIs (Single Row from PROC_MenuItem_KPIs)
export const getMenuKPIs = async (
  startDate?: string | null,
  endDate?: string | null,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/FoodAnalytics/GetMenuKPIs?`;
    const params: string[] = [];

    if (startDate)
      params.push(`startDate=${encodeURIComponent(startDate)}`);

    if (endDate)
      params.push(`endDate=${encodeURIComponent(endDate)}`);

    if (regionId !== null && regionId !== undefined)
      params.push(`regionId=${regionId}`);

    if (branchId !== null && branchId !== undefined )
      params.push(`branchId=${branchId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;

  } catch (error) {
    console.error("Error fetching Menu KPIs:", error);
    throw error;
  }
};


export const getMenuItemComplaintKPIs = async (
  startDate?: string | null,
  endDate?: string | null,
  regionId?: number | null,
  branchId?: number | null
) => {

  let url = `/FoodAnalytics/GetMenuItemComplaintKPIs?`;
  const params: string[] = [];

  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
  if (regionId) params.push(`regionId=${regionId}`);
  if (branchId) params.push(`branchId=${branchId}`);

  if (params.length) url += params.join("&");

  const res = await api.get(url);
  return res.data;
};


export const getComplaintKeywords = async (
  startDate?: string | null,
  endDate?: string | null,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/FoodAnalytics/GetComplaintKeywords?`;
    const params: string[] = [];

    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (regionId !== null && regionId !== undefined) params.push(`regionId=${regionId}`);
    if (branchId !== null && branchId !== undefined) params.push(`branchId=${branchId}`);

    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;

  } catch (error) {
    console.error("Error loading Complaint Keywords", error);
    throw error;
  }
};


export const getComplaintKeywordDetails = async (
  startDate?: string | null,
  endDate?: string | null,
  regionId?: number | null,
  branchId?: number | null,
  keyword?: string | null
) => {

  let url = `/FoodAnalytics/GetComplaintKeywordDetails?`;
  const params: string[] = [];

  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
  if (regionId) params.push(`regionId=${regionId}`);
  if (branchId) params.push(`branchId=${branchId}`);
  if (keyword) params.push(`keyword=${encodeURIComponent(keyword)}`);

  if (params.length) url += params.join("&");

  const res = await api.get(url);
  return res.data;
};


//Food Analytics Dashboard APIs can be added here similarly

//----------------------------Branch Performance Dashboard APIs----------------------------

export const getBranchPerformance = async (
  startDate?: string | null,
  endDate?: string | null,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/Branch/GetBranchPerformance?`;
    const params: string[] = [];

    if (startDate)
      params.push(`startDate=${encodeURIComponent(startDate)}`);

    if (endDate)
      params.push(`endDate=${encodeURIComponent(endDate)}`);

    if (regionId !== null && regionId !== undefined)
      params.push(`regionIds=${regionId}`);

    if (branchId !== null && branchId !== undefined)
      params.push(`branchIds=${branchId}`);



    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;

  } catch (error) {
    console.error("Error fetching Rider Performance Summary:", error);
    throw error;
  }
};



export const getBranchPerformancePickup = async (
  startDate?: string | null,
  endDate?: string | null,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    let url = `/Branch/GetBranchPerformancePickup?`;
    const params: string[] = [];

    if (startDate)
      params.push(`startDate=${encodeURIComponent(startDate)}`);

    if (endDate)
      params.push(`endDate=${encodeURIComponent(endDate)}`);

    if (regionId !== null && regionId !== undefined)
      params.push(`regionIds=${regionId}`);

    if (branchId !== null && branchId !== undefined)
      params.push(`branchIds=${branchId}`);



    if (params.length) url += params.join("&");

    const res = await api.get(url);
    return res.data;

  } catch (error) {
    console.error("Error fetching Rider Performance Summary:", error);
    throw error;
  }
};


export const getPaymentModeOrders = async (
  startDate: string,
  endDate: string,
  regionId?: number | null,
  branchId?: number | null
) => {

  let url = `/Branch/GetPaymentModeOrders?`;
  const params: string[] = [];

  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);

  if (regionId !== null && regionId !== undefined)
    params.push(`regionId=${regionId}`);

  if (branchId !== null && branchId !== undefined)
    params.push(`branchId=${branchId}`);

  if (params.length) url += params.join("&");

  const res = await api.get(url);
  return res.data;
};


export const getPaymentModeOrdersPickup = async (
  startDate: string,
  endDate: string,
  regionId?: number | null,
  branchId?: number | null
) => {

  let url = `/Branch/GetPaymentModeOrdersPickup?`;
  const params: string[] = [];

  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);

  if (regionId !== null && regionId !== undefined)
    params.push(`regionId=${regionId}`);

  if (branchId !== null && branchId !== undefined)
    params.push(`branchId=${branchId}`);

  if (params.length) url += params.join("&");

  const res = await api.get(url);
  return res.data;
};


export const GetCancelRejectOrders = async (
  startDate: string,
  endDate: string,
  regionId?: number | null,
  branchId?: number | null
) => {

  let url = `/Branch/GetCancelRejectOrders?`;
  const params: string[] = [];

  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);

  if (regionId !== null && regionId !== undefined)
    params.push(`regionId=${regionId}`);

  if (branchId !== null && branchId !== undefined)
    params.push(`branchId=${branchId}`);

  if (params.length) url += params.join("&");

  const res = await api.get(url);
  return res.data;
};



export const GetCancelRejectOrdersReasonWise = async (
  startDate: string,
  endDate: string,
  regionId?: number | null,
  branchId?: number | null
) => {

  let url = `/Branch/GetOrderReasonWise?`;
  const params: string[] = [];

  if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);

  if (regionId !== null && regionId !== undefined)
    params.push(`regionId=${regionId}`);

  if (branchId !== null && branchId !== undefined)
    params.push(`branchId=${branchId}`);

  if (params.length) url += params.join("&");

  const res = await api.get(url);
  return res.data;
};


// Branch Performance Summary



//Branches Access Roles WIse



export interface BranchAccess {
  branchId: number;
  branchName: string;
  regionId: number;
  regionName?: string;
  isSelected: boolean;
}

export const getBranchAccess = async (
  roleId: number,
  userId?: number | null
) => {
  let url = `/Dashboard/GetBranchAccess?roleId=${roleId}`;
  if (userId) url += `&userId=${userId}`;

  const res = await api.get<BranchAccess[]>(url);
  return res.data;
};

export const saveBranchAccess = async (payload: any[]) => {
  const res = await api.post(`/Dashboard/SaveBranchAccessBulk`, payload);
  return res.data;
};


const buildQuery = (params: Record<string, any>) => {
  return Object.entries(params)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
};

export const GetStoreComparison = async (
  currentFrom: string,
  currentTo: string,
  lastFrom: string,
  lastTo: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  try {
    // 🛑 Basic validation (important)
    if (!currentFrom || !currentTo)
      throw new Error("Current date range is required");

    const query = buildQuery({
      currentFrom,
      currentTo,
      lastFrom,
      lastTo,
      regionId,
      branchId
    });

    const url = `/Branch/GetStoreComparison?${query}`;

    const res = await api.get(url);

    // 🔒 Safe return
    return res?.data || [];
  } catch (error: any) {
    console.error("GetStoreComparison API Error:", error);
    throw error?.response?.data || error;
  }
};


export const exportStoreComparisonReport = async (
  currentFrom?: string,
  currentTo?: string,
  lastFrom?: string,
  lastTo?: string,
  regionId?: number | null,
  branchId?: number | null
) => {
  const params = new URLSearchParams();

  if (currentFrom) params.append("currentFrom", currentFrom);
  if (currentTo) params.append("currentTo", currentTo);
  if (lastFrom) params.append("lastFrom", lastFrom);
  if (lastTo) params.append("lastTo", lastTo);

  if (regionId) params.append("regionId", regionId.toString());
  if (branchId) params.append("branchId", branchId.toString());

  const response = await api.get(
    `/Branch/ExportStoreComparison?${params.toString()}`,
    {
      responseType: "blob",
    }
  );

  // 🔽 Download Excel
  const url = window.URL.createObjectURL(new Blob([response.data]));

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `StoreComparison_${new Date().toISOString().slice(0, 10)}.xlsx`
  );

  document.body.appendChild(link);
  link.click();
  link.remove();
};


/* ----------------------------
   Inventory & Maintenance
----------------------------- */

export const getInventoryCategories = (params?: { includeInactive?: boolean }) =>
  api.get("/Inventory/categories", {
    params: { includeInactive: params?.includeInactive ?? false },
  });

export const getInventoryCategoryById = (id: number) =>
  api.get(`/Inventory/categories/${id}`);

export const saveInventoryCategory = (data: {
  InventoryCategoryId: number;
  CategoryCode: string;
  CategoryName: string;
  Description?: string | null;
  IsActive: boolean;
}) => api.post("/Inventory/categories/save", data);

export const getInventoryItemsMaster = (params?: {
  inventoryCategoryId?: number | null;
  includeInactive?: boolean;
}) =>
  api.get("/Inventory/items", {
    params: {
      inventoryCategoryId: params?.inventoryCategoryId ?? undefined,
      includeInactive: params?.includeInactive ?? false,
    },
  });

export const getInventoryItemMasterById = (id: number) =>
  api.get(`/Inventory/items/${id}`);

export const saveInventoryItemMaster = (data: Record<string, unknown>) =>
  api.post("/Inventory/items/save", data);

export const getInventoryAssets = (params?: {
  branchId?: number | null;
  itemId?: number | null;
  status?: string | null;
  condition?: string | null;
  categoryName?: string | null;
  search?: string | null;
}) =>
  api.get("/Inventory/inventory-items", {
    params: {
      branchId: params?.branchId ?? undefined,
      itemId: params?.itemId ?? undefined,
      status: params?.status || undefined,
      condition: params?.condition || undefined,
      categoryName: params?.categoryName || undefined,
      search: params?.search || undefined,
    },
  });

export const getInventoryAssetById = (id: number) =>
  api.get(`/Inventory/inventory-items/${id}`);

export const saveInventoryAsset = (data: Record<string, unknown>) =>
  api.post("/Inventory/inventory-items/save", data);

export const transferInventoryAsset = (
  id: number,
  data: { ToBranchId: number; Remarks?: string | null }
) => api.post(`/Inventory/inventory-items/${id}/transfer`, data);

export const getInventoryAssetHistory = (id: number) =>
  api.get(`/Inventory/inventory-items/${id}/history`);

export const createMaintenanceComplaint = (data: FormData) =>
  api.post("/Inventory/maintenance/complaints", data, {
    transformRequest: [
      (body, headers) => {
        if (headers && typeof headers === "object") {
          delete (headers as Record<string, unknown>)["Content-Type"];
        }
        return body;
      },
    ],
  });

export const getMaintenanceList = (params?: {
  branchId?: number | null;
  status?: string | null;
  priority?: string | null;
  assignedTo?: number | null;
  search?: string | null;
  categoryId?: number | null;
  pageNumber?: number | null;
  pageSize?: number | null;
  sortBy?: string | null;
  sortDirection?: string | null;
}) =>
  api.get("/Inventory/maintenance", {
    params: {
      branchId: params?.branchId ?? undefined,
      status: params?.status || undefined,
      priority: params?.priority || undefined,
      assignedTo: params?.assignedTo ?? undefined,
      search: params?.search || undefined,
      categoryId: params?.categoryId ?? undefined,
      pageNumber: params?.pageNumber ?? undefined,
      pageSize: params?.pageSize ?? undefined,
      sortBy: params?.sortBy || undefined,
      sortDirection: params?.sortDirection || undefined,
    },
  });

export const getMaintenanceById = (id: number) =>
  api.get(`/Inventory/maintenance/${id}`);

export const approveMaintenance = (id: number, data?: { Comments?: string | null }) =>
  api.post(`/Inventory/maintenance/${id}/approve`, data ?? {});

export const assignMaintenance = (
  id: number,
  data: { AssignedTo: number; Comments?: string | null; JobTimeHours: number }
) => api.post(`/Inventory/maintenance/${id}/assign`, data);

export const updateMaintenanceTechnicianStatus = (
  id: number,
  data: {
    ActionType: string;
    Notes: string;
    JobTimeHours?: number | null;
    RequiredSparePart?: string | null;
    SparePartItemId?: number | null;
    Quantity?: number | null;
  }
) => api.post(`/Inventory/maintenance/${id}/technician-update`, data);

export const startMaintenance = (id: number, data: FormData) =>
  api.post(`/Inventory/maintenance/${id}/start`, data, {
    transformRequest: [
      (body, headers) => {
        if (headers && typeof headers === "object") {
          delete (headers as Record<string, unknown>)["Content-Type"];
        }
        return body;
      },
    ],
  });

export const completeMaintenanceRepair = (id: number, data: FormData) =>
  api.post(`/Inventory/maintenance/${id}/complete-repair`, data, {
    transformRequest: [
      (body, headers) => {
        if (headers && typeof headers === "object") {
          delete (headers as Record<string, unknown>)["Content-Type"];
        }
        return body;
      },
    ],
  });

export const closeMaintenance = (id: number, data?: { Comments?: string | null }) =>
  api.post(`/Inventory/maintenance/${id}/close`, data ?? {});

export const getMaintenanceHistory = (id: number) =>
  api.get(`/Inventory/maintenance/${id}/history`);

export const getMaintenanceHistoryByInventoryItem = (inventoryItemId: number) =>
  api.get(`/Inventory/maintenance/inventory-item/${inventoryItemId}/history`);

export const getInventoryComplaintAnalytics = () =>
  api.get("/Inventory/complaint-analytics");

export const getInventoryComplaintAnalyticsDetails = (status?: string | null) =>
  api.get("/Inventory/complaint-analytics/details", {
    params: {
      status: status || undefined,
    },
  });

export const getBranchInventoryAnalytics = () =>
  api.get("/Inventory/branch-inventory-analytics");

export const getBranchInventoryAnalyticsItems = (status?: string | null) =>
  api.get("/Inventory/branch-inventory-analytics/items", {
    params: {
      status: status || undefined,
    },
  });

export default api;
