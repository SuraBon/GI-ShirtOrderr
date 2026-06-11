import React from 'react';
import { Plus, X } from 'lucide-react';
import { cn, digitsOnly } from '../../lib/utils';
import { getSizeOptionsWithLabels, patchSizeWithDefaultQty, OTHER_SIZE } from '../../lib/config';
import { hasEmployeeData } from '../../lib/orderState';
import { GridSelect, GridInput, Select } from '..';

export function QuickGarmentCellInline({ employee, item, type, dispatch, invalidEmployeeId }) {
  const actualItem = item;
  const showErrors = hasEmployeeData(employee) || invalidEmployeeId === employee.id;
  const sizeOptions = getSizeOptionsWithLabels(type, employee.gender);

  if (!actualItem) {
    return (
      <div className="flex h-11 items-center">
        <button
          onClick={() => dispatch({ type: 'toggleType', id: employee.id, itemType: type })}
          disabled={!employee.gender}
          aria-label={`เพิ่ม ${type}`}
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 text-xs font-bold transition',
            !employee.gender
              ? 'border-[#D8DEEA] bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed'
              : 'border-[#A9B9D1] bg-white text-[#002B5B] hover:bg-[#F4F8FF]'
          )}
        >
          {employee.gender ? (
            <>
              <Plus className="size-3.5" />
              <span className="truncate">เพิ่ม {type}</span>
            </>
          ) : (
            <span className="text-[11px] text-[#A1A1AA]">เลือกเพศก่อน</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border bg-[#F8FAFC] p-2 shadow-sm min-w-[12rem]',
        showErrors &&
          (!actualItem.size || Number(actualItem.qty || 0) <= 0)
          ? 'border-[#EF4444]'
          : 'border-[#E7EAF0]'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-extrabold text-[#44536A] truncate">{type}</span>
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'patchEmployee',
              id: employee.id,
              patch: {
                items: employee.items.filter((it) => it.id !== actualItem.id),
              },
            })
          }
          className="text-[#94A3B8] hover:text-[#B91C1C] transition p-0.5"
          title={`ลบ ${type}`}
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_3.5rem] gap-1">
        <GridSelect
          value={actualItem.size}
          disabled={!employee.gender}
          placeholder="ไซส์"
          values={sizeOptions}
          compact
          invalid={showErrors && !actualItem.size}
          onChange={(value) =>
            dispatch({
              type: 'patchItem',
              id: employee.id,
              itemId: actualItem.id,
              patch: patchSizeWithDefaultQty(actualItem, value),
            })
          }
        />

        <GridInput
          type="number"
          value={actualItem.qty}
          inputMode="numeric"
          placeholder="ตัว"
          invalid={showErrors && Number(actualItem.qty || 0) <= 0}
          onChange={(value) =>
            dispatch({
              type: 'patchItem',
              id: employee.id,
              itemId: actualItem.id,
              patch: { qty: digitsOnly(value) },
            })
          }
          className="text-center font-black"
        />
      </div>

      {actualItem.size === OTHER_SIZE && (
        <GridInput
          type="text"
          value={actualItem.customSize}
          placeholder="ระบุไซส์เพิ่มเติม"
          invalid={showErrors && !actualItem.customSize.trim()}
          onChange={(value) =>
            dispatch({
              type: 'patchItem',
              id: employee.id,
              itemId: actualItem.id,
              patch: { customSize: value },
            })
          }
        />
      )}
    </div>
  );
}

export function GarmentItemsPicker({ employee, clothingTypes, dispatch, invalidEmployeeId }) {
  const selectedTypes = employee.items.map((item) => item.type);
  const availableTypes = clothingTypes.filter((type) => !selectedTypes.includes(type));
  const hasAvailableTypes = availableTypes.length > 0;

  return (
    <div className="grid gap-2">
      {employee.items.length ? (
        employee.items.map((item) => (
          <QuickGarmentCellInline
            key={item.id}
            employee={employee}
            item={item}
            type={item.type}
            dispatch={dispatch}
            invalidEmployeeId={invalidEmployeeId}
          />
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-[#D8DEEA] bg-[#F8FAFC] px-3 py-2 text-center text-xs font-bold text-[#94A3B8]">
          ยังไม่ได้เลือกแบบเสื้อ
        </div>
      )}

      <div className="grid gap-2 rounded-lg border border-dashed border-[#A9B9D1] bg-white p-2">
        <div className="flex items-center justify-between gap-2 text-xs font-black text-[#002B5B]">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Plus className="size-3.5 shrink-0" />
            <span className="truncate">เพิ่มรายการเสื้อ</span>
          </span>
          <span className="shrink-0 text-[11px] font-bold text-[#64748B]">
            {hasAvailableTypes ? `เหลือ ${availableTypes.length} แบบ` : 'เลือกครบแล้ว'}
          </span>
        </div>
        <Select
          value=""
          values={availableTypes}
          disabled={!employee.gender || !hasAvailableTypes}
          placeholder={
            !employee.gender
              ? 'เลือกเพศก่อน'
              : hasAvailableTypes
                ? 'เพิ่มแบบเสื้อ'
                : 'เลือกแบบเสื้อครบแล้ว'
          }
          compact
          onChange={(type) => {
            if (!type) return;
            dispatch({ type: 'toggleType', id: employee.id, itemType: type });
          }}
        />
      </div>
    </div>
  );
}
