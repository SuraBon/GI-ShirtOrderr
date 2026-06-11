import React from 'react';
import { cn, formatDashboardDate } from '../../lib/utils';
import { GENDERS, OTHER_SIZE } from '../../lib/config';
import { ORDER_STATUS_PENDING, ORDER_STATUS_DELIVERED, ORDER_STATUS_CANCELED } from '../../lib/orderState';
import { StatusBadge, MobileInfo } from '../DashboardCommon';

export function BatchItemMobileCard({ batch, order, item, isBusy, clothingConfig, onItemStatusChange }) {
  const requested = Number(item.qty || 0);
  const gender = order.gender || GENDERS[0];
  const clothing = clothingConfig.find((configItem) => configItem.type === item.type);
  const rows = clothing?.genderSizeRows?.[gender] || clothing?.sizeRows || [];
  const stockRow = rows.find((row) => String(row.size) === String(item.size));
  const currentStock = item.size === OTHER_SIZE ? requested : Number(stockRow?.qty || 0);
  const currentStatus = item.status || ORDER_STATUS_PENDING;
  const canShip =
    currentStatus === ORDER_STATUS_DELIVERED || item.size === OTHER_SIZE || currentStock >= requested;

  return (
    <div className={cn('rounded-lg bg-[#F8FAFC] p-3', !canShip && 'bg-[#FEF2F2]')}>
      <div className="flex items-center justify-between gap-2">
        <p className="break-words text-sm font-extrabold text-[#071638]">{item.type}</p>
        <StatusBadge status={currentStatus} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs min-[520px]:grid-cols-4">
        <MobileInfo label="ไซส์" value={item.size || '-'} compact />
        <MobileInfo label="จำนวน" value={item.qty} compact strong />
        <MobileInfo label="สต๊อก" value={item.size === OTHER_SIZE ? '-' : currentStock} compact />
        <MobileInfo label="อัปเดต" value={formatDashboardDate(item.statusUpdatedAt || batch.statusUpdatedAt || batch.submittedAt)} compact />
      </div>
      {!canShip && currentStatus !== ORDER_STATUS_CANCELED && (
        <p className="mt-2 text-xs font-black text-[#B91C1C]">สต๊อกไม่พอ (มี {currentStock})</p>
      )}
      <div className="flex flex-row items-center gap-2 flex-nowrap mt-3">
        <button
          type="button"
          disabled={isBusy || currentStatus === ORDER_STATUS_DELIVERED || !canShip}
          onClick={() => onItemStatusChange?.(batch, order, item, ORDER_STATUS_DELIVERED)}
          className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          จัดส่งแล้ว
        </button>
        <button
          type="button"
          disabled={isBusy || currentStatus === ORDER_STATUS_PENDING}
          onClick={() => onItemStatusChange?.(batch, order, item, ORDER_STATUS_PENDING)}
          className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          รอจัดส่ง
        </button>
        <button
          type="button"
          disabled={isBusy || currentStatus === ORDER_STATUS_CANCELED}
          onClick={() => onItemStatusChange?.(batch, order, item, ORDER_STATUS_CANCELED)}
          className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
