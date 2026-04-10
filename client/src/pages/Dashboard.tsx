import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ActionCard } from '../components/ui/ActionCard';
import type { ActionCardProps } from '../components/ui/ActionCard';
import { Box, Users, Wallet, Car, Copyright, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { moduleData } from '../data/moduleData';
import { ModuleCard } from '../components/ui/ModuleCard';
import ZaloLogo from '../assets/zalo-seeklogo.svg';
import { buildAllowedRouteSet, canAccessModuleRoute, canAccessRoute } from '../utils/routePermissions';
import { useMyPermissions } from '../hooks/queries/useRoles';

const dashboardModules: ActionCardProps[] = [
  {
    icon: Box,
    title: 'Hàng hóa',
    description: 'Kho, nhập hàng, xuất hàng, tồn kho.',
    href: '/hang-hoa',
    colorScheme: 'teal'
  },
  {
    icon: Users,
    title: 'Hành chính nhân sự',
    description: 'Quản lý nhân sự và các thủ tục hành chính.',
    href: '/hanh-chinh-nhan-su',
    colorScheme: 'emerald'
  },
  {
    icon: Wallet,
    title: 'Kế toán',
    description: 'Công nợ, danh sách khách hàng.',
    href: '/ke-toan',
    colorScheme: 'blue'
  },
  {
    icon: Car,
    title: 'Quản lý xe',
    description: 'Theo dõi và quản lý phương tiện.',
    href: '/quan-ly-xe',
    colorScheme: 'orange'
  },
  {
    icon: Copyright,
    title: 'Thông tin bản quyền',
    description: 'Quản lý sở hữu trí tuệ.',
    href: '/ban-quyen',
    colorScheme: 'blue'
  },
  {
    iconSrc: ZaloLogo,
    title: 'Chat Zalo',
    description: 'Chuyển sang ứng dụng Zalo chat',
    href: 'https://chat.zalo.me/',
    colorScheme: 'blue'
  }
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chuc-nang' | 'danh-dau' | 'tat-ca'>('chuc-nang');
  const [greeting, setGreeting] = useState('Chào bạn');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: myPermissionsData, isSuccess: permissionsReady } = useMyPermissions(!!user);

  const allSections = Object.values(moduleData).flat();
  const allowedPaths = permissionsReady
    ? new Set(myPermissionsData?.page_paths || [])
    : buildAllowedRouteSet(user?.role);
  const visibleDashboardModules = dashboardModules.filter((item) => {
    if (!item.href || item.href.startsWith('http')) return true;

    const moduleSections = moduleData[item.href];
    if (moduleSections) {
      const childPaths = moduleSections
        .flatMap((section) => section.items)
        .map((moduleItem) => moduleItem.path)
        .filter((path): path is string => Boolean(path));

      return canAccessModuleRoute(item.href, childPaths, user?.role, allowedPaths);
    }

    return canAccessRoute(item.href, user?.role, allowedPaths);
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-foreground">
          {greeting}, <span className="text-primary">{user?.full_name || 'Người dùng'}</span> 👋
        </h1>
      </div>

      <div className={clsx(
        "bg-card sm:rounded-xl shadow-sm border-y border-border sm:border py-1.5 px-4 sm:p-2 flex flex-row items-center gap-1.5 sm:gap-3 mb-6 lg:mb-8 transition-all duration-300 relative z-10 w-[calc(100%+2rem)] -ml-4 sm:ml-0 overflow-hidden",
        activeTab === 'tat-ca' ? "sm:w-full" : "sm:w-max"
      )}>
        <div className="flex bg-muted rounded-lg p-0.5 sm:p-1 shrink-0 h-9 sm:h-10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('chuc-nang')}
            className={clsx(
              "px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-md text-[12px] sm:text-[13px] font-bold transition-all duration-200 whitespace-nowrap",
              activeTab === 'chuc-nang'
                ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Chức năng
          </button>
          <button
            onClick={() => setActiveTab('danh-dau')}
            className={clsx(
              "px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-md text-[12px] sm:text-[13px] font-bold transition-all duration-200 whitespace-nowrap",
              activeTab === 'danh-dau'
                ? "bg-card text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Đánh dấu
          </button>
          <button
            onClick={() => setActiveTab('tat-ca')}
            className={clsx(
              "px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-md text-[12px] sm:text-[13px] font-bold transition-all duration-200 whitespace-nowrap",
              activeTab === 'tat-ca'
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Tất cả
          </button>
        </div>

        {/* Search Bar (Only shown on "Tất cả" tab) */}
        {activeTab === 'tat-ca' && (
          <div className="flex-1 flex min-w-0 items-center bg-muted/50 rounded-lg h-9 sm:h-10 px-2.5 sm:px-3 animate-in slide-in-from-left-2 duration-300">
            <Search size={14} className="text-muted-foreground shrink-0 sm:w-4 sm:h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="bg-transparent border-none outline-none text-[12px] sm:text-[13px] text-foreground w-full ml-1.5 sm:ml-2 placeholder:text-muted-foreground/60 focus:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === 'chuc-nang' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-5">
          {visibleDashboardModules.map((module, idx) => (
            <ActionCard
              key={idx}
              {...module}
            />
          ))}
        </div>
      )}

      {activeTab === 'danh-dau' && (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border border-dashed">
          Chưa có module nào được đánh dấu.
        </div>
      )}

      {activeTab === 'tat-ca' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-8">
            {allSections.map((section, idx) => {
              const filteredItems = section.items.filter(item => {
                if (!canAccessRoute(item.path, user?.role, allowedPaths)) {
                  return false;
                }

                return item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchQuery.toLowerCase());
              });

              if (filteredItems.length === 0) return null;

              return (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                  <h2 className="text-[14px] font-bold text-primary mb-3 flex items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1 h-4 bg-primary rounded-full"></span>
                      <span>{section.section}</span>
                    </div>
                    <div className="h-px flex-1 bg-border/60"></div>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredItems.map((item, itemIdx) => (
                      <ModuleCard key={itemIdx} {...item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
