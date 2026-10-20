import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { loginUser, getMenuByRole } from "@/services/api";
import kfcLogo from "@/assets/kfc-logo-new1.png";
import bgVideo from "@/assets/bg.mp4";
import bgVideo2 from "@/assets/bg2.mp4";
import { motion } from "framer-motion";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e: any) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast({
        title: "Error",
        description: "Enter username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginUser(formData);
      if (data?.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        const menuRes = await getMenuByRole();
        localStorage.setItem("menu", JSON.stringify(menuRes.data));
        window.dispatchEvent(new Event("refreshSidebarMenu"));
        navigate("/dashboards/gdc");
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

 return (
  <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

    {/* ✅ Fullscreen Video Background */}
    <video
      src={bgVideo2}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover z-0"
    />

    {/* Optional overlay to darken video slightly */}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>

    {/* ⭐ KFC Triple Stripes – Top */}
    {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-row gap-1 py-4 z-10">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="w-1.5 h-24 bg-red-700 shadow-[0_0_10px_rgba(200,0,0,0.6)] rounded-full"
        />
      ))}
    </div> */}

    {/* ⭐ KFC Triple Stripes – Bottom */}
    {/* <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-row gap-1 py-4 z-10">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="w-1.5 h-24 bg-red-700 shadow-[0_0_10px_rgba(200,0,0,0.6)] rounded-full"
        />
      ))}
    </div> */}

    {/* 🔥 Glassmorphic Login Card */}
<motion.div
  initial={{ opacity: 0, y: 35, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  whileHover={{ rotateX: 4, rotateY: -4 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
  className="
    relative z-20 w-full max-w-md p-10 rounded-2xl

    bg-white/5 backdrop-blur-xl
    border border-white/30
    shadow-[0_8px_40px_rgba(255,255,255,0.15)]

    

    /* Glossy top shine */
    after:absolute after:top-0 after:left-0 after:w-full after:h-1
    after:rounded-t-2xl after:bg-white/50 after:opacity-40
    after:pointer-events-none
  "
>

{/*  🌈 OUTER PULSING GLOW */ }           
    {/* before:absolute before:-inset-6 before:rounded-2xl
    before:bg-gradient-to-r before:from-red-600/70 before:via-blue-500/40 before:to-blue-600/70
    before:blur-3xl before:opacity-70
    before:pointer-events-none before:z-[-1]
    before:animate-[pulseGlow_3s_ease-in-out_infinite] */}

      {/* 🔴 Red Top Border */}
      <div
        className="
          absolute top-0 left-0 w-full h-2 rounded-t-2xl
          bg-gradient-to-r from-red-700 via-red-600 to-red-700
          shadow-[0_0_12px_rgba(217,35,46,0.6)]
        "
      />

      {/* Logo */}
      <div className="flex flex-col items-center mb-6 mt-3">
        <motion.img
          src={kfcLogo}
          className="w-24 h-24 object-contain drop-shadow-lg"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        <h2 className="text-3xl font-bold text-white mt-4 tracking-tight">
          KFC CMS Portal
        </h2>
        <p className="text-gray-200 text-sm">Sign in to continue</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-5">

        {/* Username */}
        <div className="space-y-1">
          <Label className="text-white font-medium">Username</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red/60" />
            <Input
              name="username"
              onChange={handleChange}
              className="pl-10 bg-white/20 border-white/40 text-white placeholder-white/60 focus:ring-red-500 focus:border-red-500"
              placeholder="Enter username"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <Label className="text-white font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red/60" />
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              onChange={handleChange}
              className="pl-10 pr-10 bg-white/20 border-white/40 text-white placeholder-white/60 focus:ring-red-500 focus:border-red-500"
              placeholder="Enter password"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-red/70 hover:text-red"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* Login Button */}
      <motion.button
  whileTap={{ scale: 0.95 }}
  type="submit"
  disabled={isLoading}
  className="
    w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg
    font-semibold shadow-md transition flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600
  "
>
  {isLoading ? (
    <>
      <span className="loader"></span>
      Signing in...
    </>
  ) : (
    "Login"
  )}
</motion.button>


        {/* <p className="text-center text-sm text-white/80 hover:text-red-300 cursor-pointer">
          Forgot Password?
        </p> */}
      </form>
    </motion.div>
  </div>
);

}
