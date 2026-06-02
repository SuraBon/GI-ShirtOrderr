const DASHBOARD_TABLE_COLUMNS_KEY = 'gi-dashboard-table-columns';

export const ORDER_TABLE_COLUMNS = [
  { id: 'code', label: 'รหัสคำสั่ง' },
  { id: 'date', label: 'วันที่' },
  { id: 'company', label: 'บริษัท/หน่วยงาน' },
  { id: 'branch', label: 'สาขา' },
  { id: 'contact', label: 'ผู้ติดต่อ' },
  { id: 'total', label: 'จำนวนรวม' },
  { id: 'status', label: 'สถานะ' },
  { id: 'updated', label: 'อัปเดตล่าสุด' },
];

export const EMPLOYEE_TABLE_COLUMNS = [
  { id: 'name', label: 'ชื่อพนักงาน' },
  { id: 'gender', label: 'เพศ' },
  { id: 'type', label: 'เสื้อ' },
  { id: 'size', label: 'ไซส์' },
  { id: 'qty', label: 'จำนวน' },
  { id: 'status', label: 'สถานะ' },
  { id: 'date', label: 'อัปเดตล่าสุด' },
];

export function getDefaultColumnIds(columns) {
  return columns.map((column) => column.id);
}

export function readDashboardTableColumns(tableId, columns) {
  if (typeof localStorage === 'undefined') return getDefaultColumnIds(columns);
  try {
    const saved = JSON.parse(localStorage.getItem(DASHBOARD_TABLE_COLUMNS_KEY) || '{}');
    const allowed = new Set(columns.map((column) => column.id));
    const visible = Array.isArray(saved?.[tableId])
      ? saved[tableId].filter((id) => allowed.has(id))
      : [];
    return visible.length ? visible : getDefaultColumnIds(columns);
  } catch {
    return getDefaultColumnIds(columns);
  }
}

export function writeDashboardTableColumns(tableId, visibleColumns) {
  if (typeof localStorage === 'undefined') return;
  const saved = JSON.parse(localStorage.getItem(DASHBOARD_TABLE_COLUMNS_KEY) || '{}');
  localStorage.setItem(
    DASHBOARD_TABLE_COLUMNS_KEY,
    JSON.stringify({ ...saved, [tableId]: visibleColumns })
  );
}
