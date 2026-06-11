import React, { useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Truck, Loader2 } from 'lucide-react';
import { cn, formatPhone } from '../../lib/utils';
import { GENDERS, OTHER_SIZE } from '../../lib/config';
import {
  ORDER_STATUS_PENDING,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_CANCELED,
  ORDER_STATUSES,
  flattenBatches
} from '../../lib/orderState';
import { MiniMetric, StatusBadge } from '../DashboardCommon';
import { CustomSelect } from '..';
import { BatchItemMobileCard } from './BatchItemMobileCard';

function getBatchPieces(batch) {
  return flattenBatches([batch]).reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function buildBatchItemSummary(batch) {
  if (!batch) return [];
  const summaryMap = new Map();
  batch.orders.forEach((order) => {
    const gender = order.gender || GENDERS[0];
    order.items.forEach((item) => {
      const key = `${item.type}::${gender}::${item.size}`;
      const existing = summaryMap.get(key) || 0;
      summaryMap.set(key, existing + Number(item.qty || 0));
    });
  });
  return Array.from(summaryMap.entries()).map(([key, qty], idx) => {
    const [type, gender, size] = key.split('::');
    return { id: `summary-item-${idx}`, type, gender, size, qty };
  });
}

export function BatchDetailDialog({
  batch,
  onClose,
  onStatusChange,
  onItemStatusChange,
  onDelete,
  statusLoadingId = '',
  deleteLoadingId = '',
  onShipClick,
  clothingConfig = [],
}) {
  const isUpdatingStatus = Boolean(batch && statusLoadingId === batch.batchId);
  const isDeleting = Boolean(batch && deleteLoadingId === batch.batchId);
  const isBusy = isUpdatingStatus || isDeleting;
  
  function confirmDelete() {
    if (batch && !isBusy) onDelete(batch.batchId);
  }

  const hasNoPendingItems =
    batch &&
    batch.orders
      .flatMap((o) => o.items)
      .every((item) => [ORDER_STATUS_DELIVERED, ORDER_STATUS_CANCELED].includes(item.status));
      
  const shirtSummaryRows = useMemo(() => buildBatchItemSummary(batch), [batch]);

  return (
    <Dialog.Root open={Boolean(batch)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(58rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          {batch && (
            <>
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[#E7EAF0] px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <Dialog.Title className="break-words text-lg font-extrabold text-[#071638] sm:text-xl">
                    {batch.companyName || 'ไม่ระบุบริษัท'}
                  </Dialog.Title>
                  <p className="mt-1 text-sm font-bold text-[#002B5B]">{batch.branch}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#64748B]">
                    {batch.batchId}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={batch.status} />
                  <Dialog.Close
                    className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]"
                    aria-label="ปิด"
                  >
                    <X />
                  </Dialog.Close>
                </div>
              </div>
              <div className="max-h-[64vh] overflow-auto p-3 sm:p-4">
                <div className="mb-4 grid gap-3 sm:grid-cols-5">
                  <MiniMetric label="บริษัท" value={batch.companyName || '-'} />
                  <MiniMetric label="ผู้ติดต่อ" value={batch.supervisorName || '-'} />
                  <MiniMetric
                    label="เบอร์ติดต่อ"
                    value={formatPhone(batch.supervisorPhone) || '-'}
                  />
                  <MiniMetric label="จำนวนรวม" value={`${getBatchPieces(batch)} ชิ้น`} />
                  <div className="min-w-0 rounded-xl bg-[#F4F7FC] px-3 py-3">
                    <p className="truncate text-xs font-bold text-[#64748B]">สถานะ</p>
                    <div className="mt-1">
                      <CustomSelect
                        value={batch.status}
                        values={ORDER_STATUSES}
                        disabled={isBusy}
                        onChange={(status) => onStatusChange(batch.batchId, status)}
                        compact
                        usePortal={false}
                      />
                    </div>
                  </div>
                </div>
                <p className="mb-4 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-bold text-[#002B5B]">
                  อัปเดตสถานะล่าสุด:{' '}
                  {new Date(batch.statusUpdatedAt).toLocaleString('th-TH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                <div className="mb-4 flex flex-col gap-2">
                  {!hasNoPendingItems && (
                    <button
                      onClick={onShipClick}
                      disabled={isBusy}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#002B5B] font-bold text-white shadow-sm transition hover:bg-[#002144] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Truck className="size-4" /> ดำเนินการจัดส่ง (แยกตามรายการ)
                    </button>
                  )}
                  <button
                    onClick={confirmDelete}
                    disabled={isBusy}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] font-bold text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isDeleting ? 'กำลังลบรายการเบิก' : 'ลบรายการเบิกนี้'}
                  </button>
                </div>
                <section className="mb-4 overflow-hidden rounded-xl border border-[#DCE6F4] bg-white">
                  <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EEF4FF] px-3 py-3 sm:px-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-[#071638]">สรุปรายการเสื้อ</h3>
                      <p className="mt-1 text-xs font-bold text-[#64748B]">
                        รวมตามเสื้อ เพศ ไซส์ และจำนวน
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-[#002B5B]">
                      {getBatchPieces(batch)} ชิ้น
                    </span>
                  </div>
                  <div className="grid gap-2 p-3 sm:hidden">
                    {shirtSummaryRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-[#F8FAFC] p-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-extrabold text-[#071638]">
                            {row.type}
                          </p>
                          <p className="mt-1 text-xs font-bold text-[#64748B]">
                            {row.gender} · ไซส์ {row.size}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-sm font-extrabold text-[#002B5B]">
                          {row.qty} ชิ้น
                        </p>
                      </div>
                    ))}
                  </div>
                  <table className="hidden w-full table-fixed text-left text-sm sm:table">
                    <thead className="text-xs font-bold text-[#44536A]">
                      <tr>
                        <th className="px-3 py-3 sm:px-4">เสื้อ</th>
                        <th className="w-24 px-3 py-3 sm:w-28 sm:px-4">เพศ</th>
                        <th className="w-20 px-3 py-3 sm:w-24 sm:px-4">ไซส์</th>
                        <th className="w-20 px-3 py-3 text-right sm:w-24 sm:px-4">จำนวน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shirtSummaryRows.map((row) => (
                        <tr key={row.id} className="border-t border-[#E2E8F0]">
                          <td className="break-words px-3 py-3 font-bold sm:px-4">{row.type}</td>
                          <td className="break-words px-3 py-3 sm:px-4">{row.gender}</td>
                          <td className="break-words px-3 py-3 sm:px-4">{row.size}</td>
                          <td className="px-3 py-3 text-right font-extrabold sm:px-4">
                            {row.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <div className="grid gap-3">
                  {batch.orders.map((order) => (
                    <div
                      key={`${batch.batchId}-${order.name}`}
                      className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EEF4FF] px-3 py-3 sm:px-4">
                        <div className="min-w-0">
                          <p className="break-words font-extrabold text-[#071638]">{order.name}</p>
                          <p className="text-xs font-bold text-[#64748B]">{order.gender}</p>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold text-[#002B5B]">
                          {order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)} ชิ้น
                        </span>
                      </div>
                      <div className="grid gap-2 p-3 sm:hidden">
                        {order.items.map((item, itemIdx) => (
                          <BatchItemMobileCard
                            key={`${order.name}-${item.type}-${item.size}-${itemIdx}`}
                            batch={batch}
                            order={order}
                            item={item}
                            isBusy={isBusy}
                            clothingConfig={clothingConfig}
                            onItemStatusChange={onItemStatusChange}
                          />
                        ))}
                      </div>
                      <table className="batch-items-table hidden w-full text-left text-sm sm:table">
                        <colgroup>
                          <col className="batch-items-type-col" />
                          <col className="batch-items-size-col" />
                          <col className="batch-items-qty-col" />
                          <col className="batch-items-status-col" />
                        </colgroup>
                        <thead className="text-xs font-bold text-[#44536A]">
                          <tr>
                            <th className="px-3 py-3 sm:px-4">ประเภท</th>
                            <th className="w-16 px-3 py-3 sm:w-20 sm:px-4">ไซส์</th>
                            <th className="w-16 px-3 py-3 text-right sm:w-20 sm:px-4">จำนวน</th>
                            <th className="w-28 px-3 py-3 text-center sm:w-32 sm:px-4">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, itemIdx) => {
                            const requested = Number(item.qty || 0);
                            const gender = order.gender || GENDERS[0];
                            const clothing = clothingConfig.find((c) => c.type === item.type);
                            const rows = clothing?.genderSizeRows?.[gender] || clothing?.sizeRows || [];
                            const stockRow = rows.find((row) => String(row.size) === String(item.size));
                            const currentStock =
                              item.size === OTHER_SIZE ? requested : Number(stockRow?.qty || 0);
                            const currentStatus = item.status || ORDER_STATUS_PENDING;
                            const canShip =
                              currentStatus === ORDER_STATUS_DELIVERED ||
                              item.size === OTHER_SIZE ||
                              currentStock >= requested;
                            return (
                              <tr
                                key={`${order.name}-${item.type}-${item.size}-${itemIdx}`}
                                className={cn(
                                  'border-t border-[#E2E8F0]',
                                  !canShip &&
                                    currentStatus !== ORDER_STATUS_DELIVERED &&
                                    currentStatus !== ORDER_STATUS_CANCELED &&
                                    'bg-[#FEF2F2]'
                                )}
                              >
                                <td className="break-words px-3 py-3 font-bold sm:px-4">
                                  {item.type}
                                </td>
                                <td className="break-words px-3 py-3 sm:px-4">{item.size}</td>
                                <td className="px-3 py-3 text-right font-extrabold sm:px-4">
                                  {item.qty}
                                </td>
                                <td className="px-3 py-3 text-center sm:px-4">
                                  <div className="batch-item-status-cell">
                                    <StatusBadge status={currentStatus} />
                                    <div className="flex flex-row items-center gap-2 flex-nowrap mt-1">
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        disabled={isBusy || currentStatus === ORDER_STATUS_DELIVERED || !canShip}
                                        onClick={() =>
                                          onItemStatusChange?.(batch, order, item, ORDER_STATUS_DELIVERED)
                                        }
                                        title={!canShip ? `สต๊อกไม่พอ (มี ${currentStock})` : 'อัปเดตเป็นจัดส่งแล้ว'}
                                      >
                                        จัดส่งแล้ว
                                      </button>
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        disabled={isBusy || currentStatus === ORDER_STATUS_PENDING}
                                        onClick={() =>
                                          onItemStatusChange?.(batch, order, item, ORDER_STATUS_PENDING)
                                        }
                                      >
                                        รอจัดส่ง
                                      </button>
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        disabled={isBusy || currentStatus === ORDER_STATUS_CANCELED}
                                        onClick={() =>
                                          onItemStatusChange?.(batch, order, item, ORDER_STATUS_CANCELED)
                                        }
                                      >
                                        ยกเลิก
                                      </button>
                                    </div>
                                    {!canShip &&
                                      currentStatus !== ORDER_STATUS_DELIVERED &&
                                      currentStatus !== ORDER_STATUS_CANCELED && (
                                      <span className="understock-flag text-rose-600 text-xs font-bold mt-1 block">สต๊อกไม่พอ (มี {currentStock})</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
