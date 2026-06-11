# Refactoring & Stock Logic Fixes

## Overview
This plan addresses the cleanup of 27 ESLint errors introduced after decoupling client-side QuickOrder and Dashboard components. It also aligns the stock logic with the requisition flow (orders act as branch requisitions and only subtract stock upon transitioning to "Delivered").

## Project Type
WEB (Vite / React client + Node.js serverless functions API)

## Tech Stack
- Frontend: React (Vite)
- Backend: Node.js (Serverless functions)

## File Structure & Affected Files
- [api/blob/config.js](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/api/blob/config.js)
- [api/order/submit.js](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/api/order/submit.js)
- [src/components/Dashboard.jsx](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/src/components/Dashboard.jsx)
- [src/components/QuickOrderApp.jsx](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/src/components/QuickOrderApp.jsx)

## Success Criteria
- 100% clean build passing all linting checks.
- All unit and integration tests passing.
- Customers can submit order requisitions regardless of stock levels, while admin-side transitions to Delivered perform proper stock verification and withdrawal.

## Task Breakdown
- [x] Task 1: Clean up unused stock synchronization functions in [api/blob/config.js](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/api/blob/config.js) to resolve variables defined but never used errors.
- [x] Task 2: Import `clearCachedDashboardOrders` in [api/order/submit.js](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/api/order/submit.js) to resolve the undefined function error.
- [x] Task 3: Remove unused imports in [src/components/Dashboard.jsx](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/src/components/Dashboard.jsx).
- [x] Task 4: Clean up unused imports and restore the `SetupWarning` component in [src/components/QuickOrderApp.jsx](file:///c:/Users/Desktop/Documents/GI/web/GI-ShirtOrderr/src/components/QuickOrderApp.jsx).

## Phase X: Final Verification
- [x] Lint check: `npm run lint` passes with no warnings/errors.
- [x] Test check: `npm run test` passes with 22 tests green.
- [ ] Verification script: `python .agents/scripts/checklist.py .` (Skipped: Python not installed on Windows host)
- [x] Rule compliance: Verify no purple/violet colors are used, and no layout templates are copied.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-11
