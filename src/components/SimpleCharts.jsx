import React from 'react';

export function Donut({ data = [], size = 140, stroke = 18 }) {
  const visibleData = data.filter((row) => Number(row.value || 0) > 0);
  const total = visibleData.reduce((s, r) => s + Number(r.value || 0), 0);
  if (!total) {
    return (
      <div
        aria-label="ไม่มีข้อมูลสำหรับแผนภูมิ"
        style={{
          width: size,
          height: size,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '999px',
          background: '#F8FAFC',
          color: '#64748B',
          fontSize: 12,
          fontWeight: 900,
          textAlign: 'center',
        }}
      >
        ไม่มีข้อมูล
      </div>
    );
  }
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = visibleData.map((d, i) => {
    const value = Math.max(0, d.value || 0);
    const portion = value / total;
    const offsetPortion = visibleData
      .slice(0, i)
      .reduce((sum, item) => sum + Math.max(0, item.value || 0) / total, 0);
    return {
      ...d,
      dash: portion * circumference,
      offset: circumference * offsetPortion,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((d, i) => {
        return (
          <circle
            key={i}
            r={radius}
            cx={cx}
            cy={cy}
            stroke={d.color}
            strokeWidth={stroke}
            strokeDasharray={`${d.dash} ${circumference - d.dash}`}
            strokeDashoffset={-d.offset}
            fill="none"
            style={{ transition: 'stroke-dasharray 320ms ease, stroke-dashoffset 320ms ease' }}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <circle r={radius} cx={cx} cy={cy} fill="transparent" />
    </svg>
  );
}

export function MiniBar({ rows = [], height = 10 }) {
  const max = Math.max(...rows.map((r) => r.value || 0), 1);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 100, fontSize: 12 }}>{r.label}</div>
          <div style={{ flex: 1, background: '#F1F5F9', height }}>
            <div style={{ width: `${Math.round((r.value / max) * 100)}%`, height, background: r.color }} />
          </div>
          <div style={{ width: 56, textAlign: 'right', fontSize: 12 }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ data = [], width = 320, height = 140, strokeWidth = 2, color = '#2563eb' }) {
  const values = data.map((row) => Number(row.value || 0));
  const max = Math.max(...values, 1);
  const points = data.map((point, index) => {
    const x = data.length > 1 ? (width / (data.length - 1)) * index : width / 2;
    const y = height - 16 - (Math.max(0, Number(point.value || 0)) / max) * (height - 32);
    return { x, y, ...point };
  });

  const linePath = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div style={{ width, minWidth: width, overflowX: 'auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          points={linePath}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          points={[{ x: points[0]?.x ?? 0, y: height - 16 }, ...points, { x: points[points.length - 1]?.x ?? 0, y: height - 16 }]
            .map((point) => `${point.x},${point.y}`)
            .join(' ')}
          fill="url(#lineGradient)"
          opacity="0.84"
        />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="4" fill={color} />
        ))}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`, gap: 6, marginTop: 8 }}>
        {data.map((point, index) => (
          <div key={index} style={{ fontSize: 11, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default { Donut, MiniBar, LineChart };
