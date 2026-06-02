import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { upload } from '@vercel/blob/client';
import { ImagePlus, Pencil, Plus, Shirt, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { getAdminToken, isAuthFailure, setAdminToken } from '../lib/api';
import {
  GENDERS,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_TYPES,
  normalizeClothingConfig,
  publishSharedClothingConfig,
  saveClothingConfig,
} from '../lib/config';
import { applyStockMovement, getStockLedgerSummary } from '../lib/stockHelpers';
import { Field, TextInput } from './FormComponents';

function validateImageFile(file) {
  if (!file) return '';
  if (!IMAGE_UPLOAD_TYPES.includes(file.type)) return 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP';
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return 'ขนาดไฟล์ต้องไม่เกิน 10MB';
  return '';
}

async function uploadImageToBlob(file) {
  const token = getAdminToken();
  if (!token) throw new Error('สิทธิ์อัปโหลดหมดอายุ กรุณาเข้าสู่แดชบอร์ดใหม่');
  return upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
    clientPayload: JSON.stringify({ token }),
  });
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
        lowStock: totals.lowStock + (summary.remaining <= 10 ? 1 : 0),
      };
    },
    { totalStock: 0, remaining: 0, withdrawn: 0, lowStock: 0 }
  );
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

export function InventoryManager({ config, setConfig, onAuthExpired }) {
  const [selectedId, setSelectedId] = useState(() => config[0]?.id || '');
  const [selectedGender, setSelectedGender] = useState(GENDERS[0]);
  const [editing, setEditing] = useState(false);
  const [activeSection, setActiveSection] = useState('details');
  const [uploadingId, setUploadingId] = useState('');
  const [stockAdjustments, setStockAdjustments] = useState({});
  const [deleteClothingId, setDeleteClothingId] = useState('');
  const syncTimerRef = useRef(null);

  const selectedItem = config.find((item) => item.id === selectedId) || config[0];
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
          lowStock: totals.lowStock + stats.lowStock,
        };
      },
      { totalStock: 0, remaining: 0, withdrawn: 0, lowStock: 0 }
    ),
  }));
  const sizeDetailGridStyle = {
    '--inventory-size-detail-columns': `minmax(6rem, 0.75fr) repeat(${detailFields.length}, minmax(6rem, 1fr)) 2.5rem`,
  };

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

  function confirmDeleteClothing() {
    if (!deleteClothingItem || config.length <= 1) return;
    const nextConfig = config.filter((current) => current.id !== deleteClothingItem.id);
    commit(nextConfig);
    if (deleteClothingItem.id === selectedId) {
      setSelectedId(nextConfig[0]?.id || '');
      setEditing(false);
    }
    setDeleteClothingId('');
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
    const id = crypto.randomUUID();
    commit([
      ...config,
      {
        id,
        type: 'เสื้อใหม่',
        imageUrl: '',
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

  return (
    <>
      <section className="inventory-workbench">
        <aside className="inventory-catalog-panel">
          <div className="inventory-list-head">
            <div>
              <h3>แบบเสื้อ</h3>
              <p>เลือกแบบเสื้อเพื่อแก้ข้อมูลและสต๊อก</p>
            </div>
            <button type="button" onClick={addClothing}>
              <Plus className="size-4" /> เพิ่ม
            </button>
          </div>
          <div className="inventory-catalog-list">
            {config.map((item) => {
              const itemStats = allItemStats.find((entry) => entry.id === item.id)?.stats || {
                remaining: 0,
                lowStock: 0,
              };
              const canDelete = config.length > 1;
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={item.id}
                  className={cn('inventory-catalog-card', item.id === selectedItem.id && 'active')}
                  onClick={() => {
                    setSelectedId(item.id);
                    setEditing(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    setSelectedId(item.id);
                    setEditing(false);
                  }}
                >
                  <span className="inventory-item-thumb">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Shirt className="size-5" />}
                  </span>
                  <span className="inventory-catalog-copy">
                    <strong>{item.type || 'ยังไม่ระบุชื่อ'}</strong>
                    <small>คงเหลือ {itemStats.remaining.toLocaleString('th-TH')} ชิ้น</small>
                  </span>
                  <span className={cn('inventory-catalog-status', itemStats.lowStock && 'warning')}>
                    {itemStats.lowStock ? `ต่ำ ${itemStats.lowStock}` : 'ปกติ'}
                  </span>
                  <button
                    type="button"
                    className="inventory-item-delete"
                    aria-label="ลบแบบเสื้อ"
                    disabled={!canDelete}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (canDelete) setDeleteClothingId(item.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="inventory-editor-panel">
          <div className="inventory-hero-card">
            <div className="inventory-hero-media">
              {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} alt={selectedItem.type} /> : <Shirt className="size-7" />}
            </div>
            <div className="inventory-hero-copy">
              <span>กำลังจัดการ</span>
              <h3>{selectedItem.type || 'ยังไม่ระบุชื่อ'}</h3>
              <p>{selectedGender} / {stockRows.length} ไซส์</p>
            </div>
            <button type="button" className={cn('inventory-edit-toggle', editing && 'done')} onClick={() => setEditing((value) => !value)}>
              <Pencil className="size-4" />
              {editing ? 'เสร็จสิ้น' : 'แก้ไข'}
            </button>
          </div>

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
            <div className={stockStats.lowStock ? 'warning' : ''}>
              <span>สต๊อกต่ำ</span>
              <strong>{stockStats.lowStock} ไซส์</strong>
            </div>
          </div>

          <div className="inventory-subtabs" role="tablist" aria-label="จัดการข้อมูลแบบเสื้อและสต๊อก">
            <button className={activeSection === 'details' ? 'active' : ''} onClick={() => setActiveSection('details')} role="tab" aria-selected={activeSection === 'details'}>
              ข้อมูลเสื้อ
            </button>
            <button className={activeSection === 'stock' ? 'active' : ''} onClick={() => setActiveSection('stock')} role="tab" aria-selected={activeSection === 'stock'}>
              สต๊อกตามไซส์
            </button>
          </div>

          <section className={cn('inventory-detail-card', activeSection !== 'details' && 'hidden')}>
            <div className="inventory-section-head">
              <div>
                <h4>ข้อมูลเสื้อ</h4>
                <p>ชื่อ รูป และรายละเอียดไซส์ที่ผู้เบิกจะเห็น</p>
              </div>
            </div>
            <div className="inventory-detail-grid">
              <div className="inventory-image-box">
                {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} alt={selectedItem.type} /> : <span>ไม่มีรูป</span>}
                {editing && (
                  <label>
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
                <Field label="ชื่อแบบเสื้อ">
                  <TextInput
                    value={selectedItem.type}
                    onChange={(value) => patchItem(selectedItem.id, { type: value })}
                    disabled={!editing}
                    placeholder="เช่น เสื้อโปโล"
                  />
                </Field>
                <div className="inventory-info-note">
                  ข้อมูลส่วนนี้ใช้ควบคุมสิ่งที่ผู้เบิกเห็น ส่วนจำนวนสต๊อกให้แก้ในแท็บสต๊อกตามไซส์
                </div>
              </div>
            </div>

            <div className="inventory-size-fields">
              <div className="inventory-size-fields-top">
                <div>
                  <strong>รายละเอียดไซส์</strong>
                  <span>แก้ค่าอก/เอวแยกตามเพศ</span>
                </div>
                <div className="inventory-size-fields-actions">
                  {editing && (
                    <button type="button" className="inventory-add-detail-field" onClick={() => addDetailField(selectedItem.id)}>
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
                <button type="button" className="inventory-add-stock" onClick={() => addStockRow(selectedItem.id)}>
                  <Plus className="size-4" /> เพิ่มไซส์
                </button>
              )}
            </div>
          </section>

          <section className={cn('inventory-stock-card', activeSection !== 'stock' && 'hidden')}>
            <div className="inventory-section-head">
              <div>
                <h4>สต๊อกตามไซส์</h4>
                <p>รับเข้าใช้เลขบวก เช่น +10 / ปรับลดใช้เลขลบ เช่น -2</p>
              </div>
              <div className="inventory-gender-toggle">
                {GENDERS.map((gender) => (
                  <button key={gender} type="button" className={selectedGender === gender ? 'active' : ''} onClick={() => setSelectedGender(gender)}>
                    {gender}
                  </button>
                ))}
              </div>
            </div>
            <div className="inventory-stock-table">
              <div className="inventory-stock-header">
                <span>ไซส์</span>
                <span>คงเหลือ</span>
                {editing && <span>รับเข้า / ปรับลด</span>}
              </div>
              {stockRows.map((row, index) => {
                const summary = getStockLedgerSummary(row);
                return (
                  <div className="inventory-stock-row" key={`${selectedItem.id}-${selectedGender}-${index}`}>
                    <strong>{row.size || '-'}</strong>
                    <span>{summary.remaining.toLocaleString('th-TH')} ชิ้น</span>
                    {editing && (
                      <div className="inventory-stock-adjust">
                        <TextInput
                          type="number"
                          inputMode="numeric"
                          value={stockAdjustments[getStockAdjustmentKey(index)] || ''}
                          onChange={(value) =>
                            setStockAdjustments((current) => ({ ...current, [getStockAdjustmentKey(index)]: value }))
                          }
                          placeholder="+10 หรือ -2"
                        />
                        <button type="button" onClick={() => adjustStockQuantity(selectedItem.id, index)}>
                          บันทึก
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>

      <DeleteClothingDialog
        item={deleteClothingItem}
        onCancel={() => setDeleteClothingId('')}
        onConfirm={confirmDeleteClothing}
      />
    </>
  );
}

export default InventoryManager;
