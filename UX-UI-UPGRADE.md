# UX/UI Upgrade Checklist

เอกสารนี้ใช้เป็น checklist สำหรับการปรับ UI ของ GI Shirt Order โดยเน้น dashboard, responsive layout, form ergonomics และการป้องกัน overflow

## Current UI Direction

- ใช้หน้าจอจริงเป็น first screen ไม่ทำ landing page
- Order page เน้นกรอกเร็ว ตรวจรายการง่าย และส่งคำขอชัดเจน
- Dashboard เน้นข้อมูลหนาแน่น อ่านเร็ว และจัดการซ้ำได้ทุกวัน
- Inventory page เน้นข้อมูลแบบเสื้อ ไซส์ รูปภาพ และสต๊อกโดยไม่ปนกัน
- Branch page เน้นเพิ่ม/แก้/ลบสาขาแบบตรงไปตรงมา

## Design Tokens

### Color Roles

- Navy primary: ใช้กับ header admin และ primary action
- White surface: ใช้กับ card, table wrapper, dialog
- Light gray background: ใช้กับ page background
- Border gray: ใช้แยก section และ control
- Warning warm: ใช้กับ `รอจัดส่ง` และงานที่ต้องทำ
- Success green: ใช้กับ `จัดส่งแล้ว`
- Danger red: ใช้กับ delete, error และสต๊อกไม่พอ
- Muted gray: ใช้กับ secondary text และ `ยกเลิก`

### Typography

- ใช้ Noto Sans Thai เป็นหลัก
- หัวข้อใน dashboard ต้องกระชับ ไม่ใช้ hero-scale type
- ข้อความใน card/table ใช้ขนาดที่อ่านง่ายและไม่ทำให้ row สูงเกินจำเป็น
- หลีกเลี่ยง letter spacing ติดลบ

### Shape and Spacing

- Radius หลัก 8-14px
- Card ไม่ควรซ้อน card ภายใน card โดยไม่จำเป็น
- ใช้ gap สม่ำเสมอระหว่าง control
- ปุ่ม icon-only ต้องมีพื้นที่กดชัดเจนและมี label สำหรับ accessibility

## Component Rules

### Buttons

- Primary: navy background, white text
- Secondary: white background, border, navy text
- Danger: red soft background, red text
- Loading action ต้อง disabled หรือแสดง loading state
- ปุ่มบนมือถือเต็มแถวได้เมื่อข้อความเริ่มแน่น
- Icon-only button ต้องมี `aria-label` หรือ `title`

### Forms

- ทุก input/select ต้องมี label
- Error ต้องบอกวิธีแก้ ไม่ใช่แค่บอกว่าผิด
- เบอร์โทรต้องรับเฉพาะตัวเลขตาม `PHONE_LENGTH`
- CSV import ต้อง preview/validate ก่อนนำเข้า

### Tables

- Desktop ใช้ table เมื่อข้อมูลต้องเปรียบเทียบหลายคอลัมน์
- Mobile ใช้ card หรือ table wrapper ที่ scroll ภายในกรอบ
- Header และ cell ต้อง align อ่านง่าย
- Column settings ใช้กับตารางที่มีข้อมูลมาก

### Cards and Panels

- KPI card ต้องมี icon, value, label และ detail ถ้าจำเป็น
- Workflow row ต้องมี icon, text, status pill
- Text container ใน flex/grid ต้องมี `min-width: 0`
- Status pill ต้องไม่ดัน parent ออกนอก viewport

### Dialogs

- Dialog ต้องไม่เกิน viewport
- Content ที่ยาวต้อง scroll ภายใน dialog
- Confirm dialog ใช้กับ delete และ action เสี่ยง
- Close button ต้องอยู่ตำแหน่งคาดเดาได้

## Page-Specific Checklist

### Order Page

- ข้อมูลบริษัท/สาขา/ผู้รับผิดชอบอยู่ก่อนรายการพนักงาน
- ปุ่มเพิ่มพนักงานสร้างแถวว่าง
- quick order ไม่ทำให้ข้อมูลเดิมหายโดยไม่ตั้งใจ
- CSV template เปิดด้วย Excel แล้วภาษาไทยถูกต้อง
- validation scroll/focus ไปยังแถวที่ต้องแก้
- success screen แสดง batch summary

### Dashboard Overview

- KPI ไม่ล้นเมื่อ viewport แคบ
- `dashboard-workflow-grid` ยุบเป็น 1 คอลัมน์ก่อนล้น
- row ที่มี badge เช่น `เหลือ 0` ต้องไม่ดัน card
- empty state ใช้ข้อความสั้นและมี action ที่ชัดเจน

### Orders View

- filter ใช้ได้บนมือถือ
- table desktop ไม่ทับกัน
- mobile card แสดงข้อมูลสำคัญครบ
- expand row ไม่ทำให้ table กว้างเกิน
- action เปลี่ยนสถานะมี loading/error/success feedback
- delete ต้อง confirm

### Employee View

- แสดง batch, branch, employee, garment, size, qty, status
- filter และ search ใช้ร่วมกับรายการเบิกได้
- mobile card ต้องอ่านง่ายโดยไม่ต้อง scroll แนวนอน

### Inventory View

- แยก `ข้อมูลเสื้อ` กับ `สต๊อกตามไซส์`
- รูปภาพมี fallback
- upload รูปแสดง loading/error
- stock summary แสดง total, remaining, withdrawn
- stock adjust รองรับรับเข้าและปรับลด
- dialog รายละเอียดไม่ล้น viewport

### Branch View

- เพิ่มสาขาอยู่ด้านบน
- รายการสาขาแสดงจำนวนรวม
- edit inline ต้องมี save/cancel
- delete ต้อง confirm
- error ชื่อว่างหรือซ้ำต้องเห็นชัด

## Responsive QA

ตรวจอย่างน้อย viewport เหล่านี้:

- 320px mobile narrow
- 375px mobile common
- 768px tablet
- 1280px desktop
- 1440px desktop wide

Checklist:

- Body ไม่มี horizontal scroll
- Header/nav ไม่ดัน viewport
- Grid ยุบตาม breakpoint
- Table scroll อยู่ใน wrapper
- Button text ไม่ชน icon
- Badge/status pill ไม่ล้น
- Dialog อยู่ใน viewport
- Toast ไม่บัง action สำคัญ

## Accessibility QA

- Tab key เข้าถึง control สำคัญได้
- Focus ring มองเห็น
- Icon-only action มี accessible name
- Form control มี label
- Error ไม่อาศัยสีอย่างเดียว
- Contrast ของ text หลักอ่านได้
- Loading state ไม่ทำให้ผู้ใช้กดซ้ำ

## Browser Verification Flow

1. Start dev server.
2. Open `/`.
3. Verify order form renders.
4. Open `#/dashboard`.
5. Login with local passcode.
6. Verify overview renders.
7. Resize to mobile width.
8. Check `document.documentElement.scrollWidth <= window.innerWidth`.
9. Open orders, employees, inventory, branches.
10. Capture screenshot for any changed layout.
11. Run `npm run build` before final handoff.

## File Map for UI Work

- `src/index.css`: global design system and page styles
- `src/styles/dashboard-workflow.css`: dashboard workflow layout and responsive rules
- `src/components/QuickOrderApp.jsx`: order form UI
- `src/components/Dashboard.jsx`: admin tables, filters, dialogs and actions
- `src/components/DashboardOverview.jsx`: overview KPI and workflow panels
- `src/components/DashboardWorkflowPanels.jsx`: dashboard task/stock/status panels
- `src/components/InventoryManager.jsx`: inventory UI
- `src/components/BranchManager.jsx`: branch management UI

## Last Updated

2026-06-04
