import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity, TrendingUp, Info } from 'lucide-react';
import { NgoiSaoRecord, MetricPairDefinition } from '../types';
import { METRIC_PAIRS } from '../data/metricPairs';
import { prepareTimeSeriesData } from '../utils/dataProcessing';
import { formatCompact, formatNumber, formatRatio, formatDateVN } from '../utils/formatters';

interface TimeSeriesChartProps {
  records: NgoiSaoRecord[];
  activePairId: string;
  onSelectPair: (id: string) => void;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  records,
  activePairId,
  onSelectPair,
}) => {
  const [chartMode, setChartMode] = useState<'daily' | 'ma7' | 'cumulative'>('daily');

  const selectedPair = METRIC_PAIRS.find(p => p.id === activePairId) || METRIC_PAIRS[0];
  const chartData = prepareTimeSeriesData(records, selectedPair, chartMode);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-6" id="timeseries-chart-section">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>Biểu Đồ Xu Hướng Theo Thời Gian</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
              {selectedPair.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Trục trái: <strong className="text-rose-600 font-semibold">{selectedPair.pvHeader}</strong> • Trục phải: <strong className="text-blue-600 font-semibold">{selectedPair.uHeader}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Pair Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Cặp chỉ số:</label>
            <select
              id="select-chart-metric"
              value={selectedPair.id}
              onChange={(e) => onSelectPair(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {METRIC_PAIRS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.order}. {p.shortLabel} ({p.categoryLabel})
                </option>
              ))}
            </select>
          </div>

          {/* Mode switch */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs">
            <button
              id="btn-mode-daily"
              onClick={() => setChartMode('daily')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                chartMode === 'daily' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo ngày
            </button>
            <button
              id="btn-mode-ma7"
              onClick={() => setChartMode('ma7')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                chartMode === 'ma7' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Trung bình trượt 7 ngày khử độ lệch cuối tuần"
            >
              TB trượt 7D
            </button>
            <button
              id="btn-mode-cum"
              onClick={() => setChartMode('cumulative')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                chartMode === 'cumulative' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lũy kế
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-80 min-h-[320px]">
        <ResponsiveContainer width="100%" height={320} minHeight={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={selectedPair.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={selectedPair.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickLine={false}
              stroke="#94a3b8"
              fontSize={11}
              tickFormatter={(str) => {
                if (!str) return '';
                const parts = str.split('-');
                return `${parts[2] || ''}/${parts[1] || ''}`;
              }}
              minTickGap={25}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              stroke="#e11d48"
              fontSize={11}
              tickFormatter={(v) => formatCompact(v)}
              width={55}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              stroke="#2563eb"
              fontSize={11}
              tickFormatter={(v) => formatCompact(v)}
              width={55}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0]?.payload) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-48">
                      <p className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between">
                        <span>Ngày: {data.date ? formatDateVN(data.date) : ''}</span>
                        {chartMode === 'ma7' && <span className="text-[10px] text-amber-400 font-normal">TB 7 Ngày</span>}
                      </p>
                      <div className="flex items-center justify-between text-rose-300">
                        <span>{selectedPair.pvHeader}:</span>
                        <span className="font-mono font-bold text-white">{formatNumber(data.pageviews || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-blue-300">
                        <span>{selectedPair.uHeader}:</span>
                        <span className="font-mono font-bold text-white">{formatNumber(data.user || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-violet-300 pt-1 border-t border-slate-800">
                        <span>Tỷ lệ PV/User:</span>
                        <span className="font-mono font-bold text-emerald-400">{formatRatio(data.ratio || 0)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={32}
              formatter={(val) => {
                if (val === 'pageviews') return <span className="text-xs font-semibold text-rose-600">{selectedPair.pvHeader} (Trục trái)</span>;
                if (val === 'user') return <span className="text-xs font-semibold text-blue-600">{selectedPair.uHeader} (Trục phải)</span>;
                return val;
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="pageviews"
              stroke={selectedPair.color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#pvGradient)"
              name="pageviews"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="user"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="user"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
