import React, { useEffect, useMemo, useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { Toaster, toast } from "sonner";
import {
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  Gauge,
  LayoutDashboard,
  Loader2,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Shirt,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { cn } from "./lib/utils";
import "./index.css";

const APPS_SCRIPT_URL = import.meta.env.VITE_GAS_URL || "YOUR_SCRIPT_URL_HERE";
const DASHBOARD_PATH = "/";
const ORDER_PATH = "/order";
const DASHBOARD_PASSCODE = "1234";
const ORDER_STORAGE_KEY = "gi-shirt-order-batches";
const DEFAULT_COMPANY_NAME = "โกลด์ อินทิเกรท จำกัด";
const ORDER_STATUS_PENDING = "รอจัดส่ง";
const ORDER_STATUS_DELIVERED = "จัดส่งแล้ว";
const ORDER_STATUSES = [ORDER_STATUS_PENDING, ORDER_STATUS_DELIVERED];

const BRANCHES = ["สำนักงานใหญ่", "สาขาเชียงใหม่", "สาขาภูเก็ต", "สาขาอุดร", "สาขาหาดใหญ่"];
const CLOTHING_TYPES = ["เสื้อโปโล", "เสื้อช็อป", "กางเกงช็อป"];
const GENDERS = ["ชาย", "หญิง"];
const OTHER_SIZE = "อื่นๆ";

const SIZE_TABLES = {
  "เสื้อโปโล ชาย": [["S", '38"'], ["M", '40"'], ["L", '42"'], ["XL", '44"'], ["2XL", '46"'], ["3XL", '48"'], ["4XL", '50"'], ["5XL", '52"']],
  "เสื้อโปโล หญิง": [["S", '34"'], ["M", '36"'], ["L", '38"'], ["XL", '40"'], ["2XL", '42"'], ["3XL", '44"'], ["4XL", '46"'], ["5XL", '48"']],
  "เสื้อช็อป": [["S", '38"'], ["M", '40"'], ["L", '42"'], ["XL", '44"'], ["2XL", '46"'], ["3XL", '48"'], ["4XL", '50"'], ["5XL", '52"']],
  "กางเกงช็อป": [["28", '28"'], ["30", '30"'], ["32", '32"'], ["34", '34"'], ["36", '36"'], ["38", '38"'], ["40", '40"'], ["42", '42"'], ["44", '44"']]
};

const mockBatches = [
  {
    batchId: "ORD-20260501-01",
    branch: "สำนักงานใหญ่",
    supervisorName: "สมชาย ใจดี",
    supervisorPhone: "081-234-5678",
    submittedAt: "2026-05-01T09:20:00",
    orders: [
      { name: "สมชาย ใจดี", employeeId: "EMP-1001", gender: "ชาย", items: [{ type: "เสื้อโปโล", size: "L", qty: 2 }, { type: "เสื้อช็อป", size: "XL", qty: 1 }] },
      { name: "สมหญิง รักงาน", employeeId: "EMP-1002", gender: "หญิง", items: [{ type: "เสื้อโปโล", size: "M", qty: 1 }, { type: "กางเกงช็อป", size: "30", qty: 1 }] }
    ]
  },
  {
    batchId: "ORD-20260504-02",
    branch: "สาขาเชียงใหม่",
    supervisorName: "นที เชียงแสน",
    supervisorPhone: "089-555-1212",
    submittedAt: "2026-05-04T13:10:00",
    orders: [
      { name: "กมลวรรณ ศรีทอง", employeeId: "EMP-1201", gender: "หญิง", items: [{ type: "เสื้อโปโล", size: "S", qty: 2 }, { type: "เสื้อช็อป", size: "M", qty: 1 }] },
      { name: "ปกรณ์ ดีพร้อม", employeeId: "", gender: "ชาย", items: [{ type: "เสื้อช็อป", size: "อื่นๆ: 54 นิ้ว", qty: 1 }] }
    ]
  },
  {
    batchId: "ORD-20260509-03",
    branch: "สาขาภูเก็ต",
    supervisorName: "มุกดา ทะเลงาม",
    supervisorPhone: "086-987-1111",
    submittedAt: "2026-05-09T10:45:00",
    orders: [
      { name: "พิมพ์ชนก สว่าง", employeeId: "EMP-1301", gender: "หญิง", items: [{ type: "เสื้อโปโล", size: "XL", qty: 1 }, { type: "กางเกงช็อป", size: "30", qty: 1 }] },
      { name: "ชานนท์ ไกร", employeeId: "EMP-1302", gender: "ชาย", items: [{ type: "เสื้อช็อป", size: "2XL", qty: 2 }] }
    ]
  },
  {
    batchId: "ORD-20260512-04",
    branch: "สาขาอุดร",
    supervisorName: "ธนา พรหมมา",
    supervisorPhone: "088-456-7890",
    submittedAt: "2026-05-12T11:05:00",
    orders: [
      { name: "ธนา พรหมมา", employeeId: "EMP-1401", gender: "ชาย", items: [{ type: "เสื้อช็อป", size: "XL", qty: 2 }, { type: "กางเกงช็อป", size: "36", qty: 2 }] },
      { name: "จิราพร พูลผล", employeeId: "EMP-1402", gender: "หญิง", items: [{ type: "เสื้อโปโล", size: "M", qty: 2 }] }
    ]
  },
  {
    batchId: "ORD-20260513-05",
    branch: "สาขาหาดใหญ่",
    supervisorName: "อารีย์ สายใต้",
    supervisorPhone: "082-111-9012",
    submittedAt: "2026-05-13T08:30:00",
    orders: [
      { name: "อานนท์ หาดใหญ่", employeeId: "EMP-1501", gender: "ชาย", items: [{ type: "เสื้อโปโล", size: "3XL", qty: 2 }] },
      { name: "ลลิตา แก้ว", employeeId: "EMP-1502", gender: "หญิง", items: [{ type: "กางเกงช็อป", size: "32", qty: 1 }, { type: "เสื้อช็อป", size: "S", qty: 1 }] }
    ]
  }
];

function getSizeRows(type, gender) {
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

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function employeeIdOnly(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
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
    case "add":
      return { ...state, employees: [...state.employees, createEmployee(state.employees.length)] };
    case "delete":
      return { ...state, employees: state.employees.filter((employee) => employee.id !== action.id) };
    case "toggleExpand":
      return { ...state, employees: state.employees.map((employee) => employee.id === action.id ? { ...employee, expanded: !employee.expanded } : employee) };
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
            : [...employee.items, { type: action.itemType, size: "", customSize: "", qty: "" }];
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
        name: order.name,
        gender: order.gender,
        type: item.type,
        size: item.size,
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
      id: `${employee.id}-${item.type}`,
      name: employee.name || "-",
      type: item.type,
      size: item.size === OTHER_SIZE ? (item.customSize || "-") : item.size,
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
      (item.size !== OTHER_SIZE || item.customSize.trim())
    )
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const demoMode = APPS_SCRIPT_URL.includes("YOUR_SCRIPT_URL") || !APPS_SCRIPT_URL;

  function navigate(pathname) {
    window.history.pushState({}, "", pathname);
    setPath(pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const isDashboard = path === DASHBOARD_PATH || path === "/dashboard";

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#071638]">
      <ReactBitsAurora />
      {isDashboard ? <DashboardApp demoMode={demoMode} onOpenOrder={() => navigate(ORDER_PATH)} /> : <OrderApp demoMode={demoMode} />}
      <Toaster richColors position="top-center" />
    </div>
  );
}

function OrderApp({ demoMode }) {
  const [employeeCount, setEmployeeCount] = useState(1);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, dispatch] = useReducer(orderReducer, {
    companyName: DEFAULT_COMPANY_NAME,
    branch: "สำนักงานใหญ่",
    supervisorName: "",
    supervisorPhone: "",
    employees: Array.from({ length: 1 }, (_, index) => createEmployee(index))
  });

  const summaryRows = useMemo(() => buildOrderSummaryRows(state.employees), [state.employees]);
  const totalPieces = summaryRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);

  useEffect(() => {
    dispatch({ type: "syncCount", count: employeeCount });
  }, [employeeCount]);

  function addEmployeeFromButton() {
    setEmployeeCount((count) => count + 1);
    window.setTimeout(() => {
      const cards = document.querySelectorAll("[data-employee-card]");
      cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function openSummary() {
    if (!state.employees.every(isEmployeeComplete)) {
      toast.error("กรอกชื่อ เลือกเพศ ประเภทชุด ไซส์ และจำนวนให้ครบก่อนส่งคำสั่งซื้อ");
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
          qty: Number(item.qty || 0)
        }))
      }))
    };

    setIsSubmitting(true);
    try {
      if (!demoMode) {
        const response = await fetch(APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) throw new Error(result?.error || "GAS request failed");
      }
      saveStoredBatch(payload);
      await new Promise((resolve) => setTimeout(resolve, 650));
      toast.success("บันทึกคำสั่งซื้อเรียบร้อยแล้ว");
      setSummaryOpen(false);
    } catch {
      toast.error("ส่งข้อมูลไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <OrderHeader branch={state.branch} onSizeOpen={() => setSizeOpen(true)} />
      <main className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 pb-6 pt-3 sm:px-6 lg:gap-5 lg:pb-12 lg:pt-5">
        {demoMode && <DemoBanner />}
        <OrderSetupCard state={state} dispatch={dispatch} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle icon={Users} title="รายชื่อพนักงาน" compact />
          <Field label="จำนวนพนักงาน">
            <div className="w-full sm:w-40">
              <TextInput value={employeeCount} onChange={(value) => {
                const nextCount = digitsOnly(value);
                setEmployeeCount(nextCount === "" ? "" : Math.max(1, Number(nextCount)));
              }} placeholder="ใส่จำนวน" inputMode="numeric" pattern="[0-9]*" />
            </div>
          </Field>
        </div>
        <EmployeeCards employees={state.employees} dispatch={dispatch} />
        <EmployeeTable employees={state.employees} dispatch={dispatch} />
        <button onClick={addEmployeeFromButton} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#8FA4C7] bg-white/80 font-black text-[#002B5B] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
          <UserPlus /> เพิ่มพนักงาน
        </button>
        <DesktopSubmit totalPieces={totalPieces} isSubmitting={isSubmitting} onSubmit={openSummary} />
      </main>
      <MobileSubmit totalPieces={totalPieces} isSubmitting={isSubmitting} onSubmit={openSummary} />
      <SizeReference open={sizeOpen} setOpen={setSizeOpen} />
      <OrderSummaryDialog open={summaryOpen} setOpen={setSummaryOpen} rows={summaryRows} totalPieces={totalPieces} isSubmitting={isSubmitting} onConfirm={submitOrder} />
    </>
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
      <main className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 pb-10 pt-3 sm:px-6 lg:gap-5 lg:pt-5">
        {demoMode && <DemoBanner />}
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
      toast.success("เข้าสู่ Dashboard สำเร็จ");
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
        <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">กรอกรหัสเพื่อดูข้อมูลสรุปคำสั่งซื้อ</p>
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
          <Shirt /> เปิดหน้า Order
        </button>
      </Card>
    </main>
  );
}

function ReactBitsAurora() {
  return <div className="reactbits-aurora" aria-hidden="true" />;
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-9 place-items-center rounded-xl bg-[#002B5B] text-white shadow-sm">
        <Shirt />
      </div>
      <div>
        <h1 className="text-lg font-black leading-none tracking-tight text-[#071638] sm:text-xl">GI-ShirtOrder</h1>
      </div>
    </div>
  );
}

function OrderHeader({ branch, onSizeOpen }) {
  return (
    <header className="relative z-10 border-b border-[#D8DEEA] bg-[#F7FAFF]/94 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <button onClick={onSizeOpen} className="flex min-h-9 items-center gap-1 rounded-xl bg-[#E5EFFD] px-3 text-sm font-bold text-[#002B5B]">
            <Gauge /> ตารางไซส์
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
            <Shirt /> เปิดหน้า Order
          </button>
          <span className="hidden min-h-9 items-center gap-1 rounded-xl bg-[#002B5B] px-3 text-sm font-bold text-white shadow-sm sm:flex">
            <LayoutDashboard /> Dashboard
          </span>
        </div>
      </div>
    </header>
  );
}

function DemoBanner() {
  return (
    <div className="rounded-xl border border-[#F6D88B] bg-[#FFF7DC] px-3 py-2 text-xs font-semibold text-[#7A5200] shadow-sm sm:text-sm">
      Demo Mode — กรุณาตั้งค่า Google Sheets URL เพื่อใช้งานจริง
    </div>
  );
}

function Card({ children, className, ...props }) {
  return (
    <section {...props} className={cn("shadcn-card reactbits-soft-border reactbits-fade-up rounded-3xl border border-[#DCE5F4] bg-white/92 p-5 shadow-sm backdrop-blur sm:p-6", className)}>
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, compact }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("grid place-items-center rounded-2xl bg-[#E9F1FF] text-[#002B5B]", compact ? "size-10" : "size-12")}>
        <Icon />
      </span>
      <h2 className={cn("font-black tracking-tight text-[#071638]", compact ? "text-xl" : "text-2xl")}>{title}</h2>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-black uppercase tracking-[.14em] text-[#44536A]">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, inputMode, type = "text", pattern, autoCapitalize, disabled = false }) {
  return (
    <input
      type={type}
      value={value}
      inputMode={inputMode}
      pattern={pattern}
      autoCapitalize={autoCapitalize}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-14 w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 text-[#071638] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF] disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
    />
  );
}

function Select({ value, values, onChange, placeholder = "เลือกไซส์", disabled = false }) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-14 w-full appearance-none rounded-2xl border border-[#CBD5E1] bg-white px-4 pr-11 text-[#071638] shadow-sm outline-none transition focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF] disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
      >
        {values.map((item, index) => <option key={`${item}-${index}`} value={item}>{item || placeholder}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
    </div>
  );
}

function OrderSetupCard({ state, dispatch }) {
  return (
    <Card>
      <SectionTitle icon={FileText} title="ข้อมูลการสั่งชุด" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)] lg:items-end">
        <Field label="ชื่อบริษัท">
          <TextInput value={state.companyName} onChange={(value) => dispatch({ type: "patchBatch", patch: { companyName: value } })} placeholder="ระบุชื่อบริษัท" />
        </Field>
        <Field label="สาขา">
          <Select value={state.branch} onChange={(value) => dispatch({ type: "patchBatch", patch: { branch: value } })} values={BRANCHES} />
        </Field>
        <Field label="ผู้ติดต่อ">
          <TextInput value={state.supervisorName} onChange={(value) => dispatch({ type: "patchBatch", patch: { supervisorName: value } })} placeholder="ระบุชื่อ-นามสกุล" />
        </Field>
        <Field label="เบอร์ติดต่อ">
          <TextInput value={state.supervisorPhone} onChange={(value) => dispatch({ type: "patchBatch", patch: { supervisorPhone: value } })} placeholder="08X-XXX-XXXX" inputMode="tel" />
        </Field>
      </div>
    </Card>
  );
}

function EmployeeCards({ employees, dispatch }) {
  function saveAndOpenNext(index) {
    const nextIndex = index + 1 < employees.length ? index + 1 : -1;
    const nextEmployee = employees[nextIndex];
    dispatch({ type: "saveAndOpenNext", nextIndex });
    if (nextEmployee) {
      window.setTimeout(() => {
        document.querySelector(`[data-employee-card="${nextEmployee.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  return (
    <div className="grid gap-4 lg:hidden">
      {employees.map((employee, index) => {
        const complete = isEmployeeComplete(employee);
        const hasNext = index + 1 < employees.length;
        return (
          <Card key={employee.id} className={cn("p-0 transition", employee.expanded && "ring-2 ring-[#002B5B]")} data-employee-card={employee.id}>
            <button onClick={() => dispatch({ type: "toggleExpand", id: employee.id })} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#E8F0FF] text-lg font-black text-[#002B5B]">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate font-black text-[#071638]">{employee.name || "ยังไม่ระบุชื่อ"}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">{employee.gender || "เลือกเพศ"}</p>
                </div>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-black", complete ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]")}>{complete ? "ครบ" : "ยังไม่ครบ"}</span>
            </button>
            {employee.expanded && (
              <div className="grid gap-5 border-t border-[#E2E8F0] p-4">
                <Field label="ชื่อ-นามสกุล">
                  <TextInput value={employee.name} onChange={(value) => dispatch({ type: "patchEmployee", id: employee.id, patch: { name: value } })} placeholder="ระบุชื่อพนักงาน" />
                </Field>
                <div className="grid grid-cols-[.85fr_1.15fr] gap-3">
                  <GenderChoices employee={employee} dispatch={dispatch} />
                  <GarmentChoices employee={employee} dispatch={dispatch} />
                </div>
                <ItemEditors employee={employee} dispatch={dispatch} />
                <div className={cn("grid gap-3", hasNext ? "grid-cols-[1fr_56px]" : "grid-cols-[56px] justify-end")}>
                  {hasNext && (
                    <button onClick={() => saveAndOpenNext(index)} disabled={!complete} className="reactbits-shine flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#002B5B] font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
                      <Check /> ถัดไป
                    </button>
                  )}
                  <button onClick={() => dispatch({ type: "delete", id: employee.id })} className="grid min-h-14 place-items-center rounded-2xl border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]">
                    <Trash2 />
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function GarmentChoices({ employee, dispatch }) {
  return (
    <Field label="เลือกประเภทชุด">
      <div className="grid gap-3">
        {CLOTHING_TYPES.map((type) => {
          const checked = employee.items.some((item) => item.type === type);
          return (
            <label key={type} className={cn("flex min-h-14 items-center gap-2 rounded-2xl border px-3 font-black transition", checked ? "border-[#002B5B] bg-[#E8F0FF] text-[#002B5B]" : "border-[#CBD5E1] bg-white text-[#071638]")}>
              <input type="checkbox" checked={checked} onChange={() => dispatch({ type: "toggleType", id: employee.id, itemType: type })} className="size-5 accent-[#002B5B]" />
              <span className="min-w-0 break-words leading-tight">{type}</span>
            </label>
          );
        })}
      </div>
    </Field>
  );
}

function GenderChoices({ employee, dispatch }) {
  return (
    <Field label="เพศ">
      <div className="grid gap-3">
        {GENDERS.map((gender) => (
          <button key={gender} onClick={() => dispatch({ type: "patchEmployee", id: employee.id, patch: { gender } })} className={cn("min-h-14 rounded-2xl border font-black transition", employee.gender === gender ? "border-[#002B5B] bg-[#002B5B] text-white shadow-md" : "border-[#CBD5E1] bg-white text-[#071638]")}>
            {gender}
          </button>
        ))}
      </div>
    </Field>
  );
}

function ItemEditors({ employee, dispatch }) {
  if (!employee.items.length) {
    return <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm font-semibold text-[#64748B]">เลือกประเภทชุดอย่างน้อย 1 รายการ</div>;
  }

  return (
    <div className="rounded-3xl bg-[#EDF4FF] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#002B5B]"><Shirt /> รายละเอียดชุด</div>
      <div className="grid gap-3">
        {CLOTHING_TYPES.map((type) => {
          const item = employee.items.find((item) => item.type === type);
          return (
            <div key={type} className="rounded-2xl bg-white p-3 shadow-sm">
              {item ? (
                <>
                  <div className="grid grid-cols-[1fr_110px] items-center gap-3">
                    <Select value={item.size} disabled={!employee.gender} placeholder={employee.gender ? "เลือกไซส์" : "เลือกเพศก่อน"} onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: patchSizeWithDefaultQty(item, value) })} values={employee.gender ? ["", ...getSizeOptions(item.type, employee.gender)] : [""]} />
                    <TextInput type="number" inputMode="numeric" value={item.qty} placeholder="จำนวน" onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { qty: digitsOnly(value) } })} />
                  </div>
                  {item.size === OTHER_SIZE && (
                    <div className="mt-3">
                      <TextInput value={item.customSize} onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { customSize: value } })} placeholder="ระบุไซส์เพิ่มเติม" />
                    </div>
                  )}
                </>
              ) : (
                <span className="block min-h-14" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeTable({ employees, dispatch }) {
  return (
    <Card className="hidden overflow-hidden p-0 lg:block">
      <div className="flex items-center justify-between border-b border-[#E7EAF0] p-6">
        <h2 className="text-2xl font-black text-[#071638]">รายการสั่งซื้อพนักงาน</h2>
        <div className="relative w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input className="min-h-12 w-full rounded-full border border-[#CBD5E1] bg-white pl-12 pr-4 outline-none focus:border-[#002B5B]" placeholder="ค้นหาชื่อพนักงาน" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-center text-sm">
          <thead className="bg-[#EEF4FF] text-xs uppercase tracking-[.16em] text-[#1F2937]">
            <tr>{["#", "ชื่อ", "เพศ", "ประเภทชุด", "ไซส์/จำนวน", "จัดการ"].map((header) => <th key={header} className="px-5 py-4 text-center">{header}</th>)}</tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => (
              <tr key={employee.id} className="border-b border-[#E7EAF0] align-top">
                <td className="px-5 py-6 text-center text-lg font-black">{index + 1}</td>
                <td className="px-5 py-6"><GridInput value={employee.name} placeholder="ระบุชื่อพนักงาน" onChange={(value) => dispatch({ type: "patchEmployee", id: employee.id, patch: { name: value } })} /></td>
                <td className="px-5 py-6"><GridSelect value={employee.gender} values={["", ...GENDERS]} placeholder="เลือกเพศ" onChange={(value) => dispatch({ type: "patchEmployee", id: employee.id, patch: { gender: value } })} /></td>
                <td className="px-5 py-6">
                  <DesktopGarmentChoices employee={employee} dispatch={dispatch} />
                </td>
                <td className="px-5 py-6">
                  <DesktopItemEditors employee={employee} dispatch={dispatch} />
                </td>
                <td className="px-5 py-6 text-center">
                  <button onClick={() => dispatch({ type: "delete", id: employee.id })} className="grid size-11 place-items-center rounded-2xl border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]">
                    <Trash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DesktopGarmentChoices({ employee, dispatch }) {
  return (
    <div className="mx-auto grid w-44 gap-2">
      {CLOTHING_TYPES.map((type) => {
        const checked = employee.items.some((item) => item.type === type);
        return (
          <label key={type} className={cn("flex min-h-12 items-center justify-start gap-3 rounded-xl border px-3 text-left font-bold transition", checked ? "border-[#002B5B] bg-[#E8F0FF] text-[#002B5B]" : "border-[#D8DEEA] bg-white text-[#071638]")}>
            <input type="checkbox" checked={checked} onChange={() => dispatch({ type: "toggleType", id: employee.id, itemType: type })} className="size-4 accent-[#002B5B]" />
            {type}
          </label>
        );
      })}
    </div>
  );
}

function DesktopItemEditors({ employee, dispatch }) {
  if (!employee.items.length) {
    return <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3 text-sm font-semibold text-[#64748B]">ติ๊กประเภทชุดทางซ้าย</div>;
  }

  return (
    <div className="mx-auto grid min-w-[280px] gap-2">
      {CLOTHING_TYPES.map((type) => {
        const item = employee.items.find((item) => item.type === type);
        return (
          <div key={type} className="grid min-h-12 grid-cols-[1fr_5.5rem] items-center gap-3">
            {item ? (
              <>
                <GridSelect value={item.size} disabled={!employee.gender} placeholder={employee.gender ? "เลือกไซส์" : "เลือกเพศก่อน"} values={employee.gender ? ["", ...getSizeOptions(item.type, employee.gender)] : [""]} onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: patchSizeWithDefaultQty(item, value) })} />
                <GridInput type="number" inputMode="numeric" value={item.qty} placeholder="จำนวน" onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { qty: digitsOnly(value) } })} />
                {item.size === OTHER_SIZE && <div className="col-span-2"><GridInput value={item.customSize} placeholder="ระบุไซส์เพิ่มเติม" onChange={(value) => dispatch({ type: "patchItem", id: employee.id, itemType: item.type, patch: { customSize: value } })} /></div>}
              </>
            ) : (
              <span className="col-span-2 min-h-12 rounded-xl border border-dashed border-transparent" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GridInput({ value, onChange, placeholder, type = "text", inputMode, pattern, autoCapitalize }) {
  return <input type={type} value={value} placeholder={placeholder} inputMode={inputMode} pattern={pattern} autoCapitalize={autoCapitalize} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#D8DEEA] bg-white px-3 text-[#071638] outline-none focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF]" />;
}

function GridSelect({ value, values, onChange, placeholder = "เลือกไซส์", disabled = false }) {
  return <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#D8DEEA] bg-white px-3 text-[#071638] outline-none focus:border-[#002B5B] focus:ring-4 focus:ring-[#DCE8FF] disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]">{values.map((item, index) => <option key={`${item}-${index}`} value={item}>{item || placeholder}</option>)}</select>;
}

function MobileSubmit({ totalPieces, isSubmitting, onSubmit }) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-6 sm:px-6 lg:hidden">
      <div className="grid grid-cols-[90px_1fr] gap-3 rounded-3xl border border-[#D8DEEA] bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex min-h-14 flex-col justify-center rounded-2xl bg-[#EEF4FF] px-3 text-[#002B5B]">
          <span className="text-xl font-black">{totalPieces}</span>
          <span className="text-xs font-bold">รายการ</span>
        </div>
        <button onClick={onSubmit} disabled={isSubmitting} className="reactbits-shine flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#002B5B] font-black text-white">
          {isSubmitting ? <Loader2 className="animate-spin" /> : <PackageCheck />} ยืนยันการสั่งชุด
        </button>
      </div>
    </div>
  );
}

function DesktopSubmit({ totalPieces, isSubmitting, onSubmit }) {
  return (
    <div className="hidden items-center justify-between rounded-3xl border border-[#D8DEEA] bg-white/95 p-4 shadow-sm backdrop-blur lg:flex">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#EEF4FF] text-xl font-black text-[#002B5B]">{totalPieces}</span>
        <div>
          <p className="font-black text-[#071638]">จำนวนรวม</p>
          <p className="text-sm font-semibold text-[#64748B]">ตรวจสอบรายการก่อนส่งคำสั่งซื้อ</p>
        </div>
      </div>
      <button onClick={onSubmit} disabled={isSubmitting} className="reactbits-shine flex min-h-14 min-w-72 items-center justify-center gap-2 rounded-2xl bg-[#002B5B] px-6 font-black text-white">
        {isSubmitting ? <Loader2 className="animate-spin" /> : <PackageCheck />} ยืนยันการสั่งชุด
      </button>
    </div>
  );
}

function OrderSummaryDialog({ open, setOpen, rows, totalPieces, isSubmitting, onConfirm }) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(46rem,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex items-center justify-between border-b border-[#E7EAF0] px-5 py-4">
            <Dialog.Title className="text-2xl font-black text-[#071638]">สรุปคำสั่งซื้อ</Dialog.Title>
            <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
          </div>
          <div className="max-h-[58vh] overflow-auto p-4">
            <div className="overflow-hidden rounded-2xl border border-[#D8DEEA]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#EEF4FF] text-xs font-black uppercase tracking-[.12em] text-[#44536A]">
                  <tr>
                    <th className="px-3 py-3">ชื่อ</th>
                    <th className="px-3 py-3">เสื้อ</th>
                    <th className="px-3 py-3">ไซส์</th>
                    <th className="px-3 py-3 text-right">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#E7EAF0]">
                      <td className="px-3 py-3 font-bold text-[#071638]">{row.name}</td>
                      <td className="px-3 py-3">{row.type}</td>
                      <td className="px-3 py-3">{row.size}</td>
                      <td className="px-3 py-3 text-right font-black">{row.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#EEF4FF] px-4 py-3 font-black text-[#002B5B]">
              <span>จำนวนทั้งหมด</span>
              <span>{totalPieces} ชิ้น</span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1.35fr] gap-3 border-t border-[#E7EAF0] p-4">
            <Dialog.Close className="min-h-13 rounded-2xl border border-[#CBD5E1] bg-white font-black text-[#071638]">
              กลับไปแก้ไข
            </Dialog.Close>
            <button onClick={onConfirm} disabled={isSubmitting || !rows.length} className="reactbits-shine flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#002B5B] font-black text-white disabled:opacity-60">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <PackageCheck />} ยืนยันส่งคำสั่งซื้อ
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SizeReference({ open, setOpen }) {
  const tabs = ["เสื้อโปโล ชาย", "เสื้อโปโล หญิง", "เสื้อช็อป", "กางเกงช็อป"];
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-4 bottom-4 top-4 z-50 flex flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(44rem,88vh)] sm:w-[min(34rem,82vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div className="flex items-center justify-between border-b border-[#E7EAF0] px-4 py-3">
            <Dialog.Title className="text-xl font-black text-[#071638]">ตารางไซส์</Dialog.Title>
            <Dialog.Close className="grid size-9 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
          </div>
          <Tabs.Root defaultValue={tabs[0]} className="flex min-h-0 flex-1 flex-col">
            <Tabs.List className="flex shrink-0 overflow-x-auto border-b border-[#E7EAF0] bg-[#F8FAFD]">
              {tabs.map((tab) => <Tabs.Trigger key={tab} value={tab} className="min-h-10 shrink-0 border-b-2 border-transparent px-3 text-xs font-black text-[#4B5565] data-[state=active]:border-[#002B5B] data-[state=active]:text-[#002B5B]">{tab}</Tabs.Trigger>)}
            </Tabs.List>
            <div className="min-h-0 flex-1 overflow-auto bg-[#FBFCFF] p-3">
              {tabs.map((tab) => (
                <Tabs.Content key={tab} value={tab}>
                  <div className="overflow-hidden rounded-xl border border-[#D8DEEA] bg-white shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F4F7FC] text-[#3A4250]">
                        <tr>
                          <th className="px-3 py-2">{tab === "กางเกงช็อป" ? "เอว" : "ไซส์ (Size)"}</th>
                          {tab !== "กางเกงช็อป" && <th className="px-3 py-2 text-right">รอบอก (นิ้ว)</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {SIZE_TABLES[tab].map(([size, measure]) => (
                          <tr key={size} className="border-t border-[#E7EAF0]">
                            <td className="px-3 py-2 text-base font-black text-[#071638]">{tab === "กางเกงช็อป" ? measure : size}</td>
                            {tab !== "กางเกงช็อป" && <td className="px-3 py-2 text-right text-base text-[#071638]">{measure}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Dashboard({ demoMode }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState("ทุกสาขา");
  const [statusFilter, setStatusFilter] = useState("ทุกสถานะ");
  const [query, setQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const storedBatches = readStoredBatches();
      if (!demoMode) {
        const response = await fetch(APPS_SCRIPT_URL);
        const result = await response.json();
        const data = Array.isArray(result) ? result : result?.data;
        const remoteBatches = Array.isArray(data) && data[0]?.orders ? data.map(normalizeBatch) : [];
        setBatches(remoteBatches.length ? remoteBatches : storedBatches);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setBatches(storedBatches.length ? storedBatches : mockBatches.map(normalizeBatch));
      }
    } catch {
      const storedBatches = readStoredBatches();
      setBatches(storedBatches.length ? storedBatches : mockBatches.map(normalizeBatch));
      toast.error("โหลดข้อมูลจาก Google Sheets ไม่สำเร็จ กำลังแสดงข้อมูลสำรอง");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [demoMode]);

  const filteredBatches = useMemo(() => batches.filter((batch) => {
    const inBranch = branchFilter === "ทุกสาขา" || batch.branch === branchFilter;
    const inStatus = statusFilter === "ทุกสถานะ" || batch.status === statusFilter;
    const searchText = [
        batch.batchId,
        batch.companyName,
        batch.branch,
      batch.supervisorName,
      batch.supervisorPhone,
      ...batch.orders.map((order) => order.name)
    ].join(" ").toLowerCase();
    const inQuery = !query || searchText.includes(query.toLowerCase());
    return inBranch && inStatus && inQuery;
  }), [batches, branchFilter, statusFilter, query]);

  const rows = useMemo(() => flattenBatches(filteredBatches), [filteredBatches]);
  const metrics = useMemo(() => buildDashboardMetrics(filteredBatches), [filteredBatches]);
  const summaryRows = useMemo(() => buildTotalSummary(rows), [rows]);
  const typeTotals = useMemo(() => buildTypeTotals(rows), [rows]);

  function updateBatchStatus(batchId, status) {
    setBatches((current) => {
      const next = current.map((batch) => batch.batchId === batchId ? { ...batch, status, statusUpdatedAt: new Date().toISOString() } : batch);
      saveStoredBatches(next);
      return next;
    });
    setSelectedBatch((current) => current?.batchId === batchId ? { ...current, status, statusUpdatedAt: new Date().toISOString() } : current);
  }

  function deleteBatch(batchId) {
    setBatches((current) => {
      const next = current.filter((batch) => batch.batchId !== batchId);
      saveStoredBatches(next);
      return next;
    });
    setSelectedBatch(null);
  }

  function clearFilters() {
    setBranchFilter("ทุกสาขา");
    setStatusFilter("ทุกสถานะ");
    setQuery("");
  }

  function exportCsv() {
    const header = ["BatchID", "สถานะ", "อัปเดตสถานะ", "วันที่", "ชื่อบริษัท", "สาขา", "ผู้ติดต่อ", "เบอร์ติดต่อ", "ชื่อพนักงาน", "เพศ", "ประเภท", "ไซส์", "จำนวน"];
    const batchById = new Map(filteredBatches.map((batch) => [batch.batchId, batch]));
    const csv = [header, ...rows.map((row) => {
      const batch = batchById.get(row.batchId);
      return [row.batchId, batch?.status || ORDER_STATUS_PENDING, batch?.statusUpdatedAt || "", row.submittedAt, row.companyName, row.branch, row.supervisorName, row.supervisorPhone, row.name, row.gender, row.type, row.size, row.qty];
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
      <section className="rounded-3xl border border-[#D8E3F5] bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#071638] sm:text-3xl">Dashboard</h2>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">ดูชุดคำสั่งซื้อและยอดรวมจากข้อมูลที่หน้า Order ส่งเข้ามา</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={loadData} className="flex min-h-10 items-center justify-center rounded-xl border border-[#BFD0EA] bg-white px-4 text-sm font-black text-[#002B5B]">Refresh</button>
            <button onClick={exportCsv} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#BFD0EA] bg-[#E5EFFD] px-4 text-sm font-black text-[#002B5B]">
              <Download /> Export CSV
            </button>
          </div>
        </div>
      </section>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[14rem_14rem_1fr_auto] lg:items-end">
          <Field label="สาขา"><Select value={branchFilter} onChange={setBranchFilter} values={["ทุกสาขา", ...BRANCHES]} /></Field>
          <Field label="สถานะ"><Select value={statusFilter} onChange={setStatusFilter} values={["ทุกสถานะ", ...ORDER_STATUSES]} /></Field>
          <Field label="ค้นหา"><TextInput value={query} onChange={setQuery} placeholder="ค้นหา BatchID บริษัท ผู้ติดต่อ เบอร์ หรือชื่อพนักงาน" /></Field>
          <button onClick={clearFilters} className="min-h-14 rounded-2xl border border-[#CBD5E1] bg-white px-5 font-black text-[#002B5B] shadow-sm">
            ล้างตัวกรอง
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={ClipboardList} value={metrics.pendingBatches} label="รอจัดส่ง" />
        <Stat icon={PackageCheck} value={metrics.deliveredBatches} label="จัดส่งแล้ว" />
      </div>

      <Tabs.Root defaultValue="orders" className="grid gap-4">
        <Tabs.List className="grid grid-cols-2 rounded-2xl border border-[#D8DEEA] bg-white p-1 shadow-sm">
          <Tabs.Trigger value="orders" className="min-h-12 rounded-xl text-sm font-black text-[#64748B] data-[state=active]:bg-[#002B5B] data-[state=active]:text-white">
            ชุดคำสั่งซื้อ ({filteredBatches.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="totals" className="min-h-12 rounded-xl text-sm font-black text-[#64748B] data-[state=active]:bg-[#002B5B] data-[state=active]:text-white">
            สรุปยอดรวม ({metrics.totalPieces} ชิ้น)
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="orders">
          {filteredBatches.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredBatches.map((batch) => (
                <DashboardOrderCard key={batch.batchId} batch={batch} onOpen={() => setSelectedBatch(batch)} onStatusChange={updateBatchStatus} onDelete={deleteBatch} />
              ))}
            </div>
          ) : (
            <EmptyDashboardState text="ยังไม่มีชุดคำสั่งซื้อตามเงื่อนไขที่เลือก" />
          )}
        </Tabs.Content>

        <Tabs.Content value="totals">
          <TotalSummaryView summaryRows={summaryRows} typeTotals={typeTotals} />
        </Tabs.Content>
      </Tabs.Root>

      <BatchDetailDialog batch={selectedBatch} onClose={() => setSelectedBatch(null)} onStatusChange={updateBatchStatus} onDelete={deleteBatch} />
    </>
  );
}

function DashboardOrderCard({ batch, onOpen, onStatusChange, onDelete }) {
  const totalPieces = getBatchPieces(batch);
  const totalEmployees = batch.orders.length;
  function confirmDelete() {
    if (window.confirm(`ลบชุดคำสั่งซื้อ ${batch.batchId}?`)) onDelete(batch.batchId);
  }

  return (
    <div className="rounded-3xl border border-[#D8DEEA] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#9EB7DD] hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#64748B]">{batch.batchId}</p>
          <h3 className="mt-2 text-xl font-black text-[#071638]">{batch.companyName || "ไม่ระบุบริษัท"}</h3>
          <p className="mt-1 text-sm font-black text-[#002B5B]">{batch.branch}</p>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">
            {new Date(batch.submittedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <StatusBadge status={batch.status} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniMetric label="บริษัท" value={batch.companyName || "-"} />
        <MiniMetric label="ผู้ติดต่อ" value={batch.supervisorName || "-"} />
        <MiniMetric label="พนักงาน" value={totalEmployees} />
        <MiniMetric label="จำนวน" value={`${totalPieces} ชิ้น`} />
      </div>
      <p className="mt-3 text-xs font-bold text-[#64748B]">อัปเดตสถานะ: {new Date(batch.statusUpdatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {buildTypeTotals(flattenBatches([batch])).map((row) => (
          <span key={row.type} className="rounded-full border border-[#D8DEEA] px-3 py-1 text-xs font-black text-[#44536A]">{row.type}: {row.qty}</span>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="สถานะ">
          <Select value={batch.status} values={ORDER_STATUSES} onChange={(status) => onStatusChange(batch.batchId, status)} />
        </Field>
        <button onClick={onOpen} className="min-h-14 rounded-2xl bg-[#002B5B] px-5 font-black text-white">
          ดูรายละเอียด
        </button>
        <button onClick={confirmDelete} className="min-h-14 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-5 font-black text-[#B91C1C]">
          ลบ
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const delivered = status === ORDER_STATUS_DELIVERED;
  return (
    <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-black", delivered ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]")}>
      {status}
    </span>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#F4F7FC] px-3 py-3">
      <p className="truncate text-xs font-bold text-[#64748B]">{label}</p>
      <p className="mt-1 truncate font-black text-[#071638]">{value}</p>
    </div>
  );
}

function TotalSummaryView({ summaryRows, typeTotals }) {
  const maxQty = Math.max(1, ...typeTotals.map((row) => row.qty));
  return (
    <div className="grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
      <Card>
        <h2 className="text-lg font-black text-[#071638]">ยอดรวมตามประเภทชุด</h2>
        <div className="mt-4 grid gap-3">
          {typeTotals.length ? typeTotals.map((row) => (
            <div key={row.type}>
              <div className="mb-2 flex items-center justify-between text-sm font-black">
                <span>{row.type}</span>
                <span>{row.qty} ชิ้น</span>
              </div>
              <div className="h-3 rounded-full bg-[#E5ECF7]">
                <div className="h-3 rounded-full bg-[#002B5B]" style={{ width: `${Math.max(8, (row.qty / maxQty) * 100)}%` }} />
              </div>
            </div>
          )) : <EmptyDashboardState text="ยังไม่มียอดรวม" compact />}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black text-[#071638]">ยอดรวมตามไซส์</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#E2E8F0]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#EEF4FF] text-xs font-black uppercase tracking-[.12em] text-[#44536A]">
              <tr>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">ไซส์</th>
                <th className="px-4 py-3 text-right">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.length ? summaryRows.map((row) => (
                <tr key={`${row.type}-${row.size}`} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-3 font-bold">{row.type}</td>
                  <td className="px-4 py-3">{row.size}</td>
                  <td className="px-4 py-3 text-right font-black">{row.qty}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center font-bold text-[#64748B]">ยังไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BatchDetailDialog({ batch, onClose, onStatusChange, onDelete }) {
  const rows = batch ? flattenBatches([batch]) : [];
  function confirmDelete() {
    if (batch && window.confirm(`ลบชุดคำสั่งซื้อ ${batch.batchId}?`)) onDelete(batch.batchId);
  }

  return (
    <Dialog.Root open={Boolean(batch)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 max-h-[88vh] overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(58rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2">
          {batch && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-[#E7EAF0] px-5 py-4">
                <div>
                  <Dialog.Title className="text-2xl font-black text-[#071638]">{batch.companyName || "ไม่ระบุบริษัท"}</Dialog.Title>
                  <p className="mt-1 text-sm font-black text-[#002B5B]">{batch.branch}</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748B]">{batch.batchId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={batch.status} />
                  <Dialog.Close className="grid size-10 place-items-center rounded-full text-[#1F2937] hover:bg-[#F1F5F9]" aria-label="ปิด"><X /></Dialog.Close>
                </div>
              </div>
              <div className="max-h-[64vh] overflow-auto p-4">
                <div className="mb-4 grid gap-3 sm:grid-cols-5">
                  <MiniMetric label="บริษัท" value={batch.companyName || "-"} />
                  <MiniMetric label="ผู้ติดต่อ" value={batch.supervisorName || "-"} />
                  <MiniMetric label="เบอร์ติดต่อ" value={batch.supervisorPhone || "-"} />
                  <MiniMetric label="จำนวนรวม" value={`${getBatchPieces(batch)} ชิ้น`} />
                  <div className="min-w-0 rounded-2xl bg-[#F4F7FC] px-3 py-3">
                    <p className="truncate text-xs font-bold text-[#64748B]">สถานะ</p>
                    <select value={batch.status} onChange={(event) => onStatusChange(batch.batchId, event.target.value)} className="mt-1 min-h-9 w-full rounded-xl border border-[#D8DEEA] bg-white px-2 text-sm font-black text-[#071638] outline-none focus:border-[#002B5B]">
                      {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
                <p className="mb-4 rounded-2xl bg-[#EEF4FF] px-4 py-3 text-sm font-bold text-[#002B5B]">
                  อัปเดตสถานะล่าสุด: {new Date(batch.statusUpdatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <div className="grid gap-3">
                  {batch.orders.map((order) => (
                    <div key={`${batch.batchId}-${order.name}`} className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
                      <div className="flex items-center justify-between bg-[#EEF4FF] px-4 py-3">
                        <div>
                          <p className="font-black text-[#071638]">{order.name}</p>
                          <p className="text-xs font-bold text-[#64748B]">{order.gender}</p>
                        </div>
                        <span className="text-sm font-black text-[#002B5B]">{order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)} ชิ้น</span>
                      </div>
                      <table className="w-full table-fixed text-left text-sm">
                        <thead className="text-xs font-black uppercase tracking-[.12em] text-[#44536A]">
                          <tr>
                            <th className="px-3 py-3 sm:px-4">ประเภท</th>
                            <th className="w-20 px-3 py-3 sm:w-24 sm:px-4">ไซส์</th>
                            <th className="w-20 px-3 py-3 text-right sm:w-24 sm:px-4">จำนวน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={`${order.name}-${item.type}-${item.size}`} className="border-t border-[#E2E8F0]">
                              <td className="break-words px-3 py-3 font-bold sm:px-4">{item.type}</td>
                              <td className="break-words px-3 py-3 sm:px-4">{item.size}</td>
                              <td className="px-3 py-3 text-right font-black sm:px-4">{item.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
                <button onClick={confirmDelete} className="mt-4 min-h-12 w-full rounded-2xl border border-[#FECACA] bg-[#FEF2F2] font-black text-[#B91C1C]">
                  ลบชุดคำสั่งซื้อนี้
                </button>
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
    <div className={cn("rounded-3xl border border-dashed border-[#CBD5E1] bg-white/70 text-center font-bold text-[#64748B]", compact ? "p-4" : "p-10")}>
      {text}
    </div>
  );
}

function getBatchPieces(batch) {
  return flattenBatches([batch]).reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function buildTypeTotals(rows) {
  return CLOTHING_TYPES.map((type) => ({
    type,
    qty: rows.filter((row) => row.type === type).reduce((sum, row) => sum + Number(row.qty || 0), 0)
  })).filter((row) => row.qty > 0);
}

function buildTotalSummary(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row.type}__${row.size}`;
    const current = map.get(key) || { type: row.type, size: row.size, qty: 0 };
    current.qty += Number(row.qty || 0);
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.type.localeCompare(b.type, "th") || String(a.size).localeCompare(String(b.size), "th", { numeric: true }));
}

function buildDashboardMetrics(batches) {
  const rows = flattenBatches(batches);
  return {
    totalBatches: batches.length,
    totalEmployees: batches.reduce((sum, batch) => sum + batch.orders.length, 0),
    totalPieces: rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
    pendingBatches: batches.filter((batch) => batch.status !== ORDER_STATUS_DELIVERED).length,
    deliveredBatches: batches.filter((batch) => batch.status === ORDER_STATUS_DELIVERED).length
  };
}

function Stat({ icon: Icon, value, label }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="grid size-10 place-items-center rounded-2xl bg-[#EEF4FF] text-[#002B5B]"><Icon /></div>
      <p className="mt-4 text-3xl font-black text-[#071638]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#64748B]">{label}</p>
    </Card>
  );
}

function SkeletonDashboard() {
  return (
    <div className="relative z-10 mx-auto grid w-full max-w-[1240px] gap-4 px-4 py-6 sm:px-6">
      {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/80" />)}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
