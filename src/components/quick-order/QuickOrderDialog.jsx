import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { UserPlus, Users, Ruler, Shirt, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, digitsOnly, genderSymbol } from '../../lib/utils';
import { getClothingTypes, GENDERS } from '../../lib/config';
import { hasEmployeeData } from '../../lib/orderState';
import { Field, TextArea, Select, GridInput } from '..';
import { ConfirmDialog } from '../SharedDialogs';

export function QuickOrderDialog({ open, setOpen, state, dispatch }) {
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [namesText, setNamesText] = useState('');
  const [gender, setGender] = useState(GENDERS[0]);
  const [defaultSizeValue, setDefaultSizeValue] = useState('M');
  const clothingTypes = getClothingTypes();
  const [customItems, setCustomItems] = useState(() =>
    clothingTypes.map(() => ({ enabled: false, qty: '2' }))
  );
  const quickSizes = [
    'S',
    'M',
    'L',
    'XL',
    '2XL',
    '3XL',
    '4XL',
    '5XL',
    '28',
    '30',
    '32',
    '34',
    '36',
    '38',
    '40',
    '42',
    '44',
  ];
  const names = namesText
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  useEffect(() => {
    setCustomItems((items) =>
      clothingTypes.map((type, index) => {
        const current = items[index] || {};
        return {
          enabled: Boolean(current.enabled),
          qty: current.qty || '2',
        };
      })
    );
  }, [clothingTypes.join('|')]);

  function applyQuickOrder() {
    if (!names.length) {
      toast.error('ยังไม่มีรายชื่อพนักงาน', {
        description: 'โปรดวางรายชื่อพนักงานอย่างน้อย 1 คน (หนึ่งชื่อต่อบรรทัด)',
      });
      return;
    }
    const hasExistingData = state.employees.some(hasEmployeeData);
    if (hasExistingData) {
      setReplaceConfirmOpen(true);
      return;
    }
    applyQuickOrderNow();
  }

  function applyQuickOrderNow() {
    dispatch({
      type: 'applyQuickOrder',
      names,
      quickOrder: { gender, defaultSizeValue, customItems },
    });
    setNamesText('');
    setReplaceConfirmOpen(false);
    setOpen(false);
    toast.success(`เพิ่มรายชื่อพนักงาน ${names.length} คนเรียบร้อยแล้ว`);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(54rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="flex items-center justify-between border-b border-[#E7EAF0] px-4 py-3">
              <div className="min-w-0">
                <Dialog.Title className="flex items-center gap-2 text-lg font-extrabold text-[#071638]">
                  <UserPlus className="size-5 text-[#0A2A5E]" /> เพิ่มพนักงานหลายคน
                </Dialog.Title>
                <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                  วางรายชื่อและตั้งชุดเสื้อตั้งต้นเพื่อใช้ได้ทันที
                </p>
              </div>
              <Dialog.Close
                className="grid size-9 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]"
                aria-label="ปิด"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="employee-scroll-region max-h-[calc(88vh-4.5rem)] overflow-y-auto p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-[#071638]">
                    <Users className="size-4 text-[#0A2A5E]" /> รายชื่อพนักงาน
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-[#64748B]">หนึ่งชื่อต่อบรรทัด</p>
                </div>
                <span className="rounded-md bg-[#EEF4FF] px-2.5 py-1 text-xs font-black text-[#002B5B]">
                  {names.length} คน
                </span>
              </div>
              <Field label="รายชื่อพนักงาน">
                <TextArea
                  value={namesText}
                  onChange={setNamesText}
                  placeholder={'วันท์ สวนศักดิ์\nคิม ชมภูดิน\nจีจี บัวสวรรค์\nเพิ่มเติม...'}
                  title="วางรายชื่อพนักงานหนึ่งชื่อในแต่ละบรรทัด"
                  rows={6}
                />
              </Field>

              <div className="mt-4 border-t border-[#E7EAF0] pt-4">
                <h2 className="flex items-center gap-2 text-base font-extrabold text-[#071638]">
                  <Ruler className="size-4 text-[#0A2A5E]" /> ชุดเสื้อตั้งต้น
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                  เลือกเพศ ไซส์ และประเภทเสื้อที่ต้องการให้ทุกคน
                </p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <Field label="เพศตั้งต้น">
                    <div className="grid grid-cols-2 gap-2">
                      {GENDERS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={cn(
                            'min-h-10 rounded-lg border font-bold transition',
                            gender === g
                              ? 'border-[#002B5B] bg-[#002B5B] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#071638]'
                          )}
                        >
                          <span className="text-base">{genderSymbol(g)}</span> {g}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="ไซส์ตั้งต้น">
                    <Select
                      value={defaultSizeValue}
                      values={quickSizes}
                      onChange={setDefaultSizeValue}
                      placeholder="เลือกไซส์"
                      usePortal={false}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-4 border-t border-[#E7EAF0] pt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#071638]">
                      <Shirt className="size-4 text-[#0A2A5E]" /> ประเภทเสื้อ
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                      เลือกแบบเสื้อและระบุจำนวน
                    </p>
                  </div>
                </div>
                <div className="grid max-h-[16rem] grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-2 overflow-y-auto rounded-xl border border-[#D8DEEA] bg-white p-2">
                  {clothingTypes.map((type, index) => {
                    return (
                      <div
                        key={type}
                        className={cn(
                          'grid gap-2 rounded-lg border p-2 text-sm font-bold text-[#071638] min-[460px]:grid-cols-[minmax(0,1fr)_5.25rem] min-[460px]:items-center',
                          customItems[index]?.enabled
                            ? 'border-[#BFD0EA] bg-[#F8FBFF]'
                            : 'border-[#EEF2F7] bg-white'
                        )}
                      >
                        <label className="flex min-h-11 min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(customItems[index]?.enabled)}
                            onChange={(event) =>
                              setCustomItems((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        enabled: event.target.checked,
                                      }
                                    : item
                                )
                              )
                            }
                            className="size-4 shrink-0 accent-[#002B5B]"
                          />
                          <span className="min-w-0 truncate">{type}</span>
                        </label>
                        <GridInput
                          type="number"
                          value={customItems[index]?.qty || '2'}
                          onChange={(value) =>
                            setCustomItems((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, qty: digitsOnly(value) } : item
                              )
                            )
                          }
                          inputMode="numeric"
                          disabled={!customItems[index]?.enabled}
                          placeholder="จำนวน"
                          title="ระบุจำนวนเสื้อที่ต้องการสั่งต่อคน"
                          className="text-center font-black"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={applyQuickOrder}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#002B5B] px-4 font-bold text-white transition hover:bg-[#013A78] active:scale-95"
              >
                <UserPlus /> ยืนยันเพิ่มเข้ารายการ
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={replaceConfirmOpen}
        title="แทนที่รายการเดิม"
        description="มีรายชื่อเดิมอยู่แล้ว ต้องการแทนที่ด้วยรายชื่อชุดใหม่หรือไม่?"
        confirmLabel="แทนที่"
        cancelLabel="ยกเลิก"
        onCancel={() => setReplaceConfirmOpen(false)}
        onConfirm={applyQuickOrderNow}
      />
    </>
  );
}
