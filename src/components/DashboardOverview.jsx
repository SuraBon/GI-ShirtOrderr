import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Select } from './SelectComponents';
import { TextInput } from './FormComponents';

function BranchOverview({ rows, statuses }) {
  const branchOptions = useMemo(
    () => ['ทั้งหมด', ...Array.from(new Set(rows.map((row) => row.branch || 'ไม่ระบุสาขา')))],
    [rows]
  );
  const [selectedBranch, setSelectedBranch] = useState('ทั้งหมด');

  const branchRows = useMemo(
    () =>
      rows.filter((row) =>
        selectedBranch === 'ทั้งหมด' ? true : row.branch === selectedBranch
      ),
    [rows, selectedBranch]
  );

  const branchSummary = useMemo(() => {
    const summary = {
      branch: selectedBranch,
      totalQty: 0,
      maleEmployees: new Set(),
      femaleEmployees: new Set(),
      maleQty: 0,
      femaleQty: 0,
      pendingQty: 0,
      unfinishedOrders: new Set(),
    };

    branchRows.forEach((row) => {
      const gender = row.gender || 'ไม่ระบุเพศ';
      const name = row.name || '-';
      const qty = Number(row.qty || 0);
      const status = row.itemStatus || row.status;
      const isPending = status === (statuses?.pending || 'รอจัดส่ง');

      summary.totalQty += qty;
      if (gender === 'ชาย') {
        summary.maleEmployees.add(name);
        summary.maleQty += qty;
      } else if (gender === 'หญิง') {
        summary.femaleEmployees.add(name);
        summary.femaleQty += qty;
      }

      if (isPending) {
        summary.pendingQty += qty;
        summary.unfinishedOrders.add(row.batchId);
      }
    });

    return {
      branch: summary.branch,
      totalQty: summary.totalQty,
      maleEmployees: summary.maleEmployees.size,
      femaleEmployees: summary.femaleEmployees.size,
      maleQty: summary.maleQty,
      femaleQty: summary.femaleQty,
      pendingQty: summary.pendingQty,
      unfinishedOrders: summary.unfinishedOrders.size,
    };
  }, [branchRows, selectedBranch, statuses]);

  return (
    <div className="dashboard-branch-card">
      <div className="dashboard-panel-head slim">
        <div>
          <h3>สรุปตามสาขา</h3>
          <p>เลือกสาขาเพื่อดูจำนวนคน และยอดเบิกตามเพศ</p>
        </div>
      </div>

      <div className="dashboard-stock-filters">
        <Select
          value={selectedBranch}
          onChange={setSelectedBranch}
          values={branchOptions}
          title="เลือกสาขา"
          size="sm"
        />
      </div>

      <div className="dashboard-branch-summary-grid">
        <div>
          <span>สาขา</span>
          <strong>{selectedBranch}</strong>
        </div>
        <div>
          <span>ชาย</span>
          <strong>{branchSummary.maleEmployees} คน</strong>
        </div>
        <div>
          <span>หญิง</span>
          <strong>{branchSummary.femaleEmployees} คน</strong>
        </div>
        <div>
          <span>รวมชิ้นที่เบิก</span>
          <strong>{branchSummary.totalQty} ชิ้น</strong>
        </div>
        <div>
          <span>สัดส่วน ชาย/หญิง</span>
          <strong>{branchSummary.maleQty} / {branchSummary.femaleQty}</strong>
        </div>
        <div>
          <span>คำสั่งยังไม่เสร็จ</span>
          <strong>{branchSummary.unfinishedOrders} คำสั่ง</strong>
        </div>
      </div>

      {branchSummary.pendingQty > 0 && (
        <div className="dashboard-overview-finish-note">
          ยังมีรายการรอจัดส่ง {branchSummary.pendingQty} ชิ้น ในสาขานี้
        </div>
      )}
    </div>
  );
}

function StockOverview({ stockSummaryRows }) {
  const typeOptions = useMemo(
    () => ['ทั้งหมด', ...Array.from(new Set(stockSummaryRows.map((row) => row.type)))],
    [stockSummaryRows]
  );
  const genderOptions = useMemo(
    () => ['ทั้งหมด', ...Array.from(new Set(stockSummaryRows.map((row) => row.gender)))],
    [stockSummaryRows]
  );

  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedGender, setSelectedGender] = useState('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    return stockSummaryRows
      .filter((row) => {
        if (selectedType !== 'ทั้งหมด' && row.type !== selectedType) return false;
        if (selectedGender !== 'ทั้งหมด' && row.gender !== selectedGender) return false;
        if (searchTerm) {
          const text = `${row.type} ${row.gender} ${row.size}`.toLowerCase();
          return text.includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type, 'th');
        if (a.gender !== b.gender) return a.gender.localeCompare(b.gender, 'th');
        return String(a.size || '').localeCompare(String(b.size || ''), 'th', { numeric: true });
      });
  }, [stockSummaryRows, selectedType, selectedGender, searchTerm]);

  const stockTotals = useMemo(
    () =>
      filteredRows.reduce(
        (totals, row) => ({
          totalStock: totals.totalStock + row.totalStock,
          withdrawn: totals.withdrawn + row.withdrawn,
          remaining: totals.remaining + row.remaining,
        }),
        { totalStock: 0, withdrawn: 0, remaining: 0 }
      ),
    [filteredRows]
  );

  return (
    <div className="dashboard-stock-detail-card">
      <div className="dashboard-panel-head slim">
        <div>
          <h3>ภาพรวมสต๊อก</h3>
          <p>เลือกแบบเสื้อและเพศ เพื่อดูสต๊อกตามไซส์</p>
        </div>
      </div>

      <div className="dashboard-stock-filters">
        <Select
          value={selectedType}
          onChange={setSelectedType}
          values={typeOptions}
          title="เลือกแบบเสื้อ"
          size="sm"
        />
        <Select
          value={selectedGender}
          onChange={setSelectedGender}
          values={genderOptions}
          title="เลือกเพศ"
          size="sm"
        />
        <TextInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="ค้นหาแบบ, เพศ, ไซส์"
        />
      </div>

      <div className="dashboard-stock-summary-totals dashboard-stock-summary-totals-grid">
        <span>รวมสต๊อก {stockTotals.totalStock} ชิ้น</span>
        <span>เบิกแล้ว {stockTotals.withdrawn} ชิ้น</span>
        <span>เหลือ {stockTotals.remaining} ชิ้น</span>
      </div>

      <div className="dashboard-stock-detail-table">
        <div className="dashboard-stock-detail-header">
          <span>แบบเสื้อ</span>
          <span>เพศ</span>
          <span>ไซส์</span>
          <span>เบิกแล้ว</span>
          <span>คงเหลือ</span>
          <span>รวมสต๊อก</span>
        </div>
        {filteredRows.map((row) => (
          <div key={row.id} className="dashboard-stock-detail-row">
            <span>{row.type}</span>
            <span>{row.gender}</span>
            <span>{row.size || '-'}</span>
            <span>{row.withdrawn}</span>
            <span>{row.remaining}</span>
            <span>{row.totalStock}</span>
          </div>
        ))}
        {!filteredRows.length && (
          <div className="dashboard-drilldown-empty">ไม่พบข้อมูลตามเงื่อนไข</div>
        )}
      </div>
    </div>
  );
}

export function DashboardOverview({
  onRefresh,
  rows,
  stockSummaryRows,
  statuses,
}) {
  return (
    <div className="dashboard-overview-section">
      <div className="dashboard-overview-hero">
        <div>
          <h2>ภาพรวม</h2>
          <p>เลือกสาขาและแบบเสื้อเพื่อดูสต๊อก และรายการยังไม่เสร็จ</p>
        </div>
        <div className="dashboard-panel-actions">
          <button type="button" onClick={onRefresh} className="dashboard-action-btn dark">
            <RefreshCw className="size-4" />
            โหลดข้อมูลใหม่
          </button>
        </div>
      </div>

      <div className="dashboard-overview-grid">
        <section className="dashboard-overview-panel">
          <BranchOverview rows={rows} statuses={statuses} />
        </section>

        <section className="dashboard-overview-panel">
          <StockOverview stockSummaryRows={stockSummaryRows} />
        </section>
      </div>

      <div className="dashboard-overview-note">
        <strong>หมายเหตุ:</strong> หากยังมีรายการรอจัดส่ง ระบบจะแสดงยอดคงค้างไว้ในสรุปสาขา
      </div>
    </div>
  );
}

export default DashboardOverview;
