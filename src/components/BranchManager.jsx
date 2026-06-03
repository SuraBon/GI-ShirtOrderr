import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { BRANCHES } from '../constants/branches';
import { ConfirmDialog } from './SharedDialogs';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function BranchManager({ onSaved }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [editingBranchName, setEditingBranchName] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [deleteBranchName, setDeleteBranchName] = useState('');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/blob/branches', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'โหลดข้อมูลสาขาไม่สำเร็จ');
      }

      if (!data?.branches) {
        setBranches(BRANCHES);
      } else {
        setBranches(data.branches);
        setUpdatedAt(data.updatedAt);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      setBranches(BRANCHES);
    } finally {
      setLoading(false);
    }
  }

  async function saveBranches(updatedBranches) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/blob/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branches: updatedBranches,
          expectedUpdatedAt: updatedAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(data?.error || 'ข้อมูลสาขามีการอัปเดต กรุณาโหลดข้อมูลใหม่');
          await loadBranches();
          return false;
        }
        throw new Error(data?.error || 'บันทึกข้อมูลสาขาไม่สำเร็จ');
      }

      setBranches(updatedBranches);
      setUpdatedAt(data.updatedAt);
      onSaved?.();
      return true;
    } catch (err) {
      console.error('Failed to save branches:', err);
      setError(err?.message || 'บันทึกข้อมูลสาขาไม่สำเร็จ');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function validateBranchName(branchName, currentName = '') {
    const trimmedName = branchName.trim();

    if (!trimmedName) {
      return 'โปรดกรอกชื่อสาขา';
    }

    if (trimmedName !== currentName && branches.includes(trimmedName)) {
      return 'สาขานี้มีอยู่แล้ว';
    }

    return '';
  }

  async function addBranch() {
    const trimmedName = newBranchName.trim();
    const validationError = validateBranchName(trimmedName);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (branches.length >= 100) {
      setError('สามารถเพิ่มได้สูงสุด 100 สาขา');
      return;
    }

    const success = await saveBranches([...branches, trimmedName]);

    if (success) {
      setNewBranchName('');
      toast.success('เพิ่มสาขาสำเร็จ');
    }
  }

  function startEditing(branchName) {
    setError('');
    setEditingBranchName(branchName);
    setEditingValue(branchName);
  }

  function cancelEditing() {
    setEditingBranchName('');
    setEditingValue('');
  }

  async function renameBranch(branchName) {
    const trimmedName = editingValue.trim();
    const validationError = validateBranchName(trimmedName, branchName);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (trimmedName === branchName) {
      cancelEditing();
      return;
    }

    const success = await saveBranches(branches.map((branch) => (branch === branchName ? trimmedName : branch)));

    if (success) {
      cancelEditing();
      toast.success('แก้ไขสาขาสำเร็จ');
    }
  }

  async function confirmDeleteBranch() {
    if (!deleteBranchName) return;

    const success = await saveBranches(branches.filter((branch) => branch !== deleteBranchName));

    if (success) {
      toast.success('ลบสาขาสำเร็จ');
      setDeleteBranchName('');
    }
  }

  if (loading) {
    return (
      <div className="branch-manager-loading">
        <Loader2 className="size-5 animate-spin" />
        <span>กำลังโหลดสาขา</span>
      </div>
    );
  }

  return (
    <>
      <div className="branch-manager">
        <section className="branch-manager-add">
          <div className="branch-manager-add-copy">
            <h3>เพิ่มสาขา</h3>
            <p>ชื่อสาขาจะถูกใช้ในหน้าเบิกเสื้อ ตัวกรอง และรายงานรายการเบิก</p>
          </div>
          <div className="branch-manager-add-form">
            <input
              type="text"
              value={newBranchName}
              onChange={(event) => {
                setNewBranchName(event.target.value);
                setError('');
              }}
              onKeyDown={(event) => event.key === 'Enter' && addBranch()}
              placeholder="เช่น GI(สาขาใหญ่)"
              disabled={saving}
            />
            <button type="button" className="dashboard-primary-action" onClick={addBranch} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              <span>เพิ่ม</span>
            </button>
          </div>
        </section>

        {error ? (
          <div className="branch-manager-alert">
            <AlertTriangle className="size-4" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="branch-manager-list-panel">
          <div className="branch-manager-list-head">
            <div>
              <h3>สาขาที่ใช้งาน</h3>
              <p>{branches.length} สาขาในระบบ</p>
            </div>
            <div className="branch-manager-list-tools">
              <div className="dashboard-view-toggle" aria-label="เลือกรูปแบบการแสดงผล">
                <button type="button" className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}>
                  Card
                </button>
                <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
                  Table
                </button>
              </div>
              <button type="button" className="dashboard-secondary-action dashboard-icon-action" onClick={loadBranches} disabled={saving} title="โหลดสาขาใหม่" aria-label="โหลดสาขาใหม่">
                <RefreshCw className="size-4" />
              </button>
            </div>
          </div>

          {branches.length === 0 ? (
            <div className="branch-manager-empty">
              <span>ไม่มีรายการในขณะนี้</span>
              <p>เพิ่มสาขาแรกเพื่อให้หน้าเบิกเสื้อและรายงานเลือกสาขาได้</p>
            </div>
          ) : (
            viewMode === 'table' ? (
              <div className="branch-manager-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-right">ลำดับ</TableHead>
                      <TableHead>ชื่อสาขา</TableHead>
                      <TableHead className="w-32 text-center">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch, index) => {
                      const isEditing = editingBranchName === branch;
                      return (
                        <TableRow key={branch}>
                          <TableCell className="text-right font-bold text-[#64748B]">{index + 1}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(event) => {
                                  setEditingValue(event.target.value);
                                  setError('');
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') renameBranch(branch);
                                  if (event.key === 'Escape') cancelEditing();
                                }}
                                disabled={saving}
                                autoFocus
                              />
                            ) : (
                              <strong>{branch}</strong>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="branch-manager-row-actions">
                              {isEditing ? (
                                <>
                                  <Button type="button" variant="outline" size="icon-sm" onClick={() => renameBranch(branch)} disabled={saving} title="บันทึก">
                                    {saving ? <Loader2 /> : <Check />}
                                  </Button>
                                  <Button type="button" variant="outline" size="icon-sm" onClick={cancelEditing} disabled={saving} title="ยกเลิก">
                                    <X />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button type="button" variant="outline" size="icon-sm" onClick={() => startEditing(branch)} disabled={saving} title="แก้ไข">
                                    <Pencil />
                                  </Button>
                                  <Button type="button" variant="destructive" size="icon-sm" onClick={() => setDeleteBranchName(branch)} disabled={saving} title="ลบ">
                                    <Trash2 />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="branch-manager-list">
              {branches.map((branch, index) => {
                const isEditing = editingBranchName === branch;

                return (
                  <div key={branch} className="branch-manager-row">
                    <span className="branch-manager-index">{index + 1}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(event) => {
                          setEditingValue(event.target.value);
                          setError('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') renameBranch(branch);
                          if (event.key === 'Escape') cancelEditing();
                        }}
                        disabled={saving}
                        autoFocus
                      />
                    ) : (
                      <strong>{branch}</strong>
                    )}
                    <div className="branch-manager-row-actions">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={() => renameBranch(branch)} disabled={saving} title="บันทึก">
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          </button>
                          <button type="button" onClick={cancelEditing} disabled={saving} title="ยกเลิก">
                            <X className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEditing(branch)} disabled={saving} title="แก้ไข">
                            <Pencil className="size-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteBranchName(branch)} disabled={saving} title="ลบ">
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )
          )}
        </section>

        <p className="branch-manager-note">
          ระบบใช้รายชื่อนี้ร่วมกันทุกหน้า หลังบันทึกแล้วหน้าสั่งเบิกและตัวกรองจะใช้ชุดสาขาใหม่ทันที
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(deleteBranchName)}
        title="ยืนยันลบสาขา"
        description={deleteBranchName ? `ลบสาขา ${deleteBranchName} ออกจากระบบ?` : ''}
        confirmLabel="ลบสาขา"
        cancelLabel="ยกเลิก"
        loading={saving}
        destructive
        onCancel={() => !saving && setDeleteBranchName('')}
        onConfirm={confirmDeleteBranch}
      />
    </>
  );
}
