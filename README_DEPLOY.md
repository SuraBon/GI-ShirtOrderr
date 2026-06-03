# Deploy and Integration Guide

คู่มือนี้ใช้สำหรับ deploy GI Shirt Order พร้อม Google Apps Script, Google Sheets, Vercel Functions และ Vercel Blob

## Architecture

```text
Browser
  -> Vite React app
  -> /api/order/submit
  -> /api/auth/dashboard
  -> /api/dashboard/orders
  -> /api/dashboard/action
  -> /api/blob/config
  -> /api/blob/branches
  -> /api/blob/upload

Vercel API routes
  -> Google Apps Script Web App
  -> Google Sheets
  -> Vercel Blob
```

## Required Services

- GitHub repository
- Vercel project
- Vercel Blob store
- Google Sheet
- Google Apps Script Web App from `scripts/Code.gs`

## Environment Variables

Set these in Vercel Project Settings.

### Required

- `VITE_GAS_URL`: Google Apps Script Web App URL
- `DASHBOARD_PASSCODE`: passcode for dashboard login
- `DASHBOARD_SESSION_SECRET`: secret for signing dashboard session token
- `GAS_ADMIN_TOKEN`: shared token used by API routes to call GAS admin actions
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token

### Optional fallback

- `GAS_URL`: fallback for `VITE_GAS_URL`
- `VITE_DASHBOARD_PASSCODE`: fallback for `DASHBOARD_PASSCODE`
- `VITE_DASHBOARD_SESSION_SECRET`: fallback for `DASHBOARD_SESSION_SECRET`
- `ADMIN_SHARED_SECRET`: fallback for session/GAS token in some routes
- `VITE_GAS_ADMIN_TOKEN`: fallback for `GAS_ADMIN_TOKEN`

## Google Sheet Setup

1. Create a Google Sheet for shirt orders.
2. Open Extensions -> Apps Script.
3. Replace the Apps Script content with `scripts/Code.gs`.
4. Configure any sheet names or constants required by the script.
5. Save the project.
6. Deploy as Web App.
7. Set access according to the organization policy. The app currently expects API routes to call the Web App URL.
8. Copy the Web App URL into `VITE_GAS_URL`.

## Google Apps Script Actions

`scripts/Code.gs` supports these flows:

- New order payload without `action`: append new batch rows
- `updateStatus`: update all rows in a batch to one status
- `deleteBatch`: delete all rows for a batch
- `shipItems`: split item rows into shipped, pending, and canceled quantities
- `syncStock`: write clothing config and stock ledger to the stock sheet
- `doGet`: return dashboard batch data when called with admin token

## Vercel Setup

1. Import the repository into Vercel.
2. Ensure build command is `npm run build`.
3. Ensure output directory is `dist`.
4. Add all required environment variables.
5. Enable Vercel Blob and copy `BLOB_READ_WRITE_TOKEN`.
6. Deploy.
7. Open the production URL.

## Local Development

Create `.env` locally with the same keys used in Vercel.

```powershell
npm install
npm run dev -- --port 5173
```

Build and preview:

```powershell
npm run build
npm run preview
```

Quality checks:

```powershell
npm run lint
npm test
npm run build
```

## Smoke Test After Deploy

1. Open `/`.
2. Confirm branches load.
3. Confirm clothing types and sizes load.
4. Submit a small order.
5. Open `#/dashboard`.
6. Login with `DASHBOARD_PASSCODE`.
7. Confirm the new batch appears in `รายการเบิก`.
8. Open the batch detail.
9. Try setting an item to `จัดส่งแล้ว`.
10. Confirm stock is reduced.
11. Open `แบบเสื้อและสต๊อก`.
12. Adjust stock and confirm the value persists after reload.
13. Open `จัดการสาขา`.
14. Add, rename, and delete a test branch.
15. Export CSV and confirm Thai text opens correctly in Excel.

## Troubleshooting

### Dashboard login fails

- Check `DASHBOARD_PASSCODE`.
- Check `DASHBOARD_SESSION_SECRET`.
- Confirm `/api/auth/dashboard` is available on the deployed host.

### Dashboard loads but data is empty

- Check `VITE_GAS_URL`.
- Check `GAS_ADMIN_TOKEN`.
- Confirm Apps Script `doGet` validates the same token.
- Check Google Sheet structure expected by `scripts/Code.gs`.

### Submit order fails

- Check `VITE_GAS_URL`.
- Confirm Apps Script Web App is deployed and accessible.
- Confirm `doPost(e)` can parse `e.postData.contents`.
- Check rate limiting if testing repeatedly.

### Blob config or branches fail

- Check `BLOB_READ_WRITE_TOKEN`.
- Confirm Vercel Blob is enabled on the project.
- Check dashboard token; write routes require admin auth.

### Stock does not sync to Google Sheets

- Check `/api/blob/config` logs.
- Confirm `VITE_GAS_URL` and `GAS_ADMIN_TOKEN` are set.
- Confirm Apps Script supports `syncStock`.

## Hosting Notes

- GitHub Pages cannot run this app fully because the app depends on `/api/*` routes.
- Use Vercel or another host that can run serverless API routes.
- The static frontend alone can render, but dashboard auth, order submit, Blob config, and GAS proxy flows will not work without API routes.
