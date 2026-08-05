import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface MultiRadarSeries {
  name: string;
  color: string;
  data: { axis: string; value: number }[]; // 0-1
}

interface MultiRadarChartProps {
  series: MultiRadarSeries[];
  height?: number;
}

/**
 * 多系列雷达叠加图 — 多教师/多学科对比
 * 复用 RadarChart 容器模式，支持多 Radar 层叠加
 */
export default function MultiRadarChart({ series, height = 240 }: MultiRadarChartProps) {
  // 合并所有轴（取第一个系列的轴定义）
  const axes = series[0]?.data.map((d) => d.axis) ?? [];
  const chartData = axes.map((axis) => {
    const row: Record<string, string | number> = { axis };
    for (const s of series) {
      const point = s.data.find((d) => d.axis === axis);
      row[s.name] = point ? point.value : 0;
    }
    return row;
  });

  return (
    <div className="win-sunken bg-white" style={{ padding: '4px', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RChart data={chartData} cx="50%" cy="50%" outerRadius="65%">
          <PolarGrid stroke="#c0c0c0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#000' }} />
          <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fontSize: 9, fill: '#808080' }} />
          {series.map((s) => (
            <Radar key={s.name} name={s.name} dataKey={s.name} stroke={s.color} fill={s.color} fillOpacity={0.2} strokeWidth={2} />
          ))}
          <Tooltip
            contentStyle={{ background: '#c0c0c0', border: '1px solid #808080', fontSize: '11px', fontFamily: 'var(--win-font)' }}
            formatter={(v: number) => (v * 100).toFixed(1) + '%'}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
        </RChart>
      </ResponsiveContainer>
    </div>
  );
}
