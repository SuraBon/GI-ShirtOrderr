import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn, genderSymbol } from '../../lib/utils';
import { getClothingTypes, GENDERS } from '../../lib/config';
import {
  canDeleteEmployee,
  isEmployeeComplete,
  hasEmployeeData
} from '../../lib/orderState';
import { TextInput, Field } from '..';
import { GarmentItemsPicker, QuickGarmentCellInline } from './GarmentItemsPicker';

function getFilteredEmployees(employees, query, showIncompleteOnly) {
  const normalizedQuery = query.trim().toLowerCase();
  return employees.filter((employee) => {
    const matchesStatus = !showIncompleteOnly || !isEmployeeComplete(employee);
    const matchesQuery =
      !normalizedQuery ||
      [
        employee.name,
        employee.gender,
        employee.items.map((it) => `${it.type} ${it.size}`).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
}

export function QuickMobileList({
  employees,
  dispatch,
  query,
  showIncompleteOnly,
  invalidEmployeeId,
}) {
  const filteredEmployees = getFilteredEmployees(employees, query, showIncompleteOnly);
  const canDelete = canDeleteEmployee(employees);
  const clothingTypes = getClothingTypes();

  return (
    <section className="grid gap-2 lg:hidden">
      {filteredEmployees.map((employee) => {
        const index = employees.findIndex((item) => item.id === employee.id);
        const complete = isEmployeeComplete(employee);
        const pieces = employee.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
        const showErrors = hasEmployeeData(employee) || invalidEmployeeId === employee.id;
        return (
          <article
            key={employee.id}
            data-quick-employee-card={employee.id}
            className={cn(
              'rounded-xl border border-[#D8DEEA] bg-white p-3 text-left shadow-xs transition',
              invalidEmployeeId === employee.id &&
                'employee-attention border-[#EF4444] bg-[#FFF7F7]'
            )}
          >
            <div className="grid gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#071638]">
                    ลำดับที่ {index + 1}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-[#64748B]">
                    {employee.items.length || 0} แบบ · {pieces} ชิ้น
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-extrabold',
                      complete ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                    )}
                  >
                    {complete ? 'ครบ' : 'ยังไม่ครบ'}
                  </span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'cloneEmployee', id: employee.id })}
                    className="grid size-8 place-items-center rounded-lg border border-[#CBD5E1] bg-white text-[#44536A] transition hover:bg-neutral-50"
                    aria-label={`คัดลอกพนักงานลำดับที่ ${index + 1}`}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => dispatch({ type: 'delete', id: employee.id })}
                    className="grid size-8 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] transition hover:bg-[#FFE2E2] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`ลบพนักงานลำดับที่ ${index + 1}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_6.75rem] gap-2">
                <TextInput
                  value={employee.name}
                  invalid={showErrors && !employee.name.trim()}
                  onChange={(value) =>
                    dispatch({ type: 'patchEmployee', id: employee.id, patch: { name: value } })
                  }
                  placeholder="ชื่อ-นามสกุล"
                  title="ชื่อ-นามสกุล"
                />
                <div className="grid grid-cols-2 gap-1">
                  {GENDERS.map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() =>
                        dispatch({ type: 'patchEmployee', id: employee.id, patch: { gender } })
                      }
                      className={cn(
                        'h-11 rounded-lg border text-xs font-black transition active:scale-95',
                        employee.gender === gender
                          ? 'border-[#002B5B] bg-[#002B5B] text-white shadow-xs'
                          : showErrors && !employee.gender
                            ? 'border-[#EF4444] bg-[#FFF7F7] text-[#B91C1C]'
                            : 'border-[#CBD5E1] bg-white text-[#071638] hover:border-[#002B5B]'
                      )}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 rounded-lg border border-[#E7EAF0] bg-[#F8FAFC] p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-[#64748B]">เสื้อที่เบิก *</p>
                  {showErrors && !employee.items.length && (
                    <span className="text-[11px] font-bold text-[#B91C1C]">เลือกอย่างน้อย 1 รายการ</span>
                  )}
                </div>
                <GarmentItemsPicker
                  employee={employee}
                  clothingTypes={clothingTypes}
                  dispatch={dispatch}
                  invalidEmployeeId={invalidEmployeeId}
                />
              </div>
            </div>
          </article>
        );
      })}
      {!filteredEmployees.length && (
        <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center font-bold text-[#64748B]">
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">🔍</span>
            <span>ไม่มีรายการในขณะนี้</span>
            <p className="text-xs font-normal text-[#94A3B8]">
              ลองเปลี่ยนตัวกรองหรือเพิ่มพนักงานใหม่
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function QuickMobileEditor({ employee, employees, dispatch, onClose, onNext, invalidEmployeeId, editMode = 'full' }) {
  const canDelete = canDeleteEmployee(employees);
  const index = employee ? employees.findIndex((item) => item.id === employee.id) : -1;
  const nextEmployee = index >= 0 ? employees[index + 1] : null;
  const clothingTypes = getClothingTypes();
  const showErrors = employee
    ? hasEmployeeData(employee) || invalidEmployeeId === employee.id
    : false;

  return (
    <Dialog.Root open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:left-1/2 lg:top-1/2 lg:bottom-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-[480px] lg:max-h-[85vh]"
        >
          {employee && (
            <>
              <div className="flex min-h-14 items-center justify-between border-b border-[#E7EAF0] bg-gradient-to-r from-[#F8FAFC] to-[#FFFFFF] px-4">
                <div className="min-w-0">
                  <Dialog.Title className="font-extrabold text-[#071638]">
                    {editMode === 'garments-only' ? (
                      `จัดการเสื้อ: ${employee.name || 'ยังไม่ระบุชื่อ'}`
                    ) : (
                      `${index + 1}. ${employee.name || 'ยังไม่ระบุชื่อ'}`
                    )}
                  </Dialog.Title>
                  <p className="text-xs text-[#64748B] font-semibold mt-0.5">
                    {editMode === 'garments-only' ? (
                      'แก้ไขรายการเสื้อ ไซส์ และจำนวนตัว'
                    ) : (
                      `บรรทัดที่ ${index + 1} จาก ${employees.length}`
                    )}
                  </p>
                </div>
                <Dialog.Close
                  className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9] transition"
                  aria-label="ปิด"
                >
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <div className="employee-scroll-region grid gap-4 overflow-y-auto bg-[#F8FAFC] p-4">
                {editMode !== 'garments-only' && (
                  <div className="bg-white rounded-lg border border-[#D8DEEA] p-3">
                    <p className="text-xs font-bold text-[#64748B] mb-2">
                      ขั้นตอนที่ 1: ชื่อและเพศ
                    </p>
                    <Field label="ชื่อ-นามสกุล *">
                      <TextInput
                        value={employee.name}
                        invalid={showErrors && !employee.name.trim()}
                        onChange={(value) =>
                          dispatch({ type: 'patchEmployee', id: employee.id, patch: { name: value } })
                        }
                        placeholder="เช่น สมชาย ใจดี"
                        title="ระบุชื่อ-นามสกุลของพนักงาน"
                      />
                    </Field>
                    <Field label="เพศ *">
                      <div className="grid grid-cols-2 gap-3">
                        {GENDERS.map((gender) => (
                          <button
                            key={gender}
                            onClick={() =>
                              dispatch({ type: 'patchEmployee', id: employee.id, patch: { gender } })
                            }
                            className={cn(
                              'min-h-12 rounded-lg border-2 text-sm font-bold transition active:scale-95',
                              employee.gender === gender
                                ? 'border-[#002B5B] bg-[#002B5B] text-white shadow-md'
                                : showErrors && !employee.gender
                                  ? 'border-[#EF4444] bg-[#FFF7F7] text-[#B91C1C]'
                                  : 'border-[#CBD5E1] bg-white text-[#071638] hover:border-[#002B5B]'
                            )}
                            title={`เลือก${gender}`}
                          >
                            <span className="text-base">{genderSymbol(gender)}</span> {gender}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-[#D8DEEA] p-3">
                  <p className="text-xs font-bold text-[#64748B] mb-2">
                    {editMode === 'garments-only' ? 'รายการเสื้อที่เบิก' : 'ขั้นตอนที่ 2: เลือกแบบเสื้อ'}
                  </p>
                  <div className="grid gap-2.5">
                    {clothingTypes.map((type) => {
                      const hasItem = employee.items.some((item) => item.type === type);
                      return (
                        <div
                          key={type}
                          className={cn(
                            'rounded-lg border-2 p-3 text-left transition',
                            hasItem
                              ? 'border-[#002B5B] bg-[#EAF2FF]'
                              : showErrors && !employee.items.length
                                ? 'border-[#EF4444] bg-[#FFF7F7]'
                                : 'border-[#E2E8F0] bg-white hover:border-[#BFD0EA]'
                          )}
                        >
                          <div
                            onClick={() =>
                              dispatch({ type: 'toggleType', id: employee.id, itemType: type })
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                dispatch({ type: 'toggleType', id: employee.id, itemType: type });
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between gap-2 cursor-pointer select-none focus:outline-none",
                              hasItem && "pb-2 border-b border-dashed border-[#CBD5E1]/60"
                            )}
                            title={`${hasItem ? 'ยกเลิก' : 'เลือก'} ${type}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition',
                                  hasItem
                                    ? 'border-[#002B5B] bg-[#002B5B]'
                                    : 'border-[#CBD5E1] bg-white'
                                )}
                              >
                                {hasItem && <Check className="size-3 text-white" />}
                              </div>
                              <p
                                className={cn(
                                  'font-semibold',
                                  hasItem ? 'text-[#002B5B]' : 'text-[#071638]'
                                )}
                              >
                                {type}
                              </p>
                            </div>
                            {hasItem && (
                              <span className="text-xs font-bold text-[#71717A]">✓ เลือกแล้ว</span>
                            )}
                          </div>
                          {hasItem && (
                            <div className="mt-3 space-y-2">
                              {employee.items
                                .filter((entry) => entry.type === type)
                                .map((entry) => (
                                  <QuickGarmentCellInline
                                    key={entry.id}
                                    employee={employee}
                                    item={entry}
                                    type={type}
                                    dispatch={dispatch}
                                    invalidEmployeeId={invalidEmployeeId}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {showErrors && !employee.items.length && (
                      <p className="text-xs font-bold text-[#B91C1C] mt-1">
                        ต้องเลือกแบบเสื้ออย่างน้อย 1 แบบ
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[48px_1fr_1.2fr] sm:grid-cols-[48px_1fr_1.5fr] gap-2 border-t border-[#E7EAF0] bg-white p-3">
                <button
                  onClick={() => {
                    if (!canDelete) return;
                    dispatch({ type: 'delete', id: employee.id });
                    onClose();
                  }}
                  disabled={!canDelete}
                  className="grid min-h-11 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-45 transition hover:bg-[#FEE2E2] active:scale-95"
                  title={!canDelete ? 'ต้องเก็บไว้อย่างน้อย 1 บรรทัด' : 'ลบพนักงานคนนี้'}
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  onClick={onClose}
                  className="min-h-11 rounded-lg border border-[#CBD5E1] bg-white text-xs sm:text-sm font-bold text-[#44536A] transition hover:bg-[#F8FAFC] active:scale-95"
                  title="บันทึกข้อมูลและปิดหน้าต่าง"
                >
                  เสร็จสิ้น
                </button>
                {nextEmployee ? (
                  <button
                    onClick={() => onNext(nextEmployee.id)}
                    className="min-h-11 rounded-lg bg-[#002B5B] text-xs sm:text-sm font-bold text-white transition hover:bg-[#013A78] active:scale-95"
                    title="บันทึกข้อมูลและไปยังพนักงานคนต่อไป"
                  >
                    คนถัดไป ({employees.length - index - 1} คน)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const newId = crypto.randomUUID();
                      dispatch({ type: 'add', id: newId });
                      onNext(newId);
                      toast.success('เพิ่มพนักงานคนใหม่แล้ว', {
                        description: 'กรุณากรอกข้อมูลสำหรับพนักงานคนถัดไป',
                      });
                    }}
                    className="min-h-11 rounded-lg bg-[#002B5B] text-xs sm:text-sm font-bold text-white transition hover:bg-[#013A78] active:scale-95"
                    title="เพิ่มพนักงานใหม่และแก้ไขต่อทันที"
                  >
                    เพิ่มคนถัดไป
                  </button>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
