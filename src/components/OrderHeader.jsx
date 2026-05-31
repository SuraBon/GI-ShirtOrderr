import React from "react";
import { Ruler, LayoutDashboard } from "lucide-react";
import { cn } from "../lib/utils";

export function Logo() {
  return (
    <div className="flex min-w-0 items-center">
      <div className="min-w-0">
        <h1 className="text-lg font-black leading-none tracking-tight text-primary-900 sm:text-xl">
          ระบบเบิกเสื้อพนักงาน
        </h1>
        <p className="mt-0.5 hidden text-[11px] font-bold leading-none text-neutral-600 sm:block">
          Gold Integrate
        </p>
      </div>
    </div>
  );
}

export function OrderHeader({ branch, onSizeOpen, onOpenDashboard }) {
  return (
    <header className="relative z-10 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-primary-50 px-2 py-2.5 shadow-xs backdrop-blur-sm sm:px-3">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 sm:gap-3">
        <Logo />
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={onSizeOpen}
            className="btn-secondary flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs sm:text-sm transition"
            title="ดูข้อมูลและขนาดของเสื้อ"
          >
            <Ruler className="size-4" />
            <span>ข้อมูลเสื้อ</span>
          </button>
          <button
            onClick={onOpenDashboard}
            className="btn-outline flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-black sm:text-sm shadow-sm transition hover:shadow-md sm:hover:-translate-y-0.5 active:scale-95"
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

export function DashboardHeader({ onOpenOrder }) {
  return (
    <header className="relative z-10 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-primary-50 px-3 py-2 backdrop-blur-sm shadow-xs">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenOrder}
            className="btn-outline flex min-h-9 items-center gap-1 px-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            title="ไปยังหน้าสั่งเบิกเสื้อ"
          >
            <span>👕</span>
            <span>เปิดหน้าสั่งเบิกเสื้อ</span>
          </button>
          <span className="hidden min-h-9 items-center gap-1 rounded-lg bg-primary-600 px-3 text-sm font-bold text-white shadow-sm sm:flex">
            <LayoutDashboard size={16} />
            แดชบอร์ด
          </span>
        </div>
      </div>
    </header>
  );
}