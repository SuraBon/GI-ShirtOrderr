import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Loader2,
  Shirt,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { readClothingConfig, GENDERS } from '../lib/config';
import { getDefaultColumnIds } from '../lib/dashboardTableColumns';

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  loading = false,
  destructive = false,
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && !loading && onCancel?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay confirm-dialog-overlay fixed inset-0 z-[120] bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="confirm-dialog-content fixed left-1/2 top-1/2 z-[121] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl"
        >
          <Dialog.Title className="text-lg font-extrabold text-[#071638]">{title}</Dialog.Title>
          {description ? (
            <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-[#44536A]">
              {description}
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="min-h-11 rounded-xl border border-[#CBD5E1] bg-white px-5 text-sm font-black text-[#071638] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60',
                destructive ? 'bg-[#B91C1C]' : 'bg-[#002B5B]'
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? 'กำลังดำเนินการ...' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ColumnSettingsDialog({
  open,
  title,
  columns,
  visibleColumns,
  onChange,
  onClose,
}) {
  const visibleSet = new Set(visibleColumns);
  const allColumnIds = getDefaultColumnIds(columns);

  function setColumnVisible(columnId, checked) {
    const next = checked
      ? [...new Set([...visibleColumns, columnId])]
      : visibleColumns.filter((id) => id !== columnId);
    onChange(next.length ? next : [columnId]);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-[70] bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[71] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl"
        >
          <Dialog.Title className="text-lg font-extrabold text-[#071638]">{title}</Dialog.Title>
          <div className="mt-4 grid gap-2">
            {columns.map((column) => (
              <label key={column.id} className="table-column-option">
                <input
                  type="checkbox"
                  checked={visibleSet.has(column.id)}
                  onChange={(event) => setColumnVisible(column.id, event.target.checked)}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button type="button" className="dashboard-action-btn" onClick={() => onChange(allColumnIds)}>
              เลือกทั้งหมด
            </button>
            <button type="button" className="dashboard-action-btn" onClick={() => onChange(allColumnIds)}>
              รีเซ็ต
            </button>
            <button type="button" className="dashboard-primary-action" onClick={onClose}>
              เสร็จสิ้น
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SizeReference({ open, setOpen }) {
  const tabs = readClothingConfig();
  const [selectedGender, setSelectedGender] = useState(GENDERS[1] || GENDERS[0]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="size-reference-dialog fixed inset-x-3 bottom-3 top-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#DDE5F0] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(44rem,88vh)] sm:w-[min(46rem,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div className="flex items-center justify-between border-b border-[#E7EAF0] bg-white px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-[#071638] sm:text-xl">
                ข้อมูลเสื้อ
              </Dialog.Title>
            </div>
            <Dialog.Close
              className="grid size-10 shrink-0 place-items-center rounded-full text-[#1F2937] transition hover:bg-[#F1F5F9]"
              aria-label="ปิด"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Tabs.Root defaultValue={tabs[0]?.id} className="flex min-h-0 flex-1 flex-col">
            <Tabs.List className="size-reference-tabs flex shrink-0 gap-1 overflow-x-auto border-b border-[#E7EAF0] bg-[#F8FAFD] px-3 py-2">
              {tabs.map((tab) => (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className="min-h-9 shrink-0 rounded-lg border border-transparent px-3 text-xs font-black text-[#4B5565] transition data-[state=active]:border-[#BFD0EA] data-[state=active]:bg-white data-[state=active]:text-[#071638] data-[state=active]:shadow-sm"
                >
                  {tab.type}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <div className="grid grid-cols-2 gap-2 border-b border-[#E7EAF0] bg-white p-3 sm:px-5">
              {GENDERS.map((gender) => (
                <button
                  key={gender}
                  onClick={() => setSelectedGender(gender)}
                  className={cn(
                    'min-h-10 rounded-xl border text-sm font-black transition',
                    selectedGender === gender
                      ? 'border-[#0D152A] bg-[#0D152A] text-white shadow-sm'
                      : 'border-[#CBD5E1] bg-white text-[#071638] hover:bg-[#F8FAFC]'
                  )}
                >
                  {gender}
                </button>
              ))}
            </div>
            <div className="employee-scroll-region min-h-0 flex-1 overflow-auto bg-[#F6F8FB] p-3 sm:p-4">
              {tabs.map((tab) => {
                const sizeRows = tab.genderSizeRows?.[selectedGender] || tab.sizeRows || [];
                return (
                  <Tabs.Content key={tab.id} value={tab.id} className="outline-none">
                    <div className="overflow-hidden rounded-2xl border border-[#D8DEEA] bg-white shadow-sm">
                      {tab.imageUrl ? (
                        <div className="border-b border-[#E7EAF0] bg-gradient-to-b from-white to-[#F8FAFC] px-4 py-3">
                          <img
                            src={tab.imageUrl}
                            alt={tab.type}
                            className="mx-auto h-36 w-full max-w-[28rem] object-contain sm:h-44"
                          />
                        </div>
                      ) : (
                        <div className="size-reference-empty flex h-32 flex-col items-center justify-center gap-2 border-b border-[#E7EAF0] bg-[#F1F5F9] text-sm font-bold text-[#94A3B8]">
                          <span className="grid size-11 place-items-center rounded-2xl border border-[#D8E3F5] bg-white text-[#64748B]">
                            <Shirt className="size-5" />
                          </span>
                          <span>ยังไม่มีรูปเสื้อ</span>
                        </div>
                      )}
                      <div className="border-b border-[#E7EAF0] px-4 py-3 sm:px-5">
                        <h3 className="text-base font-black text-[#071638] sm:text-lg">
                          {tab.type}
                        </h3>
                      </div>
                      <table className="size-reference-table w-full table-fixed text-center text-sm">
                        <thead>
                          <tr>
                            <th className="border px-3 py-2.5 text-sm font-black sm:text-base">
                              {tab.type.includes('กางเกง') ? 'เอว' : 'ไซส์'}
                            </th>
                            {tab.detailFields.map((field) => (
                              <th
                                key={`${tab.id}-${field}`}
                                className="border px-3 py-2.5 text-sm font-black sm:text-base"
                              >
                                {field}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sizeRows.map(({ size, details }, index) => (
                            <tr key={`${selectedGender}-${size}-${index}`}>
                              <td className="border bg-white px-3 py-2.5 text-base font-semibold">
                                {size}
                              </td>
                              {tab.detailFields.map((field) => (
                                <td
                                  key={`${selectedGender}-${size}-${field}`}
                                  className="border bg-white px-3 py-2.5 text-base font-semibold"
                                >
                                  {details?.[field] || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Tabs.Content>
                );
              })}
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ConfirmDialog, ColumnSettingsDialog, SizeReference };

