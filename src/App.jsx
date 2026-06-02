import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { loadSharedClothingConfig } from './lib/config';
import { loadBranchesWithFallback } from './lib/branches';
import { BRANCHES } from './constants/branches';
import { TOAST_DURATION_MS, TOAST_VISIBLE_COUNT, TOAST_GAP_PX } from './lib/magicNumbers';
import DashboardApp from './components/DashboardApp';
import QuickOrderApp from './components/QuickOrderApp';

const DASHBOARD_PATH = '#/dashboard';
const ORDER_PATH = '/';

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


export default function AppRoot() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

