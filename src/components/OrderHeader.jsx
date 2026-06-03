import React from 'react';
import { Building2, ClipboardList, Gauge, History, LogOut, Package, Ruler, Settings2 } from 'lucide-react';

export function Logo({ surface = 'order', showMark = true }) {
  const isDashboard = surface === 'dashboard';

  return (
    <div className="gi-brand flex min-w-0 items-center gap-3">
      {showMark ? (
        <span className="gi-brand-mark" aria-hidden="true">
          GI
        </span>
      ) : null}
      <div className="min-w-0">
        <h1 className={`truncate text-lg font-black leading-none tracking-tight sm:text-xl ${isDashboard ? 'text-white' : 'text-primary-900'}`}>
          ระบบเบิกเสื้อพนักงาน
        </h1>
        <p
          className={
            isDashboard
              ? 'mt-0.5 hidden text-[11px] font-bold leading-none text-white/70 sm:block'
              : 'mt-0.5 hidden text-[11px] font-bold leading-none text-neutral-600 sm:block'
          }
        >
          Gold Integrate
        </p>
      </div>
    </div>
  );
}

export function OrderHeader({ onSizeOpen, onOpenDashboard }) {
  return (
    <header className="gi-order-header relative z-10 border-b border-neutral-200 bg-white px-2 py-2.5 shadow-xs sm:px-3">
      <div className="gi-container flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <Logo />
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={onSizeOpen}
            className="btn-secondary flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs transition sm:text-sm"
            title="ดูข้อมูลและขนาดของเสื้อ"
          >
            <Ruler className="size-4" />
            <span>ข้อมูลเสื้อ</span>
          </button>
          <button
            onClick={onOpenDashboard}
            className="btn-outline flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-black shadow-sm transition hover:shadow-md active:scale-95 sm:text-sm sm:hover:-translate-y-0.5"
            title="ไปยังหน้าจัดการ"
          >
            <Settings2 className="size-4" />
            <span>หน้าจัดการ</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function DashboardHeader({
  activeView = 'orders',
  onViewChange,
  onLogout,
  syncState,
}) {
  const navItems = [
    { id: 'dashboard', label: 'ภาพรวม', icon: Gauge },
    { id: 'orders', label: 'รายการเบิก', icon: ClipboardList },
    { id: 'employees', label: 'ประวัติการเบิก', icon: History },
    { id: 'stock', label: 'สต๊อก', icon: Package },
    { id: 'branches', label: 'จัดการสาขา', icon: Building2 },
  ];

  const getIndicatorColor = () => {
    switch (syncState?.status) {
      case 'success': return 'bg-emerald-400';
      case 'loading':
      case 'saving': return 'bg-amber-400 animate-pulse';
      case 'error': return 'bg-rose-400';
      default: return 'bg-emerald-400';
    }
  };

  return (
    <header className="bg-[#1a2b4c] text-white relative z-10 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        {/* Left: Brand and Mobile controls */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <Logo surface="dashboard" showMark={false} />
          
          {/* Mobile Right Section: Status & Logout */}
          <div className="flex md:hidden items-center gap-3">
            {/* Sync status */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-white/5 border border-white/10 rounded-full px-2 py-1 text-slate-200">
              <div className={`w-1.5 h-1.5 rounded-full ${getIndicatorColor()}`} />
              <span>{syncState?.label || 'พร้อมใช้งาน'}</span>
            </div>
            
            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center justify-center p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10"
              title="ออกจากระบบแอดมิน"
              type="button"
            >
              <LogOut className="size-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Center: Nav items wrapped in nav with aria-label, scrollable on mobile */}
        <nav
          className="gi-dashboard-nav-shell w-full md:w-auto overflow-x-auto md:overflow-x-visible scrollbar-none py-1 md:py-0"
          aria-label="เมนูแอดมิน"
        >
          <div className="flex items-center gap-2 min-w-max md:min-w-0">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => onViewChange?.(item.id)}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right Section: Status & Logout (Desktop only) */}
        <div className="hidden md:flex items-center gap-4">
          {/* Sync status */}
          <div className="flex items-center gap-2 text-xs font-semibold bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-slate-200">
            <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
            <span>{syncState?.label || 'พร้อมใช้งาน'}</span>
            {syncState?.updatedAt ? (
              <span className="text-slate-400 border-l border-white/10 pl-2">
                {new Date(syncState.updatedAt).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : null}
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-slate-300 hover:text-white hover:bg-white/10"
            title="ออกจากระบบแอดมิน"
            type="button"
          >
            <LogOut className="size-4 shrink-0" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
}
