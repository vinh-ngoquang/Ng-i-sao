import React from 'react';
import { Layers, ArrowRight, TrendingUp, Sparkles, ChevronRight, BarChart3 } from 'lucide-react';
import { MetricAggregate, MetricCategory } from '../types';
import { formatCompact, formatNumber, formatPercent, formatRatio } from '../utils/formatters';

interface MetricPairsGridProps {
  aggregates: MetricAggregate[];
  selectedCategory: 'all' | MetricCategory;
  activePairId: string;
  onSelectPair: (id: string) => void;
}

export const MetricPairsGrid: React.FC<MetricPairsGridProps> = ({
  aggregates,
  selectedCategory,
  activePairId,
  onSelectPair,
}) => {
  const displayedAggs = selectedCategory === 'all'
    ? aggregates
    : aggregates.filter(a => a.pair.category === selectedCategory);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-6" id="metric-pairs-section">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-600" />
            <span>16 Cặp Chỉ Số Đối Chiếu (Pageviews & User Tương Ứng)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghép theo đúng thứ tự 1-1 giữa chỉ số Pageviews và Users để so sánh quy mô và độ gắn kết (PV/User).
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto">
          Hiển thị: <span className="text-rose-600 font-bold">{displayedAggs.length}</span> / 16 cặp
        </div>
      </div>

      {/* Grid of paired cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {displayedAggs.map(agg => {
          const { pair, totalPV, totalUser, avgPV, avgUser, pvShare, userShare, ratio } = agg;
          const isSelected = activePairId === pair.id;

          return (
            <div
              key={pair.id}
              id={`metric-pair-card-${pair.id}`}
              onClick={() => onSelectPair(pair.id)}
              className={`rounded-xl p-3.5 border transition-all cursor-pointer relative group flex flex-col justify-between ${
                isSelected
                  ? 'border-rose-500 bg-rose-50/30 ring-1 ring-rose-500 shadow-xs'
                  : 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Card top */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                      {pair.order}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {pair.shortLabel}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-white border border-slate-200 text-slate-600 shrink-0">
                    {pair.categoryLabel}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1 mb-3" title={pair.description}>
                  {pair.description}
                </p>

                {/* Paired values side-by-side */}
                <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-2.5 border border-slate-100 mb-2.5">
                  {/* Left: Pageviews */}
                  <div className="border-r border-slate-100 pr-1.5">
                    <div className="text-[10px] font-semibold text-rose-600 truncate" title={pair.pvHeader}>
                      {pair.pvHeader}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatCompact(totalPV)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {formatPercent(pvShare)} site
                    </div>
                  </div>

                  {/* Right: User */}
                  <div className="pl-1.5">
                    <div className="text-[10px] font-semibold text-blue-600 truncate" title={pair.uHeader}>
                      {pair.uHeader}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatCompact(totalUser)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {formatPercent(userShare)} site
                    </div>
                  </div>
                </div>
              </div>

              {/* Card footer: Ratio & Selection CTA */}
              <div>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    Tỷ lệ PV/User:
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                    {formatRatio(ratio)}
                  </span>
                </div>

                {/* Progress bar showing share */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 flex">
                  <div
                    className="bg-rose-500 h-full transition-all"
                    style={{ width: `${Math.min(pvShare, 100)}%` }}
                    title={`PV Share: ${formatPercent(pvShare)}`}
                  />
                  <div
                    className="bg-blue-500 h-full transition-all opacity-80"
                    style={{ width: `${Math.min(userShare, 100)}%` }}
                    title={`User Share: ${formatPercent(userShare)}`}
                  />
                </div>

                <div className="flex items-center justify-end text-[10px] text-slate-400 group-hover:text-rose-600 transition-colors mt-2">
                  <span>{isSelected ? 'Đang chọn trên biểu đồ' : 'Bấm xem chi tiết'}</span>
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
