import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { upload } from '@vercel/blob/client';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { getAdminToken, isAuthFailure, setAdminToken } from '../lib/api';
import {
  GENDERS,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_TYPES,
  normalizeClothingConfig,
  publishSharedClothingConfig,
  loadSharedClothingConfig,
  saveClothingConfig,
} from '../lib/config';
import { applyStockMovement, getStockLedgerSummary } from '../lib/stockHelpers';
import { Field, TextInput } from './FormComponents';
import { ClothingImage } from './ClothingImage';
import { ConfirmDialog } from './SharedDialogs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

function validateImageFile(file) {
  if (!file) return '';
  if (!IMAGE_UPLOAD_TYPES.includes(file.type)) return 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP';
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return 'ขนาดไฟล์ต้องไม่เกิน 10MB';
  return '';
}

async function uploadImageToBlob(file) {
  const token = getAdminToken();
  if (!token) throw new Error('สิทธิ์อัปโหลดหมดอายุ กรุณาเข้าสู่หน้าจัดการใหม่');
  return upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
    clientPayload: JSON.stringify({ token }),
  });
}

async function deleteImageFromBlob(url) {
  const token = getAdminToken();
  if (!token) throw new Error('สิทธิ์ลบรูปหมดอายุ กรุณาเข้าสู่หน้าจัดการใหม่');
  const response = await fetch('/api/blob/delete-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.error || 'ลบรูปเสื้อไม่สำเร็จ');
    error.status = response.status;
    throw error;
  }
}

function getItemStockStats(item, gender) {
  const rows = item?.genderSizeRows?.[gender] || item?.sizeRows || [];
  return rows.reduce(
    (totals, row) => {
      const summary = getStockLedgerSummary(row);
      return {
        totalStock: totals.totalStock + summary.totalStock,
        remaining: totals.remaining + summary.remaining,
        withdrawn: totals.withdrawn + summary.withdrawn,
      };
    },
    { totalStock: 0, remaining: 0, withdrawn: 0 }
  );
}

function createBlankClothingDraft() {
  return {
    type: '',
    detailFields: ['อก'],
    genderSizeRows: GENDERS.reduce(
      (rows, gender) => ({ ...rows, [gender]: [{ size: 'M', details: { อก: '' }, qty: 0 }] }),
      {}
    ),
  };
}

function DeleteClothingDialog({ item, onCancel, onConfirm }) {
  return (
    <Dialog.Root open={Boolean(item)} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-dialog-overlay" />
        <Dialog.Content className="dashboard-confirm-dialog">
          <Dialog.Title>ยืนยันลบแบบเสื้อ</Dialog.Title>
          <Dialog.Description>
            {item ? `ลบแบบเสื้อ "${item.type || 'ยังไม่ระบุชื่อ'}" และข้อมูลไซส์/สต๊อกทั้งหมด?` : ''}
          </Dialog.Description>
          <div className="dashboard-confirm-actions">
            <button type="button" onClick={onCancel}>
              ยกเลิก
            </button>
            <button type="button" className="danger" onClick={onConfirm}>
              ลบแบบเสื้อ
            </button>
          </div>
          <Dialog.Close className="dashboard-dialog-close" aria-label="ปิด">
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function InventoryManager({
  config,
  setConfig,
  onAuthExpired,
  initialMode = 'details',
  modeLocked = false,
  detailsInDialog = false,
  title = 'แบบเสื้อและสต๊อก',
}) {
  const [selectedId, setSelectedId] = useState(() => config[0]?.id || null);
  const [selectedGender, setSelectedGender] = useState(GENDERS[0]);
  const [mode, setMode] = useState(initialMode);
  const [editing, setEditing] = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const [stockAdjustments, setStockAdjustments] = useState({});
  const [deleteClothingId, setDeleteClothingId] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsDialogTab, setDetailsDialogTab] = useState('details');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(() => createBlankClothingDraft());
  const [catalogViewMode, setCatalogViewMode] = useState('card');
  const [stockConfirmOpen, setStockConfirmOpen] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const syncTimerRef = useRef(null);

  const selectedItem = selectedId ? (config.find((item) => item.id === selectedId) || null) : null;
  const deleteClothingItem = config.find((item) => item.id === deleteClothingId);
  const stockRows = selectedItem?.genderSizeRows?.[selectedGender] || selectedItem?.sizeRows || [];
  const detailFields = selectedItem?.detailFields?.length ? selectedItem.detailFields : ['อก'];
  const stockStats = getItemStockStats(selectedItem, selectedGender);
  const allItemStats = config.map((item) => ({
    id: item.id,
    stats: GENDERS.reduce(
      (totals, gender) => {
        const stats = getItemStockStats(item, gender);
        return {
          totalStock: totals.totalStock + stats.totalStock,
          remaining: totals.remaining + stats.remaining,
          withdrawn: totals.withdrawn + stats.withdrawn,
        };
      },
      { totalStock: 0, remaining: 0, withdrawn: 0 }
    ),
  }));
  const sizeDetailGridStyle = {
    '--inventory-size-detail-columns': `minmax(6rem, 0.75fr) repeat(${detailFields.length}, minmax(6rem, 1fr)) 2.5rem`,
  };
  const createRows = createDraft.genderSizeRows?.[selectedGender] || [];
  const createSizeDetailGridStyle = {
    '--inventory-size-detail-columns': `minmax(6rem, 0.75fr) repeat(${createDraft.detailFields.length}, minmax(6rem, 1fr)) 2.5rem`,
  };
  const pendingStockAdjustments = stockRows
    .map((row, index) => {
      const key = getStockAdjustmentKey(index);
      const amount = Number(stockAdjustments[key] || 0);
      return Number.isFinite(amount) && amount !== 0
        ? { key, index, size: row.size || '-', amount }
        : null;
    })
    .filter(Boolean);
  const stockConfirmDescription = pendingStockAdjustments.length
    ? [
        `ยืนยันบันทึกการปรับสต๊อก ${pendingStockAdjustments.length} รายการ`,
        `${selectedItem?.type || 'แบบเสื้อที่เลือก'} · ${selectedGender}`,
        ...pendingStockAdjustments.map(formatStockAdjustmentSummary),
      ].join('\n')
    : '';

  useEffect(() => {
    if (selectedId !== null && !config.some((item) => item.id === selectedId)) {
      setSelectedId(config[0]?.id || null);
    }
  }, [config, selectedId]);

  useEffect(() => () => window.clearTimeout(syncTimerRef.current), []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  function scheduleSync(normalizedConfig) {
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      publishSharedClothingConfig(normalizedConfig).catch((error) => {
        if (isAuthFailure(error)) {
          setAdminToken('');
          onAuthExpired?.();
          toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ');
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

  function confirmDeleteClothing() {
    if (!deleteClothingItem || config.length <= 1) return;
    const deletedItem = deleteClothingItem;
    const imageUrlToDelete = deletedItem.imageUrl;
    const nextConfig = config.filter((current) => current.id !== deletedItem.id);
    const imageStillUsed = imageUrlToDelete && nextConfig.some((item) => item.imageUrl === imageUrlToDelete);
    setSelectedId(null);
    setEditing(false);
    setDetailsDialogOpen(false);
    setDeleteClothingId('');
    commit(nextConfig);
    if (imageUrlToDelete && !imageStillUsed) {
      deleteImageFromBlob(imageUrlToDelete).catch((error) => {
        if (isAuthFailure(error)) {
          setAdminToken('');
          onAuthExpired?.();
          toast.error('สิทธิ์ลบรูปหมดอายุ');
          return;
        }
        toast.error('ลบแบบเสื้อแล้ว แต่ลบรูปไม่สำเร็จ', {
          description: error?.message || 'รูปอาจยังค้างอยู่ใน Blob Storage',
        });
      });
    }
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
            [selectedGender]: rows.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)),
          },
        };
      })
    );
  }

  function getStockAdjustmentKey(rowIndex) {
    return `${selectedItem?.id || ''}:${selectedGender}:${rowIndex}`;
  }

  function sanitizeStockAdjustmentInput(value) {
    const rawValue = String(value || '');
    const hasMinus = rawValue.includes('-');
    const digits = rawValue.replace(/\D/g, '');
    if (!digits) return hasMinus ? '-' : '';
    return `${hasMinus ? '-' : ''}${digits}`;
  }

  function setStockAdjustment(rowIndex, value) {
    setStockAdjustments((current) => ({
      ...current,
      [getStockAdjustmentKey(rowIndex)]: sanitizeStockAdjustmentInput(value),
    }));
  }

  function formatStockAdjustmentSummary(item) {
    const action = item.amount > 0 ? 'เพิ่ม' : 'ลด';
    return `${item.size}: ${action} ${Math.abs(item.amount).toLocaleString('th-TH')} ชิ้น`;
  }

  function requestStockSave() {
    if (!pendingStockAdjustments.length) {
      toast.error('ยังไม่มีรายการปรับสต๊อก', {
        description: 'กรอกจำนวนรับเข้า หรือจำนวนติดลบที่ต้องการปรับลดก่อนบันทึก',
      });
      return;
    }
    setStockConfirmOpen(true);
  }

  function applyStockAdjustmentsToConfig(baseConfig, selectedItemId, gender, adjustments) {
    const movementByIndex = new Map(adjustments.map((item) => [item.index, item.amount]));
    const movementBySize = new Map(adjustments.map((item) => [String(item.size || ''), item.amount]));
    return baseConfig.map((item) => {
      if (item.id !== selectedItemId) return item;
      const rows = item.genderSizeRows?.[gender] || item.sizeRows || [];
      return {
        ...item,
        genderSizeRows: {
          ...(item.genderSizeRows || {}),
          [gender]: rows.map((row, index) => {
            const sizeKey = String(row.size || '');
            const amount = movementBySize.has(sizeKey) ? movementBySize.get(sizeKey) : movementByIndex.get(index);
            return amount ? applyStockMovement(row, amount, 'manual') : row;
          }),
        },
      };
    });
  }

  async function confirmStockSave() {
    if (!selectedItem || !pendingStockAdjustments.length) {
      setStockConfirmOpen(false);
      return;
    }
    setStockSaving(true);
    try {
      const latestConfig = await loadSharedClothingConfig().catch(() => null);
      const baseConfig = latestConfig?.length ? latestConfig : config;
      const nextConfig = normalizeClothingConfig(
        applyStockAdjustmentsToConfig(baseConfig, selectedItem.id, selectedGender, pendingStockAdjustments)
      );
      setConfig(nextConfig);
      saveClothingConfig(nextConfig);
      await publishSharedClothingConfig(nextConfig);
      setStockAdjustments((current) => {
        const next = { ...current };
        pendingStockAdjustments.forEach((item) => {
          next[item.key] = '';
        });
        return next;
      });
      setStockConfirmOpen(false);
      toast.success('บันทึกการปรับสต๊อกแล้ว', {
        description: pendingStockAdjustments.map(formatStockAdjustmentSummary).join('\n'),
      });
    } catch (error) {
      if (isAuthFailure(error)) {
        setAdminToken('');
        onAuthExpired?.();
        toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ');
      } else {
        toast.error('บันทึกข้อมูลเสื้อไม่สำเร็จ', {
          description: error?.message || 'กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่',
        });
      }
    } finally {
      setStockSaving(false);
    }
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
                ? { ...row, details: { ...(row.details || {}), [field]: value } }
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
        const detailFieldsNext = (item.detailFields || []).map((field, index) =>
          index === fieldIndex ? nextField : field
        );
        return {
          ...item,
          detailFields: detailFieldsNext,
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
      config.map((item) => {
        if (item.id !== id) return item;
        const currentFields = item.detailFields?.length ? item.detailFields : ['อก'];
        let nextField = `รายละเอียด ${currentFields.length + 1}`;
        let suffix = currentFields.length + 1;
        while (currentFields.includes(nextField)) {
          suffix += 1;
          nextField = `รายละเอียด ${suffix}`;
        }
        return {
          ...item,
          detailFields: [...currentFields, nextField],
          genderSizeRows: GENDERS.reduce((rows, gender) => {
            const sizeRows = item.genderSizeRows?.[gender] || item.sizeRows || [];
            return {
              ...rows,
              [gender]: sizeRows.map((row) => ({
                ...row,
                details: { ...(row.details || {}), [nextField]: '' },
              })),
            };
          }, {}),
        };
      })
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
                details: (item.detailFields || []).reduce((details, field) => ({ ...details, [field]: '' }), {}),
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
    setCreateDraft(createBlankClothingDraft());
    setSelectedGender(GENDERS[0]);
    setCreateDialogOpen(true);
  }

  function patchCreateDraft(patch) {
    setCreateDraft((current) => ({ ...current, ...patch }));
  }

  function patchCreateDetailField(fieldIndex, value) {
    const nextField = value.trim() || 'รายละเอียด';
    setCreateDraft((current) => {
      const oldField = current.detailFields[fieldIndex];
      const nextFields = current.detailFields.map((field, index) => (index === fieldIndex ? nextField : field));
      return {
        ...current,
        detailFields: nextFields,
        genderSizeRows: GENDERS.reduce((rows, gender) => {
          const sizeRows = current.genderSizeRows?.[gender] || [];
          return {
            ...rows,
            [gender]: sizeRows.map((row) => {
              const details = { ...(row.details || {}) };
              if (oldField && oldField !== nextField) {
                details[nextField] = details[oldField] || '';
                delete details[oldField];
              } else if (!details[nextField]) {
                details[nextField] = '';
              }
              return { ...row, details };
            }),
          };
        }, {}),
      };
    });
  }

  function patchCreateStock(rowIndex, patch) {
    setCreateDraft((current) => {
      const rows = current.genderSizeRows?.[selectedGender] || [];
      return {
        ...current,
        genderSizeRows: {
          ...(current.genderSizeRows || {}),
          [selectedGender]: rows.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)),
        },
      };
    });
  }

  function patchCreateStockDetail(rowIndex, field, value) {
    setCreateDraft((current) => {
      const rows = current.genderSizeRows?.[selectedGender] || [];
      return {
        ...current,
        genderSizeRows: {
          ...(current.genderSizeRows || {}),
          [selectedGender]: rows.map((row, index) =>
            index === rowIndex ? { ...row, details: { ...(row.details || {}), [field]: value } } : row
          ),
        },
      };
    });
  }

  function addCreateStockRow() {
    setCreateDraft((current) => {
      const rows = current.genderSizeRows?.[selectedGender] || [];
      return {
        ...current,
        genderSizeRows: {
          ...(current.genderSizeRows || {}),
          [selectedGender]: [
            ...rows,
            {
              size: '',
              qty: 0,
              details: current.detailFields.reduce((details, field) => ({ ...details, [field]: '' }), {}),
            },
          ],
        },
      };
    });
  }

  function removeCreateStockRow(rowIndex) {
    setCreateDraft((current) => {
      const rows = current.genderSizeRows?.[selectedGender] || [];
      return {
        ...current,
        genderSizeRows: {
          ...(current.genderSizeRows || {}),
          [selectedGender]: rows.length > 1 ? rows.filter((_, index) => index !== rowIndex) : rows,
        },
      };
    });
  }

  function confirmCreateClothing() {
    const type = createDraft.type.trim();
    const detailFieldsNext = createDraft.detailFields.map((field) => field.trim()).filter(Boolean);
    const genderSizeRows = GENDERS.reduce((rows, gender) => {
      const sizeRows = createDraft.genderSizeRows?.[gender] || [];
      return {
        ...rows,
        [gender]: sizeRows.map((row) => ({
          ...row,
          size: String(row.size || '').trim(),
          qty: 0,
          details: detailFieldsNext.reduce(
            (details, field) => ({ ...details, [field]: row.details?.[field] || '' }),
            {}
          ),
        })),
      };
    }, {});

    if (!type) {
      toast.error('กรุณาระบุชื่อเสื้อก่อนสร้าง');
      return;
    }
    if (!detailFieldsNext.length) {
      toast.error('กรุณาระบุรายละเอียดไซส์อย่างน้อย 1 ช่อง');
      return;
    }
    if (GENDERS.some((gender) => genderSizeRows[gender].some((row) => !row.size))) {
      toast.error('กรุณาระบุไซส์ให้ครบก่อนสร้าง');
      return;
    }

    const id = crypto.randomUUID();
    commit([...config, { id, type, imageUrl: '', detailFields: detailFieldsNext, sizeRows: genderSizeRows[GENDERS[0]], genderSizeRows }]);
    setCreateDialogOpen(false);
    setSelectedId(id);
    setEditing(true);
    setDetailsDialogTab('details');
    setDetailsDialogOpen(true);
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
        toast.error('สิทธิ์เข้าหน้าจัดการหมดอายุ', { id: loadingToastId });
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

  const openClothingDialog = (itemId, tab = 'details') => {
    setSelectedId(itemId);
    setEditing(true);
    setDetailsDialogTab(tab);
    setDetailsDialogOpen(true);
  };

  return (
    <>
      <section className={cn('inventory-workbench', modeLocked && mode === 'stock' && 'stock-focus', detailsInDialog && 'details-dialog-mode')}>
        <aside className="inventory-catalog-top-panel">
          <div className="inventory-list-head">
            <div>
              <h3>{title}</h3>
              <p>{detailsInDialog ? 'เลือกแบบเสื้อเพื่อปรับสต๊อก หรือเปิดหน้าต่างรายละเอียดเสื้อ' : 'เลือกแบบเสื้อเพื่อแก้ข้อมูลและสต๊อก'}</p>
            </div>
            <div className="inventory-list-tools">
              <div className="dashboard-view-toggle" aria-label="เลือกรูปแบบการแสดงผลแบบเสื้อ">
                <button type="button" className={catalogViewMode === 'card' ? 'active' : ''} onClick={() => setCatalogViewMode('card')}>
                  Card
                </button>
                <button type="button" className={catalogViewMode === 'table' ? 'active' : ''} onClick={() => setCatalogViewMode('table')}>
                  Table
                </button>
              </div>
              <button type="button" className="btn-primary btn-sm" onClick={addClothing}>
                <Plus className="size-4" /> เพิ่ม
              </button>
            </div>
          </div>
          {catalogViewMode === 'table' ? (
            <div className="inventory-catalog-table-wrap">
              <Table className="inventory-catalog-table">
                <colgroup>
                  <col className="inventory-catalog-name-col" />
                  <col className="inventory-catalog-number-col" />
                  <col className="inventory-catalog-number-col" />
                  <col className="inventory-catalog-number-col" />
                  <col className="inventory-catalog-action-col" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>แบบเสื้อ</TableHead>
                    <TableHead>ทั้งหมด</TableHead>
                    <TableHead>เบิกไป</TableHead>
                    <TableHead>คงเหลือ</TableHead>
                    <TableHead className="w-28 text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.map((item) => {
                    const itemStats = allItemStats.find((entry) => entry.id === item.id)?.stats || {
                      totalStock: 0,
                      withdrawn: 0,
                      remaining: 0,
                    };
                    const openItem = () => {
                      if (detailsInDialog) openClothingDialog(item.id, 'stock');
                      else {
                        setSelectedId(item.id);
                        setEditing(false);
                      }
                    };
                    return (
                      <TableRow key={item.id} className={cn(item.id === selectedItem.id && 'bg-[#EFF6FF]')}>
                        <TableCell>
                          <button type="button" className="inventory-catalog-table-item" onClick={openItem}>
                            <span className="inventory-item-thumb">
                              <ClothingImage src={item.imageUrl} alt={item.type} iconClassName="size-5" />
                            </span>
                            <strong>{item.type || 'ยังไม่ระบุชื่อ'}</strong>
                          </button>
                        </TableCell>
                        <TableCell className="inventory-catalog-number font-bold">{itemStats.totalStock.toLocaleString('th-TH')}</TableCell>
                        <TableCell className="inventory-catalog-number">{itemStats.withdrawn.toLocaleString('th-TH')}</TableCell>
                        <TableCell className="inventory-catalog-number font-bold text-[#0F766E]">{itemStats.remaining.toLocaleString('th-TH')}</TableCell>
                        <TableCell className="text-center">
                          <button type="button" className="inventory-card-manage-button" onClick={openItem}>
                            จัดการ
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className={cn('inventory-catalog-list', detailsInDialog && 'inventory-card-catalog')}>
              {config.map((item) => {
                const itemStats = allItemStats.find((entry) => entry.id === item.id)?.stats || {
                  totalStock: 0,
                  withdrawn: 0,
                  remaining: 0,
                };
                return (
                  <article
                    role="button"
                    tabIndex={0}
                    key={item.id}
                    className={cn('inventory-catalog-card', item.id === selectedItem.id && 'active')}
                    onClick={() => {
                      if (detailsInDialog) openClothingDialog(item.id, 'stock');
                      else {
                        setSelectedId(item.id);
                        setEditing(false);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      if (detailsInDialog) openClothingDialog(item.id, 'stock');
                      else {
                        setSelectedId(item.id);
                        setEditing(false);
                      }
                    }}
                  >
                    <span className="inventory-item-thumb">
                      <ClothingImage src={item.imageUrl} alt={item.type} iconClassName="size-5" />
                    </span>
                    <span className="inventory-catalog-copy">
                      <strong>{item.type || 'ยังไม่ระบุชื่อ'}</strong>
                      <small>คงเหลือ {itemStats.remaining.toLocaleString('th-TH')} ชิ้น</small>
                    </span>
                    {detailsInDialog && (
                      <span className="inventory-card-metrics" aria-hidden="true">
                        <span><b>{itemStats.totalStock.toLocaleString('th-TH')}</b> ทั้งหมด</span>
                        <span><b>{itemStats.withdrawn.toLocaleString('th-TH')}</b> เบิกไป</span>
                        <span><b>{itemStats.remaining.toLocaleString('th-TH')}</b> คงเหลือ</span>
                      </span>
                    )}
                    {detailsInDialog && (
                      <span className="inventory-card-actions">
                        <button
                          type="button"
                          className="inventory-card-manage-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openClothingDialog(item.id, 'stock');
                          }}
                        >
                          จัดการ
                        </button>
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </aside>

        {!detailsInDialog && <div className="inventory-editor-panel">
          {!selectedItem ? (
            <div className="flex h-[350px] flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 m-4">
              <span className="text-slate-300 text-3xl mb-2">📦</span>
              <h3 className="text-sm font-bold text-slate-500">ไม่มีรายการในขณะนี้</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">กรุณาเลือกแบบเสื้อจากรายการด้านซ้ายเพื่อแสดงข้อมูลและปรับสต๊อก</p>
            </div>
          ) : (
            <>

          <div className="inventory-hero-card">
            {detailsInDialog ? (
              <div className="inventory-stock-action-copy">
                <strong>จัดการสต๊อก</strong>
                <span>{selectedGender} / {stockRows.length} ไซส์</span>
              </div>
            ) : (
              <>
                <div className="inventory-hero-media">
                  <ClothingImage src={selectedItem.imageUrl} alt={selectedItem.type} iconClassName="size-7" />
                </div>
                <div className="inventory-hero-copy">
                  <span>กำลังจัดการ</span>
                  <h3>{selectedItem.type || 'ยังไม่ระบุชื่อ'}</h3>
                  <p>{selectedGender} / {stockRows.length} ไซส์</p>
                </div>
              </>
            )}
            {detailsInDialog && (
              <button
                type="button"
                className="inventory-manage-details-button"
                onClick={() => {
                  setEditing(true);
                  setDetailsDialogOpen(true);
                }}
              >
                <Pencil className="size-4" />
                รายละเอียดเสื้อ
              </button>
            )}
            <button type="button" className={cn('inventory-edit-toggle', editing && 'done')} onClick={() => setEditing((value) => !value)}>
              <Pencil className="size-4" />
              {editing ? 'เสร็จสิ้น' : detailsInDialog ? 'ปรับสต๊อก' : 'แก้ไข'}
            </button>
          </div>

          {!modeLocked && (
            <div className="inventory-mode-switch" role="tablist" aria-label="เลือกหน้าจัดการ">
              <button type="button" className={mode === 'details' ? 'active' : ''} onClick={() => setMode('details')}>
                แบบเสื้อ
              </button>
              <button type="button" className={mode === 'stock' ? 'active' : ''} onClick={() => setMode('stock')}>
                สต๊อก
              </button>
            </div>
          )}

          <div className="inventory-stock-summary-strip">
            <div>
              <span>สต๊อกทั้งหมด</span>
              <strong>{stockStats.totalStock.toLocaleString('th-TH')} ชิ้น</strong>
            </div>
            <div>
              <span>สต๊อกคงเหลือ</span>
              <strong>{stockStats.remaining.toLocaleString('th-TH')} ชิ้น</strong>
            </div>
            <div>
              <span>เบิกแล้ว</span>
              <strong>{stockStats.withdrawn.toLocaleString('th-TH')} ชิ้น</strong>
            </div>
          </div>

          <section className="inventory-detail-stock-card">
            <div className={cn('inventory-section-head', mode === 'stock' && 'hidden')}>
              <div>
                <h4>ข้อมูลเสื้อ</h4>
                <p>ชื่อ รูป และรายละเอียดไซส์ที่ผู้เบิกจะเห็น</p>
              </div>
            </div>
            <div className={cn('inventory-detail-grid', mode === 'stock' && 'hidden')}>
              <div className="inventory-image-box">
                <ClothingImage
                  src={selectedItem.imageUrl}
                  alt={selectedItem.type}
                  fallbackClassName="inventory-image-fallback"
                  iconClassName="size-8"
                />
                {editing && (
                  <label className="inventory-image-upload-button">
                    <ImagePlus className="size-4" />
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
                <Field label="ชื่อเสื้อ">
                  <TextInput
                    value={selectedItem.type}
                    onChange={(value) => patchItem(selectedItem.id, { type: value })}
                    disabled={!editing}
                    placeholder="เช่น เสื้อโปโล"
                  />
                </Field>
                <div className="inventory-info-note">
                  ข้อมูลส่วนนี้ใช้ควบคุมสิ่งที่ผู้เบิกเห็น ส่วนจำนวนสต๊อกให้แก้ในส่วนด้านล่าง
                </div>
              </div>
            </div>

            <div className={cn('inventory-size-fields', mode === 'stock' && 'hidden')}>
              <div className="inventory-size-fields-top">
                <div>
                  <strong>รายละเอียดไซส์</strong>
                  <span>แก้ค่าอก/เอวแยกตามเพศ</span>
                </div>
                <div className="inventory-size-fields-actions">
                  {editing && (
                    <button type="button" className="btn-secondary btn-sm inventory-add-detail-field" onClick={() => addDetailField(selectedItem.id)}>
                      <Plus className="size-4" />
                      เพิ่มรายละเอียด
                    </button>
                  )}
                  <div className="inventory-gender-toggle">
                    {GENDERS.map((gender) => (
                      <button key={gender} type="button" className={selectedGender === gender ? 'active' : ''} onClick={() => setSelectedGender(gender)}>
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="inventory-size-field-list">
                  {detailFields.map((field, index) => (
                    <div key={`${selectedItem.id}-detail-field-${index}`} className="inventory-size-field-row">
                      <TextInput value={field} onChange={(value) => patchDetailField(selectedItem.id, index, value)} placeholder="อก" />
                      <button type="button" onClick={() => removeDetailField(selectedItem.id, index)} disabled={detailFields.length <= 1} title="ลบช่องรายละเอียด">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="inventory-size-detail-table">
                <div className="inventory-size-detail-header" style={sizeDetailGridStyle}>
                  <span>ไซส์</span>
                  {detailFields.map((field) => <span key={`${selectedItem.id}-size-head-${field}`}>{field}</span>)}
                  {editing && <span />}
                </div>
                {stockRows.map((row, index) => (
                  <div className="inventory-size-detail-row" key={`${selectedItem.id}-${selectedGender}-detail-${index}`} style={sizeDetailGridStyle}>
                    {editing ? (
                      <TextInput value={row.size} onChange={(value) => patchStock(selectedItem.id, index, { size: value })} placeholder="ไซส์" />
                    ) : (
                      <strong>{row.size || '-'}</strong>
                    )}
                    {detailFields.map((field) =>
                      editing ? (
                        <TextInput key={`${selectedItem.id}-${selectedGender}-${index}-${field}`} value={row.details?.[field] || ''} onChange={(value) => patchStockDetail(selectedItem.id, index, field, value)} placeholder={field} />
                      ) : (
                        <span key={`${selectedItem.id}-${selectedGender}-${index}-${field}`}>{row.details?.[field] || '-'}</span>
                      )
                    )}
                    {editing && (
                      <button type="button" onClick={() => removeStockRow(selectedItem.id, index)} title="ลบไซส์">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editing && (
                <button type="button" className="btn-secondary btn-sm inventory-add-stock" onClick={() => addStockRow(selectedItem.id)}>
                  <Plus className="size-4" /> เพิ่มไซส์
                </button>
              )}
            </div>
            <div className={cn('inventory-section-divider', mode === 'details' && 'hidden')} />
            <div className={cn('inventory-section-head', mode === 'details' && 'hidden')}>
              <div>
                <h4>สต๊อกตามไซส์</h4>
                <p>รับเข้าใช้ตัวเลข เช่น 10 / ปรับลดใช้เลขลบ เช่น -2</p>
              </div>
              <div className="inventory-gender-toggle">
                {GENDERS.map((gender) => (
                  <button key={gender} type="button" className={selectedGender === gender ? 'active' : ''} onClick={() => setSelectedGender(gender)}>
                    {gender}
                  </button>
                ))}
              </div>
            </div>
            <div className={cn('inventory-stock-table', mode === 'details' && 'hidden', editing && 'is-editing')}>
              <div className="inventory-stock-header">
                <span>ไซส์</span>
                <span>สต๊อกทั้งหมด</span>
                <span>เบิกไป</span>
                <span>คงเหลือ</span>
                {editing && <span>รับเข้า / ปรับลด</span>}
              </div>
              {stockRows.map((row, index) => {
                const summary = getStockLedgerSummary(row);
                return (
                  <div className="inventory-stock-row" key={`${selectedItem.id}-${selectedGender}-${index}`}>
                    <strong>{row.size || '-'}</strong>
                    <span>{summary.totalStock.toLocaleString('th-TH')} ชิ้น</span>
                    <span>{summary.withdrawn.toLocaleString('th-TH')} ชิ้น</span>
                    <span>{summary.remaining.toLocaleString('th-TH')} ชิ้น</span>
                    {editing && (
                      <div className="inventory-stock-adjust">
                        <TextInput
                          type="text"
                          inputMode="text"
                          pattern="-?[0-9]*"
                          value={stockAdjustments[getStockAdjustmentKey(index)] || ''}
                          onChange={(value) => setStockAdjustment(index, value)}
                          placeholder="10 หรือ -2"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {editing && (
                <div className="inventory-stock-save-row">
                  <button type="button" className="btn-primary" onClick={requestStockSave}>
                    บันทึกการปรับสต๊อก
                  </button>
                </div>
              )}
            </div>
          </section>
        
            </>
          )}</div>}
      </section>

      <Dialog.Root open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dashboard-dialog-overlay" />
          <Dialog.Content className="inventory-details-dialog">
            {selectedItem && (
              <>

            <div className="inventory-details-dialog-head">
              <div>
                <Dialog.Title>จัดการแบบเสื้อ</Dialog.Title>
                <Dialog.Description>
                  {selectedItem.type || 'แบบเสื้อที่เลือก'} · {selectedGender} / {stockRows.length} ไซส์
                </Dialog.Description>
              </div>
              <Dialog.Close className="dashboard-dialog-close" aria-label="ปิด">
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <div className="inventory-dialog-summary-strip">
              <div>
                <span>สต๊อกทั้งหมด</span>
                <strong>{stockStats.totalStock.toLocaleString('th-TH')} ชิ้น</strong>
              </div>
              <div>
                <span>เบิกไป</span>
                <strong>{stockStats.withdrawn.toLocaleString('th-TH')} ชิ้น</strong>
              </div>
              <div>
                <span>คงเหลือ</span>
                <strong>{stockStats.remaining.toLocaleString('th-TH')} ชิ้น</strong>
              </div>
            </div>

            <div className="inventory-dialog-tabs-row">
              <div className="inventory-dialog-tabs" role="tablist" aria-label="เลือกหน้าจัดการแบบเสื้อ">
                <button
                  type="button"
                  className={detailsDialogTab === 'details' ? 'active' : ''}
                  onClick={() => setDetailsDialogTab('details')}
                >
                  รายละเอียดเสื้อ
                </button>
                <button
                  type="button"
                  className={detailsDialogTab === 'stock' ? 'active' : ''}
                  onClick={() => setDetailsDialogTab('stock')}
                >
                  สต๊อก
                </button>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm inventory-dialog-delete-button"
                disabled={config.length <= 1}
                onClick={() => setDeleteClothingId(selectedItem.id)}
              >
                <Trash2 className="size-4" />
                ลบแบบเสื้อ
              </button>
            </div>

            <div className={cn('inventory-dialog-tab-panel', detailsDialogTab !== 'details' && 'hidden')}>
              <div className="inventory-detail-grid">
              <div className="inventory-image-box">
                <ClothingImage
                  src={selectedItem.imageUrl}
                  alt={selectedItem.type}
                  fallbackClassName="inventory-image-fallback"
                  iconClassName="size-8"
                />
                <label className="inventory-image-upload-button">
                  <ImagePlus className="size-4" />
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
              </div>
              <div className="inventory-detail-fields">
                <Field label="ชื่อเสื้อ">
                  <TextInput
                    value={selectedItem.type}
                    onChange={(value) => patchItem(selectedItem.id, { type: value })}
                    placeholder="เช่น เสื้อโปโล"
                  />
                </Field>
                <div className="inventory-info-note">
                  ข้อมูลส่วนนี้ใช้ควบคุมสิ่งที่ผู้เบิกเห็น ส่วนจำนวนคงเหลือให้แก้ในหน้าสต๊อกหลัก
                </div>
              </div>
            </div>

              <div className="inventory-size-fields inventory-size-fields-dialog">
              <div className="inventory-size-fields-top">
                <div>
                  <strong>รายละเอียดไซส์</strong>
                  <span>แก้ค่าอก/เอวแยกตามเพศ</span>
                </div>
                <div className="inventory-size-fields-actions">
                  <button type="button" className="btn-secondary btn-sm inventory-add-detail-field" onClick={() => addDetailField(selectedItem.id)}>
                    <Plus className="size-4" />
                    เพิ่มรายละเอียด
                  </button>
                  <div className="inventory-gender-toggle">
                    {GENDERS.map((gender) => (
                      <button key={gender} type="button" className={selectedGender === gender ? 'active' : ''} onClick={() => setSelectedGender(gender)}>
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="inventory-size-field-list">
                {detailFields.map((field, index) => (
                  <div key={`${selectedItem.id}-dialog-detail-field-${index}`} className="inventory-size-field-row">
                    <TextInput value={field} onChange={(value) => patchDetailField(selectedItem.id, index, value)} placeholder="อก" />
                    <button type="button" onClick={() => removeDetailField(selectedItem.id, index)} disabled={detailFields.length <= 1} title="ลบช่องรายละเอียด">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="inventory-size-detail-table">
                <div className="inventory-size-detail-header" style={sizeDetailGridStyle}>
                  <span>ไซส์</span>
                  {detailFields.map((field) => <span key={`${selectedItem.id}-dialog-size-head-${field}`}>{field}</span>)}
                  <span />
                </div>
                {stockRows.map((row, index) => (
                  <div className="inventory-size-detail-row" key={`${selectedItem.id}-${selectedGender}-dialog-detail-${index}`} style={sizeDetailGridStyle}>
                    <TextInput value={row.size} onChange={(value) => patchStock(selectedItem.id, index, { size: value })} placeholder="ไซส์" />
                    {detailFields.map((field) => (
                      <TextInput
                        key={`${selectedItem.id}-${selectedGender}-${index}-dialog-${field}`}
                        value={row.details?.[field] || ''}
                        onChange={(value) => patchStockDetail(selectedItem.id, index, field, value)}
                        placeholder={field}
                      />
                    ))}
                    <button type="button" onClick={() => removeStockRow(selectedItem.id, index)} title="ลบไซส์">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className="btn-secondary btn-sm inventory-add-stock" onClick={() => addStockRow(selectedItem.id)}>
                <Plus className="size-4" /> เพิ่มไซส์
              </button>
              </div>
            </div>

            <div className={cn('inventory-dialog-tab-panel', detailsDialogTab !== 'stock' && 'hidden')}>
              <div className="inventory-size-fields-top inventory-stock-dialog-head">
                <div>
                  <strong>สต๊อกตามไซส์</strong>
                  <span>รับเข้าใช้ตัวเลข เช่น 10 / ปรับลดใช้เลขลบ เช่น -2</span>
                </div>
                <div className="inventory-gender-toggle">
                  {GENDERS.map((gender) => (
                    <button key={gender} type="button" className={selectedGender === gender ? 'active' : ''} onClick={() => setSelectedGender(gender)}>
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              <div className="inventory-stock-table inventory-dialog-stock-table is-editing">
                <div className="inventory-stock-header">
                  <span>ไซส์</span>
                  <span>สต๊อกทั้งหมด</span>
                  <span>เบิกไป</span>
                  <span>คงเหลือ</span>
                  <span>รับเข้า / ปรับลด</span>
                </div>
                {stockRows.map((row, index) => {
                  const summary = getStockLedgerSummary(row);
                  return (
                    <div className="inventory-stock-row" key={`${selectedItem.id}-${selectedGender}-dialog-stock-${index}`}>
                      <strong>{row.size || '-'}</strong>
                      <span>{summary.totalStock.toLocaleString('th-TH')} ชิ้น</span>
                      <span>{summary.withdrawn.toLocaleString('th-TH')} ชิ้น</span>
                      <span>{summary.remaining.toLocaleString('th-TH')} ชิ้น</span>
                      <div className="inventory-stock-adjust">
                        <TextInput
                          type="text"
                          inputMode="text"
                          pattern="-?[0-9]*"
                          value={stockAdjustments[getStockAdjustmentKey(index)] || ''}
                          onChange={(value) => setStockAdjustment(index, value)}
                          placeholder="10 หรือ -2"
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="inventory-stock-save-row">
                  <button type="button" className="btn-primary" onClick={requestStockSave}>
                    บันทึกการปรับสต๊อก
                  </button>
                </div>
              </div>
            </div>
          
              </>
            )}</Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dashboard-dialog-overlay" />
          <Dialog.Content className="inventory-details-dialog inventory-create-dialog">
            <div className="inventory-details-dialog-head">
              <div>
                <Dialog.Title>เพิ่มแบบเสื้อ</Dialog.Title>
                <Dialog.Description>กรอกข้อมูลให้ครบก่อนยืนยันสร้างแบบเสื้อใหม่</Dialog.Description>
              </div>
              <Dialog.Close className="dashboard-dialog-close" aria-label="ปิด">
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <div className="inventory-dialog-tab-panel">
              <div className="inventory-detail-grid">
                <div className="inventory-image-box">
                  <ClothingImage
                    src=""
                    alt={createDraft.type || 'แบบเสื้อใหม่'}
                    fallbackClassName="inventory-image-fallback"
                    iconClassName="size-8"
                  />
                  <div className="inventory-create-image-note">แนบรูปได้หลังสร้างแบบเสื้อ</div>
                </div>
                <div className="inventory-detail-fields">
                  <Field label="ชื่อเสื้อ">
                    <TextInput
                      value={createDraft.type}
                      onChange={(value) => patchCreateDraft({ type: value })}
                      placeholder="เช่น เสื้อโปโล"
                    />
                  </Field>
                  <div className="inventory-info-note">
                    ระบบจะยังไม่สร้างแบบเสื้อจนกดปุ่มยืนยันด้านล่าง
                  </div>
                </div>
              </div>

              <div className="inventory-size-fields inventory-size-fields-dialog">
                <div className="inventory-size-fields-top">
                  <div>
                    <strong>รายละเอียดไซส์เริ่มต้น</strong>
                    <span>ระบุข้อมูลเริ่มต้นทั้งชายและหญิงก่อนสร้าง</span>
                  </div>
                  <div className="inventory-gender-toggle">
                    {GENDERS.map((gender) => (
                      <button key={gender} type="button" className={selectedGender === gender ? 'active' : ''} onClick={() => setSelectedGender(gender)}>
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="inventory-size-field-list">
                  {createDraft.detailFields.map((field, index) => (
                    <div key={`create-detail-field-${index}`} className="inventory-size-field-row">
                      <TextInput value={field} onChange={(value) => patchCreateDetailField(index, value)} placeholder="อก" />
                    </div>
                  ))}
                </div>

                <div className="inventory-size-detail-table">
                  <div className="inventory-size-detail-header" style={createSizeDetailGridStyle}>
                    <span>ไซส์</span>
                    {createDraft.detailFields.map((field) => <span key={`create-size-head-${field}`}>{field}</span>)}
                    <span />
                  </div>
                  {createRows.map((row, index) => (
                    <div className="inventory-size-detail-row" key={`${selectedGender}-create-detail-${index}`} style={createSizeDetailGridStyle}>
                      <TextInput value={row.size} onChange={(value) => patchCreateStock(index, { size: value })} placeholder="ไซส์" />
                      {createDraft.detailFields.map((field) => (
                        <TextInput
                          key={`${selectedGender}-${index}-create-${field}`}
                          value={row.details?.[field] || ''}
                          onChange={(value) => patchCreateStockDetail(index, field, value)}
                          placeholder={field}
                        />
                      ))}
                      <button type="button" onClick={() => removeCreateStockRow(index)} title="ลบไซส์">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" className="btn-secondary btn-sm inventory-add-stock" onClick={addCreateStockRow}>
                  <Plus className="size-4" /> เพิ่มไซส์
                </button>
              </div>
            </div>

            <div className="inventory-create-actions">
              <Dialog.Close type="button" className="btn-secondary">
                ยกเลิก
              </Dialog.Close>
              <button type="button" className="btn-primary" onClick={confirmCreateClothing}>
                ยืนยันสร้าง
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <DeleteClothingDialog
        item={deleteClothingItem}
        onCancel={() => setDeleteClothingId('')}
        onConfirm={confirmDeleteClothing}
      />
      <ConfirmDialog
        open={stockConfirmOpen}
        title="ยืนยันบันทึกการปรับสต๊อก"
        description={stockConfirmDescription}
        confirmLabel="ยืนยันบันทึก"
        cancelLabel="ยกเลิก"
        loading={stockSaving}
        onCancel={() => setStockConfirmOpen(false)}
        onConfirm={confirmStockSave}
      />
    </>
  );
}

export default InventoryManager;
