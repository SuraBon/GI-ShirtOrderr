import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  Download,
  Loader2,
  PackageSearch,
  Shirt,
  UserCheck,
  Users,
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
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-[70] bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[71] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl"
        >
          <Dialog.Title className="text-lg font-extrabold text-[#071638]">{title}</Dialog.Title>
          {description ? (
            <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#44536A]">
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
              {loading ? 'กำลังลบ...' : confirmLabel}
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
                            <th
                              colSpan={Math.max(2, tab.detailFields.length + 1)}
                              className="border px-3 py-3 text-base font-black sm:text-lg"
                            >
                              {tab.type === 'เสื้อโปโล'
                                ? `${tab.type} ${selectedGender}`
                                : tab.type}
                            </th>
                          </tr>
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

function ManualSection({ icon: Icon, title, children }) {
  return (
    <section className="manual-section">
      <div className="manual-section-title">
        <span><Icon className="size-4" /></span>
        <h3>{title}</h3>
      </div>
      <div className="manual-section-body">{children}</div>
    </section>
  );
}

function ManualList({ items }) {
  return (
    <ul className="manual-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function UserManualDialog({ open, setOpen }) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="user-manual-dialog fixed inset-x-3 bottom-3 top-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#DDE5F0] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(46rem,88vh)] sm:w-[min(48rem,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div className="manual-dialog-head">
            <div className="min-w-0">
              <Dialog.Title className="manual-dialog-title">
                <BookOpen className="size-5" /> คู่มือการเบิกเสื้อพนักงาน
              </Dialog.Title>
              <p>สำหรับคนขอเบิก ใช้กรอกข้อมูลให้ครบ ตรวจรายการ และส่งคำขอเบิกเข้าระบบ</p>
            </div>
            <Dialog.Close className="manual-close-button" aria-label="ปิด">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="manual-dialog-body">
            <ManualSection icon={UserCheck} title="คนขอเบิก: ข้อมูลผู้ขอและที่จัดส่ง">
              <ManualList
                items={[
                  'กรอกชื่อบริษัทหรือหน่วยงาน เลือกสาขาที่จัดส่ง ระบุชื่อผู้ติดต่อ และเบอร์ติดต่อให้ครบ',
                  'ระบบจะตรวจรูปแบบเบอร์โทรศัพท์และจัดรูปแบบให้อ่านง่ายโดยอัตโนมัติ',
                  'เมื่อข้อมูลครบแล้วจึงไปขั้นตอนรายการเสื้อพนักงานได้',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Users} title="คนขอเบิก: รายชื่อพนักงานและเสื้อที่เบิก">
              <ManualList
                items={[
                  'เพิ่มพนักงานทีละคนหรือเพิ่มหลายแถวพร้อมกันได้',
                  'เลือกเพศก่อน เพื่อให้ระบบแสดงไซส์ที่ตรงกับแบบเสื้อและเพศนั้น',
                  'กดปุ่มเพิ่มเสื้อในคอลัมน์รายการเสื้อ เพื่อเลือกแบบเสื้อ ไซส์ และจำนวน',
                  'ถ้าพนักงานหนึ่งคนเบิกหลายแบบ ให้เพิ่มรายการเสื้อในแถวเดียวกันได้',
                  'ใช้ตัวกรองแสดงเฉพาะแถวที่ไม่ครบ เพื่อตรวจรายการที่ยังขาดชื่อ เพศ แบบเสื้อ หรือไซส์',
                  'สามารถนำเข้า CSV จาก Excel ได้ โดยใช้หัวคอลัมน์ตามไฟล์ตัวอย่าง',
                ]}
              />
            </ManualSection>

            <ManualSection icon={ClipboardList} title="คนขอเบิก: ตรวจสอบและส่งคำขอ">
              <ManualList
                items={[
                  'ตรวจชื่อพนักงาน เพศ แบบเสื้อ ไซส์ และจำนวนให้ถูกต้องก่อนส่ง',
                  'ระบบสรุปจำนวนแยกตามแบบเสื้อและไซส์เพื่อให้ตรวจง่าย',
                  'เมื่อส่งสำเร็จ ระบบจะสร้างรหัสคำสั่งเบิกสำหรับติดตามงาน',
                  'คนขอเบิกจะไม่เห็นยอดสต๊อกคงเหลือ ระบบจะตรวจสต๊อกให้ก่อนส่งคำขอ',
                ]}
              />
            </ManualSection>
          </div>

          <div className="manual-dialog-foot">
            <button onClick={() => setOpen(false)}>เข้าใจแล้ว</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AdminManualDialog({ open, setOpen }) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="user-manual-dialog fixed inset-x-3 bottom-3 top-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#DDE5F0] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(47rem,88vh)] sm:w-[min(52rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div className="manual-dialog-head">
            <div className="min-w-0">
              <Dialog.Title className="manual-dialog-title">
                <PackageSearch className="size-5" /> คู่มือแดชบอร์ดและสต๊อก
              </Dialog.Title>
              <p>สำหรับคนดูแดชบอร์ด คนคุมระบบ และคนจัดการสต๊อก ใช้ตรวจงานและอัปเดตข้อมูลจริง</p>
            </div>
            <Dialog.Close className="manual-close-button" aria-label="ปิด">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="manual-dialog-body">
            <ManualSection icon={ClipboardList} title="คนดูแดชบอร์ด: รายการเบิก">
              <ManualList
                items={[
                  'ใช้ดูคำสั่งเบิกทั้งหมด ค้นหาตามรหัสคำสั่ง บริษัท ผู้ติดต่อ เบอร์โทร หรือชื่อพนักงาน',
                  'กรองตามสาขา เดือน และสถานะ เพื่อจัดลำดับงานที่ต้องดำเนินการ',
                  'กดรายการเพื่อดูรายละเอียดพนักงานและเสื้อที่เบิกในคำสั่งนั้น',
                  'ใช้สถานะ 3 ค่า: รอจัดส่ง, จัดส่งแล้ว และ ยกเลิก',
                  'เปลี่ยนเป็นจัดส่งแล้วเมื่อจ่ายของจริง ระบบจะตัดสต๊อกและเพิ่มยอดเบิกแล้วให้เอง',
                  'ใช้ยกเลิกเมื่อพนักงานลาออกหรือไม่ต้องรับเสื้อแล้ว โดยข้อมูลยังอยู่ในประวัติ',
                  'ถ้าสต๊อกไม่พอ ระบบจะแจ้งรายการที่ขาดและไม่ให้จัดส่งจนกว่าจะเติมสต๊อก',
                ]}
              />
            </ManualSection>

            <ManualSection icon={BarChart3} title="คนคุมระบบ: ภาพรวม">
              <ManualList
                items={[
                  'ดูจำนวนคำสั่งเบิกทั้งหมด งานรอจัดส่ง งานที่จัดส่งแล้ว และรายการยกเลิก',
                  'ส่วนสรุปสต๊อกเสื้อแสดงจำนวนที่เคยมี เบิกแล้ว และคงเหลือ แยกตามแบบเสื้อ เพศ และไซส์',
                  'ใช้ส่วนนี้ตรวจแนวโน้มการใช้เสื้อ และดูว่าสต๊อกแบบไหนลดเร็วหรือควรเติมก่อน',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Users} title="คนคุมระบบ: ข้อมูลพนักงาน">
              <ManualList
                items={[
                  'ใช้เพิ่มและแก้ไขฐานพนักงานจริง โดยต้องมีชื่อ เพศ และสาขา',
                  'ค้นหาพนักงานได้จากชื่อ เพศ หรือสาขา',
                  'ใช้ปิดใช้งานเมื่อพนักงานลาออกหรือไม่ต้องใช้ในระบบแล้ว โดยไม่ลบประวัติเดิม',
                  'ส่วนประวัติรายการเบิกด้านล่างดึงจากคำสั่งเบิก เพื่อดูว่าพนักงานเคยเบิกแบบเสื้อ/ไซส์ใดบ้าง',
                ]}
              />
            </ManualSection>

            <ManualSection icon={PackageSearch} title="คนจัดการสต๊อก: แบบเสื้อและสต๊อก">
              <ManualList
                items={[
                  'แท็บข้อมูลเสื้อใช้แก้ชื่อแบบเสื้อ รูปภาพ และรายละเอียดไซส์ เช่น อก เอว หรือรายละเอียดอื่น',
                  'รายละเอียดไซส์แยกตามเพศ เพิ่ม แก้ หรือลบหัวข้อได้ ข้อมูลนี้จะแสดงให้คนขอเบิกเห็น',
                  'แท็บสต๊อกตามไซส์ใช้แก้เฉพาะจำนวนคงเหลือ เพื่อแยกงานคลังออกจากข้อมูลเสื้อ',
                  'ใส่เลขบวก เช่น 20 แล้วกดเพิ่ม เพื่อบันทึกรับสต๊อกเข้า',
                  'ใส่เลขลบ เช่น -2 แล้วกดเพิ่ม เพื่อปรับลดกรณีกรอกผิดหรือตัดยอดแก้ไข',
                  'ไม่แก้เลขคงเหลือในชีทโดยตรง ให้แก้ผ่านระบบเพื่อเก็บประวัติยอดตั้งต้น เพิ่มเข้า ปรับลด เบิกแล้ว และคงเหลือ',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Building2} title="คนคุมระบบ: จัดการสาขา">
              <ManualList
                items={[
                  'ใช้เพิ่มหรือลบรายชื่อสาขาที่แสดงในฟอร์มเบิกและตัวกรองแดชบอร์ด',
                  'ควรใช้ชื่อสาขาให้ตรงกันทุกครั้ง เพื่อให้รายงานสรุปตามสาขาไม่แยกเป็นหลายชื่อ',
                  'หลังบันทึกสาขา ระบบจะโหลดรายชื่อสาขาใหม่ให้หน้าเบิกและหน้าแดชบอร์ดใช้งานต่อ',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Download} title="การส่งออกและ Google Sheet">
              <ManualList
                items={[
                  'ปุ่มส่งออก CSV ใช้ดาวน์โหลดข้อมูลคำสั่งเบิกตามตัวกรองที่เลือก',
                  'ชีท Orders เก็บข้อมูลคำสั่งเบิกและสถานะ',
                  'ชีท Employees เก็บข้อมูลพนักงานจริง ได้แก่ ชื่อ เพศ สาขา และสถานะใช้งาน',
                  'ชีท Stock สร้างและอัปเดตจากระบบโดยอัตโนมัติ แสดงยอดตั้งต้น เพิ่มเข้า ปรับลด เบิกแล้ว สต๊อกทั้งหมด และคงเหลือ',
                  'ไม่ควรแก้ตัวเลขในชีท Stock โดยตรง เพราะการ sync ครั้งถัดไปจะเขียนทับจากข้อมูลในระบบ',
                ]}
              />
            </ManualSection>
          </div>

          <div className="manual-dialog-foot">
            <button onClick={() => setOpen(false)}>เข้าใจแล้ว</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ConfirmDialog, ColumnSettingsDialog, SizeReference, UserManualDialog, AdminManualDialog };

