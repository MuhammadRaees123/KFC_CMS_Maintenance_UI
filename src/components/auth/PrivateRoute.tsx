import { Navigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const normalizePath = (value: string): string => {
  const trimmed = (value || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const matchAllowedRoute = (allowedRoute: string, currentPath: string): boolean => {
  const route = normalizePath(allowedRoute);
  const path = normalizePath(currentPath);

  if (!route || !path) return false;

  // Existing exact-match behavior
  if (route === path) {
    return true;
  }

  // Existing /* wildcard behavior (one-segment-safe prefix)
  if (route.endsWith("/*")) {
    const prefix = route.slice(0, -2);
    return path === prefix || path.startsWith(`${prefix}/`);
  }

  // Dynamic :parameter route — each :param matches exactly one segment
  if (route.includes(":")) {
    const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escapedRoute.replace(/:\w+/g, "[^/]+")}$`);
    return pattern.test(path);
  }

  // Granted list page also allows a single numeric child
  // e.g. /inventory/maintenance → /inventory/maintenance/123
  if (path.startsWith(`${route}/`)) {
    const rest = path.slice(route.length + 1);
    if (rest && !rest.includes("/") && /^\d+$/.test(rest)) {
      return true;
    }
  }

  return false;
};

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();

  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  const allowedRoutes = JSON.parse(localStorage.getItem("allowedRoutes") || "[]");

  // 1️⃣ Not logged in
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2️⃣ Check current URL against allowed routes
  const currentPath = normalizePath(location.pathname);
  const isAllowed = allowedRoutes.some((route: string) =>
    matchAllowedRoute(route, currentPath)
  );

  // 3️⃣ Block unauthorized access
  if (!isAllowed) {
    console.warn("🚫 Access denied to:", currentPath);
    toast({
      title: "Access Denied",
      description: "You are not authorized to view this page.",
      variant: "destructive",
    });
    return <Navigate to="/unauthorized" replace />;
  }

  // 4️⃣ Otherwise allow
  return <>{children}</>;
};

export default PrivateRoute;
