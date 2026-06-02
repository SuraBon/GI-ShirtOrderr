import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Donut, LineChart } from './SimpleCharts';
import { Select } from './SelectComponents';
import { TextInput } from './FormComponents';

function formatMonthLabel(date) {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function limitChartRows(rows, maxRows = 6) {
  const sorted = rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'th'));
  if (sorted.length <= maxRows) return sorted;
  const visible = sorted.slice(0, maxRows - 1);
  const otherValue = sorted.slice(maxRows - 1).reduce((sum, row) => sum + row.value, 0);
  return [...visible, { label: 'อื่นๆ', value: otherValue, color: '#CBD5E1' }];
}

function DashboardMetrics({ metrics, stockSummaryRows }) {
  const stockTotals = useMemo(
    () =>
      stockSummaryRows.reduce(
        (totals, row) => {
          const amount = Number(row.totalStock || 0);
          return {
            totalStock: totals.totalStock + amount,
            maleStock: totals.maleStock + (row.gender === 'ชาย' ? amount : 0),
            femaleStock: totals.femaleStock + (row.gender === 'หญิง' ? amount : 0),
          };
        },
        { totalStock: 0, maleStock: 0, femaleStock: 0 }
      ),
    [stockSummaryRows]
  );

  return (
    <div className="dashboard-overview-stats">
      <div className="dashboard-overview-stat-card">
        <div>
          <span>!</span>
          <div>
            <p>{metrics.pendingBatches || 0} คำสั่ง</p>
            <small>รายการรออนุมัติ</small>
          </div>
        </div>
      </div>
      <div className="dashboard-overview-stat-card">
        <div>
          <span>📦</span>
          <div>
            <p>{stockTotals.totalStock.toLocaleString('th-TH')} ชิ้น</p>
            <small>สต๊อกรวม (ชาย {stockTotals.maleStock.toLocaleString('th-TH')} / หญิง {stockTotals.femaleStock.toLocaleString('th-TH')})</small>
          </div>
        </div>
      </div>
      <div className="dashboard-overview-stat-card">
        <div>
          <span>↗️</span>
          <div>
            <p>{metrics.shippedPieces || 0} ชิ้น</p>
            <small>ยอดเบิกสะสม</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockCharts({ rows }) {
  const sizeShareRows = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const gender = row.gender || 'ไม่ระบุเพศ';
      const size = row.size || '-';
      const key = `${gender} ${size}`;
      map.set(key, (map.get(key) || 0) + Number(row.qty || 0));
    });
    return limitChartRows(
      [...map.entries()].map(([label, value], index) => ({
        label,
        value,
        color: index === 0 ? '#2563eb' : index === 1 ? '#f97316' : index === 2 ? '#8b5cf6' : index === 3 ? '#ec4899' : '#22c55e',
      }))
    );
  }, [rows]);

  const trendRows = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const submittedAt = row.submittedAt ? new Date(row.submittedAt) : null;
      if (!submittedAt || Number.isNaN(submittedAt.getTime())) return;
      const key = `${submittedAt.getFullYear()}-${String(submittedAt.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + Number(row.qty || 0));
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'th'))
      .slice(-6)
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        return {
          label: formatMonthLabel(new Date(Number(year), Number(month) - 1, 1)),
          value,
        };
      });
  }, [rows]);

  return (
    <div className="dashboard-overview-chart-grid">
      <div className="dashboard-overview-chart-card">
        <div className="dashboard-overview-chart-head">
          <h3>สัดส่วนไซส์เสื้อ</h3>
          <p>ดูไซส์ที่มีการเบิกสูงสุดตามเพศ</p>
        </div>
        <div className="dashboard-overview-chart-body dashboard-chart-with-legend">
          <div className="dashboard-donut-wrapper">
            <Donut data={sizeShareRows} size={200} stroke={18} />
          </div>
          <div className="dashboard-donut-legend">
            {sizeShareRows.map((item) => (
              <div key={item.label} className="dashboard-donut-legend-row">
                <span style={{ background: item.color }} />
                <strong>{item.label}</strong>
                <small>{item.value} ชิ้น</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-overview-chart-card">
        <div className="dashboard-overview-chart-head">
          <h3>แนวโน้มการเบิก</h3>
          <p>ดูการเคลื่อนไหวของยอดเบิกรายเดือน</p>
        </div>
        <div className="dashboard-overview-chart-body">
          {trendRows.length ? (
            <LineChart data={trendRows} width={320} height={170} />
          ) : (
            <div className="dashboard-empty-line">ยังไม่มีข้อมูลแนวโน้ม</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentRequests({ batches }) {
  const recentRows = useMemo(
    () =>
      [...batches]
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime() ||
            String(b.batchId).localeCompare(String(a.batchId), 'th')
        )
        .slice(0, 5),
    [batches]
  );

  return (
    <div className="dashboard-overview-panel dashboard-recent-requests-card">
      <div className="dashboard-panel-head slim">
        <div>
          <h3>รายการขอล่าสุด</h3>
          <p>คำขอ 5 อันดับล่าสุด พร้อมปุ่มดูรายละเอียด</p>
        </div>
      </div>
      <div className="dashboard-recent-requests-table-wrap">
        <table className="dashboard-recent-requests-table">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>สาขา</th>
              <th>วันที่</th>
              <th>ชิ้น</th>
              <th>สถานะ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recentRows.map((batch) => (
              <tr key={batch.batchId}>
                <td>{batch.batchId}</td>
                <td>{batch.branch || '-'}</td>
                <td>{new Date(batch.submittedAt).toLocaleDateString('th-TH')}</td>
                <td>{batch.orders.reduce((sum, order) => sum + order.items.reduce((s, item) => s + Number(item.qty || 0), 0), 0)}</td>
                <td>{batch.status}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = '#/order';
                    }}
                    className="dashboard-action-btn"
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
            {!recentRows.length && (
              <tr>
                <td colSpan="6">
                  <div className="dashboard-empty-line">ยังไม่มีคำขอใหม่</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
  metrics,
  rows,
  filteredBatches,
  stockSummaryRows,
  statuses,
}) {
  return (
    <div className="dashboard-overview-section">
      <div className="dashboard-overview-hero">
        <div>
          <h2>ภาพรวม</h2>
          <p>ตัวเลขสรุป สต๊อก และคำขอใหม่ในหน้าเดียว</p>
        </div>
        <div className="dashboard-panel-actions">
          <button type="button" onClick={onRefresh} className="dashboard-action-btn dark">
            <RefreshCw className="size-4" />
            โหลดข้อมูลใหม่
          </button>
        </div>
      </div>

      <DashboardMetrics metrics={metrics} stockSummaryRows={stockSummaryRows} />
      <StockCharts rows={rows} />

      <div className="dashboard-overview-grid">
        <section className="dashboard-overview-panel">
          <BranchOverview rows={rows} statuses={statuses} />
        </section>

        <section className="dashboard-overview-panel">
          <StockOverview stockSummaryRows={stockSummaryRows} />
        </section>
      </div>

      <RecentRequests batches={filteredBatches} />
    </div>
  );
}

export default DashboardOverview;
