import { GENDERS, OTHER_SIZE } from './config';
import { ORDER_STATUS_DELIVERED, ORDER_STATUS_PENDING } from './orderState';

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

export function getBatchStatusStockMovements(batch, targetStatus) {
  return batch.orders.flatMap((order) => {
    const gender = order.gender || GENDERS[0];
    return order.items
      .filter((item) => item.size !== OTHER_SIZE)
      .map((item) => {
        const currentStatus = item.status || ORDER_STATUS_PENDING;
        const requested = Number(item.qty || 0);
        const willBeDelivered = targetStatus === ORDER_STATUS_DELIVERED;
        const wasDelivered = currentStatus === ORDER_STATUS_DELIVERED;
        const delta = willBeDelivered && !wasDelivered ? -requested : !willBeDelivered && wasDelivered ? requested : 0;
        return {
          type: item.type,
          gender,
          size: item.size,
          qty: requested,
          delta,
          currentStatus,
        };
      })
      .filter((movement) => movement.delta !== 0);
  });
}

export function findStockIssuesForStatusChange(config, batch, targetStatus) {
  if (targetStatus !== ORDER_STATUS_DELIVERED) return [];

  const issues = [];
  getBatchStatusStockMovements(batch, targetStatus).forEach((movement) => {
    const { type, gender, size, qty: requested } = movement;
    if (!type || !size || requested <= 0) {
      issues.push(`แบบเสื้อ ${type || 'ไม่ทราบ'} ไซส์ ${size || 'ไม่ระบุ'} ไม่มีข้อมูลสต๊อก`);
      return;
    }

    const clothing = config.find((c) => c.type === type);
    if (!clothing) {
      issues.push(`แบบเสื้อ ${type} ไซส์ ${size} ไม่มีข้อมูลสต๊อก`);
      return;
    }

    const rows = clothing.genderSizeRows?.[gender] || clothing.sizeRows || [];
    const row = rows.find((r) => String(r.size) === String(size));
    const available = Number(row?.qty || 0);
    if (available < requested) {
      issues.push(
        `แบบเสื้อ ${type} ไซส์ ${size} (${gender}) ต้องการ ${requested} ชิ้น แต่มีสต๊อก ${available} ชิ้น`
      );
    }
  });

  return issues;
}

export function adjustStockForStatusChange(config, batch, targetStatus) {
  const movements = getBatchStatusStockMovements(batch, targetStatus);
  if (!movements.length) return config;

  return config.map((clothing) => {
    const clothingMovements = movements.filter((movement) => movement.type === clothing.type);
    if (!clothingMovements.length) return clothing;

    const genderSizeRows = { ...(clothing.genderSizeRows || {}) };
    let changed = false;

    clothingMovements.forEach((movement) => {
      const rows = genderSizeRows[movement.gender] || clothing.sizeRows || [];
      const updatedRows = rows.map((row) => {
        if (String(row.size) !== String(movement.size)) return row;
        changed = true;
        return applyStockMovement(row, movement.delta, movement.delta < 0 ? 'withdraw' : 'restore');
      });
      genderSizeRows[movement.gender] = updatedRows;
    });

    return changed ? { ...clothing, genderSizeRows } : clothing;
  });
}
