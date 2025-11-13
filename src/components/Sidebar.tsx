import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getMenuByRole } from "@/services/api";
import kfcLogo from "@/assets/kfc-logo-new1.png";
import * as LucideIcons from "lucide-react";
import DataTable from "react-data-table-component";

interface SubMenu {
  id: number;
  name: string;
  icon: string;
  url: string;
}

interface MenuItem {
  id: number;
  name: string;
  icon: string;
  url: string;
  subMenus: SubMenu[];
}

export const Sidebar = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  // 🔹 Load menus either from localStorage or API
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const storedMenu = localStorage.getItem("menu");
        const userData = localStorage.getItem("user");
        const parsedUser = userData ? JSON.parse(userData) : null;

        setUserRole(parsedUser?.role || "");

        // ✅ Load from localStorage first
        if (storedMenu) {
          try {
            const parsedMenu = JSON.parse(storedMenu);
            if (Array.isArray(parsedMenu) && parsedMenu.length > 0) {
              setMenuItems(parsedMenu);
              setLoading(false);
              return; // ✅ no need to call API again
            }
          } catch {
            console.warn("Invalid stored menu JSON — fetching from API");
          }
        }

        // ✅ Otherwise, fetch fresh menu
        const response = await getMenuByRole();
        let menus: MenuItem[] = [];

        if (response?.data) {
          if (typeof response.data === "string") {
            menus = JSON.parse(response.data);
          } else if (Array.isArray(response.data)) {
            menus = response.data;
          }
        }

        setMenuItems(menus);
        localStorage.setItem("menu", JSON.stringify(menus));
      } catch (err) {
        console.error("Error loading sidebar:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();

    // 🔁 Allow other components to refresh sidebar
    const handleRefresh = async () => {
      console.log("🔁 Sidebar refresh triggered");
      setLoading(true);
      localStorage.removeItem("menu");
      await fetchMenus();
    };

    window.addEventListener("refreshSidebarMenu", handleRefresh);
    return () => window.removeEventListener("refreshSidebarMenu", handleRefresh);
  }, []);

  // 🎨 Dynamic Icon Renderer with hover glow
  const renderIcon = (iconName?: string, className?: string) => {
    if (!iconName) return <i className={`fa fa-circle ${className}`} />;
    const cleanName = iconName
      .replace("lucide-", "")
      .replace(/^\w/, (c) => c.toUpperCase());
    const IconComponent = (LucideIcons as any)[cleanName];
    if (IconComponent)
      return (
        <IconComponent
          className={`${className} transition-transform duration-200 group-hover:scale-110 group-hover:text-[#ff4757]`}
          size={18}
        />
      );
    return <i className={`fa fa-circle ${className}`} />;
  };

  const renderMenuContent = () => (
    <nav className="flex-1 px-2 py-3 overflow-y-auto">
      <div className="space-y-1">
        {menuItems.map((item) => {
          const hasSubmenu = item.subMenus?.length > 0;
          const isExpanded = expanded === item.id;

          if (hasSubmenu) {
            return (
              <Collapsible
                key={item.id}
                open={isExpanded}
                onOpenChange={() => setExpanded(isExpanded ? null : item.id)}
              >
                <CollapsibleTrigger
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-300",
                    isExpanded
                      ? "bg-[#bc3342]/90 text-white shadow-md shadow-[#bc3342]/40"
                      : "text-gray-200 hover:bg-[#2b2b2b] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {renderIcon(item.icon, "text-[#bc3342]")}
                    <span className="group-hover:text-[#ff4757] transition-colors duration-200">
                      {item.name}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 text-gray-400 group-hover:text-[#ff4757]",
                      isExpanded && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="relative z-0 ml-3 mt-1 border-l border-gray-700 pl-4 space-y-1 bg-[#141414] rounded-md overflow-hidden">
                  {item.subMenus.map((subItem) => (
                    <NavLink
                      key={subItem.id}
                      to={subItem.url}
                      end
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200",
                          isActive
                            ? "bg-[#bc3342] text-white font-medium"
                            : "text-gray-300 hover:bg-[#1f1f1f] hover:text-white"
                        )
                      }
                    >
                      {renderIcon(subItem.icon, "text-[#bc3342] text-xs")}
                      <span className="group-hover:text-[#ff4757] transition-colors duration-200">
                        {subItem.name}
                      </span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.url}
              end
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-[#bc3342] text-white shadow-md shadow-[#bc3342]/40"
                    : "text-gray-200 hover:bg-[#2b2b2b] hover:text-white"
                )
              }
            >
              {renderIcon(item.icon, "text-[#bc3342]")}
              <span className="group-hover:text-[#ff4757] transition-colors duration-200">
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );

  if (loading) {
    return (
      <aside className="hidden md:flex w-64 flex-col bg-[#121212] border-r border-gray-800 items-center justify-center">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
        <p className="text-xs text-gray-400 mt-2">Loading menu...</p>
      </aside>
    );
  }

  return (
    <>
      {/* 🖥 Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-[#121212] border-r border-gray-800 text-white">
        <div className="flex items-center justify-center px-3 py-4 border-b border-gray-700 bg-[#1b1b1b]">
          <img src={kfcLogo} alt="KFC Logo" className="max-h-12 object-contain drop-shadow-md" />
        </div>

        {/* show role header */}
        {userRole && (
          <div className="px-3 py-2 text-xs uppercase text-gray-400 border-b border-gray-700 bg-[#141414]">
            Role: <span className="text-white font-medium">{userRole}</span>
          </div>
        )}

        {renderMenuContent()}
      </aside>

      {/* 📱 Mobile */}
      <div className="md:hidden fixed top-0 left-0 w-full z-50 bg-[#121212] border-b border-gray-800 flex items-center justify-between px-4 py-3 shadow-sm text-white">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-white focus:outline-none">
                <Menu className="h-6 w-6 hover:text-[#ff4757] transition-colors" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-[#121212] text-white">
              <div className="flex items-center justify-center px-3 py-4 border-b border-gray-700 bg-[#1b1b1b]">
                <img src={kfcLogo} alt="KFC Logo" className="max-h-12 object-contain drop-shadow-md" />
              </div>

              {userRole && (
                <div className="px-3 py-2 text-xs uppercase text-gray-400 border-b border-gray-700 bg-[#141414]">
                  Role: <span className="text-white font-medium">{userRole}</span>
                </div>
              )}

              {renderMenuContent()}
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-white">KFC CMS</span>
        </div>
      </div>
    </>
  );
};
