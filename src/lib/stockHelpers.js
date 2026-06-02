/**
 * Stock Ledger Management Helpers
 * Business logic for tracking stock movements and inventory
 */

export function normalizeStockLedger(row, qty = Number(row?.qty || 0)) {
  const stockAdded = Number(row?.stockAdded || 0);
  const stockWithdrawn = Number(row?.stockWithdrawn || row?.withdrawn || 0);
  const stockAdjustedOut = Number(row?.stockAdjustedOut || 0);
  const stockOpeningQty =
    row?.stockOpeningQty !== undefined
      ? Number(row.stockOpeningQty || 0)
      : Math.max(0, Number(qty || 0) + stockWithdrawn - stockAdded + stockAdjustedOut);
  return {
    stockOpeningQty,
    stockAdded,
    stockWithdrawn,
    stockAdjustedOut,
  };
}

export function applyStockMovement(row, delta, movementType = 'manual') {
  const currentQty = Number(row?.qty || 0);
  const nextQty = Math.max(0, currentQty + Number(delta || 0));
  const actualDelta = nextQty - currentQty;
  const ledger = normalizeStockLedger(row, currentQty);

  if (movementType === 'withdraw' && actualDelta < 0) {
    ledger.stockWithdrawn += Math.abs(actualDelta);
  } else if (movementType === 'restore' && actualDelta > 0) {
    ledger.stockWithdrawn = Math.max(0, ledger.stockWithdrawn - actualDelta);
  } else if (movementType === 'manual') {
    if (actualDelta > 0) ledger.stockAdded += actualDelta;
    if (actualDelta < 0) ledger.stockAdjustedOut += Math.abs(actualDelta);
  }

  return { ...row, qty: nextQty, ...ledger };
}

export function getStockLedgerSummary(row) {
  const qty = Number(row?.qty || 0);
  const ledger = normalizeStockLedger(row, qty);
  const totalStock = Math.max(0, ledger.stockOpeningQty + ledger.stockAdded - ledger.stockAdjustedOut);
  return {
    opening: ledger.stockOpeningQty,
    added: ledger.stockAdded,
    adjustedOut: ledger.stockAdjustedOut,
    withdrawn: ledger.stockWithdrawn,
    totalStock,
    remaining: qty,
  };
}
