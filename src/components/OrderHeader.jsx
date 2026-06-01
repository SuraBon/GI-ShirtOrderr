import React from 'react';
import { HelpCircle, LayoutDashboard, Ruler, Settings, Shirt, UserCheck } from 'lucide-react';

export function Logo({ surface = 'order' }) {
  const isDashboard = surface === 'dashboard';

  return (
    <div className="gi-brand flex min-w-0 items-center gap-3">
      <span className="gi-brand-mark" aria-hidden="true">
        GI
      </span>
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

export function OrderHeader({ onSizeOpen, onOpenDashboard, onManualOpen }) {
  return (
    <header className="gi-order-header relative z-10 border-b border-neutral-200 bg-white px-2 py-2.5 shadow-xs sm:px-3">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 sm:gap-3">
        <Logo />
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={onManualOpen}
            className="btn-secondary flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs transition sm:text-sm"
            title="คู่มือการใช้งานระบบ"
          >
            <HelpCircle className="size-4" />
            <span>คู่มือการใช้งาน</span>
          </button>
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
            title="ไปยังแดชบอร์ด"
          >
            <LayoutDashboard className="size-4" />
            <span>แดชบอร์ด</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function DashboardHeader({ activeView = 'orders', onViewChange, onOpenOrder }) {
  const navItems = [
    { id: 'orders', label: 'Orders' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inventory', label: 'Inventory' },
  ];

  return (
    <header className="gi-dashboard-header relative z-10 border-b px-3 py-2 shadow-xs">
      <div className="mx-auto flex max-w-[1520px] items-center gap-3">
        <Logo surface="dashboard" />
        <nav className="gi-dashboard-nav flex items-center gap-2" aria-label="Dashboard">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activeView === item.id ? 'active' : ''}
              onClick={() => onViewChange?.(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 md:ml-auto">
          <button
            onClick={onOpenOrder}
            className="btn-outline flex min-h-9 items-center gap-1.5 px-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            title="ไปยังหน้าสั่งเบิกเสื้อ"
          >
            <Shirt className="size-4" />
            <span>เปิดหน้าสั่งเบิกเสื้อ</span>
          </button>
          <button
            className="dashboard-header-icon hidden size-9 place-items-center rounded-lg text-white/90 hover:bg-white/10 lg:grid"
            onClick={() => onViewChange?.('inventory')}
            title="จัดการสต็อก"
            type="button"
          >
            <Settings size={18} />
          </button>
          <span className="hidden min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-bold text-white sm:flex">
            <span className="grid size-8 place-items-center rounded-full bg-white text-[#0A2A5E]">
              <UserCheck size={16} />
            </span>
            <span className="hidden leading-tight xl:block">
              <span className="block text-xs font-black">Admin User</span>
              <span className="block text-[10px] font-semibold text-white/70">Administrator</span>
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
