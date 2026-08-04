import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

export interface TrendDatum {
  label: string;
  score: number; // 0-1
}

interface Props {
  data: TrendDatum[];
  color?: string;
  height?: number;
}

export default function TrendChart({ data, color = '#008000', height = 200 }: Props) {
  return (
    <div className="win-sunken bg-white" style={{ padding: '4px', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#000' }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#808080' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}`} />
          <Tooltip
            contentStyle={{
              background: '#c0c0c0',
              border: '1px solid #808080',
              fontSize: '11px',
              fontFamily: 'var(--win-font)',
            }}
            formatter={(v: number) => [(v * 100).toFixed(0) + '%', '评分']}
          />
          <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
