import React, { useMemo } from 'react';
import { AlertTriangle, Ban, PackageCheck, Shirt } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DashboardEmptyState,
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
  metrics,
  filteredBatches,
  itemRows = [],
  stockSummaryRows,
  statuses,
  onViewChange,
  onOpenOrder,
  onQuickShip,
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
  
  const branchChartRows = useMemo(() => {
    const totals = new Map();
    itemRows
      .filter((row) => (row.itemStatus || row.status) === statuses.pending)
      .forEach((row) => totals.set(row.branch || '-', (totals.get(row.branch || '-') || 0) + Number(row.qty || 0)));
    return [...totals.entries()]
      .map(([branch, qty]) => ({ branch, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [itemRows, statuses.pending]);

  const statusChartRows = [
    { name: statuses.pending, value: metrics.pendingPieces || 0, color: '#f59e0b' },
    { name: statuses.delivered, value: metrics.shippedPieces || 0, color: '#10b981' },
    { name: statuses.canceled, value: metrics.canceledPieces || 0, color: '#64748b' },
  ].filter((row) => row.value > 0);

  return (
    <div className="dashboard-overview-section">
      <div className="dashboard-workflow-head">
        <div>
          <h2>ภาพรวมงานเบิกเสื้อ</h2>
          <p>ดูงานที่ต้องจัดส่ง สต๊อกที่ต้องเติม และสรุปสถานะรายการ</p>
        </div>
      </div>

      {!hasOrders && <DashboardEmptyState onOpenOrder={onOpenOrder} />}

      <div className="dashboard-overview-stats">
        <KpiCard
          icon={AlertTriangle}
          label="รายการรอจัดส่ง"
          value={`${metrics.pendingBatches || 0} รายการ`}
          detail={`${metrics.pendingPieces || 0} ชิ้น`}
          tone="warning"
        />
        <KpiCard
          icon={PackageCheck}
          label="จัดส่งแล้ว"
          value={`${metrics.shippedPieces || 0} ชิ้น`}
          detail={`${metrics.deliveredBatches || 0} รายการ`}
          tone="success"
        />
        <KpiCard
          icon={Ban}
          label="ยกเลิก"
          value={`${metrics.canceledBatches || 0} รายการ`}
          detail={`${metrics.canceledPieces || 0} ชิ้น`}
          tone="danger"
        />
        <KpiCard
          icon={Shirt}
          label="สต๊อกคงเหลือ"
          value={`${stockTotals.remaining.toLocaleString('th-TH')} ชิ้น`}
          detail={`เบิกแล้ว ${stockTotals.withdrawn.toLocaleString('th-TH')} ชิ้น`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
        {/* Left Column (Charts) */}
        <div className="col-span-1 flex flex-col gap-6 w-full">
          {/* Bar Chart */}
          <section className="dashboard-overview-chart-card dashboard-overview-chart-card--branch bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="dashboard-overview-chart-head mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">ยอดรอจัดส่งตามสาขา</h3>
                <p className="text-xs text-slate-500 mt-1">จำนวนชิ้นที่ยังต้องดำเนินการ</p>
              </div>
            </div>
            <div className="dashboard-overview-chart-canvas">
              {branchChartRows.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={branchChartRows} margin={{ left: -20, right: 8, top: 8, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="branch"
                      tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }}
                      height={60}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#1a2b4c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-empty-line text-slate-400 py-10 text-center font-semibold">ไม่มีรายการในขณะนี้</div>
              )}
            </div>
          </section>

          {/* Donut Chart */}
          <section className="dashboard-overview-chart-card dashboard-overview-chart-card--status bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="dashboard-overview-chart-head mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">สัดส่วนสถานะตามจำนวนชิ้น</h3>
                <p className="text-xs text-slate-500 mt-1">รวมรายการเบิกตามสถานะล่าสุด</p>
              </div>
            </div>
            <div className="dashboard-overview-chart-canvas compact">
              {statusChartRows.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusChartRows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                      {statusChartRows.map((row) => (
                        <Cell key={row.name} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-empty-line text-slate-400 py-10 text-center font-semibold">ไม่มีรายการในขณะนี้</div>
              )}
              <div className="dashboard-chart-legend flex justify-center flex-wrap gap-2 text-xs font-semibold mt-4">
                {statusChartRows.map((row) => (
                  <span key={row.name} className="flex items-center gap-1 text-slate-600">
                    <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: row.color }} />
                    {row.name}: {row.value.toLocaleString('th-TH')}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (Actionable Lists) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 w-full">
          <DashboardTaskPanel
            batches={filteredBatches}
            statuses={statuses}
            onOpenOrders={() => onViewChange?.('orders')}
            onViewAll={() => onViewChange?.('orders')}
            onQuickShip={onQuickShip}
          />
          <DashboardStockPanel
            stockRows={stockSummaryRows}
            onOpenStock={() => onViewChange?.('stock')}
            onViewAll={() => onViewChange?.('stock')}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;
