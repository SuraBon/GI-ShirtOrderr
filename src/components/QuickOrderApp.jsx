import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
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
  Users,
  X,
} from 'lucide-react';
import { cn, csvCell, digitsOnly, formatPhone, genderSymbol, PHONE_LENGTH } from '../lib/utils';
import { toast } from 'sonner';
import {
  getClothingTypes,
  getSizeOptions,
  readClothingConfig,
  GENDERS,
  OTHER_SIZE,
} from '../lib/config';
import {
  ORDER_STATUS_PENDING,
  buildOrderSummaryRows,
  createInitialOrderState,
  getEmployeeMissingFields,
  hasEmployeeData,
  isEmployeeComplete,
  orderReducer,
} from '../lib/orderState';
import { BRANCHES } from '../constants/branches';
import { OrderHeader, TextInput, Select } from '.';
import { SizeReference } from './SharedDialogs';
import { QuickOrderSetupPanel } from './quick-order/QuickOrderSetupPanel';
import { QuickOrderDialog } from './quick-order/QuickOrderDialog';
import { QuickEmployeeTable } from './quick-order/QuickEmployeeTable';
import { QuickMobileList, QuickMobileEditor } from './quick-order/QuickMobileList';

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
  const csvValidCount = csvPreview.filter((row) => row.isValid).length;
  const csvInvalidCount = Math.max(0, csvPreview.length - csvValidCount);

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

    // Check quantity bounds (max 10 shirts per row)
    const employeeWithExcessiveQty = state.employees.find((employee) =>
      employee.items.some((item) => Number(item.qty || 0) > 10)
    );
    if (employeeWithExcessiveQty) {
      const index = state.employees.findIndex((employee) => employee.id === employeeWithExcessiveQty.id) + 1;
      const itemWithExcessiveQty = employeeWithExcessiveQty.items.find((item) => Number(item.qty || 0) > 10);
      toast.error(`จำนวนสั่งเบิกในลำดับที่ ${index} เกินกำหนด`, {
        description: `${itemWithExcessiveQty.type} สั่งเบิกเกินขีดจำกัด (สูงสุด 10 ตัวต่อคน)`
      });
      jumpToEmployee(employeeWithExcessiveQty.id);
      return false;
    }

    // Client-side stock aggregation and verification
    const currentConfig = readClothingConfig();
    const aggregated = {};
    state.employees.forEach((employee) => {
      employee.items.forEach((item) => {
        if (!item.size || item.size === OTHER_SIZE) return;
        const key = `${item.type}::${employee.gender}::${item.size}`;
        aggregated[key] = (aggregated[key] || 0) + Number(item.qty || 0);
      });
    });

    const stockIssues = [];
    Object.entries(aggregated).forEach(([key, requested]) => {
      const [type, gender, size] = key.split('::');
      const clothing = currentConfig.find((c) => c.type === type);
      const rows = clothing?.genderSizeRows?.[gender] || clothing?.sizeRows || [];
      const row = rows.find((r) => String(r.size).trim() === String(size).trim());
      const available = row ? Number(row.qty || 0) : 0;
      if (available < requested) {
        stockIssues.push(`- ${type} ไซส์ ${size} (${gender}): คงเหลือ ${available} ตัว (สั่งเบิกรวม ${requested} ตัว)`);
      }
    });

    if (stockIssues.length > 0) {
      toast.warning('เสื้อบางประเภทมีสต๊อกไม่พอเบิกในขณะนี้ แต่ท่านยังสามารถส่งคำขอเบิกเสื้อได้ โดยระบบจะจัดส่งรายการเบิกให้แอดมินพิจารณาจัดสรร', {
        description: stockIssues.join('\n'),
        style: { whiteSpace: 'pre-line' },
        duration: 8000,
      });
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
    const loadingToastId = toast.loading('กำลังส่งรายการเบิกเสื้อ...', {
      description: 'ระบบกำลังบันทึกรายการเบิก กรุณารอสักครู่',
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
            const json = await res.json().catch(() => null);
            if (!res.ok || json?.success === false) throw new Error(json?.error || 'บันทึกรายการเบิกไม่สำเร็จ');
            return json;
          } catch (err) {
            lastErr = err;
            // small backoff before retry
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          } finally {
            clearTimeout(id);
          }
        }
        throw lastErr;
      };

      await submitOrderRequest(payload);
      toast.success('บันทึกรายการเบิกเสื้อแล้ว', { id: loadingToastId });
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
    const availableTypes = getClothingTypes();
    const templateRows = [
      ['ชื่อ-นามสกุล', 'เพศ', 'แบบเสื้อ', 'ไซส์', 'จำนวน', 'รายชื่อเสื้อทั้งหมด (อ้างอิง)'],
      ...availableTypes.map((type, index) => {
        const gender = GENDERS[index % GENDERS.length];
        const size = getSizeOptions(type, gender).find((option) => option !== OTHER_SIZE) || '';
        return [`ตัวอย่าง ${index + 1}`, gender, type, size, '1', type];
      }),
    ];
    const csvContent = `\ufeff${templateRows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
    
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
      if (!garmentType) {
        rowErrors.push('ไม่ได้ระบุแบบเสื้อ');
      } else if (!clothingTypes.includes(garmentType)) {
        rowErrors.push(`ไม่รู้จักแบบเสื้อ "${garmentType}"`);
      }
      if (!size) {
        rowErrors.push('ไม่ได้ระบุไซส์');
      } else if (gender && garmentType) {
        const allowedSizes = getSizeOptions(garmentType, gender);
        if (!allowedSizes.includes(size)) {
          rowErrors.push(`ไซส์ ${size} ไม่มีสำหรับ ${garmentType} (${gender})`);
        }
      }

      parsed.push({
        rowNum,
        name,
        gender,
        items: garmentType ? [{ id: crypto.randomUUID(), type: garmentType, size, qty, customSize: '' }] : [],
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
              <div className="flex justify-between"><span className="text-neutral-400 font-medium">ผู้ติดต่อ:</span><span>คุณ{successData.supervisorName}</span></div>
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
                        "quick-order-tab-button flex flex-1 items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer border sm:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs",
                        activeTab === tab.id 
                          ? "quick-order-tab-button-active bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10" 
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
                              title={editingCardId !== employee.id ? "คลิกเพื่อแก้ไขรายชื่อนี้" : undefined}
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
                                                      id: crypto.randomUUID(),
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
                                                <div key={item.id} className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2 animate-fade-in">
                                                  <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 min-w-0">
                                                      <Select
                                                        value={item.type}
                                                        onChange={(val) =>
                                                          dispatch({
                                                            type: 'patchItem',
                                                            id: employee.id,
                                                            itemId: item.id,
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
                                                            itemId: item.id,
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
                                                          itemId: item.id,
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
                                          <div key={item.id || itemIdx} className="text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-100 rounded px-2 py-1 flex items-center justify-between animate-fade-in">
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
                        <p className="text-xs text-neutral-500 font-semibold mt-0.5">ดาวน์โหลดไฟล์ตัวอย่าง กรอกรายชื่อผู้เบิกแล้วอัปโหลดกลับเข้าระบบ</p>
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
                            className="quick-order-action-button quick-order-action-secondary mt-4 inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-[#002B5B] text-[#002B5B] hover:bg-[#002B5B]/5 text-xs font-extrabold transition shadow-xs cursor-pointer"
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
                          <label className="quick-order-action-button quick-order-action-primary mt-4 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-[#002B5B] text-white hover:bg-[#001f42] text-xs font-extrabold cursor-pointer transition shadow-xs">
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
                            <span className="text-xs sm:text-sm font-extrabold text-[#44536A]">
                              ตัวอย่างข้อมูลนำเข้า 5 แถวแรก · ถูกต้อง {csvValidCount} · ต้องแก้ {csvInvalidCount}
                            </span>
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
                                {csvPreview.slice(0, 5).map((row) => (
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
                          {csvPreview.length > 5 && (
                            <p className="bg-white px-4 py-2 text-xs font-bold text-[#64748B]">
                              แสดงตัวอย่าง 5 จาก {csvPreview.length} รายการ ระบบจะนำเข้าเฉพาะแถวที่ถูกต้องเมื่อกดยืนยัน
                            </p>
                          )}
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
                    className="quick-order-action-button quick-order-action-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-5 py-2.5 font-bold transition cursor-pointer"
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
                    className="quick-order-action-button quick-order-action-primary flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-[#002B5B] text-white hover:bg-[#001f42] px-6 py-2.5 font-extrabold transition shadow-md active:scale-95 cursor-pointer"
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
                    className="quick-order-action-button quick-order-action-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-5 py-2.5 font-bold transition disabled:opacity-50 cursor-pointer"
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
                    "quick-order-action-button quick-order-action-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 font-extrabold text-white transition shadow-md active:scale-95 text-base cursor-pointer",
                    (gasConfigured && !isSubmitting)
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-neutral-300 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin size-4 mr-2" />
                      <span>กำลังบันทึก...</span>
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

export default QuickOrderApp;

