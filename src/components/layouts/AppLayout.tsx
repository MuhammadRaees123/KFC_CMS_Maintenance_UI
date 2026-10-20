// src/layouts/AppLayout.tsx  (example path)

import React, { useState } from "react";
import { Header } from "@/components/Header";   // <-- apne path ke mutabiq
import { Sidebar } from "@/components/Sidebar"; // <-- apne path ke mutabiq
// import { Outlet } from "react-router-dom";   // agar aap Outlet use karte ho

type Props = {
  children?: React.ReactNode; // agar aap children pass karte ho
};

export default function AppLayout({ children }: Props) {
  // ✅ Mobile sidebar state lives here
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* ✅ Sidebar controlled by state */}
      <Sidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex flex-1 flex-col">
        {/* ✅ Header burger will open sidebar */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1">
          {children}
          {/* or <Outlet /> */}
        </main>
      </div>
    </div>
  );
}

