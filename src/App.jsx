import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { Toaster, toast } from 'sonner';
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Download,
  Eraser,
  BookOpen,
  LayoutDashboard,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  Ruler,
  Search,
  Send,
  Settings2,
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
  Building2,
  Edit3,
} from 'lucide-react';
import { cn, digitsOnly } from './lib/utils';
import {
  readClothingConfig,
  saveClothingConfig,
  loadSharedClothingConfig,
  publishSharedClothingConfig,
  CLOTHING_CONFIG_UPDATED_AT_KEY,
  getClothingTypes,
  getSizeOptions,
  getSizeOptionsWithLabels,
  patchSizeWithDefaultQty,
  GENDERS,
  OTHER_SIZE,
} from './lib/config';
import {
  EMPLOYEE_TABLE_COLUMNS,
  ORDER_TABLE_COLUMNS,
  getDefaultColumnIds,
  readDashboardTableColumns,
  writeDashboardTableColumns,
} from './lib/dashboardTableColumns';
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
  BranchManager,
  DashboardOverview,
  EmployeeMasterPanel,
  InventoryManager,
  getEmployeeMasterKey,
  normalizeEmployeeMaster,
} from './components';
import {
  getAdminToken,
  setAdminToken,
  isAuthFailure,
  authFetch,
} from './lib/api';
import {
  phoneDigitsOnly,
  formatPhone,
  genderSymbol,
  formatDashboardDate,
  PHONE_LENGTH,
  formatMonthLabel,
  formatMonthInputValue,
  getMonthKey,
  getMonthKeyFromInput,
  csvCell,
  buildCsvFilename,
  uniqueSorted,
} from './lib/utils';
import {
  applyStockMovement,
  getStockLedgerSummary,
  findStockIssuesForStatusChange,
  adjustStockForStatusChange,
  getClothingStockRows,
  setClothingStockRows,
} from './lib/stockHelpers';
import {
  TOAST_DURATION_MS,
  TOAST_VISIBLE_COUNT,
  TOAST_GAP_PX,
} from './lib/magicNumbers';
import {
  DashboardDataNotice,
  DashboardPageSkeleton,
  MiniMetric,
  MobileInfo,
  SkeletonDashboard,
  StatusBadge,
} from './components/DashboardCommon';
import {
  ORDER_STATUS_CANCELED,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PENDING,
  ORDER_STATUSES,
  buildOrderSummaryRows,
  canDeleteEmployee,
  createInitialOrderState,
  flattenBatches,
  getEmployeeMissingFields,
  hasEmployeeData,
  isEmployeeComplete,
  normalizeBatch,
  normalizeOrderStatus,
  orderReducer,
} from './lib/orderState';
import { loadBranchesWithFallback } from './lib/branches';
import { BRANCHES } from './constants/branches';
import './index.css';

const DASHBOARD_PATH = '#/dashboard';
const ORDER_PATH = '/';

function getDashboardLoadErrorDescription(error) {
  const message = String(error?.message || '');
  if (message.includes('not configured') || message.includes('YOUR_SCRIPT_URL')) {
    return 'ยังไม่ได้ตั้งค่า VITE_GAS_URL หรือ GAS_ADMIN_TOKEN สำหรับอ่านข้อมูลจริงจาก Google Sheets';
  }
  if (message.includes('Invalid dashboard data') || message.includes('รูปแบบข้อมูลแดชบอร์ด')) {
    return 'รูปแบบข้อมูลจาก Google Sheets ไม่ตรงกับที่ระบบต้องการ กรุณาตรวจ Apps Script';
  }
  if (message.includes('Timeout')) {
    return 'การเชื่อมต่อ Google Sheets หมดเวลา กรุณาลองโหลดใหม่อีกครั้ง';
  }
  if (message && !/[A-Za-z]{3,}/.test(message)) {
    return message;
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
  const gasConfigured = true;

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

  const [branches, setBranches] = useState(BRANCHES);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function refresh() {
      setBranchesLoading(true);
      const loadedBranches = await loadBranchesWithFallback();
      if (!active) return;
      setBranches(loadedBranches);
      setBranchesLoading(false);
    }

    refresh();
    return () => {
      active = false;
    };
  }, []);

  const isDashboard = path === '/dashboard';

  return (
    <div className="app-shadcn-theme min-h-screen w-full overflow-x-hidden bg-[#FAFAFA] text-[#09090B]">
      {isDashboard ? (
        <DashboardApp
          key={`dashboard-${configVersion}`}
          onOpenOrder={() => navigate(ORDER_PATH)}
          branches={branches}
          refreshBranches={async () => {
            const loadedBranches = await loadBranchesWithFallback();
            setBranches(loadedBranches);
          }}
        />
      ) : (
        <QuickOrderApp
          key={`order-${configVersion}`}
          gasConfigured={gasConfigured}
          branches={branches}
          branchesLoading={branchesLoading}
          onOpenDashboard={() => navigate(DASHBOARD_PATH)}
        />
      )}
      <Toaster
        richColors
        closeButton
        visibleToasts={TOAST_VISIBLE_COUNT}
        gap={TOAST_GAP_PX}
        position="bottom-right"
        toastOptions={{
          duration: TOAST_DURATION_MS,
          classNames: {
            toast: 'gi-toast text-sm font-semibold',
            title: 'gi-toast-title font-extrabold',
            description: 'gi-toast-description font-semibold',
          },
        }}
      />
    </div>
  );
}

function QuickOrderApp({ gasConfigured, onOpenDashboard, branches = BRANCHES, branchesLoading = false }) {
  const effectiveBranches = Array.isArray(branches) && branches.length ? branches : BRANCHES;
  const [sizeOpen, setSizeOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
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
  const [, setCsvErrors] = useState([]);

  function handleEdit(id, mode = 'full') {
    setEditMode(mode);
    setMobileEmployeeId(id);
  }

  const [state, dispatch] = useReducer(orderReducer, effectiveBranches[0], createInitialOrderState);
  const clothingTypes = getClothingTypes();

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
  const selectedMobileEmployee =
    state.employees.find((employee) => employee.id === mobileEmployeeId) || null;

  useEffect(() => {
    if (activeTab === 'copy') {
      setActiveTab('table');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!branchesLoading && branches.length && !branches.includes(state.branch)) {
      dispatch({ type: 'patchBatch', patch: { branch: branches[0] } });
    }
  }, [branches, branchesLoading, state.branch]);

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

  function jumpToEmployee(employeeRowId) {
    setInvalidEmployeeId(employeeRowId);
    if (window.innerWidth < 1024) {
      setEditingCardId(employeeRowId);
    }
    window.setTimeout(() => {
      const target = document.querySelector(
        `[data-quick-employee-row="${employeeRowId}"], [data-quick-employee-card="${employeeRowId}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const employee = state.employees.find((emp) => emp.id === employeeRowId);
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
      const submitOrderRequest = async (data, attempts = 2, timeoutMs = 15000) => {
        let lastErr = null;
        for (let i = 0; i < attempts; i++) {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const res = await fetch('/api/order/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json;charset=utf-8' },
              body: JSON.stringify(data),
              signal: controller.signal,
            });
            clearTimeout(id);
            const json = await res.json().catch(() => null);
            if (!res.ok || json?.success === false) throw new Error(json?.error || 'บันทึกคำสั่งเบิกไม่สำเร็จ');
            return json;
          } catch (err) {
            lastErr = err;
            // small backoff before retry
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        }
        throw lastErr;
      };

      await submitOrderRequest(payload);
      toast.success('บันทึกคำสั่งเบิกเสื้อแล้ว', { id: loadingToastId });
      setSuccessData(payload); // Save success data for the Success Screen
      setQuery('');
      setShowIncompleteOnly(false);
      setMobileEmployeeId('');
      setEditingCardId('');
    } catch (error) {
      toast.error('ไม่สามารถส่งคำขอเบิกได้', {
        id: loadingToastId,
        description:
          error?.message && !/[A-Za-z]{3,}/.test(error.message)
            ? error.message
            : 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
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
        items: garmentType ? [{ type: garmentType, size, qty, customSize: '' }] : [],
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
        <main className="relative z-10 mx-auto grid w-full gi-container gap-4 pb-40 pt-3">
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
              <QuickOrderSetupPanel state={state} dispatch={dispatch} forceExpand={true} branches={effectiveBranches} />
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
        onNext={(employeeRowId) => handleEdit(employeeRowId, editMode)}
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

function QuickOrderSetupPanel({ state, dispatch, forceExpand = false, branches = BRANCHES }) {
  const effectiveBranches = Array.isArray(branches) && branches.length ? branches : BRANCHES;
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
              values={effectiveBranches}
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
        ...employee.items.map((item) => `${item.type} ${item.size} ${item.customSize}`),
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
  const sizeOptions = getSizeOptionsWithLabels(type, employee.gender);

  if (!item) {
    return (
      <div className="flex h-11 items-center">
        <button
          onClick={() => dispatch({ type: 'toggleType', id: employee.id, itemType: type })}
          disabled={!employee.gender}
          aria-label={`เพิ่ม ${type}`}
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 text-xs font-bold transition',
            !employee.gender
              ? 'border-[#D8DEEA] bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed'
              : 'border-[#A9B9D1] bg-white text-[#002B5B] hover:bg-[#F4F8FF]'
          )}
        >
          {employee.gender ? (
            <>
              <Plus className="size-3.5" />
              <span className="truncate">เพิ่ม {type}</span>
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
          (!item.size || Number(item.qty || 0) <= 0)
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

function GarmentItemsPicker({ employee, clothingTypes, dispatch, invalidEmployeeId }) {
  const selectedTypes = employee.items.map((item) => item.type);
  const availableTypes = clothingTypes.filter((type) => !selectedTypes.includes(type));
  const hasAvailableTypes = availableTypes.length > 0;

  return (
    <div className="grid gap-2">
      {employee.items.length ? (
        employee.items.map((item) => (
          <QuickGarmentCellInline
            key={item.type}
            employee={employee}
            type={item.type}
            dispatch={dispatch}
            invalidEmployeeId={invalidEmployeeId}
          />
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-[#D8DEEA] bg-[#F8FAFC] px-3 py-2 text-center text-xs font-bold text-[#94A3B8]">
          ยังไม่ได้เลือกแบบเสื้อ
        </div>
      )}

      <div className="grid gap-2 rounded-lg border border-dashed border-[#A9B9D1] bg-white p-2">
        <div className="flex items-center justify-between gap-2 text-xs font-black text-[#002B5B]">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Plus className="size-3.5 shrink-0" />
            <span className="truncate">เพิ่มรายการเสื้อ</span>
          </span>
          <span className="shrink-0 text-[11px] font-bold text-[#64748B]">
            {hasAvailableTypes ? `เหลือ ${availableTypes.length} แบบ` : 'เลือกครบแล้ว'}
          </span>
        </div>
        <Select
          value=""
          values={availableTypes}
          disabled={!employee.gender || !hasAvailableTypes}
          placeholder={
            !employee.gender
              ? 'เลือกเพศก่อน'
              : hasAvailableTypes
                ? 'เพิ่มแบบเสื้อ'
                : 'เลือกแบบเสื้อครบแล้ว'
          }
          compact
          onChange={(type) => {
            if (!type) return;
            dispatch({ type: 'toggleType', id: employee.id, itemType: type });
          }}
        />
      </div>
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
        return (
          <article
            key={employee.id}
            data-quick-employee-card={employee.id}
            className={cn(
              'rounded-xl border border-[#D8DEEA] bg-white p-3 text-left shadow-xs transition',
              invalidEmployeeId === employee.id &&
                'employee-attention border-[#EF4444] bg-[#FFF7F7]'
            )}
          >
            <div className="grid gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#071638]">
                    ลำดับที่ {index + 1}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-[#64748B]">
                    {employee.items.length || 0} แบบ · {pieces} ชิ้น
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-extrabold',
                      complete ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                    )}
                  >
                    {complete ? 'ครบ' : 'ยังไม่ครบ'}
                  </span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'cloneEmployee', id: employee.id })}
                    className="grid size-8 place-items-center rounded-lg border border-[#CBD5E1] bg-white text-[#44536A] transition hover:bg-neutral-50"
                    aria-label={`คัดลอกพนักงานลำดับที่ ${index + 1}`}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => dispatch({ type: 'delete', id: employee.id })}
                    className="grid size-8 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] transition hover:bg-[#FFE2E2] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`ลบพนักงานลำดับที่ ${index + 1}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_6.75rem] gap-2">
                <TextInput
                  value={employee.name}
                  invalid={showErrors && !employee.name.trim()}
                  onChange={(value) =>
                    dispatch({ type: 'patchEmployee', id: employee.id, patch: { name: value } })
                  }
                  placeholder="ชื่อ-นามสกุล"
                  title="ชื่อ-นามสกุล"
                />
                <div className="grid grid-cols-2 gap-1">
                  {GENDERS.map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() =>
                        dispatch({ type: 'patchEmployee', id: employee.id, patch: { gender } })
                      }
                      className={cn(
                        'h-11 rounded-lg border text-xs font-black transition active:scale-95',
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
              </div>

              <div className="grid gap-2 rounded-lg border border-[#E7EAF0] bg-[#F8FAFC] p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-[#64748B]">เสื้อที่เบิก *</p>
                  {showErrors && !employee.items.length && (
                    <span className="text-[11px] font-bold text-[#B91C1C]">เลือกอย่างน้อย 1 รายการ</span>
                  )}
                </div>
                <GarmentItemsPicker
                  employee={employee}
                  clothingTypes={clothingTypes}
                  dispatch={dispatch}
                  invalidEmployeeId={invalidEmployeeId}
                />
              </div>
            </div>
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
function DashboardApp({ onOpenOrder, branches = BRANCHES, refreshBranches }) {
  const effectiveBranches = Array.isArray(branches) && branches.length ? branches : BRANCHES;
  const [adminToken, setDashboardToken] = useState(getAdminToken);
  const [dashboardView, setDashboardView] = useState('dashboard');
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
      <main className="relative z-10 mx-auto flex w-full gi-container flex-col gap-3 pb-10 pt-3 lg:gap-4">
        <Dashboard
          activeView={dashboardView}
          branches={effectiveBranches}
          refreshBranches={refreshBranches}
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
      if (!response.ok || !data?.token) throw new Error(data?.error || 'รหัสเข้าแดชบอร์ดไม่ถูกต้อง');
      setError('');
      onUnlock(data.token);
    } catch (error) {
      setError(error?.message || 'รหัสไม่ถูกต้อง หรือระบบยืนยันสิทธิ์ไม่พร้อม');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto grid min-h-[100dvh] w-full place-items-center px-4 py-10">
      <Card className="w-full max-w-[34rem] p-6 sm:p-8">
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
              id="dashboard-passcode"
              value={passcode}
              onChange={setPasscode}
              placeholder="กรอกรหัส"
              inputMode="numeric"
              type="password"
              autoFocus
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

function ColumnSettingsDialog({
  open,
  title,
  columns,
  visibleColumns,
  onChange,
  onClose,
}) {
  const visibleSet = new Set(visibleColumns);
  const allColumnIds = getDefaultColumnIds(columns);

  function setColumnVisible(columnId, checked) {
    const next = checked
      ? [...new Set([...visibleColumns, columnId])]
      : visibleColumns.filter((id) => id !== columnId);
    onChange(next.length ? next : [columnId]);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="gi-overlay fixed inset-0 z-[70] bg-[#0F172A]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[71] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl"
        >
          <Dialog.Title className="text-lg font-extrabold text-[#071638]">{title}</Dialog.Title>
          <div className="mt-4 grid gap-2">
            {columns.map((column) => (
              <label key={column.id} className="table-column-option">
                <input
                  type="checkbox"
                  checked={visibleSet.has(column.id)}
                  onChange={(event) => setColumnVisible(column.id, event.target.checked)}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button type="button" className="dashboard-action-btn" onClick={() => onChange(allColumnIds)}>
              เลือกทั้งหมด
            </button>
            <button type="button" className="dashboard-action-btn" onClick={() => onChange(allColumnIds)}>
              รีเซ็ต
            </button>
            <button type="button" className="dashboard-primary-action" onClick={onClose}>
              เสร็จสิ้น
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
              <p>สำหรับคนขอเบิก ใช้กรอกข้อมูลให้ครบ ตรวจรายการ และส่งคำขอเบิกเข้าระบบ</p>
            </div>
            <Dialog.Close className="manual-close-button" aria-label="ปิด">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="manual-dialog-body">
            <ManualSection icon={UserCheck} title="คนขอเบิก: ข้อมูลผู้ขอและที่จัดส่ง">
              <ManualList
                items={[
                  'กรอกชื่อบริษัทหรือหน่วยงาน เลือกสาขาที่จัดส่ง ระบุชื่อผู้ติดต่อ และเบอร์ติดต่อให้ครบ',
                  'ระบบจะตรวจรูปแบบเบอร์โทรศัพท์และจัดรูปแบบให้อ่านง่ายโดยอัตโนมัติ',
                  'เมื่อข้อมูลครบแล้วจึงไปขั้นตอนรายการเสื้อพนักงานได้',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Users} title="คนขอเบิก: รายชื่อพนักงานและเสื้อที่เบิก">
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

            <ManualSection icon={ClipboardList} title="คนขอเบิก: ตรวจสอบและส่งคำขอ">
              <ManualList
                items={[
                  'ตรวจชื่อพนักงาน เพศ แบบเสื้อ ไซส์ และจำนวนให้ถูกต้องก่อนส่ง',
                  'ระบบสรุปจำนวนแยกตามแบบเสื้อและไซส์เพื่อให้ตรวจง่าย',
                  'เมื่อส่งสำเร็จ ระบบจะสร้างรหัสคำสั่งเบิกสำหรับติดตามงาน',
                  'คนขอเบิกจะไม่เห็นยอดสต๊อกคงเหลือ ระบบจะตรวจสต๊อกให้ก่อนส่งคำขอ',
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
                <PackageSearch className="size-5" /> คู่มือแดชบอร์ดและสต๊อก
              </Dialog.Title>
              <p>สำหรับคนดูแดชบอร์ด คนคุมระบบ และคนจัดการสต๊อก ใช้ตรวจงานและอัปเดตข้อมูลจริง</p>
            </div>
            <Dialog.Close className="manual-close-button" aria-label="ปิด">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="manual-dialog-body">
            <ManualSection icon={ClipboardList} title="คนดูแดชบอร์ด: รายการเบิก">
              <ManualList
                items={[
                  'ใช้ดูคำสั่งเบิกทั้งหมด ค้นหาตามรหัสคำสั่ง บริษัท ผู้ติดต่อ เบอร์โทร หรือชื่อพนักงาน',
                  'กรองตามสาขา เดือน และสถานะ เพื่อจัดลำดับงานที่ต้องดำเนินการ',
                  'กดรายการเพื่อดูรายละเอียดพนักงานและเสื้อที่เบิกในคำสั่งนั้น',
                  'ใช้สถานะ 3 ค่า: รอจัดส่ง, จัดส่งแล้ว และ ยกเลิก',
                  'เปลี่ยนเป็นจัดส่งแล้วเมื่อจ่ายของจริง ระบบจะตัดสต๊อกและเพิ่มยอดเบิกแล้วให้เอง',
                  'ใช้ยกเลิกเมื่อพนักงานลาออกหรือไม่ต้องรับเสื้อแล้ว โดยข้อมูลยังอยู่ในประวัติ',
                  'ถ้าสต๊อกไม่พอ ระบบจะแจ้งรายการที่ขาดและไม่ให้จัดส่งจนกว่าจะเติมสต๊อก',
                ]}
              />
            </ManualSection>

            <ManualSection icon={BarChart3} title="คนคุมระบบ: ภาพรวม">
              <ManualList
                items={[
                  'ดูจำนวนคำสั่งเบิกทั้งหมด งานรอจัดส่ง งานที่จัดส่งแล้ว และรายการยกเลิก',
                  'ส่วนสรุปสต๊อกเสื้อแสดงจำนวนที่เคยมี เบิกแล้ว และคงเหลือ แยกตามแบบเสื้อ เพศ และไซส์',
                  'ใช้ส่วนนี้ตรวจแนวโน้มการใช้เสื้อ และดูว่าสต๊อกแบบไหนลดเร็วหรือควรเติมก่อน',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Users} title="คนคุมระบบ: ข้อมูลพนักงาน">
              <ManualList
                items={[
                  'ใช้เพิ่มและแก้ไขฐานพนักงานจริง โดยต้องมีชื่อ เพศ และสาขา',
                  'ค้นหาพนักงานได้จากชื่อ เพศ หรือสาขา',
                  'ใช้ปิดใช้งานเมื่อพนักงานลาออกหรือไม่ต้องใช้ในระบบแล้ว โดยไม่ลบประวัติเดิม',
                  'ส่วนประวัติรายการเบิกด้านล่างดึงจากคำสั่งเบิก เพื่อดูว่าพนักงานเคยเบิกแบบเสื้อ/ไซส์ใดบ้าง',
                ]}
              />
            </ManualSection>

            <ManualSection icon={PackageSearch} title="คนจัดการสต๊อก: แบบเสื้อและสต๊อก">
              <ManualList
                items={[
                  'แท็บข้อมูลเสื้อใช้แก้ชื่อแบบเสื้อ รูปภาพ และรายละเอียดไซส์ เช่น อก เอว หรือรายละเอียดอื่น',
                  'รายละเอียดไซส์แยกตามเพศ เพิ่ม แก้ หรือลบหัวข้อได้ ข้อมูลนี้จะแสดงให้คนขอเบิกเห็น',
                  'แท็บสต๊อกตามไซส์ใช้แก้เฉพาะจำนวนคงเหลือ เพื่อแยกงานคลังออกจากข้อมูลเสื้อ',
                  'ใส่เลขบวก เช่น 20 แล้วกดเพิ่ม เพื่อบันทึกรับสต๊อกเข้า',
                  'ใส่เลขลบ เช่น -2 แล้วกดเพิ่ม เพื่อปรับลดกรณีกรอกผิดหรือตัดยอดแก้ไข',
                  'ไม่แก้เลขคงเหลือในชีทโดยตรง ให้แก้ผ่านระบบเพื่อเก็บประวัติยอดตั้งต้น เพิ่มเข้า ปรับลด เบิกแล้ว และคงเหลือ',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Building2} title="คนคุมระบบ: จัดการสาขา">
              <ManualList
                items={[
                  'ใช้เพิ่มหรือลบรายชื่อสาขาที่แสดงในฟอร์มเบิกและตัวกรองแดชบอร์ด',
                  'ควรใช้ชื่อสาขาให้ตรงกันทุกครั้ง เพื่อให้รายงานสรุปตามสาขาไม่แยกเป็นหลายชื่อ',
                  'หลังบันทึกสาขา ระบบจะโหลดรายชื่อสาขาใหม่ให้หน้าเบิกและหน้าแดชบอร์ดใช้งานต่อ',
                ]}
              />
            </ManualSection>

            <ManualSection icon={Download} title="การส่งออกและ Google Sheet">
              <ManualList
                items={[
                  'ปุ่มส่งออก CSV ใช้ดาวน์โหลดข้อมูลคำสั่งเบิกตามตัวกรองที่เลือก',
                  'ชีท Orders เก็บข้อมูลคำสั่งเบิกและสถานะ',
                  'ชีท Employees เก็บข้อมูลพนักงานจริง ได้แก่ ชื่อ เพศ สาขา และสถานะใช้งาน',
                  'ชีท Stock สร้างและอัปเดตจากระบบโดยอัตโนมัติ แสดงยอดตั้งต้น เพิ่มเข้า ปรับลด เบิกแล้ว สต๊อกทั้งหมด และคงเหลือ',
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

function Dashboard({ activeView = 'orders', branches = BRANCHES, refreshBranches, onAuthExpired, onViewChange }) {
  const effectiveBranches = Array.isArray(branches) && branches.length ? branches : BRANCHES;
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState('');
  const [statusLoadingId, setStatusLoadingId] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState('');
  const [clothingConfig, setClothingConfig] = useState(readClothingConfig);
  const [isWideScreen, setIsWideScreen] = useState(() => window.innerWidth >= 1200);
  const [expandedBatchIds, setExpandedBatchIds] = useState(new Set());
  const [branchFilter, setBranchFilter] = useState('ทุกสาขา');
  const [statusFilter, setStatusFilter] = useState('ทุกสถานะ');
  const [query, setQuery] = useState('');
  const [employeeMasterRows, setEmployeeMasterRows] = useState([]);
  const [employeeMasterLoading, setEmployeeMasterLoading] = useState(false);
  const [employeeMasterSaving, setEmployeeMasterSaving] = useState(false);
  const [employeeMasterSearch, setEmployeeMasterSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState(() => formatMonthLabel(new Date()));
  const [exportBranchFilter, setExportBranchFilter] = useState('ทุกสาขา');
  const [exportStartMonth, setExportStartMonth] = useState(() => formatMonthInputValue(new Date()));
  const [exportEndMonth, setExportEndMonth] = useState(() => formatMonthInputValue(new Date()));
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [deleteConfirmBatchId, setDeleteConfirmBatchId] = useState('');
  const [exportExpanded, setExportExpanded] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [columnSettingsTable, setColumnSettingsTable] = useState('');
  const [visibleOrderColumns, setVisibleOrderColumns] = useState(() =>
    readDashboardTableColumns('orders', ORDER_TABLE_COLUMNS)
  );
  const [visibleEmployeeColumns, setVisibleEmployeeColumns] = useState(() =>
    readDashboardTableColumns('employees', EMPLOYEE_TABLE_COLUMNS)
  );
  const [orderPage, setOrderPage] = useState(1);
  const [employeePage, setEmployeePage] = useState(1);
  const [pagingLoading, setPagingLoading] = useState({ orders: false, employees: false });
  const pagingTimersRef = useRef({});

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
        throw new Error(result?.error || 'โหลดข้อมูลจาก Google Sheets ไม่สำเร็จ');
      const data = Array.isArray(result) ? result : result?.data;
      if (!Array.isArray(data)) throw new Error('รูปแบบข้อมูลแดชบอร์ดไม่ถูกต้อง');
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
    }
  }

  async function loadEmployeeMaster({ silent = false } = {}) {
    setEmployeeMasterLoading(true);
    try {
      const response = await authFetch('/api/dashboard/employees', { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'โหลดข้อมูลพนักงานไม่สำเร็จ');
      }
      const data = Array.isArray(result) ? result : result?.data || result?.employees;
      setEmployeeMasterRows((Array.isArray(data) ? data : []).map(normalizeEmployeeMaster));
      if (silent) toast.success('โหลดข้อมูลพนักงานแล้ว');
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
          description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
        });
        return;
      }
      toast.error('โหลดข้อมูลพนักงานไม่สำเร็จ', {
        description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setEmployeeMasterLoading(false);
    }
  }

  async function saveEmployeeMaster(employee, previousEmployeeKey = '') {
    if (!employee.name || !employee.gender || !employee.branch) {
      toast.error('กรุณากรอกข้อมูลพนักงานให้ครบ', {
        description: 'ต้องมีชื่อ เพศ และสาขา',
      });
      return false;
    }
    setEmployeeMasterSaving(true);
    try {
      const response = await authFetch('/api/dashboard/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsertEmployee', employee, previousEmployeeKey }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'บันทึกข้อมูลพนักงานไม่สำเร็จ');
      }
      const savedEmployee = normalizeEmployeeMaster(result.employee || result.data || employee);
      setEmployeeMasterRows((current) => {
        const targetKey = previousEmployeeKey || savedEmployee.employeeKey;
        const exists = current.some((item) => item.employeeKey === targetKey);
        const nextRows = exists
          ? current.map((item) => (item.employeeKey === targetKey ? savedEmployee : item))
          : [...current, savedEmployee];
        return nextRows.sort(
          (a, b) =>
            a.branch.localeCompare(b.branch, 'th', { numeric: true }) ||
            a.name.localeCompare(b.name, 'th', { numeric: true })
        );
      });
      toast.success('บันทึกข้อมูลพนักงานแล้ว');
      return true;
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ');
        return false;
      }
      toast.error('บันทึกข้อมูลพนักงานไม่สำเร็จ', {
        description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
      });
      return false;
    } finally {
      setEmployeeMasterSaving(false);
    }
  }

  async function deactivateEmployeeMaster(employee) {
    const target = normalizeEmployeeMaster(employee);
    const employeeKey = target.employeeKey || getEmployeeMasterKey(target);
    if (!window.confirm(`ปิดใช้งานพนักงาน ${target.name} (${target.branch}) หรือไม่?`)) return;
    setEmployeeMasterSaving(true);
    try {
      const response = await authFetch('/api/dashboard/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteEmployee', employeeKey }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'ปิดใช้งานพนักงานไม่สำเร็จ');
      }
      const savedEmployee = normalizeEmployeeMaster(result.employee || result.data || { ...target, active: false });
      setEmployeeMasterRows((current) =>
        current.map((item) =>
          item.employeeKey === employeeKey ? { ...item, ...savedEmployee, active: false } : item
        )
      );
      toast.success('ปิดใช้งานพนักงานแล้ว');
    } catch (error) {
      toast.error('ปิดใช้งานพนักงานไม่สำเร็จ', {
        description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setEmployeeMasterSaving(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData();
    loadEmployeeMaster();
  }, []);

  useEffect(
    () => () => {
      Object.values(pagingTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    },
    []
  );

  useEffect(() => {
    function onResize() {
      setIsWideScreen(window.innerWidth >= 1200);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    writeDashboardTableColumns('orders', visibleOrderColumns);
  }, [visibleOrderColumns]);

  useEffect(() => {
    writeDashboardTableColumns('employees', visibleEmployeeColumns);
  }, [visibleEmployeeColumns]);

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
              ...order.items.map((item) => `${item.type} ${item.size} ${item.qty}`),
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
    setEmployeePage(1);
  }, [branchFilter, statusFilter, monthFilter, query]);

  function setPageWithSkeleton(type, setter, value) {
    window.clearTimeout(pagingTimersRef.current[type]);
    setPagingLoading((current) => ({ ...current, [type]: true }));
    setter(value);
    pagingTimersRef.current[type] = window.setTimeout(() => {
      setPagingLoading((current) => ({ ...current, [type]: false }));
    }, 160);
  }

  const rows = useMemo(() => flattenBatches(filteredBatches), [filteredBatches]);
  const batchById = useMemo(
    () => new Map(filteredBatches.map((batch) => [batch.batchId, batch])),
    [filteredBatches]
  );
  const employeeRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime() ||
          a.name.localeCompare(b.name, 'th', { numeric: true })
      ),
    [rows]
  );

  const monthFilterOptions = useMemo(() => buildMonthFilterOptions(rows), [rows]);
  const metrics = useMemo(() => buildDashboardMetrics(filteredBatches), [filteredBatches]);
  const allRows = useMemo(() => flattenBatches(batches), [batches]);
  const exportBranchOptions = useMemo(
    () => [
      'ทุกสาขา',
      ...uniqueSorted([...effectiveBranches, ...batches.map((batch) => batch.branch).filter(Boolean)]),
    ],
    [batches, effectiveBranches]
  );
  const exportRows = useMemo(() => {
    const startKey = getMonthKeyFromInput(exportStartMonth);
    const endKey = getMonthKeyFromInput(exportEndMonth);
    return allRows.filter((row) => {
      const rowKey = getMonthKey(row.submittedAt);
      const inBranch = exportBranchFilter === 'ทุกสาขา' || row.branch === exportBranchFilter;
      const inStart = !startKey || rowKey >= startKey;
      const inEnd = !endKey || rowKey <= endKey;
      return inBranch && inStart && inEnd;
    });
  }, [allRows, exportBranchFilter, exportStartMonth, exportEndMonth]);
  const deleteConfirmBatch = useMemo(
    () => batches.find((batch) => batch.batchId === deleteConfirmBatchId) || null,
    [batches, deleteConfirmBatchId]
  );

  useEffect(() => {
    if (!monthFilterOptions.includes(monthFilter)) {
      setMonthFilter(monthFilterOptions[0] || 'ทุกเดือน');
    }
  }, [monthFilter, monthFilterOptions]);

  useEffect(() => {
    if (branchFilter !== 'ทุกสาขา' && !effectiveBranches.includes(branchFilter)) {
      setBranchFilter('ทุกสาขา');
    }
  }, [effectiveBranches, branchFilter]);

  useEffect(() => {
    if (exportBranchFilter !== 'ทุกสาขา' && !effectiveBranches.includes(exportBranchFilter)) {
      setExportBranchFilter('ทุกสาขา');
    }
  }, [effectiveBranches, exportBranchFilter]);

  async function syncDashboardAction(payload) {
    const expectedUpdatedAt = localStorage.getItem(CLOTHING_CONFIG_UPDATED_AT_KEY) || null;
    const body = { ...payload, expectedUpdatedAt };
    const response = await authFetch('/api/dashboard/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false)
      throw new Error(result?.error || 'บันทึกข้อมูลไปยัง Google Sheets ไม่สำเร็จ');
    // If GAS returned an updated clothing config, persist its version
    if (result?.updatedConfig && result?.updatedConfig.updatedAt) {
      localStorage.setItem(CLOTHING_CONFIG_UPDATED_AT_KEY, String(result.updatedConfig.updatedAt));
    }
  }

  function deriveBatchStatusFromOrders(orders, fallback = ORDER_STATUS_PENDING) {
    const statuses = orders.flatMap((order) =>
      order.items.map((item) => normalizeOrderStatus(item.status, fallback))
    );
    if (!statuses.length) return normalizeOrderStatus(fallback);
    const uniqueStatuses = new Set(statuses);
    return uniqueStatuses.size === 1 ? statuses[0] : ORDER_STATUS_PENDING;
  }

  function replaceDashboardBatch(batchId, updater) {
    setBatches((current) =>
      current.map((batch) => {
        if (batch.batchId !== batchId) return batch;
        return normalizeBatch(updater(batch));
      })
    );
    setSelectedBatch((selected) =>
      selected?.batchId === batchId ? normalizeBatch(updater(selected)) : selected
    );
  }

  function applyBatchStatusLocally(batchId, status, statusUpdatedAt) {
    replaceDashboardBatch(batchId, (batch) => ({
      ...batch,
      status,
      statusUpdatedAt,
      orders: batch.orders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          status,
          statusUpdatedAt,
        })),
      })),
    }));
  }

  function applyShipmentLocally(batchId, shipmentItems, statusUpdatedAt) {
    const shipmentByKey = new Map(
      shipmentItems.map((item) => [
        [item.employeeName, item.gender, item.type, item.size].join('::'),
        item,
      ])
    );

    replaceDashboardBatch(batchId, (batch) => {
      const nextOrders = batch.orders
        .map((order) => {
          const gender = order.gender || GENDERS[0];
          const nextItems = order.items.flatMap((item) => {
            const key = [order.name, gender, item.type, item.size].join('::');
            const shipment = shipmentByKey.get(key);
            if (!shipment) return [item];

            const splitItems = [];
            const shippedQty = Number(shipment.shippedQty || 0);
            const pendingQty = Number(shipment.pendingQty || 0);
            const canceledQty = Number(shipment.canceledQty || 0);
            if (shippedQty > 0) {
              splitItems.push({
                ...item,
                qty: shippedQty,
                status: ORDER_STATUS_DELIVERED,
                statusUpdatedAt,
              });
            }
            if (pendingQty > 0) {
              splitItems.push({
                ...item,
                qty: pendingQty,
                status: ORDER_STATUS_PENDING,
                statusUpdatedAt,
              });
            }
            if (canceledQty > 0) {
              splitItems.push({
                ...item,
                qty: canceledQty,
                status: ORDER_STATUS_CANCELED,
                statusUpdatedAt,
              });
            }
            return splitItems;
          });
          return { ...order, items: nextItems };
        })
        .filter((order) => order.items.length);

      return {
        ...batch,
        status: deriveBatchStatusFromOrders(nextOrders, batch.status),
        statusUpdatedAt,
        orders: nextOrders,
      };
    });
  }

  function publishStockConfigInBackground(nextConfig) {
    publishSharedClothingConfig(nextConfig).catch((error) => {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าแดชบอร์ดหมดอายุ', {
          description: 'กรุณาเข้าสู่แดชบอร์ดใหม่อีกครั้ง',
        });
        return;
      }
      toast.error('บันทึกสต๊อกไม่สำเร็จ', {
        description: error?.message || 'กรุณากดโหลดใหม่เพื่อตรวจข้อมูลอีกครั้ง',
      });
    });
  }

  function getStockAvailable(config, item) {
    if (!item || item.size === OTHER_SIZE) return Number.POSITIVE_INFINITY;
    const clothing = config.find((c) => c.type === item.type);
    const rows = clothing?.genderSizeRows?.[item.gender] || clothing?.sizeRows || [];
    const row = rows.find((r) => String(r.size) === String(item.size));
    return Number(row?.qty || 0);
  }

  function buildShipmentPayload(batch, overrides = []) {
    const overrideByKey = new Map(
      overrides.map((item) => [
        [item.employeeName, item.gender, item.type, item.size].join('::'),
        item,
      ])
    );

    return batch.orders.flatMap((order) => {
      const gender = order.gender || GENDERS[0];
      return order.items.map((item) => {
        const requestedQty = Number(item.qty || 0);
        const key = [order.name, gender, item.type, item.size].join('::');
        const override = overrideByKey.get(key);
        const currentShippedQty = item.status === ORDER_STATUS_DELIVERED ? requestedQty : 0;
        const targetStatus = normalizeOrderStatus(override?.status, item.status || ORDER_STATUS_PENDING);
        const rawShippedQty =
          targetStatus === ORDER_STATUS_CANCELED
            ? 0
            : override && Number.isFinite(Number(override.shippedQty))
              ? Number(override.shippedQty)
              : currentShippedQty;
        const shippedQty = Math.max(0, Math.min(requestedQty, rawShippedQty));
        const canceledQty = targetStatus === ORDER_STATUS_CANCELED ? requestedQty : 0;

        return {
          employeeName: order.name,
          gender,
          type: item.type,
          size: item.size,
          shippedQty,
          pendingQty: canceledQty > 0 ? 0 : requestedQty - shippedQty,
          canceledQty,
        };
      });
    });
  }

  function getShipmentStockMovements(batch, shipmentItems) {
    const desiredByKey = new Map(
      shipmentItems.map((item) => [
        [item.employeeName, item.gender, item.type, item.size].join('::'),
        Number(item.shippedQty || 0),
      ])
    );

    return batch.orders.flatMap((order) => {
      const gender = order.gender || GENDERS[0];
      return order.items
        .map((item) => {
          const requestedQty = Number(item.qty || 0);
          const currentShippedQty = item.status === ORDER_STATUS_DELIVERED ? requestedQty : 0;
          const key = [order.name, gender, item.type, item.size].join('::');
          const desiredShippedQty = desiredByKey.has(key)
            ? Number(desiredByKey.get(key) || 0)
            : currentShippedQty;

          return {
            employeeName: order.name,
            gender,
            type: item.type,
            size: item.size,
            delta: desiredShippedQty - currentShippedQty,
          };
        })
        .filter((item) => item.delta !== 0 && item.size !== OTHER_SIZE);
    });
  }

  function applyShipmentStockMovements(config, movements) {
    return movements.reduce((currentConfig, movement) => {
      return currentConfig.map((clothing) => {
        if (clothing.type !== movement.type) return clothing;
        const rows = getClothingStockRows(clothing, movement.gender);
        const updatedRows = rows.map((row) => {
          if (String(row.size) !== String(movement.size)) return row;
          return applyStockMovement(
            row,
            -movement.delta,
            movement.delta > 0 ? 'withdraw' : 'restore'
          );
        });
        return setClothingStockRows(clothing, movement.gender, updatedRows);
      });
    }, config);
  }

  async function updateBatchStatus(batchId, status) {
    const statusUpdatedAt = new Date().toISOString();
    setStatusLoadingId(batchId);
    const loadingToastId = toast.loading('กำลังอัปเดตสถานะ...', {
      description: 'ระบบกำลังบันทึกการเปลี่ยนแปลง กรุณารอสักครู่',
    });
    const batch = batches.find((batchItem) => batchItem.batchId === batchId);
    // Check against the latest shared config to avoid shipping more than available
    const latestConfig = (await loadSharedClothingConfig().catch(() => null)) || clothingConfig;
    const issues = findStockIssuesForStatusChange(latestConfig, batch, status);
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

    // Adjust stock configuration based on status transitions using latest config
    const nextConfig = adjustStockForStatusChange(latestConfig, batch, status);
    setClothingConfig(nextConfig);
    saveClothingConfig(nextConfig);
    publishStockConfigInBackground(nextConfig);

    applyBatchStatusLocally(batchId, status, statusUpdatedAt);
    setStatusLoadingId('');
    toast.success('อัปเดตสถานะคำสั่งเบิกเสื้อแล้ว', { id: loadingToastId });
  }

  async function shipBatchItems(batchId, shipmentOverrides) {
    const statusUpdatedAt = new Date().toISOString();
    setStatusLoadingId(batchId);
    const loadingToastId = toast.loading('กำลังบันทึกข้อมูลการจัดส่ง...', {
      description: 'ระบบกำลังอัปเดตและซิงก์คลังสินค้า...',
    });

    try {
      // Ensure we check and adjust against latest shared config
      const latestConfig = (await loadSharedClothingConfig().catch(() => null)) || clothingConfig;
      const batch = batches.find((batchItem) => batchItem.batchId === batchId);
      if (!batch) throw new Error('ไม่พบคำสั่งเบิกที่ต้องการอัปเดต');
      const shipmentItems = buildShipmentPayload(batch, shipmentOverrides);
      const stockMovements = getShipmentStockMovements(batch, shipmentItems);
      const stockIssues = stockMovements
        .filter((movement) => movement.delta > 0)
        .filter((movement) => getStockAvailable(latestConfig, movement) < movement.delta);

      if (stockIssues.length) {
        throw new Error(
          `สต๊อกไม่พอ: ${stockIssues
            .slice(0, 3)
            .map((item) => `${item.type} ไซส์ ${item.size} (${item.gender})`)
            .join(', ')}`
        );
      }

      // 1. Update statuses on Google Sheets
      await syncDashboardAction({
        action: 'shipItems',
        batchId,
        items: shipmentItems,
        statusUpdatedAt,
      });

      // 2. Deduct shipped quantities from the local stock configuration
      const nextConfig = applyShipmentStockMovements(latestConfig, stockMovements);

      setClothingConfig(nextConfig);
      saveClothingConfig(nextConfig);

      publishStockConfigInBackground(nextConfig);

      // 3. Reflect the saved sheet update locally without reloading all dashboard rows.
      applyShipmentLocally(batchId, shipmentItems, statusUpdatedAt);

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

  async function updateSingleItemStatus(batch, order, item, status) {
    const requestedQty = Number(item.qty || 0);
    const shipmentItems = [
      {
        employeeName: order.name,
        gender: order.gender || GENDERS[0],
        type: item.type,
        size: item.size,
        status,
        shippedQty: status === ORDER_STATUS_DELIVERED ? requestedQty : 0,
      },
    ];
    await shipBatchItems(batch.batchId, shipmentItems);
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
  const isOrderPageLoading = pagingLoading.orders;
  const employeePageSize = 12;
  const employeePageCount = Math.max(1, Math.ceil(employeeRows.length / employeePageSize));
  const safeEmployeePage = Math.min(employeePage, employeePageCount);
  const employeeStartIndex = (safeEmployeePage - 1) * employeePageSize;
  const pagedEmployeeRows = employeeRows.slice(
    employeeStartIndex,
    employeeStartIndex + employeePageSize
  );
  const isEmployeePageLoading = pagingLoading.employees;
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
    .sort((a, b) => b.withdrawn - a.withdrawn || a.type.localeCompare(b.type, 'th'));
  const useSplitOrderColumns = isWideScreen && orderRows.length > 4;
  const visibleOrderColumnSet = new Set(visibleOrderColumns);
  const visibleEmployeeColumnSet = new Set(visibleEmployeeColumns);
  const isOrderColumnVisible = (columnId) => visibleOrderColumnSet.has(columnId);
  const isEmployeeColumnVisible = (columnId) => visibleEmployeeColumnSet.has(columnId);
  const orderTableColSpan = visibleOrderColumns.length + 1;
  const toggleBatchExpanded = (batchId) => {
    setExpandedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };
  const handleBatchRowKeyDown = (event, batchId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleBatchExpanded(batchId);
    }
  };

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
          <DashboardOverview
            onRefresh={() => loadData({ silent: true })}
            metrics={metrics}
            rows={rows}
            filteredBatches={filteredBatches}
            stockSummaryRows={stockSummaryRows}
            statuses={{
              pending: ORDER_STATUS_PENDING,
              delivered: ORDER_STATUS_DELIVERED,
              canceled: ORDER_STATUS_CANCELED,
            }}
          />
        </section>
      )}

      <section
        className={cn(
          'dashboard-console',
          (activeView === 'orders' || activeView === 'employees') && 'orders-only',
          activeView !== 'orders' && activeView !== 'employees' && 'hidden'
        )}
      >
        <aside className={cn('dashboard-filter-rail', filtersCollapsed && 'collapsed')}>
          <div className="dashboard-panel-title">
            <h2>ตัวกรอง</h2>
            <div className="dashboard-filter-title-actions">
              <button
                type="button"
                className="dashboard-filter-toggle"
                onClick={() => setFiltersCollapsed((value) => !value)}
                title={filtersCollapsed ? 'เปิดตัวกรอง' : 'ย่อตัวกรอง'}
                aria-expanded={!filtersCollapsed}
              >
                {filtersCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
              <button type="button" onClick={clearFilters} title="ล้างตัวกรอง">
                <Eraser className="size-4" />
              </button>
            </div>
          </div>
          <div className="dashboard-filter-body">
          <Field label="สาขา">
            <Select value={branchFilter} onChange={setBranchFilter} values={['ทุกสาขา', ...effectiveBranches]} />
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
          </div>
        </aside>

        {activeView === 'orders' && (
        <section className="dashboard-orders-panel">
          <div className="dashboard-panel-head">
            <div>
              <h2>รายการเบิก</h2>
              <p>ทั้งหมด {filteredBatches.length} รายการ</p>
            </div>
            <div className="dashboard-panel-actions">
              <button type="button" onClick={() => setColumnSettingsTable('orders')} title="ตั้งค่าคอลัมน์ตาราง">
                <Settings2 className="size-4" />
              </button>
              <button onClick={() => loadData({ silent: true })} disabled={refreshing}>
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              </button>
              <button onClick={() => setExportExpanded((value) => !value)}>
                <Download className="size-4" />
                <span>ส่งออก</span>
              </button>
            </div>
          </div>
          {/* summary removed — duplicates left filter */}

          {exportExpanded && (
            <div className="dashboard-export-panel">
              <div className="dashboard-export-grid">
                <Field label="สาขาส่งออก">
                  <Select
                    value={exportBranchFilter}
                    onChange={setExportBranchFilter}
                    values={exportBranchOptions}
                  />
                </Field>
                <Field label="เดือนเริ่มต้น">
                  <TextInput
                    type="month"
                    value={exportStartMonth}
                    onChange={setExportStartMonth}
                    placeholder="เลือกเดือน"
                  />
                </Field>
                <Field label="เดือนสิ้นสุด">
                  <TextInput
                    type="month"
                    value={exportEndMonth}
                    onChange={setExportEndMonth}
                    placeholder="เลือกเดือน"
                  />
                </Field>
                <div className="dashboard-export-actions">
                  <button className="dashboard-primary-action" onClick={exportCsv}>
                    <Download className="size-4" />
                    ส่งออก CSV
                  </button>
                  <p className="dashboard-export-note">
                    ส่งออกเฉพาะรายการตามสาขาและช่วงเดือนที่เลือก
                  </p>
                </div>
              </div>
            </div>
          )}

          {isOrderPageLoading ? (
            <DashboardPageSkeleton rows={Math.min(orderPageSize, Math.max(3, orderRows.length || 3))} />
          ) : useSplitOrderColumns ? (
            <div className="dashboard-orders-columns">
              {(() => {
                const half = Math.ceil(orderRows.length / 2);
                const left = orderRows.slice(0, half);
                const right = orderRows.slice(half);
                const renderTable = (rows) => (
                  <div className="dashboard-table-wrap">
                    <table className="dashboard-batch-table">
                      <thead>
                        <tr>
                          {isOrderColumnVisible('code') && <th>รหัสคำสั่ง</th>}
                          {isOrderColumnVisible('date') && <th>วันที่</th>}
                          {isOrderColumnVisible('company') && <th>บริษัท/หน่วยงาน</th>}
                          {isOrderColumnVisible('branch') && <th>สาขา</th>}
                          {isOrderColumnVisible('contact') && <th>ผู้ติดต่อ</th>}
                          {isOrderColumnVisible('total') && <th>จำนวนรวม</th>}
                          {isOrderColumnVisible('status') && <th>สถานะ</th>}
                          {isOrderColumnVisible('updated') && <th>อัปเดตล่าสุด</th>}
                          <th>จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((batch) => (
                          <React.Fragment key={batch.batchId}>
                          <tr
                            className="dashboard-clickable-row"
                            tabIndex={0}
                            aria-expanded={expandedBatchIds.has(batch.batchId)}
                            onClick={() => toggleBatchExpanded(batch.batchId)}
                            onKeyDown={(event) => handleBatchRowKeyDown(event, batch.batchId)}
                          >
                            {isOrderColumnVisible('code') && (
                            <td>
                              <button
                                className="dashboard-link dashboard-row-open"
                                title={String(batch.batchId)}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleBatchExpanded(batch.batchId);
                                }}
                              >
                                <span>{String(batch.batchId)}</span>
                                {expandedBatchIds.has(batch.batchId) ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )}
                              </button>
                            </td>
                            )}
                            {isOrderColumnVisible('date') && <td>{formatDashboardDate(batch.submittedAt)}</td>}
                            {isOrderColumnVisible('company') && <td>{batch.companyName || '-'}</td>}
                            {isOrderColumnVisible('branch') && <td>{batch.branch || '-'}</td>}
                            {isOrderColumnVisible('contact') && <td>{batch.supervisorName || '-'}</td>}
                            {isOrderColumnVisible('total') && <td>{getBatchPieces(batch)}</td>}
                            {isOrderColumnVisible('status') && (
                            <td>
                              <StatusBadge status={batch.status} />
                            </td>
                            )}
                            {isOrderColumnVisible('updated') && <td>{formatDashboardDate(batch.statusUpdatedAt || batch.submittedAt)}</td>}
                            <td className="dashboard-row-actions">
                              <div className="dashboard-row-actions-group">
                                {batch.status !== ORDER_STATUS_DELIVERED && (
                                  <button
                                    className="dashboard-action-btn"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateBatchStatus(batch.batchId, ORDER_STATUS_DELIVERED);
                                    }}
                                  >
                                    จัดส่งแล้ว
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedBatchIds.has(batch.batchId) && (
                          <tr className="batch-detail-row" key={`${batch.batchId}-details`}>
                            <td colSpan={orderTableColSpan} className="p-0">
                              <div className="batch-detail-container">
                                <div className={cn('batch-detail-inner', expandedBatchIds.has(batch.batchId) && 'open')}>
                                  <table className="batch-detail-table text-center">
                                    <thead>
                                      <tr>
                                        <th>ชื่อพนักงาน</th>
                                        <th>เพศ</th>
                                        <th>เสื้อ</th>
                                        <th>ไซส์</th>
                                        <th>จำนวน</th>
                                        <th>สถานะ</th>
                                        <th>อัปเดตล่าสุด</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {batch.orders.flatMap((order) =>
                                        order.items.map((item, idx) => {
                                          const requested = Number(item.qty || 0);
                                          const clothing = (clothingConfig || []).find((c) => c.type === item.type);
                                          const sizeRows = (clothing?.genderSizeRows?.[order.gender] || clothing?.sizeRows) || [];
                                          const sizeRow = sizeRows.find((r) => String(r.size) === String(item.size));
                                          const available = Number(sizeRow?.qty || 0);
                                          const currentStatus = item.status || batch.status || ORDER_STATUS_PENDING;
                                          const understock =
                                            requested > available &&
                                            item.size !== OTHER_SIZE &&
                                            currentStatus !== ORDER_STATUS_CANCELED;
                                          return (
                                            <tr key={`${batch.batchId}-${order.name}-${idx}`} className={cn('batch-detail-item', understock && 'understock')}>
                                              <td>{order.name}</td>
                                              <td>{order.gender}</td>
                                              <td>{item.type}</td>
                                              <td>{item.size}</td>
                                              <td>
                                                {requested}
                                                {understock && (
                                                  <div className="understock-flag">สต๊อกไม่พอ (มี {available})</div>
                                                )}
                                              </td>
                                              <td>
                                                <div className="batch-item-status-cell">
                                                  <StatusBadge status={item.status || batch.status} small />
                                                  <div className="batch-item-status-actions">
                                                    <button
                                                      type="button"
                                                      disabled={
                                                        statusLoadingId === batch.batchId ||
                                                        currentStatus === ORDER_STATUS_DELIVERED ||
                                                        understock
                                                      }
                                                      onClick={() =>
                                                        updateSingleItemStatus(
                                                          batch,
                                                          order,
                                                          item,
                                                          ORDER_STATUS_DELIVERED
                                                        )
                                                      }
                                                      title={understock ? `สต๊อกไม่พอ (มี ${available})` : 'จัดส่งรายการนี้'}
                                                    >
                                                      จัดส่งแล้ว
                                                    </button>
                                                    <button
                                                      type="button"
                                                      disabled={
                                                        statusLoadingId === batch.batchId ||
                                                        currentStatus === ORDER_STATUS_PENDING
                                                      }
                                                      onClick={() =>
                                                        updateSingleItemStatus(
                                                          batch,
                                                          order,
                                                          item,
                                                          ORDER_STATUS_PENDING
                                                        )
                                                      }
                                                    >
                                                      รอจัดส่ง
                                                    </button>
                                                    <button
                                                      type="button"
                                                      disabled={
                                                        statusLoadingId === batch.batchId ||
                                                        currentStatus === ORDER_STATUS_CANCELED
                                                      }
                                                      onClick={() =>
                                                        updateSingleItemStatus(
                                                          batch,
                                                          order,
                                                          item,
                                                          ORDER_STATUS_CANCELED
                                                        )
                                                      }
                                                    >
                                                      ยกเลิก
                                                    </button>
                                                  </div>
                                                </div>
                                              </td>
                                              <td>{formatDashboardDate(item.statusUpdatedAt || batch.statusUpdatedAt || batch.submittedAt)}</td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                          )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

                return (
                  <>
                    {renderTable(left)}
                    {renderTable(right)}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="dashboard-table-wrap">
              <table className="dashboard-batch-table">
              <thead>
                <tr>
                  {isOrderColumnVisible('code') && <th>รหัสคำสั่ง</th>}
                  {isOrderColumnVisible('date') && <th>วันที่</th>}
                  {isOrderColumnVisible('company') && <th>บริษัท/หน่วยงาน</th>}
                  {isOrderColumnVisible('branch') && <th>สาขา</th>}
                  {isOrderColumnVisible('contact') && <th>ผู้ติดต่อ</th>}
                  {isOrderColumnVisible('total') && <th>จำนวนรวม</th>}
                  {isOrderColumnVisible('status') && <th>สถานะ</th>}
                  {isOrderColumnVisible('updated') && <th>อัปเดตล่าสุด</th>}
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {orderRows.map((batch) => (
                  <React.Fragment key={batch.batchId}>
                    <tr
                      className="dashboard-clickable-row"
                      tabIndex={0}
                      aria-expanded={expandedBatchIds.has(batch.batchId)}
                      onClick={() => toggleBatchExpanded(batch.batchId)}
                      onKeyDown={(event) => handleBatchRowKeyDown(event, batch.batchId)}
                    >
                    {isOrderColumnVisible('code') && (
                    <td>
                      <button
                        className="dashboard-link dashboard-row-open"
                        title={String(batch.batchId)}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleBatchExpanded(batch.batchId);
                        }}
                      >
                        <span>{String(batch.batchId)}</span>
                        {expandedBatchIds.has(batch.batchId) ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>
                    </td>
                    )}
                    {isOrderColumnVisible('date') && <td>{formatDashboardDate(batch.submittedAt)}</td>}
                    {isOrderColumnVisible('company') && <td>{batch.companyName || '-'}</td>}
                    {isOrderColumnVisible('branch') && <td>{batch.branch || '-'}</td>}
                    {isOrderColumnVisible('contact') && <td>{batch.supervisorName || '-'}</td>}
                    {isOrderColumnVisible('total') && <td>{getBatchPieces(batch)}</td>}
                    {isOrderColumnVisible('status') && (
                    <td>
                      <StatusBadge status={batch.status} />
                    </td>
                    )}
                    {isOrderColumnVisible('updated') && <td>{formatDashboardDate(batch.statusUpdatedAt || batch.submittedAt)}</td>}
                            <td className="dashboard-row-actions">
                      <div className="dashboard-row-actions-group">
                                {batch.status !== ORDER_STATUS_DELIVERED && (
                                  <button
                                    className="dashboard-action-btn"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateBatchStatus(batch.batchId, ORDER_STATUS_DELIVERED);
                                    }}
                                  >
                                    ยืนยันจัดส่ง
                                  </button>
                                )}
                      </div>
                    </td>
                  </tr>
                          {/* Expanded detail rows for this batch */}
                          {expandedBatchIds.has(batch.batchId) && (
                            <tr className="batch-detail-row" key={`${batch.batchId}-details`}>
                              <td colSpan={orderTableColSpan} className="p-0">
                                <div className="batch-detail-container">
                                  <div className={cn('batch-detail-inner', expandedBatchIds.has(batch.batchId) && 'open')}>
                                    <table className="batch-detail-table text-center">
                                      <thead>
                                        <tr>
                                          <th>ชื่อพนักงาน</th>
                                          <th>เพศ</th>
                                          <th>เสื้อ</th>
                                          <th>ไซส์</th>
                                          <th>จำนวน</th>
                                          <th>สถานะ</th>
                                          <th>อัปเดตล่าสุด</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {batch.orders.flatMap((order) =>
                                          order.items.map((item, idx) => {
                                            const requested = Number(item.qty || 0);
                                            const clothing = (clothingConfig || []).find((c) => c.type === item.type);
                                            const sizeRows = (clothing?.genderSizeRows?.[order.gender] || clothing?.sizeRows) || [];
                                            const sizeRow = sizeRows.find((r) => String(r.size) === String(item.size));
                                            const available = Number(sizeRow?.qty || 0);
                                            const currentStatus = item.status || batch.status || ORDER_STATUS_PENDING;
                                            const understock =
                                              requested > available &&
                                              item.size !== OTHER_SIZE &&
                                              currentStatus !== ORDER_STATUS_CANCELED;
                                            return (
                                              <tr key={`${batch.batchId}-${order.name}-${idx}`} className={cn('batch-detail-item', understock && 'understock')}>
                                                <td>{order.name}</td>
                                                <td>{order.gender}</td>
                                                <td>{item.type}</td>
                                                <td>{item.size}</td>
                                                <td>
                                                  {requested}
                                                  {understock && (
                                                    <div className="understock-flag">สต๊อกไม่พอ (มี {available})</div>
                                                  )}
                                                </td>
                                                <td>
                                                  <div className="batch-item-status-cell">
                                                    <StatusBadge status={item.status || batch.status} small />
                                                    <div className="batch-item-status-actions">
                                                      <button
                                                        type="button"
                                                        disabled={
                                                          statusLoadingId === batch.batchId ||
                                                          currentStatus === ORDER_STATUS_DELIVERED ||
                                                          understock
                                                        }
                                                        onClick={() =>
                                                          updateSingleItemStatus(
                                                            batch,
                                                            order,
                                                            item,
                                                            ORDER_STATUS_DELIVERED
                                                          )
                                                        }
                                                        title={understock ? `สต๊อกไม่พอ (มี ${available})` : 'จัดส่งรายการนี้'}
                                                      >
                                                        จัดส่งแล้ว
                                                      </button>
                                                      <button
                                                        type="button"
                                                        disabled={
                                                          statusLoadingId === batch.batchId ||
                                                          currentStatus === ORDER_STATUS_PENDING
                                                        }
                                                        onClick={() =>
                                                          updateSingleItemStatus(
                                                            batch,
                                                            order,
                                                            item,
                                                            ORDER_STATUS_PENDING
                                                          )
                                                        }
                                                      >
                                                        รอจัดส่ง
                                                      </button>
                                                      <button
                                                        type="button"
                                                        disabled={
                                                          statusLoadingId === batch.batchId ||
                                                          currentStatus === ORDER_STATUS_CANCELED
                                                        }
                                                        onClick={() =>
                                                          updateSingleItemStatus(
                                                            batch,
                                                            order,
                                                            item,
                                                            ORDER_STATUS_CANCELED
                                                          )
                                                        }
                                                      >
                                                        ยกเลิก
                                                      </button>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td>{formatDashboardDate(item.statusUpdatedAt || batch.statusUpdatedAt || batch.submittedAt)}</td>
                                              </tr>
                                            );
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
              </tbody>
            </table>
          </div>
          )}

          <div className="dashboard-mobile-orders">
            {isOrderPageLoading ? (
              <DashboardPageSkeleton rows={Math.min(orderPageSize, Math.max(3, orderRows.length || 3))} />
            ) : orderRows.map((batch) => (
              <article
                key={batch.batchId}
                className="dashboard-mobile-order-card"
              >
                <div className="dashboard-mobile-order-top">
                        <div>
                          <strong title={String(batch.batchId)}>{String(batch.batchId)}</strong>
                          <span>{formatDashboardDate(batch.submittedAt)}</span>
                        </div>
                </div>
                <div className="dashboard-mobile-order-grid">
                  <span>บริษัท <strong>{batch.companyName || '-'}</strong></span>
                  <span>สาขา <strong>{batch.branch || '-'}</strong></span>
                  <span>ผู้ติดต่อ <strong>{batch.supervisorName || '-'}</strong></span>
                  <span>จำนวน <strong>{getBatchPieces(batch)} ตัว</strong></span>
                  <span>อัปเดตล่าสุด <strong>{formatDashboardDate(batch.statusUpdatedAt || batch.submittedAt)}</strong></span>
                </div>
                <div className="dashboard-mobile-order-bottom">
                  <StatusBadge status={batch.status} />
                  <button type="button" onClick={() => setSelectedBatch(batch)}>
                    ดูรายละเอียด
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="dashboard-panel-foot">
            <span>แสดง {filteredBatches.length ? orderStartIndex + 1 : 0} - {orderStartIndex + orderRows.length} จาก {filteredBatches.length} รายการ</span>
            <div>
              <button
                type="button"
                disabled={safeOrderPage <= 1 || isOrderPageLoading}
                onClick={() => setPageWithSkeleton('orders', setOrderPage, (page) => Math.max(1, page - 1))}
              >
                <ArrowLeft className="size-4" />
              </button>
              <strong>{safeOrderPage}</strong>
              <button
                type="button"
                disabled={safeOrderPage >= orderPageCount || isOrderPageLoading}
                onClick={() => setPageWithSkeleton('orders', setOrderPage, (page) => Math.min(orderPageCount, page + 1))}
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {activeView === 'employees' && (
        <section className="dashboard-employees-panel">
          <div className="dashboard-panel-head">
            <div>
              <h2>ข้อมูลพนักงาน</h2>
              <p>จัดการฐานพนักงานจริง และดูประวัติรายการเบิกจากคำสั่งเบิก</p>
            </div>
            <div className="dashboard-panel-actions">
              <button type="button" onClick={() => setColumnSettingsTable('employees')} title="ตั้งค่าคอลัมน์ตาราง">
                <Settings2 className="size-4" />
                <span>คอลัมน์</span>
              </button>
              <button onClick={() => loadData({ silent: true })} disabled={refreshing}>
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                <span>โหลดใหม่</span>
              </button>
            </div>
          </div>

          <EmployeeMasterPanel
            employees={employeeMasterRows}
            branches={effectiveBranches}
            genders={GENDERS}
            loading={employeeMasterLoading}
            saving={employeeMasterSaving}
            search={employeeMasterSearch}
            onSearchChange={setEmployeeMasterSearch}
            onReload={() => loadEmployeeMaster({ silent: true })}
            onSave={saveEmployeeMaster}
            onDeactivate={deactivateEmployeeMaster}
          />

          <div className="dashboard-panel-head slim employee-history-head">
            <div>
              <h2>ประวัติรายการเบิกของพนักงาน</h2>
              <p>แสดงจากคำสั่งเบิกตามตัวกรองปัจจุบัน {employeeRows.length} รายการ</p>
            </div>
          </div>

          <div className="dashboard-panel-summary">
            <MiniMetric label="รายการเบิก" value={employeeRows.length} />
            <MiniMetric label="จำนวนรวม" value={`${metrics.totalPieces} ชิ้น`} />
            <MiniMetric label="รอจัดส่ง" value={`${metrics.pendingPieces} ชิ้น`} />
            <MiniMetric label="จัดส่งแล้ว" value={`${metrics.shippedPieces} ชิ้น`} />
          </div>

          {isEmployeePageLoading ? (
            <DashboardPageSkeleton rows={Math.min(employeePageSize, Math.max(4, pagedEmployeeRows.length || 4))} />
          ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-employee-table">
              <thead>
                <tr>
                  {isEmployeeColumnVisible('name') && <th>ชื่อพนักงาน</th>}
                  {isEmployeeColumnVisible('gender') && <th>เพศ</th>}
                  {isEmployeeColumnVisible('type') && <th>เสื้อ</th>}
                  {isEmployeeColumnVisible('size') && <th>ไซส์</th>}
                  {isEmployeeColumnVisible('qty') && <th>จำนวน</th>}
                  {isEmployeeColumnVisible('status') && <th>สถานะ</th>}
                  {isEmployeeColumnVisible('date') && <th>อัปเดตล่าสุด</th>}
                  <th>ดู</th>
                </tr>
              </thead>
              <tbody>
                {pagedEmployeeRows.map((row) => {
                  const rowBatch = batchById.get(row.batchId);
                  return (
                    <tr key={row.id}>
                      {isEmployeeColumnVisible('name') && <td>{row.name || '-'}</td>}
                      {isEmployeeColumnVisible('gender') && <td>{row.gender || '-'}</td>}
                      {isEmployeeColumnVisible('type') && <td>{row.type || '-'}</td>}
                      {isEmployeeColumnVisible('size') && <td>{row.size || '-'}</td>}
                      {isEmployeeColumnVisible('qty') && <td>{row.qty}</td>}
                      {isEmployeeColumnVisible('status') && <td><StatusBadge status={row.itemStatus || row.status} /></td>}
                      {isEmployeeColumnVisible('date') && <td>{formatDashboardDate(row.statusUpdatedAt || row.submittedAt)}</td>}
                      <td>
                        <button
                          className="dashboard-action-btn"
                          onClick={() => rowBatch && setSelectedBatch(rowBatch)}
                          disabled={!rowBatch}
                        >
                          รายละเอียด
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          <div className="dashboard-mobile-orders">
            {isEmployeePageLoading ? (
              <DashboardPageSkeleton rows={Math.min(employeePageSize, Math.max(4, pagedEmployeeRows.length || 4))} />
            ) : pagedEmployeeRows.map((row) => {
              const rowBatch = batchById.get(row.batchId);
              return (
                <article
                  key={row.id}
                  className="dashboard-mobile-order-card"
                  onClick={() => rowBatch && setSelectedBatch(rowBatch)}
                >
                  <div className="dashboard-mobile-order-top">
                    <div>
                      <strong>{row.name || '-'}</strong>
                      <span>อัปเดตล่าสุด {formatDashboardDate(row.statusUpdatedAt || row.submittedAt)}</span>
                    </div>
                    <StatusBadge status={row.itemStatus || row.status} />
                  </div>
                  <div className="dashboard-mobile-order-grid">
                    <span>เพศ <strong>{row.gender || '-'}</strong></span>
                    <span>เสื้อ <strong>{row.type || '-'}</strong></span>
                    <span>ไซส์ <strong>{row.size || '-'}</strong></span>
                    <span>จำนวน <strong>{row.qty} ตัว</strong></span>
                  </div>
                  <div className="dashboard-mobile-order-bottom">
                    <span>อัปเดตล่าสุด {formatDashboardDate(row.statusUpdatedAt || row.submittedAt)}</span>
                    <button
                      type="button"
                      disabled={!rowBatch}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (rowBatch) setSelectedBatch(rowBatch);
                      }}
                    >
                      ดูคำสั่ง
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="dashboard-panel-foot">
            <span>แสดง {employeeRows.length ? employeeStartIndex + 1 : 0} - {employeeStartIndex + pagedEmployeeRows.length} จาก {employeeRows.length} รายการ</span>
            <div>
              <button
                type="button"
                disabled={safeEmployeePage <= 1 || isEmployeePageLoading}
                onClick={() => setPageWithSkeleton('employees', setEmployeePage, (page) => Math.max(1, page - 1))}
              >
                <ArrowLeft className="size-4" />
              </button>
              <strong>{safeEmployeePage}</strong>
              <button
                type="button"
                disabled={safeEmployeePage >= employeePageCount || isEmployeePageLoading}
                onClick={() => setPageWithSkeleton('employees', setEmployeePage, (page) => Math.min(employeePageCount, page + 1))}
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        <aside className="dashboard-insight-panel">
          <div className="dashboard-panel-head slim">
            <div>
              <h2>ภาพรวมการดำเนินงาน</h2>
              <p>ข้อมูล ณ {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
            </div>
          </div>
          <div className="dashboard-kpi-grid">
            <MiniMetric label="คำสั่งเบิกทั้งหมด" value={filteredBatches.length} />
            <MiniMetric label="รอจัดส่ง" value={countByStatus(ORDER_STATUS_PENDING)} />
            <MiniMetric label="จัดส่งแล้ว" value={countByStatus(ORDER_STATUS_DELIVERED)} />
            <MiniMetric label="ยกเลิก" value={countByStatus(ORDER_STATUS_CANCELED)} />
          </div>
          <div className="dashboard-alert-card">
            <div className="dashboard-section-title">
              <h3>สถานะที่ต้องติดตาม</h3>
            </div>
            <p><span className="dot red" /> รอจัดส่ง <strong>{countByStatus(ORDER_STATUS_PENDING)} รายการ</strong></p>
            <p><span className="dot green" /> จัดส่งแล้ว <strong>{countByStatus(ORDER_STATUS_DELIVERED)} รายการ</strong></p>
            <p><span className="dot blue" /> ยกเลิก <strong>{countByStatus(ORDER_STATUS_CANCELED)} รายการ</strong></p>
          </div>
          <div className="dashboard-alert-card">
            <div className="dashboard-section-title">
              <h3>แจ้งเตือนสต๊อกต่ำ</h3>
            </div>
            {lowStockRows.length ? (
              lowStockRows.map((item) => (
                <p key={item.id}>
                  {item.type} <strong>คงเหลือ {item.total} ชิ้น</strong>
                </p>
              ))
            ) : (
              <p>สต๊อกอยู่ในระดับปกติ <strong>{inventoryRows.length} รายการ</strong></p>
            )}
          </div>
        </aside>
      </section>

      {activeView === 'inventory' && (
        <section className="dashboard-inventory-manager">
          <div className="dashboard-panel-head">
            <div>
              <h2>แบบเสื้อและสต๊อก</h2>
              <p>จัดการชื่อแบบเสื้อ รูปภาพ รายละเอียดไซส์ และสต๊อกคงเหลือตามเพศ/ไซส์</p>
            </div>
            <div className="dashboard-panel-actions">
              <button onClick={() => onViewChange?.('orders')}>
                <ClipboardList className="size-4" />
                <span>กลับไปรายการเบิก</span>
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

      {activeView === 'branches' && (
        <section className="dashboard-branches-panel">
          <div className="dashboard-panel-head">
            <div>
              <h2>จัดการสาขา</h2>
              <p>เพิ่ม แก้ไข หรือลบสาขาที่ใช้งานในระบบเบิกเสื้อ</p>
            </div>
            <div className="dashboard-panel-actions">
              <button onClick={() => onViewChange?.('orders')}>
                <ClipboardList className="size-4" />
                <span>กลับไปรายการเบิก</span>
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-2xl px-4 py-6">
            <BranchManager 
              onSaved={async () => {
                toast.success('บันทึกข้อมูลสาขาสำเร็จ');
                await refreshBranches();
              }} 
            />
          </div>
        </section>
      )}

      <BatchDetailDialog
        batch={selectedBatch}
        onClose={() => setSelectedBatch(null)}
        onStatusChange={updateBatchStatus}
        onItemStatusChange={updateSingleItemStatus}
        onDelete={requestDeleteBatch}
        statusLoadingId={statusLoadingId}
        deleteLoadingId={deleteLoadingId}
        onShipClick={() => setShipmentDialogOpen(true)}
        clothingConfig={clothingConfig}
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
      <ColumnSettingsDialog
        open={columnSettingsTable === 'orders'}
        title="ตั้งค่าคอลัมน์รายการเบิก"
        columns={ORDER_TABLE_COLUMNS}
        visibleColumns={visibleOrderColumns}
        onChange={setVisibleOrderColumns}
        onClose={() => setColumnSettingsTable('')}
      />
      <ColumnSettingsDialog
        open={columnSettingsTable === 'employees'}
        title="ตั้งค่าคอลัมน์ข้อมูลพนักงาน"
        columns={EMPLOYEE_TABLE_COLUMNS}
        visibleColumns={visibleEmployeeColumns}
        onChange={setVisibleEmployeeColumns}
        onClose={() => setColumnSettingsTable('')}
      />
    </>
  );

}

function BatchItemMobileCard({ batch, order, item, isBusy, clothingConfig, onItemStatusChange }) {
  const requested = Number(item.qty || 0);
  const gender = order.gender || GENDERS[0];
  const clothing = clothingConfig.find((configItem) => configItem.type === item.type);
  const rows = clothing?.genderSizeRows?.[gender] || clothing?.sizeRows || [];
  const stockRow = rows.find((row) => String(row.size) === String(item.size));
  const currentStock = item.size === OTHER_SIZE ? requested : Number(stockRow?.qty || 0);
  const currentStatus = item.status || ORDER_STATUS_PENDING;
  const canShip =
    currentStatus === ORDER_STATUS_DELIVERED || item.size === OTHER_SIZE || currentStock >= requested;

  return (
    <div className={cn('rounded-lg bg-[#F8FAFC] p-3', !canShip && 'bg-[#FEF2F2]')}>
      <div className="flex items-center justify-between gap-2">
        <p className="break-words text-sm font-extrabold text-[#071638]">{item.type}</p>
        <StatusBadge status={currentStatus} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs min-[520px]:grid-cols-4">
        <MobileInfo label="ไซส์" value={item.size || '-'} compact />
        <MobileInfo label="จำนวน" value={item.qty} compact strong />
        <MobileInfo label="สต๊อก" value={item.size === OTHER_SIZE ? '-' : currentStock} compact />
        <MobileInfo label="อัปเดต" value={formatDashboardDate(item.statusUpdatedAt || batch.statusUpdatedAt || batch.submittedAt)} compact />
      </div>
      {!canShip && currentStatus !== ORDER_STATUS_CANCELED && (
        <p className="mt-2 text-xs font-black text-[#B91C1C]">สต๊อกไม่พอ (มี {currentStock})</p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 min-[520px]:flex">
        <button
          type="button"
          disabled={isBusy || currentStatus === ORDER_STATUS_DELIVERED || !canShip}
          onClick={() => onItemStatusChange?.(batch, order, item, ORDER_STATUS_DELIVERED)}
          className="min-h-9 rounded-lg bg-[#DCFCE7] px-2 text-xs font-black text-[#166534] disabled:opacity-50"
        >
          จัดส่งแล้ว
        </button>
        <button
          type="button"
          disabled={isBusy || currentStatus === ORDER_STATUS_PENDING}
          onClick={() => onItemStatusChange?.(batch, order, item, ORDER_STATUS_PENDING)}
          className="min-h-9 rounded-lg bg-[#FFEDD5] px-2 text-xs font-black text-[#9A3412] disabled:opacity-50"
        >
          รอจัดส่ง
        </button>
        <button
          type="button"
          disabled={isBusy || currentStatus === ORDER_STATUS_CANCELED}
          onClick={() => onItemStatusChange?.(batch, order, item, ORDER_STATUS_CANCELED)}
          className="min-h-9 rounded-lg bg-[#E2E8F0] px-2 text-xs font-black text-[#475569] disabled:opacity-50"
        >
          ยกเลิก
        </button>
      </div>
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
        const currentStock = item.size === OTHER_SIZE ? Number(item.qty || 0) : Number(stockRow?.qty || 0);

        const isInactive =
          item.status === ORDER_STATUS_DELIVERED || item.status === ORDER_STATUS_CANCELED;
        const requestedQty = isInactive ? 0 : Number(item.qty || 0);

        return {
          employeeName: order.name,
          gender,
          type: item.type,
          size: item.size,
          requestedQty,
          currentStock,
          shippedQty: isInactive ? 0 : Math.min(requestedQty, currentStock),
          isInactive,
        };
      });
    });
    setItems(flatItems);
  }, [batch, clothingConfig]);

  function handleShippedQtyChange(index, val) {
    const maxShipped = Math.min(items[index].requestedQty, items[index].currentStock);
    const nextVal = Math.max(0, Math.min(maxShipped, Number(val) || 0));
    setItems((current) =>
      current.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, shippedQty: nextVal };
      })
    );
  }

  function handleConfirm() {
    const shipmentData = items
      .filter((item) => !item.isInactive && item.requestedQty > 0)
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

  const activeItems = items.filter((item) => !item.isInactive && item.requestedQty > 0);

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
                จัดการจัดส่ง
              </Dialog.Title>
              <p className="text-xs font-semibold text-[#64748B] mt-0.5">
                ระบุจำนวนที่สามารถจัดส่งได้ในรอบนี้ ส่วนที่ยังไม่ส่งจะคงสถานะเป็น "รอจัดส่ง"
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
                ไม่มีรายการเสื้อที่รอจัดส่ง
              </div>
            ) : (
              <div className="grid gap-3">
                {items.map((item, index) => {
                  if (item.isInactive) return null;
                  const pendingQty = item.requestedQty - item.shippedQty;

                  let stockColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                  let stockText = `มีสต๊อกพอ (${item.currentStock} ชิ้น)`;

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
                              max={Math.min(item.requestedQty, item.currentStock)}
                              value={String(item.shippedQty)}
                              onChange={(value) => handleShippedQtyChange(index, value)}
                              className="h-9 w-16 text-center rounded-lg border border-[#CBD5E1] text-sm font-black text-[#002B5B] focus:border-[#002B5B] focus:ring-2 focus:ring-[#DCE8FF] outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#64748B]">ยังไม่ส่ง</p>
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
  onItemStatusChange,
  onDelete,
  statusLoadingId = '',
  deleteLoadingId = '',
  onShipClick,
  clothingConfig = [],
}) {
  const isUpdatingStatus = Boolean(batch && statusLoadingId === batch.batchId);
  const isDeleting = Boolean(batch && deleteLoadingId === batch.batchId);
  const isBusy = isUpdatingStatus || isDeleting;
  function confirmDelete() {
    if (batch && !isBusy) onDelete(batch.batchId);
  }

  const hasNoPendingItems =
    batch &&
    batch.orders
      .flatMap((o) => o.items)
      .every((item) => [ORDER_STATUS_DELIVERED, ORDER_STATUS_CANCELED].includes(item.status));
  const shirtSummaryRows = useMemo(() => buildBatchItemSummary(batch), [batch]);

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
                  {!hasNoPendingItems && (
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
                <section className="mb-4 overflow-hidden rounded-xl border border-[#DCE6F4] bg-white">
                  <div className="flex min-w-0 items-center justify-between gap-3 bg-[#EEF4FF] px-3 py-3 sm:px-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-[#071638]">สรุปรายการเสื้อ</h3>
                      <p className="mt-1 text-xs font-bold text-[#64748B]">
                        รวมตามเสื้อ เพศ ไซส์ และจำนวน
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-[#002B5B]">
                      {getBatchPieces(batch)} ชิ้น
                    </span>
                  </div>
                  <div className="grid gap-2 p-3 sm:hidden">
                    {shirtSummaryRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-[#F8FAFC] p-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-extrabold text-[#071638]">
                            {row.type}
                          </p>
                          <p className="mt-1 text-xs font-bold text-[#64748B]">
                            {row.gender} · ไซส์ {row.size}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-sm font-extrabold text-[#002B5B]">
                          {row.qty} ชิ้น
                        </p>
                      </div>
                    ))}
                  </div>
                  <table className="hidden w-full table-fixed text-left text-sm sm:table">
                    <thead className="text-xs font-bold text-[#44536A]">
                      <tr>
                        <th className="px-3 py-3 sm:px-4">เสื้อ</th>
                        <th className="w-24 px-3 py-3 sm:w-28 sm:px-4">เพศ</th>
                        <th className="w-20 px-3 py-3 sm:w-24 sm:px-4">ไซส์</th>
                        <th className="w-20 px-3 py-3 text-right sm:w-24 sm:px-4">จำนวน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shirtSummaryRows.map((row) => (
                        <tr key={row.id} className="border-t border-[#E2E8F0]">
                          <td className="break-words px-3 py-3 font-bold sm:px-4">{row.type}</td>
                          <td className="break-words px-3 py-3 sm:px-4">{row.gender}</td>
                          <td className="break-words px-3 py-3 sm:px-4">{row.size}</td>
                          <td className="px-3 py-3 text-right font-extrabold sm:px-4">
                            {row.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
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
                            <BatchItemMobileCard
                              key={`${order.name}-${item.type}-${item.size}-${itemIdx}`}
                              batch={batch}
                              order={order}
                              item={item}
                              isBusy={isBusy}
                              clothingConfig={clothingConfig}
                              onItemStatusChange={onItemStatusChange}
                            />
                        ))}
                      </div>
                      <table className="batch-items-table hidden w-full text-left text-sm sm:table">
                        <colgroup>
                          <col className="batch-items-type-col" />
                          <col className="batch-items-size-col" />
                          <col className="batch-items-qty-col" />
                          <col className="batch-items-status-col" />
                        </colgroup>
                        <thead className="text-xs font-bold text-[#44536A]">
                          <tr>
                            <th className="px-3 py-3 sm:px-4">ประเภท</th>
                            <th className="w-16 px-3 py-3 sm:w-20 sm:px-4">ไซส์</th>
                            <th className="w-16 px-3 py-3 text-right sm:w-20 sm:px-4">จำนวน</th>
                            <th className="w-28 px-3 py-3 text-center sm:w-32 sm:px-4">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => {
                            const requested = Number(item.qty || 0);
                            const gender = order.gender || GENDERS[0];
                            const clothing = clothingConfig.find((c) => c.type === item.type);
                            const rows = clothing?.genderSizeRows?.[gender] || clothing?.sizeRows || [];
                            const stockRow = rows.find((row) => String(row.size) === String(item.size));
                            const currentStock =
                              item.size === OTHER_SIZE ? requested : Number(stockRow?.qty || 0);
                            const currentStatus = item.status || ORDER_STATUS_PENDING;
                            const canShip =
                              currentStatus === ORDER_STATUS_DELIVERED ||
                              item.size === OTHER_SIZE ||
                              currentStock >= requested;
                            return (
                            <tr
                              key={`${order.name}-${item.type}-${item.size}`}
                              className={cn(
                                'border-t border-[#E2E8F0]',
                                !canShip &&
                                  currentStatus !== ORDER_STATUS_DELIVERED &&
                                  currentStatus !== ORDER_STATUS_CANCELED &&
                                  'bg-[#FEF2F2]'
                              )}
                            >
                              <td className="break-words px-3 py-3 font-bold sm:px-4">
                                {item.type}
                              </td>
                              <td className="break-words px-3 py-3 sm:px-4">{item.size}</td>
                              <td className="px-3 py-3 text-right font-extrabold sm:px-4">
                                {item.qty}
                              </td>
                              <td className="px-3 py-3 text-center sm:px-4">
                                <div className="batch-item-status-cell">
                                  <StatusBadge status={currentStatus} />
                                  <div className="batch-item-status-actions">
                                    <button
                                      type="button"
                                      disabled={isBusy || currentStatus === ORDER_STATUS_DELIVERED || !canShip}
                                      onClick={() =>
                                        onItemStatusChange?.(batch, order, item, ORDER_STATUS_DELIVERED)
                                      }
                                      title={!canShip ? `สต๊อกไม่พอ (มี ${currentStock})` : 'อัปเดตเป็นจัดส่งแล้ว'}
                                    >
                                      จัดส่งแล้ว
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy || currentStatus === ORDER_STATUS_PENDING}
                                      onClick={() =>
                                        onItemStatusChange?.(batch, order, item, ORDER_STATUS_PENDING)
                                      }
                                    >
                                      รอจัดส่ง
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy || currentStatus === ORDER_STATUS_CANCELED}
                                      onClick={() =>
                                        onItemStatusChange?.(batch, order, item, ORDER_STATUS_CANCELED)
                                      }
                                    >
                                      ยกเลิก
                                    </button>
                                  </div>
                                  {!canShip &&
                                    currentStatus !== ORDER_STATUS_DELIVERED &&
                                    currentStatus !== ORDER_STATUS_CANCELED && (
                                    <span className="understock-flag">สต๊อกไม่พอ (มี {currentStock})</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                            );
                          })}
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

function getBatchPieces(batch) {
  return flattenBatches([batch]).reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function buildBatchItemSummary(batch) {
  if (!batch) return [];
  const summaryByKey = new Map();

  for (const order of batch.orders) {
    for (const item of order.items) {
      const type = item.type || '-';
      const gender = order.gender || '-';
      const size = item.size || '-';
      const key = `${type}\u0000${gender}\u0000${size}`;
      const current = summaryByKey.get(key) || {
        id: key,
        type,
        gender,
        size,
        qty: 0,
      };
      current.qty += Number(item.qty || 0);
      summaryByKey.set(key, current);
    }
  }

  return Array.from(summaryByKey.values()).sort(
    (a, b) =>
      a.type.localeCompare(b.type, 'th', { numeric: true }) ||
      a.gender.localeCompare(b.gender, 'th', { numeric: true }) ||
      a.size.localeCompare(b.size, 'th', { numeric: true })
  );
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

function buildDashboardMetrics(batches) {
  const rows = flattenBatches(batches);
  const companies = new Set(batches.map((batch) => batch.companyName || '').filter(Boolean));
  return {
    totalCompanies: companies.size,
    totalEmployees: batches.reduce((sum, batch) => sum + batch.orders.length, 0),
    totalPieces: rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
    pendingPieces: rows
      .filter((row) => (row.itemStatus || row.status) === ORDER_STATUS_PENDING)
      .reduce((sum, row) => sum + Number(row.qty || 0), 0),
    shippedPieces: rows
      .filter((row) => (row.itemStatus || row.status) === ORDER_STATUS_DELIVERED)
      .reduce((sum, row) => sum + Number(row.qty || 0), 0),
    canceledPieces: rows
      .filter((row) => (row.itemStatus || row.status) === ORDER_STATUS_CANCELED)
      .reduce((sum, row) => sum + Number(row.qty || 0), 0),
    pendingBatches: batches.filter((batch) => batch.status === ORDER_STATUS_PENDING).length,
    deliveredBatches: batches.filter((batch) => batch.status === ORDER_STATUS_DELIVERED).length,
    canceledBatches: batches.filter((batch) => batch.status === ORDER_STATUS_CANCELED).length,
  };
}

export default function AppRoot() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

