import { Navigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface PrivateRouteProps {
  children: React.ReactNode;
}

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
  const currentPath = location.pathname.toLowerCase();
  const isAllowed = allowedRoutes.some(
    (route: string) =>
      route.toLowerCase() === currentPath ||
      (route.endsWith("/*") && currentPath.startsWith(route.replace("/*", "")))
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
