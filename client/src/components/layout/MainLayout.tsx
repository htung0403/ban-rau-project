import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { clsx } from 'clsx';
import { useAttendanceGate, isPathAllowedBeforeCheckin } from '../../hooks/useAttendanceGate';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { mustCheckIn, isLocked } = useAttendanceGate();
  const location = useLocation();

  if ((mustCheckIn || isLocked) && !isPathAllowedBeforeCheckin(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div 
        className={clsx(
          "flex-1 flex flex-col w-full min-w-0 transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"
        )}
      >
        <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 flex flex-col min-h-0">
          <div className="w-full flex-1 min-h-0 flex flex-col p-4 lg:p-6 pb-[88px] lg:pb-6 overflow-y-auto custom-scrollbar">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
