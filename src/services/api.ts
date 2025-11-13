import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "@/hooks/use-toast";
import { navigateTo } from "@/utils/navigation";

/* ----------------------------
   Axios Base Configuration
----------------------------- */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://localhost:7278/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
export const getBranchesForDashboard = async (regionId?: number) => {
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
    let menus = Array.isArray(response.data)
      ? response.data
      : JSON.parse(response.data || "[]");

    const routes: string[] = [];

    const extractRoutes = (menuList: any[]) => {
      for (const menu of menuList) {
        // only include valid, non-empty URLs
        if (menu.url && menu.url.trim() !== "." && menu.url.trim() !== "") {
          routes.push(menu.url.toLowerCase());
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

    console.log("✅ Routes loaded for role:", routes);
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

/* ----------------------------
   Role & Access Management
----------------------------- */
export const getAllRoles = () => api.get("/menu/GetAllRoles");

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

    console.log("🔹 Login API Response:", data);

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

      console.log("✅ allowedRoutes fetched:", allowed);
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



export default api;
