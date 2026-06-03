# GI Shirt Order

ระบบเบิกเสื้อพนักงานสำหรับ Gold Integrate ใช้รวม flow การขอเบิกเสื้อ การตรวจรายการ การจัดส่ง การตัดสต๊อก การจัดการแบบเสื้อ และการจัดการสาขาไว้ในเว็บเดียว

## ภาพรวมระบบ

- หน้าสั่งเบิกสำหรับผู้ใช้งานทั่วไปอยู่ที่ `/` หรือ `/order`
- หน้าแอดมินอยู่ที่ `#/dashboard` หรือ `/dashboard` และต้องเข้าด้วยรหัสผู้ดูแล
- ข้อมูลคำสั่งเบิกถูกส่งผ่าน `/api/order/submit` ไปยัง Google Apps Script และ Google Sheets
- ข้อมูลแดชบอร์ดอ่านผ่าน `/api/dashboard/orders` โดยแอดมินต้องมี session token
- การเปลี่ยนสถานะ ลบคำสั่งเบิก และบันทึกการจัดส่งส่งผ่าน `/api/dashboard/action`
- แบบเสื้อ รายละเอียดไซส์ รูปภาพ และสต๊อกคงเหลือเก็บใน Vercel Blob ผ่าน `/api/blob/config`
- รายชื่อสาขาเก็บใน Vercel Blob ผ่าน `/api/blob/branches`
- รูปสินค้าอัปโหลดผ่าน Vercel Blob Client Upload และตรวจสิทธิ์ที่ `/api/blob/upload`

## คำศัพท์หลัก

- `คำสั่งเบิก` คือชุดรายการที่ผู้ใช้ส่งเข้าระบบหนึ่งครั้ง มี `batchId` เดียว
- `รายการเบิก` คือรายการเสื้อแต่ละชนิด/ไซส์/จำนวนในคำสั่งเบิก
- `ข้อมูลพนักงาน` คือรายชื่อพนักงาน เพศ สาขา และรายการเสื้อที่ต้องเบิก
- `แบบเสื้อและสต๊อก` คือข้อมูลแบบเสื้อ รูปภาพ ตารางไซส์ และจำนวนคงเหลือ
- `สต๊อกคงเหลือ` คือจำนวนที่ยังจ่ายได้
- `เบิกแล้ว` คือจำนวนที่ถูกตัดออกจากสต๊อกจากการจัดส่ง
- `รับเข้า` คือการเพิ่มสต๊อก
- `ปรับลด` คือการลดสต๊อกด้วยมือ

## สถานะคำสั่งเบิก

ระบบใช้สถานะ 3 ค่าเท่านั้น

- `รอจัดส่ง`: สร้างคำสั่งเบิกแล้ว แต่ยังไม่ได้จ่ายของครบ
- `จัดส่งแล้ว`: จ่ายของแล้ว และระบบตัดสต๊อกแล้ว
- `ยกเลิก`: ไม่ต้องจัดส่งแล้ว ข้อมูลยังอยู่ในประวัติและไม่ตัดสต๊อกเพิ่ม

## Flow ผู้ขอเบิก

1. ผู้ใช้เปิดหน้า `/`
2. ระบบโหลดข้อมูลสาขาจาก `/api/blob/branches`; ถ้าโหลดไม่ได้จะ fallback ไปที่ `src/constants/branches.js`
3. ระบบโหลด config แบบเสื้อจาก `/api/blob/config`; ถ้าไม่มีข้อมูลจริงจะใช้ค่า default ใน `src/lib/config.js`
4. ผู้ใช้กรอกข้อมูลบริษัท/หน่วยงาน สาขา ผู้รับผิดชอบ และเบอร์ติดต่อ
5. ผู้ใช้เพิ่มข้อมูลพนักงาน โดยระบุชื่อ เพศ แบบเสื้อ ไซส์ และจำนวน
6. ผู้ใช้สามารถเพิ่มแถวด้วยมือ ใช้ quick order ใช้หน้าจอบนมือถือ หรือ import CSV
7. ระบบ validate ข้อมูลผู้ติดต่อและข้อมูลพนักงานก่อนให้ไปขั้นตอนตรวจสอบ
8. ผู้ใช้ตรวจสรุปตามแบบเสื้อ ไซส์ จำนวน และรายชื่อพนักงาน
9. เมื่อกดส่ง ระบบสร้าง `batchId` รูปแบบ `ORD-YYYYMMDD-xxxxx`
10. payload ถูกส่งไปที่ `/api/order/submit`
11. API ตรวจ rate limit, sanitize ข้อมูล และบังคับสถานะเริ่มต้นเป็น `รอจัดส่ง`
12. API ส่งต่อไป Google Apps Script ด้วย `Content-Type: text/plain;charset=utf-8`
13. เมื่อสำเร็จ หน้าเว็บแสดง success screen และเก็บข้อมูลสรุปไว้ให้ผู้ใช้ตรวจ

## Flow import CSV

1. ผู้ใช้ดาวน์โหลด template CSV จากหน้าสั่งเบิก
2. ไฟล์มีคอลัมน์หลัก: `ชื่อ-นามสกุล`, `เพศ`, `แบบเสื้อ`, `ไซส์`, `จำนวน`
3. ผู้ใช้อัปโหลด CSV กลับเข้าระบบ
4. ระบบ parse CSV ฝั่ง browser และตรวจว่าเพศเป็น `ชาย` หรือ `หญิง`
5. ระบบตรวจว่าแบบเสื้อมีอยู่ใน config ปัจจุบัน
6. ระบบตรวจว่าไซส์มีอยู่ในแบบเสื้อและเพศนั้น
7. แถวที่ถูกต้องเท่านั้นจะถูกนำเข้าเป็นพนักงานใหม่
8. แถวที่ผิดจะถูกแสดงเป็น error เพื่อให้แก้ไฟล์หรือกรอกใหม่

## Flow แอดมินเข้าสู่ระบบ

1. แอดมินเปิด `#/dashboard` หรือ `/dashboard`
2. ถ้ายังไม่มี session token ระบบแสดงหน้า login
3. แอดมินกรอก passcode
4. หน้าเว็บ POST ไปที่ `/api/auth/dashboard`
5. API ตรวจ `DASHBOARD_PASSCODE` หรือ `VITE_DASHBOARD_PASSCODE`
6. ถ้าถูกต้อง API สร้าง token อายุ 8 ชั่วโมงด้วย `DASHBOARD_SESSION_SECRET`
7. token ถูกเก็บใน `sessionStorage` ด้วย key `gi-dashboard-admin-token`
8. request หลังจากนั้นใช้ `Authorization: Bearer <token>`
9. ถ้า token หมดอายุหรือไม่ถูกต้อง ระบบล้าง token และพาแอดมินกลับไป login

## Flow หน้าแอดมิน

หน้าแอดมินใช้เมนูหลัก

- `ภาพรวม`
- `รายการเบิก`
- `ข้อมูลพนักงาน`
- `แบบเสื้อและสต๊อก`
- `จัดการสาขา`

### ภาพรวม

1. โหลดคำสั่งเบิกจาก Google Sheets ผ่าน `/api/dashboard/orders`
2. แสดง KPI เช่น รายการรอจัดส่ง จัดส่งแล้ว และสต๊อกคงเหลือ
3. แสดงงานที่ต้องทำจากคำสั่งที่เป็น `รอจัดส่ง`
4. แสดงรายการสต๊อกต่ำจาก config แบบเสื้อ
5. แสดงสรุปสถานะตามจำนวนคำสั่งเบิก
6. ปุ่มใน panel พาไปหน้า `รายการเบิก` หรือ `แบบเสื้อและสต๊อก` เพื่อทำงานต่อ

### รายการเบิก

1. โหลด batch ทั้งหมดจาก Google Sheets
2. กรองข้อมูลได้ตามสาขา เดือน สถานะ และคำค้น
3. ตารางคำสั่งเบิกแสดงบริษัท สาขา ผู้ติดต่อ จำนวนพนักงาน จำนวนชิ้น และสถานะ
4. แอดมินกดแถวเพื่อขยายรายการพนักงานและเสื้อด้านใน
5. กดไอคอนตั้งค่าคอลัมน์เพื่อเลือกคอลัมน์ที่ต้องการแสดง
6. กดรายละเอียดเพื่อเปิด dialog ของ batch
7. กดเปลี่ยนสถานะเป็น `รอจัดส่ง`, `จัดส่งแล้ว` หรือ `ยกเลิก`
8. ก่อนเปลี่ยนเป็น `จัดส่งแล้ว` ระบบตรวจสต๊อกล่าสุดจาก config
9. ถ้าสต๊อกไม่พอ ระบบไม่ให้จัดส่งและแจ้งรายการที่ขาด
10. ถ้าสต๊อกพอ ระบบส่ง action ไป Google Sheets และปรับ stock ledger ใน config
11. กดลบคำสั่งเบิกได้หลังยืนยัน ระบบส่ง `deleteBatch` ไป Google Sheets

### Flow จัดส่งบางส่วน

1. แอดมินเปิดรายละเอียด batch
2. แอดมินเลือกจำนวนหรือสถานะของรายการย่อย
3. ระบบสร้าง payload สำหรับแต่ละ item โดยแยกเป็น `shippedQty`, `pendingQty`, `canceledQty`
4. ระบบคำนวณ stock movement จากจำนวนที่เปลี่ยนจริง
5. ถ้ารายการที่จัดส่งเกินสต๊อกคงเหลือ ระบบหยุดและแจ้ง error
6. ถ้าผ่าน ระบบส่ง action `shipItems` ไป `/api/dashboard/action`
7. Google Apps Script แตกแถวรายการใน Sheets ตามจำนวนที่จัดส่ง รอจัดส่ง และยกเลิก
8. ระบบปรับ config สต๊อกใน Blob และสะท้อนสถานะในหน้าแอดมินทันที

### ข้อมูลพนักงาน

1. ระบบ flatten ข้อมูลจากคำสั่งเบิกทุก batch เป็นรายชื่อพนักงาน
2. แสดงชื่อ เพศ สาขา บริษัท แบบเสื้อ ไซส์ จำนวน วันที่ และสถานะ
3. ใช้ filter เดียวกับรายการเบิกเพื่อดูเฉพาะสาขา เดือน สถานะ หรือคำค้น
4. ใช้ตั้งค่าคอลัมน์เพื่อซ่อน/แสดงข้อมูลที่ต้องการ
5. บนมือถือแสดงเป็น card เพื่อไม่ให้ตารางล้นจอ

### Export CSV

1. แอดมินเลือกสาขา เดือนเริ่มต้น และเดือนสิ้นสุด
2. ระบบ validate ว่าช่วงเดือนไม่กลับด้าน
3. ระบบใช้ข้อมูลที่โหลดไว้ใน dashboard แล้วสร้าง CSV ฝั่ง browser
4. ไฟล์ถูกตั้งชื่อด้วยสาขาและช่วงเดือนผ่าน `buildCsvFilename`
5. CSV มี BOM `\ufeff` เพื่อให้ Excel เปิดภาษาไทยได้ถูกต้อง

## Flow แบบเสื้อและสต๊อก

1. แอดมินเปิดแท็บ `แบบเสื้อและสต๊อก`
2. ระบบอ่าน config จาก `/api/blob/config`
3. ถ้าไม่มี config จริง ระบบใช้ default config จาก `src/lib/config.js`
4. แอดมินเลือกแบบเสื้อจากรายการ
5. แอดมินแก้ชื่อแบบเสื้อ รูปภาพ และ field รายละเอียดไซส์ เช่น อก เอว ความยาว
6. แอดมินแยกข้อมูลไซส์ตามเพศ `ชาย` และ `หญิง`
7. แอดมินเพิ่ม/ลบแถวไซส์ได้
8. แอดมินปรับสต๊อกด้วยจำนวนบวกเพื่อ `รับเข้า` หรือจำนวนลบเพื่อ `ปรับลด`
9. ระบบคำนวณ ledger เป็น `stockOpeningQty`, `stockAdded`, `stockWithdrawn`, `stockAdjustedOut`
10. ระบบคำนวณ `สต๊อกคงเหลือ` จาก ledger
11. ทุกการแก้ไขถูก normalize แล้วเก็บใน state, localStorage และ sync ไป `/api/blob/config`
12. `/api/blob/config` บันทึก config ลง Vercel Blob และพยายาม sync stock tab ไป Google Sheets ด้วย action `syncStock`

## Flow รูปภาพแบบเสื้อ

1. แอดมินเลือกไฟล์รูปจากหน้าแบบเสื้อ
2. ระบบยอมรับเฉพาะ JPG, PNG หรือ WebP
3. ขนาดไฟล์ต้องไม่เกิน 10 MB
4. browser อัปโหลดผ่าน `@vercel/blob/client`
5. endpoint `/api/blob/upload` ตรวจ admin token จาก `clientPayload`
6. เมื่ออัปโหลดสำเร็จ URL รูปถูกบันทึกใน config ของแบบเสื้อ

## Flow จัดการสาขา

1. แอดมินเปิดแท็บ `จัดการสาขา`
2. ระบบโหลดสาขาจาก `/api/blob/branches`
3. ถ้า Blob ยังไม่มีข้อมูล ระบบ fallback ไปที่ `src/constants/branches.js`
4. แอดมินเพิ่มสาขาใหม่ได้ โดยชื่อห้ามว่างและห้ามซ้ำ
5. แอดมินแก้ชื่อสาขาเดิมได้
6. แอดมินลบสาขาได้หลังยืนยัน
7. ระบบจำกัดสาขาสูงสุด 100 รายการ
8. เมื่อบันทึกสำเร็จ หน้า order จะใช้รายชื่อสาขาชุดใหม่หลัง reload/refresh

## Flow API และแหล่งข้อมูล

### `/api/order/submit`

- ใช้กับผู้ขอเบิก
- method: `POST`
- ไม่ต้องใช้ admin token
- rate limit 20 ครั้งต่อนาทีต่อ IP
- validate จำนวนพนักงานสูงสุด 300 คน
- จำกัด item ต่อพนักงานสูงสุด 20 รายการ
- sanitize ข้อความและจำนวนก่อนส่งต่อ GAS
- บังคับสถานะเริ่มต้นเป็น `รอจัดส่ง`

### `/api/auth/dashboard`

- ใช้ login แอดมิน
- method: `POST`
- rate limit 8 ครั้งต่อนาทีต่อ IP
- ตรวจ passcode จาก env
- สร้าง signed token อายุ 8 ชั่วโมง

### `/api/dashboard/orders`

- ใช้โหลดข้อมูลแดชบอร์ด
- ต้องมี admin token
- อ่านข้อมูลจาก GAS ด้วย `GAS_ADMIN_TOKEN`
- ส่งข้อมูล batch กลับให้ frontend normalize อีกชั้น

### `/api/dashboard/action`

- ใช้ action หลังบ้าน
- ต้องมี admin token
- action ที่รองรับ: `updateStatus`, `deleteBatch`, `shipItems`, `syncStock`
- เติม `adminToken` ก่อนส่งต่อ GAS
- GAS เป็นตัวแก้ข้อมูลใน Google Sheets

### `/api/blob/config`

- `GET` อ่าน config แบบเสื้อจาก Vercel Blob
- `POST` บันทึก config แบบเสื้อ ต้องมี admin token
- ใช้ optimistic concurrency ผ่าน `expectedUpdatedAt`
- sync stock ไป GAS เมื่อมี `VITE_GAS_URL` และ `GAS_ADMIN_TOKEN`

### `/api/blob/branches`

- `GET` อ่านรายชื่อสาขาจาก Vercel Blob
- `POST` บันทึกรายชื่อสาขา ต้องมี admin token
- ใช้ optimistic concurrency ผ่าน `expectedUpdatedAt`
- จำกัด 1-100 สาขา

## Flow Google Apps Script

ไฟล์หลักคือ `scripts/Code.gs`

1. `doPost(e)` รับ payload จาก API proxy
2. ถ้าไม่มี `action` จะถือว่าเป็นคำสั่งเบิกใหม่และ append ลง sheet
3. `updateStatus` เปลี่ยนสถานะของทุกแถวใน batch
4. `deleteBatch` ลบทุกแถวของ batch
5. `shipItems` แตกแถวเดิมเป็นรายการจัดส่งแล้ว/รอจัดส่ง/ยกเลิกตามจำนวน
6. `syncStock` sync config แบบเสื้อและ stock ledger ไป sheet สต๊อก
7. `doGet(e)` ใช้อ่านข้อมูล batch สำหรับ dashboard โดยต้องมี admin token

## โครงสร้างข้อมูลหลัก

### Batch

```json
{
  "batchId": "ORD-20260604-12345",
  "companyName": "Gold Integrate",
  "branch": "สำนักงานใหญ่",
  "supervisorName": "ชื่อผู้รับผิดชอบ",
  "supervisorPhone": "0812345678",
  "submittedAt": "2026-06-04T00:00:00.000Z",
  "status": "รอจัดส่ง",
  "statusUpdatedAt": "2026-06-04T00:00:00.000Z",
  "orders": [
    {
      "name": "ชื่อพนักงาน",
      "gender": "ชาย",
      "items": [
        { "type": "เสื้อโปโล", "size": "M", "qty": 2 }
      ]
    }
  ]
}
```

### Clothing config

```json
{
  "id": "shirt-polo",
  "type": "เสื้อโปโล",
  "imageUrl": "https://...",
  "detailFields": ["อก", "ยาว"],
  "genderSizeRows": {
    "ชาย": [
      {
        "size": "M",
        "details": { "อก": "40", "ยาว": "27" },
        "qty": 10,
        "stockOpeningQty": 10,
        "stockAdded": 0,
        "stockWithdrawn": 0,
        "stockAdjustedOut": 0
      }
    ]
  }
}
```

## Environment variables

### จำเป็นสำหรับใช้งานจริง

- `VITE_GAS_URL`: URL ของ Google Apps Script Web App
- `DASHBOARD_PASSCODE`: รหัสเข้าแดชบอร์ด
- `DASHBOARD_SESSION_SECRET`: secret สำหรับ sign dashboard session token
- `GAS_ADMIN_TOKEN`: token ที่ API ใช้คุยกับ Google Apps Script
- `BLOB_READ_WRITE_TOKEN`: token ของ Vercel Blob สำหรับ config, branches และรูปภาพ

### ตัวเลือกหรือ fallback

- `GAS_URL`: fallback ของ `VITE_GAS_URL`
- `VITE_DASHBOARD_PASSCODE`: fallback ของ `DASHBOARD_PASSCODE`
- `VITE_DASHBOARD_SESSION_SECRET`: fallback ของ `DASHBOARD_SESSION_SECRET`
- `ADMIN_SHARED_SECRET`: fallback สำหรับ session/GAS token ในบาง endpoint
- `VITE_GAS_ADMIN_TOKEN`: fallback ของ `GAS_ADMIN_TOKEN`

## การรันบนเครื่อง

```powershell
npm install
npm run dev
```

ค่าเริ่มต้นของ Vite ใช้ host `127.0.0.1` และ port ตามที่ Vite เลือก ถ้าต้องระบุ port:

```powershell
npm run dev -- --port 5173
```

## คำสั่งตรวจคุณภาพ

```powershell
npm run lint
npm test
npm run build
```

## Deploy

ดูรายละเอียดเพิ่มเติมใน `README_DEPLOY.md`

สรุปสั้น:

1. สร้าง Google Apps Script จาก `scripts/Code.gs`
2. Deploy Apps Script เป็น Web App
3. ตั้งค่า env ทั้งหมดใน Vercel
4. เปิด Vercel Blob และตั้ง `BLOB_READ_WRITE_TOKEN`
5. Deploy project
6. ทดสอบ flow ส่งคำสั่งเบิก, login dashboard, เปลี่ยนสถานะ, จัดส่งบางส่วน, แก้สต๊อก และแก้สาขา

## ไฟล์สำคัญ

- `src/App.jsx`: routing หลักระหว่างหน้า order และ dashboard
- `src/components/QuickOrderApp.jsx`: flow ผู้ขอเบิก, CSV import, validation และ submit order
- `src/components/DashboardApp.jsx`: login dashboard และ state เมนูแอดมิน
- `src/components/Dashboard.jsx`: dashboard หลัก, filter, table, export, status action และ shipment flow
- `src/components/DashboardOverview.jsx`: หน้า overview
- `src/components/DashboardWorkflowPanels.jsx`: panel งานที่ต้องทำ สต๊อกต่ำ และสรุปสถานะ
- `src/components/InventoryManager.jsx`: จัดการแบบเสื้อ รูปภาพ ไซส์ และสต๊อก
- `src/components/BranchManager.jsx`: จัดการสาขา
- `src/lib/orderState.js`: state, normalize และ flatten ข้อมูล order
- `src/lib/config.js`: default clothing config, normalize, localStorage และ shared config
- `src/lib/stockHelpers.js`: stock ledger, ตรวจสต๊อก และปรับสต๊อกจากสถานะ
- `src/lib/api.js`: dashboard token และ `authFetch`
- `src/lib/dashboardTableColumns.js`: การจำค่าคอลัมน์ตาราง
- `src/styles/dashboard-workflow.css`: style เฉพาะ dashboard workflow
- `src/index.css`: style หลัก
- `api/`: serverless API routes
- `scripts/Code.gs`: Google Apps Script สำหรับ Google Sheets

## ข้อควรระวัง

- การส่งคำสั่งเบิกยังไม่ตัดสต๊อกทันที
- สต๊อกถูกตัดเมื่อแอดมินจัดส่งหรือเปลี่ยนสถานะเป็น `จัดส่งแล้ว`
- รายการ `ไซส์อื่นๆ` ไม่ผูกกับแถวสต๊อกปกติ
- ถ้าข้อมูลแบบเสื้อถูกแก้จากหลายที่พร้อมกัน ระบบอาจตอบ 409 เพื่อให้โหลดข้อมูลล่าสุดก่อน
- GitHub Pages ใช้ไม่ได้กับ flow จริง เพราะระบบต้องใช้ `/api/*`
- บนมือถือ layout ต้องไม่ดันหน้าจอออกด้านข้าง ตารางกว้างควร scroll อยู่ในกรอบของตัวเอง
