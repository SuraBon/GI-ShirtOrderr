import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card } from './CardComponents';
import { cn } from '../lib/utils';
import {
  ORDER_STATUS_CANCELED,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PENDING,
  normalizeOrderStatus,
} from '../lib/orderState';

export function MobileInfo({ label, value, compact = false, strong = false }) {
  return (
    <div className={cn('min-w-0 rounded-lg bg-[#F8FAFC] px-2.5 py-2', compact && 'bg-white')}>
      <p className="truncate text-[11px] font-bold text-[#64748B]">{label}</p>
      <p
        className={cn(
          'mt-0.5 break-words text-xs leading-5 text-[#071638]',
          strong ? 'font-black' : 'font-bold'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function StatusBadge({ status, small = false }) {
  const displayStatus = normalizeOrderStatus(status);
  let classes = 'bg-[#CBD5E1] text-[#334155]';
  if (displayStatus === ORDER_STATUS_DELIVERED) {
    classes = 'bg-[#DCFCE7] text-[#166534]';
  } else if (displayStatus === ORDER_STATUS_PENDING) {
    classes = 'bg-[#FEE2E2] text-[#991B1B]';
  } else if (displayStatus === ORDER_STATUS_CANCELED) {
    classes = 'bg-[#E2E8F0] text-[#475569]';
  }
  return (
    <span
      data-status={displayStatus}
      className={cn(
        'status-badge inline-flex shrink-0 whitespace-nowrap rounded-full font-bold',
        small ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        classes
      )}
    >
      {displayStatus}
    </span>
  );
}

export function MiniMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#F4F7FC] px-2.5 py-2">
      <p className="truncate text-xs font-bold text-[#64748B]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold text-[#071638]">{value}</p>
    </div>
  );
}

export function DashboardDataNotice({ message, detail, onRetry, refreshing }) {
  return (
    <section className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-900 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-700" />
          <div>
            <h2 className="text-sm font-black">ยังโหลดข้อมูลจริงจาก Google Sheets ไม่สำเร็จ</h2>
            <p className="mt-1 text-xs font-bold leading-5">{message}</p>
            {detail && (
              <p className="mt-1 text-xs font-semibold leading-5 text-yellow-800">{detail}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={refreshing}
          className="dashboard-icon-action inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-yellow-300 bg-white px-3 text-xs font-black text-yellow-900 shadow-xs transition hover:bg-yellow-100 disabled:opacity-60"
          title="โหลดข้อมูลใหม่"
          aria-label="โหลดข้อมูลใหม่"
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </button>
      </div>
    </section>
  );
}

export function Stat({ icon: Icon, value, label }) {
  return (
    <Card className="dashboard-overview-stat-card">
      <div>
        <span>
          <Icon className="size-4" />
        </span>
        <div>
          <p>{value}</p>
          <small>{label}</small>
        </div>
      </div>
    </Card>
  );
}

export function DashboardPageSkeleton({ rows = 6 }) {
  return (
    <div className="dashboard-page-skeleton" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="dashboard-page-skeleton-row">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div
      className="relative z-10 mx-auto grid w-full max-w-[1240px] gap-4 px-4 py-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-h-24 items-center justify-center gap-3 rounded-2xl border border-[#D8DEEA] bg-white/90 text-sm font-bold text-[#44536A] shadow-sm">
        <Loader2 className="size-5 animate-spin text-[#002B5B]" />
        <span>กำลังโหลดข้อมูล...</span>
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/80" />
      ))}
    </div>
  );
}
