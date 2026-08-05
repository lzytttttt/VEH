interface StatCardProps {
  label: string;
  value: string;
  trend?: number; // 环比变化（正升负降）
  hint?: string;
}

/**
 * 通用统计卡片 — Win95 win-raised 风格
 * 大数字 + 标签 + 环比箭头 + 颜色编码
 */
export default function StatCard({ label, value, trend, hint }: StatCardProps) {
  const trendColor = trend == null ? '#808080' : trend >= 0 ? '#008000' : '#FF0000';
  const valueColor = parseFloat(value) >= 85 ? '#008000' : parseFloat(value) >= 70 ? '#808000' : '#FF0000';
  return (
    <div className="win-raised" style={{ padding: '8px 10px', minWidth: '120px' }}>
      <div className="win-text" style={{ fontSize: '11px', color: '#808080' }}>{label}</div>
      <div className="flex items-baseline gap-1" style={{ marginTop: '2px' }}>
        <span className="win-text win-text-bold" style={{ fontSize: '22px', color: valueColor }}>{value}</span>
        {trend != null && (
          <span style={{ fontSize: '11px', color: trendColor, fontWeight: 'bold' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend * 100).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <div className="win-text" style={{ fontSize: '10px', color: '#808080', marginTop: '2px' }}>{hint}</div>}
    </div>
  );
}
