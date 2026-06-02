import React, { useMemo, useState } from 'react';
import { CustomSelect } from './SelectComponents';
import { MiniBar } from './SimpleCharts';

const DASHBOARD_CHART_OPTIONS = [
  {
    value: 'pendingBranch',
    label: 'งานค้างตามสาขา',
    title: 'งานค้างตามสาขา',
    description: 'ดูว่าสาขาไหนมีจำนวนชิ้นรอจัดส่งมากที่สุด',
    unit: 'ชิ้น',
  },
  {
    value: 'pendingType',
    label: 'งานค้างตามประเภทเสื้อ',
    title: 'งานค้างตามประเภทเสื้อ',
    description: 'ใช้เตรียมหยิบของและตรวจสต๊อกก่อนจัดส่ง',
    unit: 'ชิ้น',
  },
  {
    value: 'pieceStatus',
    label: 'จำนวนชิ้นตามสถานะ',
    title: 'จำนวนชิ้นตามสถานะ',
    description: 'สรุปชิ้นที่รอจัดส่ง จัดส่งแล้ว และยกเลิก',
    unit: 'ชิ้น',
  },
  {
    value: 'orderStatus',
    label: 'คำสั่งเบิกตามสถานะ',
    title: 'คำสั่งเบิกตามสถานะ',
    description: 'ดูจำนวนใบงานตามสถานะเพื่อประเมินภาระงาน',
    unit: 'คำสั่ง',
  },
];

const DASHBOARD_CHART_COLORS = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#7c3aed', '#64748b'];

function addChartValue(map, key, value) {
  const label = key || '-';
  map.set(label, (map.get(label) || 0) + Number(value || 0));
}

function limitChartRows(rows, maxRows = 6) {
  const sorted = rows
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'th'));
  if (sorted.length <= maxRows) return sorted;
  const visible = sorted.slice(0, maxRows - 1);
  const otherValue = sorted.slice(maxRows - 1).reduce((sum, row) => sum + row.value, 0);
  return [...visible, { label: 'อื่นๆ', value: otherValue }];
}

function colorChartRows(rows) {
  return rows.map((row, index) => ({
    ...row,
    color: row.color || DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
  }));
}

function buildDashboardChartRows(view, itemRows, metrics, statuses) {
  if (view === 'pieceStatus') {
    return [
      { label: statuses.delivered, value: metrics.shippedPieces, color: '#10b981' },
      { label: statuses.pending, value: metrics.pendingPieces, color: '#ef4444' },
      { label: statuses.canceled, value: metrics.canceledPieces, color: '#64748b' },
    ];
  }

  if (view === 'orderStatus') {
    return [
      { label: statuses.delivered, value: metrics.deliveredBatches, color: '#10b981' },
      { label: statuses.pending, value: metrics.pendingBatches, color: '#ef4444' },
      { label: statuses.canceled, value: metrics.canceledBatches, color: '#64748b' },
    ];
  }

  const map = new Map();
  itemRows
    .filter((row) => (row.itemStatus || row.status) === statuses.pending)
    .forEach((row) => {
      addChartValue(map, view === 'pendingType' ? row.type : row.branch, row.qty);
    });

  return colorChartRows(limitChartRows([...map.entries()].map(([label, value]) => ({ label, value }))));
}

export function DashboardOverviewChart({ itemRows, metrics, statuses }) {
  const [chartView, setChartView] = useState('pendingBranch');
  const selectedOption =
    DASHBOARD_CHART_OPTIONS.find((option) => option.value === chartView) || DASHBOARD_CHART_OPTIONS[0];
  const rows = useMemo(
    () => buildDashboardChartRows(chartView, itemRows, metrics, statuses),
    [chartView, itemRows, metrics, statuses]
  );
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  return (
    <div className="dashboard-overview-chart">
      <div className="dashboard-overview-chart-head">
        <h3>แผนภูมิภาพรวม</h3>
        <label className="dashboard-chart-select">
          <span>แสดงผล</span>
          <CustomSelect
            id="dashboard-chart-view"
            value={chartView}
            values={DASHBOARD_CHART_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={setChartView}
            compact
          />
        </label>
      </div>
      <div className="dashboard-overview-chart-subhead">
        <div>
          <h4>{selectedOption.title}</h4>
          <p>{selectedOption.description}</p>
        </div>
        <strong>
          {total.toLocaleString('th-TH')} {selectedOption.unit}
        </strong>
      </div>
      <div className="dashboard-overview-chart-body">
        <div className="dashboard-overview-bars">
          <MiniBar rows={rows} />
        </div>
      </div>
    </div>
  );
}

export default DashboardOverviewChart;
