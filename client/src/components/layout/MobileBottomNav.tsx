import React from 'react';
import { ArrowLeft, Home, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 px-6 flex items-center justify-between pb-safe">
      <button 
        onClick={() => navigate(-1)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={24} />
      </button>

      <button
        onClick={() => navigate('/')}
        className={clsx(
          "w-12 h-12 rounded-full flex items-center justify-center -translate-y-4 shadow-lg transition-transform hover:scale-105 active:scale-95",
          isHome ? "bg-primary text-white" : "bg-card text-muted-foreground border border-border"
        )}
      >
        <Home size={24} />
      </button>

      <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
        <Bell size={24} />
        <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background">
          4
        </span>
      </button>
    </div>
  );
};

export default MobileBottomNav;
