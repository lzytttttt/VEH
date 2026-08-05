import { Cell, Pie as RPie, PieChart as PChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface PieDatum {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieDatum[];
  height?: number;
}

/**
 * 饼图 — 群体分布（优秀/良好/待提升），复用容器模式
 */
export default function PieChart({ data, height = 220 }: PieChartProps) {
  return (
    <div className="win-sunken bg-white" style={{ padding: '4px', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PChart>
          <RPie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="65%" label={({ name, value }: { name: string; value: number }) => `${name} ${value}`}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </RPie>
          <Tooltip
            contentStyle={{ background: '#c0c0c0', border: '1px solid #808080', fontSize: '11px', fontFamily: 'var(--win-font)' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
        </PChart>
      </ResponsiveContainer>
    </div>
  );
}
