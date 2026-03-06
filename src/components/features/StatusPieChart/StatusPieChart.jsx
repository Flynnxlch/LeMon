import { memo, useMemo } from 'react';
import { STATUS_LABELS } from '../../../utils/assetConstants';

const STATUS_COLORS = {
  Available: '#22c55e',
  'Perlu Diupdate': '#f59e0b',
  Diperbaiki: '#3b82f6',
  Rusak: '#dc2626',
  'Dalam Perbaikan': '#d97706',
  Hilang: '#737373',
};

/** Build pie segments from status counts. includePerluDiupdate: false = 5 segments (Available, Diperbaiki, Rusak, Dalam Perbaikan, Hilang). */
function buildSegments(byStatus, includePerluDiupdate) {
  const order = includePerluDiupdate
    ? ['Available', 'Perlu Diupdate', 'Diperbaiki', 'Rusak', 'Dalam Perbaikan', 'Hilang']
    : ['Available', 'Diperbaiki', 'Rusak', 'Dalam Perbaikan', 'Hilang'];
  const total = order.reduce((sum, key) => sum + (byStatus[key] || 0), 0);
  if (total === 0) {
    return [{ label: 'Tidak ada data', value: 1, color: '#e5e7eb', start: 0, sweep: 360 }];
  }
  let start = 0;
  return order
    .filter((key) => (byStatus[key] || 0) > 0)
    .map((key) => {
      const value = byStatus[key] || 0;
      const sweep = (value / total) * 360;
      const seg = { label: STATUS_LABELS[key] ?? key, value, color: STATUS_COLORS[key] ?? '#94a3b8', start, sweep };
      start += sweep;
      return seg;
    });
}

/** SVG pie: cx, cy, r in same units; segments have start/sweep in degrees. */
function describeArc(cx, cy, r, startDeg, sweepDeg) {
  if (sweepDeg >= 360) {
    return `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 -${r * 2} 0`;
  }
  const start = ((startDeg - 90) * Math.PI) / 180;
  const end = ((startDeg + sweepDeg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

const StatusPieChart = memo(({ byStatus, includePerluDiupdate = false, size = 160, showLegend = true, title }) => {
  const segments = useMemo(() => buildSegments(byStatus || {}, includePerluDiupdate), [byStatus, includePerluDiupdate]);
  const cx = size / 2;
  const cy = size / 2;
  const r = Math.min(cx, cy) * 0.75;

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      {title && (
        <p className="text-sm font-medium text-neutral-500 mb-2">{title}</p>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 min-h-0">
        <svg width={size} height={size} className="shrink-0" aria-hidden="true">
          {segments.map((seg, i) => (
            <path
              key={seg.label}
              d={describeArc(cx, cy, r, seg.start, seg.sweep)}
              fill={seg.color}
              stroke="white"
              strokeWidth={2}
              className="transition-opacity hover:opacity-90"
            />
          ))}
        </svg>
        {showLegend && (
          <ul className="flex flex-col gap-1.5 text-xs">
            {segments.map((seg) => (
              <li key={seg.label} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-neutral-700 truncate">{seg.label}</span>
                <span className="font-medium text-neutral-900 shrink-0">{seg.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

StatusPieChart.displayName = 'StatusPieChart';

export default StatusPieChart;
