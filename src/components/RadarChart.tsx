import { Radar, RadarChart as RChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export interface RadarDatum {
  axis: string;
  value: number; // 0-1
}

interface Props {
  data: RadarDatum[];
  color?: string;
  height?: number;
}

export default function RadarChart({ data, color = '#000080', height = 200 }: Props) {
  return (
    <div className="win-sunken bg-white" style={{ padding: '4px', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#c0c0c0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#000' }} />
          <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fontSize: 9, fill: '#808080' }} />
          <Radar name="score" dataKey="value" stroke={color} fill={color} fillOpacity={0.35} />
          <Tooltip
            contentStyle={{
              background: '#c0c0c0',
              border: '1px solid #808080',
              fontSize: '11px',
              fontFamily: 'var(--win-font)',
            }}
            formatter={(v: number) => [(v * 100).toFixed(0) + '%', '评分']}
          />
        </RChart>
      </ResponsiveContainer>
    </div>
  );
}
