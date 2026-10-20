// import { Outlet } from "react-router-dom";
// import { Sidebar } from "@/components/Sidebar";
// import { Header } from "@/components/Header";

// export const DashboardLayout = () => {
//   return (
//     <div className="flex min-h-screen w-full bg-background">
//       <Sidebar />
//       <div className="flex flex-1 flex-col">
//         <Header  />
//         <main className="flex-1 p-6">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// };


import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export const DashboardLayout = () => {
  // ✅ SINGLE SOURCE OF TRUTH
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* ✅ Controlled Sidebar */}
      <Sidebar
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
      />

      <div className="flex flex-1 flex-col">
        {/* ✅ Header controls sidebar */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

