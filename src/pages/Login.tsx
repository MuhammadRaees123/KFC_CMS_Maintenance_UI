import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { loginUser, getMenuByRole } from "@/services/api"; // ✅ use centralized API
import kfcLogo from "@/assets/kfc-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      toast({
        title: "Validation Error",
        description: "Username is required",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.password.trim()) {
      toast({
        title: "Validation Error",
        description: "Password is required",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;
  setIsLoading(true);

  try {
    // ✅ call central login method
    const data = await loginUser({
      username: formData.username,
      password: formData.password,
    });

    console.log("🔹 Login API Response:", data);
console.log("✅ allowedRoutes:", localStorage.getItem("allowedRoutes"));
    const { token, user } = data || {};

    if (token && user) {
      // ✅ store token
      localStorage.setItem("token", token);

      // ✅ map user object for consistency
      const mappedUser = {
        id: user.id,
        name: user.name,
        role: user.roleText || user.role || user.roleName,
        roleId: user.roleId,
        branchId: user.branchId,
        regionId: user.regionId,
        accessType: user.accessType,
        token: token,
      };

      // ✅ save user data
      localStorage.setItem("user", JSON.stringify(mappedUser));

      // ✅ fetch and save menu
      const menuRes = await getMenuByRole();
      localStorage.setItem("menu", JSON.stringify(menuRes.data));

      // 🔁 refresh sidebar immediately
      window.dispatchEvent(new Event("refreshSidebarMenu"));

      toast({
        title: "Login Successful",
        description: `Welcome, ${mappedUser.name || mappedUser.role}`,
      });

      // ✅ redirect to dashboard
      navigate("/dashboards/gdc");
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid response from server",
        variant: "destructive",
      });
    }
  } catch (err: any) {
    console.error("Login failed:", err);
    toast({
      title: "Login Failed",
      description:
        err.response?.data?.message || "Invalid username or password",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4 animate-fade-in">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side branding */}
        <div className="hidden lg:flex flex-col items-center justify-center space-y-6 p-12">
          <img src={kfcLogo} alt="KFC Logo" className="w-64 h-64 object-contain animate-scale-in" />
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Welcome to KFC CMS Portal</h1>
            <p className="text-lg text-muted-foreground">
              Complaint Management System for KFC Pakistan
            </p>
          </div>
        </div>

        {/* Right side login form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 space-y-6 animate-scale-in">
            <div className="lg:hidden flex flex-col items-center mb-6">
              <img src={kfcLogo} alt="KFC Logo" className="w-24 h-24 object-contain mb-4" />
              <h2 className="text-2xl font-bold text-foreground">KFC CMS Portal</h2>
            </div>

            <div className="space-y-2">
              <h2 className="hidden lg:block text-3xl font-bold text-foreground">Sign In</h2>
              <p className="text-muted-foreground">
                Enter your credentials to access the portal
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold rounded-xl hover:scale-[1.02] transition-transform"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            © {new Date().getFullYear()} KFC CMS Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
