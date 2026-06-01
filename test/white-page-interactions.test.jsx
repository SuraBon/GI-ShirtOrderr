import { fireEvent, screen, waitFor, within } from '@testing-library/react';

describe('order page mobile interactions', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
    localStorage.clear();
    window.location.hash = '';
    Object.defineProperty(window, 'innerWidth', { value: 390, writable: true, configurable: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, data: [] }))));
  });

  it('does not crash when tapping primary mobile order controls', async () => {
    await import('../src/main.jsx');

    fireEvent.change(await screen.findByPlaceholderText('ชื่อ-นามสกุล'), {
      target: { value: 'ทดสอบ ระบบ' },
    });
    fireEvent.change(screen.getByPlaceholderText('08X-XXX-XXXX'), {
      target: { value: '0812345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป: รายการเสื้อพนักงาน' }));

    await waitFor(() => {
      expect(screen.getByText('รายชื่อพนักงานและเสื้อที่เบิก')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแถว' }));
    await waitFor(() => {
      expect(screen.getByText('แก้ไขข้อมูล ลำดับที่ 2')).toBeInTheDocument();
    });

    const editorCard = screen.getByText('แก้ไขข้อมูล ลำดับที่ 2').closest('article');
    const editor = within(editorCard);
    fireEvent.click(editor.getAllByText('ชาย')[0]);
    fireEvent.click(editor.getAllByRole('button', { name: 'เพิ่มเสื้อ' })[0]);
    fireEvent.click(editor.getByRole('button', { name: 'เสร็จสิ้น' }));

    expect(screen.getAllByRole('button', { name: 'แก้ไข' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }, 10000);

  it('does not crash when tapping header and navigation controls', async () => {
    await import('../src/main.jsx');

    fireEvent.click(await screen.findByRole('button', { name: 'ข้อมูลเสื้อ' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'คู่มือการใช้งาน' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'แดชบอร์ด' }));
    await waitFor(() => expect(window.location.hash).toBe('#/dashboard'));
    expect(document.body.textContent).toContain('เข้าสู่แดชบอร์ด');
  });
});
