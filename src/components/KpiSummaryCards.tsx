import React from 'react';
import { Eye, Users, Gauge, TrendingUp, Smartphone, Compass, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatNumber, formatCompact, formatRatio, formatPercent, formatDateVN } from '../utils/formatters';
import { MetricAggregate } from '../types';

interface KpiSummaryCardsProps {
  summary: {
    totalPV: number;
    totalUser: number;
    avgPV: number;
    avgUser: number;
    ratio: number;
    peakDayPV: { date: string; val: number };
    peakDayUser: { date: string; val: number };
    lowestDayPV: { date: string; val: number };
    growthPV: number;
    growthUser: number;
  };
  aggregates: MetricAggregate[];
}

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({ summary, aggregates }) => {
  // Find top external source
  const externalPairs = aggregates.filter(a => a.pair.category === 'external');
  const topExternal = [...externalPairs].sort((a, b) => b.totalPV - a.totalPV)[0];

  // Find top internal section
  const internalPairs = aggregates.filter(a => a.pair.category === 'internal');
  const topInternal = [...internalPairs].sort((a, b) => b.totalPV - a.totalPV)[0];

  // Find mobile and PC aggregates
  const mobileAgg = aggregates.find(a => a.pair.id === 'mobile');
  const pcAgg = aggregates.find(a => a.pair.id === 'pc');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="kpi-cards-grid">
      
      {/* 1. Total Pageviews */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-rose-300 transition-all relative overflow-hidden" id="card-kpi-pv">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Pageviews
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {formatCompact(summary.totalPV)}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {formatNumber(summary.totalPV)} lượt xem
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>TB ngày: <strong className="text-slate-800 font-semibold">{formatCompact(summary.avgPV)}</strong></span>
          <span title={`Đỉnh cao: ${formatDateVN(summary.peakDayPV.date)}`}>
            Đỉnh: <strong className="text-rose-600 font-semibold">{formatCompact(summary.peakDayPV.val)}</strong>
          </span>
        </div>
      </div>

      {/* 2. Total Users */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all relative overflow-hidden" id="card-kpi-user">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Độc Giả (User)
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {formatCompact(summary.totalUser)}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {formatNumber(summary.totalUser)} độc giả
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>TB ngày: <strong className="text-slate-800 font-semibold">{formatCompact(summary.avgUser)}</strong></span>
          <span title={`Đỉnh cao: ${formatDateVN(summary.peakDayUser.date)}`}>
            Đỉnh: <strong className="text-blue-600 font-semibold">{formatCompact(summary.peakDayUser.val)}</strong>
          </span>
        </div>
      </div>

      {/* 3. Pageviews / User Ratio */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-violet-300 transition-all relative overflow-hidden" id="card-kpi-ratio">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Độ Sâu Đọc (PV / User)
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {formatRatio(summary.ratio)} <span className="text-sm font-normal text-slate-500">lượt/người</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mức độ gắn kết độc giả
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Top Section:</span>
          <strong className="text-violet-700 font-semibold">
            {topInternal ? `${topInternal.pair.shortLabel} (${formatRatio(topInternal.ratio)})` : '---'}
          </strong>
        </div>
      </div>

      {/* 4. Top Device & Channel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-300 transition-all relative overflow-hidden" id="card-kpi-device">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Kênh & Thiết Bị Chủ Lực
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Mobile {mobileAgg ? formatPercent(mobileAgg.pvShare) : '---'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              PC: {pcAgg ? formatPercent(pcAgg.pvShare) : '---'} • Top Nguồn: {topExternal?.pair.shortLabel || '---'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Nguồn ngoài số 1:</span>
          <strong className="text-emerald-700 font-semibold">
            {topExternal ? `${topExternal.pair.shortLabel} (${formatCompact(topExternal.totalPV)})` : '---'}
          </strong>
        </div>
      </div>

    </div>
  );
};
