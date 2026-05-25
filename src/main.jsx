import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { upload } from "@vercel/blob/client";
import { Toaster, toast } from "sonner";
import {
  Check,
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
  Plus,
  Ruler,
  Search,
  Send,
  Settings,
  Shirt,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { cn } from "./lib/utils";
import "./index.css";

const APPS_SCRIPT_URL = import.meta.env.VITE_GAS_URL || "YOUR_SCRIPT_URL_HERE";
const DASHBOARD_PATH = "#/dashboard";
const ORDER_PATH = "/";
const DASHBOARD_PASSCODE = import.meta.env.VITE_DASHBOARD_PASSCODE || "";
const ORDER_STORAGE_KEY = "gi-shirt-order-batches";
const ORDER_DRAFT_KEY = "gi-shirt-order-draft";
const CLOTHING_CONFIG_KEY = "gi-shirt-clothing-config";
const CLOTHING_SIZE_TABLE_VERSION_KEY = "gi-shirt-clothing-size-table-version";
const CLOTHING_SIZE_TABLE_VERSION = "2026-05-standard-shirt-table-v2";
const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_COMPANY_NAME = "โกลด์ อินทิเกรท จำกัด";
const ORDER_STATUS_PENDING = "รอจัดส่ง";
const ORDER_STATUS_DELIVERED = "จัดส่งแล้ว";
const ORDER_STATUSES = [ORDER_STATUS_PENDING, ORDER_STATUS_DELIVERED];

const BRANCHES = [
  "GI(สาขาใหญ่)",
  "EV7(สาขาใหญ่)",
  "The Mall บางกะปิ",
  "The Mall บางแค",
  "Warehouse",
  "กาญจนาภิเษก",
  "บางนา ทาวเวอร์",
  "พิบูลสงคราม",
  "มหาชัย",
  "มีนบุรี",
  "วิภาวดี",
  "ศาลายา",
  "อยุธยา",
  "อุบลราชธานี",
  "เซ็นทรัลพระราม 2",
  "เลียบคลอง 2",
  "เลียบด่วนรามอินทรา",
  "เอ็มสเฟียร์"
];
const CLOTHING_TYPES = ["เสื้อโปโล", "เสื้อช็อป", "กางเกงช็อป"];
const GENDERS = ["ชาย", "หญิง"];
const OTHER_SIZE = "อื่นๆ";
const PHONE_LENGTH = 10;

const SIZE_TABLES = {
  "เสื้อโปโล ชาย": [["S", '38"'], ["M", '40"'], ["L", '42"'], ["XL", '44"'], ["2XL", '46"'], ["3XL", '48"'], ["4XL", '50"'], ["5XL", '52"']],
  "เสื้อโปโล หญิง": [["S", '34"'], ["M", '36"'], ["L", '38"'], ["XL", '40"'], ["2XL", '42"'], ["3XL", '44"']],
  "เสื้อช็อป": [["S", '38"'], ["M", '40"'], ["L", '42"'], ["XL", '44"'], ["2XL", '46"'], ["3XL", '48"'], ["4XL", '50"'], ["5XL", '52"']],
  "กางเกงช็อป": [["28”", ""], ["30”", ""], ["32”", "3"], ["34”", "3"], ["36”", ""], ["38”", "3"], ["40”", ""], ["42”", "3"], ["44”", ""]]
};

function getStandardSizeSource(type, gender) {
  if (type === "เสื้อโปโล") return SIZE_TABLES[`เสื้อโปโล ${gender}`] || SIZE_TABLES["เสื้อโปโล ชาย"];
  return SIZE_TABLES[type] || [];
}

function getStandardDetailFields(type) {
  return type === "กางเกงช็อป" ? ["จำนวน"] : ["อก"];
}

function buildStandardSizeRows(type, gender) {
  const detailField = getStandardDetailFields(type)[0];
  return getStandardSizeSource(type, gender).map(([size, measure]) => ({
    size,
    details: { [detailField]: measure }
  }));
}

function buildDefaultClothingItem(type, item = {}) {
  const detailFields = getStandardDetailFields(type);
  const genderSizeRows = GENDERS.reduce((rows, gender) => ({
    ...rows,
    [gender]: buildStandardSizeRows(type, gender)
  }), {});
  return {
    id: item.id || crypto.randomUUID(),
    type,
    imageUrl: item.imageUrl || "",
    colors: Array.isArray(item.colors) ? item.colors : [],
    detailFields,
    sizeRows: genderSizeRows[GENDERS[0]],
    genderSizeRows
  };
}

const DEFAULT_CLOTHING_CONFIG = CLOTHING_TYPES.map((type) => buildDefaultClothingItem(type));

function normalizeSizeDetails(row, detailFields) {
  if (row?.details && typeof row.details === "object") {
    return detailFields.reduce((details, field) => ({ ...details, [field]: String(row.details[field] || "") }), {});
  }
  const fallback = String(row?.measure || "").trim();
  return detailFields.reduce((details, field, index) => ({ ...details, [field]: index === 0 ? fallback : "" }), {});
}

function normalizeSizeRows(rows, detailFields) {
  const normalizedRows = Array.isArray(rows) && rows.length
    ? rows.map((row) => ({
      size: String(row?.size || "").trim(),
      details: normalizeSizeDetails(row, detailFields)
    }))
    : [];
  return normalizedRows.length ? normalizedRows : [{ size: "M", details: normalizeSizeDetails({}, detailFields) }];
}

function normalizeClothingConfig(config) {
  const source = Array.isArray(config) && config.length ? config : DEFAULT_CLOTHING_CONFIG;
  return source.map((item, index) => {
    const type = String(item?.type || CLOTHING_TYPES[index] || "เสื้อ").trim();
    const detailFields = Array.isArray(item?.detailFields) && item.detailFields.length
      ? item.detailFields.map((field) => String(field || "").trim()).filter(Boolean)
      : [String(item?.detailLabel || (type.includes("กางเกง") ? "เอว" : "อก")).trim()];
    const fallbackRows = normalizeSizeRows(item?.sizeRows, detailFields);
    const genderSizeRows = GENDERS.reduce((genderRows, gender) => ({
      ...genderRows,
      [gender]: normalizeSizeRows(item?.genderSizeRows?.[gender] || fallbackRows, detailFields)
    }), {});

    return {
      id: item?.id || crypto.randomUUID(),
      type,
      imageUrl: item?.imageUrl || "",
      colors: Array.isArray(item?.colors)
        ? item.colors.map((color) => ({
          name: String(color?.name || "").trim(),
          value: String(color?.value || "#0F172A").trim() || "#0F172A"
        }))
        : [],
      detailFields,
      sizeRows: genderSizeRows[GENDERS[0]] || fallbackRows,
      genderSizeRows
    };
  }).filter((item) => item.type);
}

function migrateStandardSizeTables(config) {
  const normalized = normalizeClothingConfig(config);
  const standardTypes = new Set(CLOTHING_TYPES);
  const byType = new Map(normalized.map((item) => [item.type, item]));
  const migratedStandardItems = CLOTHING_TYPES.map((type) => buildDefaultClothingItem(type, byType.get(type)));
  const customItems = normalized.filter((item) => !standardTypes.has(item.type));
  return [...migratedStandardItems, ...customItems];
}

function readClothingConfig() {
  try {
    const normalized = normalizeClothingConfig(JSON.parse(localStorage.getItem(CLOTHING_CONFIG_KEY) || "null"));
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
  const response = await fetch("/api/blob/config", { cache: "no-store" });
  if (!response.ok) throw new Error("Shared clothing config is not available");
  const data = await response.json();
  if (!Array.isArray(data?.config) || !data.config.length) return null;
  const normalized = migrateStandardSizeTables(data.config);
  saveClothingConfig(normalized);
  localStorage.setItem(CLOTHING_SIZE_TABLE_VERSION_KEY, CLOTHING_SIZE_TABLE_VERSION);
  return normalized;
}

async function publishSharedClothingConfig(config) {
  const normalized = normalizeClothingConfig(config);
  const response = await fetch("/api/blob/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config: normalized })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Shared clothing config sync failed");
  }
  return normalized;
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
  return getColorOptions(type).length > 1;
}

function resolveItemColor(type, color = "") {
  const colors = getColorOptions(type);
  if (colors.length === 1) return colors[0];
  return colors.includes(color) ? color : "";
}

function getSizeRows(type, gender) {
  const clothing = findClothingConfig(type);
  const genderRows = clothing?.genderSizeRows?.[gender];
  if (genderRows?.length) return genderRows.map((row) => [row.size, Object.values(row.details || {}).filter(Boolean).join(" / ") || row.size]);
  if (clothing?.sizeRows?.length) return clothing.sizeRows.map((row) => [row.size, Object.values(row.details || {}).filter(Boolean).join(" / ") || row.size]);
  if (type === "เสื้อโปโล") return SIZE_TABLES[`เสื้อโปโล ${gender}`] || [];
  return SIZE_TABLES[type] || [];
}

function getSizeOptions(type, gender) {
  return [...getSizeRows(type, gender).map(([size]) => size), OTHER_SIZE];
}

function defaultSize(type, gender) {
  return getSizeOptions(type, gender)[1] || "M";
}

function patchSizeWithDefaultQty(item, size) {
  return {
    size,
    customSize: size === OTHER_SIZE ? item.customSize : "",
    qty: item.qty || 2
  };
}

function ItemColorSelect({ employee, item, dispatch, compact = false }) {
  const colors = getColorOptions(item.type);
  if (colors.length <= 1) return null;
  return (
    <GridSelect
      value={item.color || ""}
      disabled={!employee.gender}
      placeholder={employee.gender ? "เลือกสี" : "เลือกเพศก่อน"}
      values={colors}
      onChange={(color) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { color } })}
      compact={compact}
    />
  );
}

function formatOrderItemLabel(item) {
  return [item.type, item.color ? `สี${item.color}` : "", item.size, `x${item.qty || 0}`].filter(Boolean).join(" ");
}

function EmployeeItemSummary({ employee, onEdit }) {
  const visibleItems = employee.items.slice(0, 3);
  if (!employee.items.length) {
    return (
      <button onClick={onEdit} className="min-h-10 w-full rounded-lg border border-dashed border-[#A9B9D1] bg-white px-3 text-sm font-bold text-[#002B5B] hover:bg-[#F4F8FF]">
        <span className="inline-flex items-center justify-center gap-1.5"><Plus className="size-4" /> เพิ่มรายการเสื้อ</span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-[14rem] flex-1 flex-wrap gap-1.5">
        {visibleItems.map((item) => (
          <span key={`${item.type}-${item.color}-${item.size}`} className="max-w-full truncate rounded-full border border-[#D8DEEA] bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold text-[#44536A]">
            {formatOrderItemLabel(item)}
          </span>
        ))}
        {employee.items.length > visibleItems.length && (
          <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-black text-[#002B5B]">+{employee.items.length - visibleItems.length}</span>
        )}
      </div>
      <button onClick={onEdit} className="min-h-9 shrink-0 rounded-lg border border-[#D9E2EF] bg-white px-3 text-sm font-black text-[#0D152A]">
        แก้รายการ
      </button>
    </div>
  );
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
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
    employeeId: "",
    name: "",
    gender: "",
    expanded: index === 0,
    items: []
  };
}

function createOrderItem(type, gender, size = "", qty = 2, color = "") {
  const options = gender ? getSizeOptions(type, gender) : [];
  const colors = getColorOptions(type);
  const nextSize = size && options.includes(size) ? size : (gender ? defaultSize(type, gender) : "");
  return {
    type,
    size: nextSize,
    customSize: "",
    color: resolveItemColor(type, color),
    qty: digitsOnly(qty || 2)
  };
}

function createQuickOrderItems({ presetId, gender, defaultSizeValue, customItems }) {
  const sourceItems = getClothingTypes()
    .map((type, index) => ({ type, qty: customItems?.[index]?.qty || 2, color: customItems?.[index]?.color || "", enabled: Boolean(customItems?.[index]?.enabled) }))
    .filter((item) => item.enabled);

  return sourceItems.map((item) => createOrderItem(item.type, gender, defaultSizeValue, item.qty, item.color));
}

function createEmployeeFromQuickOrder(name, index, quickOrder) {
  return {
    ...createEmployee(index),
    name,
    gender: quickOrder.gender,
    expanded: index === 0,
    items: createQuickOrderItems(quickOrder)
  };
}

function createInitialOrderState() {
  return {
    companyName: DEFAULT_COMPANY_NAME,
    branch: BRANCHES[0],
    supervisorName: "",
    supervisorPhone: "",
    employees: Array.from({ length: 1 }, (_, index) => createEmployee(index))
  };
}

function normalizeDraftEmployee(employee, index) {
  return {
    ...createEmployee(index),
    ...employee,
    id: employee?.id || crypto.randomUUID(),
    name: employee?.name || "",
    gender: employee?.gender || "",
    expanded: index === 0,
    items: Array.isArray(employee?.items)
      ? employee.items.map((item) => ({
        type: item.type || "",
        size: item.size || "",
        customSize: item.customSize || "",
        color: resolveItemColor(item.type || "", item.color || ""),
        qty: digitsOnly(item.qty || "")
      })).filter((item) => getClothingTypes().includes(item.type))
      : []
  };
}

function readOrderDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(ORDER_DRAFT_KEY) || "null");
    if (!draft || typeof draft !== "object") return createInitialOrderState();
    const employees = Array.isArray(draft.employees) && draft.employees.length
      ? draft.employees.map(normalizeDraftEmployee)
      : createInitialOrderState().employees;
    return {
      companyName: draft.companyName || DEFAULT_COMPANY_NAME,
      branch: BRANCHES.includes(draft.branch) ? draft.branch : BRANCHES[0],
      supervisorName: draft.supervisorName || "",
      supervisorPhone: phoneDigitsOnly(draft.supervisorPhone || ""),
      employees
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
    case "patchBatch":
      return { ...state, ...action.patch };
    case "generate":
      return { ...state, employees: Array.from({ length: action.count }, (_, index) => createEmployee(index)) };
    case "syncCount": {
      const count = Math.max(1, Number(action.count || 1));
      const employees = state.employees.slice(0, count);
      while (employees.length < count) employees.push(createEmployee(employees.length));
      return { ...state, employees };
    }
    case "setNamesFromPaste": {
      const names = action.names.filter(Boolean);
      if (!names.length) return state;
      const employees = names.map((name, index) => ({
        ...(state.employees[index] || createEmployee(index)),
        name,
        expanded: index === 0
      }));
      return { ...state, employees };
    }
    case "applyQuickOrder": {
      const names = action.names.filter(Boolean);
      if (!names.length) return state;
      return {
        ...state,
        employees: names.map((name, index) => createEmployeeFromQuickOrder(name, index, action.quickOrder))
      };
    }
    case "copyFirstSetupToAll": {
      const source = state.employees[0];
      if (!source) return state;
      return {
        ...state,
        employees: state.employees.map((employee, index) => index === 0 ? employee : ({
          ...employee,
          gender: source.gender,
          items: source.items.map((item) => ({ ...item }))
        }))
      };
    }
    case "removeBlankEmployees": {
      const employees = state.employees.filter(hasEmployeeData);
      return { ...state, employees: employees.length ? employees : [createEmployee(0)] };
    }
    case "add":
      return { ...state, employees: [...state.employees, createEmployee(state.employees.length)] };
    case "delete":
      if (!canDeleteEmployee(state.employees)) return state;
      return { ...state, employees: state.employees.filter((employee) => employee.id !== action.id) };
    case "toggleExpand":
      return { ...state, employees: state.employees.map((employee) => employee.id === action.id ? { ...employee, expanded: !employee.expanded } : employee) };
    case "focusEmployee":
      return { ...state, employees: state.employees.map((employee) => ({ ...employee, expanded: employee.id === action.id })) };
    case "saveAndOpenNext":
      return {
        ...state,
        employees: state.employees.map((employee, index) => ({
          ...employee,
          expanded: index === action.nextIndex
        }))
      };
    case "patchEmployee":
      return {
        ...state,
        employees: state.employees.map((employee) => {
          if (employee.id !== action.id) return employee;
          const next = { ...employee, ...action.patch };
          if ("gender" in action.patch) {
            next.items = next.items.map((item) => ({
              ...item,
              size: "",
              customSize: ""
            }));
          }
          return next;
        })
      };
    case "toggleType":
      return {
        ...state,
        employees: state.employees.map((employee) => {
          if (employee.id !== action.id) return employee;
          const exists = employee.items.some((item) => item.type === action.itemType);
          const items = exists
            ? employee.items.filter((item) => item.type !== action.itemType)
            : [...employee.items, createOrderItem(action.itemType, employee.gender)];
          return { ...employee, items };
        })
      };
    case "patchItem":
      return {
        ...state,
        employees: state.employees.map((employee) => employee.id === action.id
          ? { ...employee, items: employee.items.map((item) => item.type === action.itemType ? { ...item, ...action.patch } : item) }
          : employee)
      };
    case "copyEmployeeSetup": {
      const source = state.employees.find((employee) => employee.id === action.sourceId);
      if (!source) return state;
      return {
        ...state,
        employees: state.employees.map((employee) => employee.id === action.id
          ? {
            ...employee,
            gender: source.gender,
            items: source.items.map((item) => ({ ...item }))
          }
          : employee)
      };
    }
    case "reset":
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
        color: resolveItemColor(item.type, item.color || ""),
        qty: Number(item.qty || 0)
      }))
    )
  );
}

function normalizeBatch(batch) {
  return {
    batchId: batch.batchId || `ORD-${Date.now()}`,
    companyName: batch.companyName || "",
    branch: batch.branch || "-",
    supervisorName: batch.supervisorName || "",
    supervisorPhone: batch.supervisorPhone || "",
    submittedAt: batch.submittedAt || new Date().toISOString(),
    status: ORDER_STATUSES.includes(batch.status) ? batch.status : ORDER_STATUS_PENDING,
    statusUpdatedAt: batch.statusUpdatedAt || batch.submittedAt || new Date().toISOString(),
    orders: Array.isArray(batch.orders)
      ? batch.orders.map((order) => ({
        name: order.name || "-",
        gender: order.gender || "-",
        items: Array.isArray(order.items)
          ? order.items.map((item) => ({
            type: item.type || "-",
            size: item.size || "-",
            color: resolveItemColor(item.type || "-", item.color || ""),
            qty: Number(item.qty || 0)
          })).filter((item) => item.qty > 0)
          : []
      })).filter((order) => order.items.length)
      : []
  };
}

function readStoredBatches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeBatch).filter((batch) => batch.orders.length) : [];
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
    employee.items.filter((item) => item.size).map((item) => ({
      id: `${employee.id}-${item.type}-${resolveItemColor(item.type, item.color || "")}`,
      name: employee.name || "-",
      type: item.type,
      size: item.size === OTHER_SIZE ? (item.customSize || "-") : item.size,
      color: resolveItemColor(item.type, item.color || ""),
      qty: Number(item.qty || 0)
    }))
  );
}

function isEmployeeComplete(employee) {
  return Boolean(
    employee.name.trim() &&
    employee.gender &&
    employee.items.length &&
    employee.items.every((item) =>
      item.size &&
      Number(item.qty || 0) > 0 &&
      (!needsColorSelection(item.type) || resolveItemColor(item.type, item.color || "")) &&
      (item.size !== OTHER_SIZE || item.customSize.trim())
    )
  );
}

function getEmployeeMissingFields(employee) {
  const missing = [];
  if (!employee.name.trim()) missing.push("ชื่อ");
  if (!employee.gender) missing.push("เพศ");
  if (!employee.items.length) {
    missing.push("ประเภทเสื้อ");
    return missing;
  }

  if (employee.items.some((item) => !item.size)) missing.push("ไซส์");
  if (employee.items.some((item) => needsColorSelection(item.type) && !resolveItemColor(item.type, item.color || ""))) missing.push("สี");
  if (employee.items.some((item) => Number(item.qty || 0) <= 0)) missing.push("จำนวน");
  if (employee.items.some((item) => item.size === OTHER_SIZE && !item.customSize.trim())) missing.push("ระบุไซส์เพิ่มเติม");
  return missing;
}

function hasEmployeeData(employee) {
  return Boolean(
    employee.name.trim() ||
    employee.gender ||
    employee.items.some((item) => item.size || item.customSize.trim() || item.color || Number(item.qty || 0) > 0)
  );
}

function isGasConfigured() {
  return Boolean(APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes("YOUR_SCRIPT_URL"));
}

function getRoute() {
  const hashRoute = window.location.hash.replace(/^#/, "");
  if (hashRoute) return hashRoute;
  if (window.location.pathname.endsWith("/order")) return "/order";
  if (window.location.pathname.endsWith("/dashboard")) return "/dashboard";
  return "/";
}

function App() {
  const [path, setPath] = useState(getRoute);
  const [configVersion, setConfigVersion] = useState(0);
  const gasConfigured = isGasConfigured();

  function navigate(pathname) {
    if (pathname.startsWith("#")) {
      window.location.hash = pathname.slice(1);
      setPath(getRoute());
    } else {
      window.history.pushState({}, "", pathname);
      setPath(getRoute());
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const onPopState = () => setPath(getRoute());
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onPopState);
    };
  }, []);

  useEffect(() => {
    loadSharedClothingConfig()
      .then((config) => {
        if (config) setConfigVersion((version) => version + 1);
      })
      .catch(() => {});
  }, []);

  const isDashboard = path === "/dashboard";

  return (
    <div className="app-shadcn-theme min-h-screen w-full overflow-x-hidden bg-[#FAFAFA] text-[#09090B]">
      {isDashboard
        ? <DashboardApp key={`dashboard-${configVersion}`} demoMode={!gasConfigured} onOpenOrder={() => navigate(ORDER_PATH)} />
        : <QuickOrderApp key={`order-${configVersion}`} gasConfigured={gasConfigured} onOpenDashboard={() => navigate(DASHBOARD_PATH)} />}
      <Toaster
        richColors
        closeButton
        position="top-center"
        toastOptions={{
          duration: 4200,
          classNames: {
            toast: "gi-toast rounded-2xl border text-[14px] font-semibold",
            title: "gi-toast-title font-extrabold",
            description: "gi-toast-description font-semibold"
          }
        }}
      />
    </div>
  );
}

function QuickOrderApp({ gasConfigured, onOpenDashboard }) {
  const [sizeOpen, setSizeOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidEmployeeId, setInvalidEmployeeId] = useState("");
  const [query, setQuery] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [mobileEmployeeId, setMobileEmployeeId] = useState("");
  const skipDraftSaveRef = useRef(false);
  const [state, dispatch] = useReducer(orderReducer, undefined, readOrderDraft);

  const summaryRows = useMemo(() => buildOrderSummaryRows(state.employees), [state.employees]);
  const totalPieces = summaryRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const completedEmployees = useMemo(() => state.employees.filter(isEmployeeComplete).length, [state.employees]);
  const firstIncompleteEmployee = useMemo(() => state.employees.find((employee) => !isEmployeeComplete(employee)) || null, [state.employees]);
  const selectedMobileEmployee = state.employees.find((employee) => employee.id === mobileEmployeeId) || null;

  useEffect(() => {
    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }
    localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const invalidEmployee = state.employees.find((employee) => employee.id === invalidEmployeeId);
    if (invalidEmployeeId && invalidEmployee && isEmployeeComplete(invalidEmployee)) setInvalidEmployeeId("");
  }, [invalidEmployeeId, state.employees]);

  function validateCompany() {
    if (!state.companyName.trim() || !state.branch || !state.supervisorName.trim() || !state.supervisorPhone.trim()) {
      toast.error("ข้อมูลผู้ติดต่อยังไม่ครบ", { description: "กรอกบริษัท สาขา ผู้ติดต่อ และเบอร์ติดต่อก่อนส่งคำสั่งเบิกเสื้อ" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    if (state.supervisorPhone.length !== PHONE_LENGTH) {
      toast.error("เบอร์ติดต่อไม่ถูกต้อง", { description: `กรอกตัวเลข ${PHONE_LENGTH} หลัก` });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    return true;
  }

  function jumpToEmployee(employeeId) {
    setInvalidEmployeeId(employeeId);
    setMobileEmployeeId(employeeId);
    window.setTimeout(() => {
      const target = document.querySelector(`[data-quick-employee-row="${employeeId}"], [data-quick-employee-card="${employeeId}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.querySelector("input:not([type='checkbox']), select, button")?.focus({ preventScroll: true });
    }, 100);
  }

  function validateEmployees() {
    const invalidEmployee = state.employees.find((employee) => !isEmployeeComplete(employee));
    if (invalidEmployee) {
      const index = state.employees.findIndex((employee) => employee.id === invalidEmployee.id) + 1;
      const missing = getEmployeeMissingFields(invalidEmployee).join(", ");
      toast.error(`ข้อมูลพนักงานลำดับ ${index} ยังไม่ครบ`, { description: missing || "ตรวจชื่อ เพศ ประเภทเสื้อ ไซส์ และจำนวน" });
      jumpToEmployee(invalidEmployee.id);
      return false;
    }
    setInvalidEmployeeId("");
    return true;
  }

  function openSummary() {
    if (!validateCompany() || !validateEmployees()) return;
    if (!gasConfigured) {
      toast.error("ระบบบันทึกคำสั่งเบิกเสื้อยังไม่พร้อม", { description: "กรุณาติดต่อผู้ดูแลระบบก่อนส่งคำสั่งเบิกเสื้อ" });
      return;
    }
    setSummaryOpen(true);
  }

  async function submitOrder() {
    const payload = {
      batchId: `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-5)}`,
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
        items: items.filter((item) => item.size).map((item) => ({
          type: item.type,
          size: item.size === OTHER_SIZE ? (item.customSize || "-") : item.size,
          color: resolveItemColor(item.type, item.color || ""),
          qty: Number(item.qty || 0)
        }))
      }))
    };

    setIsSubmitting(true);
    const loadingToastId = toast.loading("กำลังส่งคำสั่งเบิกเสื้อ...", { description: "ระบบกำลังบันทึกคำสั่ง กรุณารอสักครู่" });
    try {
      const response = await fetch(APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) throw new Error(result?.error || "GAS request failed");
      saveStoredBatch(payload);
      toast.success("บันทึกคำสั่งเบิกเสื้อแล้ว", { id: loadingToastId });
      localStorage.removeItem(ORDER_DRAFT_KEY);
      skipDraftSaveRef.current = true;
      setSummaryOpen(false);
      setQuery("");
      setShowIncompleteOnly(false);
      setMobileEmployeeId("");
      dispatch({ type: "reset" });
    } catch {
      toast.error("ส่งคำสั่งเบิกเสื้อไม่สำเร็จ", { id: loadingToastId, description: "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <OrderHeader branch={state.branch} onSizeOpen={() => setSizeOpen(true)} onOpenDashboard={onOpenDashboard} />
      <main className="relative z-10 mx-auto grid w-full max-w-[1280px] gap-3 px-3 pb-40 pt-3 sm:px-5 lg:gap-4 lg:pb-36">
        {!gasConfigured && <SetupWarning />}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <QuickOrderSetupPanel state={state} dispatch={dispatch} />
          <QuickOrderActionsPanel
            employees={state.employees}
            dispatch={dispatch}
            showIncompleteOnly={showIncompleteOnly}
            setShowIncompleteOnly={setShowIncompleteOnly}
            onQuickOrder={() => setQuickOpen(true)}
          />
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
          onEdit={setMobileEmployeeId}
        />
      </main>
      <QuickSummaryBar
        totalPieces={totalPieces}
        completedEmployees={completedEmployees}
        totalEmployees={state.employees.length}
        hasIncompleteEmployee={Boolean(firstIncompleteEmployee)}
        isSubmitting={isSubmitting}
        onJumpIncomplete={() => firstIncompleteEmployee && jumpToEmployee(firstIncompleteEmployee.id)}
        onSubmit={openSummary}
      />
      <QuickMobileEditor
        employee={selectedMobileEmployee}
        employees={state.employees}
        dispatch={dispatch}
        onClose={() => setMobileEmployeeId("")}
        onNext={(employeeId) => setMobileEmployeeId(employeeId)}
      />
      <QuickOrderDialog open={quickOpen} setOpen={setQuickOpen} state={state} dispatch={dispatch} />
      <SizeReference open={sizeOpen} setOpen={setSizeOpen} />
      <QuickOrderSummaryDialog
        open={summaryOpen}
        setOpen={setSummaryOpen}
        state={state}
        rows={summaryRows}
        totalPieces={totalPieces}
        isSubmitting={isSubmitting}
        onConfirm={submitOrder}
      />
    </>
  );
}

function QuickOrderSetupPanel({ state, dispatch }) {
  const complete = Boolean(state.companyName.trim() && state.branch && state.supervisorName.trim() && state.supervisorPhone.length === PHONE_LENGTH);
  const [expanded, setExpanded] = useState(!complete);

  useEffect(() => {
    if (complete) setExpanded(false);
    if (!complete) setExpanded(true);
  }, [complete]);

  return (
    <section className="flex h-full flex-col rounded-lg border border-[#D8DEEA] bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-[#071638]">ข้อมูลผู้ติดต่อ</h2>
          <p className="mt-1 truncate text-[15px] font-bold leading-6 text-[#52525B]">
            {complete ? `${state.companyName} · ${state.branch} · ${state.supervisorName} · ${formatPhone(state.supervisorPhone)}` : "กรอกบริษัท สาขา ผู้ติดต่อ และเบอร์ติดต่อ"}
          </p>
        </div>
        <button onClick={() => setExpanded((value) => !value)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-[#002B5B] sm:text-sm lg:hidden">
          {expanded ? <><ChevronUp className="size-3.5" /> ย่อ</> : <><Pencil className="size-3.5" /> แก้ไข</>}
        </button>
      </div>
      <div className={cn("mt-3 grid gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4", !expanded && "hidden lg:grid")}>
          <Field label="บริษัท">
            <TextInput value={state.companyName} onChange={(value) => dispatch({ type: "patchBatch", patch: { companyName: value } })} placeholder="ระบุชื่อบริษัท" />
          </Field>
          <Field label="สาขา">
            <Select value={state.branch} onChange={(value) => dispatch({ type: "patchBatch", patch: { branch: value } })} values={BRANCHES} />
          </Field>
          <Field label="ผู้ติดต่อ">
            <TextInput value={state.supervisorName} onChange={(value) => dispatch({ type: "patchBatch", patch: { supervisorName: value } })} placeholder="ชื่อ-นามสกุล" />
          </Field>
          <Field label="เบอร์ติดต่อ">
            <TextInput value={state.supervisorPhone} onChange={(value) => dispatch({ type: "patchBatch", patch: { supervisorPhone: phoneDigitsOnly(value) } })} placeholder="08X-XXX-XXXX" inputMode="numeric" pattern="[0-9]*" />
          </Field>
      </div>
    </section>
  );
}

function QuickOrderDialog({ open, setOpen, state, dispatch }) {
  const [namesText, setNamesText] = useState("");
  const [gender, setGender] = useState(GENDERS[0]);
  const [defaultSizeValue, setDefaultSizeValue] = useState("M");
  const clothingTypes = getClothingTypes();
  const [customItems, setCustomItems] = useState(() => clothingTypes.map((type) => {
    const colors = getColorOptions(type);
    return { enabled: false, qty: "2", color: colors.length === 1 ? colors[0] : "" };
  }));
  const quickSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "28", "30", "32", "34", "36", "38", "40", "42", "44"];
  const names = namesText.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);

  useEffect(() => {
    setCustomItems((items) => clothingTypes.map((type, index) => {
      const colors = getColorOptions(type);
      const current = items[index] || {};
      return {
        enabled: Boolean(current.enabled),
        qty: current.qty || "2",
        color: colors.length === 1 ? colors[0] : (colors.includes(current.color) ? current.color : "")
      };
    }));
  }, [clothingTypes.join("|")]);

  function applyQuickOrder() {
    if (!names.length) {
      toast.error("ยังไม่มีรายชื่อพนักงาน", { description: "วางรายชื่ออย่างน้อย 1 บรรทัด" });
      return;
    }
    const missingColorType = clothingTypes.find((type, index) => customItems[index]?.enabled && getColorOptions(type).length > 1 && !customItems[index]?.color);
    if (missingColorType) {
      toast.error("ยังไม่ได้เลือกสี", { description: `เลือกสีสำหรับ ${missingColorType} ก่อนเพิ่มรายการ` });
      return;
    }
    const hasExistingData = state.employees.some(hasEmployeeData);
    if (hasExistingData && !window.confirm("แทนที่รายการพนักงานเดิมด้วยรายชื่อชุดใหม่?")) return;
    dispatch({ type: "applyQuickOrder", names, quickOrder: { gender, defaultSizeValue, customItems } });
    setNamesText("");
    setOpen(false);
    toast.success(`เพิ่มรายชื่อพนักงาน ${names.length} คนแล้ว`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-3 bottom-3 z-50 max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(58rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex items-center justify-between border-b border-[#E7EAF0] px-5 py-4">
            <div>
              <Dialog.Title className="text-xl font-extrabold text-[#071638]">เพิ่มหลายคน</Dialog.Title>
              <p className="text-sm font-semibold text-[#64748B]">วางรายชื่อและกำหนดชุดเริ่มต้น</p>
            </div>
            <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
          </div>
          <div className="employee-scroll-region max-h-[calc(90vh-5rem)] overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#071638] sm:text-xl">ข้อมูลเริ่มต้น</h2>
          <p className="text-sm font-semibold text-[#64748B]">ใช้กับรายชื่อที่วางไว้ แล้วค่อยแก้รายคนในตาราง</p>
        </div>
        <span className="hidden rounded-md bg-white px-3 py-2 text-sm font-bold text-[#002B5B] sm:block">{names.length} คน</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(25rem,.9fr)]">
        <Field label="รายชื่อพนักงาน">
          <textarea
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            placeholder={"สมชาย ใจดี\nสมหญิง ใจงาม\nสมศักดิ์ ตัวอย่าง"}
            className="min-h-44 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#071638] outline-none transition placeholder:text-[#94A3B8] focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF]"
          />
        </Field>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="เพศตั้งต้น">
              <Select value={gender} values={GENDERS} onChange={setGender} />
            </Field>
            <Field label="ไซส์ตั้งต้น">
              <Select value={defaultSizeValue} values={quickSizes} onChange={setDefaultSizeValue} />
            </Field>
          </div>
          <Field label="กำหนดประเภทเสื้อ สี และจำนวน">
            <div className="grid max-h-[20rem] gap-2 overflow-y-auto rounded-xl border border-[#D8DEEA] bg-white p-2">
              {clothingTypes.map((type, index) => {
                const colors = getColorOptions(type);
                const selectedColor = colors.length === 1 ? colors[0] : (customItems[index]?.color || "");
                return (
                <div key={type} className={cn("grid gap-2 rounded-lg border p-2 text-sm font-bold text-[#071638] sm:grid-cols-[minmax(0,1fr)_minmax(8rem,.8fr)_5.5rem] sm:items-center", customItems[index]?.enabled ? "border-[#BFD0EA] bg-[#F8FBFF]" : "border-[#EEF2F7] bg-white")}>
                  <label className="flex min-h-11 min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(customItems[index]?.enabled)}
                      onChange={(event) => setCustomItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked, color: colors.length === 1 ? colors[0] : (item.color || "") } : item))}
                      className="size-4 shrink-0 accent-[#002B5B]"
                    />
                    <span className="min-w-0 truncate">{type}</span>
                  </label>
                  {colors.length > 1 ? (
                    <CustomSelect
                      value={selectedColor}
                      values={colors}
                      placeholder="เลือกสี"
                      compact
                      disabled={!customItems[index]?.enabled}
                      onChange={(color) => setCustomItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, color } : item))}
                    />
                  ) : (
                    <div className="flex min-h-11 items-center rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-sm font-bold text-[#44536A]">
                      <span className="truncate">{colors[0] || "ไม่มีสี"}</span>
                    </div>
                  )}
                  <input
                    value={customItems[index]?.qty || "2"}
                    onChange={(event) => setCustomItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, qty: digitsOnly(event.target.value) } : item))}
                    inputMode="numeric"
                    disabled={!customItems[index]?.enabled}
                    className="min-h-11 rounded-lg border border-[#CBD5E1] px-2 text-center font-black outline-none focus:border-[#002B5B] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                  />
                </div>
                );
              })}
            </div>
          </Field>
          <button onClick={applyQuickOrder} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#002B5B] px-4 font-bold text-white transition hover:bg-[#013A78]">
            <UserPlus /> เพิ่มเข้ารายการ
          </button>
        </div>
      </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function QuickOrderActionsPanel({ employees, dispatch, showIncompleteOnly, setShowIncompleteOnly, onQuickOrder }) {
  const canRemoveBlank = employees.length > 1 && employees.some((employee) => !hasEmployeeData(employee));
  const completedEmployees = employees.filter(isEmployeeComplete).length;

  return (
    <section className="flex flex-col rounded-lg border border-[#C9D8EF] bg-[#F8FBFF] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-extrabold text-[#071638]">รายการพนักงาน</h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">ครบ {completedEmployees}/{employees.length} คน</p>
        </div>
        <label className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-xs font-bold text-[#44536A]">
          <input type="checkbox" checked={showIncompleteOnly} onChange={(event) => setShowIncompleteOnly(event.target.checked)} className="size-4 accent-[#002B5B]" />
          ยังไม่ครบ
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onQuickOrder} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#002B5B] px-2.5 text-xs font-bold text-white sm:min-h-11 sm:text-sm">
          <UserPlus /> เพิ่มหลายคน
        </button>
        <button onClick={() => dispatch({ type: "add" })} className="min-h-10 rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-xs font-bold text-[#002B5B] sm:min-h-11 sm:px-3 sm:text-sm">
          <span className="inline-flex items-center justify-center gap-1.5"><Plus className="size-4" /> เพิ่ม 1 คน</span>
        </button>
        <button onClick={() => dispatch({ type: "copyFirstSetupToAll" })} disabled={!employees[0]?.items.length} className="min-h-10 rounded-lg border border-[#BFD0EA] bg-[#EAF2FF] px-2.5 text-xs font-bold text-[#002B5B] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:px-3 sm:text-sm">
          <span className="inline-flex items-center justify-center gap-1.5"><Copy className="size-4" /> คัดลอกแถวแรก</span>
        </button>
        <button onClick={() => dispatch({ type: "removeBlankEmployees" })} disabled={!canRemoveBlank} className="min-h-10 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-2.5 text-xs font-bold text-[#92400E] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:px-3 sm:text-sm">
          <span className="inline-flex items-center justify-center gap-1.5"><Eraser className="size-4" /> ลบแถวว่าง</span>
        </button>
      </div>
    </section>
  );
}

function getFilteredEmployees(employees, query, showIncompleteOnly) {
  const normalizedQuery = query.trim().toLowerCase();
  return employees.filter((employee) => {
    const matchesStatus = !showIncompleteOnly || !isEmployeeComplete(employee);
    const matchesQuery = !normalizedQuery || [employee.name, employee.gender, ...employee.items.map((item) => `${item.type} ${item.color} ${item.size} ${item.customSize}`)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
}

function QuickEmployeeTable({ employees, dispatch, query, showIncompleteOnly, invalidEmployeeId }) {
  const [editingEmployeeId, setEditingEmployeeId] = useState("");
  const filteredEmployees = getFilteredEmployees(employees, query, showIncompleteOnly);
  const canDelete = canDeleteEmployee(employees);
  const editingEmployee = employees.find((employee) => employee.id === editingEmployeeId) || null;

  return (
    <>
    <section className="hidden overflow-hidden rounded-lg border border-[#D8DEEA] bg-white lg:block">
      <div className="employee-scroll-region max-h-[58vh] overflow-auto">
        <table className="w-full min-w-[980px] table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#EEF4FF] text-xs font-extrabold text-[#44536A]">
            <tr>
              {["ลำดับ", "ชื่อพนักงาน", "เพศ", "รายการที่เลือก", "สถานะ", ""].map((header) => (
                <th key={header || "actions"} className="border-b border-[#D8DEEA] px-3 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => {
              const index = employees.findIndex((item) => item.id === employee.id);
              const complete = isEmployeeComplete(employee);
              const missingFields = getEmployeeMissingFields(employee);
              return (
                <tr key={employee.id} data-quick-employee-row={employee.id} className={cn("border-b border-[#E7EAF0] align-top transition hover:bg-[#F8FAFC]", invalidEmployeeId === employee.id && "employee-attention bg-[#FFF7F7] outline outline-2 outline-[#EF4444] outline-offset-[-2px]")}>
                  <td className="w-14 px-3 py-3 text-center font-extrabold text-[#64748B]">{index + 1}</td>
                  <td className="w-[17rem] px-3 py-3">
                    <GridInput value={employee.name} placeholder="ชื่อ-นามสกุล" onChange={(value) => dispatch({ type: "patchEmployee", id: employee.id, patch: { name: value } })} />
                  </td>
                  <td className="w-40 px-3 py-3">
                    <GridSelect value={employee.gender} values={GENDERS} placeholder="เลือกเพศ" onChange={(value) => dispatch({ type: "patchEmployee", id: employee.id, patch: { gender: value } })} />
                  </td>
                  <td className="px-3 py-3">
                    <EmployeeItemSummary employee={employee} onEdit={() => setEditingEmployeeId(employee.id)} />
                  </td>
                  <td className="w-44 px-3 py-3 text-center">
                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold", complete ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]")}>{complete ? "ครบ" : "ยังไม่ครบ"}</span>
                    {!complete && <p className="mt-2 text-xs font-bold leading-5 text-[#B91C1C]">ขาด: {missingFields.join(", ")}</p>}
                  </td>
                  <td className="w-16 px-3 py-3">
                    <button
                      onClick={() => dispatch({ type: "delete", id: employee.id })}
                      disabled={!canDelete}
                      aria-label={canDelete ? "Delete employee" : "At least one employee is required"}
                      className="grid size-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:border-[#E2E8F0] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                    >
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filteredEmployees.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center font-bold text-[#64748B]">ไม่พบพนักงานตามเงื่อนไข</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
    <GarmentEditorDialog employee={editingEmployee} dispatch={dispatch} onClose={() => setEditingEmployeeId("")} />
    </>
  );
}

function QuickGarmentCell({ employee, type, dispatch }) {
  const item = employee.items.find((entry) => entry.type === type);
  if (!item) {
  return (
    <button onClick={() => dispatch({ type: "toggleType", id: employee.id, itemType: type })} className="min-h-10 w-full rounded-lg border border-dashed border-[#A9B9D1] bg-white text-sm font-bold text-[#002B5B] hover:bg-[#F4F8FF]">
        <span className="inline-flex items-center justify-center gap-1.5"><Plus className="size-4" /> เพิ่ม</span>
      </button>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[1fr_4.5rem_2.25rem] gap-2">
        <GridSelect value={item.size} disabled={!employee.gender} placeholder={employee.gender ? "ไซส์" : "เลือกเพศก่อน"} values={employee.gender ? ["", ...getSizeOptions(item.type, employee.gender)] : [""]} onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: patchSizeWithDefaultQty(item, value) })} />
        <GridInput type="number" inputMode="numeric" value={item.qty} placeholder="จำนวน" onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { qty: digitsOnly(value) } })} />
        <button onClick={() => dispatch({ type: "toggleType", id: employee.id, itemType: type })} aria-label="ลบรายการชุด" title="ลบรายการชุด" className="grid min-h-10 place-items-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]">
          <X />
        </button>
      </div>
      <ItemColorSelect employee={employee} item={item} dispatch={dispatch} compact />
      {item.size === OTHER_SIZE && (
        <GridInput value={item.customSize} placeholder="ระบุไซส์เพิ่มเติม" onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { customSize: value } })} />
      )}
    </div>
  );
}

function GarmentEditorDialog({ employee, dispatch, onClose }) {
  const [query, setQuery] = useState("");
  const clothingTypes = getClothingTypes();
  const filteredTypes = clothingTypes.filter((type) => type.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (employee) setQuery("");
  }, [employee?.id]);

  return (
    <Dialog.Root modal={false} open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-3 bottom-3 top-3 z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(42rem,88vh)] sm:w-[min(48rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          {employee && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-[#E7EAF0] px-5 py-4">
                <div className="min-w-0">
                  <Dialog.Title className="truncate text-xl font-extrabold text-[#071638]">แก้รายการเสื้อ</Dialog.Title>
                  <p className="mt-1 truncate text-sm font-bold text-[#64748B]">{employee.name || "ยังไม่ระบุชื่อ"} · {employee.gender || "ยังไม่เลือกเพศ"}</p>
                </div>
                <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
              </div>

              <div className="border-b border-[#E7EAF0] p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#CBD5E1] bg-white pl-11 pr-4 text-[15px] outline-none focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF]" placeholder="ค้นหาแบบเสื้อ" />
                </div>
              </div>

              <div className="employee-scroll-region min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC] p-4">
                <div className="grid gap-2.5">
                  {filteredTypes.map((type) => {
                    const item = employee.items.find((entry) => entry.type === type);
                    return (
                      <div key={type} className={cn("rounded-xl border bg-white p-3 shadow-sm", item ? "border-[#BFD0EA] bg-[#FBFDFF]" : "border-[#E2E8F0]")}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-base font-extrabold text-[#071638]">{type}</p>
                            {item && <p className="mt-1 text-xs font-bold text-[#64748B]">{formatOrderItemLabel(item)}</p>}
                          </div>
                          <button
                            onClick={() => dispatch({ type: "toggleType", id: employee.id, itemType: type })}
                            className={cn("min-h-11 shrink-0 rounded-lg px-4 text-sm font-black", item ? "border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" : "border border-[#BFD0EA] bg-[#E5EFFD] text-[#002B5B]")}
                          >
                            {item ? "ลบรายการ" : "เพิ่มรายการ"}
                          </button>
                        </div>

                        {item && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] sm:items-start">
                            <GridSelect value={item.size} disabled={!employee.gender} placeholder={employee.gender ? "เลือกไซส์" : "เลือกเพศก่อน"} values={employee.gender ? ["", ...getSizeOptions(item.type, employee.gender)] : [""]} onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: patchSizeWithDefaultQty(item, value) })} compact />
                            {needsColorSelection(item.type) ? (
                              <ItemColorSelect employee={employee} item={item} dispatch={dispatch} compact />
                            ) : (
                              <div className="hidden sm:block" />
                            )}
                            <GridInput type="number" inputMode="numeric" value={item.qty} placeholder="จำนวน" onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { qty: digitsOnly(value) } })} />
                            {item.size === OTHER_SIZE && (
                              <div className="sm:col-span-3">
                                <GridInput value={item.customSize} placeholder="ระบุไซส์เพิ่มเติม" onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { customSize: value } })} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!filteredTypes.length && (
                    <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-6 text-center font-bold text-[#64748B]">ไม่พบแบบเสื้อ</div>
                  )}
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
          <button key={employee.id} data-quick-employee-card={employee.id} onClick={() => onEdit(employee.id)} className={cn("rounded-lg border border-[#D8DEEA] bg-white p-3 text-left", invalidEmployeeId === employee.id && "employee-attention border-[#EF4444] bg-[#FFF7F7]")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-extrabold text-[#071638]">{index + 1}. {employee.name || "ยังไม่ระบุชื่อ"}</p>
                <p className="mt-1 text-xs font-bold text-[#64748B]">{employee.gender || "ยังไม่เลือกเพศ"} · {pieces} ชิ้น</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold", complete ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]")}>{complete ? "ครบ" : "แก้"}</span>
            </div>
          </button>
        );
      })}
      {!filteredEmployees.length && <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center font-bold text-[#64748B]">ไม่พบพนักงานตามเงื่อนไข</div>}
    </section>
  );
}

function QuickMobileEditor({ employee, employees, dispatch, onClose, onNext }) {
  const canDelete = canDeleteEmployee(employees);
  const index = employee ? employees.findIndex((item) => item.id === employee.id) : -1;
  const nextEmployee = index >= 0 ? employees[index + 1] : null;
  const clothingTypes = getClothingTypes();

  return (
    <Dialog.Root open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 lg:hidden" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl lg:hidden">
          {employee && (
            <>
              <div className="flex min-h-14 items-center justify-between border-b border-[#E7EAF0] px-4">
                <Dialog.Title className="font-extrabold text-[#071638]">พนักงานลำดับ {index + 1}</Dialog.Title>
                <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
              </div>
              <div className="employee-scroll-region grid gap-3 overflow-y-auto bg-[#F5F7FB] p-3">
                <Field label="ชื่อ-นามสกุล">
                  <TextInput value={employee.name} onChange={(value) => dispatch({ type: "patchEmployee", id: employee.id, patch: { name: value } })} placeholder="ระบุชื่อพนักงาน" />
                </Field>
                <Field label="เพศ">
                  <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map((gender) => (
                      <button key={gender} onClick={() => dispatch({ type: "patchEmployee", id: employee.id, patch: { gender } })} className={cn("min-h-11 rounded-lg border text-sm font-bold", employee.gender === gender ? "border-[#002B5B] bg-[#002B5B] text-white" : "border-[#CBD5E1] bg-white text-[#071638]")}>
                        {gender}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid gap-2">
                  {clothingTypes.map((type) => (
                    <div key={type} className="rounded-lg border border-[#D8DEEA] bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-extrabold text-[#071638]">{type}</p>
                        <label className="flex items-center gap-2 text-sm font-bold text-[#002B5B]">
                          <input type="checkbox" checked={employee.items.some((item) => item.type === type)} onChange={() => dispatch({ type: "toggleType", id: employee.id, itemType: type })} className="size-4 accent-[#002B5B]" />
                          เบิก
                        </label>
                      </div>
                      {employee.items.some((item) => item.type === type) && <QuickGarmentCell employee={employee} type={type} dispatch={dispatch} />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-[48px_1fr] gap-2 border-t border-[#E7EAF0] bg-white p-3">
                <button
                  onClick={() => {
                    if (!canDelete) return;
                    dispatch({ type: "delete", id: employee.id });
                    onClose();
                  }}
                  disabled={!canDelete}
                  className="grid min-h-11 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 />
                </button>
                <button onClick={() => nextEmployee ? onNext(nextEmployee.id) : onClose()} className="min-h-11 rounded-lg bg-[#002B5B] font-bold text-white">
                  {nextEmployee ? "บันทึกและถัดไป" : "เสร็จสิ้น"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function QuickSummaryBar({ totalPieces, completedEmployees, totalEmployees, hasIncompleteEmployee, isSubmitting, onJumpIncomplete, onSubmit }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#D8DEEA] bg-white/96 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-[1280px] gap-2 sm:max-w-[32rem] sm:gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onJumpIncomplete} disabled={!hasIncompleteEmployee} className="min-h-10 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-2 text-xs font-bold text-[#92400E] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:px-4 sm:text-sm">
            ไปแถวที่ยังไม่ครบ
          </button>
          <button onClick={onSubmit} disabled={isSubmitting} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#002B5B] px-3 text-sm font-bold text-white disabled:opacity-60 sm:min-h-11 sm:gap-2 sm:px-5 sm:text-base">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} ส่งเบิก
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickOrderSummaryDialog({ open, setOpen, state, rows, totalPieces, isSubmitting, onConfirm }) {
  const totals = buildTotalSummary(rows);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(46rem,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex items-center justify-between border-b border-[#E7EAF0] px-5 py-4">
            <Dialog.Title className="text-xl font-extrabold text-[#071638]">สรุปก่อนส่ง</Dialog.Title>
            <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
          </div>
          <div className="employee-scroll-region max-h-[64vh] overflow-y-auto bg-[#F7F9FC] p-4">
            <div className="rounded-2xl border border-[#E7EAF0] bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <ReviewMetric label="สาขา" value={state.branch || "-"} />
              <ReviewMetric label="ผู้ติดต่อ" value={state.supervisorName || "-"} />
              <ReviewMetric label="พนักงาน" value={`${state.employees.length} คน`} />
              <ReviewMetric label="จำนวนรวม" value={`${totalPieces} ชิ้น`} />
            </div>
            <div className="mt-4 grid gap-2 sm:hidden">
              {totals.length ? totals.map((row) => (
                <SummaryMobileRow key={`${row.type}-${row.color}-${row.size}`} row={row} />
              )) : (
                <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center font-bold text-[#64748B]">ยังไม่มีรายการ</div>
              )}
            </div>
            <div className="mt-4 hidden overflow-hidden rounded-lg border border-[#E2E8F0] sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#EEF4FF] text-xs font-extrabold text-[#44536A]">
                  <tr>
                    <th className="px-4 py-3">ประเภท</th>
                    <th className="px-4 py-3">สี</th>
                    <th className="px-4 py-3">ไซส์</th>
                    <th className="px-4 py-3 text-right">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.length ? totals.map((row) => (
                    <tr key={`${row.type}-${row.size}`} className="border-t border-[#E2E8F0]">
                      <td className="px-4 py-3 font-bold">{row.type}</td>
                      <td className="px-4 py-3">{row.color || "-"}</td>
                      <td className="px-4 py-3">{row.size}</td>
                      <td className="px-4 py-3 text-right font-extrabold">{row.qty}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center font-bold text-[#64748B]">ยังไม่มีรายการ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 border-t border-[#E7EAF0] p-3 sm:grid-cols-[1fr_1.25fr] sm:gap-3 sm:p-4">
            <Dialog.Close className="min-h-11 rounded-lg border border-[#CBD5E1] bg-white font-bold text-[#071638]">กลับไปแก้</Dialog.Close>
            <button onClick={onConfirm} disabled={isSubmitting || !rows.length} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#002B5B] font-bold text-white disabled:opacity-60">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <PackageCheck />} ยืนยันส่งคำสั่งเบิกเสื้อ
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SummaryMobileRow({ row }) {
  return (
    <div className="rounded-lg border border-[#D8DEEA] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-extrabold text-[#071638]">{row.name || row.type || "-"}</p>
          {row.name && <p className="mt-1 break-words text-xs font-bold text-[#64748B]">{row.type || "-"}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-[#E5EFFD] px-3 py-1 text-sm font-black text-[#002B5B]">{row.qty} ชิ้น</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MobileInfo label="สี" value={row.color || "-"} compact />
        <MobileInfo label="ไซส์" value={row.size || "-"} compact />
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#F4F7FC] px-3 py-3">
      <p className="text-xs font-bold text-[#64748B]">{label}</p>
      <p className="mt-1 break-words font-extrabold text-[#071638]">{value}</p>
    </div>
  );
}

function DashboardApp({ demoMode, onOpenOrder }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("dashboard-unlocked") === "true");

  function handleUnlock() {
    sessionStorage.setItem("dashboard-unlocked", "true");
    setUnlocked(true);
  }

  if (!unlocked) {
    return <DashboardLogin onUnlock={handleUnlock} onOpenOrder={onOpenOrder} />;
  }

  return (
    <>
      <DashboardHeader onOpenOrder={onOpenOrder} />
      <main className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-3 pb-10 pt-3 sm:px-5 lg:gap-4 lg:pt-5">
        <Dashboard demoMode={demoMode} />
      </main>
    </>
  );
}

function DashboardLogin({ onUnlock, onOpenOrder }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (passcode === DASHBOARD_PASSCODE) {
      setError("");
      onUnlock();
      toast.success("เข้าสู่ Dashboard แล้ว");
      return;
    }
    setError("รหัสไม่ถูกต้อง");
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
        <h2 className="text-3xl font-black tracking-tight text-[#071638]">เข้าสู่ Dashboard</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">กรอกรหัสเพื่อดูข้อมูลสรุปคำสั่งเบิกเสื้อ</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Field label="รหัส Dashboard">
            <TextInput value={passcode} onChange={setPasscode} placeholder="กรอกรหัส" inputMode="numeric" type="password" />
          </Field>
          {error && <p className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#B91C1C]">{error}</p>}
          <button type="submit" className="reactbits-shine flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#002B5B] font-black text-white">
            <UserCheck /> เข้าดู Dashboard
          </button>
        </form>
        <button onClick={onOpenOrder} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#C8D6EA] bg-white font-black text-[#002B5B]">
          <Shirt /> เปิดหน้าสั่งเบิกเสื้อ
        </button>
      </Card>
    </main>
  );
}

function Logo() {
  return (
    <div className="flex min-w-0 items-center">
      <div className="min-w-0">
        <h1 className="text-lg font-black leading-none tracking-tight text-[#071638] sm:text-xl">ShirtClaim</h1>
        <p className="mt-0.5 hidden text-[11px] font-bold leading-none text-[#64748B] sm:block">ระบบเบิกเสื้อ</p>
      </div>
    </div>
  );
}

function OrderHeader({ branch, onSizeOpen, onOpenDashboard }) {
  return (
    <header className="relative z-10 border-b border-[#D8DEEA] bg-[#F7FAFF]/94 px-2 py-2 backdrop-blur-xl sm:px-3">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 sm:gap-3">
        <Logo />
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button onClick={onSizeOpen} className="flex min-h-9 shrink-0 items-center gap-1 rounded-xl bg-[#E5EFFD] px-2.5 text-xs font-bold text-[#002B5B] sm:px-3 sm:text-sm">
            <Ruler /> ข้อมูลเสื้อ
          </button>
          <button onClick={onOpenDashboard} className="flex min-h-9 shrink-0 items-center gap-1 rounded-xl border border-[#C8D6EA] bg-white px-2.5 text-xs font-black text-[#002B5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:px-3 sm:text-sm">
            <LayoutDashboard /> Dashboard
          </button>
        </div>
      </div>
    </header>
  );
}

function DashboardHeader({ onOpenOrder }) {
  return (
    <header className="relative z-10 border-b border-[#D8DEEA] bg-[#F7FAFF]/94 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <button onClick={onOpenOrder} className="flex min-h-9 items-center gap-1 rounded-xl border border-[#C8D6EA] bg-white px-3 text-sm font-black text-[#002B5B] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Shirt /> เปิดหน้าสั่งเบิกเสื้อ
          </button>
          <span className="hidden min-h-9 items-center gap-1 rounded-xl bg-[#002B5B] px-3 text-sm font-bold text-white shadow-sm sm:flex">
            <LayoutDashboard /> Dashboard
          </span>
        </div>
      </div>
    </header>
  );
}

function Card({ children, className, ...props }) {
  return (
    <section {...props} className={cn("shadcn-card reactbits-soft-border reactbits-fade-up rounded-2xl border border-[#DCE5F4] bg-white/96 p-4 shadow-sm backdrop-blur sm:p-5", className)}>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 sm:gap-2">
      <span className="text-xs font-bold text-[#44536A] sm:text-[13px]">{label}</span>
      {children}
    </label>
  );
}

const TextInput = React.forwardRef(function TextInput({ value, onChange, placeholder, inputMode, type = "text", pattern, autoCapitalize, disabled = false, maxLength }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      inputMode={inputMode}
      pattern={pattern}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#071638] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF] disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] sm:px-3.5 sm:text-[15px]"
    />
  );
});

function CustomSelect({ value, values, onChange, placeholder = "เลือกไซส์", disabled = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const selectedLabel = value || placeholder;

  function updateMenuPosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 6;
    const menuWidth = Math.min(window.innerWidth - 16, Math.max(rect.width, compact ? 192 : 224));
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(256, openAbove ? spaceAbove : spaceBelow));
    setMenuStyle({
      left,
      top: openAbove ? Math.max(8, rect.top - gap - maxHeight) : rect.bottom + gap,
      width: menuWidth,
      maxHeight
    });
  }

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    function handleViewportChange() {
      updateMenuPosition();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  function selectValue(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="grid gap-1.5">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 text-left text-sm font-bold text-[#09090B] outline-none transition focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10 disabled:cursor-not-allowed disabled:bg-[#F4F4F5] disabled:text-[#A1A1AA]",
          compact ? "h-11" : "h-11 sm:px-3.5 sm:text-[15px]"
        )}
      >
        <span className={cn("min-w-0 truncate", !value && "text-[#A1A1AA]")}>{selectedLabel}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-[#71717A] transition", open && "rotate-180")} />
      </button>

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] overflow-hidden rounded-lg border border-[#D4D4D8] bg-white p-1 shadow-2xl"
          style={{ left: menuStyle.left, top: menuStyle.top, width: menuStyle.width }}
        >
          <div className="employee-scroll-region overflow-y-auto" style={{ maxHeight: menuStyle.maxHeight }}>
            <div role="listbox" className="grid gap-0.5">
              {values.map((item, index) => {
                const selected = item === value;
                return (
                  <button
                    key={`${item}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectValue(item)}
                    className={cn(
                      "flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-sm font-semibold text-[#18181B] transition hover:bg-[#F4F4F5]",
                      selected && "bg-[#18181B] text-white hover:bg-[#18181B]"
                    )}
                  >
                    <span className="min-w-0 truncate">{item || placeholder}</span>
                    {selected && <Check className="size-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Select(props) {
  return <CustomSelect {...props} />;
}

function GridInput({ value, onChange, placeholder, type = "text", inputMode, pattern, autoCapitalize }) {
  return <input type={type} value={value} placeholder={placeholder} inputMode={inputMode} pattern={pattern} autoCapitalize={autoCapitalize} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-[#D8DEEA] bg-white px-3 text-[#071638] outline-none focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF]" />;
}

function GridSelect({ value, values, onChange, placeholder = "เลือกไซส์", disabled = false, compact = false }) {
  return <CustomSelect value={value} values={values} onChange={onChange} placeholder={placeholder} disabled={disabled} compact={compact} />;
}

function SizeReference({ open, setOpen }) {
  const tabs = readClothingConfig();
  const [selectedGender, setSelectedGender] = useState(GENDERS[1] || GENDERS[0]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="size-reference-dialog fixed inset-x-3 bottom-3 top-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#DDE5F0] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(44rem,88vh)] sm:w-[min(46rem,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex items-center justify-between border-b border-[#E7EAF0] bg-white px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-black text-[#071638] sm:text-xl">ข้อมูลเสื้อ</Dialog.Title>
            </div>
            <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-full text-[#1F2937] transition hover:bg-[#F1F5F9]" aria-label="ปิด"><X className="size-5" /></Dialog.Close>
          </div>
          <Tabs.Root defaultValue={tabs[0]?.id} className="flex min-h-0 flex-1 flex-col">
            <Tabs.List className="size-reference-tabs flex shrink-0 gap-1 overflow-x-auto border-b border-[#E7EAF0] bg-[#F8FAFD] px-3 py-2">
              {tabs.map((tab) => <Tabs.Trigger key={tab.id} value={tab.id} className="min-h-9 shrink-0 rounded-lg border border-transparent px-3 text-xs font-black text-[#4B5565] transition data-[state=active]:border-[#BFD0EA] data-[state=active]:bg-white data-[state=active]:text-[#071638] data-[state=active]:shadow-sm">{tab.type}</Tabs.Trigger>)}
            </Tabs.List>
            <div className="grid grid-cols-2 gap-2 border-b border-[#E7EAF0] bg-white p-3 sm:px-5">
              {GENDERS.map((gender) => (
                <button
                  key={gender}
                  onClick={() => setSelectedGender(gender)}
                  className={cn("min-h-10 rounded-xl border text-sm font-black transition", selectedGender === gender ? "border-[#0D152A] bg-[#0D152A] text-white shadow-sm" : "border-[#CBD5E1] bg-white text-[#071638] hover:bg-[#F8FAFC]")}
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
                        <img src={tab.imageUrl} alt={tab.type} className="mx-auto h-36 w-full max-w-[28rem] object-contain sm:h-44" />
                      </div>
                    ) : (
                      <div className="grid h-32 place-items-center border-b border-[#E7EAF0] bg-[#F1F5F9] text-sm font-bold text-[#94A3B8]">ยังไม่มีรูปเสื้อ</div>
                    )}
                    <div className="border-b border-[#E7EAF0] px-4 py-3 sm:px-5">
                      <h3 className="text-base font-black text-[#071638] sm:text-lg">{tab.type}</h3>
                      {tab.colors?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tab.colors.map((color) => (
                            <span key={`${tab.id}-${color.name}`} className="inline-flex items-center gap-2 rounded-full border border-[#D8DEEA] bg-white px-3 py-1 text-xs font-bold text-[#44536A]">
                              <span className="size-4 rounded-full border border-[#CBD5E1]" style={{ backgroundColor: color.value }} />
                              {color.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-[#64748B]">ยังไม่ได้กำหนดสีสำหรับเสื้อนี้</p>
                      )}
                    </div>
                    <table className="size-reference-table w-full table-fixed text-center text-sm">
                      <thead>
                        <tr>
                          <th colSpan={Math.max(2, tab.detailFields.length + 1)} className="border px-3 py-3 text-base font-black sm:text-lg">
                            {tab.type === "เสื้อโปโล" ? `${tab.type} ${selectedGender}` : tab.type}
                          </th>
                        </tr>
                        <tr>
                          <th className="border px-3 py-2.5 text-sm font-black sm:text-base">{tab.type.includes("กางเกง") ? "เอว" : "ไซส์"}</th>
                          {tab.detailFields.map((field) => (
                            <th key={`${tab.id}-${field}`} className="border px-3 py-2.5 text-sm font-black sm:text-base">{field}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sizeRows.map(({ size, details }, index) => (
                          <tr key={`${selectedGender}-${size}-${index}`}>
                            <td className="border bg-white px-3 py-2.5 text-base font-semibold">{size}</td>
                            {tab.detailFields.map((field) => (
                              <td key={`${selectedGender}-${size}-${field}`} className="border bg-white px-3 py-2.5 text-base font-semibold">
                                {details?.[field] || ""}
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

function ClothingManager({ config, setConfig }) {
  const [uploadingId, setUploadingId] = useState("");
  const [selectedId, setSelectedId] = useState(() => config[0]?.id || "");
  const [selectedGender, setSelectedGender] = useState(GENDERS[0]);
  const syncTimerRef = useRef(null);
  const selectedItem = config.find((item) => item.id === selectedId) || config[0];
  const selectedSizeRows = selectedItem?.genderSizeRows?.[selectedGender] || selectedItem?.sizeRows || [];

  useEffect(() => {
    if (!config.some((item) => item.id === selectedId)) {
      setSelectedId(config[0]?.id || "");
    }
  }, [config, selectedId]);

  useEffect(() => () => window.clearTimeout(syncTimerRef.current), []);

  function scheduleSharedConfigSync(normalizedConfig) {
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      publishSharedClothingConfig(normalizedConfig).catch((error) => {
        toast.error("บันทึกการตั้งค่าเสื้อไม่สำเร็จ", { description: error?.message || "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ" });
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
    commit(config.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function patchSize(id, sizeIndex, patch) {
    commit(config.map((item) => item.id === id ? {
      ...item,
      genderSizeRows: {
        ...(item.genderSizeRows || {}),
        [selectedGender]: (item.genderSizeRows?.[selectedGender] || item.sizeRows || []).map((row, index) => index === sizeIndex ? { ...row, ...patch } : row)
      }
    } : item));
  }

  function patchSizeDetail(id, sizeIndex, field, value) {
    commit(config.map((item) => item.id === id ? {
      ...item,
      genderSizeRows: {
        ...(item.genderSizeRows || {}),
        [selectedGender]: (item.genderSizeRows?.[selectedGender] || item.sizeRows || []).map((row, index) => index === sizeIndex ? {
          ...row,
          details: { ...(row.details || {}), [field]: value }
        } : row)
      }
    } : item));
  }

  function patchDetailField(id, fieldIndex, value) {
    commit(config.map((item) => {
      if (item.id !== id) return item;
      const oldField = item.detailFields[fieldIndex];
      const detailFields = item.detailFields.map((field, index) => index === fieldIndex ? value : field).filter(Boolean);
      return {
        ...item,
        detailFields,
        genderSizeRows: GENDERS.reduce((genderRows, gender) => ({
          ...genderRows,
          [gender]: (item.genderSizeRows?.[gender] || item.sizeRows || []).map((row) => {
            const details = { ...(row.details || {}) };
            if (oldField && value && oldField !== value) {
              details[value] = details[oldField] || "";
              delete details[oldField];
            }
            return { ...row, details };
          })
        }), {})
      };
    }));
  }

  function addDetailField(id) {
    commit(config.map((item) => item.id === id ? {
      ...item,
      detailFields: [...item.detailFields, "รายละเอียด"],
      genderSizeRows: GENDERS.reduce((genderRows, gender) => ({
        ...genderRows,
        [gender]: (item.genderSizeRows?.[gender] || item.sizeRows || []).map((row) => ({ ...row, details: { ...(row.details || {}), รายละเอียด: "" } }))
      }), {})
    } : item));
  }

  function deleteDetailField(id, fieldIndex) {
    commit(config.map((item) => {
      if (item.id !== id || item.detailFields.length <= 1) return item;
      const field = item.detailFields[fieldIndex];
      return {
        ...item,
        detailFields: item.detailFields.filter((_, index) => index !== fieldIndex),
        genderSizeRows: GENDERS.reduce((genderRows, gender) => ({
          ...genderRows,
          [gender]: (item.genderSizeRows?.[gender] || item.sizeRows || []).map((row) => {
            const details = { ...(row.details || {}) };
            delete details[field];
            return { ...row, details };
          })
        }), {})
      };
    }));
  }

  function patchColor(id, colorIndex, patch) {
    commit(config.map((item) => item.id === id ? {
      ...item,
      colors: (item.colors || []).map((color, index) => index === colorIndex ? { ...color, ...patch } : color)
    } : item));
  }

  function addClothing() {
    const id = crypto.randomUUID();
    commit([...config, {
      id,
      type: "เสื้อใหม่",
      imageUrl: "",
      colors: [],
      detailFields: ["อก"],
      sizeRows: [{ size: "M", details: { อก: "" } }],
      genderSizeRows: GENDERS.reduce((rows, gender) => ({ ...rows, [gender]: [{ size: "M", details: { อก: "" } }] }), {})
    }]);
    setSelectedId(id);
  }

  function deleteClothing(id) {
    if (config.length <= 1) {
      toast.error("ลบแบบเสื้อไม่ได้", { description: "ต้องมีประเภทเสื้ออย่างน้อย 1 รายการ" });
      return;
    }
    if (!window.confirm("ลบประเภทเสื้อนี้? รายการเก่าที่เคยสั่งจะยังอยู่ในประวัติ")) return;
    commit(config.filter((item) => item.id !== id));
  }

  function addSize(id) {
    commit(config.map((item) => item.id === id ? {
      ...item,
      genderSizeRows: {
        ...(item.genderSizeRows || {}),
        [selectedGender]: [
          ...(item.genderSizeRows?.[selectedGender] || item.sizeRows || []),
          { size: "", details: item.detailFields.reduce((details, field) => ({ ...details, [field]: "" }), {}) }
        ]
      }
    } : item));
  }

  function deleteSize(id, sizeIndex) {
    commit(config.map((item) => item.id === id ? {
      ...item,
      genderSizeRows: {
        ...(item.genderSizeRows || {}),
        [selectedGender]: (item.genderSizeRows?.[selectedGender] || item.sizeRows || []).length > 1
          ? (item.genderSizeRows?.[selectedGender] || item.sizeRows || []).filter((_, index) => index !== sizeIndex)
          : (item.genderSizeRows?.[selectedGender] || item.sizeRows || [])
      }
    } : item));
  }

  function addColor(id) {
    commit(config.map((item) => item.id === id ? { ...item, colors: [...(item.colors || []), { name: "", value: "#0F172A" }] } : item));
  }

  function deleteColor(id, colorIndex) {
    commit(config.map((item) => item.id === id ? {
      ...item,
      colors: (item.colors || []).filter((_, index) => index !== colorIndex)
    } : item));
  }

  async function uploadImage(id, file) {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error("ไฟล์รูปไม่ถูกต้อง", { description: validationError });
      return;
    }
    setUploadingId(id);
    const loadingToastId = toast.loading("กำลังอัปโหลดรูปเสื้อ...", { description: "ระบบกำลังบันทึกรูป กรุณารอสักครู่" });
    try {
      const result = await uploadImageToBlob(file);
      patchItem(id, { imageUrl: result.url });
      toast.success("อัปโหลดรูปเสื้อแล้ว", { id: loadingToastId });
    } catch (error) {
      toast.error("อัปโหลดรูปเสื้อไม่สำเร็จ", { id: loadingToastId, description: error?.message || "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ" });
    } finally {
      setUploadingId("");
    }
  }

  return (
    <Card className="clothing-manager-card p-0">
      <div className="flex flex-col gap-3 border-b border-[#E7EAF0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#071638]">ตั้งค่าเสื้อและไซส์</h2>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">เลือกแบบเสื้อจากรายการ แล้วแก้รายละเอียดเฉพาะตัวที่ต้องการ</p>
        </div>
        <button onClick={addClothing} className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#002B5B] px-4 text-sm font-bold text-white">
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
                "grid grid-cols-[3.25rem_1fr] gap-3 rounded-lg border p-2 text-left transition",
                item.id === selectedItem?.id ? "border-[#0D152A] bg-[#F8FAFC] shadow-sm" : "border-transparent bg-white hover:border-[#E7EAF0] hover:bg-[#F8FAFC]"
              )}
            >
              <div className="overflow-hidden rounded-md border border-[#E4E4E7] bg-white">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.type} className="h-12 w-full bg-[#F8FAFC] object-contain" /> : <div className="grid h-12 place-items-center text-[#A1A1AA]"><Shirt className="size-4" /></div>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#18181B]">{item.type || "ยังไม่ระบุชื่อ"}</p>
                <p className="mt-1 text-xs font-semibold text-[#71717A]">{GENDERS.map((gender) => `${gender} ${item.genderSizeRows?.[gender]?.length || item.sizeRows.length}`).join(" · ")} ไซส์</p>
              </div>
            </button>
          ))}
        </div>

        {selectedItem && (
          <div className="clothing-editor rounded-xl border border-[#D8DEEA] bg-white p-3">
            <div className="grid gap-3 lg:grid-cols-[9rem_1fr_auto] lg:items-start">
              <div className="overflow-hidden rounded-xl border border-[#D8DEEA] bg-white">
                {selectedItem.imageUrl ? (
                  <img src={selectedItem.imageUrl} alt={selectedItem.type} className="h-32 w-full bg-[#F8FAFC] object-contain" />
                ) : (
                  <div className="grid h-32 place-items-center text-sm font-bold text-[#94A3B8]">ไม่มีรูป</div>
                )}
              </div>
              <div className="grid gap-3">
                <Field label="ชื่อประเภทเสื้อ">
                  <TextInput value={selectedItem.type} onChange={(value) => patchItem(selectedItem.id, { type: value })} placeholder="เช่น เสื้อโปโล" />
                </Field>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#64748B]">สีที่มี</p>
                    <button onClick={() => addColor(selectedItem.id)} className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[#BFD0EA] bg-white px-3 text-xs font-bold text-[#002B5B]">
                      <Plus className="size-3.5" /> เพิ่มสี
                    </button>
                  </div>
                  {(selectedItem.colors || []).length ? selectedItem.colors.map((color, index) => (
                    <div key={`${selectedItem.id}-color-${index}`} className="grid grid-cols-[40px_1fr_40px] gap-2">
                      <input type="color" value={color.value || "#0F172A"} onChange={(event) => patchColor(selectedItem.id, index, { value: event.target.value })} className="h-10 w-10 rounded-lg border border-[#CBD5E1] bg-white p-1" aria-label="เลือกสี" />
                      <input value={color.name} onChange={(event) => patchColor(selectedItem.id, index, { name: event.target.value })} className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#002B5B]" placeholder="เช่น กรมท่า" />
                      <button onClick={() => deleteColor(selectedItem.id, index)} className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" title="ลบสี">
                        <Trash2 />
                      </button>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white px-3 py-2 text-sm font-semibold text-[#64748B]">ยังไม่มีสี ถ้าเสื้อตัวนี้มีหลายสีให้กดเพิ่มสี</div>
                  )}
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#64748B]">รายละเอียดไซส์</p>
                    <button onClick={() => addDetailField(selectedItem.id)} className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[#BFD0EA] bg-white px-3 text-xs font-bold text-[#002B5B]">
                      <Plus className="size-3.5" /> เพิ่มช่อง
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map((gender) => (
                      <button
                        key={gender}
                        onClick={() => setSelectedGender(gender)}
                        className={cn("min-h-9 rounded-lg border text-sm font-black transition", selectedGender === gender ? "border-[#002B5B] bg-[#002B5B] text-white" : "border-[#CBD5E1] bg-white text-[#071638]")}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 rounded-lg border border-[#E4E4E7] bg-white p-2 sm:hidden">
                    <div className="grid gap-2 rounded-lg bg-[#F8FAFC] p-2">
                      <p className="text-xs font-bold text-[#64748B]">ช่องรายละเอียด</p>
                      {selectedItem.detailFields.map((field, index) => (
                        <div key={`${selectedItem.id}-mobile-field-${index}`} className="grid grid-cols-[1fr_40px] gap-2">
                          <input value={field} onChange={(event) => patchDetailField(selectedItem.id, index, event.target.value)} className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm font-bold outline-none focus:border-[#002B5B]" placeholder="อก" />
                          <button onClick={() => deleteDetailField(selectedItem.id, index)} disabled={selectedItem.detailFields.length <= 1} className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40" title="ลบช่องรายละเอียด">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {selectedSizeRows.map((row, index) => (
                      <div key={`${selectedItem.id}-mobile-size-${index}`} className="grid gap-2 rounded-lg bg-[#F8FAFC] p-2">
                        <div className="grid grid-cols-[1fr_40px] gap-2">
                          <input value={row.size} onChange={(event) => patchSize(selectedItem.id, index, { size: event.target.value })} className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#002B5B]" placeholder="M" />
                          <button onClick={() => deleteSize(selectedItem.id, index)} className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" title="ลบไซส์">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        {selectedItem.detailFields.map((field) => (
                          <Field key={`${selectedItem.id}-mobile-${index}-${field}`} label={field}>
                            <input value={row.details?.[field] || ""} onChange={(event) => patchSizeDetail(selectedItem.id, index, field, event.target.value)} className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#002B5B]" placeholder={field} />
                          </Field>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="hidden gap-2 overflow-x-auto rounded-lg border border-[#E4E4E7] bg-white p-2 sm:grid">
                    <div className="grid min-w-max gap-2" style={{ gridTemplateColumns: `minmax(4.5rem,.7fr) repeat(${selectedItem.detailFields.length}, minmax(5rem,1fr)) 40px` }}>
                      <span className="text-xs font-bold text-[#64748B]">ไซส์</span>
                      {selectedItem.detailFields.map((field, index) => (
                        <div key={`${selectedItem.id}-field-${index}`} className="grid grid-cols-[1fr_32px] gap-1">
                          <input value={field} onChange={(event) => patchDetailField(selectedItem.id, index, event.target.value)} className="min-h-8 rounded-md border border-[#CBD5E1] px-2 text-xs font-bold outline-none focus:border-[#002B5B]" placeholder="อก" />
                          <button onClick={() => deleteDetailField(selectedItem.id, index)} disabled={selectedItem.detailFields.length <= 1} className="grid min-h-8 place-items-center rounded-md border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-40" title="ลบช่องรายละเอียด">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <span />
                    </div>
                    {selectedSizeRows.map((row, index) => (
                      <div key={`${selectedItem.id}-${index}`} className="grid min-w-max gap-2" style={{ gridTemplateColumns: `minmax(4.5rem,.7fr) repeat(${selectedItem.detailFields.length}, minmax(5rem,1fr)) 40px` }}>
                        <input value={row.size} onChange={(event) => patchSize(selectedItem.id, index, { size: event.target.value })} className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#002B5B]" placeholder="M" />
                        {selectedItem.detailFields.map((field) => (
                          <input key={`${selectedItem.id}-${index}-${field}`} value={row.details?.[field] || ""} onChange={(event) => patchSizeDetail(selectedItem.id, index, field, event.target.value)} className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#002B5B]" placeholder={field} />
                        ))}
                        <button onClick={() => deleteSize(selectedItem.id, index)} className="grid min-h-10 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" title="ลบไซส์">
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => addSize(selectedItem.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-[#8FA4C7] bg-white px-3 text-sm font-bold text-[#002B5B]">
                  <Plus className="size-4" /> เพิ่มไซส์
                </button>
              </div>
              <div className="grid gap-2">
                <label className={cn("flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#BFD0EA] bg-[#E5EFFD] px-3 text-sm font-bold text-[#002B5B]", uploadingId === selectedItem.id ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                  {uploadingId === selectedItem.id ? <Loader2 className="animate-spin" /> : <Upload />}
                  {uploadingId === selectedItem.id ? "กำลังอัปโหลด" : "แนบรูป"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingId === selectedItem.id}
                    onChange={(event) => {
                      uploadImage(selectedItem.id, event.target.files?.[0]);
                      event.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
                <button onClick={() => deleteClothing(selectedItem.id)} className="min-h-10 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 text-sm font-bold text-[#B91C1C]">
                  <span className="inline-flex items-center justify-center gap-1.5"><Trash2 className="size-4" /> ลบแบบเสื้อ</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function Dashboard({ demoMode }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState("");
  const [clothingConfig, setClothingConfig] = useState(readClothingConfig);
  const [branchFilter, setBranchFilter] = useState("ทุกสาขา");
  const [statusFilter, setStatusFilter] = useState("ทุกสถานะ");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const [selectedBatch, setSelectedBatch] = useState(null);

  async function loadData({ silent = false } = {}) {
    if (refreshing) return;
    const showSkeleton = !silent && !batches.length;
    if (showSkeleton) setLoading(true);
    setRefreshing(true);
    const loadingToastId = silent ? toast.loading("กำลังโหลดข้อมูล...", { description: "ระบบกำลังเตรียมข้อมูล กรุณารอสักครู่" }) : null;
    try {
      const storedBatches = readStoredBatches();
      if (!demoMode) {
        const response = await fetch(APPS_SCRIPT_URL);
        const result = await response.json();
        if (!response.ok || result?.success === false) throw new Error(result?.error || "GAS request failed");
        const data = Array.isArray(result) ? result : result?.data;
        const remoteBatches = Array.isArray(data) ? data.map(normalizeBatch).filter((batch) => batch.orders.length) : storedBatches;
        setBatches(remoteBatches);
        if (Array.isArray(data)) saveStoredBatches(remoteBatches);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setBatches(storedBatches);
      }
      if (loadingToastId) toast.success("โหลดข้อมูล Dashboard แล้ว", { id: loadingToastId });
    } catch {
      const storedBatches = readStoredBatches();
      setBatches(storedBatches);
      toast.error("โหลดข้อมูล Dashboard ไม่สำเร็จ", { id: loadingToastId || undefined, description: "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [demoMode]);

  const filteredBatches = useMemo(() => batches.filter((batch) => {
    const inBranch = branchFilter === "ทุกสาขา" || batch.branch === branchFilter;
    const inStatus = statusFilter === "ทุกสถานะ" || batch.status === statusFilter;
    const searchText = [
        batch.batchId,
        batch.companyName,
        batch.branch,
      batch.supervisorName,
      batch.supervisorPhone,
      batch.status,
      ...batch.orders.map((order) => [
        order.name,
        order.gender,
        ...order.items.map((item) => `${item.type} ${item.color || ""} ${item.size} ${item.qty}`)
      ].join(" "))
    ].join(" ").toLowerCase();
    const inQuery = !query || searchText.includes(query.toLowerCase());
    return inBranch && inStatus && inQuery;
  }), [batches, branchFilter, statusFilter, query]);

  const rows = useMemo(() => flattenBatches(filteredBatches), [filteredBatches]);
  const typeFilterOptions = useMemo(() => buildTypeTotals(rows).map((row) => row.type), [rows]);
  const visibleRows = useMemo(() => typeFilter === "ทั้งหมด" ? rows : rows.filter((row) => row.type === typeFilter), [rows, typeFilter]);
  const metrics = useMemo(() => buildDashboardMetrics(filteredBatches), [filteredBatches]);
  const summaryRows = useMemo(() => buildTotalSummary(visibleRows), [visibleRows]);
  const typeTotals = useMemo(() => buildTypeTotals(visibleRows), [visibleRows]);

  useEffect(() => {
    if (typeFilter !== "ทั้งหมด" && !typeFilterOptions.includes(typeFilter)) {
      setTypeFilter("ทั้งหมด");
    }
  }, [typeFilter, typeFilterOptions]);

  async function syncDashboardAction(payload) {
    if (demoMode || !isGasConfigured()) return;
    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) throw new Error(result?.error || "GAS request failed");
  }

  async function updateBatchStatus(batchId, status) {
    const statusUpdatedAt = new Date().toISOString();
    setStatusLoadingId(batchId);
    const loadingToastId = toast.loading("กำลังอัปเดตสถานะ...", { description: "ระบบกำลังบันทึกการเปลี่ยนแปลง กรุณารอสักครู่" });
    try {
      await syncDashboardAction({ action: "updateStatus", batchId, status, statusUpdatedAt });
    } catch {
      toast.error("อัปเดตสถานะไม่สำเร็จ", { id: loadingToastId, description: "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ" });
      setStatusLoadingId("");
      return;
    }

    setBatches((current) => {
      const next = current.map((batch) => batch.batchId === batchId ? { ...batch, status, statusUpdatedAt } : batch);
      saveStoredBatches(next);
      return next;
    });
    setSelectedBatch((current) => current?.batchId === batchId ? { ...current, status, statusUpdatedAt } : current);
    setStatusLoadingId("");
    toast.success("อัปเดตสถานะคำสั่งเบิกเสื้อแล้ว", { id: loadingToastId });
  }

  async function deleteBatch(batchId) {
    setDeleteLoadingId(batchId);
    const loadingToastId = toast.loading("กำลังลบคำสั่งเบิกเสื้อ...", { description: "ระบบกำลังดำเนินการ กรุณารอสักครู่" });
    try {
      await syncDashboardAction({ action: "deleteBatch", batchId });
    } catch {
      toast.error("ลบคำสั่งเบิกเสื้อไม่สำเร็จ", { id: loadingToastId, description: "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ" });
      setDeleteLoadingId("");
      return;
    }

    setBatches((current) => {
      const next = current.filter((batch) => batch.batchId !== batchId);
      saveStoredBatches(next);
      return next;
    });
    setSelectedBatch(null);
    setDeleteLoadingId("");
    toast.success("ลบคำสั่งเบิกเสื้อแล้ว", { id: loadingToastId });
  }

  function clearFilters() {
    setBranchFilter("ทุกสาขา");
    setStatusFilter("ทุกสถานะ");
    setQuery("");
  }

  function exportCsv() {
    const header = ["BatchID", "สถานะ", "อัปเดตสถานะ", "วันที่", "ชื่อบริษัท", "สาขา", "ผู้ขอเบิก/ผู้ติดต่อ", "เบอร์ติดต่อ", "ชื่อพนักงาน", "เพศ", "ประเภท", "สี", "ไซส์", "จำนวน"];
    const batchById = new Map(filteredBatches.map((batch) => [batch.batchId, batch]));
    const csv = [header, ...rows.map((row) => {
      const batch = batchById.get(row.batchId);
      return [row.batchId, batch?.status || ORDER_STATUS_PENDING, batch?.statusUpdatedAt || "", row.submittedAt, row.companyName, row.branch, row.supervisorName, row.supervisorPhone, row.name, row.gender, row.type, row.color || "", row.size, row.qty];
    })].map((line) => line.join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uniform-order-batches.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <SkeletonDashboard />;

  return (
    <>
      <section className="rounded-xl border border-[#D8E3F5] bg-white/96 px-3 py-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#071638] sm:text-xl">Dashboard</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#64748B] sm:text-sm">ติดตามคำสั่งเบิกเสื้อและยอดรวม</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={() => loadData({ silent: true })} disabled={refreshing} className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#BFD0EA] bg-white px-3 text-sm font-bold text-[#002B5B] disabled:cursor-not-allowed disabled:opacity-60">
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : null}
              {refreshing ? "กำลังโหลด" : "Refresh"}
            </button>
            <button onClick={exportCsv} disabled={refreshing || !rows.length} className="flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#BFD0EA] bg-[#E5EFFD] px-3 text-sm font-bold text-[#002B5B] disabled:cursor-not-allowed disabled:opacity-60">
              <Download /> Export CSV
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={Users} value={metrics.totalEmployees} label="พนักงาน" />
        <Stat icon={ClipboardList} value={metrics.pendingBatches} label="รอจัดส่ง" />
        <Stat icon={PackageCheck} value={metrics.deliveredBatches} label="จัดส่งแล้ว" />
      </div>

      <Tabs.Root defaultValue="overview" className="grid gap-3">
        <Tabs.List className="grid grid-cols-2 gap-1 rounded-xl border border-[#D8DEEA] bg-white p-1 shadow-sm sm:grid-cols-4">
          <Tabs.Trigger value="overview" className="flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm">
            <LayoutDashboard className="size-4 shrink-0" /> <span className="truncate">ภาพรวม</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="list" className="flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm">
            <Users className="size-4 shrink-0" /> <span className="truncate">รายการเบิก</span>
            <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-xs text-[#52525B] data-[state=active]:bg-white/15 data-[state=active]:text-white">{rows.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="orders" className="flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm">
            <ClipboardList className="size-4 shrink-0" /> <span className="truncate">คำสั่งเบิก</span>
            <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-xs text-[#52525B] data-[state=active]:bg-white/15 data-[state=active]:text-white">{filteredBatches.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="settings" className="flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#64748B] data-[state=active]:bg-[#18181B] data-[state=active]:text-white sm:min-h-9 sm:text-sm">
            <Settings className="size-4 shrink-0" /> <span className="truncate">ตั้งค่าเสื้อ</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="grid gap-3">
          <Card className="p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#071638]">ภาพรวม</h2>
                <p className="mt-0.5 text-xs font-semibold text-[#64748B]">สรุปยอดตามตัวกรองปัจจุบัน</p>
              </div>
              <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-right">
                <p className="text-xs font-bold text-[#71717A]">รวมทั้งหมด</p>
                <p className="text-xl font-black text-[#18181B]">{metrics.totalPieces} ชิ้น</p>
              </div>
            </div>
          </Card>
          <TypeFilterChips value={typeFilter} onChange={setTypeFilter} options={typeFilterOptions} />
          <TotalSummaryView summaryRows={summaryRows} typeTotals={typeTotals} filteredRows={visibleRows} />
        </Tabs.Content>

        <Tabs.Content value="list">
          <TypeFilterChips value={typeFilter} onChange={setTypeFilter} options={typeFilterOptions} />
          <EmployeeWithdrawalList rows={visibleRows} totalRows={rows.length} />
        </Tabs.Content>

        <Tabs.Content value="orders">
          <div className="grid gap-3">
            <Card className="p-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[12rem_12rem_1fr_auto] lg:items-end">
                <Field label="สาขา"><Select value={branchFilter} onChange={setBranchFilter} values={["ทุกสาขา", ...BRANCHES]} /></Field>
                <Field label="สถานะ"><Select value={statusFilter} onChange={setStatusFilter} values={["ทุกสถานะ", ...ORDER_STATUSES]} /></Field>
                <Field label="ค้นหา"><TextInput value={query} onChange={setQuery} placeholder="ค้นหา BatchID บริษัท ผู้ติดต่อ เบอร์ หรือชื่อพนักงาน" /></Field>
                <button onClick={clearFilters} className="min-h-11 rounded-lg border border-[#CBD5E1] bg-white px-4 font-bold text-[#002B5B] shadow-sm">
                  ล้างตัวกรอง
                </button>
              </div>
            </Card>

            {filteredBatches.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredBatches.map((batch) => (
                  <DashboardOrderCard
                    key={batch.batchId}
                    batch={batch}
                    onOpen={() => setSelectedBatch(batch)}
                    onStatusChange={updateBatchStatus}
                    onDelete={deleteBatch}
                    statusLoadingId={statusLoadingId}
                    deleteLoadingId={deleteLoadingId}
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
                  <p className="mt-0.5 text-xs font-semibold text-[#64748B]">แก้แบบเสื้อ สี และไซส์</p>
                </div>
                <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-[#52525B]">
                  {clothingConfig.length} แบบเสื้อ
                </div>
              </div>
            </Card>
            <ClothingManager config={clothingConfig} setConfig={setClothingConfig} />
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <BatchDetailDialog batch={selectedBatch} onClose={() => setSelectedBatch(null)} onStatusChange={updateBatchStatus} onDelete={deleteBatch} statusLoadingId={statusLoadingId} deleteLoadingId={deleteLoadingId} />
    </>
  );
}

function TypeFilterChips({ value, onChange, options }) {
  if (!options.length) return null;
  const choices = ["ทั้งหมด", ...options];
  return (
    <div className="min-w-0 rounded-xl border border-[#E4E4E7] bg-white px-3 py-2">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-[#18181B]">กรองแบบเสื้อ</p>
        <p className="hidden text-xs font-semibold text-[#71717A] sm:block">เลือกดูเฉพาะเสื้อแต่ละแบบ</p>
      </div>
      <div className="employee-scroll-region flex min-w-0 gap-2 overflow-x-auto pb-1 sm:pb-0">
        {choices.map((type) => {
          const active = value === type;
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={cn(
                "min-h-9 shrink-0 rounded-lg border px-3 text-sm font-bold transition",
                active ? "border-[#18181B] bg-[#18181B] text-white" : "border-[#D4D4D8] bg-white text-[#52525B] hover:border-[#A1A1AA]"
              )}
            >
              {type}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function EmployeeWithdrawalList({ rows, totalRows = rows.length }) {
  const [listQuery, setListQuery] = useState("");
  const normalizedQuery = listQuery.trim().toLowerCase();
  const filteredRows = useMemo(() => rows.filter((row) => {
    if (!normalizedQuery) return true;
    return [
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
      row.status
    ].join(" ").toLowerCase().includes(normalizedQuery);
  }), [rows, normalizedQuery]);

  if (!rows.length) return <EmptyDashboardState text="ยังไม่มีรายการเบิกตามเงื่อนไขที่เลือก" />;

  const columns = [
    { label: "วันที่", className: "min-w-[11rem]" },
    { label: "BatchID", className: "min-w-[11rem]" },
    { label: "ชื่อพนักงาน", className: "min-w-[12rem]" },
    { label: "เพศ", className: "min-w-[5rem]" },
    { label: "สาขา", className: "min-w-[10rem]" },
    { label: "บริษัท", className: "min-w-[13rem]" },
    { label: "ผู้ขอเบิก/ผู้ติดต่อ", className: "min-w-[11rem]" },
    { label: "เบอร์", className: "min-w-[9rem]" },
    { label: "ประเภท", className: "min-w-[9rem]" },
    { label: "สี", className: "min-w-[7rem]" },
    { label: "ไซส์", className: "min-w-[5rem]" },
    { label: "จำนวน", className: "min-w-[5rem] text-right" },
    { label: "สถานะ", className: "min-w-[7rem]" }
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex min-w-0 flex-col gap-3 border-b border-[#E7EAF0] px-3 py-3 sm:px-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-[#071638]">รายการเบิกทั้งหมด</h2>
          <p className="mt-1 hidden text-sm font-semibold text-[#64748B] sm:block">แสดงข้อมูลพนักงานและรายการเสื้อจากคำสั่งเบิกที่ผ่านตัวกรอง</p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(14rem,26rem)_auto] sm:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71717A]" />
            <input
              value={listQuery}
              onChange={(event) => setListQuery(event.target.value)}
              placeholder="ค้นหาชื่อ สาขา บริษัท เสื้อ สี ไซส์ หรือ BatchID"
              className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white pl-10 pr-3 text-sm font-semibold text-[#071638] outline-none transition placeholder:text-[#94A3B8] focus:border-[#18181B] focus:ring-2 focus:ring-[#18181B]/10"
            />
          </div>
          <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-2 text-center text-sm font-black text-[#18181B]">
            {filteredRows.length}/{totalRows} รายการ
          </div>
        </div>
      </div>
      <div className="grid gap-2 p-3 md:hidden">
        {filteredRows.map((row) => (
          <WithdrawalMobileCard key={row.id} row={row} />
        ))}
        {!filteredRows.length && (
          <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center font-bold text-[#64748B]">
            ไม่พบรายการตามคำค้นหา
          </div>
        )}
      </div>
      <div className="employee-scroll-region hidden overflow-auto md:block">
        <table className="w-full min-w-[1500px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#EEF4FF] text-xs font-extrabold text-[#44536A]">
            <tr>
              {columns.map((column) => (
                <th key={column.label} className={cn("border-b border-[#D8DEEA] px-4 py-3.5", column.className)}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b border-[#E7EAF0] align-top hover:bg-[#F8FAFC]">
                <td className="whitespace-nowrap px-4 py-4 font-semibold leading-6 text-[#44536A]">
                  {new Date(row.submittedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="break-words px-4 py-4 font-bold leading-6 text-[#64748B]">{row.batchId}</td>
                <td className="break-words px-4 py-4 font-extrabold leading-6 text-[#071638]">{row.name || "-"}</td>
                <td className="whitespace-nowrap px-4 py-4 leading-6">{row.gender || "-"}</td>
                <td className="break-words px-4 py-4 font-bold leading-6 text-[#002B5B]">{row.branch || "-"}</td>
                <td className="break-words px-4 py-4 leading-6">{row.companyName || "-"}</td>
                <td className="break-words px-4 py-4 font-bold leading-6">{row.supervisorName || "-"}</td>
                <td className="whitespace-nowrap px-4 py-4 leading-6">{formatPhone(row.supervisorPhone) || "-"}</td>
                <td className="break-words px-4 py-4 font-bold leading-6">{row.type || "-"}</td>
                <td className="break-words px-4 py-4 leading-6">{row.color || "-"}</td>
                <td className="whitespace-nowrap px-4 py-4 font-bold leading-6">{row.size || "-"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-extrabold leading-6">{row.qty}</td>
                <td className="whitespace-nowrap px-4 py-4"><StatusBadge status={row.status || ORDER_STATUS_PENDING} /></td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center font-bold text-[#64748B]">
                  ไม่พบรายการตามคำค้นหา
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
          <h3 className="break-words text-sm font-extrabold leading-5 text-[#071638]">{row.name || "-"}</h3>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-[#64748B]">{row.batchId}</p>
        </div>
        <StatusBadge status={row.status || ORDER_STATUS_PENDING} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MobileInfo label="วันที่" value={new Date(row.submittedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} />
        <MobileInfo label="เพศ" value={row.gender || "-"} />
        <MobileInfo label="สาขา" value={row.branch || "-"} />
        <MobileInfo label="บริษัท" value={row.companyName || "-"} />
        <MobileInfo label="ผู้ขอเบิก" value={row.supervisorName || "-"} />
        <MobileInfo label="เบอร์" value={formatPhone(row.supervisorPhone) || "-"} />
      </div>
      <div className="mt-3 rounded-lg bg-[#F4F7FC] p-3">
        <p className="break-words text-sm font-extrabold text-[#071638]">{row.type || "-"}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <MobileInfo label="สี" value={row.color || "-"} compact />
          <MobileInfo label="ไซส์" value={row.size || "-"} compact />
          <MobileInfo label="จำนวน" value={row.qty || "-"} compact strong />
        </div>
      </div>
    </article>
  );
}

function MobileInfo({ label, value, compact = false, strong = false }) {
  return (
    <div className={cn("min-w-0 rounded-lg bg-[#F8FAFC] px-2.5 py-2", compact && "bg-white")}>
      <p className="truncate text-[11px] font-bold text-[#64748B]">{label}</p>
      <p className={cn("mt-0.5 break-words text-xs leading-5 text-[#071638]", strong ? "font-black" : "font-bold")}>{value}</p>
    </div>
  );
}

function DashboardOrderCard({ batch, onOpen, onStatusChange, onDelete, statusLoadingId = "", deleteLoadingId = "" }) {
  const totalPieces = getBatchPieces(batch);
  const totalEmployees = batch.orders.length;
  const isUpdatingStatus = statusLoadingId === batch.batchId;
  const isDeleting = deleteLoadingId === batch.batchId;
  const isBusy = isUpdatingStatus || isDeleting;
  function confirmDelete() {
    if (!isBusy && window.confirm(`ลบคำสั่งเบิกเสื้อ ${batch.batchId}?`)) onDelete(batch.batchId);
  }

  return (
    <div className="rounded-xl border border-[#D8DEEA] bg-white/96 p-3 text-left shadow-sm transition hover:border-[#9EB7DD]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#64748B]">{batch.batchId}</p>
          <h3 className="mt-0.5 truncate text-base font-extrabold text-[#071638]">{batch.companyName || "ไม่ระบุบริษัท"}</h3>
          <p className="mt-0.5 text-sm font-bold text-[#002B5B]">{batch.branch}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
            {new Date(batch.submittedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <StatusBadge status={batch.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniMetric label="บริษัท" value={batch.companyName || "-"} />
        <MiniMetric label="ผู้ติดต่อ" value={batch.supervisorName || "-"} />
        <MiniMetric label="พนักงาน" value={totalEmployees} />
        <MiniMetric label="จำนวน" value={`${totalPieces} ชิ้น`} />
      </div>
      <p className="mt-2 text-xs font-semibold text-[#64748B]">อัปเดตสถานะ: {new Date(batch.statusUpdatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {buildTypeTotals(flattenBatches([batch])).map((row) => (
          <span key={row.type} className="rounded-full border border-[#D8DEEA] px-2.5 py-1 text-xs font-bold text-[#44536A]">{row.type}: {row.qty}</span>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="สถานะ">
          <Select value={batch.status} values={ORDER_STATUSES} disabled={isBusy} onChange={(status) => onStatusChange(batch.batchId, status)} />
        </Field>
        <button onClick={onOpen} disabled={isBusy} className="min-h-11 rounded-lg bg-[#002B5B] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
          ดูรายละเอียด
        </button>
        <button onClick={confirmDelete} disabled={isBusy} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 font-bold text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60">
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isDeleting ? "กำลังลบ" : "ลบ"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const delivered = status === ORDER_STATUS_DELIVERED;
  return (
    <span className={cn("inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold", delivered ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]")}>
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

function TotalSummaryView({ summaryRows, typeTotals, filteredRows }) {
  const maxQty = Math.max(1, ...typeTotals.map((row) => row.qty));
  const totalPieces = filteredRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(22rem,.8fr)_minmax(0,1.2fr)]">
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#071638]">ยอดรวมตามประเภทเสื้อ</h2>
          <span className="shrink-0 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-1 text-sm font-black text-[#18181B]">{totalPieces} ชิ้น</span>
        </div>
        <div className="mt-3 grid gap-2">
          {typeTotals.length ? typeTotals.map((row) => (
            <div key={row.type}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold">
                <span>{row.type}</span>
                <span className="whitespace-nowrap">{row.qty} ชิ้น</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E5ECF7]">
                <div className="h-2.5 rounded-full bg-[#18181B]" style={{ width: `${Math.max(8, (row.qty / maxQty) * 100)}%` }} />
              </div>
            </div>
          )) : <EmptyDashboardState text="ยังไม่มียอดรวม" compact />}
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <h2 className="text-base font-extrabold text-[#071638]">ยอดรวมตามไซส์</h2>
        <div className="mt-3 grid gap-2 sm:hidden">
          {summaryRows.length ? summaryRows.map((row) => (
            <SummaryMobileRow key={`${row.type}-${row.color}-${row.size}`} row={row} />
          )) : <EmptyDashboardState text="ยังไม่มีข้อมูล" compact />}
        </div>
        <div className="mt-3 hidden overflow-hidden rounded-xl border border-[#E2E8F0] sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#EEF4FF] text-xs font-bold text-[#44536A]">
              <tr>
                <th className="px-4 py-2.5">ประเภท</th>
                <th className="px-4 py-2.5">สี</th>
                <th className="px-4 py-2.5">ไซส์</th>
                <th className="px-4 py-2.5 text-right">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.length ? summaryRows.map((row) => (
                <tr key={`${row.type}-${row.color}-${row.size}`} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-3 font-bold">{row.type}</td>
                  <td className="px-4 py-3">{row.color || "-"}</td>
                  <td className="px-4 py-3">{row.size}</td>
                  <td className="px-4 py-3 text-right font-extrabold">{row.qty}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center font-bold text-[#64748B]">ยังไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BatchDetailDialog({ batch, onClose, onStatusChange, onDelete, statusLoadingId = "", deleteLoadingId = "" }) {
  const rows = batch ? flattenBatches([batch]) : [];
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const isUpdatingStatus = Boolean(batch && statusLoadingId === batch.batchId);
  const isDeleting = Boolean(batch && deleteLoadingId === batch.batchId);
  const isBusy = isUpdatingStatus || isDeleting;
  useEffect(() => {
    if (!batch) setShowEmployeeList(false);
  }, [batch]);
  function confirmDelete() {
    if (batch && !isBusy && window.confirm(`ลบคำสั่งเบิกเสื้อ ${batch.batchId}?`)) onDelete(batch.batchId);
  }

  return (
    <Dialog.Root open={Boolean(batch)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(58rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          {batch && (
            <>
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[#E7EAF0] px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <Dialog.Title className="break-words text-lg font-extrabold text-[#071638] sm:text-xl">{batch.companyName || "ไม่ระบุบริษัท"}</Dialog.Title>
                  <p className="mt-1 text-sm font-bold text-[#002B5B]">{batch.branch}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#64748B]">{batch.batchId}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={batch.status} />
                  <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
                </div>
              </div>
              <div className="max-h-[64vh] overflow-auto p-3 sm:p-4">
                <div className="mb-4 grid gap-3 sm:grid-cols-5">
                  <MiniMetric label="บริษัท" value={batch.companyName || "-"} />
                  <MiniMetric label="ผู้ติดต่อ" value={batch.supervisorName || "-"} />
                  <MiniMetric label="เบอร์ติดต่อ" value={formatPhone(batch.supervisorPhone) || "-"} />
                  <MiniMetric label="จำนวนรวม" value={`${getBatchPieces(batch)} ชิ้น`} />
                  <div className="min-w-0 rounded-xl bg-[#F4F7FC] px-3 py-3">
                    <p className="truncate text-xs font-bold text-[#64748B]">สถานะ</p>
                    <div className="mt-1">
                      <CustomSelect value={batch.status} values={ORDER_STATUSES} disabled={isBusy} onChange={(status) => onStatusChange(batch.batchId, status)} compact />
                    </div>
                  </div>
                </div>
                <p className="mb-4 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-bold text-[#002B5B]">
                  อัปเดตสถานะล่าสุด: {new Date(batch.statusUpdatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <button onClick={() => setShowEmployeeList(true)} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#BFD0EA] bg-[#E5EFFD] px-4 text-sm font-black text-[#002B5B]">
                  <Users className="size-4" /> ดูรายชื่อพนักงานทั้งหมด ({batch.orders.length} คน)
                </button>
                <div className="grid gap-3">
                  {batch.orders.map((order) => (
                    <div key={`${batch.batchId}-${order.name}`} className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                      <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EEF4FF] px-3 py-3 sm:px-4">
                        <div className="min-w-0">
                          <p className="break-words font-extrabold text-[#071638]">{order.name}</p>
                          <p className="text-xs font-bold text-[#64748B]">{order.gender}</p>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold text-[#002B5B]">{order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)} ชิ้น</span>
                      </div>
                      <div className="grid gap-2 p-3 sm:hidden">
                        {order.items.map((item) => (
                          <div key={`${order.name}-${item.type}-${item.color}-${item.size}`} className="rounded-lg bg-[#F8FAFC] p-3">
                            <p className="break-words text-sm font-extrabold text-[#071638]">{item.type}</p>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                              <MobileInfo label="สี" value={item.color || "-"} compact />
                              <MobileInfo label="ไซส์" value={item.size || "-"} compact />
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
                            <th className="w-20 px-3 py-3 sm:w-24 sm:px-4">ไซส์</th>
                            <th className="w-20 px-3 py-3 text-right sm:w-24 sm:px-4">จำนวน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={`${order.name}-${item.type}-${item.size}`} className="border-t border-[#E2E8F0]">
                              <td className="break-words px-3 py-3 font-bold sm:px-4">{item.type}</td>
                              <td className="break-words px-3 py-3 sm:px-4">{item.color || "-"}</td>
                              <td className="break-words px-3 py-3 sm:px-4">{item.size}</td>
                              <td className="px-3 py-3 text-right font-extrabold sm:px-4">{item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
                <button onClick={confirmDelete} disabled={isBusy} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] font-bold text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60">
                  {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isDeleting ? "กำลังลบคำสั่งเบิกเสื้อ" : "ลบคำสั่งเบิกเสื้อนี้"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
        <BatchEmployeeListDialog batch={batch} open={showEmployeeList} setOpen={setShowEmployeeList} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BatchEmployeeListDialog({ batch, open, setOpen }) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0F172A]/35 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-2 bottom-2 top-2 z-[61] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[82vh] sm:w-[min(48rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[#E7EAF0] px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-extrabold text-[#071638]">รายชื่อพนักงานทั้งหมด</Dialog.Title>
              <p className="mt-1 break-words text-sm font-bold text-[#64748B]">{batch?.supervisorName || "-"} เป็นผู้ขอเบิก · {batch?.branch || "-"}</p>
            </div>
            <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
          </div>
          <div className="employee-scroll-region min-h-0 flex-1 overflow-auto p-3 sm:p-4">
            <div className="grid gap-3">
              {batch?.orders.map((order, index) => {
                const pieces = order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
                const details = order.items.map((item) => `${item.type}${item.color ? ` ${item.color}` : ""} ${item.size} x${item.qty}`).join(" · ");
                return (
                  <div key={`${batch.batchId}-${order.name}-${index}`} className="rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-extrabold text-[#071638]">{index + 1}. {order.name || "-"}</p>
                        <p className="mt-1 text-xs font-bold text-[#64748B]">{order.gender || "-"}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#EEF4FF] px-3 py-1 text-sm font-black text-[#002B5B]">{pieces} ชิ้น</span>
                    </div>
                    <p className="mt-3 break-words text-sm font-semibold leading-6 text-[#44536A]">{details || "-"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EmptyDashboardState({ text, compact = false }) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-[#CBD5E1] bg-white/70 text-center font-bold text-[#64748B]", compact ? "p-4" : "p-10")}>
      {text}
    </div>
  );
}

function getBatchPieces(batch) {
  return flattenBatches([batch]).reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function buildTypeTotals(rows) {
  return getClothingTypes().map((type) => ({
    type,
    qty: rows.filter((row) => row.type === type).reduce((sum, row) => sum + Number(row.qty || 0), 0)
  })).filter((row) => row.qty > 0);
}

function buildTotalSummary(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row.type}__${row.color || ""}__${row.size}`;
    const current = map.get(key) || { type: row.type, color: row.color || "", size: row.size, qty: 0 };
    current.qty += Number(row.qty || 0);
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.type.localeCompare(b.type, "th") || String(a.color).localeCompare(String(b.color), "th") || String(a.size).localeCompare(String(b.size), "th", { numeric: true }));
}

function buildDashboardMetrics(batches) {
  const rows = flattenBatches(batches);
  return {
    totalEmployees: batches.reduce((sum, batch) => sum + batch.orders.length, 0),
    totalPieces: rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
    pendingBatches: batches.filter((batch) => batch.status !== ORDER_STATUS_DELIVERED).length,
    deliveredBatches: batches.filter((batch) => batch.status === ORDER_STATUS_DELIVERED).length
  };
}

function Stat({ icon: Icon, value, label }) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <div className="grid size-8 place-items-center rounded-xl bg-[#EEF4FF] text-[#002B5B] sm:size-9"><Icon className="size-4 sm:size-5" /></div>
      <p className="mt-2 truncate text-xl font-extrabold text-[#071638] sm:mt-3 sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-[11px] font-bold text-[#64748B] sm:text-xs">{label}</p>
    </Card>
  );
}

function SkeletonDashboard() {
  return (
    <div className="relative z-10 mx-auto grid w-full max-w-[1240px] gap-4 px-4 py-6 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="flex min-h-24 items-center justify-center gap-3 rounded-2xl border border-[#D8DEEA] bg-white/90 text-sm font-bold text-[#44536A] shadow-sm">
        <Loader2 className="size-5 animate-spin text-[#002B5B]" />
        <span>กำลังโหลดข้อมูล...</span>
      </div>
      {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/80" />)}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
