import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { DashboardLayout } from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import ComplaintsRegister from "./pages/ComplaintsRegister";
import ComplaintsQueue from "./pages/ComplaintsQueue";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import MenuManagement from "./pages/MenuManagement";
import RoleMenuAccess from "./pages/RoleMenuAccess";
import UserRoles from "./pages/UserRoles/UserRoles";
import Users from "./pages/Users/Users";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

import { setGlobalNavigate } from "@/utils/navigation";
import { isAuthenticated } from "@/types/auth";
import PrivateRoute from "@/components/auth/PrivateRoute";
import { loadAllowedRoutes } from "@/services/api";
import GeneralDashboard from "@/pages/Dashboards/GeneralDashboard";
import FoodAnalyticsDashboard from "@/pages/Dashboards/FoodAnalyticsDashboard";
import BranchPerformanceDashboard from "@/pages/Dashboards/BranchPerformanceDashboard";
import ChannelAnalysisDashboard from "@/pages/Dashboards/ChannelAnalysisDashboard";
import CustomerSentimentDashboard from "@/pages/Dashboards/CustomerSentimentDashboard";
import RiderPerformanceDashboard from "@/pages/Dashboards/RiderPerformanceDashboard";
import SLAMonitoringDashboard from "@/pages/Dashboards/SLAMonitoringDashboard";
import RiderPerformanceReport from "./pages/Reports/RiderPerformanceReport";
import KhadimDashboard from "./pages/Khadim/KhadimDashboard";
import BranchAccessManagement from "./pages/BranchAccessManagement";
import BranchComparisonReport from "./pages/Reports/BranchComparisonReport";
import InventoryCategories from "./pages/Inventory/Categories";
import InventoryItems from "./pages/Inventory/Items";
import InventoryAssets from "./pages/Inventory/Assets";
import InventoryMaintenance from "./pages/Inventory/Maintenance";
import InventoryMaintenanceDetail from "./pages/Inventory/MaintenanceDetail";
import InventoryBranchAgentTasks from "./pages/Inventory/BranchAgentTasks";
import InventoryTechnicianDashboard from "./pages/Inventory/TechnicianDashboard";
import InventoryComplaint from "./pages/Inventory/InventoryComplaint";
import InventoryComplaintAnalytics from "./pages/Inventory/ComplaintAnalytics";
import InventoryBranchInventoryAnalytics from "./pages/Inventory/BranchInventoryAnalytics";

const queryClient = new QueryClient();

/* ----------------------------
   Navigation Bridge
----------------------------- */
const NavigationBridge = () => {
  const navigate = useNavigate();
  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);
  return null;
};


/* ----------------------------
   Splash / Session Loader
----------------------------- */
const SessionLoader = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">
    <div className="flex flex-col items-center gap-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      <p className="text-sm">Checking session...</p>
    </div>
  </div>
);

/* ----------------------------
   Protected Wrapper (Auth Check)
----------------------------- */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/* ----------------------------
   Main App
----------------------------- */
const App = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authStatus, setAuthStatus] = useState(false);

  useEffect(() => {
  const timer = setTimeout(async () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      setAuthStatus(true);

      // 🔁 Auto-refresh allowed routes every 15 minutes or if missing
      const refreshRoutesIfNeeded = async () => {
        try {
          const storedRoutes = localStorage.getItem("allowedRoutes");
          const parsedRoutes = storedRoutes ? JSON.parse(storedRoutes) : [];

          const lastFetched = localStorage.getItem("allowedRoutesFetchedAt");
          const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in ms

          if (
            !parsedRoutes.length ||
            !lastFetched ||
            Date.now() - parseInt(lastFetched) > fifteenMinutes
          ) {
            console.log("🔁 Auto-refreshing allowedRoutes via API...");
            const newRoutes = await loadAllowedRoutes();

            if (newRoutes && Array.isArray(newRoutes)) {
              localStorage.setItem("allowedRoutes", JSON.stringify(newRoutes));
              localStorage.setItem(
                "allowedRoutesFetchedAt",
                Date.now().toString()
              );
              console.log("✅ allowedRoutes updated successfully.");
            } else {
              console.warn("⚠️ loadAllowedRoutes returned no data or invalid format.");
            }
          }
        } catch (error) {
          console.error("❌ Failed to refresh allowedRoutes:", error);
        }
      };

      await refreshRoutesIfNeeded();
    } else {
      setAuthStatus(false);
    }

    setCheckingAuth(false);
  }, 500);

  return () => clearTimeout(timer);
}, []);


  if (checkingAuth) return <SessionLoader />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* <BrowserRouter> */}
          <NavigationBridge />

          <Routes>
            {/* 🔓 Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* 🔒 Everything under DashboardLayout is protected */}
            <Route
              element={
                <ProtectedRoute>
                  {/* ✅ One-time global guard for all nested routes */}
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                </ProtectedRoute>
              }
            >
              {/* Default redirect */}
              <Route
                path="/"
                element={
                  authStatus ? (
                    <Navigate to="/dashboards/gdc" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              {/* Pages auto-guarded via PrivateRoute */}
              {/* <Route path="/dashboard" element={<Dashboard />} /> */}
              <Route path="/dashboards/gdc" element={<GeneralDashboard />} />
              <Route path="/dashboards/ap" element={<FoodAnalyticsDashboard />} />
              <Route path="/dashboards/bp" element={<BranchPerformanceDashboard />} />
              <Route path="/dashboards/can" element={<ChannelAnalysisDashboard />} />
              <Route path="/dashboards/cs" element={<CustomerSentimentDashboard />} />
              <Route path="/dashboards/rp" element={<RiderPerformanceDashboard />} />
               <Route path="/dashboards/slem" element={<SLAMonitoringDashboard />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/complaints/list" element={<Complaints />} />
              <Route path="/Khadim/KhadimDashboard" element={<KhadimDashboard />} />
              <Route
                path="/complaints/register"
                element={<ComplaintsRegister />}
              />
              <Route path="/complaints/queue" element={<ComplaintsQueue />} />
              <Route path="/reports/rpr" element={<RiderPerformanceReport />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/menu-management" element={<MenuManagement />} />
              <Route path="/role-menu-access" element={<RoleMenuAccess />} />
              <Route path="/user-roles" element={<UserRoles />} />
              <Route path="/users" element={<Users />} />
              <Route path="/bam" element={<BranchAccessManagement />} />
               <Route path="/reports/bcr" element={<BranchComparisonReport />} />
              <Route path="/inventory/categories" element={<InventoryCategories />} />
              <Route path="/inventory/items" element={<InventoryItems />} />
              <Route path="/inventory/assets" element={<InventoryAssets />} />
              <Route path="/inventory/inventory-complaint" element={<InventoryComplaint />} />
              <Route path="/inventory/complaint-analytics" element={<InventoryComplaintAnalytics />} />
              <Route path="/inventory/branch-inventory-analytics" element={<InventoryBranchInventoryAnalytics />} />
              <Route path="/inventory/maintenance" element={<InventoryMaintenance />} />
              <Route path="/inventory/maintenance/:id" element={<InventoryMaintenanceDetail />} />
              <Route path="/inventory/branch-agent-tasks" element={<InventoryBranchAgentTasks />} />
              <Route path="/inventory/technician-dashboard" element={<InventoryTechnicianDashboard />} />
            </Route>

            {/* 🚫 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        {/* </BrowserRouter>*/}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
