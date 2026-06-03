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
        <h1 className="truncate text-lg font-black leading-none tracking-tight text-primary-900 sm:text-xl">
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

  return (
    <header className="gi-dashboard-header relative z-10 border-b px-3 py-2 shadow-xs">
      <div className="gi-container grid items-center gap-3 lg:grid-cols-[minmax(12rem,auto)_minmax(0,1fr)_auto]">
        <Logo surface="dashboard" showMark={false} />
        <div className="gi-dashboard-nav-shell">
          <nav className="gi-dashboard-nav flex items-center gap-2" aria-label="เมนูแอดมิน">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={activeView === item.id ? 'active' : ''}
                onClick={() => onViewChange?.(item.id)}
                type="button"
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                {item.icon ? <item.icon className="size-4" /> : null}
                {item.label}
              </button>
            ))}
            <button
              onClick={onLogout}
              className="dashboard-nav-logout"
              title="ออกจากระบบแอดมิน"
              type="button"
            >
              <LogOut className="size-4" />
              ออกจากระบบ
            </button>
          </nav>
          <span className="gi-dashboard-nav-scroll-cue" aria-hidden="true">เลื่อนดูเมนู</span>
        </div>
        <div className="gi-dashboard-header-right">
          <span className={`dashboard-sync-indicator ${syncState?.status || 'idle'}`}>
            <span aria-hidden="true" />
            <strong>{syncState?.label || 'พร้อมใช้งาน'}</strong>
            {syncState?.updatedAt ? (
              <small>
                {new Date(syncState.updatedAt).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </small>
            ) : null}
          </span>
        </div>
      </div>
    </header>
  );
}
