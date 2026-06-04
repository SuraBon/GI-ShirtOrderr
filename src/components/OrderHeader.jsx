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
    <header className="w-full bg-[#1a2b4c] text-white shadow-md border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left Section (Brand) */}
        <div className="font-bold text-lg text-white tracking-wide">ระบบเบิกเสื้อพนักงาน</div>

        {/* Center Section (Menu) */}
        <nav className="hidden md:flex items-center gap-1" aria-label="เมนูแอดมิน">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={
                  isActive
                    ? 'bg-white/20 text-white px-3 py-2 rounded-md text-sm font-medium'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors'
                }
                onClick={() => onViewChange?.(item.id)}
                type="button"
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="flex items-center gap-1.5">
                  {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Section (Status & Logout) */}
        <div className="flex items-center gap-4">
          {/* Sync status */}
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className={`w-2 h-2 rounded-full ${getIndicatorColor()}`}></span>
            <span>
              {syncState?.status === 'loading' || syncState?.status === 'saving'
                ? 'กำลังซิงก์...'
                : 'ซิงก์แล้ว'}{' '}
              {syncState?.updatedAt
                ? new Date(syncState.updatedAt).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '02:54'}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition-colors"
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
