import { Bell, Search, User, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { logoutUser } from "@/services/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const [userName, setUserName] = useState<string>("Admin User");
  const [userEmail, setUserEmail] = useState<string>("admin@kfc.com");

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || "Admin User");
        setUserEmail(user.email || user.name+"@kfc.com");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }, []);

  // const handleLogout = () => {
  //   localStorage.clear();

  //   toast({
  //     title: "Session Ended",
  //     description: "You have been logged out successfully.",
  //     variant: "destructive",
  //   });

  //   setTimeout(() => {
  //     window.location.href = "/login";
  //   }, 1000);

  //   throw new Error("User logged out");
  // };



  const handleLogout = () => {
  logoutUser(); // central method handles localStorage cleanup + redirect

  toast({
    title: "Session Ended",
    description: "You have been logged out successfully.",
    variant: "destructive",
  });

  setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
};

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm">
      <Button variant="ghost" size="icon" className="md:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-md">
          {/* <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10" /> */}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <User className="h-5 w-5" />
              <span className="hidden md:inline">{userName}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <div className="font-semibold">{userName}</div>
                <div className="text-xs text-muted-foreground">{userEmail}</div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
