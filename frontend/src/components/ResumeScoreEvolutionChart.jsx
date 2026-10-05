import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { TrendingUp, Calendar, Layers } from 'lucide-react';

export default function ResumeScoreEvolutionChart({ versions = [] }) {
  if (!versions || versions.length === 0) return null;

  // Format data for Recharts
  const chartData = versions.map((v, index) => {
    const dateObj = new Date(v.createdAt);
    const dateFormatted = !isNaN(dateObj)
      ? `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
      : `V${v.versionNumber || index + 1}`;

    return {
      name: dateFormatted,
      label: v.versionLabel || `Version ${v.versionNumber || index + 1}`,
      score: v.ats_score,
      skillsCount: v.skills?.length || 0,
      fullDate: !isNaN(dateObj) ? dateObj.toLocaleDateString() : 'Recent',
    };
  });

  const latestScore = chartData[chartData.length - 1]?.score || 0;
  const initialScore = chartData[0]?.score || 0;
  const totalDelta = latestScore - initialScore;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">{data.label}</p>
          <p className="text-slate-400 text-[11px] flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{data.fullDate}</span>
          </p>
          <div className="pt-1 flex items-baseline gap-2 border-t border-slate-800">
            <span className="text-emerald-400 font-black text-sm">ATS: {data.score}/100</span>
            <span className="text-slate-400 text-[11px]">({data.skillsCount} skills)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface rounded-card border border-border p-5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider">
            ATS Score Evolution
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">
            {chartData.length} {chartData.length === 1 ? 'version' : 'iterations'}
          </span>
          {chartData.length > 1 && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalDelta >= 0
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {totalDelta >= 0 ? `+${totalDelta} pts` : `${totalDelta} pts`}
            </span>
          )}
        </div>
      </div>

      <div className="h-36 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <YAxis
              domain={[40, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              ticks={[40, 60, 80, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#185FA5"
              strokeWidth={2.5}
              dot={{ fill: '#185FA5', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
