import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function BranchManager({ onSaved }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  // Load branches
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

      // If no branches exist in blob storage, use default from constants
      if (!data?.branches) {
        const { BRANCHES } = await import('../constants/branches.js');
        setBranches(BRANCHES);
      } else {
        setBranches(data.branches);
        setUpdatedAt(data.updatedAt);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      // Fallback to default branches
      try {
        const { BRANCHES } = await import('../constants/branches.js');
        setBranches(BRANCHES);
      } catch {
        setError('โหลดข้อมูลสาขาไม่สำเร็จ');
      }
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
          // Conflict - data was updated elsewhere
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

  async function addBranch() {
    const trimmedName = newBranchName.trim();
    
    if (!trimmedName) {
      setError('โปรดกรอกชื่อสาขา');
      return;
    }

    if (branches.includes(trimmedName)) {
      setError('สาขานี้มีอยู่แล้ว');
      return;
    }

    if (branches.length >= 100) {
      setError('สามารถเพิ่มได้สูงสุด 100 สาขา');
      return;
    }

    const updatedBranches = [...branches, trimmedName];
    const success = await saveBranches(updatedBranches);
    
    if (success) {
      setNewBranchName('');
      toast.success('เพิ่มสาขาสำเร็จ');
    }
  }

  async function deleteBranch(branchName) {
    if (!window.confirm(`ลบสาขา "${branchName}" หรือไม่?`)) {
      return;
    }

    const updatedBranches = branches.filter(b => b !== branchName);
    const success = await saveBranches(updatedBranches);
    
    if (success) {
      toast.success('ลบสาขาสำเร็จ');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-[#002B5B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Branch */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h3 className="mb-4 text-lg font-black text-[#071638]">เพิ่มสาขาใหม่</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => {
              setNewBranchName(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && addBranch()}
            placeholder="กรอกชื่อสาขา เช่น สาขาใหญ่, สาขาพระราม 2"
            disabled={saving}
            className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-semibold placeholder-[#94A3B8] focus:border-[#002B5B] focus:outline-none focus:ring-2 focus:ring-[#002B5B]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]"
          />
          <button
            onClick={addBranch}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#002B5B] px-6 font-black text-white transition hover:bg-[#001B3B] disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            เพิ่ม
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#B91C1C]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Branches List */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h3 className="mb-4 text-lg font-black text-[#071638]">รายชื่อสาขา ({branches.length})</h3>
        
        {branches.length === 0 ? (
          <p className="text-sm font-semibold text-[#64748B]">ยังไม่มีสาขา</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <div
                key={branch}
                className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 transition hover:bg-white hover:shadow-sm"
              >
                <span className="truncate font-semibold text-[#071638]">{branch}</span>
                <button
                  onClick={() => deleteBranch(branch)}
                  disabled={saving}
                  className="ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                  title="ลบสาขา"
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-2xl border border-[#DBEAFE] bg-[#F0F9FF] px-4 py-3">
        <p className="text-sm font-semibold text-[#0C4A6E]">
          💡 คำแนะนำ: สามารถเพิ่มหรือลบสาขาเพื่ออัปเดตรายชื่อสาขาที่ใช้งานในระบบเบิกเสื้อ
        </p>
      </div>
    </div>
  );
}
