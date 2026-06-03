import React, { useMemo } from 'react';
import { AlertTriangle, PackageCheck, RefreshCw, Shirt } from 'lucide-react';
import {
  DashboardEmptyState,
  DashboardRecentOrdersPanel,
  DashboardStockPanel,
  DashboardTaskPanel,
} from './DashboardWorkflowPanels';

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

export function DashboardOverview({
  onRefresh,
  metrics,
  filteredBatches,
  stockSummaryRows,
  statuses,
  onViewChange,
  onOpenOrder,
}) {
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
  const hasOrders = filteredBatches.length > 0;

  return (
    <div className="dashboard-overview-section">
      <div className="dashboard-workflow-head">
        <div>
          <h2>ภาพรวมงาน</h2>
          <p>ดูงานที่ต้องจัดการก่อน แล้วเปิดรายการเบิกหรือสต๊อกได้จากหน้านี้</p>
        </div>
        <div className="dashboard-workflow-head-actions">
          <button type="button" onClick={() => onViewChange?.('orders')} className="dashboard-primary-action">
            รายการเบิก
          </button>
          <button type="button" onClick={onRefresh} className="dashboard-action-btn dashboard-secondary-action">
            <RefreshCw className="size-4" />
            โหลดใหม่
          </button>
        </div>
      </div>

      {!hasOrders && <DashboardEmptyState onOpenOrder={onOpenOrder} />}

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

      <div className="dashboard-workflow-grid">
        <DashboardTaskPanel
          batches={filteredBatches}
          statuses={statuses}
          onOpenOrders={() => onViewChange?.('orders')}
        />
        <DashboardStockPanel stockRows={stockSummaryRows} onOpenStock={() => onViewChange?.('stock')} />
        <DashboardRecentOrdersPanel
          batches={filteredBatches}
          statuses={statuses}
          onOpenOrders={() => onViewChange?.('orders')}
        />
      </div>

    </div>
  );
}

export default DashboardOverview;
