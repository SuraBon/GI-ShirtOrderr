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
      <div className="gi-container flex items-center gap-3">
        <Logo surface="dashboard" showMark={false} />
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
        </nav>
        <div className="dashboard-header-actions flex items-center gap-2 md:ml-auto">
          <button
            onClick={onLogout}
            aria-label="ออกจากระบบ"
            className="dashboard-logout-button grid place-items-center rounded-full"
            title="ออกจากระบบแอดมิน"
            type="button"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
