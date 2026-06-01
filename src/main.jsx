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
  LayoutDashboard,
  Loader2,
  PackageCheck,
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
  Save,
  Printer,
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
const ORDER_STORAGE_KEY = 'gi-shirt-order-batches';
const ORDER_DRAFT_KEY = 'gi-shirt-order-draft';
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
      ? rows.map((row) => ({
          size: String(row?.size || '').trim(),
          details: normalizeSizeDetails(row, detailFields),
          qty: Number(row?.qty || 0),
        }))
      : [];
  return normalizedRows.length
    ? normalizedRows
    : [{ size: 'M', details: normalizeSizeDetails({}, detailFields), qty: 0 }];
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
  const clothing = findClothingConfig(type);
  return (clothing?.colors || []).map((color) => color.name).filter(Boolean);
}

function needsColorSelection(type) {
  return false;
}

function resolveItemColor(type, color = '') {
  const colors = getColorOptions(type);
  if (colors.length === 1) return colors[0];
  return colors.includes(color) ? color : '';
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
  const rows = getSizeRows(type, gender);
  const clothing = findClothingConfig(type);
  const sizeRows = clothing?.genderSizeRows?.[gender] || clothing?.sizeRows || [];
  const options = rows.map(([size, label]) => {
    const stockRow = sizeRows.find((r) => r.size === size);
    const qty = stockRow ? Number(stockRow.qty ?? 0) : 0;
    let descriptiveLabel = label;
    if (stockRow) {
      if (qty > 0) {
        descriptiveLabel = `${size} (${label ? label + ' · ' : ''}คงเหลือ ${qty} ตัว)`;
      } else {
        descriptiveLabel = `${size} (${label ? label + ' · ' : ''}หมด - ค้างส่งเพื่อผลิตเพิ่ม)`;
      }
    }
    return [size, descriptiveLabel];
  });
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
              <select
                value={item.size}
                onChange={(e) =>
                  dispatch({
                    type: 'patchItem',
                    id: employee.id,
                    itemType: item.type,
                    patch: { size: e.target.value },
                  })
                }
                className="h-7 border border-[#CBD5E1] rounded bg-white px-1 text-xs font-black text-[#002B5B] focus:border-[#002B5B] cursor-pointer"
              >
                {!item.size && <option value="">ไซส์</option>}
                {sizeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

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

function normalizeDraftEmployee(employee, index) {
  return {
    ...createEmployee(index),
    ...employee,
    id: employee?.id || crypto.randomUUID(),
    name: employee?.name || '',
    gender: employee?.gender || '',
    expanded: index === 0,
    items: Array.isArray(employee?.items)
      ? employee.items
          .map((item) => ({
            type: item.type || '',
            size: item.size || '',
            customSize: item.customSize || '',
            color: resolveItemColor(item.type || '', item.color || ''),
            qty: digitsOnly(item.qty || ''),
          }))
          .filter((item) => getClothingTypes().includes(item.type))
      : [],
  };
}

function readOrderDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(ORDER_DRAFT_KEY) || 'null');
    if (!draft || typeof draft !== 'object') return createInitialOrderState();
    const employees =
      Array.isArray(draft.employees) && draft.employees.length
        ? draft.employees.map(normalizeDraftEmployee)
        : createInitialOrderState().employees;
    return {
      companyName: draft.companyName || DEFAULT_COMPANY_NAME,
      branch: BRANCHES.includes(draft.branch) ? draft.branch : BRANCHES[0],
      supervisorName: draft.supervisorName || '',
      supervisorPhone: phoneDigitsOnly(draft.supervisorPhone || ''),
      employees,
    };
  } catch {
    return createInitialOrderState();
  }
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

function readStoredBatches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map(normalizeBatch).filter((batch) => batch.orders.length)
      : [];
  } catch {
    return [];
  }
}

function saveStoredBatch(batch) {
  const stored = readStoredBatches();
  const next = [normalizeBatch(batch), ...stored.filter((item) => item.batchId !== batch.batchId)];
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
}

function saveStoredBatches(batches) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(batches.map(normalizeBatch)));
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
          demoMode={!gasConfigured}
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
  
  // Wizard and UI step states
  const [activeStep, setActiveStep] = useState(1);
  const [activeTab, setActiveTab] = useState('table'); // 'table', 'copy', 'excel'
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [notes, setNotes] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);

  function handleEdit(id, mode = 'full') {
    setEditMode(mode);
    setMobileEmployeeId(id);
  }

  const skipDraftSaveRef = useRef(false);
  const [state, dispatch] = useReducer(orderReducer, undefined, readOrderDraft);

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
    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }
    localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const invalidEmployee = state.employees.find((employee) => employee.id === invalidEmployeeId);
    if (invalidEmployeeId && invalidEmployee && isEmployeeComplete(invalidEmployee))
      setInvalidEmployeeId('');
  }, [invalidEmployeeId, state.employees]);

  function validateCompany() {
    if (!state.companyName.trim()) {
      toast.error('⚠️ ยังไม่ได้ระบุบริษัท', { description: 'กรุณาระบุชื่อบริษัท/หน่วยงานของคุณ' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (!state.branch) {
      toast.error('⚠️ ยังไม่ได้เลือกสาขา', { description: 'โปรดเลือกสาขาที่จะจัดส่งเสื้อ' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (!state.supervisorName.trim()) {
      toast.error('⚠️ ยังไม่ได้ระบุผู้รับผิดชอบ', {
        description: 'กรุณาระบุชื่อ-นามสกุลของผู้รับผิดชอบสั่งซื้อ',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (!state.supervisorPhone.trim()) {
      toast.error('⚠️ ยังไม่ได้ระบุเบอร์ติดต่อ', {
        description: 'กรุณาระบุเบอร์โทรศัพท์มือถือของผู้รับผิดชอบ',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    if (state.supervisorPhone.length !== PHONE_LENGTH) {
      toast.error('⚠️ เบอร์โทรศัพท์ไม่ถูกต้อง', {
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
      setMobileEmployeeId(employeeId);
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
      toast.error(`❌ พนักงานลำดับที่ ${index} ยังไม่ครบถ้วน`, { description: `ขาด: ${missing}` });
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
            color: resolveItemColor(item.type, item.color || ''),
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

      const result = await postToGAS(payload);
      saveStoredBatch(payload);
      toast.success('บันทึกคำสั่งเบิกเสื้อแล้ว', { id: loadingToastId });
      localStorage.removeItem(ORDER_DRAFT_KEY);
      skipDraftSaveRef.current = true;
      setSuccessData(payload); // Save success data for the Success Screen
      setQuery('');
      setShowIncompleteOnly(false);
      setMobileEmployeeId('');
    } catch {
      toast.error('ส่งคำสั่งเบิกเสื้อไม่สำเร็จ', {
        id: loadingToastId,
        description: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Wizard Stock and Data Helpers
  function getStockRemaining(type, gender, size) {
    const clothing = findClothingConfig(type);
    if (!clothing) return 0;
    const sizeRows = clothing.genderSizeRows?.[gender] || clothing.sizeRows || [];
    const stockRow = sizeRows.find((r) => r.size === size);
    return stockRow ? Number(stockRow.qty ?? 0) : 0;
  }

  const aggregatedDemands = useMemo(() => {
    const demands = {};
    state.employees.forEach((emp) => {
      emp.items.forEach((item) => {
        if (!item.size) return;
        const key = `${item.type}|${emp.gender}|${item.size}`;
        demands[key] = (demands[key] || 0) + Number(item.qty || 0);
      });
    });
    return demands;
  }, [state.employees]);

  const stockWarnings = useMemo(() => {
    const warnings = [];
    Object.entries(aggregatedDemands).forEach(([key, requested]) => {
      const [type, gender, size] = key.split('|');
      const available = getStockRemaining(type, gender, size);
      if (requested > available) {
        warnings.push({ type, gender, size, requested, available });
      }
    });
    return warnings;
  }, [aggregatedDemands]);

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
      toast.error('❌ ไม่พบรายการพนักงานที่สมบูรณ์สำหรับนำเข้า');
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
    
    toast.success(`✅ นำเข้ารายชื่อพนักงาน ${newEmployees.length} คนสำเร็จ!`);
    setCsvPreview([]);
    setCsvErrors([]);
    setActiveTab('table');
  }

  function handleSaveDraft() {
    localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(state));
    toast.success('💾 บันทึกร่างข้อมูลสำเร็จเรียบร้อยแล้ว');
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
                setChecked1(false);
                setChecked2(false);
                setChecked3(false);
                setNotes('');
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
          <div className="mb-4 rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5 shadow-sm">
            <div className="relative flex items-center justify-between">
              {/* Connection Line */}
              <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-neutral-200 z-0">
                <div 
                  className="h-full bg-[#002B5B] transition-all duration-500" 
                  style={{ width: `${((activeStep - 1) / 2) * 100}%` }}
                />
              </div>
              
              {/* Step Items */}
              {[
                { number: 1, label: 'ข้อมูลผู้เบิก', desc: 'ผู้ติดต่อ & สถานที่จัดส่ง' },
                { number: 2, label: 'รายการเสื้อพนักงาน', desc: 'ระบุรายชื่อและไซส์เสื้อ' },
                { number: 3, label: 'ตรวจสอบและส่ง', desc: 'ตรวจสอบจำนวนและสต็อก' }
              ].map((step) => {
                const isActive = activeStep === step.number;
                const isCompleted = activeStep > step.number;
                return (
                  <div key={step.number} className="relative z-10 flex flex-col items-center">
                    <button
                      type="button"
                      disabled={step.number > activeStep && !isCompanyComplete}
                      onClick={() => {
                        if (step.number === 1) {
                          setActiveStep(1);
                        } else if (step.number === 2) {
                          if (validateCompany()) setActiveStep(2);
                        } else if (step.number === 3) {
                          if (validateCompany() && validateEmployees()) setActiveStep(3);
                        }
                      }}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full font-bold text-sm transition-all duration-300 border-2 cursor-pointer",
                        isCompleted 
                          ? "bg-green-500 border-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                          : isActive
                          ? "bg-[#002B5B] border-[#002B5B] text-white shadow-[0_0_12px_rgba(0,43,91,0.3)] scale-105"
                          : "bg-white border-neutral-300 text-neutral-400"
                      )}
                    >
                      {isCompleted ? <Check className="size-5" /> : step.number}
                    </button>
                    <span className={cn(
                      "mt-2 text-xs sm:text-sm font-black whitespace-nowrap",
                      isActive ? "text-[#002B5B]" : isCompleted ? "text-green-600" : "text-neutral-500"
                    )}>
                      {step.label}
                    </span>
                    <span className="hidden sm:inline mt-0.5 text-[10px] font-semibold text-neutral-400">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wizard Steps */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <QuickOrderSetupPanel state={state} dispatch={dispatch} forceExpand={true} />
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (validateCompany()) {
                      setActiveStep(2);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#002B5B] text-white hover:bg-[#001f42] px-6 py-3 font-extrabold shadow-md transition active:scale-95 text-sm sm:text-base cursor-pointer"
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
                <div className="flex border-b border-neutral-200 bg-neutral-50/50 p-1.5 gap-1.5">
                  {[
                    { id: 'table', label: '📝 กรอกตาราง' },
                    { id: 'copy', label: '👥 คัดลอกแถว' },
                    { id: 'excel', label: '📥 นำเข้า CSV (Excel)' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex-1 py-2 px-3 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer",
                        activeTab === tab.id 
                          ? "bg-[#002B5B] text-white shadow-xs" 
                          : "text-neutral-600 hover:bg-neutral-100"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
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
                            onClick={() => dispatch({ type: 'add' })}
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
                        query={query}
                        showIncompleteOnly={showIncompleteOnly}
                        invalidEmployeeId={invalidEmployeeId}
                        onEdit={(id) => handleEdit(id, 'full')}
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
                          onClick={() => dispatch({ type: 'add' })}
                          className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#002B5B] text-white hover:bg-[#001f42] px-3.5 text-xs font-black transition shadow-xs cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                          <span>เพิ่มแถวใหม่</span>
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                        {state.employees.map((employee, index) => {
                          const complete = isEmployeeComplete(employee);
                          return (
                            <div 
                              key={employee.id} 
                              data-quick-employee-card={employee.id}
                              className={cn(
                                "p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md bg-white",
                                complete ? "border-neutral-200" : "border-yellow-300 bg-yellow-50/10"
                              )}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-xs font-bold text-[#64748B]">ลำดับที่ {index + 1}</span>
                                  <span className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-black",
                                    complete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                  )}>
                                    {complete ? "✓ ครบ" : "⚠️ ไม่ครบ"}
                                  </span>
                                </div>
                                <h4 className="font-extrabold text-sm text-[#071638] mt-1.5 truncate">
                                  {employee.name || <span className="text-neutral-400 italic">ไม่มีชื่อ</span>}
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
                              
                              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
                                <button
                                  type="button"
                                  onClick={() => dispatch({ type: 'cloneEmployee', id: employee.id })}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-[#CBD5E1] bg-white text-[#44536A] hover:bg-neutral-50 text-xs font-extrabold transition cursor-pointer"
                                >
                                  <Copy className="size-3.5" />
                                  <span>คัดลอกรายการนี้</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={state.employees.length <= 1}
                                  onClick={() => dispatch({ type: 'delete', id: employee.id })}
                                  className="grid size-9 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50 transition hover:bg-[#FFE2E2] cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
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

              {/* Additional notes */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm sm:text-base font-extrabold text-[#071638] mb-1.5">หมายเหตุเพิ่มเติม (ถ้ามี)</h3>
                <TextArea
                  value={notes}
                  onChange={setNotes}
                  placeholder="เช่น เบิกด่วนพิเศษสีกรม หรือความต้องการเพิ่มเติมอื่น ๆ"
                  title="กรอกรายละเอียดเพิ่มเติมสำหรับคำสั่งเบิก"
                  rows={2}
                />
              </div>

              {/* Navigation Footer Step 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 pt-4 bg-white p-4 rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-5 py-2.5 font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  <span>ย้อนกลับ</span>
                </button>
                
                <div className="flex w-full sm:w-auto gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#002B5B] text-[#002B5B] hover:bg-[#002B5B]/5 px-5 py-2.5 font-extrabold transition cursor-pointer"
                  >
                    <Save className="size-4" />
                    <span>บันทึกร่าง</span>
                  </button>
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

              {/* Stock Warning Alert Banner */}
              {stockWarnings.length > 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3 shadow-sm animate-fade-in">
                  <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-extrabold text-yellow-800">⚠️ สต็อกเสื้อบางรายการมีไม่เพียงพอ</h4>
                    <p className="text-xs text-yellow-700 font-semibold mt-1 leading-5">
                      พบจำนวนเสื้อที่ขอเบิกมากกว่าสต็อกเสื้อที่พร้อมส่ง ณ ขณะนี้ รายการที่ขาดจะเปลี่ยนสถานะเป็น <strong className="text-[#D97706]">"รอผลิต (Backorder)"</strong> โดยอัตโนมัติ และจะทำการส่งมอบในรอบถัดไป
                    </p>
                    <div className="mt-3 overflow-hidden rounded-lg border border-yellow-200 bg-white text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-yellow-100/50 text-yellow-800 font-extrabold border-b border-yellow-100">
                          <tr>
                            <th className="px-3 py-1.5">แบบเสื้อ</th>
                            <th className="px-3 py-1.5">ไซส์</th>
                            <th className="px-3 py-1.5 text-center">ต้องการ</th>
                            <th className="px-3 py-1.5 text-center">คลัง</th>
                            <th className="px-3 py-1.5 text-center text-red-600">ขาด</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockWarnings.map((w, idx) => (
                            <tr key={idx} className="border-t border-yellow-100 hover:bg-neutral-50/50">
                              <td className="px-3 py-1.5 font-bold text-neutral-800">{w.type} ({w.gender})</td>
                              <td className="px-3 py-1.5 font-bold text-neutral-800">{w.size}</td>
                              <td className="px-3 py-1.5 text-center font-bold text-[#002B5B]">{w.requested}</td>
                              <td className="px-3 py-1.5 text-center text-neutral-600">{w.available}</td>
                              <td className="px-3 py-1.5 text-center font-black text-red-600">-{w.requested - w.available}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Breakdown sorted by clothing types */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm sm:text-base font-extrabold text-[#071638] mb-3">📋 จำแนกรายการขอเบิกตามประเภทเสื้อ</h3>
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
                              <th className="px-4 py-2 text-center">สถานะสต็อก</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((item, idx) => {
                              const available = getStockRemaining(type, item.employee.gender, item.size);
                              const isAvailable = available >= item.qty;
                              return (
                                <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                                  <td className="px-4 py-2 text-center text-neutral-400">{idx + 1}</td>
                                  <td className="px-4 py-2 font-bold text-neutral-800">{item.employee.name}</td>
                                  <td className="px-4 py-2 text-neutral-500">{item.employee.gender}</td>
                                  <td className="px-4 py-2 font-bold text-neutral-700">{item.size}</td>
                                  <td className="px-4 py-2 text-center font-bold text-[#002B5B]">{item.qty} ตัว</td>
                                  <td className="px-4 py-2 text-center">
                                    <span className={cn(
                                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-black",
                                      isAvailable 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-yellow-100 text-[#D97706]"
                                    )}>
                                      {isAvailable ? "พร้อมส่ง" : `รอผลิต (คลังมี ${available})`}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Size summary cards */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm sm:text-base font-extrabold text-[#071638] mb-3">📏 สรุปไซส์ที่เบิกต่อประเภทเสื้อ</h3>
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

              {/* Confirmation checkboxes card */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5">
                <h3 className="text-sm sm:text-base font-extrabold text-[#071638] flex items-center gap-2">
                  <Check className="size-5 text-[#002B5B] rounded border border-[#002B5B] p-0.5" />
                  <span>ยืนยันข้อมูลเพื่อส่งคำขอเบิก</span>
                </h3>
                
                <div className="space-y-3 pt-1">
                  {[
                    { state: checked1, setState: setChecked1, label: 'ข้าพเจ้ายืนยันว่ารายชื่อพนักงานและขนาดไซส์เสื้อถูกต้องสมบูรณ์แล้ว' },
                    { state: checked2, setState: setChecked2, label: 'ข้าพเจ้ารับทราบข้อมูลสต็อก กรณีไม่มีสินค้าพร้อมจัดส่ง จะต้องรอเข้าคิวผลิตตามลำดับความต้องการ' },
                    { state: checked3, setState: setChecked3, label: 'ข้าพเจ้ายืนยันว่าบริษัท สาขาจัดส่ง และข้อมูลผู้ประสานงานถูกต้องสำหรับการจัดส่งเสื้อพนักงาน' }
                  ].map((chk, idx) => (
                    <label key={idx} className="flex items-start gap-3 text-xs sm:text-sm font-bold text-neutral-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={chk.state}
                        onChange={(e) => chk.setState(e.target.checked)}
                        className="size-5 rounded border-neutral-300 accent-[#002B5B] shrink-0 mt-0.5"
                      />
                      <span>{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation Footer Step 3 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 pt-4 bg-white p-4 rounded-xl shadow-xs">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setActiveStep(2)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-5 py-2.5 font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  <span>ย้อนกลับ</span>
                </button>
                
                <button
                  type="button"
                  disabled={isSubmitting || !checked1 || !checked2 || !checked3 || !gasConfigured}
                  onClick={submitOrder}
                  className={cn(
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 font-extrabold text-white transition shadow-md active:scale-95 text-base cursor-pointer",
                    (checked1 && checked2 && checked3 && gasConfigured && !isSubmitting)
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
        <h4 className="text-sm font-extrabold text-yellow-800">⚠️ ระบบบันทึกคำสั่งเบิกเสื้อยังไม่พร้อมใช้งาน</h4>
        <p className="text-xs text-yellow-700 font-semibold mt-1 leading-5">
          กรุณาตั้งค่าลิงก์ Web App URL ของ Google Apps Script ในไฟล์ .env (`VITE_GAS_URL`) ก่อนส่งคำขอเบิกเสื้อจริง คุณยังสามารถกรอกข้อมูลและทดสอบการใช้งานแบบร่างได้ปกติ
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
            <h2 className="text-base font-black text-[#071638]">📋 ข้อมูลผู้ติดต่อ / ผู้เบิก</h2>
            {complete ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#166534]">
                <Check className="size-3" /> ครบถ้วน
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800 animate-pulse">
                ⚠️ ยังไม่ครบ
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
                ? '✅ ข้อมูลผู้เบิกครบแล้ว - สามารถกดซ่อนเพื่อประหยัดพื้นที่หน้าจอ'
                : '⚠️ กรุณากรอกข้อมูลให้ครบทั้ง 4 ช่อง เพื่อเตรียมการจัดส่ง'}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4 border-t border-neutral-100 pt-4">
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
    clothingTypes.map((type) => {
      const colors = getColorOptions(type);
      return { enabled: false, qty: '2', color: colors.length === 1 ? colors[0] : '' };
    })
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
        const colors = getColorOptions(type);
        const current = items[index] || {};
        return {
          enabled: Boolean(current.enabled),
          qty: current.qty || '2',
          color:
            colors.length === 1 ? colors[0] : colors.includes(current.color) ? current.color : '',
        };
      })
    );
  }, [clothingTypes.join('|')]);

  function applyQuickOrder() {
    if (!names.length) {
      toast.error('❌ ยังไม่มีรายชื่อพนักงาน', {
        description: 'โปรดวางรายชื่อพนักงานอย่างน้อย 1 คน (หนึ่งชื่อต่อบรรทัด)',
      });
      return;
    }
    const missingColorType = clothingTypes.find(
      (type, index) =>
        customItems[index]?.enabled &&
        getColorOptions(type).length > 1 &&
        !customItems[index]?.color
    );
    if (missingColorType) {
      toast.error('❌ ยังไม่ได้เลือกสี', {
        description: `โปรดเลือกสีสำหรับ ${missingColorType} ก่อนเพิ่มรายการ`,
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
    toast.success(`✅ เพิ่มรายชื่อพนักงาน ${names.length} คนเรียบร้อยแล้ว`);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-3 bottom-3 z-50 max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(58rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="flex items-center justify-between border-b border-[#E7EAF0] px-5 py-4">
              <div>
                <Dialog.Title className="text-xl font-extrabold text-[#071638]">
                  ➕ เพิ่มพนักงานหลายคน
                </Dialog.Title>
                <p className="text-sm font-semibold text-[#64748B] mt-1">
                  วางรายชื่อและตั้งชุดเสื้อตั้งต้นเพื่อใช้ได้ทันที
                </p>
              </div>
              <Dialog.Close
                className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]"
                aria-label="ปิด"
              >
                <X />
              </Dialog.Close>
            </div>
            <div className="employee-scroll-region max-h-[calc(90vh-5rem)] overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#071638] sm:text-xl">
                    1️⃣ วางรายชื่อพนักงาน
                  </h2>
                  <p className="text-sm font-semibold text-[#64748B] mt-1">หนึ่งชื่อต่อบรรทัด</p>
                </div>
                <span className="hidden rounded-md bg-white px-3 py-2 text-sm font-bold text-[#002B5B] sm:block">
                  {names.length} คน
                </span>
              </div>
              <Field label="รายชื่อพนักงาน">
                <TextArea
                  value={namesText}
                  onChange={setNamesText}
                  placeholder={'วันท์ สวนศักดิ์\nคิม ชมภูดิน\nจีจี บัวสวรรค์\nเพิ่มเติม...'}
                  title="วางรายชื่อพนักงานหนึ่งชื่อในแต่ละบรรทัด"
                  rows={8}
                />
              </Field>

              <div className="mt-6 border-t border-[#E7EAF0] pt-6">
                <h2 className="text-lg font-extrabold text-[#071638] sm:text-xl">
                  2️⃣ ตั้งชุดเสื้อตั้งต้น
                </h2>
                <p className="text-sm font-semibold text-[#64748B] mt-1">
                  เลือกเพศ ไซส์ และประเภทเสื้อที่ต้องการให้ทุกคน
                </p>
                <div className="grid gap-4 mt-4 lg:grid-cols-[1fr_1fr]">
                  <Field label="👨👩 เพศตั้งต้น">
                    <div className="grid grid-cols-2 gap-2">
                      {GENDERS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={cn(
                            'min-h-11 rounded-lg border-2 font-bold transition',
                            gender === g
                              ? 'border-[#002B5B] bg-[#002B5B] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#071638]'
                          )}
                        >
                          {g === 'ชาย' ? '👨' : '👩'} {g}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="📏 ไซส์ตั้งต้น">
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

              <div className="mt-6 border-t border-[#E7EAF0] pt-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#071638] sm:text-xl">
                      👕 เลือกประเภทเสื้อ
                    </h2>
                    <p className="text-sm font-semibold text-[#64748B] mt-1">
                      กด "สี" เพื่อเลือก และระบุจำนวน
                    </p>
                  </div>
                </div>
                <div className="grid max-h-[20rem] gap-2 overflow-y-auto rounded-xl border border-[#D8DEEA] bg-white p-2">
                  {clothingTypes.map((type, index) => {
                    const colors = getColorOptions(type);
                    const selectedColor =
                      colors.length === 1 ? colors[0] : customItems[index]?.color || '';
                    return (
                      <div
                        key={type}
                        className={cn(
                          'grid gap-2 rounded-lg border p-2 text-sm font-bold text-[#071638] sm:grid-cols-[minmax(0,1fr)_minmax(8rem,.8fr)_5.5rem] sm:items-center',
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
                                        color: colors.length === 1 ? colors[0] : item.color || '',
                                      }
                                    : item
                                )
                              )
                            }
                            className="size-4 shrink-0 accent-[#002B5B]"
                          />
                          <span className="min-w-0 truncate">{type}</span>
                        </label>
                        {colors.length > 1 ? (
                          <CustomSelect
                            value={selectedColor}
                            values={colors}
                            placeholder="สี"
                            compact
                            disabled={!customItems[index]?.enabled}
                            usePortal={false}
                            onChange={(color) =>
                              setCustomItems((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, color } : item
                                )
                              )
                            }
                          />
                        ) : (
                          <div className="flex min-h-11 items-center rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-sm font-bold text-[#44536A]">
                            <span className="truncate">{colors[0] || 'ไม่มีสี'}</span>
                          </div>
                        )}
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
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#002B5B] px-4 font-bold text-white transition hover:bg-[#013A78] active:scale-95"
              >
                <UserPlus /> ยืนยันเพิ่มเข้ารายการ
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={replaceConfirmOpen}
        title="⚠️ แทนที่รายการเดิม"
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
              <th className="w-[16rem] border-b border-[#D8DEEA] px-3 py-3">ชื่อ-นามสกุล *</th>
              <th className="w-36 border-b border-[#D8DEEA] px-3 py-3">เพศ *</th>
              <th className="w-auto border-b border-[#D8DEEA] px-3 py-3">รายการเสื้อที่เบิก</th>
              <th className="w-28 border-b border-[#D8DEEA] px-3 py-3 text-center">สถานะ</th>
              <th className="w-28 border-b border-[#D8DEEA] px-3 py-3 text-center">การจัดการ</th>
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
                    <select
                      value={employee.gender}
                      onChange={(e) =>
                        dispatch({
                          type: 'patchEmployee',
                          id: employee.id,
                          patch: { gender: e.target.value },
                        })
                      }
                      className={cn(
                        'h-11 w-full border rounded-lg bg-white px-2.5 text-sm font-bold text-neutral-900 focus:border-[#002B5B] focus:ring-2 focus:ring-[#002B5B]/15 outline-none cursor-pointer',
                        showErrors && !employee.gender ? 'border-red-500' : 'border-neutral-300'
                      )}
                    >
                      <option value="" disabled>เลือกเพศ</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </td>

                  {/* Scrollable Garment List Cell */}
                  <td className="px-3 py-3">
                    <div className="max-h-28 overflow-y-auto pr-1 grid gap-1.5 scrollbar-thin">
                      {employee.items.map((item, itemIdx) => {
                        const sizeOptions = getSizeOptions(item.type, employee.gender);
                        return (
                          <div
                            key={`${item.type}-${itemIdx}`}
                            className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 shadow-xs"
                          >
                            {/* Clothing Type Select */}
                            <select
                              value={item.type}
                              onChange={(e) =>
                                dispatch({
                                  type: 'patchItem',
                                  id: employee.id,
                                  itemType: item.type,
                                  patch: { type: e.target.value },
                                })
                              }
                              className="text-xs font-bold h-8 rounded border border-neutral-300 bg-white px-1.5 max-w-[12rem] cursor-pointer focus:border-[#002B5B] outline-none"
                            >
                              {clothingTypes.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>

                            {/* Size Select */}
                            <select
                              value={item.size}
                              disabled={!employee.gender}
                              onChange={(e) =>
                                dispatch({
                                  type: 'patchItem',
                                  id: employee.id,
                                  itemType: item.type,
                                  patch: { size: e.target.value },
                                })
                              }
                              className={cn(
                                'text-xs font-bold h-8 rounded border bg-white px-1 cursor-pointer focus:border-[#002B5B] outline-none min-w-[4.5rem]',
                                showErrors && !item.size ? 'border-red-500' : 'border-neutral-300'
                              )}
                            >
                              <option value="" disabled>{employee.gender ? 'ไซส์' : 'เพศก่อน'}</option>
                              {sizeOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>

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
                              className="w-12 h-8 border border-neutral-300 rounded text-center font-bold text-xs focus:border-[#002B5B] outline-none"
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
                              className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-neutral-100 transition ml-auto"
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

function QuickMobileList({ employees, query, showIncompleteOnly, invalidEmployeeId, onEdit }) {
  const filteredEmployees = getFilteredEmployees(employees, query, showIncompleteOnly);
  return (
    <section className="grid gap-2 lg:hidden">
      {filteredEmployees.map((employee) => {
        const index = employees.findIndex((item) => item.id === employee.id);
        const complete = isEmployeeComplete(employee);
        const pieces = employee.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
        return (
          <button
            key={employee.id}
            data-quick-employee-card={employee.id}
            onClick={() => onEdit(employee.id)}
            className={cn(
              'rounded-lg border border-[#D8DEEA] bg-white p-3 text-left',
              invalidEmployeeId === employee.id &&
                'employee-attention border-[#EF4444] bg-[#FFF7F7]'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-extrabold text-[#071638]">
                  {index + 1}. {employee.name || 'ยังไม่ระบุชื่อ'}
                </p>
                <p className="mt-1 text-xs font-bold text-[#64748B]">
                  {employee.gender || 'ยังไม่เลือกเพศ'} · {pieces} ชิ้น
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold',
                  complete ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                )}
              >
                {complete ? 'ครบ' : 'แก้'}
              </span>
            </div>
          </button>
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
                      `👕 จัดการเสื้อ: ${employee.name || 'ยังไม่ระบุชื่อ'}`
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
                      📝 ขั้นตอนที่ 1: ชื่อและเพศ
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
                            {gender === 'ชาย' ? '👨' : '👩'} {gender}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-[#D8DEEA] p-3">
                  <p className="text-xs font-bold text-[#64748B] mb-2">
                    {editMode === 'garments-only' ? '👕 รายการเสื้อที่เบิก' : '👕 ขั้นตอนที่ 2: เลือกแบบเสื้อ'}
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
                        ⚠ ต้องเลือกแบบเสื้ออย่างน้อย 1 แบบ
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
                      toast.success('➕ เพิ่มพนักงานคนใหม่สำเร็จ', {
                        description: 'กรุณากรอกข้อมูลสำหรับพนักงานคนถัดไป',
                      });
                    }}
                    className="min-h-11 rounded-lg bg-[#002B5B] text-xs sm:text-sm font-bold text-white transition hover:bg-[#013A78] active:scale-95"
                    title="เพิ่มพนักงานใหม่และแก้ไขต่อทันที"
                  >
                    เพิ่มคนถัดไป ➕
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
  const iconMap = {
    สาขา: '🏢',
    ผู้ติดต่อ: '👤',
    พนักงาน: '👥',
    จำนวนรวม: '📦',
  };
  const icon = iconMap[label] || '📋';
  return (
    <div className="min-w-0 rounded-xl bg-[#F4F7FC] px-3 py-3 border border-[#E2E8F0]">
      <p className="text-xs font-bold text-[#64748B]">
        {icon} {label}
      </p>
      <p className="mt-1 break-words font-extrabold text-[#071638] text-sm">{value}</p>
    </div>
  );
}

function DashboardApp({ demoMode, onOpenOrder }) {
  const [adminToken, setDashboardToken] = useState(getAdminToken);

  function handleUnlock(token) {
    setAdminToken(token);
    setDashboardToken(token);
  }

  function handleAuthExpired() {
    setAdminToken('');
    setDashboardToken('');
  }

  if (!adminToken) {
    return <DashboardLogin onUnlock={handleUnlock} onOpenOrder={onOpenOrder} />;
  }

  return (
    <>
      <DashboardHeader onOpenOrder={onOpenOrder} />
      <main className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-3 pb-10 pt-3 sm:px-5 lg:gap-4 lg:pt-5">
        <Dashboard demoMode={demoMode} onAuthExpired={handleAuthExpired} />
      </main>
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
      toast.success('เข้าสู่แดชบอร์ดแล้ว');
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

function UserManualDialog({ open, setOpen }) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="user-manual-dialog fixed inset-x-3 bottom-3 top-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#DDE5F0] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(46rem,88vh)] sm:w-[min(48rem,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div className="flex items-center justify-between border-b border-[#E7EAF0] bg-white px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-[#071638] sm:text-xl flex items-center gap-2">
                <span>📖</span> คู่มือการใช้งานระบบเบิกเสื้อพนักงาน
              </Dialog.Title>
            </div>
            <Dialog.Close
              className="grid size-10 shrink-0 place-items-center rounded-full text-[#1F2937] transition hover:bg-[#F1F5F9] cursor-pointer"
              aria-label="ปิด"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-6 text-sm text-[#374151] leading-relaxed">
            <p className="text-xs sm:text-sm font-semibold text-neutral-500">
              ยินดีต้อนรับสู่ระบบเบิกเสื้อพนักงานรุ่นปรับปรุงใหม่! ระบบใช้กระบวนการกรอกข้อมูลแบบ <strong className="text-[#002B5B]">3 ขั้นตอน (3-Step Wizard Flow)</strong> เพื่อให้ง่าย ถูกต้อง และป้องกันความผิดพลาดในการส่งข้อมูล ดังนี้:
            </p>

            {/* Step 1 */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-4 space-y-2">
              <h3 className="text-sm sm:text-base font-black text-[#002B5B] flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#002B5B] text-white text-xs font-bold">1</span>
                <span>ขั้นตอนที่ 1: ข้อมูลผู้เบิก</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#44536A] font-semibold pl-8">
                กรอกข้อมูลผู้รับผิดชอบการขอเบิกเสื้อ ได้แก่ **ชื่อผู้ควบคุมงาน (Supervisor)**, **บริษัทในเครือ**, **สาขา/แผนก** และ **เบอร์โทรศัพท์** ให้ครบถ้วนสมบูรณ์ก่อนที่จะสามารถกดถัดไปเพื่อเริ่มกรอกข้อมูลพนักงาน
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 space-y-3">
              <h3 className="text-sm sm:text-base font-black text-[#4F46E5] flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#4F46E5] text-white text-xs font-bold">2</span>
                <span>ขั้นตอนที่ 2: รายการเสื้อพนักงาน</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#44536A] font-semibold pl-8">
                ระบุรายชื่อพนักงานและเลือกไซส์เสื้อผ่านแท็บเครื่องมือ 3 รูปแบบตามความสะดวก:
              </p>
              <div className="grid gap-3 sm:grid-cols-3 pl-8">
                <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-1">
                  <h4 className="font-bold text-xs text-neutral-800">📝 1. กรอกตาราง</h4>
                  <p className="text-[11px] text-neutral-500 font-semibold leading-relaxed">
                    เพิ่มแถวพนักงานทีละคน หรือกด "เพิ่มพนักงานหลายคน" เพื่อวางลิสต์ชื่อ จากนั้นเลือกเพศ และกดปุ่ม <strong className="text-[#002B5B]">+</strong> ในคอลัมน์เสื้อเพื่อระบุประเภท ไซส์ และจำนวน (รองรับการขอเบิกเสื้อหลายแบบ/หลายตัวต่อคน)
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-1">
                  <h4 className="font-bold text-xs text-neutral-800">👥 2. คัดลอกแถว</h4>
                  <p className="text-[11px] text-neutral-500 font-semibold leading-relaxed">
                    ใช้เพื่อคัดลอกหรือจำลองรายชื่อพนักงานและข้อมูลเสื้อผ้าจากไฟล์ภายนอก หรือทำการโคลนรายการได้อย่างสะดวกรวดเร็ว
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-1">
                  <h4 className="font-bold text-xs text-neutral-800">📥 3. นำเข้า CSV (Excel)</h4>
                  <p className="text-[11px] text-neutral-500 font-semibold leading-relaxed">
                    ดาวน์โหลดเทมเพลตไฟล์ CSV ไปกรอกรายละเอียดพนักงานทั้งหมดใน Excel หรือ Google Sheets แล้วอัปโหลดกลับเข้าสู่ระบบทันที
                  </p>
                </div>
              </div>
              <div className="pl-8 text-xs text-neutral-500 space-y-1">
                <p>💡 **ฟังก์ชันอำนวยความสะดวกเพิ่มเติม:**</p>
                <ul className="list-disc pl-4 space-y-1 font-semibold">
                  <li><strong className="text-[#071638]">คัดลอกข้อมูลคนแรกให้ทุกคน:</strong> นำเพศและเสื้อของคนแรกไปคัดลอกลงในพนักงานทุกคนในคลิกเดียว</li>
                  <li><strong className="text-[#071638]">แสดงเฉพาะคนที่กรอกไม่ครบ:</strong> กรองแถวที่ยังไม่ได้ระบุไซส์หรือประเภทเสื้อเพื่อตรวจสอบความถูกต้อง</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-green-100 bg-green-50/20 p-4 space-y-2">
              <h3 className="text-sm sm:text-base font-black text-green-700 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">3</span>
                <span>ขั้นตอนที่ 3: ตรวจสอบและส่งข้อมูล</span>
              </h3>
              <ul className="list-decimal pl-8 space-y-1.5 text-xs sm:text-sm text-[#44536A] font-semibold">
                <li>
                  <strong className="text-[#071638]">ตรวจสอบยอดรวมและสถิติ:</strong> ระบบจะสรุปจำนวนยอดสั่งรวมแยกตามไซส์และรูปแบบเสื้อให้อย่างชัดเจน
                </li>
                <li>
                  <strong className="text-[#071638]">เช็กยอดคลังสินค้า:</strong> ระบบเปรียบเทียบยอดขอกับสต็อกใน Google Sheets แบบเรียลไทม์ โดยจะแสดงป้ายกำกับ <span className="inline-block rounded-sm bg-green-100 text-green-800 px-1 text-[10px] font-black">พร้อมส่ง</span> หรือ <span className="inline-block rounded-sm bg-yellow-100 text-[#D97706] px-1 text-[10px] font-black">รอผลิต</span>
                </li>
                <li>
                  <strong className="text-[#071638]">ยอมรับข้อตกลง:</strong> ทำเครื่องหมายถูกที่กล่องยืนยันทั้ง 3 ข้อเพื่อปลดล็อกปุ่มส่งข้อมูล
                </li>
                <li>
                  <strong className="text-[#002B5B]">ส่งเบิกเสื้อ:</strong> กดปุ่มสีน้ำเงิน <strong className="text-[#002B5B]">"ส่งข้อมูลการเบิกเสื้อ"</strong> เพื่อบันทึกเข้าฐานข้อมูลหลักและรับรหัสคำสั่ง (Batch ID)
                </li>
              </ul>
            </div>

            <section className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <h3 className="text-xs sm:text-sm font-extrabold text-neutral-700 flex items-center gap-1.5">
                <span>⚡</span> ข้อมูลการบันทึกดราฟต์อัตโนมัติ
              </h3>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                ระบบเปิดใช้การบันทึกดราฟต์ข้อมูลอัตโนมัติ (Auto-Save) ลงเครื่องของคุณตลอดเวลา หากเบราว์เซอร์เผลอปิดหรือปิดเครื่อง ข้อมูลในขั้นตอนล่าสุดจะยังคงอยู่และสามารถทำรายการต่อได้ทันทีเมื่อเปิดหน้าเว็บนี้ขึ้นมาใหม่
              </p>
            </section>
          </div>
          
          <div className="flex justify-end gap-2 border-t border-[#E7EAF0] bg-[#F8FAFD] px-4 py-3 sm:px-5">
            <button
              onClick={() => setOpen(false)}
              className="min-h-10 rounded-lg bg-[#002B5B] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#002144] cursor-pointer"
            >
              เข้าใจแล้ว
            </button>
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

function ClothingManager({ config, setConfig, onAuthExpired }) {
  const [uploadingId, setUploadingId] = useState('');
  const [selectedId, setSelectedId] = useState(() => config[0]?.id || '');
  const [selectedGender, setSelectedGender] = useState(GENDERS[0]);
  const [deleteClothingId, setDeleteClothingId] = useState('');
  const syncTimerRef = useRef(null);
  const selectedItem = config.find((item) => item.id === selectedId) || config[0];
  const deleteClothingItem = config.find((item) => item.id === deleteClothingId) || null;
  const selectedSizeRows =
    selectedItem?.genderSizeRows?.[selectedGender] || selectedItem?.sizeRows || [];

  useEffect(() => {
    if (!config.some((item) => item.id === selectedId)) {
      setSelectedId(config[0]?.id || '');
    }
  }, [config, selectedId]);

  useEffect(() => () => window.clearTimeout(syncTimerRef.current), []);

  function scheduleSharedConfigSync(normalizedConfig) {
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      publishSharedClothingConfig(normalizedConfig).catch((error) => {
        if (isAuthFailure(error)) {
          setAdminToken('');
          onAuthExpired?.();
          toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
            description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
          });
          return;
        }
        toast.error('บันทึกการตั้งค่าเสื้อไม่สำเร็จ', {
          description: error?.message || 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
        });
      });
    }, 700);
  }

  function commit(nextConfig) {
    const normalized = normalizeClothingConfig(nextConfig);
    setConfig(normalized);
    saveClothingConfig(normalized);
    scheduleSharedConfigSync(normalized);
  }

  function patchItem(id, patch) {
    commit(config.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function patchSize(id, sizeIndex, patch) {
    commit(
      config.map((item) =>
        item.id === id
          ? {
              ...item,
              genderSizeRows: {
                ...(item.genderSizeRows || {}),
                [selectedGender]: (
                  item.genderSizeRows?.[selectedGender] ||
                  item.sizeRows ||
                  []
                ).map((row, index) => (index === sizeIndex ? { ...row, ...patch } : row)),
              },
            }
          : item
      )
    );
  }

  function patchSizeDetail(id, sizeIndex, field, value) {
    commit(
      config.map((item) =>
        item.id === id
          ? {
              ...item,
              genderSizeRows: {
                ...(item.genderSizeRows || {}),
                [selectedGender]: (
                  item.genderSizeRows?.[selectedGender] ||
                  item.sizeRows ||
                  []
                ).map((row, index) =>
                  index === sizeIndex
                    ? {
                        ...row,
                        details: { ...(row.details || {}), [field]: value },
                      }
                    : row
                ),
              },
            }
          : item
      )
    );
  }

  function patchDetailField(id, fieldIndex, value) {
    commit(
      config.map((item) => {
        if (item.id !== id) return item;
        const oldField = item.detailFields[fieldIndex];
        const detailFields = item.detailFields
          .map((field, index) => (index === fieldIndex ? value : field))
          .filter(Boolean);
        return {
          ...item,
          detailFields,
          genderSizeRows: GENDERS.reduce(
            (genderRows, gender) => ({
              ...genderRows,
              [gender]: (item.genderSizeRows?.[gender] || item.sizeRows || []).map((row) => {
                const details = { ...(row.details || {}) };
                if (oldField && value && oldField !== value) {
                  details[value] = details[oldField] || '';
                  delete details[oldField];
                }
                return { ...row, details };
              }),
            }),
            {}
          ),
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
              detailFields: [...item.detailFields, 'รายละเอียด'],
              genderSizeRows: GENDERS.reduce(
                (genderRows, gender) => ({
                  ...genderRows,
                  [gender]: (item.genderSizeRows?.[gender] || item.sizeRows || []).map((row) => ({
                    ...row,
                    details: { ...(row.details || {}), รายละเอียด: '' },
                  })),
                }),
                {}
              ),
            }
          : item
      )
    );
  }

  function deleteDetailField(id, fieldIndex) {
    commit(
      config.map((item) => {
        if (item.id !== id || item.detailFields.length <= 1) return item;
        const field = item.detailFields[fieldIndex];
        return {
          ...item,
          detailFields: item.detailFields.filter((_, index) => index !== fieldIndex),
          genderSizeRows: GENDERS.reduce(
            (genderRows, gender) => ({
              ...genderRows,
              [gender]: (item.genderSizeRows?.[gender] || item.sizeRows || []).map((row) => {
                const details = { ...(row.details || {}) };
                delete details[field];
                return { ...row, details };
              }),
            }),
            {}
          ),
        };
      })
    );
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
        sizeRows: [{ size: 'M', details: { อก: '' } }],
        genderSizeRows: GENDERS.reduce(
          (rows, gender) => ({ ...rows, [gender]: [{ size: 'M', details: { อก: '' } }] }),
          {}
        ),
      },
    ]);
    setSelectedId(id);
  }

  function deleteClothing(id) {
    if (config.length <= 1) {
      toast.error('ลบแบบเสื้อไม่ได้', { description: 'ต้องมีประเภทเสื้ออย่างน้อย 1 รายการ' });
      return;
    }
    setDeleteClothingId(id);
  }

  function confirmDeleteClothing() {
    if (!deleteClothingId) return;
    commit(config.filter((item) => item.id !== deleteClothingId));
    setDeleteClothingId('');
  }

  function addSize(id) {
    commit(
      config.map((item) =>
        item.id === id
          ? {
              ...item,
              genderSizeRows: {
                ...(item.genderSizeRows || {}),
                [selectedGender]: [
                  ...(item.genderSizeRows?.[selectedGender] || item.sizeRows || []),
                  {
                    size: '',
                    details: item.detailFields.reduce(
                      (details, field) => ({ ...details, [field]: '' }),
                      {}
                    ),
                    qty: 0,
                  },
                ],
              },
            }
          : item
      )
    );
  }

  function deleteSize(id, sizeIndex) {
    commit(
      config.map((item) =>
        item.id === id
          ? {
              ...item,
              genderSizeRows: {
                ...(item.genderSizeRows || {}),
                [selectedGender]:
                  (item.genderSizeRows?.[selectedGender] || item.sizeRows || []).length > 1
                    ? (item.genderSizeRows?.[selectedGender] || item.sizeRows || []).filter(
                        (_, index) => index !== sizeIndex
                      )
                    : item.genderSizeRows?.[selectedGender] || item.sizeRows || [],
              },
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

  function deleteColor(id, colorIndex) {
    commit(
      config.map((item) =>
        item.id === id
          ? {
              ...item,
              colors: (item.colors || []).filter((_, index) => index !== colorIndex),
            }
          : item
      )
    );
  }

  async function uploadImage(id, file) {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error('ไฟล์รูปไม่ถูกต้อง', { description: validationError });
      return;
    }
    setUploadingId(id);
    const loadingToastId = toast.loading('กำลังอัปโหลดรูปเสื้อ...', {
      description: 'ระบบกำลังบันทึกรูป กรุณารอสักครู่',
    });
    try {
      const result = await uploadImageToBlob(file);
      patchItem(id, { imageUrl: result.url });
      toast.success('อัปโหลดรูปเสื้อแล้ว', { id: loadingToastId });
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
      toast.error('อัปโหลดรูปเสื้อไม่สำเร็จ', {
        id: loadingToastId,
        description: error?.message || 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      });
    } finally {
      setUploadingId('');
    }
  }

  return (
    <>
      <Card className="clothing-manager-card p-0">
        <div className="flex flex-col gap-3 border-b border-[#E7EAF0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[#071638]">ตั้งค่าเสื้อและไซส์</h2>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              เลือกแบบเสื้อจากรายการ แล้วแก้รายละเอียดเฉพาะตัวที่ต้องการ
            </p>
          </div>
          <button
            onClick={addClothing}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#002B5B] px-4 text-sm font-bold text-white"
          >
            <Plus /> เพิ่มแบบเสื้อ
          </button>
        </div>
        <div className="grid gap-4 bg-[#F7F9FC] p-3 lg:grid-cols-[18rem_1fr] lg:items-start">
          <div className="clothing-list grid max-h-[70vh] gap-2 overflow-auto rounded-xl border border-[#E4E4E7] bg-white p-2">
            {config.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'grid grid-cols-[3.25rem_1fr] gap-3 rounded-lg border p-2 text-left transition',
                  item.id === selectedItem?.id
                    ? 'border-[#0D152A] bg-[#F8FAFC] shadow-sm'
                    : 'border-transparent bg-white hover:border-[#E7EAF0] hover:bg-[#F8FAFC]'
                )}
              >
                <div className="overflow-hidden rounded-md border border-[#E4E4E7] bg-white">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.type}
                      className="h-12 w-full bg-[#F8FAFC] object-contain"
                    />
                  ) : (
                    <div className="grid h-12 place-items-center text-[#A1A1AA]">
                      <Shirt className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#18181B]">
                    {item.type || 'ยังไม่ระบุชื่อ'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#71717A]">
                    {GENDERS.map((gender) => {
                      const rows = item.genderSizeRows?.[gender] || item.sizeRows || [];
                      const totalQty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
                      return `${gender} ${rows.length} ไซส์ (${totalQty} ชิ้น)`;
                    }).join(' · ')}{' '}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedItem && (
            <div className="clothing-editor rounded-xl border border-[#D8DEEA] bg-white p-3">
              <div className="grid gap-3 lg:grid-cols-[9rem_1fr_auto] lg:items-start">
                <div className="overflow-hidden rounded-xl border border-[#D8DEEA] bg-white">
                  {selectedItem.imageUrl ? (
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.type}
                      className="h-32 w-full bg-[#F8FAFC] object-contain"
                    />
                  ) : (
                    <div className="grid h-32 place-items-center text-sm font-bold text-[#94A3B8]">
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  <Field label="ชื่อประเภทเสื้อ">
                    <TextInput
                      value={selectedItem.type}
                      onChange={(value) => patchItem(selectedItem.id, { type: value })}
                      placeholder="เช่น เสื้อโปโล"
                    />
                  </Field>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#64748B]">สีที่มี</p>
                      <button
                        onClick={() => addColor(selectedItem.id)}
                        className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[#BFD0EA] bg-white px-3 text-xs font-bold text-[#002B5B]"
                      >
                        <Plus className="size-3.5" /> เพิ่มสี
                      </button>
                    </div>
                    {(selectedItem.colors || []).length ? (
                      selectedItem.colors.map((color, index) => (
                        <div
                          key={`${selectedItem.id}-color-${index}`}
                          className="grid grid-cols-[40px_1fr_40px] gap-2"
                        >
                          <input
                            type="color"
                            value={color.value || '#0F172A'}
                            onChange={(event) =>
                              patchColor(selectedItem.id, index, { value: event.target.value })
                            }
                            className="h-10 w-10 rounded-lg border border-[#CBD5E1] bg-white p-1"
                            aria-label="เลือกสี"
                          />
                          <GridInput
                            value={color.name}
                            onChange={(value) =>
                              patchColor(selectedItem.id, index, { name: value })
                            }
                            placeholder="เช่น กรมท่า"
                            className="min-h-10 px-3 text-sm"
                          />
                          <button
                            onClick={() => deleteColor(selectedItem.id, index)}
                            className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                            title="ลบสี"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white px-3 py-2 text-sm font-semibold text-[#64748B]">
                        ยังไม่มีสี ถ้าเสื้อตัวนี้มีหลายสีให้กดเพิ่มสี
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#64748B]">รายละเอียดไซส์</p>
                      <button
                        onClick={() => addDetailField(selectedItem.id)}
                        className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[#BFD0EA] bg-white px-3 text-xs font-bold text-[#002B5B]"
                      >
                        <Plus className="size-3.5" /> เพิ่มช่อง
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {GENDERS.map((gender) => (
                        <button
                          key={gender}
                          onClick={() => setSelectedGender(gender)}
                          className={cn(
                            'min-h-9 rounded-lg border text-sm font-black transition',
                            selectedGender === gender
                              ? 'border-[#002B5B] bg-[#002B5B] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#071638]'
                          )}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-2 rounded-lg border border-[#E4E4E7] bg-white p-2 sm:hidden">
                      <div className="grid gap-2 rounded-lg bg-[#F8FAFC] p-2">
                        <p className="text-xs font-bold text-[#64748B]">ช่องรายละเอียด</p>
                        {selectedItem.detailFields.map((field, index) => (
                          <div
                            key={`${selectedItem.id}-mobile-field-${index}`}
                            className="grid grid-cols-[1fr_40px] gap-2"
                          >
                            <GridInput
                              value={field}
                              onChange={(value) => patchDetailField(selectedItem.id, index, value)}
                              placeholder="อก"
                              className="h-10 min-h-10 rounded-md px-2 text-xs font-bold"
                            />
                            <button
                              onClick={() => deleteDetailField(selectedItem.id, index)}
                              disabled={selectedItem.detailFields.length <= 1}
                              className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40"
                              title="ลบช่องรายละเอียด"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {selectedSizeRows.map((row, index) => (
                        <div
                          key={`${selectedItem.id}-mobile-size-${index}`}
                          className="grid gap-2 rounded-lg bg-[#F8FAFC] p-2"
                        >
                          <div className="grid grid-cols-[1fr_40px] gap-2">
                            <GridInput
                              value={row.size}
                              onChange={(value) =>
                                patchSize(selectedItem.id, index, { size: value })
                              }
                              placeholder="M"
                              className="h-10 min-h-10 rounded-lg px-3 text-sm"
                            />
                            <button
                              onClick={() => deleteSize(selectedItem.id, index)}
                              className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                              title="ลบไซส์"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                          {selectedItem.detailFields.map((field) => (
                            <Field
                              key={`${selectedItem.id}-mobile-${index}-${field}`}
                              label={field}
                            >
                              <GridInput
                                value={row.details?.[field] || ''}
                                onChange={(value) =>
                                  patchSizeDetail(selectedItem.id, index, field, value)
                                }
                                placeholder={field}
                                className="h-10 min-h-10 rounded-lg px-3 text-sm"
                              />
                            </Field>
                          ))}
                          <Field label="จำนวนสต็อก">
                            <GridInput
                              type="number"
                              inputMode="numeric"
                              value={String(row.qty ?? 0)}
                              onChange={(value) =>
                                patchSize(selectedItem.id, index, { qty: Number(value) || 0 })
                              }
                              className="h-10 min-h-10 rounded-lg px-3 text-sm"
                            />
                          </Field>
                        </div>
                      ))}
                    </div>
                    <div className="hidden gap-2 overflow-x-auto rounded-lg border border-[#E4E4E7] bg-white p-2 sm:grid">
                      <div
                        className="grid min-w-max gap-2"
                        style={{
                          gridTemplateColumns: `minmax(4.5rem,.7fr) repeat(${selectedItem.detailFields.length}, minmax(5rem,1fr)) minmax(7rem,1fr) 40px`,
                        }}
                      >
                        <span className="text-xs font-bold text-[#64748B]">ไซส์</span>
                        {selectedItem.detailFields.map((field, index) => (
                          <div
                            key={`${selectedItem.id}-field-${index}`}
                            className="grid grid-cols-[1fr_32px] gap-1"
                          >
                            <GridInput
                              value={field}
                              onChange={(value) => patchDetailField(selectedItem.id, index, value)}
                              placeholder="อก"
                              className="h-8 rounded-md px-2 text-xs font-bold"
                            />
                            <button
                              onClick={() => deleteDetailField(selectedItem.id, index)}
                              disabled={selectedItem.detailFields.length <= 1}
                              className="grid min-h-8 place-items-center rounded-md border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40"
                              title="ลบช่องรายละเอียด"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <span className="text-xs font-bold text-[#64748B]">จำนวน</span>
                        <span />
                      </div>
                      {selectedSizeRows.map((row, index) => (
                        <div
                          key={`${selectedItem.id}-${index}`}
                          className="grid min-w-max gap-2"
                          style={{
                            gridTemplateColumns: `minmax(4.5rem,.7fr) repeat(${selectedItem.detailFields.length}, minmax(5rem,1fr)) minmax(7rem,1fr) 40px`,
                          }}
                        >
                          <GridInput
                            value={row.size}
                            onChange={(value) => patchSize(selectedItem.id, index, { size: value })}
                            placeholder="M"
                            className="h-10 min-h-10 rounded-lg px-3 text-sm"
                          />
                          {selectedItem.detailFields.map((field) => (
                            <GridInput
                              key={`${selectedItem.id}-${index}-${field}`}
                              value={row.details?.[field] || ''}
                              onChange={(value) =>
                                patchSizeDetail(selectedItem.id, index, field, value)
                              }
                              placeholder={field}
                              className="h-10 min-h-10 rounded-lg px-3 text-sm"
                            />
                          ))}
                          <GridInput
                            type="number"
                            inputMode="numeric"
                            value={String(row.qty ?? 0)}
                            onChange={(value) =>
                              patchSize(selectedItem.id, index, { qty: Number(value) || 0 })
                            }
                            className="h-10 min-h-10 rounded-lg px-3 text-sm"
                          />
                          <button
                            onClick={() => deleteSize(selectedItem.id, index)}
                            className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                            title="ลบไซส์"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => addSize(selectedItem.id)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-[#8FA4C7] bg-white px-3 text-sm font-bold text-[#002B5B]"
                  >
                    <Plus className="size-4" /> เพิ่มไซส์
                  </button>
                </div>
                <div className="grid gap-2">
                  <label
                    className={cn(
                      'flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#BFD0EA] bg-[#E5EFFD] px-3 text-sm font-bold text-[#002B5B]',
                      uploadingId === selectedItem.id
                        ? 'cursor-not-allowed opacity-70'
                        : 'cursor-pointer'
                    )}
                  >
                    {uploadingId === selectedItem.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Upload />
                    )}
                    {uploadingId === selectedItem.id ? 'กำลังอัปโหลด' : 'แนบรูป'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploadingId === selectedItem.id}
                      onChange={(event) => {
                        uploadImage(selectedItem.id, event.target.files?.[0]);
                        event.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => deleteClothing(selectedItem.id)}
                    className="min-h-10 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 text-sm font-bold text-[#B91C1C]"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Trash2 className="size-4" /> ลบแบบเสื้อ
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      <ConfirmDialog
        open={Boolean(deleteClothingItem)}
        title="ลบประเภทเสื้อ"
        description={
          deleteClothingItem
            ? `ลบประเภทเสื้อ ${deleteClothingItem.type}? รายการเก่าที่เคยสั่งจะยังอยู่ในประวัติ`
            : ''
        }
        confirmLabel="ลบประเภทเสื้อ"
        cancelLabel="ยกเลิก"
        destructive
        onCancel={() => setDeleteClothingId('')}
        onConfirm={confirmDeleteClothing}
      />
    </>
  );
}

function Dashboard({ demoMode, onAuthExpired }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  async function loadData({ silent = false } = {}) {
    if (refreshing) return;
    const showSkeleton = !silent && !batches.length;
    if (showSkeleton) setLoading(true);
    setRefreshing(true);
    const loadingToastId = silent
      ? toast.loading('กำลังโหลดข้อมูล...', { description: 'ระบบกำลังเตรียมข้อมูล กรุณารอสักครู่' })
      : null;
    try {
      const storedBatches = readStoredBatches();
      if (!demoMode) {
        const response = await authFetch('/api/dashboard/orders', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || result?.success === false)
          throw new Error(result?.error || 'GAS request failed');
        const data = Array.isArray(result) ? result : result?.data;
        const remoteBatches = Array.isArray(data)
          ? data.map(normalizeBatch).filter((batch) => batch.orders.length)
          : storedBatches;
        setBatches(remoteBatches);
        if (Array.isArray(data)) saveStoredBatches(remoteBatches);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setBatches(storedBatches);
      }
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
      const storedBatches = readStoredBatches();
      setBatches(storedBatches);
      toast.error('โหลดข้อมูลแดชบอร์ดไม่สำเร็จ', {
        id: loadingToastId || undefined,
        description: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
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
  }, [demoMode]);

  const filteredBatches = useMemo(
    () =>
      batches.filter((batch) => {
        const inBranch = branchFilter === 'ทุกสาขา' || batch.branch === branchFilter;
        const inStatus = statusFilter === 'ทุกสถานะ' || batch.status === statusFilter;
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
        return inBranch && inStatus && inQuery;
      }),
    [batches, branchFilter, statusFilter, query]
  );

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
    if (demoMode || !isGasConfigured()) return;
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
          const nextQty = Number(row.qty || 0) + delta;
          changed = true;
          return { ...row, qty: Math.max(0, nextQty) };
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
      if (!demoMode && isGasConfigured()) {
        await publishSharedClothingConfig(nextConfig);
      }

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
    if (!demoMode && isGasConfigured()) {
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
    }

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
            return { ...row, qty: Math.max(0, Number(row.qty || 0) - item.shippedQty) };
          });
          genderSizeRows[item.gender] = updatedRows;
          return { ...clothing, genderSizeRows };
        });
      });

      setClothingConfig(nextConfig);
      saveClothingConfig(nextConfig);

      if (!demoMode && isGasConfigured()) {
        await publishSharedClothingConfig(nextConfig);
      }

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
      saveStoredBatches(next);
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
      'สี',
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
          row.color || '',
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

  return (
    <>
      <section className="rounded-xl border border-[#D8E3F5] bg-white/96 px-3 py-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#071638] sm:text-xl">
              แดชบอร์ดเบิกเสื้อ
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#64748B] sm:text-sm">
              ดูยอดรวม แยกรายคน และจัดการคำสั่งเบิก
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExportExpanded((v) => !v)}
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#BFD0EA] bg-[#E5EFFD] px-3 text-sm font-bold text-[#002B5B]"
            >
              <Download className="size-4" /> ส่งออก Excel (CSV)
              <ChevronDown className={cn('size-3.5 transition', exportExpanded && 'rotate-180')} />
            </button>
            <button
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#BFD0EA] bg-white px-3 text-sm font-bold text-[#002B5B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : null}
              {refreshing ? 'กำลังโหลด' : 'โหลดข้อมูลใหม่'}
            </button>
          </div>
        </div>
        {exportExpanded && (
          <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 grid gap-3">
            {/* Main Filters */}
            <div className="grid gap-2 sm:grid-cols-3 items-end">
              <Field label="สาขาที่ส่งออก">
                <Select
                  value={exportBranchFilter}
                  onChange={setExportBranchFilter}
                  values={exportBranchOptions}
                />
              </Field>
              <Field label="ตั้งแต่เดือน">
                <MonthInput value={exportStartMonth} onChange={setExportStartMonth} />
              </Field>
              <Field label="ถึงเดือน">
                <MonthInput value={exportEndMonth} onChange={setExportEndMonth} />
              </Field>
            </div>

            {/* Toggle for Advanced Filters */}
            <div>
              <button
                type="button"
                onClick={() => setAdvancedExportExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#002B5B] hover:text-[#002144] focus:outline-none"
              >
                <Settings className="size-3.5" />
                {advancedExportExpanded
                  ? 'ซ่อนตัวกรองขั้นสูง'
                  : 'แสดงตัวกรองขั้นสูง (เพศ, แบบเสื้อ, ไซส์, สถานะ)'}
                <ChevronDown
                  className={cn('size-3.5 transition', advancedExportExpanded && 'rotate-180')}
                />
              </button>
            </div>

            {/* Advanced Filters */}
            {advancedExportExpanded && (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 border-t border-[#E2E8F0] pt-3">
                <Field label="เพศ">
                  <Select
                    value={exportGenderFilter}
                    onChange={setExportGenderFilter}
                    values={exportGenderOptions}
                  />
                </Field>
                <Field label="แบบเสื้อ">
                  <Select
                    value={exportTypeFilter}
                    onChange={setExportTypeFilter}
                    values={exportTypeOptions}
                  />
                </Field>
                <Field label="ไซส์">
                  <Select
                    value={exportSizeFilter}
                    onChange={setExportSizeFilter}
                    values={exportSizeOptions}
                  />
                </Field>
                <Field label="สถานะ">
                  <Select
                    value={exportStatusFilter}
                    onChange={setExportStatusFilter}
                    values={exportStatusOptions}
                  />
                </Field>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end border-t border-[#E2E8F0] pt-3">
              <button
                onClick={exportCsv}
                disabled={refreshing || !exportRows.length}
                className="w-full sm:w-auto flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#002B5B] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 shadow-sm hover:bg-[#002144] transition-all"
              >
                <Download className="size-4" /> ส่งออก Excel (CSV) ({exportRows.length} รายการ)
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Stat icon={Users} value={metrics.totalEmployees} label="จำนวนพนักงาน" />
        <Stat icon={ClipboardList} value={`${metrics.pendingPieces} ชิ้น`} label="ยอดรอจัดส่ง" />
        <Stat icon={Truck} value={`${metrics.backorderPieces} ชิ้น`} label="ค้างส่ง (รอของ)" />
        <Stat icon={PackageCheck} value={`${metrics.shippedPieces} ชิ้น`} label="จัดส่งแล้ว" />
      </div>

      <Tabs.Root defaultValue="overview" className="grid gap-3">
        <Tabs.List className="dashboard-tabs grid grid-cols-2 gap-1 rounded-xl border border-[#D8DEEA] bg-white p-1 shadow-sm sm:grid-cols-4">
          <Tabs.Trigger
            value="overview"
            className="dashboard-tab flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm"
          >
            <LayoutDashboard className="size-4 shrink-0" />{' '}
            <span className="truncate">สรุปยอด</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="list"
            className="dashboard-tab flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm"
          >
            <Users className="size-4 shrink-0" /> <span className="truncate">แยกรายคน</span>
            <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-xs text-[#52525B] data-[state=active]:bg-white/15 data-[state=active]:text-white">
              {rows.length}
            </span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="orders"
            className="dashboard-tab flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm"
          >
            <ClipboardList className="size-4 shrink-0" />{' '}
            <span className="truncate">คำสั่งทั้งหมด</span>
            <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-xs text-[#52525B] data-[state=active]:bg-white/15 data-[state=active]:text-white">
              {filteredBatches.length}
            </span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="settings"
            className="dashboard-tab flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm"
          >
            <Settings className="size-4 shrink-0" /> <span className="truncate">ตั้งค่าเสื้อ</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="grid gap-3">
          <TypeFilterChips
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeFilterOptions}
            genderValue={summaryGenderFilter}
            onGenderChange={setSummaryGenderFilter}
            genderOptions={summaryGenderOptions}
            monthFilter={monthFilter}
            onMonthFilterChange={setMonthFilter}
            monthOptions={monthFilterOptions}
            totalPieces={monthTotalPieces}
          />
          <TotalSummaryView
            summaryRows={summaryRows}
            typeTotals={typeTotals}
            sizeTotals={sizeTotals}
            filteredRows={monthRows}
            monthFilter={monthFilter}
          />
        </Tabs.Content>

        <Tabs.Content value="list">
          <TypeFilterChips
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeFilterOptions}
            genderValue={summaryGenderFilter}
            onGenderChange={setSummaryGenderFilter}
            genderOptions={summaryGenderOptions}
          />
          <EmployeeWithdrawalList rows={visibleRows} totalRows={rows.length} />
        </Tabs.Content>

        <Tabs.Content value="orders">
          <div className="grid gap-3">
            <Card className="p-3">
              <div className="mb-3">
                <h2 className="text-base font-extrabold text-[#071638]">คำสั่งทั้งหมด</h2>
                <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                  ดูรายละเอียด แก้สถานะ และลบคำสั่งเป็นชุด
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[12rem_12rem_1fr_auto] lg:items-end">
                <Field label="สาขา">
                  <Select
                    value={branchFilter}
                    onChange={setBranchFilter}
                    values={['ทุกสาขา', ...BRANCHES]}
                  />
                </Field>
                <Field label="สถานะ">
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    values={['ทุกสถานะ', ...ORDER_STATUSES]}
                  />
                </Field>
                <Field label="ค้นหา">
                  <TextInput
                    value={query}
                    onChange={setQuery}
                    placeholder="ค้นหารหัสคำสั่ง บริษัท ผู้ติดต่อ เบอร์ หรือชื่อพนักงาน"
                  />
                </Field>
                <button
                  onClick={clearFilters}
                  className="min-h-11 rounded-lg border border-[#CBD5E1] bg-white px-4 font-bold text-[#002B5B] shadow-sm"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-sm font-black text-[#18181B]">
                  {filteredBatches.length} คำสั่ง
                </div>
                <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-sm font-black text-[#18181B]">
                  {filteredBatches.reduce((sum, b) => b.orders.length + sum, 0)} พนักงาน
                </div>
                <span className="rounded-lg bg-[#EEF4FF] px-3 py-2 text-sm font-black text-[#002B5B]">
                  รวม{' '}
                  {filteredBatches.reduce(
                    (sum, b) =>
                      sum + flattenBatches([b]).reduce((s, r) => s + Number(r.qty || 0), 0),
                    0
                  )}{' '}
                  ชิ้น
                </span>
              </div>
              {filteredBatches.length > 0 && (
                <button
                  onClick={() => {
                    const allSelected = filteredBatches.every((b) =>
                      selectedBatchIds.has(b.batchId)
                    );
                    if (allSelected) {
                      setSelectedBatchIds((prev) => {
                        const next = new Set(prev);
                        filteredBatches.forEach((b) => next.delete(b.batchId));
                        return next;
                      });
                    } else {
                      setSelectedBatchIds((prev) => {
                        const next = new Set(prev);
                        filteredBatches.forEach((b) => next.add(b.batchId));
                        return next;
                      });
                    }
                  }}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-black text-[#002B5B] hover:bg-[#F8FAFC] transition w-full sm:w-auto"
                >
                  {filteredBatches.every((b) => selectedBatchIds.has(b.batchId))
                    ? '✓ ยกเลิกการเลือกทั้งหมด'
                    : '☑ เลือกทั้งหมดตามตัวกรอง'}
                </button>
              )}
            </div>

            {filteredBatches.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredBatches.map((batch) => (
                  <DashboardOrderCard
                    key={batch.batchId}
                    batch={batch}
                    onOpen={() => setSelectedBatch(batch)}
                    onStatusChange={updateBatchStatus}
                    onDelete={requestDeleteBatch}
                    statusLoadingId={statusLoadingId}
                    deleteLoadingId={deleteLoadingId}
                    isSelected={selectedBatchIds.has(batch.batchId)}
                    onToggleSelect={() => {
                      setSelectedBatchIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(batch.batchId)) {
                          next.delete(batch.batchId);
                        } else {
                          next.add(batch.batchId);
                        }
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyDashboardState text="ยังไม่มีคำสั่งเบิกเสื้อตามเงื่อนไขที่เลือก" />
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="settings">
          <div className="grid gap-3">
            <Card className="p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#071638]">ตั้งค่าเสื้อและไซส์</h2>
                  <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                    แก้แบบเสื้อ สี และไซส์
                  </p>
                </div>
                <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-[#52525B]">
                  {clothingConfig.length} แบบเสื้อ
                </div>
              </div>
            </Card>
            <ClothingManager
              config={clothingConfig}
              setConfig={setClothingConfig}
              onAuthExpired={onAuthExpired}
            />
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {selectedBatchIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[980px] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-[#CBD5E1] bg-white p-4 shadow-2xl md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-[#EEF4FF] text-sm font-extrabold text-[#002B5B]">
              {selectedBatchIds.size}
            </span>
            <div>
              <p className="text-sm font-extrabold text-[#071638]">เลือกรายการคำขอเบิกแล้ว</p>
              <p className="text-xs font-semibold text-[#64748B]">
                จำนวน{' '}
                {Array.from(selectedBatchIds).reduce((sum, id) => {
                  const b = batches.find((x) => x.batchId === id);
                  return sum + (b ? getBatchPieces(b) : 0);
                }, 0)}{' '}
                ชิ้น
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange(ORDER_STATUS_DELIVERED)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#10B981] px-4 text-xs font-extrabold text-white transition hover:bg-[#059669] w-full sm:w-auto"
            >
              <CheckSquare className="size-4" /> จัดส่งสินค้าทั้งหมด
            </button>
            <button
              onClick={() => handleBulkStatusChange(ORDER_STATUS_BACKORDER)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#F97316] px-4 text-xs font-extrabold text-white transition hover:bg-[#EA580C] w-full sm:w-auto"
            >
              <Clock className="size-4" /> ปรับเป็นรอของ
            </button>
            <button
              onClick={() => handleBulkStatusChange(ORDER_STATUS_PENDING)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#EF4444] px-4 text-xs font-extrabold text-white transition hover:bg-[#DC2626] w-full sm:w-auto"
            >
              <AlertCircle className="size-4" /> ปรับเป็นรอจัดส่ง
            </button>
            <button
              onClick={() => setSelectedBatchIds(new Set())}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-4 text-xs font-extrabold text-[#64748B] transition hover:bg-[#F8FAFC] w-full sm:w-auto"
            >
              ยกเลิก
            </button>
          </div>
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
          row.color,
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
    { label: 'สี', className: 'min-w-[7rem]' },
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
              placeholder="ค้นหาชื่อ สาขา บริษัท เสื้อ สี ไซส์ หรือรหัสคำสั่ง"
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
                <td className="break-words px-3 py-4 text-center leading-6">{row.color || '-'}</td>
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
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <MobileInfo label="สี" value={row.color || '-'} compact />
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
              รวมจำนวนตามไซส์ ก่อนลงรายละเอียดแบบเสื้อและสี
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
          color: item.color || '',
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
        color: item.color,
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
                            {item.type} {item.color ? `· สี${item.color}` : ''} · ไซส์ {item.size}
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
                        {order.items.map((item) => (
                          <div
                            key={`${order.name}-${item.type}-${item.color}-${item.size}`}
                            className="rounded-lg bg-[#F8FAFC] p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="break-words text-sm font-extrabold text-[#071638]">
                                {item.type}
                              </p>
                              <StatusBadge status={item.status || ORDER_STATUS_PENDING} />
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                              <MobileInfo label="สี" value={item.color || '-'} compact />
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
                            <th className="w-20 px-3 py-3 sm:w-24 sm:px-4">สี</th>
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
                              <td className="break-words px-3 py-3 sm:px-4">{item.color || '-'}</td>
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
    const key = `${row.type}__${row.color || ''}__${row.size}`;
    const current = map.get(key) || {
      type: row.type,
      color: row.color || '',
      size: row.size,
      qty: 0,
    };
    current.qty += Number(row.qty || 0);
    map.set(key, current);
  });
  return [...map.values()].sort(
    (a, b) =>
      a.type.localeCompare(b.type, 'th') ||
      String(a.color).localeCompare(String(b.color), 'th') ||
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
    <Card className="min-w-0 p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF4FF] text-[#002B5B] sm:size-10">
          <Icon className="size-4 sm:size-5" />
        </div>
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="shrink-0 text-xl font-extrabold leading-none text-[#071638] sm:text-2xl">
            {value}
          </p>
          <p className="min-w-0 truncate text-xs font-bold text-[#64748B] sm:text-sm">{label}</p>
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

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
