Deploy & GAS setup (quick)

1) Prepare GAS (Google Apps Script)
- Create a new Apps Script project and implement a `doPost(e)` that accepts JSON body and returns JSON `{ success: true }` on success.
- Deploy the script as a Web App (Anyone, even anonymous) or as appropriate for your org.
- Copy the web app URL (it will be used as `VITE_GAS_URL`).

2) Vercel deployment
- In Vercel project settings, add an Environment Variable named `VITE_GAS_URL` with the GAS web app URL.
- Deploy the repository (Vercel will run `npm run build` and serve the `dist` directory).
- `vercel.json` is included and configured for Vite.

3) Local test
- Set the env locally when building:

```powershell
$env:VITE_GAS_URL="https://script.google.com/macros/s/XXX/exec"
npm run build
npm run preview
```

4) Notes & troubleshooting
- Ensure the Apps Script allows POST requests from your deployed site (CORS). If using Apps Script web app, it generally allows requests when set to "Anyone, even anonymous".
- The client sends JSON; ensure `doPost(e)` uses `JSON.parse(e.postData.contents)`.
- If requests sometimes fail, the client will retry twice with a short backoff.

If you want, I can:
- Add an example `doPost` handler for GAS
- Add Playwright E2E test that exercises the submit flow
