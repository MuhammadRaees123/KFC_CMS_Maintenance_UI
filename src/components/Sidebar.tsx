import { LayoutDashboard, MessageSquare, FileText, Settings, ChevronDown, ClipboardList, List, Clock } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { 
    title: "Complaints", 
    icon: MessageSquare,
    submenu: [
      { title: "Register", url: "/complaints/register", icon: ClipboardList },
      { title: "List", url: "/complaints", icon: List },
      { title: "Queue", url: "/complaints/queue", icon: Clock },
    ]
  },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const [complaintsOpen, setComplaintsOpen] = useState(
    location.pathname.startsWith('/complaints')
  );

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg">
          K
        </div>
        <span className="text-xl font-bold text-sidebar-foreground">KFC CMS</span>
      </div>

      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            if (item.submenu) {
              return (
                <Collapsible
                  key={item.title}
                  open={complaintsOpen}
                  onOpenChange={setComplaintsOpen}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      location.pathname.startsWith('/complaints')
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        complaintsOpen && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-4">
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <NavLink
                            key={subItem.title}
                            to={subItem.url}
                            end
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                                isActive
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                              )
                            }
                          >
                            <SubIcon className="h-4 w-4" />
                            <span>{subItem.title}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
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
