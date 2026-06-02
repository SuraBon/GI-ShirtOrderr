import React, { useMemo, useState } from 'react';
import { RefreshCw, Truck, PackageCheck, PackageSearch, BarChart3 } from 'lucide-react';
import { Stat } from './DashboardCommon';
import { Select } from './SelectComponents';
import { TextInput } from './FormComponents';

function BranchSummary({ rows }) {
  const branchRows = useMemo(() => {
    const summaryMap = new Map();

    rows.forEach((row) => {
      const branch = row.branch || 'ไม่ระบุสาขา';
      const gender = row.gender || 'ไม่ระบุเพศ';
      const name = row.name || '-';
      const qty = Number(row.qty || 0);

      if (!summaryMap.has(branch)) {
        summaryMap.set(branch, {
          branch,
          qty: 0,
          maleEmployees: new Set(),
          femaleEmployees: new Set(),
          maleQty: 0,
          femaleQty: 0,
        });
      }

      const summary = summaryMap.get(branch);
      summary.qty += qty;

      if (gender === 'ชาย') {
        summary.maleEmployees.add(name);
        summary.maleQty += qty;
      } else if (gender === 'หญิง') {
        summary.femaleEmployees.add(name);
        summary.femaleQty += qty;
      }
    });

    return [...summaryMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .map((summary) => ({
        branch: summary.branch,
        qty: summary.qty,
        maleEmployees: summary.maleEmployees.size,
        femaleEmployees: summary.femaleEmployees.size,
        maleQty: summary.maleQty,
        femaleQty: summary.femaleQty,
      }));
  }, [rows]);

  return (
    <div className="dashboard-branch-summary-card">
      <div className="dashboard-panel-head slim">
        <div>
          <h3>สรุปตามสาขา</h3>
          <p>ดูสาขาที่เบิกมากที่สุด พร้อมจำนวนพนักงานตามเพศ</p>
        </div>
      </div>

      <div className="dashboard-branch-table-wrap">
        <table className="dashboard-branch-summary-table">
          <thead>
            <tr>
              <th>สาขา</th>
              <th>ผช</th>
              <th>ผญ</th>
              <th>รวมชิ้นที่เบิก</th>
              <th>สัดส่วน ชาย/หญิง</th>
            </tr>
          </thead>
          <tbody>
            {branchRows.map((branch) => (
              <tr key={branch.branch}>
                <td>{branch.branch}</td>
                <td>{branch.maleEmployees} คน</td>
                <td>{branch.femaleEmployees} คน</td>
                <td>{branch.qty} ชิ้น</td>
                <td>
                  {branch.maleQty} / {branch.femaleQty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!branchRows.length && (
          <div className="dashboard-drilldown-empty">ยังไม่มีข้อมูลสาขา</div>
        )}
      </div>
    </div>
  );
}

function StockOverview({ stockSummaryRows }) {
  const [activeType, setActiveType] = useState('ทั้งหมด');
  const [filterGender, setFilterGender] = useState('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState('');

  const typeOptions = useMemo(
    () => ['ทั้งหมด', ...Array.from(new Set(stockSummaryRows.map((row) => row.type)))],
    [stockSummaryRows]
  );

  const genderOptions = useMemo(
    () => ['ทั้งหมด', ...Array.from(new Set(stockSummaryRows.map((row) => row.gender)))],
    [stockSummaryRows]
  );

  const filteredRows = useMemo(() => {
    return stockSummaryRows
      .filter((row) => {
        if (activeType !== 'ทั้งหมด' && row.type !== activeType) return false;
        if (filterGender !== 'ทั้งหมด' && row.gender !== filterGender) return false;
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
  }, [stockSummaryRows, activeType, filterGender, searchTerm]);

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
          <p>เลือกดูตามแบบเสื้อและไซส์ เพื่อดูจำนวนเบิก, เหลือ, และสต๊อกล่าสุด</p>
        </div>
      </div>

      <div className="dashboard-stock-filters">
        <Select
          value={activeType}
          onChange={setActiveType}
          values={typeOptions}
          title="เลือกแบบเสื้อ"
          size="sm"
        />
        <Select
          value={filterGender}
          onChange={setFilterGender}
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

      <div className="dashboard-tabs" role="tablist" aria-label="แท็บแบบเสื้อ">
        {typeOptions.map((type) => (
          <button
            key={type}
            type="button"
            className="dashboard-tab"
            data-state={activeType === type ? 'active' : 'inactive'}
            onClick={() => setActiveType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="dashboard-stock-summary-totals dashboard-stock-summary-totals-grid">
        <span>รวมสต๊อก {stockTotals.totalStock} ชิ้น</span>
        <span>เบิกแล้ว {stockTotals.withdrawn} ชิ้น</span>
        <span>เหลือ {stockTotals.remaining} ชิ้น</span>
      </div>

      <div className="dashboard-stock-detail-table">
        <div className="dashboard-stock-detail-header">
          <span>ไซส์</span>
          <span>เพศ</span>
          <span>เบิกแล้ว</span>
          <span>คงเหลือ</span>
          <span>รวมสต๊อก</span>
        </div>
        {filteredRows.map((row) => (
          <div key={row.id} className="dashboard-stock-detail-row">
            <span>{row.size || '-'}</span>
            <span>{row.gender}</span>
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
  metrics,
  rows,
  filteredBatches,
  stockSummaryRows,
  pendingPiecePercent,
  statuses,
}) {
  const totalOrders = filteredBatches.length;
  const pendingBatches = filteredBatches.filter(
    (batch) => batch.status === (statuses?.pending || 'รอจัดส่ง')
  ).length;
  const pendingPieces = metrics.pendingPieces || 0;
  const shippedPieces = metrics.shippedPieces || 0;
  const totalPieces = metrics.totalPieces || 0;

  return (
    <div className="dashboard-overview-section">
      <div className="dashboard-overview-hero">
        <div>
          <h2>ภาพรวม</h2>
          <p>สรุป KPI, สต๊อก และการคิดรอจัดส่งในหน้าเดียว</p>
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
          <div className="dashboard-panel-head slim">
            <div>
              <h3>สรุป KPI</h3>
              <p>ตัวเลขสำคัญที่ใช้ตัดสินใจวันนี้</p>
            </div>
          </div>
          <div className="dashboard-overview-stats">
            <Stat icon={Truck} value={`${pendingPieces} ชิ้น`} label="รอจัดส่ง" />
            <Stat icon={PackageCheck} value={`${shippedPieces} ชิ้น`} label="จัดส่งแล้ว" />
            <Stat icon={BarChart3} value={`${pendingPiecePercent}%`} label="สัดส่วนรอจัดส่ง" />
            <Stat icon={PackageSearch} value={`${totalOrders} คำสั่ง`} label="คำสั่งทั้งหมด" />
          </div>
        </section>

        <section className="dashboard-overview-panel">
          <BranchSummary rows={rows} />
        </section>

        <section className="dashboard-overview-panel">
          <StockOverview stockSummaryRows={stockSummaryRows} />
        </section>

        <section className="dashboard-overview-panel">
          <div className="dashboard-panel-head slim">
            <div>
              <h3>คิดรอจัดส่ง</h3>
              <p>สรุปคำสั่งและชิ้นงานที่ยังรอจัดส่งในตอนนี้</p>
            </div>
          </div>
          <div className="dashboard-overview-details dashboard-overview-chart-details">
            <div>
              <span>คำสั่งรอจัดส่ง</span>
              <strong>{pendingBatches}</strong>
            </div>
            <div>
              <span>ชิ้นรอจัดส่ง</span>
              <strong>{pendingPieces}</strong>
            </div>
            <div>
              <span>รวมชิ้นทั้งหมด</span>
              <strong>{totalPieces}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DashboardOverview;
