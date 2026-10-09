import React from 'react';
import { Calendar, Filter, Layers, Search, Sparkles, Globe, Newspaper } from 'lucide-react';
import { FilterState, MetricCategory } from '../types';
import { CATEGORIES } from '../data/metricPairs';

interface FilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  availableDates: { min: string; max: string };
  filteredDaysCount: number;
  availableSites?: { id: string; name: string; count: number }[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  availableDates,
  filteredDaysCount,
  availableSites = [],
}) => {
  const dateRanges: { id: FilterState['dateRange']; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: '7d', label: '7 ngày' },
    { id: '14d', label: '14 ngày' },
    { id: '30d', label: '30 ngày' },
    { id: '90d', label: '90 ngày' },
    { id: 'custom', label: 'Tùy chọn' },
  ];

  // Default site options if availableSites not passed yet
  const sitesList = availableSites.length > 0
    ? availableSites
    : [
        { id: 'Ngôi sao', name: 'Ngôi sao', count: 281 },
        { id: 'VnExpress', name: 'VnExpress', count: 281 },
        { id: 'English', name: 'English', count: 281 },
      ];

  const totalAllRows = sitesList.reduce((acc, s) => acc + s.count, 0);

  const getSiteStyle = (siteId: string, isSelected: boolean) => {
    switch (siteId.toLowerCase()) {
      case 'ngôi sao':
        return isSelected
          ? 'bg-rose-600 text-white font-bold shadow-xs ring-2 ring-rose-300'
          : 'bg-rose-50/80 text-rose-800 hover:bg-rose-100 border border-rose-200';
      case 'vnexpress':
        return isSelected
          ? 'bg-red-700 text-white font-bold shadow-xs ring-2 ring-red-300'
          : 'bg-red-50/80 text-red-800 hover:bg-red-100 border border-red-200';
      case 'english':
        return isSelected
          ? 'bg-blue-600 text-white font-bold shadow-xs ring-2 ring-blue-300'
          : 'bg-blue-50/80 text-blue-800 hover:bg-blue-100 border border-blue-200';
      default:
        return isSelected
          ? 'bg-slate-900 text-white font-bold shadow-xs'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs mb-6 space-y-3.5" id="dashboard-filter-bar">
      
      {/* 1. TOP ROW: SITE SELECTOR TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-bold text-slate-700 mr-1">
            <Globe className="w-4 h-4 mr-1.5 text-rose-600" />
            <span>CHỌN SITE:</span>
          </div>

          {sitesList.map(s => {
            const isSelected = (filter.selectedSite || 'Ngôi sao').toLowerCase() === s.id.toLowerCase();
            return (
              <button
                key={s.id}
                id={`btn-site-${s.id}`}
                onClick={() => setFilter(prev => ({ ...prev, selectedSite: s.id }))}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer font-medium ${getSiteStyle(s.id, isSelected)}`}
              >
                <span>{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-black/5 text-slate-600'
                }`}>
                  {s.count} ngày
                </span>
              </button>
            );
          })}

          <button
            id="btn-site-all"
            onClick={() => setFilter(prev => ({ ...prev, selectedSite: 'all' }))}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer font-medium ${
              filter.selectedSite === 'all'
                ? 'bg-slate-900 text-white font-bold shadow-xs ring-2 ring-slate-400'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span>Tất cả site (Tổng hợp)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
              filter.selectedSite === 'all' ? 'bg-white/25 text-white' : 'bg-black/5 text-slate-600'
            }`}>
              {totalAllRows} ngày
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Site hiện tại: <strong className="text-rose-600 font-bold">{filter.selectedSite === 'all' ? 'Tất cả Site' : (filter.selectedSite || 'Ngôi sao')}</strong>
        </div>
      </div>

      {/* 2. SECOND ROW: Date Range and Search */}
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
