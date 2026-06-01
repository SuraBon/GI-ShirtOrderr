import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { upload } from '@vercel/blob/client';
import { Toaster, toast } from 'sonner';
import {
  CalendarDays,
  BarChart3,
  Check,
  CheckSquare,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Download,
  Eraser,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Loader2,
  PackageCheck,
  PackageSearch,
  Pencil,
  PieChart,
  Plus,
  Ruler,
  Search,
  Send,
  Settings,
  Shirt,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
  ArrowLeft,
  ArrowRight,
  Printer,
  RefreshCw,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import { cn } from './lib/utils';
import {
  Logo,
  OrderHeader,
  DashboardHeader,
  Field,
  TextInput,
  GridInput,
  TextArea,
  CustomSelect,
  Select,
  GridSelect,
  Card,
  Section,
  Alert,
  Badge,
} from './components';
import './index.css';

const APPS_SCRIPT_URL = import.meta.env.VITE_GAS_URL || 'YOUR_SCRIPT_URL_HERE';
const DASHBOARD_PATH = '#/dashboard';
const ORDER_PATH = '/';
const DASHBOARD_SESSION_KEY = 'gi-dashboard-admin-token';
const CLOTHING_CONFIG_KEY = 'gi-shirt-clothing-config';
const CLOTHING_SIZE_TABLE_VERSION_KEY = 'gi-shirt-clothing-size-table-version';
const CLOTHING_SIZE_TABLE_VERSION = '2026-05-standard-shirt-table-v2';
const IMAGE_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_COMPANY_NAME = 'โกลด์ อินทิเกรท จำกัด';
const ORDER_STATUS_PENDING = 'รอจัดส่ง';
const ORDER_STATUS_DELIVERED = 'จัดส่งแล้ว';
const ORDER_STATUS_BACKORDER = 'รอของ';
const ORDER_STATUSES = [ORDER_STATUS_PENDING, ORDER_STATUS_DELIVERED, ORDER_STATUS_BACKORDER];

const BRANCHES = [
  'GI(สาขาใหญ่)',
  'EV7(สาขาใหญ่)',
  'The Mall บางกะปิ',
  'The Mall บางแค',
  'Warehouse',
  'กาญจนาภิเษก',
  'บางนา ทาวเวอร์',
  'พิบูลสงคราม',
  'มหาชัย',
  'มีนบุรี',
  'วิภาวดี',
  'ศาลายา',
  'อยุธยา',
  'อุบลราชธานี',
  'เซ็นทรัลพระราม 2',
  'เลียบคลอง 2',
  'เลียบด่วนรามอินทรา',
  'เอ็มสเฟียร์',
];
const CLOTHING_TYPES = ['เสื้อโปโล', 'เสื้อช็อป', 'กางเกงช็อป'];
const GENDERS = ['ชาย', 'หญิง'];

function genderSymbol(gender) {
  return gender === 'ชาย' ? '♂' : '♀';
}
const OTHER_SIZE = 'อื่นๆ';
const PHONE_LENGTH = 10;

const SIZE_TABLES = {
  'เสื้อโปโล ชาย': [
    ['S', '38"'],
    ['M', '40"'],
    ['L', '42"'],
    ['XL', '44"'],
    ['2XL', '46"'],
    ['3XL', '48"'],
    ['4XL', '50"'],
    ['5XL', '52"'],
  ],
  'เสื้อโปโล หญิง': [
    ['S', '34"'],
    ['M', '36"'],
    ['L', '38"'],
    ['XL', '40"'],
    ['2XL', '42"'],
    ['3XL', '44"'],
  ],
  เสื้อช็อป: [
    ['S', '38"'],
    ['M', '40"'],
    ['L', '42"'],
    ['XL', '44"'],
    ['2XL', '46"'],
    ['3XL', '48"'],
    ['4XL', '50"'],
    ['5XL', '52"'],
  ],
  กางเกงช็อป: [
    ['28”', ''],
    ['30”', ''],
    ['32”', '3'],
    ['34”', '3'],
    ['36”', ''],
    ['38”', '3'],
    ['40”', ''],
    ['42”', '3'],
    ['44”', ''],
  ],
};

function getStandardSizeSource(type, gender) {
  if (type === 'เสื้อโปโล')
    return SIZE_TABLES[`เสื้อโปโล ${gender}`] || SIZE_TABLES['เสื้อโปโล ชาย'];
  return SIZE_TABLES[type] || [];
}

function getStandardDetailFields(type) {
  return type === 'กางเกงช็อป' ? ['จำนวน'] : ['อก'];
}

function buildStandardSizeRows(type, gender) {
  const detailField = getStandardDetailFields(type)[0];
  return getStandardSizeSource(type, gender).map(([size, measure]) => ({
    size,
    details: { [detailField]: measure },
    qty: 0,
  }));
}

function buildDefaultClothingItem(type, item = {}) {
  const detailFields = getStandardDetailFields(type);
  const genderSizeRows = GENDERS.reduce(
    (rows, gender) => ({
      ...rows,
      [gender]: buildStandardSizeRows(type, gender),
    }),
    {}
  );
  return {
    id: item.id || crypto.randomUUID(),
    type,
    imageUrl: item.imageUrl || '',
    colors: Array.isArray(item.colors) ? item.colors : [],
    detailFields,
    sizeRows: genderSizeRows[GENDERS[0]],
    genderSizeRows,
  };
}

const DEFAULT_CLOTHING_CONFIG = CLOTHING_TYPES.map((type) => buildDefaultClothingItem(type));

function normalizeSizeDetails(row, detailFields) {
  if (row?.details && typeof row.details === 'object') {
    return detailFields.reduce(
      (details, field) => ({ ...details, [field]: String(row.details[field] || '') }),
      {}
    );
  }
  const fallback = String(row?.measure || '').trim();
  return detailFields.reduce(
    (details, field, index) => ({ ...details, [field]: index === 0 ? fallback : '' }),
    {}
  );
}

function normalizeSizeRows(rows, detailFields) {
  const normalizedRows =
    Array.isArray(rows) && rows.length
      ? rows.map((row) => {
          const qty = Number(row?.qty || 0);
          const ledger = normalizeStockLedger(row, qty);
          return {
            size: String(row?.size || '').trim(),
            details: normalizeSizeDetails(row, detailFields),
            qty,
            ...ledger,
          };
        })
      : [];
  return normalizedRows.length
    ? normalizedRows
    : [{ size: 'M', details: normalizeSizeDetails({}, detailFields), qty: 0, ...normalizeStockLedger({}, 0) }];
}

function normalizeStockLedger(row, qty = Number(row?.qty || 0)) {
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

function applyStockMovement(row, delta, movementType = 'manual') {
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

function getStockLedgerSummary(row) {
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

function normalizeClothingConfig(config) {
  const source = Array.isArray(config) && config.length ? config : DEFAULT_CLOTHING_CONFIG;
  return source
    .map((item, index) => {
      const type = String(item?.type || CLOTHING_TYPES[index] || 'เสื้อ').trim();
      const detailFields =
        Array.isArray(item?.detailFields) && item.detailFields.length
          ? item.detailFields.map((field) => String(field || '').trim()).filter(Boolean)
          : [String(item?.detailLabel || (type.includes('กางเกง') ? 'เอว' : 'อก')).trim()];
      const fallbackRows = normalizeSizeRows(item?.sizeRows, detailFields);
      const genderSizeRows = GENDERS.reduce(
        (genderRows, gender) => ({
          ...genderRows,
          [gender]: normalizeSizeRows(item?.genderSizeRows?.[gender] || fallbackRows, detailFields),
        }),
        {}
      );

      return {
        id: item?.id || crypto.randomUUID(),
        type,
        imageUrl: item?.imageUrl || '',
        colors: Array.isArray(item?.colors)
          ? item.colors.map((color) => ({
              name: String(color?.name || '').trim(),
              value: String(color?.value || '#0F172A').trim() || '#0F172A',
            }))
          : [],
        detailFields,
        sizeRows: genderSizeRows[GENDERS[0]] || fallbackRows,
        genderSizeRows,
      };
    })
    .filter((item) => item.type);
}

function migrateStandardSizeTables(config) {
  const normalized = normalizeClothingConfig(config);
  const standardTypes = new Set(CLOTHING_TYPES);
  const byType = new Map(normalized.map((item) => [item.type, item]));
  const migratedStandardItems = CLOTHING_TYPES.map((type) =>
    buildDefaultClothingItem(type, byType.get(type))
  );
  const customItems = normalized.filter((item) => !standardTypes.has(item.type));
  return [...migratedStandardItems, ...customItems];
}

function readClothingConfig() {
  try {
    const normalized = normalizeClothingConfig(
      JSON.parse(localStorage.getItem(CLOTHING_CONFIG_KEY) || 'null')
    );
    if (localStorage.getItem(CLOTHING_SIZE_TABLE_VERSION_KEY) !== CLOTHING_SIZE_TABLE_VERSION) {
      const migrated = migrateStandardSizeTables(normalized);
      localStorage.setItem(CLOTHING_CONFIG_KEY, JSON.stringify(migrated));
      localStorage.setItem(CLOTHING_SIZE_TABLE_VERSION_KEY, CLOTHING_SIZE_TABLE_VERSION);
      return migrated;
    }
    return normalized;
  } catch {
    const normalized = migrateStandardSizeTables();
    localStorage.setItem(CLOTHING_SIZE_TABLE_VERSION_KEY, CLOTHING_SIZE_TABLE_VERSION);
    return normalized;
  }
}

function saveClothingConfig(config) {
  localStorage.setItem(CLOTHING_CONFIG_KEY, JSON.stringify(normalizeClothingConfig(config)));
}

async function loadSharedClothingConfig() {
  const response = await fetch('/api/blob/config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Shared clothing config is not available');
  const data = await response.json();
  if (!Array.isArray(data?.config) || !data.config.length) return null;
  const normalized = migrateStandardSizeTables(data.config);
  saveClothingConfig(normalized);
  localStorage.setItem(CLOTHING_SIZE_TABLE_VERSION_KEY, CLOTHING_SIZE_TABLE_VERSION);
  return normalized;
}

async function publishSharedClothingConfig(config) {
  const normalized = normalizeClothingConfig(config);
  const token = getAdminToken();
  const response = await fetch('/api/blob/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ config: normalized }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.error || 'Shared clothing config sync failed');
    error.status = response.status;
    throw error;
  }
  return normalized;
}

function getAdminToken() {
  return sessionStorage.getItem(DASHBOARD_SESSION_KEY) || '';
}

function setAdminToken(token) {
  if (token) sessionStorage.setItem(DASHBOARD_SESSION_KEY, token);
  else sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
}

function isAuthFailure(error) {
  return error?.status === 401 || error?.message === 'Unauthorized';
}

async function authFetch(url, options = {}) {
  const token = getAdminToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    clearTimeout(timeoutId);
    if (response.status === 401) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error('การเชื่อมต่อหมดเวลา (Timeout) กรุณาลองใหม่อีกครั้ง');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw err;
  }
}

function getClothingTypes() {
  return readClothingConfig().map((item) => item.type);
}

function findClothingConfig(type) {
  return readClothingConfig().find((item) => item.type === type);
}

function getColorOptions(type) {
  return [];
}

function needsColorSelection(type) {
  return false;
}

function resolveItemColor(type, color = '') {
  return '';
}

function getSizeRows(type, gender) {
  const clothing = findClothingConfig(type);
  const genderRows = clothing?.genderSizeRows?.[gender];
  if (genderRows?.length)
    return genderRows.map((row) => [
      row.size,
      Object.values(row.details || {})
        .filter(Boolean)
        .join(' / ') || row.size,
    ]);
  if (clothing?.sizeRows?.length)
    return clothing.sizeRows.map((row) => [
      row.size,
      Object.values(row.details || {})
        .filter(Boolean)
        .join(' / ') || row.size,
    ]);
  if (type === 'เสื้อโปโล') return SIZE_TABLES[`เสื้อโปโล ${gender}`] || [];
  return SIZE_TABLES[type] || [];
}

function getSizeOptions(type, gender) {
  return [...getSizeRows(type, gender).map(([size]) => size), OTHER_SIZE];
}

function getSizeOptionsWithLabels(type, gender) {
  if (!gender) return [];
  const options = getSizeRows(type, gender).map(([size]) => [size, size]);
  return [...options, [OTHER_SIZE, OTHER_SIZE]];
}

function defaultSize(type, gender) {
  return getSizeOptions(type, gender)[1] || 'M';
}

function patchSizeWithDefaultQty(item, size) {
  return {
    size,
    customSize: size === OTHER_SIZE ? item.customSize : '',
    qty: item.qty || 2,
  };
}

function ItemColorSelect({ employee, item, dispatch, compact = false, invalid = false }) {
  const colors = getColorOptions(item.type);
  if (colors.length <= 1) return null;
  return (
    <GridSelect
      value={item.color || ''}
      disabled={!employee.gender}
      placeholder={employee.gender ? 'เลือกสี' : 'เลือกเพศก่อน'}
      values={colors}
      onChange={(color) =>
        dispatch({ type: 'patchItem', id: employee.id, itemType: item.type, patch: { color } })
      }
      compact={compact}
      invalid={invalid}
    />
  );
}

function formatOrderItemLabel(item) {
  return [item.type, item.color ? `สี${item.color}` : '', item.size, `x${item.qty || 0}`]
    .filter(Boolean)
    .join(' ');
}

function EmployeeItemSummary({ employee, onEdit, dispatch, invalid = false }) {
  if (!employee.items.length) {
    return (
      <button
        onClick={onEdit}
        className={cn(
          'min-h-10 w-full rounded-lg border border-dashed px-3 text-sm font-bold transition',
          invalid
            ? 'border-[#EF4444] bg-[#FFF7F7] text-[#B91C1C] hover:bg-[#FEE2E2]'
            : 'border-[#A9B9D1] bg-white text-[#002B5B] hover:bg-[#F4F8FF]'
        )}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <Plus className="size-4" /> เพิ่มรายการเสื้อ
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2 flex-1 min-w-[14rem]">
        {employee.items.map((item) => {
          const sizeOptions = getSizeOptionsWithLabels(item.type, employee.gender);
          return (
            <div
              key={`${item.type}-${item.color}`}
              className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-2 py-1.5 shadow-sm text-xs font-semibold"
            >
              <span className="font-extrabold text-[#071638]">{item.type}</span>
              {item.color && (
                <span className="text-[#64748B] font-bold">สี{item.color}</span>
              )}
              
              {/* Inline Size Dropdown */}
              <Select
                value={item.size}
                onChange={(val) =>
                  dispatch({
                    type: 'patchItem',
                    id: employee.id,
                    itemType: item.type,
                    patch: { size: val },
                  })
                }
                placeholder="ไซส์"
                values={sizeOptions}
                size="xs"
              />

              {/* customSize text input if OTHER_SIZE is selected */}
              {item.size === OTHER_SIZE && (
                <input
                  type="text"
                  value={item.customSize || ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'patchItem',
                      id: employee.id,
                      itemType: item.type,
                      patch: { customSize: e.target.value },
                    })
                  }
                  placeholder="ระบุไซส์"
                  className="w-16 h-7 border border-[#CBD5E1] rounded px-1.5 text-xs font-semibold focus:border-[#002B5B]"
                />
              )}

              {/* Inline Qty Input */}
              <input
                type="number"
                value={item.qty || 0}
                onChange={(e) =>
                  dispatch({
                    type: 'patchItem',
                    id: employee.id,
                    itemType: item.type,
                    patch: { qty: digitsOnly(e.target.value) },
                  })
                }
                className="w-10 h-7 border border-[#CBD5E1] rounded text-center font-bold text-xs"
              />
              
              {/* Delete garment button */}
              <button
                onClick={() =>
                  dispatch({ type: 'toggleType', id: employee.id, itemType: item.type })
                }
                className="text-[#94A3B8] hover:text-[#B91C1C] transition p-0.5"
                title="ลบเสื้อตัวนี้"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={onEdit}
        className="min-h-9 shrink-0 rounded-lg border border-[#D9E2EF] bg-white px-3 text-sm font-black text-[#0D152A] hover:bg-[#F8FAFC] transition"
      >
        จัดการแบบเสื้อ
      </button>
    </div>
  );
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function phoneDigitsOnly(value) {
  return digitsOnly(value).slice(0, PHONE_LENGTH);
}

function formatPhone(value) {
  const phone = phoneDigitsOnly(value);
  if (phone.length <= 3) return phone;
  if (phone.length <= 6) return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
}

function createEmployee(index = 0) {
  return {
    id: crypto.randomUUID(),
    employeeId: '',
    name: '',
    gender: '',
    expanded: index === 0,
    items: [],
  };
}

function createOrderItem(type, gender, size = '', qty = 2, color = '') {
  const options = gender ? getSizeOptions(type, gender) : [];
  const colors = getColorOptions(type);
  const nextSize = size && options.includes(size) ? size : gender ? defaultSize(type, gender) : '';
  return {
    type,
    size: nextSize,
    customSize: '',
    color: resolveItemColor(type, color),
    qty: digitsOnly(qty || 2),
  };
}

function createQuickOrderItems({ presetId, gender, defaultSizeValue, customItems }) {
  const sourceItems = getClothingTypes()
    .map((type, index) => ({
      type,
      qty: customItems?.[index]?.qty || 2,
      color: customItems?.[index]?.color || '',
      enabled: Boolean(customItems?.[index]?.enabled),
    }))
    .filter((item) => item.enabled);

  return sourceItems.map((item) =>
    createOrderItem(item.type, gender, defaultSizeValue, item.qty, item.color)
  );
}

function createEmployeeFromQuickOrder(name, index, quickOrder) {
  return {
    ...createEmployee(index),
    name,
    gender: quickOrder.gender,
    expanded: index === 0,
    items: createQuickOrderItems(quickOrder),
  };
}

function createInitialOrderState() {
  return {
    companyName: DEFAULT_COMPANY_NAME,
    branch: BRANCHES[0],
    supervisorName: '',
    supervisorPhone: '',
    employees: Array.from({ length: 1 }, (_, index) => createEmployee(index)),
  };
}

function canDeleteEmployee(employees) {
  return employees.length > 1;
}

function orderReducer(state, action) {
  switch (action.type) {
    case 'patchBatch':
      return { ...state, ...action.patch };
    case 'generate':
      return {
        ...state,
        employees: Array.from({ length: action.count }, (_, index) => createEmployee(index)),
      };
    case 'syncCount': {
      const count = Math.max(1, Number(action.count || 1));
      const employees = state.employees.slice(0, count);
      while (employees.length < count) employees.push(createEmployee(employees.length));
      return { ...state, employees };
    }
    case 'setNamesFromPaste': {
      const names = action.names.filter(Boolean);
      if (!names.length) return state;
      const employees = names.map((name, index) => ({
        ...(state.employees[index] || createEmployee(index)),
        name,
        expanded: index === 0,
      }));
      return { ...state, employees };
    }
    case 'applyQuickOrder': {
      const names = action.names.filter(Boolean);
      if (!names.length) return state;
      return {
        ...state,
        employees: names.map((name, index) =>
          createEmployeeFromQuickOrder(name, index, action.quickOrder)
        ),
      };
    }
    case 'copyFirstSetupToAll': {
      const source = state.employees[0];
      if (!source) return state;
      return {
        ...state,
        employees: state.employees.map((employee, index) =>
          index === 0
            ? employee
            : {
                ...employee,
                gender: source.gender,
                items: source.items.map((item) => ({ ...item })),
              }
        ),
      };
    }
    case 'removeBlankEmployees': {
      const employees = state.employees.filter(hasEmployeeData);
      return { ...state, employees: employees.length ? employees : [createEmployee(0)] };
    }
    case 'add': {
      const prevEmployee = state.employees[state.employees.length - 1];
      const newEmployee = createEmployee(state.employees.length);
      if (action.id) {
        newEmployee.id = action.id;
      }
      if (prevEmployee) {
        newEmployee.gender = prevEmployee.gender || '';
        if (Array.isArray(prevEmployee.items)) {
          newEmployee.items = prevEmployee.items.map((item) => ({ ...item }));
        }
      }
      return { ...state, employees: [...state.employees, newEmployee] };
    }
    case 'delete':
      if (!canDeleteEmployee(state.employees)) return state;
      return {
        ...state,
        employees: state.employees.filter((employee) => employee.id !== action.id),
      };
    case 'cloneEmployee': {
      const source = state.employees.find((employee) => employee.id === action.id);
      if (!source) return state;
      const index = state.employees.findIndex((employee) => employee.id === action.id);
      const cloned = {
        id: crypto.randomUUID(),
        employeeId: '',
        name: source.name ? `${source.name} (คัดลอก)` : '',
        gender: source.gender,
        expanded: false,
        items: source.items.map((item) => ({ ...item })),
      };
      const employees = [...state.employees];
      employees.splice(index + 1, 0, cloned);
      return { ...state, employees };
    }
    case 'toggleExpand':
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.id ? { ...employee, expanded: !employee.expanded } : employee
        ),
      };
    case 'focusEmployee':
      return {
        ...state,
        employees: state.employees.map((employee) => ({
          ...employee,
          expanded: employee.id === action.id,
        })),
      };
    case 'saveAndOpenNext':
      return {
        ...state,
        employees: state.employees.map((employee, index) => ({
          ...employee,
          expanded: index === action.nextIndex,
        })),
      };
    case 'patchEmployee':
      return {
        ...state,
        employees: state.employees.map((employee) => {
          if (employee.id !== action.id) return employee;
          const next = { ...employee, ...action.patch };
          if ('gender' in action.patch) {
            next.items = next.items.map((item) => ({
              ...item,
              size: '',
              customSize: '',
            }));
          }
          return next;
        }),
      };
    case 'toggleType':
      return {
        ...state,
        employees: state.employees.map((employee) => {
          if (employee.id !== action.id) return employee;
          const exists = employee.items.some((item) => item.type === action.itemType);
          const items = exists
            ? employee.items.filter((item) => item.type !== action.itemType)
            : [...employee.items, createOrderItem(action.itemType, employee.gender)];
          return { ...employee, items };
        }),
      };
    case 'patchItem':
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.id
            ? {
                ...employee,
                items: employee.items.map((item) =>
                  item.type === action.itemType ? { ...item, ...action.patch } : item
                ),
              }
            : employee
        ),
      };
    case 'copyEmployeeSetup': {
      const source = state.employees.find((employee) => employee.id === action.sourceId);
      if (!source) return state;
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.id
            ? {
                ...employee,
                gender: source.gender,
                items: source.items.map((item) => ({ ...item })),
              }
            : employee
        ),
      };
    }
    case 'reset':
      return createInitialOrderState();
    default:
      return state;
  }
}

function flattenBatches(batches) {
  return batches.flatMap((batch) =>
    batch.orders.flatMap((order) =>
      order.items.map((item, index) => ({
        id: `${batch.batchId}-${order.name}-${item.type}-${index}`,
        batchId: batch.batchId,
        submittedAt: batch.submittedAt,
        companyName: batch.companyName,
        branch: batch.branch,
        supervisorName: batch.supervisorName,
        supervisorPhone: batch.supervisorPhone,
        status: batch.status,
        statusUpdatedAt: batch.statusUpdatedAt,
        name: order.name,
        gender: order.gender,
        type: item.type,
        size: item.size,
        color: resolveItemColor(item.type, item.color || ''),
        qty: Number(item.qty || 0),
      }))
    )
  );
}

function normalizeBatch(batch) {
  const normalizedOrders = Array.isArray(batch.orders)
    ? batch.orders
        .map((order) => ({
          name: order.name || '-',
          gender: order.gender || '-',
          items: Array.isArray(order.items)
            ? order.items
                .map((item) => ({
                  type: item.type || '-',
                  size: item.size || '-',
                  color: resolveItemColor(item.type || '-', item.color || ''),
                  qty: Number(item.qty || 0),
                  status: ORDER_STATUSES.includes(item.status)
                    ? item.status
                    : batch.status || ORDER_STATUS_PENDING,
                  statusUpdatedAt:
                    item.statusUpdatedAt ||
                    batch.statusUpdatedAt ||
                    batch.submittedAt ||
                    new Date().toISOString(),
                }))
                .filter((item) => item.qty > 0)
            : [],
        }))
        .filter((order) => order.items.length)
    : [];

  const allItems = normalizedOrders.flatMap((o) => o.items);
  let batchStatus = batch.status || ORDER_STATUS_PENDING;
  if (allItems.length > 0) {
    const uniqueStatuses = new Set(allItems.map((i) => i.status));
    if (uniqueStatuses.size === 1) {
      batchStatus = Array.from(uniqueStatuses)[0];
    } else if (uniqueStatuses.has(ORDER_STATUS_DELIVERED)) {
      batchStatus = 'จัดส่งบางส่วน (รอของ)';
    } else if (uniqueStatuses.has(ORDER_STATUS_BACKORDER)) {
      batchStatus = ORDER_STATUS_BACKORDER;
    } else {
      batchStatus = ORDER_STATUS_PENDING;
    }
  }

  return {
    batchId: batch.batchId || `ORD-${Date.now()}`,
    companyName: batch.companyName || '',
    branch: batch.branch || '-',
    supervisorName: batch.supervisorName || '',
    supervisorPhone: batch.supervisorPhone || '',
    submittedAt: batch.submittedAt || new Date().toISOString(),
    status: batchStatus,
    statusUpdatedAt: batch.statusUpdatedAt || batch.submittedAt || new Date().toISOString(),
    orders: normalizedOrders,
  };
}

function buildOrderSummaryRows(employees) {
  return employees.flatMap((employee) =>
    employee.items
      .filter((item) => item.size)
      .map((item) => ({
        id: `${employee.id}-${item.type}-${resolveItemColor(item.type, item.color || '')}`,
        name: employee.name || '-',
        type: item.type,
        size: item.size === OTHER_SIZE ? item.customSize || '-' : item.size,
        color: resolveItemColor(item.type, item.color || ''),
        qty: Number(item.qty || 0),
      }))
  );
}

function isEmployeeComplete(employee) {
  return Boolean(
    employee.name.trim() &&
    employee.gender &&
    employee.items.length &&
    employee.items.every(
      (item) =>
        item.size &&
        Number(item.qty || 0) > 0 &&
        (!needsColorSelection(item.type) || resolveItemColor(item.type, item.color || '')) &&
        (item.size !== OTHER_SIZE || item.customSize.trim())
    )
  );
}

function getEmployeeMissingFields(employee) {
  const missing = [];
  if (!employee.name.trim()) missing.push('ชื่อ');
  if (!employee.gender) missing.push('เพศ');
  if (!employee.items.length) {
    missing.push('ประเภทเสื้อ');
    return missing;
  }

  if (employee.items.some((item) => !item.size)) missing.push('ไซส์');
  if (
    employee.items.some(
      (item) => needsColorSelection(item.type) && !resolveItemColor(item.type, item.color || '')
    )
  )
    missing.push('สี');
  if (employee.items.some((item) => Number(item.qty || 0) <= 0)) missing.push('จำนวน');
  if (employee.items.some((item) => item.size === OTHER_SIZE && !item.customSize.trim()))
    missing.push('ระบุไซส์เพิ่มเติม');
  return missing;
}

function hasEmployeeData(employee) {
  return Boolean(
    employee.name.trim() ||
    employee.gender ||
    employee.items.some(
      (item) => item.size || item.customSize.trim() || item.color || Number(item.qty || 0) > 0
    )
  );
}

function isGasConfigured() {
  return Boolean(APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('YOUR_SCRIPT_URL'));
}

function getDashboardLoadErrorDescription(error) {
  const message = String(error?.message || '');
  if (message.includes('not configured') || message.includes('YOUR_SCRIPT_URL')) {
    return 'ยังไม่ได้ตั้งค่า VITE_GAS_URL หรือ GAS_ADMIN_TOKEN สำหรับอ่านข้อมูลจริงจาก Google Sheets';
  }
  if (message.includes('Invalid dashboard data')) {
    return 'รูปแบบข้อมูลจาก Google Sheets ไม่ตรงกับที่ระบบต้องการ กรุณาตรวจ Apps Script';
  }
  if (message.includes('Timeout')) {
    return 'การเชื่อมต่อ Google Sheets หมดเวลา กรุณาลองโหลดใหม่อีกครั้ง';
  }
  return 'ระบบอ่านข้อมูลจาก Google Sheets ไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ';
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App render failed', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shadcn-theme min-h-screen bg-[#FAFAFA] px-4 py-8 text-[#09090B]">
          <div className="mx-auto max-w-lg rounded-2xl border border-[#FECACA] bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#B91C1C]">
              <AlertTriangle className="size-5" />
            </div>
            <h1 className="text-lg font-black text-[#071638]">หน้าจอมีข้อผิดพลาด</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
              ระบบไม่สามารถแสดงหน้านี้ได้ กรุณาโหลดหน้าใหม่อีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: null });
                  window.location.hash = '';
                }}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-[#002B5B] px-4 text-sm font-extrabold text-white"
              >
                กลับหน้าสั่งเบิก
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-extrabold text-[#44536A]"
              >
                โหลดใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function getRoute() {
  const hashRoute = window.location.hash.replace(/^#/, '');
  if (hashRoute) return hashRoute;
  if (window.location.pathname.endsWith('/order')) return '/order';
  if (window.location.pathname.endsWith('/dashboard')) return '/dashboard';
  return '/';
}

function App() {
  const [path, setPath] = useState(getRoute);
  const [configVersion, setConfigVersion] = useState(0);
  const gasConfigured = isGasConfigured();

  function navigate(pathname) {
    if (pathname.startsWith('#')) {
      window.location.hash = pathname.slice(1);
      setPath(getRoute());
    } else {
      window.history.pushState({}, '', pathname);
      setPath(getRoute());
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    const onPopState = () => setPath(getRoute());
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  useEffect(() => {
    loadSharedClothingConfig()
      .then((config) => {
        if (config) setConfigVersion((version) => version + 1);
      })
      .catch(() => {});
  }, []);

  const isDashboard = path === '/dashboard';

  return (
    <div className="app-shadcn-theme min-h-screen w-full overflow-x-hidden bg-[#FAFAFA] text-[#09090B]">
      {isDashboard ? (
        <DashboardApp
          key={`dashboard-${configVersion}`}
          onOpenOrder={() => navigate(ORDER_PATH)}
        />
      ) : (
        <QuickOrderApp
          key={`order-${configVersion}`}
          gasConfigured={gasConfigured}
          onOpenDashboard={() => navigate(DASHBOARD_PATH)}
        />
      )}
      <Toaster
        richColors
        closeButton
        position="top-center"
        toastOptions={{
          duration: 4200,
          classNames: {
            toast: 'gi-toast rounded-2xl border text-[14px] font-semibold',
            title: 'gi-toast-title font-extrabold',
            description: 'gi-toast-description font-semibold',
          },
        }}
      />
    </div>
  );
}

function QuickOrderApp({ gasConfigured, onOpenDashboard }) {
  const [sizeOpen, setSizeOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidEmployeeId, setInvalidEmployeeId] = useState('');
  const [query, setQuery] = useState('');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [mobileEmployeeId, setMobileEmployeeId] = useState('');
  const [editMode, setEditMode] = useState('full'); // 'full' or 'garments-only'
  const [editingCardId, setEditingCardId] = useState('');
  
  // Wizard and UI step states
  const [activeStep, setActiveStep] = useState(1);
  const [activeTab, setActiveTab] = useState('table'); // 'table', 'copy', 'excel'
  const [successData, setSuccessData] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);

  function handleEdit(id, mode = 'full') {
    setEditMode(mode);
    setMobileEmployeeId(id);
  }

  const [state, dispatch] = useReducer(orderReducer, undefined, createInitialOrderState);

  const isCompanyComplete = Boolean(
    state.companyName?.trim() &&
    state.branch &&
    state.supervisorName?.trim() &&
    state.supervisorPhone?.length === PHONE_LENGTH
  );

  const summaryRows = useMemo(() => buildOrderSummaryRows(state.employees), [state.employees]);
  const totalPieces = summaryRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const completedEmployees = useMemo(
    () => state.employees.filter(isEmployeeComplete).length,
    [state.employees]
  );
  const firstIncompleteEmployee = useMemo(
    () => state.employees.find((employee) => !isEmployeeComplete(employee)) || null,
    [state.employees]
  );
  const selectedMobileEmployee =
    state.employees.find((employee) => employee.id === mobileEmployeeId) || null;

  useEffect(() => {
    if (activeTab === 'copy') {
      setActiveTab('table');
    }
  }, [activeTab]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
        const stepNum = parseInt(e.key, 10);
        if (stepNum === 1) {
          setActiveStep(1);
          toast.info('ไปยังขั้นตอนที่ 1: ข้อมูลผู้เบิก');
        } else if (stepNum === 2) {
          if (validateCompany()) {
            setActiveStep(2);
            toast.info('ไปยังขั้นตอนที่ 2: รายการเสื้อพนักงาน');
          }
        } else if (stepNum === 3) {
          if (validateCompany() && validateEmployees()) {
            setActiveStep(3);
            toast.info('ไปยังขั้นตอนที่ 3: ตรวจสอบและส่ง');
          }
        }
      }

      if (e.altKey && e.key === 'ArrowRight') {
        if (activeStep === 1) {
          if (validateCompany()) {
            setActiveStep(2);
          toast.info('ไปยังขั้นตอนที่ 2: รายการเสื้อพนักงาน');
          }
        } else if (activeStep === 2) {
          if (validateCompany() && validateEmployees()) {
            setActiveStep(3);
          toast.info('ไปยังขั้นตอนที่ 3: ตรวจสอบและส่ง');
          }
        }
      } else if (e.altKey && e.key === 'ArrowLeft') {
        if (activeStep === 2) {
          setActiveStep(1);
          toast.info('ไปยังขั้นตอนที่ 1: ข้อมูลผู้เบิก');
        } else if (activeStep === 3) {
          setActiveStep(2);
          toast.info('ไปยังขั้นตอนที่ 2: รายการเสื้อพนักงาน');
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, state.companyName, state.branch, state.supervisorName, state.supervisorPhone, state.employees]);

  useEffect(() => {
    const invalidEmployee = state.employees.find((employee) => employee.id === invalidEmployeeId);
    if (invalidEmployeeId && invalidEmployee && isEmployeeComplete(invalidEmployee))
      setInvalidEmployeeId('');
  }, [invalidEmployeeId, state.employees]);

  function validateCompany() {
    if (!state.companyName.trim()) {
      toast.error('ยังไม่ได้ระบุบริษัท', { description: 'กรุณาระบุชื่อบริษัท/หน่วยงานของคุณ' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (!state.branch) {
      toast.error('ยังไม่ได้เลือกสาขา', { description: 'โปรดเลือกสาขาที่จะจัดส่งเสื้อ' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (!state.supervisorName.trim()) {
      toast.error('ยังไม่ได้ระบุผู้รับผิดชอบ', {
        description: 'กรุณาระบุชื่อ-นามสกุลของผู้รับผิดชอบสั่งซื้อ',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (!state.supervisorPhone.trim()) {
      toast.error('ยังไม่ได้ระบุเบอร์ติดต่อ', {
        description: 'กรุณาระบุเบอร์โทรศัพท์มือถือของผู้รับผิดชอบ',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (state.supervisorPhone.length !== PHONE_LENGTH) {
      toast.error('เบอร์โทรศัพท์ไม่ถูกต้อง', {
        description: `กรุณากรอกตัวเลขทั้งหมด ${PHONE_LENGTH} หลัก (เช่น 08XXXXXXXX)`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    return true;
  }

  function jumpToEmployee(employeeId) {
    setInvalidEmployeeId(employeeId);
    if (window.innerWidth < 1024) {
      setEditingCardId(employeeId);
    }
    window.setTimeout(() => {
      const target = document.querySelector(
        `[data-quick-employee-row="${employeeId}"], [data-quick-employee-card="${employeeId}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const employee = state.employees.find((emp) => emp.id === employeeId);
        if (employee) {
          let focused = false;

          if (!employee.name.trim()) {
            target
              .querySelector("input[placeholder='ชื่อ-นามสกุล']")
              ?.focus({ preventScroll: true });
            focused = true;
          }

          if (!focused && !employee.gender) {
            target.querySelector("select")?.focus({ preventScroll: true });
            focused = true;
          }

          if (!focused) {
            for (const item of employee.items) {
              const sizeEmpty = !item.size;
              const qtyInvalid = Number(item.qty || 0) <= 0;
              const customSizeEmpty = item.size === OTHER_SIZE && !item.customSize.trim();

              if (sizeEmpty || qtyInvalid || customSizeEmpty) {
                const typeSelect = Array.from(target.querySelectorAll('select')).find(
                  (sel) => sel.value === item.type
                );
                const garmentContainer = typeSelect ? typeSelect.closest('div') : null;
                
                if (garmentContainer) {
                  if (sizeEmpty) {
                    const selects = garmentContainer.querySelectorAll("select");
                    selects[1]?.focus({ preventScroll: true });
                  } else if (qtyInvalid) {
                    garmentContainer
                      .querySelector("input[type='number']")
                      ?.focus({ preventScroll: true });
                  } else if (customSizeEmpty) {
                    garmentContainer
                      .querySelector("input[placeholder='ระบุไซส์เพิ่มเติม']")
                      ?.focus({ preventScroll: true });
                  }
                  focused = true;
                  break;
                }
              }
            }
          }

          if (!focused) {
            target
              .querySelector("input:not([type='checkbox']), select, button")
              ?.focus({ preventScroll: true });
          }
        }
      }
    }, 100);
  }

  function validateEmployees() {
    const invalidEmployee = state.employees.find((employee) => !isEmployeeComplete(employee));
    if (invalidEmployee) {
      const index = state.employees.findIndex((employee) => employee.id === invalidEmployee.id) + 1;
      const missing = getEmployeeMissingFields(invalidEmployee).join(', ');
      toast.error(`พนักงานลำดับที่ ${index} ยังไม่ครบถ้วน`, { description: `ขาด: ${missing}` });
      jumpToEmployee(invalidEmployee.id);
      return false;
    }
    setInvalidEmployeeId('');
    return true;
  }

  function openSummary() {
    if (!validateCompany() || !validateEmployees()) return;
    if (!gasConfigured) {
      toast.error('ระบบบันทึกคำสั่งเบิกเสื้อยังไม่พร้อม', {
        description: 'กรุณาติดต่อผู้ดูแลระบบก่อนส่งคำสั่งเบิกเสื้อ',
      });
      return;
    }
    setSummaryOpen(true);
  }

  async function submitOrder() {
    const payload = {
      batchId: `ORD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-5)}`,
      companyName: state.companyName,
      branch: state.branch,
      supervisorName: state.supervisorName,
      supervisorPhone: state.supervisorPhone,
      submittedAt: new Date().toISOString(),
      status: ORDER_STATUS_PENDING,
      statusUpdatedAt: new Date().toISOString(),
      orders: state.employees.map(({ name, gender, items }) => ({
        name,
        gender,
        items: items
          .filter((item) => item.size)
          .map((item) => ({
            type: item.type,
            size: item.size === OTHER_SIZE ? item.customSize || '-' : item.size,
            qty: Number(item.qty || 0),
          })),
      })),
    };

    setIsSubmitting(true);
    const loadingToastId = toast.loading('กำลังส่งคำสั่งเบิกเสื้อ...', {
      description: 'ระบบกำลังบันทึกคำสั่ง กรุณารอสักครู่',
    });
    try {
      const postToGAS = async (data, attempts = 2, timeoutMs = 15000) => {
        let lastErr = null;
        for (let i = 0; i < attempts; i++) {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const res = await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json;charset=utf-8' },
              body: JSON.stringify(data),
              signal: controller.signal,
            });
            clearTimeout(id);
            const json = await res.json().catch(() => null);
            if (!res.ok || json?.success === false) throw new Error(json?.error || 'GAS request failed');
            return json;
          } catch (err) {
            lastErr = err;
            // small backoff before retry
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        }
        throw lastErr;
      };

      await postToGAS(payload);
      toast.success('บันทึกคำสั่งเบิกเสื้อแล้ว', { id: loadingToastId });
      setSuccessData(payload); // Save success data for the Success Screen
      setQuery('');
      setShowIncompleteOnly(false);
      setMobileEmployeeId('');
      setEditingCardId('');
    } catch {
      toast.error('ส่งคำสั่งเบิกเสื้อไม่สำเร็จ', {
        id: loadingToastId,
        description: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Wizard Data Helpers
  const employeesByGarmentType = useMemo(() => {
    const groups = {};
    state.employees.forEach((emp) => {
      emp.items.forEach((item) => {
        if (!item.size) return;
        if (!groups[item.type]) {
          groups[item.type] = [];
        }
        groups[item.type].push({ employee: emp, size: item.size, qty: Number(item.qty || 0) });
      });
    });
    return groups;
  }, [state.employees]);

  const garmentSizeBreakdowns = useMemo(() => {
    const breakdowns = {};
    state.employees.forEach((emp) => {
      emp.items.forEach((item) => {
        if (!item.size) return;
        if (!breakdowns[item.type]) {
          breakdowns[item.type] = {};
        }
        breakdowns[item.type][item.size] = (breakdowns[item.type][item.size] || 0) + Number(item.qty || 0);
      });
    });
    return breakdowns;
  }, [state.employees]);

  // CSV Template and Import Helpers
  function downloadCsvTemplate() {
    const csvContent = "\ufeff" + [
      ['ชื่อ-นามสกุล', 'เพศ', 'แบบเสื้อ', 'ไซส์', 'จำนวน'],
      ['สมชาย ดีใจ', 'ชาย', 'เสื้อโปโล', 'L', '2'],
      ['สมหญิง รักดี', 'หญิง', 'เสื้อโปโล', 'M', '1'],
      ['วิชัย มั่นคง', 'ชาย', 'เสื้อแจ็คเก็ต', 'XL', '1'],
    ].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_เสื้อพนักงาน.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseCsvData(text);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function parseCsvData(text) {
    const lines = text.split(/\r?\n/);
    const parsed = [];
    const errors = [];
    const clothingTypes = getClothingTypes();

    let startIdx = 0;
    if (lines[0] && (lines[0].includes('ชื่อ') || lines[0].includes('name') || lines[0].includes('เพศ'))) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = [];
      let inQuotes = false;
      let current = '';
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());

      const name = cols[0] || '';
      const gender = cols[1] || '';
      const garmentType = cols[2] || '';
      const size = cols[3] || '';
      const qtyStr = cols[4] || '1';
      const qty = parseInt(digitsOnly(qtyStr), 10) || 1;

      const rowNum = i + 1;
      const rowErrors = [];

      if (!name) rowErrors.push('ขาดชื่อพนักงาน');
      if (gender !== 'ชาย' && gender !== 'หญิง') rowErrors.push('เพศต้องระบุเป็น ชาย หรือ หญิง');
      if (garmentType && !clothingTypes.includes(garmentType)) {
        rowErrors.push(`ไม่รู้จักแบบเสื้อ "${garmentType}"`);
      }
      if (gender && garmentType && size) {
        const allowedSizes = getSizeOptions(garmentType, gender);
        if (!allowedSizes.includes(size)) {
          rowErrors.push(`ไซส์ ${size} ไม่มีสำหรับ ${garmentType} ({$gender})`);
        }
      }

      parsed.push({
        rowNum,
        name,
        gender,
        items: garmentType ? [{ type: garmentType, size, qty, color: '', customSize: '' }] : [],
        errors: rowErrors,
        isValid: rowErrors.length === 0,
      });

      if (rowErrors.length > 0) {
        errors.push(`แถวที่ ${rowNum}: ${rowErrors.join(', ')}`);
      }
    }

    setCsvPreview(parsed);
    setCsvErrors(errors);
    toast.info(`กรองไฟล์นำเข้าเรียบร้อย: พบทั้งหมด ${parsed.length} รายการ`);
  }

  function confirmImportCsv() {
    if (!csvPreview.length) return;
    const validRows = csvPreview.filter((row) => row.isValid);
    if (!validRows.length) {
      toast.error('ไม่พบรายการพนักงานที่สมบูรณ์สำหรับนำเข้า');
      return;
    }
    
    const newEmployees = validRows.map((row, idx) => ({
      id: crypto.randomUUID(),
      employeeId: '',
      name: row.name,
      gender: row.gender,
      expanded: idx === 0,
      items: row.items,
    }));
    
    const isFirstEmpty = state.employees.length === 1 && !state.employees[0].name.trim() && !state.employees[0].items.length;
    if (isFirstEmpty) {
      dispatch({ type: 'patchBatch', patch: { employees: newEmployees } });
    } else {
      dispatch({ type: 'patchBatch', patch: { employees: [...state.employees, ...newEmployees] } });
    }
    
    toast.success(`นำเข้ารายชื่อพนักงาน ${newEmployees.length} คนแล้ว`);
    setCsvPreview([]);
    setCsvErrors([]);
    setActiveTab('table');
  }

  return (
    <>
      <OrderHeader
        branch={state.branch}
        onSizeOpen={() => setSizeOpen(true)}
        onOpenDashboard={onOpenDashboard}
        onManualOpen={() => setManualOpen(true)}
      />

      {successData ? (
        <div className="mx-auto max-w-2xl bg-white border border-green-200 rounded-3xl p-6 sm:p-8 shadow-md text-center my-8">
          <div className="inline-flex size-20 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6 animate-pulse">
            <Check className="size-12" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#071638]">ส่งคำขอเบิกเสื้อเรียบร้อยแล้ว!</h2>
          <p className="text-sm font-semibold text-neutral-500 mt-2">ขอบคุณที่ทำรายการ คำขอเบิกได้รับการประมวลผลแล้ว</p>
          
          <div className="my-6 rounded-2xl bg-neutral-50 border border-neutral-100 p-4 text-left">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-3 mb-3">
              <span className="text-xs font-black text-neutral-400">เลขที่อ้างอิงคำขอเบิก:</span>
              <span className="font-extrabold text-sm sm:text-base text-[#002B5B] bg-[#EEF4FF] px-3 py-1 rounded-lg">{successData.batchId}</span>
            </div>
            
            <div className="grid gap-2 text-xs sm:text-sm font-bold text-neutral-700">
              <div className="flex justify-between"><span className="text-neutral-400 font-medium">บริษัท/หน่วยงาน:</span><span>{successData.companyName}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400 font-medium">สาขาจัดส่ง:</span><span>{successData.branch}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400 font-medium">ผู้ขอเบิก:</span><span>คุณ{successData.supervisorName}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400 font-medium">เบอร์ติดต่อ:</span><span>{formatPhone(successData.supervisorPhone)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400 font-medium">วันที่ทำรายการ:</span><span>{new Date(successData.submittedAt).toLocaleString('th-TH')}</span></div>
              <div className="flex justify-between border-t border-neutral-200 pt-2.5 mt-1 font-black text-[#071638]">
                <span>จำนวนเสื้อเบิกรวม:</span>
                <span className="text-[#002B5B]">{successData.orders.reduce((sum, order) => sum + order.items.reduce((s, it) => s + it.qty, 0), 0)} ตัว</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 px-5 py-3 font-extrabold transition shadow-xs cursor-pointer"
            >
              <Printer className="size-4" />
              <span>พิมพ์ใบคำขอเบิก (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                setActiveStep(1);
                dispatch({ type: 'reset' });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002B5B] text-white hover:bg-[#001f42] px-6 py-3 font-extrabold transition shadow-md cursor-pointer"
            >
              <span>เบิกเสื้อรายการใหม่</span>
            </button>
          </div>
        </div>
      ) : (
        <main className="relative z-10 mx-auto grid w-full max-w-[1280px] gap-4 px-3 pb-40 pt-3 sm:px-5">
          {!gasConfigured && <SetupWarning />}
          
          {/* Step Progress Bar */}
          <div className="mb-3">
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { number: 1, label: 'ข้อมูลผู้เบิก', desc: 'ผู้ติดต่อ & สถานที่จัดส่ง', icon: Users },
                { number: 2, label: 'รายการเสื้อพนักงาน', desc: 'ระบุรายชื่อและไซส์เสื้อ', icon: Shirt },
                { number: 3, label: 'ตรวจสอบและส่ง', desc: 'ตรวจสอบรายการก่อนส่ง', icon: ClipboardList }
              ].map((step) => {
                const isActive = activeStep === step.number;
                const isCompleted = activeStep > step.number;
                const StepIcon = step.icon;
                return (
                  <button
                    key={step.number}
                    type="button"
                    disabled={step.number > activeStep && !isCompanyComplete}
                    onClick={() => {
                      if (step.number === 1) setActiveStep(1);
                      else if (step.number === 2 && validateCompany()) setActiveStep(2);
                      else if (step.number === 3 && validateCompany() && validateEmployees()) setActiveStep(3);
                    }}
                    className={cn(
                      "relative flex min-h-16 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border p-2 text-center shadow-xs transition-all duration-300 md:min-h-[4.75rem] md:justify-start md:gap-3 md:p-3 md:text-left",
                      isCompleted 
                        ? "bg-white border-emerald-200 text-[#0F5132] hover:bg-emerald-50/40"
                        : isActive
                        ? "bg-[#F8FBFF] border-[#9DB7DD] text-[#0F2D52] shadow-sm shadow-[#1D4E89]/10"
                        : "bg-white border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:border-neutral-300"
                    )}
                  >
                    <div className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full font-bold transition-all duration-300 md:size-9 md:rounded-xl",
                      isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : isActive
                        ? "bg-[#E8F1FF] text-[#1D4E89]"
                        : "bg-neutral-100 text-neutral-400"
                    )}>
                      {isCompleted ? (
                        <Check className="size-5" />
                      ) : (
                        <>
                          <span className="text-sm font-black md:hidden">{step.number}</span>
                          <StepIcon className="hidden size-5 md:block" />
                        </>
                      )}
                    </div>
                    <div className="hidden min-w-0 flex-1 md:block">
                      <span className={cn(
                        "text-[10px] font-extrabold uppercase tracking-wider block leading-none",
                        isActive ? "text-[#3B6EA8]" : isCompleted ? "text-emerald-700" : "text-neutral-400"
                      )}>
                        ขั้นตอนที่ {step.number}
                      </span>
                      <h3 className={cn(
                        "text-sm font-black mt-1 leading-tight",
                        isActive ? "text-[#0F2D52]" : isCompleted ? "text-[#0F5132]" : "text-neutral-800"
                      )}>
                        {step.label}
                      </h3>
                      <p className={cn(
                        "text-[11px] font-semibold mt-0.5 truncate",
                        isActive ? "text-[#5D718C]" : isCompleted ? "text-emerald-700/80" : "text-neutral-400"
                      )}>
                        {step.desc}
                      </p>
                    </div>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-[#3B82C4] md:left-auto md:right-0 md:top-0 md:h-full md:w-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

           {/* Wizard Steps */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <QuickOrderSetupPanel state={state} dispatch={dispatch} forceExpand={true} />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
                <span className="hidden sm:block" />
                <button
                  type="button"
                  onClick={() => {
                    if (validateCompany()) {
                      setActiveStep(2);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#002B5B] text-white hover:bg-[#001f42] px-6 py-3 font-extrabold shadow-md transition active:scale-95 text-sm sm:text-base cursor-pointer"
                >
                  <span>ถัดไป: รายการเสื้อพนักงาน</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              {/* Collapsed Requester Summary */}
              <div className="rounded-xl border border-green-200 bg-green-50/20 p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-[#071638] flex items-center gap-1.5">
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">1</span>
                    ข้อมูลผู้ติดต่อ / ผู้เบิก
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-[#64748B] truncate">
                    {state.companyName} ({state.branch}) · คุณ{state.supervisorName} ({formatPhone(state.supervisorPhone)})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 text-xs font-black text-[#002B5B] transition shrink-0 cursor-pointer"
                >
                  <Edit3 className="size-3" />
                  <span>แก้ไข</span>
                </button>
              </div>

              {/* Step 2 Entry Tabs */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                {/* Tab Header Buttons */}
                <div className="flex border-b border-neutral-200 bg-[#f8fafc] p-2 gap-2">
                  {[
                    { id: 'table', label: 'รายชื่อพนักงาน', icon: Users },
                    { id: 'excel', label: 'นำเข้า CSV', icon: Upload }
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer border sm:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs",
                        activeTab === tab.id 
                          ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10" 
                          : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                      )}
                      >
                        <TabIcon className="size-4" />
                        <span>{tab.label}</span>
                    </button>
                  );
                })}
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-5">
                  {activeTab === 'table' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-[#071638]">รายชื่อพนักงานและเสื้อที่เบิก</h3>
                          <p className="text-xs text-neutral-500 font-semibold mt-0.5">กรอกชื่อพนักงาน เลือกเพศ และกดเครื่องหมาย + เพื่อเบิกเสื้อเพิ่มได้</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-[#CBD5E1] bg-white text-[#44536A] hover:bg-neutral-50 px-3 text-xs font-black transition shadow-xs cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            <span>เพิ่มพนักงานหลายคน</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newId = crypto.randomUUID();
                              dispatch({ type: 'add', id: newId });
                              if (window.innerWidth < 1024) {
                                setEditingCardId(newId);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#002B5B] text-white hover:bg-[#001f42] px-3.5 text-xs font-black transition shadow-xs cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            <span>เพิ่มแถว</span>
                          </button>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400">
                            <Search className="size-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="ค้นหารายชื่อพนักงาน..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-4 text-xs font-bold bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B] outline-none transition"
                          />
                        </div>
                        
                        <label className="flex items-center gap-2 text-xs font-bold text-neutral-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showIncompleteOnly}
                            onChange={(e) => setShowIncompleteOnly(e.target.checked)}
                            className="size-4 rounded border-neutral-300 accent-[#002B5B]"
                          />
                          <span>แสดงเฉพาะแถวที่ไม่ครบถ้วน ({state.employees.length - completedEmployees})</span>
                        </label>
                      </div>

                      <QuickEmployeeTable
                        employees={state.employees}
                        dispatch={dispatch}
                        query={query}
                        showIncompleteOnly={showIncompleteOnly}
                        invalidEmployeeId={invalidEmployeeId}
                      />
                      <QuickMobileList
                        employees={state.employees}
                        dispatch={dispatch}
                        query={query}
                        showIncompleteOnly={showIncompleteOnly}
                        invalidEmployeeId={invalidEmployeeId}
                        editingCardId={editingCardId}
                        setEditingCardId={setEditingCardId}
                      />
                    </div>
                  )}

                  {activeTab === 'copy' && (
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-neutral-100 flex justify-between items-center">
                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-[#071638]">คัดลอกรายชื่อ / เสื้อแบบรวดเร็ว</h3>
                          <p className="text-xs text-neutral-500 font-semibold mt-0.5">คัดลอกรายการพนักงานเป็นคนใหม่ และลบรายการตามสะดวก</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newId = crypto.randomUUID();
                            dispatch({ type: 'add', id: newId });
                            setEditingCardId(newId);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#002B5B] text-white hover:bg-[#001f42] px-3.5 text-xs font-black transition shadow-xs cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                          <span>เพิ่มแถวใหม่</span>
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                        {state.employees.map((employee, index) => {
                          const complete = isEmployeeComplete(employee);
                          const showErrors = hasEmployeeData(employee) || invalidEmployeeId === employee.id;
                          return (
                            <div 
                              key={employee.id} 
                              data-quick-employee-card={employee.id}
                              className={cn(
                                "p-4 rounded-xl border flex flex-col justify-between transition-all bg-white shadow-xs",
                                editingCardId === employee.id
                                  ? "border-[#002B5B] ring-2 ring-[#002B5B]/10"
                                  : complete 
                                    ? "border-neutral-200 hover:border-[#002B5B] cursor-pointer group hover:shadow-md" 
                                    : "border-yellow-300 bg-yellow-50/10 hover:border-[#002B5B] cursor-pointer group hover:shadow-md"
                              )}
                              onClick={() => {
                                if (editingCardId !== employee.id) {
                                  setEditingCardId(employee.id);
                                }
                              }}
                              title={editingCardId !== employee.id ? "คลิกเพื่อแก้ไขข้อมูลพนักงานคนนี้" : undefined}
                            >
                              {editingCardId === employee.id ? (
                                <div className="space-y-3 flex-1 flex flex-col justify-between animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <span className="text-xs font-black text-[#002B5B]">แก้ไขข้อมูล ลำดับที่ {index + 1}</span>
                                      <span className={cn(
                                        "rounded-full px-2 py-0.5 text-[10px] font-black",
                                        complete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                      )}>
                                         {complete ? "ครบ" : "ไม่ครบ"}
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      {/* Name input */}
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-black text-[#64748B]">ชื่อ-นามสกุล *</label>
                                        <TextInput
                                          value={employee.name}
                                          invalid={showErrors && !employee.name.trim()}
                                          onChange={(value) =>
                                            dispatch({ type: 'patchEmployee', id: employee.id, patch: { name: value } })
                                          }
                                          placeholder="เช่น สมชาย ใจดี"
                                        />
                                      </div>

                                      {/* Gender input */}
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-black text-[#64748B]">เพศ *</label>
                                        <div className="grid grid-cols-2 gap-2">
                                          {GENDERS.map((gender) => (
                                            <button
                                              key={gender}
                                              type="button"
                                              onClick={() =>
                                                dispatch({ type: 'patchEmployee', id: employee.id, patch: { gender } })
                                              }
                                              className={cn(
                                                'h-9 rounded-lg border text-xs font-bold transition active:scale-95 cursor-pointer',
                                                employee.gender === gender
                                                  ? 'border-[#002B5B] bg-[#002B5B] text-white font-extrabold shadow-xs'
                                                  : 'border-[#CBD5E1] bg-white text-[#071638] hover:border-[#002B5B]'
                                              )}
                                            >
                                              <span className="text-sm">{genderSymbol(gender)}</span> {gender}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Clothing items list */}
                                      <div className="space-y-2 pt-2 border-t border-neutral-100">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-black text-[#64748B]">เสื้อที่เบิก *</span>
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
                                                      type: nextType,
                                                      size: defaultSizeVal,
                                                      customSize: '',
                                                      color: '',
                                                      qty: 1,
                                                    },
                                                  ],
                                                },
                                              });
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-black text-[#002B5B] hover:text-[#001f42] cursor-pointer"
                                          >
                                            <Plus className="size-3" />
                                            <span>เพิ่มเสื้อ</span>
                                          </button>
                                        </div>

                                        {employee.items.length === 0 ? (
                                          <p className="text-xs text-neutral-400 italic">ไม่มีเสื้อ</p>
                                        ) : (
                                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                                            {employee.items.map((item, itemIdx) => {
                                              const sizeOptions = getSizeOptions(item.type, employee.gender);
                                              return (
                                                <div key={itemIdx} className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2 animate-fade-in">
                                                  <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 min-w-0">
                                                      <Select
                                                        value={item.type}
                                                        onChange={(val) =>
                                                          dispatch({
                                                            type: 'patchItem',
                                                            id: employee.id,
                                                            itemType: item.type,
                                                            patch: { type: val },
                                                          })
                                                        }
                                                        values={clothingTypes}
                                                        size="xs"
                                                        placeholder="เลือกแบบเสื้อ"
                                                      />
                                                    </div>
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
                                                      className="size-7 rounded border border-red-200 bg-red-50 text-[#B91C1C] hover:bg-red-100 hover:text-red-700 transition shrink-0 flex items-center justify-center cursor-pointer"
                                                      title="ลบเสื้อรายการนี้"
                                                    >
                                                      <X className="size-3.5" />
                                                    </button>
                                                  </div>

                                                  <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                      <Select
                                                        value={item.size}
                                                        disabled={!employee.gender}
                                                        onChange={(val) =>
                                                          dispatch({
                                                            type: 'patchItem',
                                                            id: employee.id,
                                                            itemType: item.type,
                                                            patch: { size: val },
                                                          })
                                                        }
                                                        invalid={showErrors && !item.size}
                                                        values={sizeOptions}
                                                        size="xs"
                                                        placeholder={employee.gender ? 'ไซส์' : 'เพศ'}
                                                      />
                                                    </div>
                                                    <input
                                                      type="number"
                                                      value={item.qty}
                                                      onChange={(e) =>
                                                        dispatch({
                                                          type: 'patchItem',
                                                          id: employee.id,
                                                          itemType: item.type,
                                                          patch: { qty: digitsOnly(e.target.value) },
                                                        })
                                                      }
                                                      className="w-14 h-7 border border-neutral-300 rounded text-center font-bold text-xs focus:border-[#002B5B] outline-none shrink-0"
                                                      min="1"
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCardId('')}
                                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#002B5B] text-white hover:bg-[#001f42] text-xs font-extrabold transition cursor-pointer shadow-xs"
                                    >
                                      <Check className="size-3.5" />
                                      <span>เสร็จสิ้น</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col justify-between flex-1">
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-xs font-bold text-[#64748B]">ลำดับที่ {index + 1}</span>
                                      <span className={cn(
                                        "rounded-full px-2 py-0.5 text-[10px] font-black",
                                        complete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                      )}>
                                         {complete ? "ครบ" : "ไม่ครบ"}
                                      </span>
                                    </div>
                                    <h4 className="font-extrabold text-sm text-[#071638] mt-1.5 truncate group-hover:text-[#002B5B] transition-colors flex items-center gap-1.5">
                                      <span>{employee.name || <span className="text-neutral-400 italic">ไม่มีชื่อ</span>}</span>
                                      <Pencil className="size-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </h4>
                                    <p className="text-xs font-bold text-neutral-500 mt-0.5">เพศ: {employee.gender || '-'}</p>
                                    
                                    <div className="mt-3 space-y-1">
                                      <span className="text-[11px] font-black text-neutral-400">เสื้อที่เบิก:</span>
                                      {employee.items.length === 0 ? (
                                        <p className="text-xs text-neutral-400 italic">ไม่มีเสื้อ</p>
                                      ) : (
                                        employee.items.map((item, itemIdx) => (
                                          <div key={itemIdx} className="text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-100 rounded px-2 py-1 flex items-center justify-between animate-fade-in">
                                            <span className="truncate">{item.type}</span>
                                            <span className="shrink-0 text-[#002B5B] ml-2 font-black">ไซส์ {item.size} x {item.qty} ตัว</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCardId(employee.id);
                                      }}
                                      className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-lg border border-[#CBD5E1] bg-white text-[#002B5B] hover:bg-[#002B5B]/5 text-xs font-extrabold transition cursor-pointer"
                                    >
                                      <Pencil className="size-3.5" />
                                      <span>แก้ไข</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch({ type: 'cloneEmployee', id: employee.id });
                                      }}
                                      className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-lg border border-[#CBD5E1] bg-white text-[#44536A] hover:bg-neutral-50 text-xs font-extrabold transition cursor-pointer"
                                    >
                                      <Copy className="size-3.5" />
                                      <span>คัดลอก</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={state.employees.length <= 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch({ type: 'delete', id: employee.id });
                                      }}
                                      className="grid size-9 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50 transition hover:bg-[#FFE2E2] cursor-pointer"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'excel' && (
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-neutral-100">
                        <h3 className="text-sm sm:text-base font-extrabold text-[#071638]">นำเข้าข้อมูลจาก Excel / CSV</h3>
                        <p className="text-xs text-neutral-500 font-semibold mt-0.5">ดาวน์โหลดไฟล์ตัวอย่าง กรอกข้อมูลพนักงานแล้วอัปโหลดกลับเข้าระบบ</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-[#071638]">1. ดาวน์โหลดเทมเพลตไฟล์</h4>
                            <p className="text-xs font-semibold text-neutral-500 mt-1 leading-5">นำตารางไปกรอกรายชื่อผู้เบิกเสื้อ เพื่อประหยัดเวลาการพิมพ์ในระบบทีละแถว</p>
                          </div>
                          <button
                            type="button"
                            onClick={downloadCsvTemplate}
                            className="mt-4 inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-[#002B5B] text-[#002B5B] hover:bg-[#002B5B]/5 text-xs font-extrabold transition shadow-xs cursor-pointer"
                          >
                            <Download className="size-4" />
                            <span>ดาวน์โหลดเทมเพลต CSV</span>
                          </button>
                        </div>
                        
                        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-[#071638]">2. อัปโหลดและนำเข้าข้อมูล</h4>
                            <p className="text-xs font-semibold text-neutral-500 mt-1 leading-5">อัปโหลดไฟล์ตารางพนักงานของคุณเพื่อแสดงผลการกรองและนำเข้าตารางหลัก</p>
                          </div>
                          <label className="mt-4 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-[#002B5B] text-white hover:bg-[#001f42] text-xs font-extrabold cursor-pointer transition shadow-xs">
                            <Upload className="size-4" />
                            <span>เลือกไฟล์อัปโหลด (.csv)</span>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleCsvUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Preview CSV */}
                      {csvPreview.length > 0 && (
                        <div className="mt-4 border border-[#CBD5E1] rounded-xl overflow-hidden shadow-xs">
                          <div className="bg-[#EEF4FF] px-4 py-3 border-b border-[#CBD5E1] flex justify-between items-center">
                            <span className="text-xs sm:text-sm font-extrabold text-[#44536A]">ตัวอย่างข้อมูลนำเข้า ({csvPreview.length} รายการ)</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCsvPreview([]);
                                  setCsvErrors([]);
                                }}
                                className="h-8 px-3 rounded-lg border border-neutral-300 text-neutral-600 bg-white hover:bg-neutral-50 text-xs font-bold transition cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                onClick={confirmImportCsv}
                                className="h-8 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition cursor-pointer"
                              >
                                ยืนยันนำเข้า
                              </button>
                            </div>
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-neutral-100 text-neutral-600 uppercase sticky top-0 font-extrabold">
                                <tr>
                                  <th className="px-3 py-2 border-b border-[#CBD5E1] w-12 text-center">แถว</th>
                                  <th className="px-3 py-2 border-b border-[#CBD5E1] w-1/4">ชื่อ-นามสกุล</th>
                                  <th className="px-3 py-2 border-b border-[#CBD5E1] w-16">เพศ</th>
                                  <th className="px-3 py-2 border-b border-[#CBD5E1]">เสื้อที่เบิก</th>
                                  <th className="px-3 py-2 border-b border-[#CBD5E1] w-1/3">ตรวจสอบ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {csvPreview.map((row) => (
                                  <tr key={row.rowNum} className={cn("hover:bg-neutral-50", row.isValid ? "bg-white" : "bg-red-50/40")}>
                                    <td className="px-3 py-2 border-b border-[#E2E8F0] text-center font-bold text-[#64748B]">{row.rowNum}</td>
                                    <td className="px-3 py-2 border-b border-[#E2E8F0] font-bold text-neutral-800">{row.name}</td>
                                    <td className="px-3 py-2 border-b border-[#E2E8F0] text-neutral-600">{row.gender}</td>
                                    <td className="px-3 py-2 border-b border-[#E2E8F0] text-neutral-700">
                                      {row.items.map((item, idx) => (
                                        <span key={idx} className="inline-block bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1">
                                          {item.type} {item.size ? `ไซส์ ${item.size}` : ''} x {item.qty} ตัว
                                        </span>
                                      ))}
                                    </td>
                                    <td className="px-3 py-2 border-b border-[#E2E8F0]">
                                      {row.isValid ? (
                                        <span className="text-green-600 font-extrabold">✓ ถูกต้อง</span>
                                      ) : (
                                        <span className="text-red-500 font-bold block">{row.errors.join(', ')}</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Footer Step 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 pt-4 bg-white p-4 rounded-xl shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-5 py-2.5 font-bold transition cursor-pointer"
                  >
                    <ArrowLeft className="size-4" />
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                
                <div className="flex w-full sm:w-auto gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (validateCompany() && validateEmployees()) {
                        setActiveStep(3);
                      }
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-[#002B5B] text-white hover:bg-[#001f42] px-6 py-2.5 font-extrabold transition shadow-md active:scale-95 cursor-pointer"
                  >
                    <span>ถัดไป: ตรวจสอบและส่ง</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              {/* Collapsed Requester Info */}
              <div className="rounded-xl border border-green-200 bg-green-50/20 p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-[#071638] flex items-center gap-1.5">
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">1</span>
                    ข้อมูลผู้ติดต่อ / ผู้เบิก
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-[#64748B] truncate">
                    {state.companyName} ({state.branch}) · คุณ{state.supervisorName} ({formatPhone(state.supervisorPhone)})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 text-xs font-black text-[#002B5B] transition shrink-0 cursor-pointer"
                >
                  <Edit3 className="size-3" />
                  <span>แก้ไข</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {[
                  { title: 'พนักงานเบิกเสื้อ', value: `${state.employees.length} คน` },
                  { title: 'จำนวนรวมทั้งหมด', value: `${totalPieces} ตัว` },
                  { title: 'ประเภทเสื้อที่เบิก', value: `${Object.keys(garmentSizeBreakdowns).length} แบบ` },
                  { title: 'วันที่ทำรายการ', value: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }
                ].map((stat, idx) => (
                  <div key={idx} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
                    <p className="text-xs font-bold text-neutral-400">{stat.title}</p>
                    <p className="text-lg sm:text-xl font-black text-[#002B5B] mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Breakdown sorted by clothing types */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#071638] sm:text-base">
                  <ClipboardList className="size-4 text-[#0A2A5E]" />
                  จำแนกรายการขอเบิกตามประเภทเสื้อ
                </h3>
                <div className="space-y-4">
                  {Object.entries(employeesByGarmentType).map(([type, list]) => (
                    <div key={type} className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                      <div className="bg-[#EEF4FF] px-4 py-2.5 border-b border-neutral-200 flex justify-between items-center">
                        <span className="font-extrabold text-sm text-[#071638]">{type}</span>
                        <span className="bg-[#002B5B] text-white px-2.5 py-0.5 rounded-full text-xs font-black">
                          รวม {list.reduce((sum, item) => sum + item.qty, 0)} ตัว
                        </span>
                      </div>
                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-neutral-50 text-neutral-500 font-extrabold border-b border-neutral-200 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 w-12 text-center">#</th>
                              <th className="px-4 py-2">ชื่อพนักงาน</th>
                              <th className="px-4 py-2">เพศ</th>
                              <th className="px-4 py-2">ไซส์</th>
                              <th className="px-4 py-2 text-center">จำนวน</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((item, idx) => (
                                <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                                  <td className="px-4 py-2 text-center text-neutral-400">{idx + 1}</td>
                                  <td className="px-4 py-2 font-bold text-neutral-800">{item.employee.name}</td>
                                  <td className="px-4 py-2 text-neutral-500">{item.employee.gender}</td>
                                  <td className="px-4 py-2 font-bold text-neutral-700">{item.size}</td>
                                  <td className="px-4 py-2 text-center font-bold text-[#002B5B]">{item.qty} ตัว</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Size summary cards */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#071638] sm:text-base">
                  <Ruler className="size-4 text-[#0A2A5E]" />
                  สรุปไซส์ที่เบิกต่อประเภทเสื้อ
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(garmentSizeBreakdowns).map(([type, sizes]) => (
                    <div key={type} className="p-3 border border-neutral-200 rounded-xl bg-neutral-50/40">
                      <h4 className="font-extrabold text-xs text-[#002B5B] mb-2">{type}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(sizes).map(([size, qty]) => (
                          <span key={size} className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-black shadow-3xs">
                            <span className="text-neutral-500">ไซส์ {size}:</span>
                            <span className="text-[#002B5B] font-extrabold">{qty} ตัว</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Footer Step 3 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 pt-4 bg-white p-4 rounded-xl shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setActiveStep(2)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-5 py-2.5 font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowLeft className="size-4" />
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                
                <button
                  type="button"
                  disabled={isSubmitting || !gasConfigured}
                  onClick={submitOrder}
                  className={cn(
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 font-extrabold text-white transition shadow-md active:scale-95 text-base cursor-pointer",
                    (gasConfigured && !isSubmitting)
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-neutral-300 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin size-4 mr-2" />
                      <span>กำลังส่งคำขอเบิก...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>ส่งคำขอเบิกเสื้อ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Editor & dialog boxes */}
      <QuickMobileEditor
        employee={selectedMobileEmployee}
        employees={state.employees}
        dispatch={dispatch}
        editMode={editMode}
        onClose={() => setMobileEmployeeId('')}
        onNext={(employeeId) => handleEdit(employeeId, editMode)}
        invalidEmployeeId={invalidEmployeeId}
      />
      <QuickOrderDialog open={quickOpen} setOpen={setQuickOpen} state={state} dispatch={dispatch} />
      <SizeReference open={sizeOpen} setOpen={setSizeOpen} />
      <UserManualDialog open={manualOpen} setOpen={setManualOpen} />
    </>
  );
}

function SetupWarning() {
  return (
    <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3 shadow-sm animate-fade-in">
      <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-extrabold text-yellow-800">ระบบบันทึกคำสั่งเบิกเสื้อยังไม่พร้อมใช้งาน</h4>
        <p className="text-xs text-yellow-700 font-semibold mt-1 leading-5">
          กรุณาตั้งค่าลิงก์ Web App URL ของ Google Apps Script ในไฟล์ .env (`VITE_GAS_URL`) ก่อนส่งคำขอเบิกเสื้อ
        </p>
      </div>
    </div>
  );
}

function QuickOrderSetupPanel({ state, dispatch, forceExpand = false }) {
  const complete = Boolean(
    state.companyName.trim() &&
    state.branch &&
    state.supervisorName.trim() &&
    state.supervisorPhone.length === PHONE_LENGTH
  );

  const [isExpandedLocal, setIsExpandedLocal] = useState(!complete);
  const prevCompleteRef = useRef(complete);

  useEffect(() => {
    if (complete && !prevCompleteRef.current) {
      setIsExpandedLocal(false);
    } else if (!complete && prevCompleteRef.current) {
      setIsExpandedLocal(true);
    }
    prevCompleteRef.current = complete;
  }, [complete]);

  const isExpanded = forceExpand ? true : isExpandedLocal;

  return (
    <section
      data-section="contact-info"
      className={cn(
        'flex flex-col rounded-xl border bg-white p-4 sm:p-5 transition-all duration-300 shadow-sm w-full',
        complete
          ? 'border-green-200 bg-green-50/20'
          : 'border-2 border-yellow-300 bg-yellow-50/20 shadow-md'
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 select-none",
          !forceExpand && "cursor-pointer"
        )}
        onClick={() => !forceExpand && setIsExpandedLocal(!isExpandedLocal)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-base font-black text-[#071638]">
              <ClipboardList className="size-4 text-[#0A2A5E]" />
              ข้อมูลผู้ติดต่อ / ผู้เบิก
            </h2>
            {complete ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#166534]">
                <Check className="size-3" /> ครบถ้วน
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800 animate-pulse">
                <AlertTriangle className="size-3" /> ยังไม่ครบ
              </span>
            )}
          </div>
          {!isExpanded && complete && (
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#64748B] truncate">
              {state.companyName} ({state.branch}) · คุณ{state.supervisorName} ({formatPhone(state.supervisorPhone)})
            </p>
          )}
          {isExpanded && (
            <p className="mt-1.5 text-[13px] font-semibold leading-5 text-[#52525B]">
              {complete
                ? 'ข้อมูลผู้เบิกครบแล้ว สามารถกดซ่อนเพื่อประหยัดพื้นที่หน้าจอ'
                : 'กรุณากรอกข้อมูลให้ครบทั้ง 4 ช่อง เพื่อเตรียมการจัดส่ง'}
            </p>
          )}
        </div>
        {!forceExpand && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 text-xs font-black text-[#002B5B] transition shrink-0"
          >
            <span>{isExpanded ? 'ย่อไว้' : 'แก้ไขข้อมูล'}</span>
            <ChevronDown className={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:[&>*]:min-w-0 mt-4 border-t border-neutral-100 pt-4">
          <Field label="บริษัท / หน่วยงาน *">
            <TextInput
              id="setup-company-name"
              value={state.companyName}
              onChange={(value) => dispatch({ type: 'patchBatch', patch: { companyName: value } })}
              placeholder="ชื่อบริษัท / สำนักงาน"
              title="ระบุชื่อบริษัทหรือหน่วยงานของคุณ"
            />
          </Field>
          <Field label="สาขาที่จัดส่ง *">
            <Select
              id="setup-branch"
              value={state.branch}
              onChange={(value) => dispatch({ type: 'patchBatch', patch: { branch: value } })}
              values={BRANCHES}
              placeholder="เลือกสาขา"
            />
          </Field>
          <Field label="ชื่อผู้รับผิดชอบ *">
            <TextInput
              id="setup-supervisor-name"
              value={state.supervisorName}
              onChange={(value) => dispatch({ type: 'patchBatch', patch: { supervisorName: value } })}
              placeholder="ชื่อ-นามสกุล"
              title="ชื่อบุคคลที่เป็นผู้รับผิดชอบสั่งซื้อเสื้อ"
            />
          </Field>
          <Field label="เบอร์ติดต่อ *">
            <TextInput
              id="setup-supervisor-phone"
              value={state.supervisorPhone}
              onChange={(value) =>
                dispatch({ type: 'patchBatch', patch: { supervisorPhone: phoneDigitsOnly(value) } })
              }
              placeholder="08X-XXX-XXXX"
              inputMode="numeric"
              pattern="[0-9]*"
              title="เบอร์โทรศัพท์มือถือ 10 หลัก"
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function QuickOrderDialog({ open, setOpen, state, dispatch }) {
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [namesText, setNamesText] = useState('');
  const [gender, setGender] = useState(GENDERS[0]);
  const [defaultSizeValue, setDefaultSizeValue] = useState('M');
  const clothingTypes = getClothingTypes();
  const [customItems, setCustomItems] = useState(() =>
    clothingTypes.map(() => ({ enabled: false, qty: '2' }))
  );
  const quickSizes = [
    'S',
    'M',
    'L',
    'XL',
    '2XL',
    '3XL',
    '4XL',
    '5XL',
    '28',
    '30',
    '32',
    '34',
    '36',
    '38',
    '40',
    '42',
    '44',
  ];
  const names = namesText
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  useEffect(() => {
    setCustomItems((items) =>
      clothingTypes.map((type, index) => {
        const current = items[index] || {};
        return {
          enabled: Boolean(current.enabled),
          qty: current.qty || '2',
        };
      })
    );
  }, [clothingTypes.join('|')]);

  function applyQuickOrder() {
    if (!names.length) {
      toast.error('ยังไม่มีรายชื่อพนักงาน', {
        description: 'โปรดวางรายชื่อพนักงานอย่างน้อย 1 คน (หนึ่งชื่อต่อบรรทัด)',
      });
      return;
    }
    const hasExistingData = state.employees.some(hasEmployeeData);
    if (hasExistingData) {
      setReplaceConfirmOpen(true);
      return;
    }
    applyQuickOrderNow();
  }

  function applyQuickOrderNow() {
    dispatch({
      type: 'applyQuickOrder',
      names,
      quickOrder: { gender, defaultSizeValue, customItems },
    });
    setNamesText('');
    setReplaceConfirmOpen(false);
    setOpen(false);
    toast.success(`เพิ่มรายชื่อพนักงาน ${names.length} คนเรียบร้อยแล้ว`);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(54rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="flex items-center justify-between border-b border-[#E7EAF0] px-4 py-3">
              <div className="min-w-0">
                <Dialog.Title className="flex items-center gap-2 text-lg font-extrabold text-[#071638]">
                  <UserPlus className="size-5 text-[#0A2A5E]" /> เพิ่มพนักงานหลายคน
                </Dialog.Title>
                <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                  วางรายชื่อและตั้งชุดเสื้อตั้งต้นเพื่อใช้ได้ทันที
                </p>
              </div>
              <Dialog.Close
                className="grid size-9 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]"
                aria-label="ปิด"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="employee-scroll-region max-h-[calc(88vh-4.5rem)] overflow-y-auto p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-[#071638]">
                    <Users className="size-4 text-[#0A2A5E]" /> รายชื่อพนักงาน
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-[#64748B]">หนึ่งชื่อต่อบรรทัด</p>
                </div>
                <span className="rounded-md bg-[#EEF4FF] px-2.5 py-1 text-xs font-black text-[#002B5B]">
                  {names.length} คน
                </span>
              </div>
              <Field label="รายชื่อพนักงาน">
                <TextArea
                  value={namesText}
                  onChange={setNamesText}
                  placeholder={'วันท์ สวนศักดิ์\nคิม ชมภูดิน\nจีจี บัวสวรรค์\nเพิ่มเติม...'}
                  title="วางรายชื่อพนักงานหนึ่งชื่อในแต่ละบรรทัด"
                  rows={6}
                />
              </Field>

              <div className="mt-4 border-t border-[#E7EAF0] pt-4">
                <h2 className="flex items-center gap-2 text-base font-extrabold text-[#071638]">
                  <Ruler className="size-4 text-[#0A2A5E]" /> ชุดเสื้อตั้งต้น
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                  เลือกเพศ ไซส์ และประเภทเสื้อที่ต้องการให้ทุกคน
                </p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <Field label="เพศตั้งต้น">
                    <div className="grid grid-cols-2 gap-2">
                      {GENDERS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={cn(
                            'min-h-10 rounded-lg border font-bold transition',
                            gender === g
                              ? 'border-[#002B5B] bg-[#002B5B] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#071638]'
                          )}
                        >
                          <span className="text-base">{genderSymbol(g)}</span> {g}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="ไซส์ตั้งต้น">
                    <Select
                      value={defaultSizeValue}
                      values={quickSizes}
                      onChange={setDefaultSizeValue}
                      placeholder="เลือกไซส์"
                      usePortal={false}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-4 border-t border-[#E7EAF0] pt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-[#071638]">
                      <Shirt className="size-4 text-[#0A2A5E]" /> ประเภทเสื้อ
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                      เลือกแบบเสื้อและระบุจำนวน
                    </p>
                  </div>
                </div>
                <div className="grid max-h-[16rem] grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-2 overflow-y-auto rounded-xl border border-[#D8DEEA] bg-white p-2">
                  {clothingTypes.map((type, index) => {
                    return (
                      <div
                        key={type}
                        className={cn(
                          'grid gap-2 rounded-lg border p-2 text-sm font-bold text-[#071638] min-[460px]:grid-cols-[minmax(0,1fr)_5.25rem] min-[460px]:items-center',
                          customItems[index]?.enabled
                            ? 'border-[#BFD0EA] bg-[#F8FBFF]'
                            : 'border-[#EEF2F7] bg-white'
                        )}
                      >
                        <label className="flex min-h-11 min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(customItems[index]?.enabled)}
                            onChange={(event) =>
                              setCustomItems((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        enabled: event.target.checked,
                                      }
                                    : item
                                )
                              )
                            }
                            className="size-4 shrink-0 accent-[#002B5B]"
                          />
                          <span className="min-w-0 truncate">{type}</span>
                        </label>
                        <GridInput
                          type="number"
                          value={customItems[index]?.qty || '2'}
                          onChange={(value) =>
                            setCustomItems((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, qty: digitsOnly(value) } : item
                              )
                            )
                          }
                          inputMode="numeric"
                          disabled={!customItems[index]?.enabled}
                          placeholder="จำนวน"
                          title="ระบุจำนวนเสื้อที่ต้องการสั่งต่อคน"
                          className="text-center font-black"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={applyQuickOrder}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#002B5B] px-4 font-bold text-white transition hover:bg-[#013A78] active:scale-95"
              >
                <UserPlus /> ยืนยันเพิ่มเข้ารายการ
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={replaceConfirmOpen}
        title="แทนที่รายการเดิม"
        description="มีข้อมูลพนักงานเดิมอยู่แล้ว ต้องการแทนที่ด้วยรายชื่อชุดใหม่หรือไม่?"
        confirmLabel="แทนที่"
        cancelLabel="ยกเลิก"
        onCancel={() => setReplaceConfirmOpen(false)}
        onConfirm={applyQuickOrderNow}
      />
    </>
  );
}



function getFilteredEmployees(employees, query, showIncompleteOnly) {
  const normalizedQuery = query.trim().toLowerCase();
  return employees.filter((employee) => {
    const matchesStatus = !showIncompleteOnly || !isEmployeeComplete(employee);
    const matchesQuery =
      !normalizedQuery ||
      [
        employee.name,
        employee.gender,
        ...employee.items.map(
          (item) => `${item.type} ${item.color} ${item.size} ${item.customSize}`
        ),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
}

function QuickGarmentCellInline({ employee, type, dispatch, invalidEmployeeId }) {
  const item = employee.items.find((entry) => entry.type === type);
  const showErrors = hasEmployeeData(employee) || invalidEmployeeId === employee.id;
  const colors = getColorOptions(type);
  const sizeOptions = getSizeOptionsWithLabels(type, employee.gender);

  if (!item) {
    return (
      <div className="flex h-11 items-center">
        <button
          onClick={() => dispatch({ type: 'toggleType', id: employee.id, itemType: type })}
          disabled={!employee.gender}
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-dashed text-xs font-bold transition',
            !employee.gender
              ? 'border-[#D8DEEA] bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed'
              : 'border-[#A9B9D1] bg-white text-[#002B5B] hover:bg-[#F4F8FF]'
          )}
        >
          {employee.gender ? (
            <>
              <Plus className="size-3.5" />
              <span>เพิ่มเสื้อ</span>
            </>
          ) : (
            <span className="text-[11px] text-[#A1A1AA]">เลือกเพศก่อน</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border bg-[#F8FAFC] p-2 shadow-sm min-w-[12rem]',
        showErrors &&
          (!item.size ||
            Number(item.qty || 0) <= 0 ||
            (needsColorSelection(type) && !resolveItemColor(type, item.color || '')))
          ? 'border-[#EF4444]'
          : 'border-[#E7EAF0]'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-extrabold text-[#44536A] truncate">{type}</span>
        <button
          type="button"
          onClick={() => dispatch({ type: 'toggleType', id: employee.id, itemType: type })}
          className="text-[#94A3B8] hover:text-[#B91C1C] transition p-0.5"
          title={`ลบ ${type}`}
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_3.5rem] gap-1">
        <GridSelect
          value={item.size}
          disabled={!employee.gender}
          placeholder="ไซส์"
          values={sizeOptions}
          compact
          invalid={showErrors && !item.size}
          usePortal={false}
          onChange={(value) =>
            dispatch({
              type: 'patchItem',
              id: employee.id,
              itemType: type,
              patch: patchSizeWithDefaultQty(item, value),
            })
          }
        />

        <GridInput
          type="number"
          value={item.qty}
          inputMode="numeric"
          placeholder="ตัว"
          invalid={showErrors && Number(item.qty || 0) <= 0}
          onChange={(value) =>
            dispatch({
              type: 'patchItem',
              id: employee.id,
              itemType: type,
              patch: { qty: digitsOnly(value) },
            })
          }
          className="text-center font-black"
        />
      </div>

      {needsColorSelection(type) && (
        <GridSelect
          value={item.color || ''}
          disabled={!employee.gender}
          placeholder="เลือกสี"
          values={colors}
          compact
          invalid={showErrors && !resolveItemColor(type, item.color || '')}
          usePortal={false}
          onChange={(color) =>
            dispatch({ type: 'patchItem', id: employee.id, itemType: type, patch: { color } })
          }
        />
      )}

      {item.size === OTHER_SIZE && (
        <GridInput
          type="text"
          value={item.customSize}
          placeholder="ระบุไซส์เพิ่มเติม"
          invalid={showErrors && !item.customSize.trim()}
          onChange={(value) =>
            dispatch({
              type: 'patchItem',
              id: employee.id,
              itemType: type,
              patch: { customSize: value },
            })
          }
        />
      )}
    </div>
  );
}

function QuickEmployeeTable({ employees, dispatch, query, showIncompleteOnly, invalidEmployeeId }) {
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
                            key={`${item.type}-${itemIdx}`}
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
                                    itemType: item.type,
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
                                    itemType: item.type,
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
                                  itemType: item.type,
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
                                  type: nextType,
                                  size: defaultSizeVal,
                                  customSize: '',
                                  color: '',
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
                    <span>ไม่พบพนักงานตามเงื่อนไข</span>
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

function QuickMobileList({
  employees,
  dispatch,
  query,
  showIncompleteOnly,
  invalidEmployeeId,
  editingCardId,
  setEditingCardId,
}) {
  const filteredEmployees = getFilteredEmployees(employees, query, showIncompleteOnly);
  const canDelete = canDeleteEmployee(employees);
  const clothingTypes = getClothingTypes();

  return (
    <section className="grid gap-2 lg:hidden">
      {filteredEmployees.map((employee) => {
        const index = employees.findIndex((item) => item.id === employee.id);
        const complete = isEmployeeComplete(employee);
        const pieces = employee.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
        const showErrors = hasEmployeeData(employee) || invalidEmployeeId === employee.id;
        const isEditing = editingCardId === employee.id;
        return (
          <article
            key={employee.id}
            data-quick-employee-card={employee.id}
            className={cn(
              'rounded-xl border bg-white p-3 text-left shadow-xs transition',
              isEditing
                ? 'border-[#002B5B] ring-2 ring-[#002B5B]/10'
                : 'border-[#D8DEEA]',
              invalidEmployeeId === employee.id &&
                'employee-attention border-[#EF4444] bg-[#FFF7F7]'
            )}
          >
            {isEditing ? (
              <div className="grid gap-3" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#002B5B]">แก้ไขข้อมูล ลำดับที่ {index + 1}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">
                      แก้ชื่อ เพศ เสื้อ ไซส์ และจำนวนตัวได้จากการ์ดนี้
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold',
                      complete ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                    )}
                  >
                    {complete ? 'ครบ' : 'ยังไม่ครบ'}
                  </span>
                </div>

                <div className="grid gap-3 rounded-lg border border-[#E7EAF0] bg-[#F8FAFC] p-3">
                  <Field label="ชื่อ-นามสกุล *">
                    <TextInput
                      value={employee.name}
                      invalid={showErrors && !employee.name.trim()}
                      onChange={(value) =>
                        dispatch({ type: 'patchEmployee', id: employee.id, patch: { name: value } })
                      }
                      placeholder="ชื่อ-นามสกุล"
                    />
                  </Field>

                  <Field label="เพศ *">
                    <div className="grid grid-cols-2 gap-2">
                      {GENDERS.map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() =>
                            dispatch({ type: 'patchEmployee', id: employee.id, patch: { gender } })
                          }
                          className={cn(
                            'h-10 rounded-lg border text-xs font-black transition active:scale-95',
                            employee.gender === gender
                              ? 'border-[#002B5B] bg-[#002B5B] text-white shadow-xs'
                              : showErrors && !employee.gender
                                ? 'border-[#EF4444] bg-[#FFF7F7] text-[#B91C1C]'
                                : 'border-[#CBD5E1] bg-white text-[#071638] hover:border-[#002B5B]'
                          )}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="grid gap-2 rounded-lg border border-[#E7EAF0] bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-[#64748B]">เสื้อที่เบิก *</p>
                    {showErrors && !employee.items.length && (
                      <span className="text-[11px] font-bold text-[#B91C1C]">เลือกอย่างน้อย 1 รายการ</span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {clothingTypes.map((type) => (
                      <QuickGarmentCellInline
                        key={type}
                        employee={employee}
                        type={type}
                        dispatch={dispatch}
                        invalidEmployeeId={invalidEmployeeId}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-2 border-t border-neutral-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingCardId('')}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#002B5B] text-xs font-extrabold text-white shadow-xs transition hover:bg-[#001f42]"
                  >
                    <Check className="size-3.5" />
                    <span>เสร็จสิ้น</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'cloneEmployee', id: employee.id })}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#44536A] transition hover:bg-neutral-50"
                  >
                    <Copy className="size-3.5" />
                    <span>คัดลอก</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => {
                      dispatch({ type: 'delete', id: employee.id });
                      setEditingCardId('');
                    }}
                    className="grid h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] transition hover:bg-[#FFE2E2] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="ลบ"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCardId(employee.id)}
                  className="w-full text-left"
                  title="แก้ไขข้อมูลบนการ์ด"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-[#071638]">
                        ลำดับที่ {index + 1}
                      </p>
                      <p className="mt-1 truncate text-sm font-extrabold text-[#071638]">
                        {employee.name || 'ยังไม่ระบุชื่อ'}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#64748B]">
                        เพศ: {employee.gender || 'ยังไม่เลือกเพศ'} · {pieces} ชิ้น
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold',
                        complete ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                      )}
                    >
                      {complete ? '✓ ครบ' : 'แก้'}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1.5">
                    <span className="text-[11px] font-black text-[#94A3B8]">เสื้อที่เบิก:</span>
                    {employee.items.length ? (
                      employee.items.map((item, itemIndex) => (
                        <div
                          key={`${item.type}-${itemIndex}`}
                          className="flex items-center justify-between gap-2 rounded border border-neutral-100 bg-neutral-50 px-2 py-1 text-xs font-bold text-neutral-700"
                        >
                          <span className="min-w-0 truncate">{item.type}</span>
                          <span className="shrink-0 font-black text-[#002B5B]">
                            ไซส์ {item.size === OTHER_SIZE ? item.customSize || OTHER_SIZE : item.size || '-'} x {item.qty || 0} ตัว
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs font-semibold italic text-neutral-400">ไม่มีเสื้อ</p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 border-t border-neutral-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingCardId(employee.id)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#002B5B] transition hover:bg-[#002B5B]/5"
                  >
                    <Pencil className="size-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'cloneEmployee', id: employee.id })}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#44536A] transition hover:bg-neutral-50"
                  >
                    <Copy className="size-3.5" />
                    <span>คัดลอก</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => dispatch({ type: 'delete', id: employee.id })}
                    className="grid size-9 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] transition hover:bg-[#FFE2E2] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="ลบ"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
      {!filteredEmployees.length && (
        <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center font-bold text-[#64748B]">
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">🔍</span>
            <span>ไม่พบพนักงานตามเงื่อนไข</span>
            <p className="text-xs font-normal text-[#94A3B8]">
              ลองเปลี่ยนตัวกรองหรือเพิ่มพนักงานใหม่
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function QuickMobileEditor({ employee, employees, dispatch, onClose, onNext, invalidEmployeeId, editMode = 'full' }) {
  const canDelete = canDeleteEmployee(employees);
  const index = employee ? employees.findIndex((item) => item.id === employee.id) : -1;
  const nextEmployee = index >= 0 ? employees[index + 1] : null;
  const clothingTypes = getClothingTypes();
  const showErrors = employee
    ? hasEmployeeData(employee) || invalidEmployeeId === employee.id
    : false;

  return (
    <Dialog.Root open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:left-1/2 lg:top-1/2 lg:bottom-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:w-[480px] lg:max-h-[85vh]"
        >
          {employee && (
            <>
              <div className="flex min-h-14 items-center justify-between border-b border-[#E7EAF0] bg-gradient-to-r from-[#F8FAFC] to-[#FFFFFF] px-4">
                <div className="min-w-0">
                  <Dialog.Title className="font-extrabold text-[#071638]">
                    {editMode === 'garments-only' ? (
                      `จัดการเสื้อ: ${employee.name || 'ยังไม่ระบุชื่อ'}`
                    ) : (
                      `${index + 1}. ${employee.name || 'ยังไม่ระบุชื่อ'}`
                    )}
                  </Dialog.Title>
                  <p className="text-xs text-[#64748B] font-semibold mt-0.5">
                    {editMode === 'garments-only' ? (
                      'แก้ไขรายการเสื้อ ไซส์ และจำนวนตัว'
                    ) : (
                      `บรรทัดที่ ${index + 1} จาก ${employees.length}`
                    )}
                  </p>
                </div>
                <Dialog.Close
                  className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9] transition"
                  aria-label="ปิด"
                >
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <div className="employee-scroll-region grid gap-4 overflow-y-auto bg-[#F8FAFC] p-4">
                {editMode !== 'garments-only' && (
                  <div className="bg-white rounded-lg border border-[#D8DEEA] p-3">
                    <p className="text-xs font-bold text-[#64748B] mb-2">
                      ขั้นตอนที่ 1: ชื่อและเพศ
                    </p>
                    <Field label="ชื่อ-นามสกุล *">
                      <TextInput
                        value={employee.name}
                        invalid={showErrors && !employee.name.trim()}
                        onChange={(value) =>
                          dispatch({ type: 'patchEmployee', id: employee.id, patch: { name: value } })
                        }
                        placeholder="เช่น สมชาย ใจดี"
                        title="ระบุชื่อ-นามสกุลของพนักงาน"
                      />
                    </Field>
                    <Field label="เพศ *">
                      <div className="grid grid-cols-2 gap-3">
                        {GENDERS.map((gender) => (
                          <button
                            key={gender}
                            onClick={() =>
                              dispatch({ type: 'patchEmployee', id: employee.id, patch: { gender } })
                            }
                            className={cn(
                              'min-h-12 rounded-lg border-2 text-sm font-bold transition active:scale-95',
                              employee.gender === gender
                                ? 'border-[#002B5B] bg-[#002B5B] text-white shadow-md'
                                : showErrors && !employee.gender
                                  ? 'border-[#EF4444] bg-[#FFF7F7] text-[#B91C1C]'
                                  : 'border-[#CBD5E1] bg-white text-[#071638] hover:border-[#002B5B]'
                            )}
                            title={`เลือก${gender}`}
                          >
                            <span className="text-base">{genderSymbol(gender)}</span> {gender}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-[#D8DEEA] p-3">
                  <p className="text-xs font-bold text-[#64748B] mb-2">
                    {editMode === 'garments-only' ? 'รายการเสื้อที่เบิก' : 'ขั้นตอนที่ 2: เลือกแบบเสื้อ'}
                  </p>
                  <div className="grid gap-2.5">
                    {clothingTypes.map((type) => {
                      const hasItem = employee.items.some((item) => item.type === type);
                      return (
                        <div
                          key={type}
                          className={cn(
                            'rounded-lg border-2 p-3 text-left transition',
                            hasItem
                              ? 'border-[#002B5B] bg-[#EAF2FF]'
                              : showErrors && !employee.items.length
                                ? 'border-[#EF4444] bg-[#FFF7F7]'
                                : 'border-[#E2E8F0] bg-white hover:border-[#BFD0EA]'
                          )}
                        >
                          <div
                            onClick={() =>
                              dispatch({ type: 'toggleType', id: employee.id, itemType: type })
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                dispatch({ type: 'toggleType', id: employee.id, itemType: type });
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between gap-2 cursor-pointer select-none focus:outline-none",
                              hasItem && "pb-2 border-b border-dashed border-[#CBD5E1]/60"
                            )}
                            title={`${hasItem ? 'ยกเลิก' : 'เลือก'} ${type}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition',
                                  hasItem
                                    ? 'border-[#002B5B] bg-[#002B5B]'
                                    : 'border-[#CBD5E1] bg-white'
                                )}
                              >
                                {hasItem && <Check className="size-3 text-white" />}
                              </div>
                              <p
                                className={cn(
                                  'font-semibold',
                                  hasItem ? 'text-[#002B5B]' : 'text-[#071638]'
                                )}
                              >
                                {type}
                              </p>
                            </div>
                            {hasItem && (
                              <span className="text-xs font-bold text-[#71717A]">✓ เลือกแล้ว</span>
                            )}
                          </div>
                          {hasItem && (
                            <div className="mt-3">
                              <QuickGarmentCellInline
                                employee={employee}
                                type={type}
                                dispatch={dispatch}
                                invalidEmployeeId={invalidEmployeeId}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {showErrors && !employee.items.length && (
                      <p className="text-xs font-bold text-[#B91C1C] mt-1">
                        ต้องเลือกแบบเสื้ออย่างน้อย 1 แบบ
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[48px_1fr_1.2fr] sm:grid-cols-[48px_1fr_1.5fr] gap-2 border-t border-[#E7EAF0] bg-white p-3">
                <button
                  onClick={() => {
                    if (!canDelete) return;
                    dispatch({ type: 'delete', id: employee.id });
                    onClose();
                  }}
                  disabled={!canDelete}
                  className="grid min-h-11 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-45 transition hover:bg-[#FEE2E2] active:scale-95"
                  title={!canDelete ? 'ต้องเก็บไว้อย่างน้อย 1 บรรทัด' : 'ลบพนักงานคนนี้'}
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  onClick={onClose}
                  className="min-h-11 rounded-lg border border-[#CBD5E1] bg-white text-xs sm:text-sm font-bold text-[#44536A] transition hover:bg-[#F8FAFC] active:scale-95"
                  title="บันทึกข้อมูลและปิดหน้าต่าง"
                >
                  เสร็จสิ้น
                </button>
                {nextEmployee ? (
                  <button
                    onClick={() => onNext(nextEmployee.id)}
                    className="min-h-11 rounded-lg bg-[#002B5B] text-xs sm:text-sm font-bold text-white transition hover:bg-[#013A78] active:scale-95"
                    title="บันทึกข้อมูลและไปยังพนักงานคนต่อไป"
                  >
                    คนถัดไป ({employees.length - index - 1} คน)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const newId = crypto.randomUUID();
                      dispatch({ type: 'add', id: newId });
                      onNext(newId);
                      toast.success('เพิ่มพนักงานคนใหม่แล้ว', {
                        description: 'กรุณากรอกข้อมูลสำหรับพนักงานคนถัดไป',
                      });
                    }}
                    className="min-h-11 rounded-lg bg-[#002B5B] text-xs sm:text-sm font-bold text-white transition hover:bg-[#013A78] active:scale-95"
                    title="เพิ่มพนักงานใหม่และแก้ไขต่อทันที"
                  >
                    เพิ่มคนถัดไป
                  </button>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}



function ReviewMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#F4F7FC] px-3 py-3 border border-[#E2E8F0]">
      <p className="text-xs font-bold text-[#64748B]">{label}</p>
      <p className="mt-1 break-words font-extrabold text-[#071638] text-sm">{value}</p>
    </div>
  );
}

function DashboardApp({ onOpenOrder }) {
  const [adminToken, setDashboardToken] = useState(getAdminToken);
  const [dashboardView, setDashboardView] = useState('orders');
  const [manualOpen, setManualOpen] = useState(false);

  function handleUnlock(token) {
    setAdminToken(token);
    setDashboardToken(token);
  }

  function handleAuthExpired() {
    setAdminToken('');
    setDashboardToken('');
  }

  function handleLogout() {
    setAdminToken('');
    setDashboardToken('');
  }

  if (!adminToken) {
    return <DashboardLogin onUnlock={handleUnlock} onOpenOrder={onOpenOrder} />;
  }

  return (
    <>
      <DashboardHeader
        activeView={dashboardView}
        onViewChange={setDashboardView}
        onOpenOrder={onOpenOrder}
        onManualOpen={() => setManualOpen(true)}
        onLogout={handleLogout}
      />
      <main className="relative z-10 mx-auto flex w-full max-w-[1520px] flex-col gap-3 px-2 pb-10 pt-3 sm:px-4 lg:gap-4 lg:px-6 lg:pt-5">
        <Dashboard
          activeView={dashboardView}
          onAuthExpired={handleAuthExpired}
          onViewChange={setDashboardView}
        />
      </main>
      <AdminManualDialog open={manualOpen} setOpen={setManualOpen} />
    </>
  );
}

function DashboardLogin({ onUnlock, onOpenOrder }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setIsChecking(true);
    setError('');
    try {
      const response = await fetch('/api/auth/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.token) throw new Error(data?.error || 'Invalid passcode');
      setError('');
      onUnlock(data.token);
    } catch {
      setError('รหัสไม่ถูกต้อง หรือระบบยืนยันสิทธิ์ไม่พร้อม');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-[520px] place-items-center px-4 py-10">
      <Card className="w-full p-6 sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Logo />
          <span className="grid size-12 place-items-center rounded-2xl bg-[#E8F0FF] text-[#002B5B]">
            <LayoutDashboard />
          </span>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-[#071638]">เข้าสู่แดชบอร์ด</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
          กรอกรหัสเพื่อดูข้อมูลสรุปคำสั่งเบิกเสื้อ
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Field label="รหัสเข้าแดชบอร์ด">
            <TextInput
              value={passcode}
              onChange={setPasscode}
              placeholder="กรอกรหัส"
              inputMode="numeric"
              type="password"
            />
          </Field>
          {error && (
            <p className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#B91C1C]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isChecking}
            className="reactbits-shine flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#002B5B] font-black text-white disabled:opacity-60"
          >
            {isChecking ? <Loader2 className="animate-spin" /> : <UserCheck />}{' '}
            {isChecking ? 'กำลังตรวจสอบ' : 'เข้าสู่แดชบอร์ด'}
          </button>
        </form>
        <button
          onClick={onOpenOrder}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#C8D6EA] bg-white font-black text-[#002B5B]"
        >
          <Shirt /> เปิดหน้าสั่งเบิกเสื้อ
        </button>
      </Card>
    </main>
  );
}

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
                        {tab.colors?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {tab.colors.map((color) => (
                              <span
                                key={`${tab.id}-${color.name}`}
                                className="inline-flex items-center gap-2 rounded-full border border-[#D8DEEA] bg-white px-3 py-1 text-xs font-bold text-[#44536A]"
                              >
                                <span
                                  className="size-4 rounded-full border border-[#CBD5E1]"
                                  style={{ backgroundColor: color.value }}
                                />
                                {color.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm font-semibold text-[#64748B]">
                            ยังไม่ได้กำหนดสีสำหรับเสื้อนี้
                          </p>
                        )}
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
              <p>สำหรับผู้กรอกคำขอเบิก ใช้ทำรายการให้ครบและลดการส่งข้อมูลผิด</p>
            </div>
            <Dialog.Close className="manual-close-button" aria-label="ปิด">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="manual-dialog-body">
            <ManualSection icon={UserCheck} title="ขั้นตอนที่ 1: ข้อมูลผู้เบิกและสถานที่จัดส่ง">
              <ManualList
                items={[
                  'กรอกชื่อบริษัทหรือหน่วยงาน เลือกสาขาที่จัดส่ง ระบุชื่อผู้ติดต่อ และเบอร์ติดต่อให้ครบ',
                  'ระบบจะตรวจรูปแบบเบอร์โทรศัพท์และจัดรูปแบบให้อ่านง่ายโดยอัตโนมัติ',
                  'เมื่อข้อมูลครบแล้วจึงไปขั้นตอนรายการเสื้อพนักงานได้',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Users} title="ขั้นตอนที่ 2: รายชื่อพนักงานและรายการเสื้อ">
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

            <ManualSection icon={ClipboardList} title="ขั้นตอนที่ 3: ตรวจสอบและส่งคำขอ">
              <ManualList
                items={[
                  'ตรวจชื่อพนักงาน เพศ แบบเสื้อ ไซส์ และจำนวนให้ถูกต้องก่อนส่ง',
                  'ระบบสรุปจำนวนแยกตามแบบเสื้อและไซส์เพื่อให้ตรวจง่าย',
                  'เมื่อส่งสำเร็จ ระบบจะสร้างรหัสคำสั่งเบิกสำหรับติดตามงาน',
                  'ฝั่งผู้เบิกจะไม่เห็นรายละเอียดสต็อกคงเหลือ เพราะส่วนนี้เป็นหน้าที่ของแอดมิน',
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
                <PackageSearch className="size-5" /> คู่มือแอดมินและการจัดการสต็อก
              </Dialog.Title>
              <p>สำหรับตรวจคำสั่งเบิก จัดส่ง และบันทึกสต็อกแบบมีประวัติ</p>
            </div>
            <Dialog.Close className="manual-close-button" aria-label="ปิด">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="manual-dialog-body">
            <ManualSection icon={ClipboardList} title="หน้ารายการเบิก">
              <ManualList
                items={[
                  'ใช้ดูคำสั่งเบิกทั้งหมด ค้นหาตามรหัสคำสั่ง บริษัท ผู้ติดต่อ เบอร์โทร หรือชื่อพนักงาน',
                  'กรองตามสาขา เดือน และสถานะ เพื่อจัดลำดับงานที่ต้องดำเนินการ',
                  'กดรายการเพื่อดูรายละเอียดพนักงานและเสื้อที่เบิกในคำสั่งนั้น',
                  'เปลี่ยนสถานะเป็นจัดส่งแล้วเมื่อจ่ายของจริง ระบบจะตัดสต็อกและเพิ่มยอดเบิกแล้วให้เอง',
                  'ถ้าสต็อกไม่พอ ระบบจะแจ้งรายการที่ขาดและไม่ควรฝืนจัดส่งจนกว่าจะเติมสต็อก',
                ]}
              />
            </ManualSection>

            <ManualSection icon={BarChart3} title="หน้าภาพรวม">
              <ManualList
                items={[
                  'ดูจำนวนคำสั่งเบิกทั้งหมด งานรอดำเนินการ งานรอของ และงานที่จัดส่งแล้ว',
                  'ส่วนสรุปสต็อกเสื้อแสดงจำนวนที่เคยมี เบิกแล้ว และคงเหลือ แยกตามแบบเสื้อ เพศ และไซส์',
                  'ใช้ส่วนนี้ตรวจแนวโน้มการใช้เสื้อ และดูว่าสต็อกแบบไหนลดเร็วหรือควรเติมก่อน',
                ]}
              />
            </ManualSection>

            <ManualSection icon={PackageSearch} title="หน้าแบบเสื้อ/สต็อก">
              <ManualList
                items={[
                  'แท็บข้อมูลเสื้อใช้แก้ชื่อแบบเสื้อ รูปภาพ สี และรายละเอียดไซส์ เช่น อกหรือเอว',
                  'รายละเอียดไซส์แยกตามเพศ หากแก้ค่าอก/เอวตรงนี้ ผู้เบิกจะเห็นค่าที่อัปเดตในหน้าข้อมูลเสื้อ',
                  'แท็บสต็อกตามไซส์ใช้แก้เฉพาะจำนวนคงเหลือ เพื่อไม่ให้ข้อมูลอก/เอวปนกับงานคลัง',
                  'ใส่เลขบวก เช่น 20 แล้วกดเพิ่ม เพื่อบันทึกรับสต็อกเข้า',
                  'ใส่เลขลบ เช่น -2 แล้วกดเพิ่ม เพื่อปรับลดกรณีเคยกรอกผิดหรือต้องตัดยอดแก้ไข',
                  'ไม่ต้องแก้เลขคงเหลือตรง ๆ เพราะระบบจะเก็บประวัติเป็นยอดตั้งต้น เพิ่มเข้า ปรับลด เบิกแล้ว และคงเหลือ',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Download} title="การส่งออกและ Google Sheet">
              <ManualList
                items={[
                  'ปุ่มส่งออก CSV ใช้ดาวน์โหลดข้อมูลคำสั่งเบิกตามตัวกรองที่เลือก',
                  'ชีท Orders เก็บข้อมูลคำสั่งเบิกและสถานะ',
                  'ชีท Stock สร้างและอัปเดตจากระบบโดยอัตโนมัติ แสดงยอดตั้งต้น เพิ่มเข้า ปรับลด เบิกแล้ว สต็อกทั้งหมด และคงเหลือ',
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

function validateImageFile(file) {
  if (!IMAGE_UPLOAD_TYPES.includes(file.type)) return 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP';
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return 'ขนาดไฟล์ต้องไม่เกิน 10MB';
  return '';
}

async function uploadImageToBlob(file) {
  const token = getAdminToken();
  if (!token) throw new Error('Unauthorized');
  return upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
    clientPayload: JSON.stringify({ token }),
  });
}

function InventoryManager({ config, setConfig, onAuthExpired }) {
  const [selectedId, setSelectedId] = useState(() => config[0]?.id || '');
  const [selectedGender, setSelectedGender] = useState(GENDERS[0]);
  const [editing, setEditing] = useState(false);
  const [activeSection, setActiveSection] = useState('details');
  const [uploadingId, setUploadingId] = useState('');
  const [stockAdjustments, setStockAdjustments] = useState({});
  const syncTimerRef = useRef(null);
  const selectedItem = config.find((item) => item.id === selectedId) || config[0];
  const stockRows = selectedItem?.genderSizeRows?.[selectedGender] || selectedItem?.sizeRows || [];

  useEffect(() => {
    if (!config.some((item) => item.id === selectedId)) {
      setSelectedId(config[0]?.id || '');
    }
  }, [config, selectedId]);

  useEffect(() => () => window.clearTimeout(syncTimerRef.current), []);

  function scheduleSync(normalizedConfig) {
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      publishSharedClothingConfig(normalizedConfig).catch((error) => {
        if (isAuthFailure(error)) {
          setAdminToken('');
          onAuthExpired?.();
          toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ');
          return;
        }
        toast.error('บันทึกข้อมูลเสื้อไม่สำเร็จ', {
          description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
        });
      });
    }, 700);
  }

  function commit(nextConfig) {
    const normalized = normalizeClothingConfig(nextConfig);
    setConfig(normalized);
    saveClothingConfig(normalized);
    scheduleSync(normalized);
  }

  function patchItem(id, patch) {
    commit(config.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function patchColor(id, colorIndex, patch) {
    commit(
      config.map((item) =>
        item.id === id
          ? {
              ...item,
              colors: (item.colors || []).map((color, index) =>
                index === colorIndex ? { ...color, ...patch } : color
              ),
            }
          : item
      )
    );
  }

  function addColor(id) {
    commit(
      config.map((item) =>
        item.id === id
          ? { ...item, colors: [...(item.colors || []), { name: '', value: '#0F172A' }] }
          : item
      )
    );
  }

  function removeColor(id, colorIndex) {
    commit(
      config.map((item) =>
        item.id === id
          ? { ...item, colors: (item.colors || []).filter((_, index) => index !== colorIndex) }
          : item
      )
    );
  }

  function patchStock(id, rowIndex, patch) {
    commit(
      config.map((item) => {
        if (item.id !== id) return item;
        const rows = item.genderSizeRows?.[selectedGender] || item.sizeRows || [];
        return {
          ...item,
          genderSizeRows: {
            ...(item.genderSizeRows || {}),
            [selectedGender]: rows.map((row, index) =>
              index === rowIndex ? { ...row, ...patch } : row
            ),
          },
        };
      })
    );
  }

  function getStockAdjustmentKey(rowIndex) {
    return `${selectedItem?.id || ''}:${selectedGender}:${rowIndex}`;
  }

  function adjustStockQuantity(id, rowIndex) {
    const key = getStockAdjustmentKey(rowIndex);
    const amount = Number(stockAdjustments[key] || 0);
    if (!amount) return;
    commit(
      config.map((item) => {
        if (item.id !== id) return item;
        const rows = item.genderSizeRows?.[selectedGender] || item.sizeRows || [];
        return {
          ...item,
          genderSizeRows: {
            ...(item.genderSizeRows || {}),
            [selectedGender]: rows.map((row, index) =>
              index === rowIndex ? applyStockMovement(row, amount, 'manual') : row
            ),
          },
        };
      })
    );
    setStockAdjustments((current) => ({ ...current, [key]: '' }));
  }

  function patchStockDetail(id, rowIndex, field, value) {
    commit(
      config.map((item) => {
        if (item.id !== id) return item;
        const rows = item.genderSizeRows?.[selectedGender] || item.sizeRows || [];
        return {
          ...item,
          genderSizeRows: {
            ...(item.genderSizeRows || {}),
            [selectedGender]: rows.map((row, index) =>
              index === rowIndex
                ? {
                    ...row,
                    details: {
                      ...(row.details || {}),
                      [field]: value,
                    },
                  }
                : row
            ),
          },
        };
      })
    );
  }

  function patchDetailField(id, fieldIndex, value) {
    const nextField = value.trim() || 'รายละเอียด';
    commit(
      config.map((item) => {
        if (item.id !== id) return item;
        const oldField = item.detailFields?.[fieldIndex];
        const detailFields = (item.detailFields || []).map((field, index) =>
          index === fieldIndex ? nextField : field
        );
        return {
          ...item,
          detailFields,
          genderSizeRows: GENDERS.reduce((rows, gender) => {
            const sizeRows = item.genderSizeRows?.[gender] || item.sizeRows || [];
            return {
              ...rows,
              [gender]: sizeRows.map((row) => {
                const details = { ...(row.details || {}) };
                if (oldField && oldField !== nextField) {
                  details[nextField] = details[oldField] || '';
                  delete details[oldField];
                }
                return { ...row, details };
              }),
            };
          }, {}),
        };
      })
    );
  }

  function addDetailField(id) {
    commit(
      config.map((item) =>
        item.id === id
          ? {
              ...item,
              detailFields: [...(item.detailFields || []), 'รายละเอียด'],
              genderSizeRows: GENDERS.reduce((rows, gender) => {
                const sizeRows = item.genderSizeRows?.[gender] || item.sizeRows || [];
                return {
                  ...rows,
                  [gender]: sizeRows.map((row) => ({
                    ...row,
                    details: { ...(row.details || {}), รายละเอียด: '' },
                  })),
                };
              }, {}),
            }
          : item
      )
    );
  }

  function removeDetailField(id, fieldIndex) {
    commit(
      config.map((item) => {
        if (item.id !== id || (item.detailFields || []).length <= 1) return item;
        const field = item.detailFields[fieldIndex];
        return {
          ...item,
          detailFields: item.detailFields.filter((_, index) => index !== fieldIndex),
          genderSizeRows: GENDERS.reduce((rows, gender) => {
            const sizeRows = item.genderSizeRows?.[gender] || item.sizeRows || [];
            return {
              ...rows,
              [gender]: sizeRows.map((row) => {
                const details = { ...(row.details || {}) };
                delete details[field];
                return { ...row, details };
              }),
            };
          }, {}),
        };
      })
    );
  }

  function addStockRow(id) {
    commit(
      config.map((item) => {
        if (item.id !== id) return item;
        const rows = item.genderSizeRows?.[selectedGender] || item.sizeRows || [];
        return {
          ...item,
          genderSizeRows: {
            ...(item.genderSizeRows || {}),
            [selectedGender]: [
              ...rows,
              {
                size: '',
                qty: 0,
                details: (item.detailFields || []).reduce(
                  (details, field) => ({ ...details, [field]: '' }),
                  {}
                ),
              },
            ],
          },
        };
      })
    );
  }

  function removeStockRow(id, rowIndex) {
    commit(
      config.map((item) => {
        if (item.id !== id) return item;
        const rows = item.genderSizeRows?.[selectedGender] || item.sizeRows || [];
        return {
          ...item,
          genderSizeRows: {
            ...(item.genderSizeRows || {}),
            [selectedGender]: rows.length > 1 ? rows.filter((_, index) => index !== rowIndex) : rows,
          },
        };
      })
    );
  }

  function addClothing() {
    const id = crypto.randomUUID();
    commit([
      ...config,
      {
        id,
        type: 'เสื้อใหม่',
        imageUrl: '',
        colors: [],
        detailFields: ['อก'],
        sizeRows: [{ size: 'M', details: { อก: '' }, qty: 0 }],
        genderSizeRows: GENDERS.reduce(
          (rows, gender) => ({ ...rows, [gender]: [{ size: 'M', details: { อก: '' }, qty: 0 }] }),
          {}
        ),
      },
    ]);
    setSelectedId(id);
    setEditing(true);
  }

  async function uploadImage(id, file) {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error('ไฟล์รูปไม่ถูกต้อง', { description: validationError });
      return;
    }
    setUploadingId(id);
    const loadingToastId = toast.loading('กำลังอัปโหลดรูปเสื้อ...');
    try {
      const result = await uploadImageToBlob(file);
      patchItem(id, { imageUrl: result.url });
      toast.success('อัปโหลดรูปเสื้อแล้ว', { id: loadingToastId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', { id: loadingToastId });
        return;
      }
      toast.error('อัปโหลดรูปเสื้อไม่สำเร็จ', {
        id: loadingToastId,
        description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setUploadingId('');
    }
  }

  if (!selectedItem) return null;

  const detailFields = selectedItem.detailFields?.length ? selectedItem.detailFields : ['อก'];
  const sizeDetailGridStyle = {
    '--inventory-size-detail-columns': `minmax(7rem, 0.8fr) repeat(${detailFields.length}, minmax(7rem, 1fr)) 2.5rem`,
  };

  return (
    <section className="inventory-manager-shell">
      <aside className="inventory-list-panel">
        <div className="inventory-list-head">
          <div>
            <h3>แบบเสื้อ</h3>
            <p>{config.length} รายการ</p>
          </div>
          <button onClick={addClothing}>
            <Plus className="size-4" /> เพิ่ม
          </button>
        </div>
        <div className="inventory-item-list">
          {config.map((item) => {
            const total = Object.values(item.genderSizeRows || {})
              .flat()
              .reduce((sum, row) => sum + Number(row.qty || 0), 0);
            return (
              <button
                key={item.id}
                className={cn('inventory-item-card', item.id === selectedItem.id && 'active')}
                onClick={() => {
                  setSelectedId(item.id);
                  setEditing(false);
                }}
              >
                <span className="inventory-item-thumb">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Shirt className="size-5" />}
                </span>
                <span>
                  <strong>{item.type || 'ยังไม่ระบุชื่อ'}</strong>
                  <small>คงเหลือ {total} ชิ้น</small>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="inventory-edit-panels">
        <div className="inventory-edit-toolbar">
          <div>
            <h3>{selectedItem.type || 'ยังไม่ระบุชื่อ'}</h3>
            <p>
              ใช้แท็บข้อมูลเสื้อสำหรับชื่อ รูป และสี ส่วนแท็บสต็อกใช้แก้จำนวนคงเหลือตามไซส์
            </p>
          </div>
          <button className={editing ? 'done' : ''} onClick={() => setEditing((value) => !value)}>
            <Pencil className="size-4" />
            {editing ? 'เสร็จสิ้น' : 'จัดการ'}
          </button>
        </div>

        <div className="inventory-subtabs" role="tablist" aria-label="จัดการข้อมูลเสื้อ">
          <button
            className={activeSection === 'details' ? 'active' : ''}
            onClick={() => setActiveSection('details')}
            role="tab"
            aria-selected={activeSection === 'details'}
          >
            ข้อมูลเสื้อ
          </button>
          <button
            className={activeSection === 'stock' ? 'active' : ''}
            onClick={() => setActiveSection('stock')}
            role="tab"
            aria-selected={activeSection === 'stock'}
          >
            สต็อกตามไซส์
          </button>
        </div>

        <section className={cn('inventory-detail-card', activeSection !== 'details' && 'hidden')}>
          <div className="inventory-section-head">
            <div>
              <h4>ข้อมูลรายละเอียดเสื้อ</h4>
              <p>แก้เฉพาะข้อมูลที่ผู้เบิกเห็น เช่น ชื่อแบบเสื้อ รูปภาพ และสี</p>
            </div>
          </div>
          <div className="inventory-detail-grid">
            <div className="inventory-image-box">
              {selectedItem.imageUrl ? (
                <img src={selectedItem.imageUrl} alt={selectedItem.type} />
              ) : (
                <span>ไม่มีรูป</span>
              )}
              {editing && (
                <label>
                  {uploadingId === selectedItem.id ? 'กำลังอัปโหลด' : 'แนบรูป'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingId === selectedItem.id}
                    onChange={(event) => {
                      uploadImage(selectedItem.id, event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
            <div className="inventory-detail-fields">
              <Field label="ชื่อแบบเสื้อ">
                <TextInput
                  value={selectedItem.type}
                  onChange={(value) => patchItem(selectedItem.id, { type: value })}
                  disabled={!editing}
                  placeholder="เช่น เสื้อโปโล"
                />
              </Field>
              <div className="inventory-color-list">
                <div className="inventory-inline-head">
                  <span>สี</span>
                  {editing && (
                    <button onClick={() => addColor(selectedItem.id)}>
                      <Plus className="size-4" /> เพิ่มสี
                    </button>
                  )}
                </div>
                {(selectedItem.colors || []).length ? (
                  selectedItem.colors.map((color, index) => (
                    <div className="inventory-color-row" key={`${selectedItem.id}-${index}`}>
                      <input
                        type="color"
                        value={color.value || '#0F172A'}
                        onChange={(event) =>
                          patchColor(selectedItem.id, index, { value: event.target.value })
                        }
                        disabled={!editing}
                      />
                      <TextInput
                        value={color.name}
                        onChange={(value) => patchColor(selectedItem.id, index, { name: value })}
                        disabled={!editing}
                        placeholder="ชื่อสี"
                      />
                      {editing && (
                        <button onClick={() => removeColor(selectedItem.id, index)}>
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="inventory-empty-note">ยังไม่มีสีที่กำหนด</p>
                )}
              </div>
            </div>
          </div>
          <div className="inventory-size-fields">
            <div className="inventory-size-fields-top">
              <div>
                <strong>รายละเอียดไซส์</strong>
                <span>แก้ค่าอก/เอวแยกตามเพศ ข้อมูลนี้จะแสดงในตารางไซส์ของผู้เบิก</span>
              </div>
              <div className="inventory-gender-toggle">
                {GENDERS.map((gender) => (
                  <button
                    key={gender}
                    className={selectedGender === gender ? 'active' : ''}
                    onClick={() => setSelectedGender(gender)}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>
            {editing && (
              <div className="inventory-size-field-list">
                {detailFields.map((field, index) => (
                  <div key={`${selectedItem.id}-detail-field-${index}`} className="inventory-size-field-row">
                    <TextInput
                      value={field}
                      onChange={(value) => patchDetailField(selectedItem.id, index, value)}
                      placeholder="อก"
                    />
                    <button
                      onClick={() => removeDetailField(selectedItem.id, index)}
                      disabled={detailFields.length <= 1}
                      title="ลบช่องรายละเอียด"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="inventory-size-detail-table">
              <div className="inventory-size-detail-header" style={sizeDetailGridStyle}>
                <span>ไซส์</span>
                {detailFields.map((field) => (
                  <span key={`${selectedItem.id}-size-head-${field}`}>{field}</span>
                ))}
                {editing && <span />}
              </div>
              {stockRows.map((row, index) => (
                <div
                  className="inventory-size-detail-row"
                  key={`${selectedItem.id}-${selectedGender}-detail-${index}`}
                  style={sizeDetailGridStyle}
                >
                  {editing ? (
                    <TextInput
                      value={row.size}
                      onChange={(value) => patchStock(selectedItem.id, index, { size: value })}
                      placeholder="ไซส์"
                    />
                  ) : (
                    <strong>{row.size || '-'}</strong>
                  )}
                  {detailFields.map((field) =>
                    editing ? (
                      <TextInput
                        key={`${selectedItem.id}-${selectedGender}-${index}-${field}`}
                        value={row.details?.[field] || ''}
                        onChange={(value) => patchStockDetail(selectedItem.id, index, field, value)}
                        placeholder={field}
                      />
                    ) : (
                      <span key={`${selectedItem.id}-${selectedGender}-${index}-${field}`}>
                        {row.details?.[field] || '-'}
                      </span>
                    )
                  )}
                  {editing && (
                    <button onClick={() => removeStockRow(selectedItem.id, index)} title="ลบไซส์">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {editing && (
              <button className="inventory-add-stock" onClick={() => addStockRow(selectedItem.id)}>
                <Plus className="size-4" /> เพิ่มไซส์
              </button>
            )}
          </div>
        </section>

        <section className={cn('inventory-stock-card', activeSection !== 'stock' && 'hidden')}>
          <div className="inventory-section-head">
            <div>
              <h4>สต็อกตามไซส์</h4>
              <p>แก้เฉพาะจำนวนคงเหลือ แยกตามเพศ ส่วนอก/เอวอยู่ในแท็บข้อมูลเสื้อ</p>
            </div>
            <div className="inventory-gender-toggle">
              {GENDERS.map((gender) => (
                <button
                  key={gender}
                  className={selectedGender === gender ? 'active' : ''}
                  onClick={() => setSelectedGender(gender)}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>
          <div className="inventory-stock-table">
            <div className="inventory-stock-header">
              <span>ไซส์</span>
              <span>จำนวนคงเหลือ</span>
              {editing && <span>เพิ่ม / ลด</span>}
            </div>
            {stockRows.map((row, index) => (
              <div
                className="inventory-stock-row"
                key={`${selectedItem.id}-${selectedGender}-${index}`}
              >
                <strong>{row.size || '-'}</strong>
                <span>{Number(row.qty || 0)} ชิ้น</span>
                {editing && (
                  <div className="inventory-stock-adjust">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      value={stockAdjustments[getStockAdjustmentKey(index)] || ''}
                      onChange={(value) =>
                        setStockAdjustments((current) => ({
                          ...current,
                          [getStockAdjustmentKey(index)]: value,
                        }))
                      }
                      placeholder="+10 หรือ -2"
                    />
                    <button onClick={() => adjustStockQuantity(selectedItem.id, index)}>เพิ่ม</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function Dashboard({ activeView = 'orders', onAuthExpired, onViewChange }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState('');
  const [statusLoadingId, setStatusLoadingId] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState('');
  const [clothingConfig, setClothingConfig] = useState(readClothingConfig);
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());
  const [branchFilter, setBranchFilter] = useState('ทุกสาขา');
  const [statusFilter, setStatusFilter] = useState('ทุกสถานะ');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ทั้งหมด');
  const [summaryGenderFilter, setSummaryGenderFilter] = useState('ทุกเพศ');
  const [monthFilter, setMonthFilter] = useState(() => formatMonthLabel(new Date()));
  const [exportBranchFilter, setExportBranchFilter] = useState('ทุกสาขา');
  const [exportStartMonth, setExportStartMonth] = useState(() => formatMonthInputValue(new Date()));
  const [exportEndMonth, setExportEndMonth] = useState(() => formatMonthInputValue(new Date()));
  const [exportGenderFilter, setExportGenderFilter] = useState('ทุกเพศ');
  const [exportTypeFilter, setExportTypeFilter] = useState('ทุกแบบ');
  const [exportSizeFilter, setExportSizeFilter] = useState('ทุกไซส์');
  const [exportStatusFilter, setExportStatusFilter] = useState('ทุกสถานะ');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [deleteConfirmBatchId, setDeleteConfirmBatchId] = useState('');
  const [showOrderFilters, setShowOrderFilters] = useState(true);
  const [exportExpanded, setExportExpanded] = useState(false);
  const [advancedExportExpanded, setAdvancedExportExpanded] = useState(false);
  const [orderPage, setOrderPage] = useState(1);

  async function loadData({ silent = false } = {}) {
    if (refreshing) return;
    const showSkeleton = !silent && !batches.length;
    if (showSkeleton) setLoading(true);
    setRefreshing(true);
    const loadingToastId = silent
      ? toast.loading('กำลังโหลดข้อมูล...', { description: 'ระบบกำลังเตรียมข้อมูล กรุณารอสักครู่' })
      : null;
    try {
      const response = await authFetch('/api/dashboard/orders', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || result?.success === false)
        throw new Error(result?.error || 'GAS request failed');
      const data = Array.isArray(result) ? result : result?.data;
      if (!Array.isArray(data)) throw new Error('Invalid dashboard data');
      const remoteBatches = data.map(normalizeBatch).filter((batch) => batch.orders.length);
      setBatches(remoteBatches);
      setDataError('');
      if (loadingToastId) toast.success('โหลดข้อมูลแดชบอร์ดแล้ว', { id: loadingToastId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
          id: loadingToastId || undefined,
          description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
        });
        return;
      }
      if (!batches.length) setBatches([]);
      setDataError(error?.message || 'ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้');
      toast.error('โหลดข้อมูลแดชบอร์ดไม่สำเร็จ', {
        id: loadingToastId || undefined,
        description: getDashboardLoadErrorDescription(error),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSelectedBatchIds(new Set());
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData();
  }, []);

  const filteredBatches = useMemo(
    () =>
      batches.filter((batch) => {
        const inBranch = branchFilter === 'ทุกสาขา' || batch.branch === branchFilter;
        const inStatus = statusFilter === 'ทุกสถานะ' || batch.status === statusFilter;
        const inMonth =
          monthFilter === 'ทุกเดือน' ||
          formatMonthLabel(batch.submittedAt) === monthFilter;
        const searchText = [
          batch.batchId,
          batch.companyName,
          batch.branch,
          batch.supervisorName,
          batch.supervisorPhone,
          batch.status,
          ...batch.orders.map((order) =>
            [
              order.name,
              order.gender,
              ...order.items.map(
                (item) => `${item.type} ${item.color || ''} ${item.size} ${item.qty}`
              ),
            ].join(' ')
          ),
        ]
          .join(' ')
          .toLowerCase();
        const inQuery = !query || searchText.includes(query.toLowerCase());
        return inBranch && inStatus && inMonth && inQuery;
      }),
    [batches, branchFilter, statusFilter, monthFilter, query]
  );

  useEffect(() => {
    setOrderPage(1);
  }, [branchFilter, statusFilter, monthFilter, query]);

  const rows = useMemo(() => flattenBatches(filteredBatches), [filteredBatches]);
  const summaryGenderOptions = useMemo(
    () => ['ทุกเพศ', ...uniqueSorted(rows.map((row) => row.gender).filter(Boolean))],
    [rows]
  );
  const genderVisibleRows = useMemo(
    () =>
      summaryGenderFilter === 'ทุกเพศ'
        ? rows
        : rows.filter((row) => row.gender === summaryGenderFilter),
    [rows, summaryGenderFilter]
  );
  const typeFilterOptions = useMemo(
    () => buildTypeTotals(genderVisibleRows).map((row) => row.type),
    [genderVisibleRows]
  );
  const monthFilterOptions = useMemo(() => buildMonthFilterOptions(rows), [rows]);
  const visibleRows = useMemo(
    () =>
      typeFilter === 'ทั้งหมด'
        ? genderVisibleRows
        : genderVisibleRows.filter((row) => row.type === typeFilter),
    [genderVisibleRows, typeFilter]
  );
  const monthRows = useMemo(
    () =>
      monthFilter === 'ทุกเดือน'
        ? visibleRows
        : visibleRows.filter((row) => formatMonthLabel(row.submittedAt) === monthFilter),
    [visibleRows, monthFilter]
  );
  const metrics = useMemo(() => buildDashboardMetrics(filteredBatches), [filteredBatches]);
  const monthTotalPieces = useMemo(
    () => monthRows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
    [monthRows]
  );
  const summaryRows = useMemo(() => buildTotalSummary(monthRows), [monthRows]);
  const typeTotals = useMemo(() => buildTypeTotals(monthRows), [monthRows]);
  const sizeTotals = useMemo(() => buildSizeTotals(monthRows), [monthRows]);
  const allRows = useMemo(() => flattenBatches(batches), [batches]);
  const exportBranchOptions = useMemo(
    () => [
      'ทุกสาขา',
      ...uniqueSorted([...BRANCHES, ...batches.map((batch) => batch.branch).filter(Boolean)]),
    ],
    [batches]
  );
  const exportGenderOptions = useMemo(
    () => ['ทุกเพศ', ...uniqueSorted(allRows.map((row) => row.gender).filter(Boolean))],
    [allRows]
  );
  const exportTypeOptions = useMemo(
    () => ['ทุกแบบ', ...uniqueSorted(allRows.map((row) => row.type).filter(Boolean))],
    [allRows]
  );
  const exportSizeOptions = useMemo(
    () => [
      'ทุกไซส์',
      ...uniqueSorted(allRows.map((row) => row.size).filter(Boolean), compareSizes),
    ],
    [allRows]
  );
  const exportStatusOptions = useMemo(
    () => [
      'ทุกสถานะ',
      ...uniqueSorted(allRows.map((row) => row.status || ORDER_STATUS_PENDING).filter(Boolean)),
    ],
    [allRows]
  );
  const exportRows = useMemo(() => {
    const startKey = getMonthKeyFromInput(exportStartMonth);
    const endKey = getMonthKeyFromInput(exportEndMonth);
    return allRows.filter((row) => {
      const rowKey = getMonthKey(row.submittedAt);
      const inBranch = exportBranchFilter === 'ทุกสาขา' || row.branch === exportBranchFilter;
      const inGender = exportGenderFilter === 'ทุกเพศ' || row.gender === exportGenderFilter;
      const inType = exportTypeFilter === 'ทุกแบบ' || row.type === exportTypeFilter;
      const inSize = exportSizeFilter === 'ทุกไซส์' || row.size === exportSizeFilter;
      const inStatus =
        exportStatusFilter === 'ทุกสถานะ' ||
        (row.status || ORDER_STATUS_PENDING) === exportStatusFilter;
      const inStart = !startKey || rowKey >= startKey;
      const inEnd = !endKey || rowKey <= endKey;
      return inBranch && inGender && inType && inSize && inStatus && inStart && inEnd;
    });
  }, [
    allRows,
    exportBranchFilter,
    exportGenderFilter,
    exportTypeFilter,
    exportSizeFilter,
    exportStatusFilter,
    exportStartMonth,
    exportEndMonth,
  ]);
  const deleteConfirmBatch = useMemo(
    () => batches.find((batch) => batch.batchId === deleteConfirmBatchId) || null,
    [batches, deleteConfirmBatchId]
  );

  useEffect(() => {
    if (typeFilter !== 'ทั้งหมด' && !typeFilterOptions.includes(typeFilter)) {
      setTypeFilter('ทั้งหมด');
    }
  }, [typeFilter, typeFilterOptions]);

  useEffect(() => {
    if (summaryGenderFilter !== 'ทุกเพศ' && !summaryGenderOptions.includes(summaryGenderFilter)) {
      setSummaryGenderFilter('ทุกเพศ');
    }
  }, [summaryGenderFilter, summaryGenderOptions]);

  useEffect(() => {
    if (!monthFilterOptions.includes(monthFilter)) {
      setMonthFilter(monthFilterOptions[0] || 'ทุกเดือน');
    }
  }, [monthFilter, monthFilterOptions]);

  async function syncDashboardAction(payload) {
    const response = await authFetch('/api/dashboard/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false)
      throw new Error(result?.error || 'GAS request failed');
  }

  function findStockIssuesForStatusChange(config, batch, targetStatus) {
    if (targetStatus !== ORDER_STATUS_DELIVERED) return [];
    const issues = [];
    batch.orders.forEach((order) => {
      const gender = order.gender || GENDERS[0];
      order.items.forEach((item) => {
        if (item.status === ORDER_STATUS_DELIVERED) return; // already shipped
        if (item.size === OTHER_SIZE) return; // bypass stock check for custom sizes
        const type = item.type;
        const clothing = config.find((c) => c.type === type);
        const sizeKey = item.size;
        const requested = Number(item.qty || 0);

        if (!clothing || !sizeKey || requested <= 0) {
          issues.push(`แบบเสื้อ ${type} ไซส์ ${sizeKey || 'ไม่ระบุ'} ไม่มีข้อมูลสต็อก`);
          return;
        }

        const rows = clothing.genderSizeRows?.[gender] || clothing.sizeRows || [];
        const row = rows.find((r) => r.size === sizeKey);
        const available = Number(row?.qty || 0);
        if (available < requested) {
          issues.push(
            `แบบเสื้อ ${type} ไซส์ ${sizeKey} (${gender}) ต้องการ ${requested} ชิ้น แต่มีสต็อก ${available} ชิ้น`
          );
        }
      });
    });
    return issues;
  }

  function adjustStockForStatusChange(config, batch, targetStatus) {
    return config.map((clothing) => {
      const ordersForType = batch.orders.flatMap((order) =>
        order.items
          .filter((item) => item.type === clothing.type && item.size !== OTHER_SIZE)
          .map((item) => ({
            gender: order.gender || GENDERS[0],
            size: item.size,
            qty: Number(item.qty || 0),
            currentStatus: item.status || ORDER_STATUS_PENDING,
          }))
      );

      if (!ordersForType.length) return clothing;

      const genderSizeRows = { ...(clothing.genderSizeRows || {}) };
      let changed = false;

      ordersForType.forEach((orderItem) => {
        const gender = orderItem.gender;
        const sizeKey = orderItem.size;
        const requested = orderItem.qty;
        const wasShipped = orderItem.currentStatus === ORDER_STATUS_DELIVERED;

        let delta = 0;
        if (targetStatus === ORDER_STATUS_DELIVERED) {
          if (!wasShipped) {
            delta = -requested;
          }
        } else {
          if (wasShipped) {
            delta = requested;
          }
        }

        if (delta === 0) return;

        const rows = genderSizeRows[gender] || clothing.sizeRows || [];
        const updatedRows = rows.map((row) => {
          if (row.size !== sizeKey) return row;
          changed = true;
          return applyStockMovement(row, delta, delta < 0 ? 'withdraw' : 'restore');
        });
        genderSizeRows[gender] = updatedRows;
      });

      return changed ? { ...clothing, genderSizeRows } : clothing;
    });
  }

  async function handleBulkStatusChange(targetStatus) {
    const idsToChange = Array.from(selectedBatchIds);
    if (!idsToChange.length) return;

    const batchesToChange = batches.filter((b) => idsToChange.includes(b.batchId));

    if (targetStatus === ORDER_STATUS_DELIVERED) {
      const allIssues = [];
      const successfulBatchIds = [];
      const failedBatchIds = [];

      batchesToChange.forEach((batch) => {
        const issues = findStockIssuesForStatusChange(clothingConfig, batch, targetStatus);
        if (issues.length > 0) {
          allIssues.push({
            batchId: batch.batchId,
            branch: batch.branch,
            companyName: batch.companyName,
            errors: issues,
          });
          failedBatchIds.push(batch.batchId);
        } else {
          successfulBatchIds.push(batch.batchId);
        }
      });

      if (allIssues.length > 0) {
        if (successfulBatchIds.length === 0) {
          toast.error('ไม่สามารถจัดส่งใบสั่งซื้อได้เนื่องจากสต๊อกไม่พอ', {
            description: `พบปัญหาในทุกคำสั่งที่เลือก (${allIssues.length} คำสั่ง) กรุณาเพิ่มคลังสินค้าก่อน`,
          });
          return;
        }

        const confirmMsg = `พบปัญหาสต๊อกไม่พอกับจำนวนที่ต้องการใน ${allIssues.length} ใบสั่งซื้อ (เช่น ${allIssues[0].companyName} - ${allIssues[0].errors[0]}) ต้องการจัดส่งเฉพาะคำสั่งที่คลังสินค้าพร้อมจำนวน ${successfulBatchIds.length} รายการ หรือไม่?`;
        if (!window.confirm(confirmMsg)) {
          return;
        }

        await executeBulkStatusChange(successfulBatchIds, targetStatus);
      } else {
        await executeBulkStatusChange(idsToChange, targetStatus);
      }
    } else {
      await executeBulkStatusChange(idsToChange, targetStatus);
    }
  }

  async function executeBulkStatusChange(ids, status) {
    const statusUpdatedAt = new Date().toISOString();
    const loadingToastId = toast.loading(`กำลังอัปเดตสถานะกลุ่ม (${ids.length} รายการ)...`, {
      description: 'ระบบกำลังบันทึกข้อมูลและปรับสต๊อกสินค้า...',
    });

    let successCount = 0;
    let nextConfig = clothingConfig;

    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const batch = batches.find((b) => b.batchId === id);
        if (!batch) continue;

        await syncDashboardAction({ action: 'updateStatus', batchId: id, status, statusUpdatedAt });
        nextConfig = adjustStockForStatusChange(nextConfig, batch, status);
        successCount++;
      }

      setClothingConfig(nextConfig);
      saveClothingConfig(nextConfig);
      await publishSharedClothingConfig(nextConfig);

      await loadData({ silent: true });
      setSelectedBatchIds(new Set());
      toast.success(`อัปเดตสถานะสำเร็จ ${successCount} รายการ`, { id: loadingToastId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
          id: loadingToastId,
          description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
        });
        return;
      }
      toast.error(`ดำเนินการสำเร็จบางส่วน (${successCount} รายการ) เกิดข้อผิดพลาด`, {
        id: loadingToastId,
        description: error?.message || 'การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง',
      });
      await loadData({ silent: true });
    }
  }

  async function updateBatchStatus(batchId, status) {
    const statusUpdatedAt = new Date().toISOString();
    setStatusLoadingId(batchId);
    const loadingToastId = toast.loading('กำลังอัปเดตสถานะ...', {
      description: 'ระบบกำลังบันทึกการเปลี่ยนแปลง กรุณารอสักครู่',
    });
    const batch = batches.find((batchItem) => batchItem.batchId === batchId);
    const previousStatus = batch?.status || ORDER_STATUS_PENDING;

    const issues = findStockIssuesForStatusChange(clothingConfig, batch, status);
    if (issues.length) {
      toast.error('ไม่สามารถอัปเดตเป็นจัดส่งแล้วได้', {
        id: loadingToastId,
        description:
          issues.slice(0, 3).join('; ') +
          (issues.length > 3 ? ` และอีก ${issues.length - 3} รายการ` : ''),
      });
      setStatusLoadingId('');
      return;
    }

    try {
      await syncDashboardAction({ action: 'updateStatus', batchId, status, statusUpdatedAt });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
          id: loadingToastId,
          description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
        });
        setStatusLoadingId('');
        return;
      }
      toast.error('อัปเดตสถานะไม่สำเร็จ', {
        id: loadingToastId,
        description: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      });
      setStatusLoadingId('');
      return;
    }

    // Adjust stock configuration based on status transitions
    const nextConfig = adjustStockForStatusChange(clothingConfig, batch, status);
    setClothingConfig(nextConfig);
    saveClothingConfig(nextConfig);
    publishSharedClothingConfig(nextConfig).catch((error) => {
        if (isAuthFailure(error)) {
          setAdminToken('');
          onAuthExpired?.();
          toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
            description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
          });
          return;
        }
        toast.error('บันทึกสต็อกไม่สำเร็จ', {
          description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
        });
    });

    // Reload entire data to refresh the batch statuses from Sheet
    await loadData({ silent: true });
    setStatusLoadingId('');
    toast.success('อัปเดตสถานะคำสั่งเบิกเสื้อแล้ว', { id: loadingToastId });
  }

  async function shipBatchItems(batchId, shipmentItems) {
    const statusUpdatedAt = new Date().toISOString();
    setStatusLoadingId(batchId);
    const loadingToastId = toast.loading('กำลังบันทึกข้อมูลการจัดส่ง...', {
      description: 'ระบบกำลังอัปเดตและซิงก์คลังสินค้า...',
    });

    try {
      // 1. Update statuses on Google Sheets
      await syncDashboardAction({
        action: 'shipItems',
        batchId,
        items: shipmentItems,
        statusUpdatedAt,
      });

      // 2. Deduct shipped quantities from the local stock configuration
      let nextConfig = clothingConfig;
      shipmentItems.forEach((item) => {
        if (item.shippedQty <= 0) return;
        nextConfig = nextConfig.map((clothing) => {
          if (clothing.type !== item.type) return clothing;
          const genderSizeRows = { ...(clothing.genderSizeRows || {}) };
          const rows = genderSizeRows[item.gender] || clothing.sizeRows || [];
          const updatedRows = rows.map((row) => {
            if (row.size !== item.size) return row;
            return applyStockMovement(row, -item.shippedQty, 'withdraw');
          });
          genderSizeRows[item.gender] = updatedRows;
          return { ...clothing, genderSizeRows };
        });
      });

      setClothingConfig(nextConfig);
      saveClothingConfig(nextConfig);

      await publishSharedClothingConfig(nextConfig);

      // 3. Reload batch data to get updated row statuses from sheet
      await loadData({ silent: true });

      toast.success('บันทึกการจัดส่งสินค้าเรียบร้อยแล้ว', { id: loadingToastId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
          id: loadingToastId,
          description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
        });
      } else {
        toast.error('บันทึกการจัดส่งไม่สำเร็จ', {
          id: loadingToastId,
          description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
        });
      }
    } finally {
      setStatusLoadingId('');
    }
  }

  async function deleteBatch(batchId) {
    setDeleteLoadingId(batchId);
    const loadingToastId = toast.loading('กำลังลบคำสั่งเบิกเสื้อ...', {
      description: 'ระบบกำลังดำเนินการ กรุณารอสักครู่',
    });
    try {
      await syncDashboardAction({ action: 'deleteBatch', batchId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
          id: loadingToastId,
          description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
        });
        setDeleteLoadingId('');
        return;
      }
      toast.error('ลบคำสั่งเบิกเสื้อไม่สำเร็จ', {
        id: loadingToastId,
        description: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      });
      setDeleteLoadingId('');
      return;
    }

    setBatches((current) => {
      const next = current.filter((batch) => batch.batchId !== batchId);
      return next;
    });
    setSelectedBatch(null);
    setDeleteLoadingId('');
    toast.success('ลบคำสั่งเบิกเสื้อแล้ว', { id: loadingToastId });
  }

  function requestDeleteBatch(batchId) {
    if (!deleteLoadingId) setDeleteConfirmBatchId(batchId);
  }

  async function confirmDeleteBatch() {
    if (!deleteConfirmBatchId || deleteLoadingId) return;
    await deleteBatch(deleteConfirmBatchId);
    setDeleteConfirmBatchId('');
  }

  function clearFilters() {
    setBranchFilter('ทุกสาขา');
    setStatusFilter('ทุกสถานะ');
    setQuery('');
    setMonthFilter(formatMonthLabel(new Date()));
  }

  function exportCsv() {
    const startKey = getMonthKeyFromInput(exportStartMonth);
    const endKey = getMonthKeyFromInput(exportEndMonth);
    if (startKey && endKey && startKey > endKey) {
      toast.error('ช่วงเดือนส่งออกไม่ถูกต้อง', {
        description: 'เลือกเดือนเริ่มต้นให้อยู่ก่อนหรือเท่ากับเดือนสิ้นสุด',
      });
      return;
    }
    if (!exportRows.length) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก', {
        description: 'ลองเปลี่ยนสาขาหรือช่วงเดือนที่ต้องการส่งออก',
      });
      return;
    }
    const header = [
      'รหัสคำสั่ง',
      'สถานะ',
      'อัปเดตสถานะ',
      'วันที่',
      'ชื่อบริษัท',
      'สาขา',
      'ผู้ขอเบิก/ผู้ติดต่อ',
      'เบอร์ติดต่อ',
      'ชื่อพนักงาน',
      'เพศ',
      'ประเภท',
      'ไซส์',
      'จำนวน',
    ];
    const batchById = new Map(batches.map((batch) => [batch.batchId, batch]));
    const csv = [
      header,
      ...exportRows.map((row) => {
        const batch = batchById.get(row.batchId);
        return [
          row.batchId,
          batch?.status || ORDER_STATUS_PENDING,
          batch?.statusUpdatedAt || '',
          row.submittedAt,
          row.companyName,
          row.branch,
          row.supervisorName,
          row.supervisorPhone,
          row.name,
          row.gender,
          row.type,
          row.size,
          row.qty,
        ];
      }),
    ]
      .map((line) => line.map(csvCell).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildCsvFilename(exportBranchFilter, exportStartMonth, exportEndMonth);
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <SkeletonDashboard />;

  const orderPageSize = 8;
  const orderPageCount = Math.max(1, Math.ceil(filteredBatches.length / orderPageSize));
  const safeOrderPage = Math.min(orderPage, orderPageCount);
  const orderStartIndex = (safeOrderPage - 1) * orderPageSize;
  const orderRows = filteredBatches.slice(orderStartIndex, orderStartIndex + orderPageSize);
  const formatDashboardDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  const countByStatus = (status) => filteredBatches.filter((batch) => batch.status === status).length;
  const inventoryRows = clothingConfig
    .map((item) => {
      const sizeRows = Object.values(item.genderSizeRows || {}).flat();
      const total = sizeRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
      const sizes = Array.from(new Set(sizeRows.map((row) => row.size).filter(Boolean))).slice(0, 9);
      return {
        id: item.id,
        type: item.type,
        imageUrl: item.imageUrl,
        colors: item.colors || [],
        total,
        sizes,
      };
    })
    .slice(0, 6);
  const lowStockRows = inventoryRows
    .filter((item) => item.total <= 320)
    .sort((a, b) => a.total - b.total)
    .slice(0, 3);
  const stockSummaryRows = clothingConfig
    .flatMap((item) =>
      GENDERS.flatMap((gender) => {
        const rows = item.genderSizeRows?.[gender] || item.sizeRows || [];
        return rows.map((row) => ({
          id: `${item.id}-${gender}-${row.size}`,
          type: item.type,
          gender,
          size: row.size,
          ...getStockLedgerSummary(row),
        }));
      })
    )
    .sort((a, b) => b.withdrawn - a.withdrawn || a.type.localeCompare(b.type, 'th'))
    .slice(0, 8);
  const stockSummaryTotals = stockSummaryRows.reduce(
    (totals, row) => ({
      totalStock: totals.totalStock + row.totalStock,
      withdrawn: totals.withdrawn + row.withdrawn,
      remaining: totals.remaining + row.remaining,
    }),
    { totalStock: 0, withdrawn: 0, remaining: 0 }
  );
  const selectedPieces = Array.from(selectedBatchIds).reduce((sum, id) => {
    const batch = batches.find((item) => item.batchId === id);
    return sum + (batch ? getBatchPieces(batch) : 0);
  }, 0);

  return (
    <>
      {dataError && (
        <DashboardDataNotice
          message={getDashboardLoadErrorDescription({ message: dataError })}
          detail="แดชบอร์ดจะแสดงเฉพาะข้อมูลจริงจาก Google Sheets เท่านั้น ไม่มีการดึงข้อมูลคำสั่งเบิกจากเครื่องนี้"
          onRetry={() => loadData({ silent: true })}
          refreshing={refreshing}
        />
      )}

      {activeView === 'dashboard' && (
        <section className="dashboard-overview-page">
          <div className="dashboard-overview-hero">
            <div>
              <h2>ภาพรวมการดำเนินงาน</h2>
            <p>ติดตามสถานะคำสั่งเบิกและจุดที่ต้องจัดการต่อ</p>
            </div>
            <div className="dashboard-panel-actions">
              <button onClick={() => loadData({ silent: true })} disabled={refreshing}>
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                <span>โหลดข้อมูลใหม่</span>
              </button>
              <button className="dark" onClick={() => onViewChange?.('inventory')}>
                <Shirt className="size-4" />
                <span>จัดการสต็อก</span>
              </button>
            </div>
          </div>
          <div className="dashboard-overview-stats">
            <Stat icon={ClipboardList} value={filteredBatches.length} label="คำสั่งเบิกทั้งหมด" />
            <Stat icon={Clock} value={countByStatus(ORDER_STATUS_PENDING)} label="รอดำเนินการ" />
            <Stat icon={Truck} value={`${metrics.backorderPieces} ชิ้น`} label="รอของ" />
            <Stat icon={PackageCheck} value={`${metrics.shippedPieces} ชิ้น`} label="จัดส่งแล้ว" />
          </div>
          <div className="dashboard-stock-summary">
            <div className="dashboard-panel-head slim">
              <div>
                <h2>สรุปสต็อกเสื้อ</h2>
                <p>ดูจำนวนที่เคยมี เบิกแล้ว และคงเหลือ แยกตามแบบเสื้อ เพศ และไซส์</p>
              </div>
              <div className="dashboard-stock-summary-totals">
                <span>เคยมี {stockSummaryTotals.totalStock} ชิ้น</span>
                <span>เบิก {stockSummaryTotals.withdrawn} ชิ้น</span>
                <span>เหลือ {stockSummaryTotals.remaining} ชิ้น</span>
              </div>
            </div>
            <div className="dashboard-stock-ledger">
              <div className="dashboard-stock-ledger-head">
                <span>แบบเสื้อ</span>
                <span>เพศ/ไซส์</span>
                <span>เคยมี</span>
                <span>เบิก</span>
                <span>เหลือ</span>
              </div>
              {stockSummaryRows.map((row) => (
                <div className="dashboard-stock-ledger-row" key={row.id}>
                  <strong>{row.type}</strong>
                  <span>{row.gender} / {row.size || '-'}</span>
                  <span>{row.totalStock}</span>
                  <span>{row.withdrawn}</span>
                  <span>{row.remaining}</span>
                </div>
              ))}
              {!stockSummaryRows.length && (
                <div className="dashboard-stock-ledger-empty">ยังไม่มีข้อมูลสต็อก</div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className={cn('dashboard-console', activeView === 'orders' && 'orders-only', activeView !== 'orders' && 'hidden')}>
        <aside className="dashboard-filter-rail">
          <div className="dashboard-panel-title">
            <h2>ตัวกรอง</h2>
            <button type="button" onClick={clearFilters} title="ล้างตัวกรอง">
              <Eraser className="size-4" />
            </button>
          </div>
          <Field label="สาขา">
            <Select value={branchFilter} onChange={setBranchFilter} values={['ทุกสาขา', ...BRANCHES]} />
          </Field>
          <Field label="เดือน">
            <Select value={monthFilter} onChange={setMonthFilter} values={monthFilterOptions} />
          </Field>
          <Field label="สถานะ">
            <Select value={statusFilter} onChange={setStatusFilter} values={['ทุกสถานะ', ...ORDER_STATUSES]} />
          </Field>
          <Field label="ค้นหา">
            <TextInput
              value={query}
              onChange={setQuery}
              placeholder="เลขที่คำสั่งเบิก, ผู้ขอ, เบอร์โทร"
            />
          </Field>
          <button className="dashboard-primary-action" onClick={clearFilters}>
            ล้างตัวกรอง
          </button>
        </aside>

        <section className="dashboard-orders-panel">
          <div className="dashboard-panel-head">
            <div>
              <h2>รายการคำสั่งเบิก</h2>
              <p>ทั้งหมด {filteredBatches.length} รายการ</p>
            </div>
            <div className="dashboard-panel-actions">
              <button onClick={() => loadData({ silent: true })} disabled={refreshing}>
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              </button>
              <button onClick={() => setExportExpanded((value) => !value)}>
                <Download className="size-4" />
                <span>ส่งออก</span>
              </button>
            </div>
          </div>

          {exportExpanded && (
            <div className="dashboard-export-strip">
              <Field label="สาขา">
                <Select value={exportBranchFilter} onChange={setExportBranchFilter} values={exportBranchOptions} />
              </Field>
              <Field label="ตั้งแต่เดือน">
                <MonthInput value={exportStartMonth} onChange={setExportStartMonth} />
              </Field>
              <Field label="ถึงเดือน">
                <MonthInput value={exportEndMonth} onChange={setExportEndMonth} />
              </Field>
              <button onClick={exportCsv} disabled={!exportRows.length}>
                <Download className="size-4" /> CSV ({exportRows.length})
              </button>
            </div>
          )}

          <div className="dashboard-table-wrap">
            <table className="dashboard-batch-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        filteredBatches.length > 0 &&
                        filteredBatches.every((batch) => selectedBatchIds.has(batch.batchId))
                      }
                      onChange={() => {
                        const allSelected = filteredBatches.every((batch) => selectedBatchIds.has(batch.batchId));
                        setSelectedBatchIds((prev) => {
                          const next = new Set(prev);
                          filteredBatches.forEach((batch) => {
                            if (allSelected) next.delete(batch.batchId);
                            else next.add(batch.batchId);
                          });
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th>เลขที่คำสั่งเบิก</th>
                  <th>วันที่ทำรายการ</th>
                  <th>สาขา</th>
                  <th>ผู้ขอเบิก</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>กำหนดส่ง</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {orderRows.map((batch) => (
                  <tr key={batch.batchId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedBatchIds.has(batch.batchId)}
                        onChange={() => {
                          setSelectedBatchIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(batch.batchId)) next.delete(batch.batchId);
                            else next.add(batch.batchId);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <button className="dashboard-link" onClick={() => setSelectedBatch(batch)}>
                        {batch.batchId}
                      </button>
                    </td>
                    <td>{formatDashboardDate(batch.submittedAt)}</td>
                    <td>{batch.branch || '-'}</td>
                    <td>{batch.supervisorName || batch.companyName || '-'}</td>
                    <td>{getBatchPieces(batch)}</td>
                    <td>
                      <StatusBadge status={batch.status} />
                    </td>
                    <td>{formatDashboardDate(batch.statusUpdatedAt || batch.submittedAt)}</td>
                    <td>
                      <button className="dashboard-icon-btn" onClick={() => setSelectedBatch(batch)}>
                        <ChevronDown className="size-4 -rotate-90" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dashboard-mobile-orders">
            {orderRows.map((batch) => (
              <article
                key={batch.batchId}
                className="dashboard-mobile-order-card"
                onClick={() => setSelectedBatch(batch)}
              >
                <div className="dashboard-mobile-order-top">
                  <div>
                    <strong>{batch.batchId}</strong>
                    <span>{formatDashboardDate(batch.submittedAt)}</span>
                  </div>
                  <ChevronDown className="size-4 -rotate-90" />
                </div>
                <div className="dashboard-mobile-order-grid">
                  <span>สาขา <strong>{batch.branch || '-'}</strong></span>
                  <span>ผู้ขอ <strong>{batch.supervisorName || batch.companyName || '-'}</strong></span>
                  <span>จำนวน <strong>{getBatchPieces(batch)} ตัว</strong></span>
                  <span>กำหนดส่ง <strong>{formatDashboardDate(batch.statusUpdatedAt || batch.submittedAt)}</strong></span>
                </div>
                <div className="dashboard-mobile-order-bottom">
                  <StatusBadge status={batch.status} />
                  <button type="button">ดูรายละเอียด</button>
                </div>
              </article>
            ))}
          </div>

          <div className="dashboard-panel-foot">
            <span>แสดง 1 - {orderRows.length} จาก {filteredBatches.length} รายการ</span>
            <div>
              <button disabled={safeOrderPage <= 1} onClick={() => setOrderPage((page) => Math.max(1, page - 1))}>
                <ArrowLeft className="size-4" />
              </button>
              <strong>{safeOrderPage}</strong>
              <button
                disabled={safeOrderPage >= orderPageCount}
                onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>

        <aside className="dashboard-insight-panel">
          <div className="dashboard-panel-head slim">
            <div>
              <h2>ภาพรวมการดำเนินงาน</h2>
              <p>ข้อมูล ณ {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
            </div>
          </div>
          <div className="dashboard-kpi-grid">
            <MiniMetric label="คำสั่งเบิกทั้งหมด" value={filteredBatches.length} />
            <MiniMetric label="กำลังดำเนินการ" value={countByStatus(ORDER_STATUS_PENDING)} />
            <MiniMetric label="จัดส่งแล้ว" value={countByStatus(ORDER_STATUS_DELIVERED)} />
          </div>
          <div className="dashboard-alert-card">
            <div className="dashboard-section-title">
              <h3>สถานะที่ต้องติดตาม</h3>
            </div>
            <p><span className="dot red" /> รอจัดส่ง <strong>{countByStatus(ORDER_STATUS_PENDING)} รายการ</strong></p>
            <p><span className="dot amber" /> รอของ <strong>{countByStatus(ORDER_STATUS_BACKORDER)} รายการ</strong></p>
          </div>
          <div className="dashboard-alert-card">
            <div className="dashboard-section-title">
              <h3>แจ้งเตือนสต็อกต่ำ</h3>
            </div>
            {lowStockRows.length ? (
              lowStockRows.map((item) => (
                <p key={item.id}>
                  {item.type} <strong>คงเหลือ {item.total} ชิ้น</strong>
                </p>
              ))
            ) : (
              <p>สต็อกอยู่ในระดับปกติ <strong>{inventoryRows.length} รายการ</strong></p>
            )}
          </div>
        </aside>
      </section>

      {activeView === 'inventory' && (
        <section className="dashboard-inventory-manager">
          <div className="dashboard-panel-head">
            <div>
              <h2>จัดการแบบเสื้อและสต็อกไซส์</h2>
              <p>เพิ่มแบบเสื้อ อัปโหลดรูปภาพ แก้สี ไซส์ และจำนวนคงเหลือ</p>
            </div>
            <div className="dashboard-panel-actions">
              <button onClick={() => onViewChange?.('orders')}>
                <ClipboardList className="size-4" />
                <span>กลับไปรายการคำสั่งเบิก</span>
              </button>
            </div>
          </div>
          <InventoryManager
            config={clothingConfig}
            setConfig={setClothingConfig}
            onAuthExpired={onAuthExpired}
          />
        </section>
      )}

      {selectedBatchIds.size > 0 && (
        <div className="dashboard-bulk-bar">
          <div>
            <strong>{selectedBatchIds.size} รายการที่เลือก</strong>
            <span>{selectedPieces} ชิ้น</span>
          </div>
          <button onClick={() => handleBulkStatusChange(ORDER_STATUS_DELIVERED)}>
            <CheckSquare className="size-4" /> จัดส่งแล้ว
          </button>
          <button onClick={() => handleBulkStatusChange(ORDER_STATUS_BACKORDER)}>
            <Clock className="size-4" /> รอของ
          </button>
          <button onClick={() => setSelectedBatchIds(new Set())}>ยกเลิก</button>
        </div>
      )}

      <BatchDetailDialog
        batch={selectedBatch}
        onClose={() => setSelectedBatch(null)}
        onStatusChange={updateBatchStatus}
        onDelete={requestDeleteBatch}
        statusLoadingId={statusLoadingId}
        deleteLoadingId={deleteLoadingId}
        onShipClick={() => setShipmentDialogOpen(true)}
      />
      <PartialShipmentDialog
        open={shipmentDialogOpen}
        onClose={() => setShipmentDialogOpen(false)}
        batch={selectedBatch}
        clothingConfig={clothingConfig}
        onShipConfirm={shipBatchItems}
      />
      <ConfirmDialog
        open={Boolean(deleteConfirmBatch)}
        title="ยืนยันลบคำสั่งเบิกเสื้อ"
        description={deleteConfirmBatch ? `ลบคำสั่งเบิกเสื้อ ${deleteConfirmBatch.batchId}?` : ''}
        confirmLabel="ลบคำสั่ง"
        cancelLabel="ยกเลิก"
        loading={Boolean(deleteConfirmBatch && deleteLoadingId === deleteConfirmBatch.batchId)}
        destructive
        onCancel={() => !deleteLoadingId && setDeleteConfirmBatchId('')}
        onConfirm={confirmDeleteBatch}
      />
    </>
  );

}

function TypeFilterChips({
  value,
  onChange,
  options,
  genderValue = '',
  onGenderChange,
  genderOptions = [],
  monthFilter,
  onMonthFilterChange,
  monthOptions = [],
  totalPieces,
}) {
  const choices = ['ทั้งหมด', ...options];
  const showGenderFilter = Boolean(genderValue && onGenderChange && genderOptions.length);
  const showMonthFilter = Boolean(monthFilter && onMonthFilterChange && monthOptions.length);
  return (
    <div className="min-w-0 rounded-xl border border-[#E4E4E7] bg-white p-3 shadow-sm lg:flex lg:items-end lg:justify-between lg:gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[15rem] lg:shrink-0 lg:items-end">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[#071638]">กรองข้อมูล</h2>
          <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
            เลือกเดือน เพศ และแบบเสื้อที่ต้องการดู
          </p>
        </div>
        {typeof totalPieces === 'number' && (
          <div className="shrink-0 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-right">
            <p className="text-xs font-bold text-[#71717A]">ยอดรวม</p>
            <p className="text-xl font-black text-[#18181B]">
              {totalPieces} <span className="text-xs font-bold text-[#71717A]">ชิ้น</span>
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:flex sm:items-end sm:flex-wrap lg:mt-0 lg:flex-nowrap lg:justify-end">
        {showMonthFilter && (
          <div className="w-full sm:w-44 lg:w-48">
            <Field label="เดือน">
              <Select value={monthFilter} onChange={onMonthFilterChange} values={monthOptions} />
            </Field>
          </div>
        )}
        {showGenderFilter && (
          <div className="w-full sm:w-36 lg:w-36">
            <Field label="เพศ">
              <Select value={genderValue} onChange={onGenderChange} values={genderOptions} />
            </Field>
          </div>
        )}
        <div className="w-full sm:w-44 lg:w-48">
          <Field label="แบบเสื้อ">
            <Select value={value} onChange={onChange} values={choices} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function EmployeeWithdrawalList({ rows, totalRows = rows.length }) {
  const [listQuery, setListQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('ทุกเพศ');
  const [branchFilter, setBranchFilter] = useState('ทุกสาขา');
  const [sizeFilter, setSizeFilter] = useState('ทุกไซส์');
  const [statusFilter, setStatusFilter] = useState('ทุกสถานะ');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const activeAdvancedCount = [
    branchFilter !== 'ทุกสาขา',
    sizeFilter !== 'ทุกไซส์',
    statusFilter !== 'ทุกสถานะ',
  ].filter(Boolean).length;
  const normalizedQuery = listQuery.trim().toLowerCase();
  const genderOptions = useMemo(
    () => ['ทุกเพศ', ...uniqueSorted(rows.map((row) => row.gender).filter(Boolean))],
    [rows]
  );
  const branchOptions = useMemo(
    () => ['ทุกสาขา', ...uniqueSorted(rows.map((row) => row.branch).filter(Boolean))],
    [rows]
  );
  const sizeOptions = useMemo(
    () => ['ทุกไซส์', ...uniqueSorted(rows.map((row) => row.size).filter(Boolean), compareSizes)],
    [rows]
  );
  const statusOptions = useMemo(
    () => [
      'ทุกสถานะ',
      ...uniqueSorted(rows.map((row) => row.status || ORDER_STATUS_PENDING).filter(Boolean)),
    ],
    [rows]
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const inGender = genderFilter === 'ทุกเพศ' || row.gender === genderFilter;
        const inBranch = branchFilter === 'ทุกสาขา' || row.branch === branchFilter;
        const inSize = sizeFilter === 'ทุกไซส์' || row.size === sizeFilter;
        const inStatus =
          statusFilter === 'ทุกสถานะ' || (row.status || ORDER_STATUS_PENDING) === statusFilter;
        const searchText = [
          row.batchId,
          row.name,
          row.gender,
          row.branch,
          row.companyName,
          row.supervisorName,
          row.supervisorPhone,
          row.type,
          row.size,
          row.qty,
          row.status,
        ]
          .join(' ')
          .toLowerCase();
        const inQuery = !normalizedQuery || searchText.includes(normalizedQuery);
        return inGender && inBranch && inSize && inStatus && inQuery;
      }),
    [rows, normalizedQuery, genderFilter, branchFilter, sizeFilter, statusFilter]
  );
  const totalPieces = filteredRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);

  function clearListFilters() {
    setListQuery('');
    setGenderFilter('ทุกเพศ');
    setBranchFilter('ทุกสาขา');
    setSizeFilter('ทุกไซส์');
    setStatusFilter('ทุกสถานะ');
  }

  if (!rows.length) return <EmptyDashboardState text="ยังไม่มีรายการเบิกตามเงื่อนไขที่เลือก" />;

  const columns = [
    { label: 'วันที่', className: 'min-w-[10rem]' },
    { label: 'พนักงาน', className: 'min-w-[12rem]' },
    { label: 'เพศ', className: 'min-w-[5rem]' },
    { label: 'สาขา', className: 'min-w-[10rem]' },
    { label: 'ประเภท', className: 'min-w-[9rem]' },
    { label: 'ไซส์', className: 'min-w-[5rem]' },
    { label: 'จำนวน', className: 'min-w-[5rem]' },
    { label: 'สถานะ', className: 'min-w-[7rem]' },
    { label: 'รหัสคำสั่ง', className: 'min-w-[10rem]' },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-3 border-b border-[#E7EAF0] px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-[#071638]">รายการแยกรายคน</h2>
          <p className="mt-1 hidden text-sm font-semibold text-[#64748B] sm:block">
            ค้นหาและกรองข้อมูลพนักงานจากเพศ สาขา ไซส์ และสถานะในหน้าเดียว
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(14rem,1.5fr)_10rem_auto] sm:items-end">
          <div className="relative min-w-0">
            <span className="mb-1.5 block text-xs font-bold text-[#44536A]">ค้นหา</span>
            <Search className="pointer-events-none absolute left-3 top-[2.25rem] size-4 text-[#71717A]" />
            <GridInput
              value={listQuery}
              onChange={setListQuery}
              placeholder="ค้นหาชื่อ สาขา บริษัท เสื้อ ไซส์ หรือรหัสคำสั่ง"
              className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white pl-10 pr-3 text-sm font-semibold text-[#071638] outline-none transition placeholder:text-[#94A3B8] focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10"
            />
          </div>
          <Field label="เพศ">
            <Select value={genderFilter} onChange={setGenderFilter} values={genderOptions} />
          </Field>
          <button
            onClick={() => setShowAdvancedFilters((v) => !v)}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-bold text-[#002B5B] shadow-sm"
          >
            ตัวกรองเพิ่มเติม
            {activeAdvancedCount > 0 && (
              <span className="rounded-full bg-[#002B5B] px-1.5 py-0.5 text-[10px] font-black text-white">
                {activeAdvancedCount}
              </span>
            )}
            <ChevronDown
              className={cn('size-3.5 transition', showAdvancedFilters && 'rotate-180')}
            />
          </button>
        </div>
        {showAdvancedFilters && (
          <div className="grid min-w-0 gap-2 sm:grid-cols-[12rem_10rem_10rem_auto] sm:items-end">
            <Field label="สาขา">
              <Select value={branchFilter} onChange={setBranchFilter} values={branchOptions} />
            </Field>
            <Field label="ไซส์">
              <Select value={sizeFilter} onChange={setSizeFilter} values={sizeOptions} />
            </Field>
            <Field label="สถานะ">
              <Select value={statusFilter} onChange={setStatusFilter} values={statusOptions} />
            </Field>
            <button
              onClick={clearListFilters}
              className="min-h-11 rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-bold text-[#002B5B] shadow-sm"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-center text-sm font-black text-[#18181B]">
            {filteredRows.length}/{totalRows} รายการ
          </div>
          <span className="rounded-lg bg-[#EEF4FF] px-3 py-2 text-sm font-black text-[#002B5B]">
            รวม {totalPieces} ชิ้น
          </span>
        </div>
      </div>
      <div className="grid gap-2 p-3 md:hidden">
        {filteredRows.map((row) => (
          <WithdrawalMobileCard key={row.id} row={row} />
        ))}
        {!filteredRows.length && (
          <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center font-bold text-[#64748B]">
            ไม่พบรายการตามตัวกรอง
          </div>
        )}
      </div>
      <div className="employee-scroll-region hidden overflow-auto md:block">
        <table className="w-full min-w-[980px] table-fixed text-center text-sm">
          <thead className="sticky top-0 z-10 bg-[#EEF4FF] text-xs font-extrabold text-[#44536A]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  className={cn(
                    'border-b border-[#D8DEEA] px-3 py-3.5 text-center align-middle',
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#E7EAF0] align-middle hover:bg-[#F8FAFC]"
              >
                <td className="px-3 py-4 text-center font-semibold leading-6 text-[#44536A]">
                  {new Date(row.submittedAt).toLocaleString('th-TH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="break-words px-3 py-4 text-center font-extrabold leading-6 text-[#071638]">
                  {row.name || '-'}
                </td>
                <td className="px-3 py-4 text-center leading-6">{row.gender || '-'}</td>
                <td className="break-words px-3 py-4 text-center font-bold leading-6 text-[#002B5B]">
                  {row.branch || '-'}
                </td>
                <td className="break-words px-3 py-4 text-center font-bold leading-6">
                  {row.type || '-'}
                </td>
                <td className="px-3 py-4 text-center font-bold leading-6">{row.size || '-'}</td>
                <td className="px-3 py-4 text-center font-extrabold leading-6">{row.qty}</td>
                <td className="px-3 py-4 text-center">
                  <StatusBadge status={row.status || ORDER_STATUS_PENDING} />
                </td>
                <td className="break-words px-3 py-4 text-center font-bold leading-6 text-[#64748B]">
                  {row.batchId}
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center font-bold text-[#64748B]"
                >
                  ไม่พบรายการตามตัวกรอง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function WithdrawalMobileCard({ row }) {
  return (
    <article className="min-w-0 rounded-lg border border-[#D8DEEA] bg-white p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-extrabold leading-5 text-[#071638]">
            {row.name || '-'}
          </h3>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-[#64748B]">
            {row.batchId}
          </p>
        </div>
        <StatusBadge status={row.status || ORDER_STATUS_PENDING} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MobileInfo
          label="วันที่"
          value={new Date(row.submittedAt).toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        />
        <MobileInfo label="เพศ" value={row.gender || '-'} />
        <MobileInfo label="สาขา" value={row.branch || '-'} />
        <MobileInfo label="รหัสคำสั่ง" value={row.batchId || '-'} />
      </div>
      <div className="mt-3 rounded-lg bg-[#F4F7FC] p-3">
        <p className="break-words text-sm font-extrabold text-[#071638]">{row.type || '-'}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <MobileInfo label="ไซส์" value={row.size || '-'} compact />
          <MobileInfo label="จำนวน" value={row.qty || '-'} compact strong />
        </div>
      </div>
    </article>
  );
}

function MobileInfo({ label, value, compact = false, strong = false }) {
  return (
    <div className={cn('min-w-0 rounded-lg bg-[#F8FAFC] px-2.5 py-2', compact && 'bg-white')}>
      <p className="truncate text-[11px] font-bold text-[#64748B]">{label}</p>
      <p
        className={cn(
          'mt-0.5 break-words text-xs leading-5 text-[#071638]',
          strong ? 'font-black' : 'font-bold'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function getBatchShipmentProgress(batch) {
  const items = batch.orders.flatMap((o) => o.items);
  if (!items.length) return { shipped: 0, total: 0, percent: 0 };
  const total = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const shipped = items
    .filter((item) => item.status === ORDER_STATUS_DELIVERED)
    .reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const percent = total > 0 ? Math.round((shipped / total) * 100) : 0;
  return { shipped, total, percent };
}

function DashboardOrderCard({
  batch,
  onOpen,
  onStatusChange,
  onDelete,
  statusLoadingId = '',
  deleteLoadingId = '',
  isSelected = false,
  onToggleSelect = null,
}) {
  const totalPieces = getBatchPieces(batch);
  const totalEmployees = batch.orders.length;
  const isUpdatingStatus = statusLoadingId === batch.batchId;
  const isDeleting = deleteLoadingId === batch.batchId;
  const isBusy = isUpdatingStatus || isDeleting;
  function confirmDelete() {
    if (!isBusy) onDelete(batch.batchId);
  }

  return (
    <div
      data-dashboard-order={batch.status === ORDER_STATUS_DELIVERED ? 'delivered' : 'pending'}
      className={cn(
        'dashboard-order-card rounded-xl border p-3 text-left shadow-sm transition hover:border-[#9EB7DD]',
        isSelected ? 'border-[#002B5B] bg-[#F4F8FF]' : 'border-[#D8DEEA] bg-white/96'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-1 size-4 shrink-0 rounded border-[#CBD5E1] text-[#002B5B] focus:ring-[#DCE8FF] cursor-pointer"
            />
          )}
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[#64748B]">{batch.batchId}</p>
            <h3 className="mt-0.5 truncate text-base font-extrabold text-[#071638]">
              {batch.companyName || 'ไม่ระบุบริษัท'}
            </h3>
            <p className="mt-0.5 text-sm font-bold text-[#002B5B]">{batch.branch}</p>
            <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
              {new Date(batch.submittedAt).toLocaleString('th-TH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </div>
        <StatusBadge status={batch.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniMetric label="บริษัท" value={batch.companyName || '-'} />
        <MiniMetric label="ผู้ติดต่อ" value={batch.supervisorName || '-'} />
        <MiniMetric label="พนักงาน" value={totalEmployees} />
        <MiniMetric label="จำนวน" value={`${totalPieces} ชิ้น`} />
      </div>
      {/* Shipment Progress Bar */}
      {(() => {
        const { shipped, total, percent } = getBatchShipmentProgress(batch);
        if (total === 0) return null;
        return (
          <div className="mt-3 rounded-xl bg-[#F1F5F9] p-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#44536A] mb-1">
              <span>ความคืบหน้าการจัดส่ง</span>
              <span>
                {shipped} จาก {total} ตัว ({percent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#10B981] transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })()}
      <p className="mt-2 text-xs font-semibold text-[#64748B]">
        อัปเดตสถานะ:{' '}
        {new Date(batch.statusUpdatedAt).toLocaleString('th-TH', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {buildTypeTotals(flattenBatches([batch])).map((row) => (
          <span
            key={row.type}
            className="rounded-full border border-[#D8DEEA] px-2.5 py-1 text-xs font-bold text-[#44536A]"
          >
            {row.type}: {row.qty}
          </span>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="สถานะ">
          <Select
            value={batch.status}
            values={ORDER_STATUSES}
            disabled={isBusy}
            onChange={(status) => onStatusChange(batch.batchId, status)}
          />
        </Field>
        <button
          onClick={onOpen}
          disabled={isBusy}
          className="min-h-11 rounded-lg bg-[#002B5B] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          ดูรายละเอียด
        </button>
        <button
          onClick={confirmDelete}
          disabled={isBusy}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 font-bold text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isDeleting ? 'กำลังลบ' : 'ลบ'}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  let classes = 'bg-[#CBD5E1] text-[#334155]'; // default/gray
  if (status === ORDER_STATUS_DELIVERED) {
    classes = 'bg-[#DCFCE7] text-[#166534]'; // green
  } else if (status === ORDER_STATUS_PENDING) {
    classes = 'bg-[#FEE2E2] text-[#991B1B]'; // red (waiting shipment)
  } else if (status === ORDER_STATUS_BACKORDER || status === 'รอของ') {
    classes = 'bg-[#FFEDD5] text-[#9A3412]'; // orange (waiting stock)
  } else if (status === 'จัดส่งบางส่วน (รอของ)' || status.includes('บางส่วน')) {
    classes = 'bg-[#FEF9C3] text-[#854D0E]'; // yellow/brown (partial)
  }
  return (
    <span
      data-status={status}
      className={cn(
        'status-badge inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold',
        classes
      )}
    >
      {status}
    </span>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#F4F7FC] px-2.5 py-2">
      <p className="truncate text-xs font-bold text-[#64748B]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold text-[#071638]">{value}</p>
    </div>
  );
}

function TotalSummaryView({ summaryRows, typeTotals, sizeTotals, filteredRows, monthFilter }) {
  const [typeChart, setTypeChart] = useState('donut');
  const totalPieces = filteredRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const chartColors = ['#002B5B', '#2F6FB0', '#7CA7D8', '#94A3B8', '#0F172A'];
  const donutGradient = buildDonutGradient(typeTotals, chartColors);
  const maxTypeQty = Math.max(1, ...typeTotals.map((row) => Number(row.qty || 0)));
  const chartOptions = [
    { value: 'donut', label: 'วงกลม', icon: PieChart },
    { value: 'bar', label: 'แท่ง', icon: BarChart3 },
    { value: 'list', label: 'รายการ', icon: ClipboardList },
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(22rem,.8fr)_minmax(0,1.2fr)] lg:items-start">
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-[#071638]">ยอดรวมตามประเภทเสื้อ</h2>
            <div className="mt-2 inline-grid grid-cols-3 overflow-hidden rounded-lg border border-[#D8E3F5] bg-[#F8FAFC] p-1">
              {chartOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTypeChart(value)}
                  aria-pressed={typeChart === value}
                  className={cn(
                    'flex min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-black text-[#64748B] transition',
                    typeChart === value && 'bg-[#002B5B] text-white shadow-sm'
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <span className="shrink-0 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-1 text-sm font-black text-[#18181B]">
            {totalPieces} ชิ้น
          </span>
        </div>
        {typeTotals.length ? (
          <>
            {typeChart === 'donut' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(11rem,.8fr)_minmax(0,1fr)] sm:items-center">
                <div className="grid min-h-52 min-w-0 place-items-center">
                  <div
                    className="relative grid size-44 place-items-center rounded-full shadow-inner"
                    style={{ background: donutGradient }}
                    aria-label={`ยอดรวมตามประเภทเสื้อ ${totalPieces} ชิ้น`}
                  >
                    <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow-sm">
                      <div>
                        <p className="text-xs font-bold text-[#64748B]">รวม</p>
                        <p className="text-xl font-black leading-none text-[#071638]">
                          {totalPieces}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-[#64748B]">ชิ้น</p>
                      </div>
                    </div>
                  </div>
                </div>
                <TypeTotalLegend rows={typeTotals} colors={chartColors} />
              </div>
            )}
            {typeChart === 'bar' && (
              <div className="mt-4 grid gap-3">
                {typeTotals.map((row, index) => (
                  <div key={row.type} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                      <span className="flex min-w-0 items-center gap-2 text-[#071638]">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <span className="truncate">{row.type}</span>
                      </span>
                      <span className="shrink-0 text-[#002B5B]">{row.qty} ชิ้น</span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-[#E5ECF7]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(7, (row.qty / maxTypeQty) * 100)}%`,
                          backgroundColor: chartColors[index % chartColors.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {typeChart === 'list' && (
              <TypeTotalLegend rows={typeTotals} colors={chartColors} className="mt-4" />
            )}
          </>
        ) : (
          <EmptyDashboardState text="ยังไม่มียอดรวม" compact />
        )}
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-[#071638]">ไซส์ที่เบิก: {monthFilter}</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
              รวมจำนวนตามไซส์ ก่อนลงรายละเอียดแบบเสื้อ
            </p>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#D8E3F5] bg-[#F8FAFC] px-3 text-sm font-black text-[#002B5B]">
            <CalendarDays className="size-4" /> {totalPieces} ชิ้น
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-[#E2E8F0]">
          {sizeTotals.length ? (
            <table className="w-full table-fixed text-center text-sm">
              <thead className="bg-[#EEF4FF] text-xs font-bold text-[#44536A]">
                <tr>
                  <th className="px-4 py-2.5 text-center">เพศ</th>
                  <th className="px-4 py-2.5 text-center">ไซส์</th>
                  <th className="px-4 py-2.5 text-center">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {sizeTotals.map((row) => (
                  <tr key={`${row.gender}-${row.size}`} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3 font-black text-[#002B5B]">{row.gender || '-'}</td>
                    <td className="px-4 py-3 font-bold">{row.size}</td>
                    <td className="px-4 py-3 font-extrabold">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyDashboardState text="ยังไม่มีข้อมูลไซส์ในเดือนนี้" compact />
          )}
        </div>

        <div className="mt-4 border-t border-[#E7EAF0] pt-3">
          <h3 className="text-sm font-extrabold text-[#071638]">
            รายละเอียดตามแบบเสื้อ และไซส์
          </h3>
        </div>
        <div className="mt-3 grid gap-2 sm:hidden">
          {summaryRows.length ? (
            summaryRows.map((row) => (
              <SummaryMobileRow key={`${row.type}-${row.size}`} row={row} />
            ))
          ) : (
            <EmptyDashboardState text="ยังไม่มีข้อมูล" compact />
          )}
        </div>
        <div className="mt-3 hidden overflow-hidden rounded-xl border border-[#E2E8F0] sm:block">
          <table className="w-full table-fixed text-center text-sm">
            <thead className="bg-[#EEF4FF] text-xs font-bold text-[#44536A]">
              <tr>
                <th className="px-4 py-2.5 text-center align-middle">ประเภท</th>
                <th className="px-4 py-2.5 text-center align-middle">ไซส์</th>
                <th className="px-4 py-2.5 text-center align-middle">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.length ? (
                summaryRows.map((row) => (
                  <tr
                    key={`${row.type}-${row.size}`}
                    className="border-t border-[#E2E8F0]"
                  >
                    <td className="break-words px-4 py-3 text-center align-middle font-bold">
                      {row.type}
                    </td>
                    <td className="px-4 py-3 text-center align-middle font-bold">{row.size}</td>
                    <td className="px-4 py-3 text-center align-middle font-extrabold">{row.qty}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center font-bold text-[#64748B]">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryMobileRow({ row }) {
  return (
    <div className="rounded-lg border border-[#D8DEEA] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-extrabold text-[#071638]">
            {row.name || row.type || '-'}
          </p>
          {row.name && (
            <p className="mt-1 break-words text-xs font-bold text-[#64748B]">{row.type || '-'}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-[#E5EFFD] px-3 py-1 text-sm font-black text-[#002B5B]">
          {row.qty} ชิ้น
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
        <MobileInfo label="ไซส์" value={row.size || '-'} compact />
      </div>
    </div>
  );
}

function TypeTotalLegend({ rows, colors, className }) {
  return (
    <div className={cn('grid gap-2', className)}>
      {rows.map((row, index) => (
        <div
          key={row.type}
          className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="truncate text-sm font-extrabold text-[#071638]">{row.type}</span>
          </span>
          <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-sm font-black text-[#002B5B]">
            {row.qty} ชิ้น
          </span>
        </div>
      ))}
    </div>
  );
}

function PartialShipmentDialog({ open, onClose, batch, clothingConfig, onShipConfirm }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!batch) return;
    const flatItems = batch.orders.flatMap((order) => {
      const gender = order.gender || GENDERS[0];
      return order.items.map((item) => {
        const clothing = clothingConfig.find((c) => c.type === item.type);
        const rows = clothing?.genderSizeRows?.[gender] || clothing?.sizeRows || [];
        const stockRow = rows.find((r) => r.size === item.size);
        const currentStock = Number(stockRow?.qty || 0);

        const isShipped = item.status === ORDER_STATUS_DELIVERED;
        const requestedQty = isShipped ? 0 : Number(item.qty || 0);

        return {
          employeeName: order.name,
          gender,
          type: item.type,
          size: item.size,
          requestedQty,
          currentStock,
          shippedQty: isShipped ? 0 : Math.min(requestedQty, currentStock),
          isShipped,
        };
      });
    });
    setItems(flatItems);
  }, [batch, clothingConfig]);

  function handleShippedQtyChange(index, val) {
    const nextVal = Math.max(0, Math.min(items[index].requestedQty, Number(val) || 0));
    setItems((current) =>
      current.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, shippedQty: nextVal };
      })
    );
  }

  function handleConfirm() {
    const shipmentData = items
      .filter((item) => !item.isShipped && item.requestedQty > 0)
      .map((item) => ({
        employeeName: item.employeeName,
        gender: item.gender,
        type: item.type,
        size: item.size,
        shippedQty: item.shippedQty,
        pendingQty: item.requestedQty - item.shippedQty,
      }));

    const totalShipped = shipmentData.reduce((sum, item) => sum + item.shippedQty, 0);
    if (totalShipped === 0) {
      toast.error('กรุณาระบุจำนวนที่จะจัดส่งอย่างน้อย 1 ชิ้น');
      return;
    }

    onShipConfirm(batch.batchId, shipmentData);
    onClose();
  }

  const activeItems = items.filter((item) => !item.isShipped && item.requestedQty > 0);

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-[60] bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 bottom-3 z-[61] flex max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(54rem,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div className="flex items-center justify-between border-b border-[#E7EAF0] px-4 py-3">
            <div>
              <Dialog.Title className="text-lg font-black text-[#071638]">
                จัดการการจัดส่งสินค้า (Partial Approval)
              </Dialog.Title>
              <p className="text-xs font-semibold text-[#64748B] mt-0.5">
                ระบุจำนวนที่สามารถจัดส่งได้ในรอบนี้ ค้างส่งจะถูกแยกสถานะเป็น "รอของ"
              </p>
            </div>
            <Dialog.Close
              className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]"
              aria-label="ปิด"
            >
              <X />
            </Dialog.Close>
          </div>

          <div className="employee-scroll-region flex-1 overflow-auto p-4 bg-[#F8FAFC]">
            {activeItems.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-[#64748B]">
                ไม่มีรายการสินค้าที่รอจัดส่ง
              </div>
            ) : (
              <div className="grid gap-3">
                {items.map((item, index) => {
                  if (item.isShipped) return null;
                  const pendingQty = item.requestedQty - item.shippedQty;

                  let stockColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                  let stockText = `มีสต็อกพอ (${item.currentStock} ชิ้น)`;

                  if (item.currentStock === 0) {
                    stockColor = 'text-rose-600 bg-rose-50 border-rose-200';
                    stockText = 'สต๊อกหมด';
                  } else if (item.currentStock < item.requestedQty) {
                    stockColor = 'text-amber-600 bg-amber-50 border-amber-200';
                    stockText = `สต๊อกไม่พอ (มี ${item.currentStock} ชิ้น)`;
                  }

                  return (
                    <div
                      key={`${item.employeeName}-${item.type}-${item.size}-${index}`}
                      className="rounded-xl border border-[#DCE5F4] bg-white p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2 mb-2.5">
                        <div>
                          <p className="font-extrabold text-sm text-[#071638]">
                            {item.employeeName} ({item.gender})
                          </p>
                          <p className="text-xs font-bold text-[#002B5B] mt-0.5">
                            {item.type} · ไซส์ {item.size}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
                            stockColor
                          )}
                        >
                          {stockText}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 items-center text-center">
                        <div>
                          <p className="text-[11px] font-bold text-[#64748B]">จำนวนขอเบิก</p>
                          <p className="text-base font-extrabold text-[#071638] mt-1">
                            {item.requestedQty} ชิ้น
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#64748B]">จัดส่งรอบนี้</p>
                          <div className="flex justify-center mt-1">
                            <GridInput
                              type="number"
                              min={0}
                              max={item.requestedQty}
                              value={String(item.shippedQty)}
                              onChange={(value) => handleShippedQtyChange(index, value)}
                              className="h-9 w-16 text-center rounded-lg border border-[#CBD5E1] text-sm font-black text-[#002B5B] focus:border-[#002B5B] focus:ring-2 focus:ring-[#DCE8FF] outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#64748B]">ค้างส่ง (รอของ)</p>
                          <p
                            className={cn(
                              'text-base font-extrabold mt-1',
                              pendingQty > 0 ? 'text-amber-600' : 'text-[#64748B]'
                            )}
                          >
                            {pendingQty} ชิ้น
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[#E7EAF0] p-4 grid grid-cols-2 gap-3 sm:flex sm:justify-end sm:gap-3 bg-white">
            <button
              onClick={onClose}
              className="min-h-11 rounded-xl border border-[#CBD5E1] bg-white px-5 text-sm font-bold text-[#071638] w-full sm:w-auto"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              className="min-h-11 rounded-xl bg-[#002B5B] px-5 text-sm font-bold text-white hover:bg-[#002144] shadow-sm transition w-full sm:w-auto"
            >
              ยืนยันการจัดส่ง
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BatchDetailDialog({
  batch,
  onClose,
  onStatusChange,
  onDelete,
  statusLoadingId = '',
  deleteLoadingId = '',
  onShipClick,
}) {
  const isUpdatingStatus = Boolean(batch && statusLoadingId === batch.batchId);
  const isDeleting = Boolean(batch && deleteLoadingId === batch.batchId);
  const isBusy = isUpdatingStatus || isDeleting;
  function confirmDelete() {
    if (batch && !isBusy) onDelete(batch.batchId);
  }

  const isFullyDelivered =
    batch &&
    batch.orders.flatMap((o) => o.items).every((item) => item.status === ORDER_STATUS_DELIVERED);

  return (
    <Dialog.Root open={Boolean(batch)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(58rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          {batch && (
            <>
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[#E7EAF0] px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <Dialog.Title className="break-words text-lg font-extrabold text-[#071638] sm:text-xl">
                    {batch.companyName || 'ไม่ระบุบริษัท'}
                  </Dialog.Title>
                  <p className="mt-1 text-sm font-bold text-[#002B5B]">{batch.branch}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#64748B]">
                    {batch.batchId}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={batch.status} />
                  <Dialog.Close
                    className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]"
                    aria-label="ปิด"
                  >
                    <X />
                  </Dialog.Close>
                </div>
              </div>
              <div className="max-h-[64vh] overflow-auto p-3 sm:p-4">
                <div className="mb-4 grid gap-3 sm:grid-cols-5">
                  <MiniMetric label="บริษัท" value={batch.companyName || '-'} />
                  <MiniMetric label="ผู้ติดต่อ" value={batch.supervisorName || '-'} />
                  <MiniMetric
                    label="เบอร์ติดต่อ"
                    value={formatPhone(batch.supervisorPhone) || '-'}
                  />
                  <MiniMetric label="จำนวนรวม" value={`${getBatchPieces(batch)} ชิ้น`} />
                  <div className="min-w-0 rounded-xl bg-[#F4F7FC] px-3 py-3">
                    <p className="truncate text-xs font-bold text-[#64748B]">สถานะ</p>
                    <div className="mt-1">
                      <CustomSelect
                        value={batch.status}
                        values={ORDER_STATUSES}
                        disabled={isBusy}
                        onChange={(status) => onStatusChange(batch.batchId, status)}
                        compact
                        usePortal={false}
                      />
                    </div>
                  </div>
                </div>
                <p className="mb-4 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-bold text-[#002B5B]">
                  อัปเดตสถานะล่าสุด:{' '}
                  {new Date(batch.statusUpdatedAt).toLocaleString('th-TH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                <div className="mb-4 flex flex-col gap-2">
                  {!isFullyDelivered && (
                    <button
                      onClick={onShipClick}
                      disabled={isBusy}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#002B5B] font-bold text-white shadow-sm transition hover:bg-[#002144] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Truck className="size-4" /> ดำเนินการจัดส่ง (แยกตามรายการ)
                    </button>
                  )}
                  <button
                    onClick={confirmDelete}
                    disabled={isBusy}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] font-bold text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isDeleting ? 'กำลังลบคำสั่งเบิกเสื้อ' : 'ลบคำสั่งเบิกเสื้อนี้'}
                  </button>
                </div>
                <div className="grid gap-3">
                  {batch.orders.map((order) => (
                    <div
                      key={`${batch.batchId}-${order.name}`}
                      className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EEF4FF] px-3 py-3 sm:px-4">
                        <div className="min-w-0">
                          <p className="break-words font-extrabold text-[#071638]">{order.name}</p>
                          <p className="text-xs font-bold text-[#64748B]">{order.gender}</p>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold text-[#002B5B]">
                          {order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)} ชิ้น
                        </span>
                      </div>
                      <div className="grid gap-2 p-3 sm:hidden">
                        {order.items.map((item, itemIdx) => (
                          <div
                            key={`${order.name}-${item.type}-${item.size}-${itemIdx}`}
                            className="rounded-lg bg-[#F8FAFC] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="break-words text-sm font-extrabold text-[#071638]">
                                {item.type}
                              </p>
                              <StatusBadge status={item.status || ORDER_STATUS_PENDING} />
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <MobileInfo label="ไซส์" value={item.size || '-'} compact />
                              <MobileInfo label="จำนวน" value={item.qty} compact strong />
                            </div>
                          </div>
                        ))}
                      </div>
                      <table className="hidden w-full table-fixed text-left text-sm sm:table">
                        <thead className="text-xs font-bold text-[#44536A]">
                          <tr>
                            <th className="px-3 py-3 sm:px-4">ประเภท</th>
                            <th className="w-16 px-3 py-3 sm:w-20 sm:px-4">ไซส์</th>
                            <th className="w-16 px-3 py-3 text-right sm:w-20 sm:px-4">จำนวน</th>
                            <th className="w-28 px-3 py-3 text-center sm:w-32 sm:px-4">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr
                              key={`${order.name}-${item.type}-${item.size}`}
                              className="border-t border-[#E2E8F0]"
                            >
                              <td className="break-words px-3 py-3 font-bold sm:px-4">
                                {item.type}
                              </td>
                              <td className="break-words px-3 py-3 sm:px-4">{item.size}</td>
                              <td className="px-3 py-3 text-right font-extrabold sm:px-4">
                                {item.qty}
                              </td>
                              <td className="px-3 py-3 text-center sm:px-4">
                                <StatusBadge status={item.status || ORDER_STATUS_PENDING} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EmptyDashboardState({ text, compact = false }) {
  return (
    <div
      className={cn(
        'empty-state rounded-2xl border border-dashed border-[#CBD5E1] bg-white/70 text-center font-bold text-[#64748B]',
        compact ? 'p-4' : 'p-10'
      )}
    >
      <span
        className={cn(
          'mx-auto mb-3 grid place-items-center rounded-2xl border border-[#D8E3F5] bg-white text-[#64748B]',
          compact ? 'size-9' : 'size-12'
        )}
      >
        <ClipboardList className={compact ? 'size-4' : 'size-5'} />
      </span>
      <span>{text}</span>
    </div>
  );
}

function DashboardDataNotice({ message, detail, onRetry, refreshing }) {
  return (
    <section className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-900 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-700" />
          <div>
            <h2 className="text-sm font-black">ยังโหลดข้อมูลจริงจาก Google Sheets ไม่สำเร็จ</h2>
            <p className="mt-1 text-xs font-bold leading-5">{message}</p>
            {detail && <p className="mt-1 text-xs font-semibold leading-5 text-yellow-800">{detail}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={refreshing}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-yellow-300 bg-white px-3 text-xs font-black text-yellow-900 shadow-xs transition hover:bg-yellow-100 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          โหลดใหม่
        </button>
      </div>
    </section>
  );
}

function getBatchPieces(batch) {
  return flattenBatches([batch]).reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function buildTypeTotals(rows) {
  return uniqueSorted([...getClothingTypes(), ...rows.map((row) => row.type).filter(Boolean)])
    .map((type) => ({
      type,
      qty: rows
        .filter((row) => row.type === type)
        .reduce((sum, row) => sum + Number(row.qty || 0), 0),
    }))
    .filter((row) => row.qty > 0);
}

function buildSizeTotals(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const gender = row.gender || '-';
    const size = row.size || '-';
    const key = `${gender}__${size}`;
    const current = map.get(key) || { gender, size, qty: 0 };
    current.qty += Number(row.qty || 0);
    map.set(key, current);
  });
  return [...map.values()].sort(
    (a, b) => String(a.gender).localeCompare(String(b.gender), 'th') || compareSizes(a.size, b.size)
  );
}

function buildDonutGradient(rows, colors) {
  const total = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  if (!total) return '#E5ECF7';
  let current = 0;
  const segments = rows.map((row, index) => {
    const start = current;
    const end = current + (Number(row.qty || 0) / total) * 100;
    current = end;
    const color = colors[index % colors.length];
    return `${color} ${start}% ${end}%`;
  });
  return `conic-gradient(${segments.join(', ')})`;
}

function uniqueSorted(values, sorter) {
  const unique = [...new Set(values.filter(Boolean))];
  return sorter
    ? unique.sort(sorter)
    : unique.sort((a, b) => String(a).localeCompare(String(b), 'th', { numeric: true }));
}

function compareSizes(a, b) {
  const order = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  const aIndex = order.indexOf(String(a).toUpperCase());
  const bIndex = order.indexOf(String(b).toUpperCase());
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return String(a).localeCompare(String(b), 'th', { numeric: true });
}

function formatMonthLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(date);
}

function formatMonthInputValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getFullYear() * 100 + date.getMonth() + 1;
}

function getMonthKeyFromInput(value) {
  if (!value) return 0;
  const [year, month] = String(value).split('-').map(Number);
  if (!year || !month) return 0;
  return year * 100 + month;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsvFilename(branch, startMonth, endMonth) {
  const cleanBranch = branch === 'ทุกสาขา' ? 'all-branches' : branch.replace(/[\\/:*?"<>|]/g, '-');
  const range = startMonth && endMonth ? `${startMonth}_to_${endMonth}` : 'all-months';
  return `uniform-orders_${cleanBranch}_${range}.csv`;
}

function buildMonthFilterOptions(rows) {
  const monthMap = new Map();
  rows.forEach((row) => {
    const date = new Date(row.submittedAt);
    if (Number.isNaN(date.getTime())) return;
    const sortKey = date.getFullYear() * 100 + date.getMonth();
    monthMap.set(formatMonthLabel(date), sortKey);
  });
  const currentMonth = formatMonthLabel(new Date());
  if (currentMonth && !monthMap.has(currentMonth)) {
    const now = new Date();
    monthMap.set(currentMonth, now.getFullYear() * 100 + now.getMonth());
  }
  return [...monthMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label)
    .concat('ทุกเดือน');
}

function buildTotalSummary(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row.type}__${row.size}`;
    const current = map.get(key) || {
      type: row.type,
      size: row.size,
      qty: 0,
    };
    current.qty += Number(row.qty || 0);
    map.set(key, current);
  });
  return [...map.values()].sort(
    (a, b) =>
      a.type.localeCompare(b.type, 'th') ||
      String(a.size).localeCompare(String(b.size), 'th', { numeric: true })
  );
}

function buildDashboardMetrics(batches) {
  const rows = flattenBatches(batches);
  return {
    totalEmployees: batches.reduce((sum, batch) => sum + batch.orders.length, 0),
    totalPieces: rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
    pendingPieces: rows
      .filter((row) => row.status === ORDER_STATUS_PENDING)
      .reduce((sum, row) => sum + Number(row.qty || 0), 0),
    backorderPieces: rows
      .filter((row) => row.status === ORDER_STATUS_BACKORDER || row.status === 'รอของ')
      .reduce((sum, row) => sum + Number(row.qty || 0), 0),
    shippedPieces: rows
      .filter((row) => row.status === ORDER_STATUS_DELIVERED)
      .reduce((sum, row) => sum + Number(row.qty || 0), 0),
    pendingBatches: batches.filter((batch) => batch.status !== ORDER_STATUS_DELIVERED).length,
    deliveredBatches: batches.filter((batch) => batch.status === ORDER_STATUS_DELIVERED).length,
  };
}

function Stat({ icon: Icon, value, label }) {
  return (
    <Card className="min-w-0 p-3 sm:p-4 hover:-translate-y-0.5 active:translate-y-0 transition duration-300">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF4FF] text-[#002B5B] sm:size-10 shadow-xs">
          <Icon className="size-4 sm:size-5" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="shrink-0 text-xl font-black leading-none text-[#071638] sm:text-2xl">
            {value}
          </p>
          <p className="min-w-0 truncate text-[11px] font-bold text-neutral-400 sm:text-xs uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function SkeletonDashboard() {
  return (
    <div
      className="relative z-10 mx-auto grid w-full max-w-[1240px] gap-4 px-4 py-6 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-h-24 items-center justify-center gap-3 rounded-2xl border border-[#D8DEEA] bg-white/90 text-sm font-bold text-[#44536A] shadow-sm">
        <Loader2 className="size-5 animate-spin text-[#002B5B]" />
        <span>กำลังโหลดข้อมูล...</span>
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/80" />
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
