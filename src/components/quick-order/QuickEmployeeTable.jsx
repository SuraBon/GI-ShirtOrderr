import React from 'react';
import { Copy, Plus, Trash2, X } from 'lucide-react';
import { cn, digitsOnly } from '../../lib/utils';
import { getSizeOptions, getClothingTypes, GENDERS } from '../../lib/config';
import {
  canDeleteEmployee,
  isEmployeeComplete,
  getEmployeeMissingFields,
  hasEmployeeData
} from '../../lib/orderState';
import { GridInput, Select } from '..';

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

export function QuickEmployeeTable({ employees, dispatch, query, showIncompleteOnly, invalidEmployeeId }) {
  const filteredEmployees = getFilteredEmployees(employees, query, showIncompleteOnly);
  const canDelete = canDeleteEmployee(employees);
  const clothingTypes = getClothingTypes();

  return (
    <section className="hidden overflow-hidden rounded-xl border border-[#D8DEEA] bg-white lg:block shadow-sm">
      <div className="employee-scroll-region max-h-[58vh] overflow-auto">
        <table className="w-full min-w-[980px] table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#EEF4FF] text-xs font-extrabold text-[#44536A]">
            <tr>
              <th className="w-14 border-b border-[#D8DEEA] px-3 py-3 text-center">ลำดับ</th>
              <th className="w-[21%] border-b border-[#D8DEEA] px-3 py-3">ชื่อ-นามสกุล *</th>
              <th className="w-[8%] border-b border-[#D8DEEA] px-3 py-3">เพศ *</th>
              <th className="w-[48%] border-b border-[#D8DEEA] px-3 py-3">รายการเสื้อที่เบิก</th>
              <th className="w-[7%] border-b border-[#D8DEEA] px-3 py-3 text-center">สถานะ</th>
              <th className="w-[10%] border-b border-[#D8DEEA] px-3 py-3 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => {
              const index = employees.findIndex((item) => item.id === employee.id);
              const complete = isEmployeeComplete(employee);
              const missingFields = getEmployeeMissingFields(employee);
              const showErrors = hasEmployeeData(employee) || invalidEmployeeId === employee.id;

              return (
                <tr
                  key={employee.id}
                  data-quick-employee-row={employee.id}
                  className={cn(
                    'border-b border-[#E7EAF0] align-middle transition hover:bg-[#F8FAFC] even:bg-[#F8FAFC]/30',
                    invalidEmployeeId === employee.id &&
                      'employee-attention bg-[#FFF7F7] outline outline-2 outline-[#EF4444] outline-offset-[-2px]'
                  )}
                >
                  {/* Row index */}
                  <td className="px-3 py-3 text-center font-extrabold text-[#64748B]">
                    {index + 1}
                  </td>

                  {/* Name Input */}
                  <td className="px-3 py-3">
                    <GridInput
                      value={employee.name}
                      placeholder="ชื่อ-นามสกุล"
                      invalid={showErrors && !employee.name.trim()}
                      onChange={(value) =>
                        dispatch({ type: 'patchEmployee', id: employee.id, patch: { name: value } })
                      }
                    />
                  </td>

                  {/* Gender Select */}
                  <td className="px-3 py-3">
                    <Select
                      value={employee.gender}
                      placeholder="เลือกเพศ"
                      onChange={(val) =>
                        dispatch({
                          type: 'patchEmployee',
                          id: employee.id,
                          patch: { gender: val },
                        })
                      }
                      invalid={showErrors && !employee.gender}
                      values={GENDERS}
                      compact={true}
                    />
                  </td>

                  {/* Scrollable Garment List Cell */}
                  <td className="px-3 py-3">
                    <div className="max-h-28 overflow-y-auto overflow-x-hidden pr-1 grid gap-1.5 scrollbar-thin">
                      {employee.items.map((item, itemIdx) => {
                        const sizeOptions = getSizeOptions(item.type, employee.gender);
                        return (
                          <div
                            key={item.id}
                            className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.75rem_4rem_1.75rem] items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 shadow-xs"
                          >
                            {/* Clothing Type Select */}
                            <div className="min-w-0">
                              <Select
                                value={item.type}
                                onChange={(val) =>
                                  dispatch({
                                    type: 'patchItem',
                                    id: employee.id,
                                    itemId: item.id,
                                    patch: { type: val },
                                  })
                                }
                                values={clothingTypes}
                                size="sm"
                                placeholder="เลือกแบบเสื้อ"
                              />
                            </div>

                            {/* Size Select */}
                            <div className="min-w-0">
                              <Select
                                value={item.size}
                                disabled={!employee.gender}
                                onChange={(val) =>
                                  dispatch({
                                    type: 'patchItem',
                                    id: employee.id,
                                    itemId: item.id,
                                    patch: { size: val },
                                  })
                                }
                                invalid={showErrors && !item.size}
                                values={sizeOptions}
                                size="sm"
                                placeholder={employee.gender ? 'ไซส์' : 'เพศ'}
                              />
                            </div>

                            {/* Quantity Input */}
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) =>
                                dispatch({
                                  type: 'patchItem',
                                  id: employee.id,
                                  itemId: item.id,
                                  patch: { qty: digitsOnly(e.target.value) },
                                })
                              }
                              className="h-9 w-full rounded-lg border border-neutral-300 bg-white text-center text-sm font-black text-[#071638] outline-none transition focus:border-[#002B5B] focus:ring-2 focus:ring-[#002B5B]/10"
                              min="1"
                            />

                            {/* Delete single item button */}
                            <button
                              type="button"
                              onClick={() =>
                                dispatch({
                                  type: 'patchEmployee',
                                  id: employee.id,
                                  patch: {
                                    items: employee.items.filter((it, idx) => idx !== itemIdx),
                                  },
                                })
                              }
                              className="grid size-8 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-red-500"
                              title="ลบรายการเสื้อนี้"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add shirt button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!clothingTypes.length) return;
                          const nextType =
                            clothingTypes.find(
                              (t) => !employee.items.some((item) => item.type === t)
                            ) || clothingTypes[0];
                          const defaultSizeVal =
                            getSizeOptions(nextType, employee.gender)[0] || 'M';
                          dispatch({
                            type: 'patchEmployee',
                            id: employee.id,
                            patch: {
                              items: [
                                ...employee.items,
                                {
                                  id: crypto.randomUUID(),
                                  type: nextType,
                                  size: defaultSizeVal,
                                  customSize: '',
                                  qty: 1,
                                },
                              ],
                            },
                          });
                        }}
                        disabled={!employee.gender}
                        className="inline-flex items-center justify-center gap-1 border border-dashed border-[#002B5B]/30 text-[#002B5B] hover:bg-[#EEF4FF] bg-white rounded-lg h-7 px-2.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Plus className="size-3" /> เพิ่มเสื้อ
                      </button>
                    </div>
                  </td>

                  {/* Status column */}
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold',
                        complete ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                      )}
                    >
                      {complete ? 'ครบ' : 'ยังไม่ครบ'}
                    </span>
                    {!complete && (
                      <p className="mt-1 text-[11px] font-bold leading-4 text-[#B91C1C]">
                        ขาด: {missingFields.join(', ')}
                      </p>
                    )}
                  </td>

                  {/* Actions column (Copy and Delete buttons) */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'cloneEmployee', id: employee.id })}
                        className="grid size-10 place-items-center rounded-lg border border-[#CBD5E1] bg-white text-[#44536A] hover:bg-neutral-50 transition active:scale-95 shadow-xs"
                        title="คัดลอกพนักงานคนนี้ (คัดลอกแถว)"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'delete', id: employee.id })}
                        disabled={!canDelete}
                        aria-label="ลบ"
                        className="grid size-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:border-[#E2E8F0] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] transition hover:bg-[#FFE2E2] active:scale-95"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filteredEmployees.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#64748B]">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🔍</span>
                    <span>ไม่มีรายการในขณะนี้</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
