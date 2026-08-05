import { Bar, BarChart as BChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BarDatum {
  label: string;
  value: number; // 0-1
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  /** 是否横向（按值排序展示），默认纵向 */
  layout?: 'vertical' | 'horizontal';
}

const DEFAULT_COLOR = (v: number) => (v >= 0.85 ? '#008000' : v >= 0.7 ? '#808000' : '#FF0000');

/**
 * 柱状图 — 班级排名/对比，复用 RadarChart 的 win-sunken bg-white 容器模式
 */
export default function BarChart({ data, height = 200, layout = 'vertical' }: BarChartProps) {
  const chartData = layout === 'horizontal'
    ? [...data].sort((a, b) => b.value - a.value)
    : data;
  return (
    <div className="win-sunken bg-white" style={{ padding: '4px', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#000' }} interval={0} angle={-15} textAnchor="end" height={40} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#808080' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}`} />
          <Tooltip
            contentStyle={{ background: '#c0c0c0', border: '1px solid #808080', fontSize: '11px', fontFamily: 'var(--win-font)' }}
            formatter={(v: number) => [(v * 100).toFixed(1) + '%', '评分']}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color ?? DEFAULT_COLOR(d.value)} />
            ))}
          </Bar>
        </BChart>
      </ResponsiveContainer>
    </div>
  );
}
