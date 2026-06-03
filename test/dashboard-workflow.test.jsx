import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { DASHBOARD_SESSION_KEY } from '../src/lib/api';

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
}

function readSourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return readSourceFiles(path);
    if (!/\.(js|jsx|css)$/.test(entry)) return [];
    return [path];
  });
}

describe('dashboard workflow', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '#/dashboard';
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
    sessionStorage.setItem(DASHBOARD_SESSION_KEY, 'test-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.includes('/api/auth/dashboard')) return jsonResponse({ token: 'test-token' });
        if (path.includes('/api/dashboard/orders')) return jsonResponse({ success: true, data: [] });
        if (path.includes('/api/blob/branches')) return jsonResponse({ branches: ['GI(สาขาใหญ่)'] });
        if (path.includes('/api/blob/config')) return jsonResponse({ config: null });
        return jsonResponse({ success: true, data: [] });
      })
    );
  });

  it('opens the dashboard on รายการเบิก and shows fresh-data empty state', async () => {
    await act(async () => {
      await import('../src/main.jsx');
    });

    const heading = await screen.findByRole('heading', { name: 'รายการเบิก' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('ยังไม่มีรายการเบิก')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เปิดหน้าสั่งเบิกเสื้อ' })).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'เมนูแอดมิน' });
    expect(within(nav).getByRole('button', { name: /ประวัติการเบิก/ })).toBeInTheDocument();
    expect(screen.queryByText('ประวัติพนักงาน')).not.toBeInTheDocument();
  }, 20000);

  it('shows the overview empty state and quick link for a new demo dataset', async () => {
    await act(async () => {
      await import('../src/main.jsx');
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /ภาพรวม/ }));
    });

    expect(await screen.findByRole('heading', { name: 'ภาพรวมงานเบิกเสื้อ' })).toBeInTheDocument();
    expect(screen.getByText('ยังไม่มีรายการเบิก')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'เปิดหน้าสั่งเบิกเสื้อ' })[0]).toBeInTheDocument();
  }, 20000);

  it('resets back to รายการเบิก after logout and login from another dashboard view', async () => {
    await act(async () => {
      await import('../src/main.jsx');
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /สต๊อก/ }));
    });
    expect(await screen.findByRole('heading', { name: 'สต๊อก' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }));
    });
    expect(await screen.findByRole('heading', { name: 'เข้าสู่หน้าจัดการ' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผู้ดูแล'), { target: { value: '1234' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่หน้าจัดการ' }));
    });

    expect(await screen.findByRole('heading', { name: 'รายการเบิก' })).toBeInTheDocument();
  }, 20000);

  it('does not bring removed employee-master or manual copy back into source', () => {
    const sourceText = readSourceFiles(join(process.cwd(), 'src'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(sourceText).not.toContain('ข้อมูลพนักงาน');
    expect(sourceText).not.toContain('ประวัติพนักงาน');
    expect(sourceText).not.toContain('คู่มือ');
    expect(sourceText).not.toContain('deleteEmployeeSheet');
  });
});
