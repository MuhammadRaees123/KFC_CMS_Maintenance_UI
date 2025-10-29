import { LayoutDashboard, MessageSquare, FileText, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Complaints", url: "/complaints", icon: MessageSquare },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export const Sidebar = () => {
  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-6">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
          K
        </div>
        <span className="text-xl font-bold text-sidebar-foreground">KFC CMS</span>
      </div>

      <nav className="flex-1 px-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};
