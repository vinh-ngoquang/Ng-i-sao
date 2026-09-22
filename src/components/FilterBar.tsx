import React from 'react';
import { Calendar, Filter, Layers, Search, Sparkles } from 'lucide-react';
import { FilterState, MetricCategory } from '../types';
import { CATEGORIES } from '../data/metricPairs';

interface FilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  availableDates: { min: string; max: string };
  filteredDaysCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  availableDates,
  filteredDaysCount,
}) => {
  const dateRanges: { id: FilterState['dateRange']; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: '7d', label: '7 ngày' },
    { id: '14d', label: '14 ngày' },
    { id: '30d', label: '30 ngày' },
    { id: '90d', label: '90 ngày' },
    { id: 'custom', label: 'Tùy chọn' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs mb-6 space-y-3.5" id="dashboard-filter-bar">
      
      {/* Top row: Date Range and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center text-xs font-semibold text-slate-500 mr-1.5">
            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span>Thời gian:</span>
          </div>

          {dateRanges.map(dr => {
            const isActive = filter.dateRange === dr.id;
            return (
              <button
                key={dr.id}
                id={`btn-range-${dr.id}`}
                onClick={() => setFilter(prev => ({ ...prev, dateRange: dr.id }))}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dr.label}
              </button>
            );
          })}

          <span className="text-xs text-slate-400 ml-2 font-medium">
            (Đang xem: <strong className="text-slate-700">{filteredDaysCount} ngày</strong>)
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-quick-search"
            type="text"
            placeholder="Tìm theo ngày (YYYY-MM-DD)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
          />
        </div>
      </div>

      {/* Custom Date Pickers (only shown when custom range is selected) */}
      {filter.dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Chọn khoảng ngày:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">Từ:</label>
            <input
              type="date"
              id="input-start-date"
              value={filter.startDate || availableDates.min}
              min={availableDates.min}
              max={filter.endDate || availableDates.max}
              onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">Đến:</label>
            <input
              type="date"
              id="input-end-date"
              value={filter.endDate || availableDates.max}
              min={filter.startDate || availableDates.min}
              max={availableDates.max}
              onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>
      )}

      {/* Bottom row: Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
        <div className="flex items-center text-xs font-semibold text-slate-500 mr-1.5">
          <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
          <span>Nhóm chỉ số:</span>
        </div>

        {CATEGORIES.map(cat => {
          const isActive = filter.selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`btn-cat-${cat.id}`}
              onClick={() => setFilter(prev => ({ ...prev, selectedCategory: cat.id }))}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer font-medium ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

    </div>
  );
};
