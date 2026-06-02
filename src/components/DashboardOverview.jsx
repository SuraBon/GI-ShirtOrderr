import React, { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RefreshCw, Truck, PackageCheck, BarChart3, PackageSearch, X } from 'lucide-react';
import { Stat } from './DashboardCommon';
import DashboardOverviewChart from './DashboardOverviewChart';
import { Select } from './SelectComponents';
import { TextInput } from './FormComponents';

function DashboardStockDetailTable({ stockSummaryRows, limit = 16 }) {
  const visibleRows = stockSummaryRows.slice(0, limit);

  return (
    <div className="dashboard-stock-detail-table">
      <div className="dashboard-stock-detail-header">
        <span>แบบเสื้อ</span>
        <span>เพศ</span>
        <span>ไซส์</span>
        <span>เบิกแล้ว</span>
        <span>คงเหลือ</span>
      </div>
      {visibleRows.map((row) => (
        <div key={row.id} className="dashboard-stock-detail-row">
          <span>{row.type}</span>
          <span>{row.gender}</span>
          <span>{row.size || '-'}</span>
          <span>{row.withdrawn}</span>
          <span>{row.remaining}</span>
        </div>
      ))}
      {stockSummaryRows.length > limit && (
        <div className="dashboard-stock-detail-footer">
          แสดง {Math.min(limit, stockSummaryRows.length)} จาก {stockSummaryRows.length} รายการ
        </div>
      )}
    </div>
  );
}

function DashboardDrilldownModal({ stockSummaryRows, onClose }) {
  const [filterType, setFilterType] = useState('ทั้งหมด');
  const [filterGender, setFilterGender] = useState('ทั้งหมด');
  const [filterMode, setFilterMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const typeOptions = useMemo(
    () => ['ทั้งหมด', ...Array.from(new Set(stockSummaryRows.map((row) => row.type)))],
    [stockSummaryRows]
  );
  const genderOptions = useMemo(
    () => ['ทั้งหมด', ...Array.from(new Set(stockSummaryRows.map((row) => row.gender)))],
    [stockSummaryRows]
  );
  const modeOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'lowStock', label: 'สต๊อกต่ำ' },
    { value: 'withdrawn', label: 'เบิกแล้ว' },
  ];

  const filteredRows = useMemo(() => {
    return stockSummaryRows.filter((row) => {
      if (filterType !== 'ทั้งหมด' && row.type !== filterType) return false;
      if (filterGender !== 'ทั้งหมด' && row.gender !== filterGender) return false;
      if (filterMode === 'lowStock' && row.remaining > 10) return false;
      if (filterMode === 'withdrawn' && row.withdrawn <= 0) return false;
      if (searchTerm) {
        const text = `${row.type} ${row.gender} ${row.size}`.toLowerCase();
        return text.includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [stockSummaryRows, filterType, filterGender, filterMode, searchTerm]);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="dashboard-action-btn">
          เปิด drilldown
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-drilldown-overlay" />
        <Dialog.Content className="dashboard-drilldown-content">
          <div className="dashboard-drilldown-header">
            <div>
              <h3>รายละเอียด Drilldown</h3>
              <p>กรองและดูข้อมูลสต๊อกเชิงลึกเมื่อข้อมูลมากและหลากหลาย</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="dashboard-drilldown-close" aria-label="ปิด">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="dashboard-drilldown-summary">
            <div>
              <strong>{stockSummaryRows.length}</strong>
              <span>แถวข้อมูลสต๊อกทั้งหมด</span>
            </div>
            <div>
              <strong>{filteredRows.length}</strong>
              <span>ผลลัพธ์ที่แสดง</span>
            </div>
          </div>

          <div className="dashboard-drilldown-filters">
            <Select
              value={filterType}
              onChange={setFilterType}
              values={typeOptions}
              title="กรองตามแบบเสื้อ"
              size="sm"
            />
            <Select
              value={filterGender}
              onChange={setFilterGender}
              values={genderOptions}
              title="กรองตามเพศ"
              size="sm"
            />
            <Select
              value={filterMode}
              onChange={setFilterMode}
              values={modeOptions}
              title="กรองตามสถานะ"
              size="sm"
            />
            <TextInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ค้นหาแบบเสื้อ, เพศ, ไซส์"
            />
          </div>

          <div className="dashboard-drilldown-table-wrap">
            <table className="dashboard-drilldown-table">
              <thead>
                <tr>
                  <th>แบบเสื้อ</th>
                  <th>เพศ</th>
                  <th>ไซส์</th>
                  <th>เบิกแล้ว</th>
                  <th>คงเหลือ</th>
                  <th>สต๊อกทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.type}</td>
                    <td>{row.gender}</td>
                    <td>{row.size || '-'}</td>
                    <td>{row.withdrawn}</td>
                    <td>{row.remaining}</td>
                    <td>{row.totalStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredRows.length && (
              <div className="dashboard-drilldown-empty">
                ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DashboardOverview({
  onRefresh,
  metrics,
  filteredBatches,
  rows,
  stockSummaryTotals,
  pendingPiecePercent,
  stockSummaryRows,
  inventoryRows,
  countByStatus,
  statusOptions,
  statuses,
}) {
  const [showOverviewMetrics, setShowOverviewMetrics] = useState(false);
  const [showOverviewChartDetails, setShowOverviewChartDetails] = useState(false);
  const shippedPiecePercent = metrics.totalPieces
    ? Math.round((metrics.shippedPieces / metrics.totalPieces) * 100)
    : 0;

  return (
    <div className="dashboard-overview-section">
      <div className="dashboard-overview-hero">
        <div>
          <h2>ภาพรวม</h2>
          <p>สรุปงานที่ต้องทำก่อน: คิวรอจัดส่ง สัดส่วนงานที่ปิดแล้ว และสต๊อกที่ควรตรวจ</p>
        </div>
        <div className="dashboard-panel-actions">
          <button type="button" onClick={onRefresh} className="dashboard-action-btn dark">
            <RefreshCw className="size-4" />
            โหลดข้อมูลใหม่
          </button>
          <DashboardDrilldownModal stockSummaryRows={stockSummaryRows} />
        </div>
      </div>

      <div className="dashboard-overview-grid">
        <section className="dashboard-overview-panel">
          <div className="dashboard-panel-head slim">
            <div>
              <h3>สรุป KPI</h3>
              <p>ยอดสำคัญและสถานะงานก่อนลงมือจัดการ</p>
            </div>
            <button
              type="button"
              className="dashboard-toggle-detail"
              onClick={() => setShowOverviewMetrics((value) => !value)}
            >
              {showOverviewMetrics ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
            </button>
          </div>
          <div className="dashboard-overview-stats">
            <Stat icon={Truck} value={`${metrics.pendingPieces} ชิ้น`} label="รอจัดส่ง" />
            <Stat icon={PackageCheck} value={`${metrics.shippedPieces} ชิ้น`} label="จัดส่งแล้ว" />
            <Stat icon={BarChart3} value={`${shippedPiecePercent}%`} label="อัตราจัดส่ง" />
            <Stat icon={PackageSearch} value={`${stockSummaryTotals.remaining} ชิ้น`} label="สต๊อกคงเหลือ" />
          </div>
          {showOverviewMetrics && (
            <div className="dashboard-overview-details">
              <div className="dashboard-overview-detail-grid">
                <div>
                  <span>คำสั่งทั้งหมด</span>
                  <strong>{filteredBatches.length}</strong>
                </div>
                <div>
                  <span>ชิ้นรวมทั้งหมด</span>
                  <strong>{metrics.totalPieces}</strong>
                </div>
                <div>
                  <span>ชิ้นรอจัดส่ง</span>
                  <strong>{metrics.pendingPieces}</strong>
                </div>
                <div>
                  <span>ชิ้นจัดส่งแล้ว</span>
                  <strong>{metrics.shippedPieces}</strong>
                </div>
              </div>
              <div className="dashboard-overview-status-breakdown">
                {statusOptions.map((status) => (
                  <div key={status}>
                    <span>{status}</span>
                    <strong>{countByStatus(status)} รายการ</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="dashboard-overview-chart-card">
          <div className="dashboard-panel-head slim">
            <div>
              <h3>แนวโน้มการจัดส่ง</h3>
              <p>กราฟสรุปงานตามสถานะและสัดส่วนการส่งจริง</p>
            </div>
            <button
              type="button"
              className="dashboard-toggle-detail"
              onClick={() => setShowOverviewChartDetails((value) => !value)}
            >
              {showOverviewChartDetails ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
            </button>
          </div>
          <DashboardOverviewChart itemRows={rows} metrics={metrics} statuses={statuses} />
          {showOverviewChartDetails && (
            <div className="dashboard-overview-details dashboard-overview-chart-details">
              <div>
                <span>คำสั่งทั้งหมด</span>
                <strong>{filteredBatches.length}</strong>
              </div>
              <div>
                <span>ชิ้นทั้งหมด</span>
                <strong>{metrics.totalPieces}</strong>
              </div>
              <div>
                <span>ชิ้นคงเหลือ</span>
                <strong>{stockSummaryTotals.remaining}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-overview-stock-card">
          <div className="dashboard-panel-head slim">
            <div>
              <h2>ภาพรวมสต๊อก</h2>
              <p>สต๊อกรวมทั้งหมดและรายการที่ต้องติดตาม</p>
            </div>
          </div>
          <div className="dashboard-stock-summary-totals dashboard-stock-summary-totals-grid">
            <span>สต๊อกตั้งต้น {stockSummaryTotals.totalStock} ชิ้น</span>
            <span>เบิกแล้ว {stockSummaryTotals.withdrawn} ชิ้น</span>
            <span>คงเหลือ {stockSummaryTotals.remaining} ชิ้น</span>
          </div>
          <div className="dashboard-stock-summary-notes">
            <p>รอจัดส่ง {pendingPiecePercent}% ของจำนวนที่เบิกทั้งหมด ใช้คู่กับรายการสต๊อกที่ควรดูด้านล่าง</p>
          </div>
        </div>
      </div>

      <div className="dashboard-inventory-card-grid">
        {inventoryRows.map((item) => (
          <article key={item.id} className="dashboard-inventory-card">
            <div>
              <strong>{item.type}</strong>
              <small>{item.sizes.join(', ') || 'ไม่มีไซส์'}</small>
            </div>
            <div>
              <span>{item.total} ชิ้น</span>
              <span>{item.sizes.length} ไซส์</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default DashboardOverview;
