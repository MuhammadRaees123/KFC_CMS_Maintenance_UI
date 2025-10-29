import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarProvider } from "@/components/ui/sidebar";

export const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
