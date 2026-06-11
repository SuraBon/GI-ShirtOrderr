import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  MoreHorizontal,
  Settings2,
} from 'lucide-react';
import {
  cn,
  formatDashboardDate,
  formatMonthLabel,
  formatMonthInputValue,
  getMonthKey,
  getMonthKeyFromInput,
  uniqueSorted,
  csvCell,
  buildCsvFilename,
} from '../lib/utils';
import { readClothingConfig, GENDERS, OTHER_SIZE, CLOTHING_CONFIG_UPDATED_AT_KEY, publishSharedClothingConfig, loadSharedClothingConfig, saveClothingConfig } from '../lib/config';
import {
  EMPLOYEE_TABLE_COLUMNS,
  ORDER_TABLE_COLUMNS,
  readDashboardTableColumns,
  writeDashboardTableColumns,
} from '../lib/dashboardTableColumns';
import { isAuthFailure, authFetch, setAdminToken } from '../lib/api';
import {
  applyStockMovement,
  getStockLedgerSummary,
  findStockIssuesForStatusChange,
  adjustStockForStatusChange,
  getClothingStockRows,
  setClothingStockRows,
} from '../lib/stockHelpers';
import { DashboardDataNotice, DashboardPageSkeleton, MiniMetric, SkeletonDashboard, StatusBadge } from './DashboardCommon';
import { ORDER_STATUS_CANCELED, ORDER_STATUS_DELIVERED, ORDER_STATUS_PENDING, ORDER_STATUSES, flattenBatches, normalizeBatch, normalizeOrderStatus } from '../lib/orderState';
import { BRANCHES } from '../constants/branches';
import { DashboardOverview, Field, Select, TextInput, BranchManager, InventoryManager } from '.';
import { ConfirmDialog, ColumnSettingsDialog } from './SharedDialogs';
import { DashboardInlineEmptyState } from './DashboardWorkflowPanels';
import { PartialShipmentDialog } from './dashboard/PartialShipmentDialog';
import { BatchDetailDialog } from './dashboard/BatchDetailDialog';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

function getDashboardLoadErrorDescription(error) {
  const message = String(error?.message || '');
  if (message.includes('not configured') || message.includes('YOUR_SCRIPT_URL')) {
    return 'ยังไม่ได้ตั้งค่า VITE_GAS_URL หรือ GAS_ADMIN_TOKEN สำหรับอ่านข้อมูลจริงจาก Google Sheets';
  }
  if (message.includes('Invalid dashboard data') || message.includes('รูปแบบข้อมูลแดชบอร์ด') || message.includes('รูปแบบข้อมูลหน้าจัดการ')) {
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

const DASHBOARD_FILTER_KEYS = {
  orders: 'gi-dashboard-orders-filters',
  employees: 'gi-dashboard-employees-filters',
};

function readDashboardFilters(view = 'orders') {
  try {
    const raw = localStorage.getItem(DASHBOARD_FILTER_KEYS[view]);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeDashboardFilters(view, filters) {
  if (!DASHBOARD_FILTER_KEYS[view]) return;
  localStorage.setItem(DASHBOARD_FILTER_KEYS[view], JSON.stringify(filters));
}

function clearDashboardFilters(view) {
  if (!DASHBOARD_FILTER_KEYS[view]) return;
  localStorage.removeItem(DASHBOARD_FILTER_KEYS[view]);
}

function Dashboard({
  activeView = 'orders',
  branches = BRANCHES,
  refreshBranches,
  onAuthExpired,
  onViewChange,
  onOpenOrder,
  onSyncStateChange,
}) {
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
  const initialFilters = readDashboardFilters('orders');
  const [branchFilter, setBranchFilter] = useState(initialFilters.branchFilter || 'ทุกสาขา');
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter || 'ทุกสถานะ');
  const [query, setQuery] = useState(initialFilters.query || '');
  const [monthFilter, setMonthFilter] = useState(() => initialFilters.monthFilter || formatMonthLabel(new Date()));
  const [exportBranchFilter, setExportBranchFilter] = useState('ทุกสาขา');
  const [exportStartMonth, setExportStartMonth] = useState(() => formatMonthInputValue(new Date()));
  const [exportEndMonth, setExportEndMonth] = useState(() => formatMonthInputValue(new Date()));
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [deleteConfirmBatchId, setDeleteConfirmBatchId] = useState('');
  const [exportExpanded, setExportExpanded] = useState(false);
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

  async function loadData({ silent = false, force = false } = {}) {
    if (refreshing) return;
    onSyncStateChange?.({ status: 'loading', updatedAt: null, label: 'กำลังโหลด' });
    const showSkeleton = !silent && !batches.length;
    if (showSkeleton) setLoading(true);
    setRefreshing(true);
    const loadingToastId = silent
      ? toast.loading('กำลังโหลดข้อมูล...', { description: 'ระบบกำลังเตรียมข้อมูล กรุณารอสักครู่' })
      : null;
    try {
      const response = await authFetch(`/api/dashboard/orders${force ? '?force=1' : ''}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result?.success === false)
        throw new Error(result?.error || 'โหลดข้อมูลจาก Google Sheets ไม่สำเร็จ');
      const data = Array.isArray(result) ? result : result?.data;
      if (!Array.isArray(data)) throw new Error('รูปแบบข้อมูลหน้าจัดการไม่ถูกต้อง');
      const remoteBatches = data.map(normalizeBatch).filter((batch) => batch.orders.length);
      setBatches(remoteBatches);
      setDataError('');
      onSyncStateChange?.({ status: 'success', updatedAt: new Date().toISOString(), label: 'ซิงก์แล้ว' });
      if (loadingToastId) toast.success('โหลดข้อมูลหน้าจัดการแล้ว', { id: loadingToastId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ', {
          id: loadingToastId || undefined,
          description: 'กรุณาเข้าสู่หน้าจัดการใหม่อีกครั้ง',
        });
        return;
      }
      if (!batches.length) setBatches([]);
      setDataError(error?.message || 'ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้');
      onSyncStateChange?.({ status: 'error', updatedAt: new Date().toISOString(), label: 'ซิงก์ไม่สำเร็จ' });
      toast.error('โหลดข้อมูลหน้าจัดการไม่สำเร็จ', {
        id: loadingToastId || undefined,
        description: getDashboardLoadErrorDescription(error),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(
    () => () => {
      Object.values(pagingTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    },
    []
  );

  useEffect(() => {
    function handleDashboardRefresh() {
      loadData({ silent: true, force: true });
    }
    window.addEventListener('gi-dashboard-refresh', handleDashboardRefresh);
    return () => window.removeEventListener('gi-dashboard-refresh', handleDashboardRefresh);
  });

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
    if (activeView !== 'orders' && activeView !== 'employees') return;
    const saved = readDashboardFilters(activeView);
    const savedBranch =
      saved.branchFilter && (saved.branchFilter === 'ทุกสาขา' || effectiveBranches.includes(saved.branchFilter))
        ? saved.branchFilter
        : 'ทุกสาขา';
    const savedStatus =
      saved.statusFilter && (saved.statusFilter === 'ทุกสถานะ' || ORDER_STATUSES.includes(saved.statusFilter))
        ? saved.statusFilter
        : 'ทุกสถานะ';
    const savedMonth =
      saved.monthFilter && monthFilterOptions.includes(saved.monthFilter)
        ? saved.monthFilter
        : monthFilterOptions[0] || 'ทุกเดือน';
    setBranchFilter(savedBranch);
    setStatusFilter(savedStatus);
    setMonthFilter(savedMonth);
    setQuery(saved.query || '');
  }, [activeView, effectiveBranches, monthFilterOptions]);

  useEffect(() => {
    if (activeView !== 'orders' && activeView !== 'employees') return;
    writeDashboardFilters(activeView, {
      branchFilter,
      statusFilter,
      monthFilter,
      query,
    });
  }, [activeView, branchFilter, statusFilter, monthFilter, query]);

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

  function resetDashboardFilters() {
    clearDashboardFilters(activeView);
    setBranchFilter('ทุกสาขา');
    setStatusFilter('ทุกสถานะ');
    setMonthFilter(monthFilterOptions[0] || 'ทุกเดือน');
    setQuery('');
    setOrderPage(1);
    setEmployeePage(1);
  }

  async function syncDashboardAction(payload) {
    onSyncStateChange?.({ status: 'saving', updatedAt: null, label: 'กำลังบันทึก' });
    const expectedUpdatedAt = localStorage.getItem(CLOTHING_CONFIG_UPDATED_AT_KEY) || null;
    const body = { ...payload, expectedUpdatedAt };
    try {
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
      onSyncStateChange?.({ status: 'success', updatedAt: new Date().toISOString(), label: 'บันทึกแล้ว' });
    } catch (error) {
      onSyncStateChange?.({ status: 'error', updatedAt: new Date().toISOString(), label: 'บันทึกไม่สำเร็จ' });
      throw error;
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData();
  }, []);

  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === CLOTHING_CONFIG_UPDATED_AT_KEY || event.key === 'gi-shirt-clothing-config') {
        setClothingConfig(readClothingConfig());
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
    const desiredActiveByKey = new Map(
      shipmentItems.map((item) => [
        [item.employeeName, item.gender, item.type, item.size].join('::'),
        Number(item.shippedQty || 0) + Number(item.pendingQty || 0),
      ])
    );

    return batch.orders.flatMap((order) => {
      const gender = order.gender || GENDERS[0];
      return order.items
        .map((item) => {
          const requestedQty = Number(item.qty || 0);
          const currentActiveQty = (item.status === ORDER_STATUS_DELIVERED || item.status === ORDER_STATUS_PENDING) ? requestedQty : 0;
          const key = [order.name, gender, item.type, item.size].join('::');
          const desiredActiveQty = desiredActiveByKey.has(key)
            ? Number(desiredActiveByKey.get(key) || 0)
            : currentActiveQty;

          return {
            employeeName: order.name,
            gender,
            type: item.type,
            size: item.size,
            delta: desiredActiveQty - currentActiveQty,
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

    const nextConfig = adjustStockForStatusChange(latestConfig, batch, status);
    const hasStockChanges = nextConfig !== latestConfig;

    if (hasStockChanges) {
      try {
        await publishSharedClothingConfig(nextConfig);
        setClothingConfig(nextConfig);
        saveClothingConfig(nextConfig);
      } catch (error) {
        if (isAuthFailure(error)) {
          setAdminToken('');
          onAuthExpired?.();
          toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ', {
            id: loadingToastId,
            description: 'กรุณาเข้าสู่หน้าจัดการใหม่อีกครั้ง',
          });
          setStatusLoadingId('');
          return;
        }
        toast.error('บันทึกสต๊อกไม่สำเร็จ การอัปเดตสถานะถูกยกเลิก', {
          id: loadingToastId,
          description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
        });
        setStatusLoadingId('');
        return;
      }
    }

    try {
      await syncDashboardAction({ action: 'updateStatus', batchId, status, statusUpdatedAt });
    } catch (error) {
      if (hasStockChanges) {
        try {
          await publishSharedClothingConfig(latestConfig);
          setClothingConfig(latestConfig);
          saveClothingConfig(latestConfig);
        } catch (rollbackError) {
          console.error('Failed to rollback stock after Sheets update failure:', rollbackError);
        }
      }
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ', {
          id: loadingToastId,
          description: 'กรุณาเข้าสู่หน้าจัดการใหม่อีกครั้ง',
        });
        setStatusLoadingId('');
        return;
      }
      toast.error('อัปเดตสถานะไม่สำเร็จ (ระบบกู้คืนสต๊อกเรียบร้อย)', {
        id: loadingToastId,
        description: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      });
      setStatusLoadingId('');
      return;
    }

    applyBatchStatusLocally(batchId, status, statusUpdatedAt);
    setStatusLoadingId('');
    toast.success('อัปเดตสถานะรายการเบิกแล้ว', { id: loadingToastId });
  }

  function requestBatchStatusChange(batch, status) {
    if (!batch) return;
    setStatusConfirm({ batch, status });
  }

  async function confirmBatchStatusChange() {
    if (!statusConfirm) return;
    const { batch, status } = statusConfirm;
    setStatusConfirm(null);
    await updateBatchStatus(batch.batchId, status);
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
      if (!batch) throw new Error('ไม่พบรายการเบิกที่ต้องการอัปเดต');
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

      // Deduct shipped quantities from the local stock configuration first
      const nextConfig = applyShipmentStockMovements(latestConfig, stockMovements);
      const hasStockChanges = nextConfig !== latestConfig;

      if (hasStockChanges) {
        await publishSharedClothingConfig(nextConfig);
        setClothingConfig(nextConfig);
        saveClothingConfig(nextConfig);
      }

      try {
        // Update statuses on Google Sheets
        await syncDashboardAction({
          action: 'shipItems',
          batchId,
          items: shipmentItems,
          statusUpdatedAt,
        });
      } catch (sheetsError) {
        // Rollback stock update if Google Sheets fails
        if (hasStockChanges) {
          try {
            await publishSharedClothingConfig(latestConfig);
            setClothingConfig(latestConfig);
            saveClothingConfig(latestConfig);
          } catch (rollbackError) {
            console.error('Failed to rollback stock after partial shipment Sheets failure:', rollbackError);
          }
        }
        throw sheetsError;
      }

      // Reflect the saved sheet update locally without reloading all dashboard rows.
      applyShipmentLocally(batchId, shipmentItems, statusUpdatedAt);

      toast.success('บันทึกการจัดส่งสินค้าเรียบร้อยแล้ว', { id: loadingToastId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ', {
          id: loadingToastId,
          description: 'กรุณาเข้าสู่หน้าจัดการใหม่อีกครั้ง',
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
    const loadingToastId = toast.loading('กำลังลบรายการเบิก...', {
      description: 'ระบบกำลังดำเนินการ กรุณารอสักครู่',
    });
    try {
      await syncDashboardAction({ action: 'deleteBatch', batchId });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ', {
          id: loadingToastId,
          description: 'กรุณาเข้าสู่หน้าจัดการใหม่อีกครั้ง',
        });
        setDeleteLoadingId('');
        return;
      }
      toast.error('ลบรายการเบิกไม่สำเร็จ', {
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
    toast.success('ลบรายการเบิกแล้ว', { id: loadingToastId });
  }

  function requestDeleteBatch(batchId) {
    if (!deleteLoadingId) setDeleteConfirmBatchId(batchId);
  }

  async function confirmDeleteBatch() {
    if (!deleteConfirmBatchId || deleteLoadingId) return;
    await deleteBatch(deleteConfirmBatchId);
    setDeleteConfirmBatchId('');
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
      'เลขที่รายการ',
      'สถานะ',
      'อัปเดตสถานะ',
      'วันที่',
      'ชื่อบริษัท',
      'สาขา',
      'ผู้ติดต่อ',
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
  const refillRows = inventoryRows
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
  const openQuickShipment = (batch) => {
    setSelectedBatch(batch);
    setShipmentDialogOpen(true);
  };
  const renderOrderActions = (batch) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="dashboard-table-menu-trigger"
          onClick={(event) => event.stopPropagation()}
          aria-label={`จัดการ ${batch.batchId}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setSelectedBatch(batch);
            }}
          >
            ดูรายละเอียด
          </DropdownMenuItem>
          {batch.status === ORDER_STATUS_PENDING && (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                openQuickShipment(batch);
              }}
            >
              จัดส่งด่วน
            </DropdownMenuItem>
          )}
          {ORDER_STATUSES.map((status) => (
            <DropdownMenuItem
              key={status}
              disabled={batch.status === status || statusLoadingId === batch.batchId}
              onSelect={(event) => {
                event.preventDefault();
                requestBatchStatusChange(batch, status);
              }}
            >
              เปลี่ยนเป็น {status}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            variant="destructive"
            disabled={deleteLoadingId === batch.batchId}
            onSelect={(event) => {
              event.preventDefault();
              requestDeleteBatch(batch.batchId);
            }}
          >
            ลบรายการ
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {dataError && (
        <DashboardDataNotice
          message={getDashboardLoadErrorDescription({ message: dataError })}
          detail="หน้าจัดการจะแสดงเฉพาะข้อมูลจริงจาก Google Sheets เท่านั้น ไม่มีการดึงข้อมูลรายการเบิกจากเครื่องนี้"
          onRetry={() => loadData({ silent: true, force: true })}
          refreshing={refreshing}
        />
      )}

      {activeView === 'dashboard' && (
        <section className="dashboard-overview-page">
          <DashboardOverview
            metrics={metrics}
            filteredBatches={filteredBatches}
            itemRows={rows}
            stockSummaryRows={stockSummaryRows}
            statuses={{
              pending: ORDER_STATUS_PENDING,
              delivered: ORDER_STATUS_DELIVERED,
              canceled: ORDER_STATUS_CANCELED,
            }}
            onViewChange={onViewChange}
            onOpenOrder={onOpenOrder}
            onQuickShip={openQuickShipment}
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
        <aside className="dashboard-filter-rail">
          <div className="dashboard-panel-title">
            <h2>ตัวกรอง</h2>
            <button type="button" className="dashboard-filter-reset" onClick={resetDashboardFilters}>
              ล้างตัวกรอง
            </button>
          </div>
          <div className="dashboard-filter-body">
            <div className="dashboard-filter-grid">
              <Field label="สาขา">
                <Select value={branchFilter} onChange={setBranchFilter} values={['ทุกสาขา', ...effectiveBranches]} compact />
              </Field>
              <Field label="เดือน">
                <Select value={monthFilter} onChange={setMonthFilter} values={monthFilterOptions} compact />
              </Field>
              <Field label="สถานะ">
                <Select value={statusFilter} onChange={setStatusFilter} values={['ทุกสถานะ', ...ORDER_STATUSES]} compact />
              </Field>
              <Field label="ค้นหา">
                <TextInput
                  value={query}
                  onChange={setQuery}
                  placeholder="เลขที่รายการ, ผู้ติดต่อ, เบอร์โทร"
                />
              </Field>
            </div>
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
              <button type="button" className="dashboard-icon-action" onClick={() => setColumnSettingsTable('orders')} title="ตั้งค่าคอลัมน์ตาราง" aria-label="ตั้งค่าคอลัมน์ตาราง">
                <Settings2 className="size-4" />
                <span>คอลัมน์</span>
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

          {!isOrderPageLoading && !filteredBatches.length && (
            <DashboardInlineEmptyState
              title="ไม่มีรายการในขณะนี้"
              description="ข้อมูลเดโม่ชุดนี้ยังไม่มีรายการเบิกตามตัวกรอง เปิดหน้าสั่งเบิกเสื้อเพื่อสร้างรายการแรก"
              onOpenOrder={onOpenOrder}
            />
          )}

          {isOrderPageLoading ? (
            <DashboardPageSkeleton rows={Math.min(orderPageSize, Math.max(3, orderRows.length || 3))} />
          ) : orderRows.length === 0 ? (
            <div className="text-center text-slate-500 py-8">ไม่มีรายการในขณะนี้</div>
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
                          {isOrderColumnVisible('code') && <th>เลขที่รายการ</th>}
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
                            className={cn('dashboard-clickable-row', batch.status === ORDER_STATUS_PENDING && 'is-pending')}
                            tabIndex={0}
                            aria-expanded={expandedBatchIds.has(batch.batchId)}
                            onClick={() => toggleBatchExpanded(batch.batchId)}
                            onKeyDown={(event) => handleBatchRowKeyDown(event, batch.batchId)}
                          >
                            {isOrderColumnVisible('code') && (
                            <td>
                              <span className="dashboard-link dashboard-row-open" title={String(batch.batchId)}>
                                <span>{String(batch.batchId)}</span>
                                {expandedBatchIds.has(batch.batchId) ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )}
                              </span>
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
                            <td className="dashboard-row-actions">{renderOrderActions(batch)}</td>
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
                                              <td className="text-left px-3 py-2.5">{order.name}</td>
                                              <td className="text-left px-3 py-2.5">{order.gender}</td>
                                              <td className="text-left px-3 py-2.5 font-semibold text-slate-700">{item.type}</td>
                                              <td className="text-right px-3 py-2.5 font-bold">{item.size}</td>
                                              <td className="text-right px-3 py-2.5 font-extrabold text-slate-800">
                                                {requested}
                                                {understock && (
                                                  <div className="text-[10px] text-red-600 font-bold mt-0.5">สต๊อกไม่พอ (มี {available})</div>
                                                )}
                                              </td>
                                              <td>
                                                <div className="batch-item-status-cell">
                                                  <StatusBadge status={item.status || batch.status} small />
                                                  <div className="flex flex-row items-center gap-2 flex-nowrap mt-1">
                                                    <button
                                                      type="button"
                                                      className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                                                      className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                                                      className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                                              <td className="text-left px-3 py-2.5 text-slate-500 text-xs">{formatDashboardDate(item.statusUpdatedAt || batch.statusUpdatedAt || batch.submittedAt)}</td>
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
                  {isOrderColumnVisible('code') && <th>เลขที่รายการ</th>}
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
                      className={cn('dashboard-clickable-row', batch.status === ORDER_STATUS_PENDING && 'is-pending')}
                      tabIndex={0}
                      aria-expanded={expandedBatchIds.has(batch.batchId)}
                      onClick={() => toggleBatchExpanded(batch.batchId)}
                      onKeyDown={(event) => handleBatchRowKeyDown(event, batch.batchId)}
                    >
                    {isOrderColumnVisible('code') && (
                    <td>
                      <span className="dashboard-link dashboard-row-open" title={String(batch.batchId)}>
                        <span>{String(batch.batchId)}</span>
                        {expandedBatchIds.has(batch.batchId) ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </span>
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
                    <td className="dashboard-row-actions">{renderOrderActions(batch)}</td>
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
                                                <td className="text-left px-3 py-2.5">{order.name}</td>
                                              <td className="text-left px-3 py-2.5">{order.gender}</td>
                                              <td className="text-left px-3 py-2.5 font-semibold text-slate-700">{item.type}</td>
                                              <td className="text-right px-3 py-2.5 font-bold">{item.size}</td>
                                                <td className="text-right px-3 py-2.5 font-extrabold text-slate-800">
                                                {requested}
                                                {understock && (
                                                  <div className="text-[10px] text-red-600 font-bold mt-0.5">สต๊อกไม่พอ (มี {available})</div>
                                                )}
                                              </td>
                                                <td>
                                                  <div className="batch-item-status-cell">
                                                    <StatusBadge status={item.status || batch.status} small />
                                                    <div className="flex flex-row items-center gap-2 flex-nowrap mt-1">
                                                    <button
                                                      type="button"
                                                      className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                                                      className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                                                      className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
                                                <td className="text-left px-3 py-2.5 text-slate-500 text-xs">{formatDashboardDate(item.statusUpdatedAt || batch.statusUpdatedAt || batch.submittedAt)}</td>
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
            ) : orderRows.length === 0 ? (
              <div className="text-center text-slate-500 py-8">ไม่มีรายการในขณะนี้</div>
            ) : orderRows.map((batch) => (
              <article
                key={batch.batchId}
                className={cn('dashboard-mobile-order-card', batch.status === ORDER_STATUS_PENDING && 'is-pending')}
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
              <h2>ประวัติการเบิก</h2>
              <p>แสดงจากรายการเบิกเท่านั้น ไม่มีตารางพนักงานแยก</p>
            </div>
            <div className="dashboard-panel-actions">
              <button type="button" className="dashboard-icon-action" onClick={() => setColumnSettingsTable('employees')} title="ตั้งค่าคอลัมน์ตาราง" aria-label="ตั้งค่าคอลัมน์ตาราง">
                <Settings2 className="size-4" />
                <span>คอลัมน์</span>
              </button>
            </div>
          </div>

          {!isEmployeePageLoading && !employeeRows.length && (
            <DashboardInlineEmptyState
              title="ไม่มีรายการในขณะนี้"
              description="หน้านี้สรุปจากรายการเบิกเท่านั้น เมื่อมีรายการเบิก ระบบจะแสดงประวัติที่นี่"
              onOpenOrder={onOpenOrder}
            />
          )}

          <div className="dashboard-panel-summary">
            <MiniMetric label="รายการเบิก" value={employeeRows.length} />
            <MiniMetric label="จำนวนรวม" value={`${metrics.totalPieces} ชิ้น`} />
            <MiniMetric label="รอจัดส่ง" value={`${metrics.pendingPieces} ชิ้น`} />
            <MiniMetric label="จัดส่งแล้ว" value={`${metrics.shippedPieces} ชิ้น`} />
          </div>

          {isEmployeePageLoading ? (
            <DashboardPageSkeleton rows={Math.min(employeePageSize, Math.max(4, pagedEmployeeRows.length || 4))} />
          ) : pagedEmployeeRows.length === 0 ? (
            <div className="text-center text-slate-500 py-8">ไม่มีรายการในขณะนี้</div>
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
            ) : pagedEmployeeRows.length === 0 ? (
              <div className="text-center text-slate-500 py-8">ไม่มีรายการในขณะนี้</div>
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
                    <button
                      type="button"
                      disabled={!rowBatch}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (rowBatch) setSelectedBatch(rowBatch);
                      }}
                    >
                      ดูรายการ
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
            <MiniMetric label="รายการเบิกทั้งหมด" value={filteredBatches.length} />
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
              <h3>รายการที่ควรเติม</h3>
            </div>
            {refillRows.length ? (
              refillRows.map((item) => (
                <p key={item.id}>
                  {item.type} <strong>คงเหลือ {item.total} ชิ้น</strong>
                </p>
              ))
            ) : (
              <p>จำนวนคงเหลืออยู่ในระดับปกติ <strong>{inventoryRows.length} รายการ</strong></p>
            )}
          </div>
        </aside>
      </section>

      {activeView === 'stock' && (
        <section className="dashboard-inventory-manager">
          <InventoryManager
            initialMode="stock"
            modeLocked
            detailsInDialog
            title="สต๊อก"
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

          <div className="branch-manager-shell">
            <BranchManager 
              onSaved={async () => {
                await refreshBranches();
              }} 
            />
          </div>
        </section>
      )}

      <BatchDetailDialog
        batch={selectedBatch}
        onClose={() => setSelectedBatch(null)}
        onStatusChange={(batchId, status) => {
          const batch = batches.find((item) => item.batchId === batchId) || selectedBatch;
          requestBatchStatusChange(batch, status);
        }}
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
        isBusy={statusLoadingId === selectedBatch?.batchId}
      />
      <ConfirmDialog
        open={Boolean(statusConfirm)}
        title="ยืนยันเปลี่ยนสถานะ"
        description={
          statusConfirm
            ? buildStatusConfirmationDescription(statusConfirm.batch, statusConfirm.status)
            : ''
        }
        confirmLabel={statusConfirm?.status || 'ยืนยัน'}
        cancelLabel="ยกเลิก"
        loading={Boolean(statusConfirm && statusLoadingId === statusConfirm.batch.batchId)}
        destructive={statusConfirm?.status === ORDER_STATUS_CANCELED}
        onCancel={() => !statusLoadingId && setStatusConfirm(null)}
        onConfirm={confirmBatchStatusChange}
      />
      <ConfirmDialog
        open={Boolean(deleteConfirmBatch)}
        title="ยืนยันลบรายการเบิก"
        description={deleteConfirmBatch ? buildDeleteConfirmationDescription(deleteConfirmBatch) : ''}
        confirmLabel="ลบรายการ"
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
        title="ตั้งค่าคอลัมน์ประวัติการเบิก"
        columns={EMPLOYEE_TABLE_COLUMNS}
        visibleColumns={visibleEmployeeColumns}
        onChange={setVisibleEmployeeColumns}
        onClose={() => setColumnSettingsTable('')}
      />
    </>
  );

}



function getBatchPieces(batch) {
  return flattenBatches([batch]).reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function buildStatusConfirmationDescription(batch, status) {
  if (!batch) return '';
  const pieces = getBatchPieces(batch);
  const employees = batch.orders.length;
  const lines = [
    `${batch.batchId} · ${batch.companyName || '-'} · ${batch.branch || '-'}`,
    `พนักงาน ${employees} คน · จำนวนรวม ${pieces} ชิ้น`,
    `สถานะใหม่: ${status}`,
  ];
  if (status === ORDER_STATUS_DELIVERED) {
    const summary = buildBatchItemSummary(batch)
      .slice(0, 4)
      .map((row) => `${row.type} ${row.gender} ไซส์ ${row.size}: ${row.qty} ชิ้น`);
    lines.push(`จะตัดสต๊อก: ${summary.join('; ')}${summary.length >= 4 ? '; ...' : ''}`);
  }
  return lines.join('\n');
}

function buildDeleteConfirmationDescription(batch) {
  if (!batch) return '';
  return [
    `${batch.batchId} · ${batch.companyName || '-'} · ${batch.branch || '-'}`,
    `พนักงาน ${batch.orders.length} คน · จำนวนรวม ${getBatchPieces(batch)} ชิ้น`,
    'การลบจะนำรายการนี้ออกจาก Google Sheets หลังยืนยัน',
  ].join('\n');
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

export default Dashboard;




