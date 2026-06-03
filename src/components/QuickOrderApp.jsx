import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Ruler,
  Search,
  Send,
  Shirt,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { cn, digitsOnly, phoneDigitsOnly, formatPhone, genderSymbol, PHONE_LENGTH } from '../lib/utils';
import { toast } from 'sonner';
import {
  getClothingTypes,
  getSizeOptions,
  getSizeOptionsWithLabels,
  patchSizeWithDefaultQty,
  GENDERS,
  OTHER_SIZE,
} from '../lib/config';
import {
  ORDER_STATUS_PENDING,
  buildOrderSummaryRows,
  canDeleteEmployee,
  createInitialOrderState,
  getEmployeeMissingFields,
  hasEmployeeData,
  isEmployeeComplete,
  orderReducer,
} from '../lib/orderState';
import { BRANCHES } from '../constants/branches';
import { OrderHeader, Field, TextInput, GridInput, TextArea, Select, GridSelect } from '.';
import { ConfirmDialog, SizeReference } from './SharedDialogs';

function QuickOrderApp({ gasConfigured, onOpenDashboard, branches = BRANCHES, branchesLoading = false }) {
  const effectiveBranches = Array.isArray(branches) && branches.length ? branches : BRANCHES;
  const [sizeOpen, setSizeOpen] = useState(false);
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

export default QuickOrderApp;

