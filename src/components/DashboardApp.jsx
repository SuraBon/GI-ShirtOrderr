import React, { useState } from 'react';
import {
  LayoutDashboard,
  Loader2,
  Shirt,
  UserCheck,
} from 'lucide-react';
import { getAdminToken, setAdminToken } from '../lib/api';
import { BRANCHES } from '../constants/branches';
import { Field, TextInput, Card, DashboardHeader, Logo } from '.';
import { AdminManualDialog } from './SharedDialogs';
import Dashboard from './Dashboard';

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

export default DashboardApp;

