import React, { useMemo, useState } from 'react';
import { Check, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { Field, TextInput } from './FormComponents';
import { Select } from './SelectComponents';
import { MiniMetric } from './DashboardCommon';

const EMPTY_EMPLOYEE_MASTER_FORM = {
  name: '',
  gender: '',
  branch: '',
  active: true,
};

export function getEmployeeMasterKey(employee = {}) {
  return `${String(employee.name || '').trim().toLowerCase()}::${String(employee.branch || '').trim().toLowerCase()}`;
}

export function normalizeEmployeeMaster(row = {}) {
  const employee = {
    employeeKey: String(row.employeeKey || '').trim(),
    name: String(row.name || '').trim(),
    gender: String(row.gender || '').trim(),
    branch: String(row.branch || '').trim(),
    active: row.active !== false,
    updatedAt: row.updatedAt || '',
  };
  return {
    ...employee,
    employeeKey: employee.employeeKey || getEmployeeMasterKey(employee),
  };
}

export function EmployeeMasterPanel({
  employees,
  branches,
  genders,
  loading,
  saving,
  search,
  onSearchChange,
  onReload,
  onSave,
  onDeactivate,
}) {
  const [form, setForm] = useState(EMPTY_EMPLOYEE_MASTER_FORM);
  const [editingId, setEditingId] = useState('');

  const activeCount = employees.filter((employee) => employee.active).length;
  const inactiveCount = employees.length - activeCount;
  const branchCount = new Set(employees.map((employee) => employee.branch).filter(Boolean)).size;
  const filteredEmployees = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    if (!queryText) return employees;
    return employees.filter((employee) =>
      [
        employee.name,
        employee.gender,
        employee.branch,
        employee.active ? 'ใช้งาน' : 'ปิดใช้งาน',
      ]
        .join(' ')
        .toLowerCase()
        .includes(queryText)
    );
  }, [employees, search]);

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function resetForm() {
    setForm(EMPTY_EMPLOYEE_MASTER_FORM);
    setEditingId('');
  }

  function editEmployee(employee) {
    setForm(normalizeEmployeeMaster(employee));
    setEditingId(employee.employeeKey);
  }

  async function submit(event) {
    event.preventDefault();
    const saved = await onSave?.(normalizeEmployeeMaster(form), editingId);
    if (saved) resetForm();
  }

  return (
    <div className="employee-master-panel">
      <div className="dashboard-panel-summary employee-master-summary">
        <MiniMetric label="ข้อมูลพนักงานทั้งหมด" value={`${employees.length} คน`} />
        <MiniMetric label="ใช้งาน" value={`${activeCount} คน`} />
        <MiniMetric label="ปิดใช้งาน" value={`${inactiveCount} คน`} />
        <MiniMetric label="สาขาที่มีพนักงาน" value={`${branchCount} สาขา`} />
      </div>

      <div className="employee-master-grid">
        <form className="employee-master-form" onSubmit={submit}>
          <div className="dashboard-panel-head slim">
            <div>
              <h2>{editingId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มข้อมูลพนักงาน'}</h2>
              <p>ข้อมูลหลักใช้ผูกคำสั่งเบิกกับพนักงานจริง</p>
            </div>
          </div>
          <div className="employee-master-form-grid">
            <Field label="ชื่อพนักงาน">
              <TextInput
                value={form.name}
                onChange={(value) => updateForm({ name: value })}
                placeholder="ชื่อ-นามสกุล"
                disabled={saving}
              />
            </Field>
            <Field label="เพศ">
              <Select
                value={form.gender}
                onChange={(value) => updateForm({ gender: value })}
                values={['', ...(genders || [])]}
                placeholder="เลือกเพศ"
                title="เลือกเพศ"
                disabled={saving}
              />
            </Field>
            <Field label="สาขา">
              <Select
                value={form.branch}
                onChange={(value) => updateForm({ branch: value })}
                values={['', ...branches]}
                placeholder="เลือกสาขา"
                title="เลือกสาขา"
                disabled={saving}
              />
            </Field>
          </div>
          <div className="employee-master-actions">
            <button type="submit" className="dashboard-primary-action" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}
            </button>
            {editingId && (
              <button type="button" className="dashboard-action-btn" onClick={resetForm} disabled={saving}>
                ยกเลิกแก้ไข
              </button>
            )}
          </div>
        </form>

        <section className="employee-master-table-card">
          <div className="dashboard-panel-head slim">
            <div>
              <h2>ข้อมูลพนักงาน</h2>
              <p>ค้นหาและจัดการข้อมูลพนักงานที่ใช้งานในระบบ</p>
            </div>
            <div className="dashboard-panel-actions">
              <button type="button" onClick={onReload} disabled={loading || saving}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                โหลดใหม่
              </button>
            </div>
          </div>
          <div className="employee-master-search">
            <TextInput
              value={search}
              onChange={onSearchChange}
              placeholder="ค้นหาชื่อ เพศ หรือสาขา"
            />
          </div>
          <div className="dashboard-table-wrap employee-master-table-wrap">
            <table className="employee-master-table">
              <thead>
                <tr>
                  <th>ชื่อพนักงาน</th>
                  <th>เพศ</th>
                  <th>สาขา</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.employeeKey}>
                    <td>{employee.name}</td>
                    <td>{employee.gender || '-'}</td>
                    <td>{employee.branch || '-'}</td>
                    <td>
                      <span className={employee.active ? 'employee-status active' : 'employee-status inactive'}>
                        {employee.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td>
                      <div className="employee-master-row-actions">
                        <button type="button" onClick={() => editEmployee(employee)} disabled={saving}>
                          <Pencil className="size-4" />
                          แก้ไข
                        </button>
                        {employee.active && (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => onDeactivate?.(employee)}
                            disabled={saving}
                          >
                            ปิดใช้งาน
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredEmployees.length && (
                  <tr>
                    <td colSpan="5">
                      <div className="dashboard-drilldown-empty">
                        {loading ? 'กำลังโหลดข้อมูลพนักงาน...' : 'ไม่พบข้อมูลพนักงานตามเงื่อนไข'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="employee-master-card-list">
            {filteredEmployees.map((employee) => (
              <article key={`${employee.employeeKey}-card`} className="employee-master-mobile-card">
                <div className="employee-master-mobile-head">
                  <div>
                    <strong>{employee.name}</strong>
                    <span>{employee.branch || '-'}</span>
                  </div>
                  <span className={employee.active ? 'employee-status active' : 'employee-status inactive'}>
                    {employee.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>
                <div className="employee-master-mobile-grid">
                  <span>เพศ <b>{employee.gender || '-'}</b></span>
                  <span>สาขา <b>{employee.branch || '-'}</b></span>
                </div>
                <div className="employee-master-row-actions">
                  <button type="button" onClick={() => editEmployee(employee)} disabled={saving}>
                    <Pencil className="size-4" />
                    แก้ไข
                  </button>
                  {employee.active && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onDeactivate?.(employee)}
                      disabled={saving}
                    >
                      ปิดใช้งาน
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!filteredEmployees.length && (
              <div className="dashboard-drilldown-empty">
                {loading ? 'กำลังโหลดข้อมูลพนักงาน...' : 'ไม่พบข้อมูลพนักงานตามเงื่อนไข'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default EmployeeMasterPanel;
