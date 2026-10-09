import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiSummaryCards } from './components/KpiSummaryCards';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { DataTableSection } from './components/DataTableSection';
import { MarkdownViewerModal } from './components/MarkdownViewerModal';
import { SyncStatusModal } from './components/SyncStatusModal';
import { NgoiSaoRecord, FilterState } from './types';
import { filterRecords, computeMetricAggregates, computeOverallSummary, getAvailableSites } from './utils/dataProcessing';
import { formatDateVN } from './utils/formatters';
import { INITIAL_RECORDS, INITIAL_LAST_UPDATED } from './data/initialData';
import { fetchLiveGoogleSheetsData, parseTsvToRecords } from './utils/googleSheetsSync';

export default function App() {
  // Preloaded with bundled records for guaranteed immediate render
  const [records, setRecords] = useState<NgoiSaoRecord[]>(() => {
    // Check localStorage cache first, otherwise use pre-bundled INITIAL_RECORDS
    try {
      const cached = localStorage.getItem('ngoisao_records_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_RECORDS;
  });

  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('ngoisao_last_sync') || INITIAL_LAST_UPDATED || new Date().toISOString();
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMarkdownOpen, setIsMarkdownOpen] = useState<boolean>(false);
  const [isSyncStatusOpen, setIsSyncStatusOpen] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({
    show: false,
    msg: '',
    type: 'success',
  });

  // Filters
  const [filter, setFilter] = useState<FilterState>(() => ({
    selectedSite: localStorage.getItem('ngoisao_selected_site') || 'Ngôi sao',
    dateRange: 'all',
    startDate: '',
    endDate: '',
    selectedCategory: 'all',
    activeMetricId: 'total',
  }));

  // Sync selectedSite change to localStorage
  useEffect(() => {
    if (filter.selectedSite) {
      localStorage.setItem('ngoisao_selected_site', filter.selectedSite);
    }
  }, [filter.selectedSite]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live Sync on component mount
  useEffect(() => {
    syncDataQuietly();
  }, []);

  const syncDataQuietly = async () => {
    // First attempt: fetch from local express API if available
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.records && json.records.length > 0) {
          setRecords(json.records);
          const time = json.lastSyncTime || new Date().toISOString();
          setLastSyncTime(time);
          try {
            localStorage.setItem('ngoisao_records_cache', JSON.stringify(json.records));
            localStorage.setItem('ngoisao_last_sync', time);
          } catch {
            // ignore
          }
          return;
        }
      }
    } catch {
      // Backend not running, fallback to direct Google Sheets fetch
    }

    // Direct Google Sheets TSV fetch fallback
    try {
      const live = await fetchLiveGoogleSheetsData();
      if (live.records && live.records.length > 0) {
        setRecords(live.records);
        setLastSyncTime(live.lastSync);
        try {
          localStorage.setItem('ngoisao_records_cache', JSON.stringify(live.records));
          localStorage.setItem('ngoisao_last_sync', live.lastSync);
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.log('Using bundled static dataset:', e);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    let success = false;
    let fetchedRecordsCount = 0;
    let latestDate = '';
    const previousCount = records.length;

    // 1. Try backend sync first
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.records && Array.isArray(json.records) && json.records.length > 0) {
          setRecords(json.records);
          const time = json.lastSyncTime || new Date().toISOString();
          setLastSyncTime(time);
          fetchedRecordsCount = json.records.length;
          latestDate = json.records[json.records.length - 1]?.date_day || '';
          try {
            localStorage.setItem('ngoisao_records_cache', JSON.stringify(json.records));
            localStorage.setItem('ngoisao_last_sync', time);
          } catch {
            // ignore
          }
          success = true;
        }
      }
    } catch (err) {
      console.warn('Backend sync failed, trying fallback:', err);
    }

    // 2. Try GET /api/data?refresh=true as secondary backend option
    if (!success) {
      try {
        const res = await fetch('/api/data?refresh=true');
        if (res.ok) {
          const json = await res.json();
          if (json.records && Array.isArray(json.records) && json.records.length > 0) {
            setRecords(json.records);
            const time = json.lastSyncTime || new Date().toISOString();
            setLastSyncTime(time);
            fetchedRecordsCount = json.records.length;
            latestDate = json.records[json.records.length - 1]?.date_day || '';
            try {
              localStorage.setItem('ngoisao_records_cache', JSON.stringify(json.records));
              localStorage.setItem('ngoisao_last_sync', time);
            } catch {
              // ignore
            }
            success = true;
          }
        }
      } catch (err) {
        console.warn('Backend /api/data?refresh=true failed:', err);
      }
    }

    // 3. Fallback: direct Google Sheets TSV fetch
    if (!success) {
      try {
        const live = await fetchLiveGoogleSheetsData();
        if (live.records && live.records.length > 0) {
          setRecords(live.records);
          setLastSyncTime(live.lastSync);
          fetchedRecordsCount = live.records.length;
          latestDate = live.records[live.records.length - 1]?.date_day || '';
          try {
            localStorage.setItem('ngoisao_records_cache', JSON.stringify(live.records));
            localStorage.setItem('ngoisao_last_sync', live.lastSync);
          } catch {
            // ignore
          }
          success = true;
        }
      } catch (err) {
        console.error('Direct fetch failed:', err);
      }
    }

    if (success) {
      if (fetchedRecordsCount > previousCount) {
        triggerToast(`Đồng bộ thành công! Đã thêm ${fetchedRecordsCount - previousCount} ngày mới (Tổng ${fetchedRecordsCount} ngày, mới nhất đến ${formatDateVN(latestDate)}).`, 'success');
      } else {
        triggerToast(`Đã đồng bộ Google Sheets: Hiện có ${fetchedRecordsCount} ngày (mới nhất đến ${formatDateVN(latestDate)}). Chưa có ngày mới trên link xuất bản.`, 'success');
      }
    } else {
      triggerToast('Đang hiển thị bản dữ liệu đã lưu trữ.', 'success');
    }

    setIsSyncing(false);
  };

  const handleImportCustomData = async (tsvText: string): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const parsed = parseTsvToRecords(tsvText);
      if (parsed.records.length === 0) {
        return { success: false, count: 0, error: 'Không tìm thấy dòng dữ liệu hợp lệ (Cần có cột ngày YYYY-MM-DD).' };
      }

      // Merge records by date_day
      const dateMap = new Map<string, NgoiSaoRecord>();
      records.forEach((r) => dateMap.set(r.date_day, r));
      parsed.records.forEach((r) => dateMap.set(r.date_day, r));

      const merged = Array.from(dateMap.values()).sort((a, b) => a.date_day.localeCompare(b.date_day));
      setRecords(merged);
      const nowIso = new Date().toISOString();
      setLastSyncTime(nowIso);

      try {
        localStorage.setItem('ngoisao_records_cache', JSON.stringify(merged));
        localStorage.setItem('ngoisao_last_sync', nowIso);
      } catch {
        // ignore
      }

      triggerToast(`Đã nạp thành công ${parsed.records.length} dòng dữ liệu vào Dashboard!`, 'success');
      return { success: true, count: parsed.records.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  };

  const triggerToast = (msg: string, type: 'success' | 'error') => {
    setSyncToast({ show: true, msg, type });
    setTimeout(() => {
      setSyncToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  // List of distinct sites available in dataset
  const availableSites = useMemo(() => {
    return getAvailableSites(records);
  }, [records]);

  // Records for active site (used for total count and date bounds)
  const recordsForActiveSite = useMemo(() => {
    if (filter.selectedSite && filter.selectedSite !== 'all') {
      return records.filter((r) => (r.site || '').toLowerCase() === filter.selectedSite.toLowerCase());
    }
    return records;
  }, [records, filter.selectedSite]);

  // Min and Max dates available in data for the active site
  const availableDates = useMemo(() => {
    if (!recordsForActiveSite || recordsForActiveSite.length === 0) return { min: '', max: '' };
    const sorted = [...recordsForActiveSite].sort((a, b) => a.date_day.localeCompare(b.date_day));
    return {
      min: sorted[0].date_day,
      max: sorted[sorted.length - 1].date_day,
    };
  }, [recordsForActiveSite]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return filterRecords(records, filter);
  }, [records, filter]);

  // Aggregates for all 16 metric pairs
  const aggregates = useMemo(() => {
    return computeMetricAggregates(filteredRecords);
  }, [filteredRecords]);

  // Overall KPI summary
  const overallSummary = useMemo(() => {
    return computeOverallSummary(filteredRecords);
  }, [filteredRecords]);

  const dateRangeText = useMemo(() => {
    if (filteredRecords.length === 0) return 'Không có dữ liệu';
    const first = filteredRecords[0].date_day;
    const last = filteredRecords[filteredRecords.length - 1].date_day;
    return `${formatDateVN(first)} - ${formatDateVN(last)}`;
  }, [filteredRecords]);

  const handleExportFullCsv = () => {
    const datasetToExport = recordsForActiveSite.length > 0 ? recordsForActiveSite : records;
    if (datasetToExport.length === 0) return;
    const headers = Object.keys(datasetToExport[0]);
    const csvRows = [headers.join(',')];
    datasetToExport.forEach((r) => {
      const vals = headers.map((h) => (r as any)[h]);
      csvRows.push(vals.join(','));
    });
    const siteSlug = (filter.selectedSite || 'all').toLowerCase().replace(/\s+/g, '_');
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngoisao_${siteSlug}_du_lieu_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16 flex flex-col font-sans">
      {/* Toast Alert */}
      {syncToast.show && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              syncToast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncToast.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            ></span>
            <span>{syncToast.msg}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        siteName={filter.selectedSite === 'all' ? 'Tất cả Site' : (filter.selectedSite || 'Ngôi sao')}
        totalDays={recordsForActiveSite.length}
        dateRangeText={dateRangeText}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onRefresh={handleManualSync}
        onOpenSyncStatus={() => setIsSyncStatusOpen(true)}
        onOpenMarkdown={() => setIsMarkdownOpen(true)}
        onExportCsv={handleExportFullCsv}
        selectedSite={filter.selectedSite}
        onSelectSite={(site) => setFilter(prev => ({ ...prev, selectedSite: site }))}
        availableSites={availableSites}
      />

      {/* Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full">
        {/* Filter & Period Controls */}
        <FilterBar
          filter={filter}
          setFilter={setFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          availableDates={availableDates}
          filteredDaysCount={filteredRecords.length}
          availableSites={availableSites}
        />

        {/* 1. Overall KPI Highlights */}
        <KpiSummaryCards summary={overallSummary} aggregates={aggregates} />

        {/* 2. Interactive Time Series Trend (Dual Axis Pageview & User) */}
        <TimeSeriesChart
          records={filteredRecords}
          activePairId={filter.activeMetricId}
          onSelectPair={(id) => setFilter((prev) => ({ ...prev, activeMetricId: id }))}
        />

        {/* 3. Detailed Data Table (Paired view, PV view, User view, Day of Week & Deviation vs Median for every metric) */}
        <DataTableSection records={filteredRecords} searchQuery={searchQuery} />
      </main>

      {/* Modal: View and Download Markdown File DATA_NGOISAO.md */}
      <MarkdownViewerModal
        isOpen={isMarkdownOpen}
        onClose={() => setIsMarkdownOpen(false)}
        onRefresh={handleManualSync}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        records={records}
      />

      {/* Modal: Sync Status & Google Sheets Troubleshoot */}
      <SyncStatusModal
        isOpen={isSyncStatusOpen}
        onClose={() => setIsSyncStatusOpen(false)}
        totalDays={records.length}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onTriggerSync={handleManualSync}
        earliestDate={availableDates.min}
        latestDate={availableDates.max}
        onImportCustomData={handleImportCustomData}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © 2026 Dashboard Theo Dõi Chỉ Số Site Ngôi Sao. Tự động cập nhật từ Google Sheets & lưu vào file{' '}
            <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">DATA_NGOISAO.md</code>
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMarkdownOpen(true)}
              className="hover:text-rose-600 transition-colors font-medium cursor-pointer"
            >
              Xem File Markdown
            </button>
            <span>•</span>
            <button
              onClick={handleManualSync}
              className="hover:text-rose-600 transition-colors font-medium cursor-pointer"
            >
              Làm Mới Dữ Liệu
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
