import React, { useMemo } from 'react';
import { AlertTriangle, PackageCheck, RefreshCw, Shirt } from 'lucide-react';

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getBatchPieces(batch) {
  return batch.orders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0),
    0
  );
}


function KpiCard({ icon: Icon, label, value, detail, tone = 'default' }) {
  return (
    <div className={`dashboard-overview-stat-card ${tone}`}>
      <span className="dashboard-overview-stat-icon">
        <Icon className="size-4" />
      </span>
      <div>
        <p>{value}</p>
        <small>{label}</small>
        {detail ? <em>{detail}</em> : null}
      </div>
    </div>
  );
}

function PanelHeader({ title, description, action }) {
  return (
    <div className="dashboard-overview-chart-head">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function PendingOrdersPanel({ batches, statuses }) {
  const pendingStatus = statuses?.pending || 'รอจัดส่ง';
  const rows = useMemo(
    () =>
      batches
        .filter((batch) => batch.status === pendingStatus)
        .sort(
          (a, b) =>
            new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime() ||
            String(a.batchId).localeCompare(String(b.batchId), 'th', { numeric: true })
        )
        .slice(0, 5),
    [batches, pendingStatus]
  );

  return (
    <section className="dashboard-overview-panel dashboard-overview-panel-primary">
      <PanelHeader
        title="งานรอจัดส่ง"
        description="คำสั่งเบิกที่ควรจัดการก่อน เรียงจากรายการเก่าสุด"
        action={<span className="overview-count-chip">{rows.length} งาน</span>}
      />
      <div className="overview-task-list">
        {rows.map((batch) => (
          <article key={batch.batchId} className="overview-task-card">
            <div className="overview-task-card-meta">
              <strong>{batch.batchId}</strong>
              <span>{batch.branch || '-'}</span>
              <small>{formatDate(batch.submittedAt)} · {getBatchPieces(batch)} ชิ้น</small>
            </div>
            <span>{batch.status}</span>
          </article>
        ))}
        {!rows.length && <div className="dashboard-empty-line">ไม่มีคำสั่งเบิกที่รอจัดส่ง</div>}
      </div>
    </section>
  );
}

function BranchSummaryPanel({ rows, statuses }) {
  const pendingStatus = statuses?.pending || 'รอจัดส่ง';
  const summaryRows = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const branch = row.branch || 'ไม่ระบุสาขา';
      const current = map.get(branch) || {
        branch,
        totalQty: 0,
        maleQty: 0,
        femaleQty: 0,
        pendingQty: 0,
        sizes: new Map(),
      };
      const qty = Number(row.qty || 0);
      current.totalQty += qty;
      if (row.gender === 'ชาย') current.maleQty += qty;
      if (row.gender === 'หญิง') current.femaleQty += qty;
      if ((row.itemStatus || row.status) === pendingStatus) current.pendingQty += qty;
      const size = row.size || '-';
      current.sizes.set(size, (current.sizes.get(size) || 0) + qty);
      map.set(branch, current);
    });

    return [...map.values()]
      .map((item) => ({
        ...item,
        topSizes: [...item.sizes.entries()]
          .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'th', { numeric: true }))
          .slice(0, 3),
      }))
      .sort((a, b) => b.totalQty - a.totalQty || a.branch.localeCompare(b.branch, 'th', { numeric: true }))
      .slice(0, 6);
  }, [rows, pendingStatus]);

  return (
    <section className="dashboard-overview-panel dashboard-branch-summary-panel">
      <PanelHeader
        title="สรุปตามสาขา"
        description="ดูว่าสาขาไหนเบิกเท่าไหร่ แยกชาย หญิง และไซส์ที่ใช้บ่อย"
      />
      <div className="overview-branch-grid">
        {summaryRows.map((row) => (
          <article key={row.branch} className="overview-branch-card">
            <div className="overview-branch-card-head">
              <strong>{row.branch}</strong>
              <span>{row.totalQty.toLocaleString('th-TH')} ชิ้น</span>
            </div>
            <div className="overview-branch-metrics">
              <span>ชาย <b>{row.maleQty.toLocaleString('th-TH')}</b></span>
              <span>หญิง <b>{row.femaleQty.toLocaleString('th-TH')}</b></span>
              <span>รอจัดส่ง <b>{row.pendingQty.toLocaleString('th-TH')}</b></span>
            </div>
            <div className="overview-size-chips">
              {row.topSizes.length ? (
                row.topSizes.map(([size, qty]) => <span key={`${row.branch}-${size}`}>{size} ({qty})</span>)
              ) : (
                <span>ไม่มีข้อมูลไซส์</span>
              )}
            </div>
          </article>
        ))}
        {!summaryRows.length && <div className="dashboard-empty-line">ยังไม่มีข้อมูลสาขาตามตัวกรอง</div>}
      </div>
    </section>
  );
}

export function DashboardOverview({ onRefresh, metrics, rows, filteredBatches, stockSummaryRows, statuses }) {
  const stockTotals = useMemo(
    () =>
      stockSummaryRows.reduce(
        (totals, row) => ({
          totalStock: totals.totalStock + Number(row.totalStock || 0),
          remaining: totals.remaining + Number(row.remaining || 0),
          withdrawn: totals.withdrawn + Number(row.withdrawn || 0),
        }),
        { totalStock: 0, remaining: 0, withdrawn: 0 }
      ),
    [stockSummaryRows]
  );
  return (
    <div className="dashboard-overview-section">
      <div className="dashboard-overview-hero">
        <div>
          <span className="overview-section-label">ภาพรวมแดชบอร์ด</span>
          <h2>ติดตามคำสั่งเบิกและสรุปตามสาขา</h2>
          <p>ดูงานรอจัดส่งและสรุปคำสั่งเบิกตามสาขาในหน้าเดียว</p>
        </div>
        <button type="button" onClick={onRefresh} className="dashboard-action-btn dark">
          <RefreshCw className="size-4" />
          โหลดข้อมูลใหม่
        </button>
      </div>

      <div className="dashboard-overview-stats">
        <KpiCard
          icon={AlertTriangle}
          label="คำสั่งเบิกรอจัดส่ง"
          value={`${metrics.pendingBatches || 0} คำสั่ง`}
          detail={`${metrics.pendingPieces || 0} ชิ้น`}
          tone="warning"
        />
        <KpiCard
          icon={PackageCheck}
          label="จัดส่งแล้ว"
          value={`${metrics.shippedPieces || 0} ชิ้น`}
          detail={`${metrics.deliveredBatches || 0} คำสั่ง`}
          tone="success"
        />
        <KpiCard
          icon={Shirt}
          label="สต๊อกคงเหลือ"
          value={`${stockTotals.remaining.toLocaleString('th-TH')} ชิ้น`}
          detail={`เบิกแล้ว ${stockTotals.withdrawn.toLocaleString('th-TH')} ชิ้น`}
        />
      </div>

      <div className="dashboard-overview-workspace dashboard-overview-workspace--wide">
        <PendingOrdersPanel batches={filteredBatches} statuses={statuses} />
        <BranchSummaryPanel rows={rows} statuses={statuses} />
      </div>

    </div>
  );
}

export default DashboardOverview;
