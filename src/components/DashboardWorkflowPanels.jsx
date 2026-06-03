import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PackageSearch,
  Shirt,
  XCircle,
} from 'lucide-react';

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getBatchPieces(batch) {
  return (batch.orders || []).reduce(
    (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0),
    0
  );
}

function sortBySubmittedAt(direction = 'asc') {
  return (a, b) => {
    const first = new Date(a.submittedAt || 0).getTime();
    const second = new Date(b.submittedAt || 0).getTime();
    return direction === 'asc'
      ? first - second || String(a.batchId).localeCompare(String(b.batchId), 'th', { numeric: true })
      : second - first || String(b.batchId).localeCompare(String(a.batchId), 'th', { numeric: true });
  };
}

function PanelShell({ title, description, action, children, tone = 'default' }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col gap-4 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`dashboard-workflow-status ${tone}`}>{children}</span>;
}

export function DashboardEmptyState({ onOpenOrder }) {
  return (
    <section className="dashboard-workflow-empty">
      <span className="dashboard-workflow-empty-icon" aria-hidden="true">
        <ClipboardList className="size-6" />
      </span>
      <div>
        <h3>ไม่มีรายการในขณะนี้</h3>
        <p>ข้อมูลชุดนี้ยังเป็นเดโม่หรือเพิ่งเริ่มใหม่ เปิดหน้าสั่งเบิกเสื้อเพื่อสร้างรายการแรก</p>
      </div>
      <button type="button" className="dashboard-primary-action" onClick={onOpenOrder}>
        เปิดหน้าสั่งเบิกเสื้อ
      </button>
    </section>
  );
}

export function DashboardInlineEmptyState({ title = 'ไม่มีรายการในขณะนี้', description, onOpenOrder }) {
  return (
    <div className="dashboard-inline-empty">
      <PackageSearch className="size-5" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {onOpenOrder ? (
        <button type="button" onClick={onOpenOrder}>
          เปิดหน้าสั่งเบิกเสื้อ
        </button>
      ) : null}
    </div>
  );
}

export function DashboardTaskPanel({ batches, statuses, onOpenOrders, onViewAll, onQuickShip }) {
  const pendingStatus = statuses?.pending || 'รอจัดส่ง';
  const rows = useMemo(
    () =>
      batches
        .filter((batch) => batch.status === pendingStatus)
        .sort(sortBySubmittedAt('asc'))
        .slice(0, 5),
    [batches, pendingStatus]
  );

  return (
    <PanelShell
      title="งานที่ต้องทำ"
      description="รายการรอจัดส่ง เรียงจากเก่าสุด"
      tone="priority"
      action={rows.length ? <button type="button" className="dashboard-panel-link-action" onClick={onViewAll}>ดูทั้งหมด</button> : null}
    >
      <div className="dashboard-workflow-list">
        {rows.map((batch) => (
          <div
            key={batch.batchId}
            role="button"
            tabIndex={0}
            className="dashboard-workflow-row is-pending"
            onClick={onOpenOrders}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenOrders?.();
              }
            }}
          >
            <span className="dashboard-workflow-row-icon warning" aria-hidden="true">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <strong>{batch.batchId}</strong>
              <p>{batch.branch || '-'} · {formatDate(batch.submittedAt)} · {getBatchPieces(batch)} ชิ้น</p>
            </div>
            <div className="dashboard-workflow-row-actions">
              <StatusPill tone="warning">{batch.status}</StatusPill>
              <button
                type="button"
                className="dashboard-workflow-quick-action"
                onClick={(event) => {
                  event.stopPropagation();
                  onQuickShip?.(batch);
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                }}
              >
                จัดส่งด่วน
              </button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="dashboard-empty-line">ไม่มีงานรอจัดส่งตอนนี้</div>}
      </div>
    </PanelShell>
  );
}

export function DashboardStockPanel({ stockRows, onOpenStock, onViewAll }) {
  const lowRows = useMemo(
    () =>
      stockRows
        .filter((row) => Number(row.remaining || 0) <= 10)
        .sort((a, b) => Number(a.remaining || 0) - Number(b.remaining || 0))
        .slice(0, 5),
    [stockRows]
  );

  return (
    <PanelShell
      title="รายการที่ควรเติม"
      description="เพศและไซส์ที่ควรตรวจจำนวนคงเหลือ"
      action={lowRows.length ? <button type="button" className="dashboard-panel-link-action" onClick={onViewAll || onOpenStock}>ดูทั้งหมด</button> : null}
    >
      <div className="dashboard-workflow-list">
        {lowRows.map((row) => (
          <button key={row.id} type="button" className="dashboard-workflow-row" onClick={onOpenStock}>
            <span className="dashboard-workflow-row-icon blue" aria-hidden="true">
              <Shirt className="size-4" />
            </span>
            <div>
              <strong>{row.type}</strong>
              <p>{row.gender} · ไซส์ {row.size}</p>
            </div>
            <StatusPill tone={Number(row.remaining || 0) <= 0 ? 'danger' : 'warning'}>
              เหลือ {Number(row.remaining || 0).toLocaleString('th-TH')}
            </StatusPill>
          </button>
        ))}
        {!lowRows.length && <div className="dashboard-empty-line">จำนวนคงเหลืออยู่ในระดับปกติ</div>}
      </div>
    </PanelShell>
  );
}

export function DashboardStatusPanel({ batches, statuses, onOpenOrders }) {
  const pendingStatus = statuses?.pending || 'รอจัดส่ง';
  const deliveredStatus = statuses?.delivered || 'จัดส่งแล้ว';
  const canceledStatus = statuses?.canceled || 'ยกเลิก';
  const rows = useMemo(
    () => [
      {
        id: 'pending',
        icon: AlertTriangle,
        tone: 'warning',
        label: pendingStatus,
        description: 'รายการที่ยังต้องดำเนินการ',
        value: batches.filter((batch) => batch.status === pendingStatus).length,
      },
      {
        id: 'delivered',
        icon: CheckCircle2,
        tone: 'success',
        label: deliveredStatus,
        description: 'รายการที่จัดส่งครบแล้ว',
        value: batches.filter((batch) => batch.status === deliveredStatus).length,
      },
      {
        id: 'canceled',
        icon: XCircle,
        tone: 'danger',
        label: canceledStatus,
        description: 'รายการที่ถูกยกเลิก',
        value: batches.filter((batch) => batch.status === canceledStatus).length,
      },
    ],
    [batches, pendingStatus, deliveredStatus, canceledStatus]
  );

  return (
    <PanelShell
      title="สรุปสถานะ"
      description="ภาพรวมจำนวนรายการตามสถานะ"
    >
      <div className="dashboard-workflow-list">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <button key={row.id} type="button" className="dashboard-workflow-row" onClick={onOpenOrders}>
              <span className={`dashboard-workflow-row-icon ${row.tone}`} aria-hidden="true">
                <Icon className="size-4" />
              </span>
              <div>
                <strong>{row.label}</strong>
                <p>{row.description}</p>
              </div>
              <StatusPill tone={row.tone}>{row.value.toLocaleString('th-TH')} รายการ</StatusPill>
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}
