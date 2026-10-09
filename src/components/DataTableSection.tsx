import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Table, ChevronLeft, ChevronRight, ArrowUpDown, Download, Search, Check, Calendar, TrendingUp, TrendingDown, Filter, Eye, AlertTriangle, Flame, ShieldAlert, Sparkles, LayoutGrid } from 'lucide-react';
import { NgoiSaoRecord } from '../types';
import { METRIC_PAIRS } from '../data/metricPairs';
import { formatNumber, formatDateVN, formatRatio } from '../utils/formatters';
import { getDayOfWeekInfo, computeDayOfWeekMedians, DAY_OF_WEEK_NAMES } from '../utils/dataProcessing';

interface DataTableSectionProps {
  records: NgoiSaoRecord[];
  allSiteRecords?: NgoiSaoRecord[];
  searchQuery: string;
}

export type AnomalyTier =
  | 'extreme_up'   // >= +20% (Tăng bất thường)
  | 'mild_up'      // +5% -> +20% (Tăng nhẹ)
  | 'neutral'      // ±5% (Ổn định)
  | 'mild_down'    // -5% -> -20% (Giảm nhẹ)
  | 'extreme_down'; // <= -20% (Giảm bất thường)

interface AnomalyStyle {
  tier: AnomalyTier;
  label: string;
  badgeClass: string;
  cellBgClass: string;
  textClass: string;
  isAnomaly: boolean;
}

export function classifyAnomaly(diffPct: number, threshold: number = 20): AnomalyStyle {
  if (isNaN(diffPct) || !isFinite(diffPct)) {
    return {
      tier: 'neutral',
      label: 'Ổn định',
      badgeClass: 'text-slate-400 bg-slate-100',
      cellBgClass: '',
      textClass: 'text-slate-700',
      isAnomaly: false,
    };
  }

  // ≥ +20% Tăng bất thường - Xanh lục đậm nổi bật
  if (diffPct >= 20) {
    return {
      tier: 'extreme_up',
      label: 'Tăng bất thường',
      badgeClass: 'bg-emerald-600 text-white font-bold shadow-xs',
      cellBgClass: 'bg-emerald-50/70',
      textClass: 'text-emerald-950 font-bold',
      isAnomaly: diffPct >= threshold,
    };
  }

  // +5% ~ +20% Tăng nhẹ - Xanh nhạt
  if (diffPct >= 5) {
    return {
      tier: 'mild_up',
      label: 'Tăng nhẹ',
      badgeClass: 'bg-emerald-50 text-emerald-700 font-medium',
      cellBgClass: '',
      textClass: 'text-slate-800',
      isAnomaly: false,
    };
  }

  // ±5% Ổn định (-5% đến < +5%) - Trung tính xám mờ
  if (diffPct > -5) {
    return {
      tier: 'neutral',
      label: 'Ổn định',
      badgeClass: 'bg-slate-100 text-slate-500 font-normal',
      cellBgClass: '',
      textClass: 'text-slate-600',
      isAnomaly: false,
    };
  }

  // -5% ~ -20% Giảm nhẹ (-20% đến <= -5%) - Hồng nhạt
  if (diffPct > -20) {
    return {
      tier: 'mild_down',
      label: 'Giảm nhẹ',
      badgeClass: 'bg-rose-50 text-rose-600 font-medium',
      cellBgClass: '',
      textClass: 'text-slate-800',
      isAnomaly: false,
    };
  }

  // ≤ -20% Giảm bất thường - Đỏ đậm nổi bật
  return {
    tier: 'extreme_down',
    label: 'Giảm bất thường',
    badgeClass: 'bg-rose-600 text-white font-bold shadow-xs',
    cellBgClass: 'bg-rose-50/70',
    textClass: 'text-rose-950 font-bold',
    isAnomaly: Math.abs(diffPct) >= threshold,
  };
}

// Cấu hình kích thước chuẩn cố định cho bảng dữ liệu
const TABLE_STYLES = {
  tableText: 'text-xs',
  headerText: 'text-[11px]',
  cellPadding: 'px-2.5 py-1.5',
  headerPadding: 'px-2.5 py-2',
  valFont: 'text-xs font-semibold',
  badgeFont: 'text-[10px] px-1.5 py-0.5 min-w-[46px]',
  dayColWidth: 'min-w-[105px] w-[105px]',
  dowColWidth: 'min-w-[65px] w-[65px]',
  dowLeft: 'left-[105px]',
};

export const DataTableSection: React.FC<DataTableSectionProps> = ({ records, allSiteRecords, searchQuery }) => {
  const [viewMode, setViewMode] = useState<'paired' | 'pv_only' | 'u_only' | 'ratio_only'>('paired');
  const [displayMode, setDisplayMode] = useState<'both' | 'value_only' | 'diff_only'>('both');
  const [sortField, setSortField] = useState<string>('date_day');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15; // Mặc định cố định 15 dòng theo yêu cầu
  const [selectedDowFilter, setSelectedDowFilter] = useState<string>('all');
  const [showMedianBenchmarks, setShowMedianBenchmarks] = useState<boolean>(true);
  const [benchmarkMetricId, setBenchmarkMetricId] = useState<string>('total');

  // Dữ liệu chuẩn để tính trung vị benchmark: Cố định toàn bộ từ đầu năm cho site được chọn
  const baselineRecords = useMemo(() => {
    return allSiteRecords && allSiteRecords.length > 0 ? allSiteRecords : records;
  }, [allSiteRecords, records]);

  // Ref container để cuộn chuột & cuộn ngang
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Cuộn ngang khi lăn chuột trên tiêu đề bảng
  const handleHeaderWheel = (e: React.WheelEvent<HTMLTableSectionElement>) => {
    if (tableContainerRef.current && e.deltaY !== 0 && !e.shiftKey) {
      e.preventDefault();
      tableContainerRef.current.scrollLeft += e.deltaY * 1.5;
    }
  };

  // Anomaly detector state (threshold fixed at 20% according to specification)
  const anomalyThreshold = 20;
  const [focusAnomaliesOnly, setFocusAnomaliesOnly] = useState<boolean>(false); // Dim normal cells, emphasize outliers
  const [filterOutlierRowsOnly, setFilterOutlierRowsOnly] = useState<boolean>(false); // Filter only rows with at least 1 anomaly

  // Compute medians by day of the week across the FULL baseline dataset (fixed from beginning of year)
  const dowMedians = useMemo(() => {
    return computeDayOfWeekMedians(baselineRecords);
  }, [baselineRecords]);

  // Lookup map for day-of-week median
  const medianMap = useMemo(() => {
    const map = new Map<number, (typeof dowMedians)[0]>();
    dowMedians.forEach(m => map.set(m.dayIndex, m));
    return map;
  }, [dowMedians]);

  // Find the selected pair definition for benchmark preview
  const selectedBenchmarkPair = useMemo(() => {
    return METRIC_PAIRS.find(p => p.id === benchmarkMetricId) || METRIC_PAIRS[0];
  }, [benchmarkMetricId]);

  // Check if a row has any anomaly based on threshold
  const rowHasAnomaly = (r: NgoiSaoRecord): boolean => {
    const dowInfo = getDayOfWeekInfo(r.date_day);
    const medianData = medianMap.get(dowInfo.dayIndex);
    if (!medianData) return false;

    // Check total PV and User
    const pvDiff = medianData.medianPV > 0 ? Math.abs((Number(r.pageviews) - medianData.medianPV) / medianData.medianPV) * 100 : 0;
    const uDiff = medianData.medianUser > 0 ? Math.abs((Number(r.user) - medianData.medianUser) / medianData.medianUser) * 100 : 0;
    if (pvDiff >= anomalyThreshold || uDiff >= anomalyThreshold) return true;

    // Check all 16 metric pairs (PV, User, and PV/U ratio)
    for (const p of METRIC_PAIRS) {
      const pMed = medianData.mediansByMetric[p.pvKey] || 0;
      const uMed = medianData.mediansByMetric[p.uKey] || 0;
      const rMed = medianData.mediansByMetric[`${p.id}_ratio`] || (uMed > 0 ? pMed / uMed : 0);
      if (pMed > 0) {
        const diff = Math.abs((Number(r[p.pvKey]) - pMed) / pMed) * 100;
        if (diff >= anomalyThreshold) return true;
      }
      if (uMed > 0) {
        const diff = Math.abs((Number(r[p.uKey]) - uMed) / uMed) * 100;
        if (diff >= anomalyThreshold) return true;
      }
      if (rMed > 0) {
        const pv = Number(r[p.pvKey]) || 0;
        const u = Number(r[p.uKey]) || 0;
        const ratio = u > 0 ? pv / u : 0;
        const diff = Math.abs((ratio - rMed) / rMed) * 100;
        if (diff >= anomalyThreshold) return true;
      }
    }
    return false;
  };

  // Filter records by search query, day-of-week filter, and optional outlier filter
  const filteredRecords = useMemo(() => {
    let result = records;

    // Filter by day of week selection
    if (selectedDowFilter !== 'all') {
      if (selectedDowFilter === 'weekday') {
        result = result.filter(r => {
          const { dayIndex } = getDayOfWeekInfo(r.date_day);
          return dayIndex >= 1 && dayIndex <= 5;
        });
      } else if (selectedDowFilter === 'weekend') {
        result = result.filter(r => {
          const { dayIndex } = getDayOfWeekInfo(r.date_day);
          return dayIndex === 0 || dayIndex === 6;
        });
      } else {
        const dowIndex = Number(selectedDowFilter);
        result = result.filter(r => {
          const { dayIndex } = getDayOfWeekInfo(r.date_day);
          return dayIndex === dowIndex;
        });
      }
    }

    // Filter only rows containing at least 1 anomalous metric
    if (filterOutlierRowsOnly) {
      result = result.filter(rowHasAnomaly);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => {
        const dowInfo = getDayOfWeekInfo(r.date_day);
        return (
          r.date_day.includes(q) ||
          r.site.toLowerCase().includes(q) ||
          dowInfo.name.toLowerCase().includes(q) ||
          dowInfo.shortName.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [records, searchQuery, selectedDowFilter, filterOutlierRowsOnly, anomalyThreshold, medianMap]);

  // Overall anomaly stats across filtered records
  const anomalyStats = useMemo(() => {
    let spikeCount = 0;
    let dropCount = 0;
    let daysWithAnomaly = 0;

    filteredRecords.forEach(r => {
      let dayHadAnomaly = false;
      const dowInfo = getDayOfWeekInfo(r.date_day);
      const medianData = medianMap.get(dowInfo.dayIndex);
      if (!medianData) return;

      METRIC_PAIRS.forEach(p => {
        const pv = Number(r[p.pvKey]) || 0;
        const u = Number(r[p.uKey]) || 0;
        const pvMed = medianData.mediansByMetric[p.pvKey] || 0;
        const uMed = medianData.mediansByMetric[p.uKey] || 0;
        const rMed = medianData.mediansByMetric[`${p.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);

        if (pvMed > 0) {
          const diff = ((pv - pvMed) / pvMed) * 100;
          if (diff >= anomalyThreshold) { spikeCount++; dayHadAnomaly = true; }
          else if (diff <= -anomalyThreshold) { dropCount++; dayHadAnomaly = true; }
        }
        if (uMed > 0) {
          const diff = ((u - uMed) / uMed) * 100;
          if (diff >= anomalyThreshold) { spikeCount++; dayHadAnomaly = true; }
          else if (diff <= -anomalyThreshold) { dropCount++; dayHadAnomaly = true; }
        }
        if (rMed > 0) {
          const ratio = u > 0 ? pv / u : 0;
          const diff = ((ratio - rMed) / rMed) * 100;
          if (diff >= anomalyThreshold) { spikeCount++; dayHadAnomaly = true; }
          else if (diff <= -anomalyThreshold) { dropCount++; dayHadAnomaly = true; }
        }
      });

      if (dayHadAnomaly) daysWithAnomaly++;
    });

    return { spikeCount, dropCount, daysWithAnomaly };
  }, [filteredRecords, anomalyThreshold, medianMap]);

  // Sort records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a: any, b: any) => {
      if (sortField === 'dow') {
        const dowA = getDayOfWeekInfo(a.date_day).dayIndex;
        const dowB = getDayOfWeekInfo(b.date_day).dayIndex;
        return sortOrder === 'asc' ? dowA - dowB : dowB - dowA;
      }

      if (sortField.startsWith('diff_')) {
        const metricKey = sortField.replace('diff_', '');
        const dowA = getDayOfWeekInfo(a.date_day).dayIndex;
        const dowB = getDayOfWeekInfo(b.date_day).dayIndex;
        const medA = medianMap.get(dowA)?.mediansByMetric[metricKey] || 1;
        const medB = medianMap.get(dowB)?.mediansByMetric[metricKey] || 1;
        const diffA = (Number(a[metricKey]) - medA) / medA;
        const diffB = (Number(b[metricKey]) - medB) / medB;
        return sortOrder === 'asc' ? diffA - diffB : diffB - diffA;
      }

      // Sắp xếp theo tỷ lệ PV/U
      if (sortField.endsWith('_ratio')) {
        const pairId = sortField.replace('_ratio', '');
        const pair = METRIC_PAIRS.find(p => p.id === pairId);
        if (pair) {
          const uA = Number(a[pair.uKey]) || 0;
          const pvA = Number(a[pair.pvKey]) || 0;
          const ratioA = uA > 0 ? pvA / uA : 0;
          const uB = Number(b[pair.uKey]) || 0;
          const pvB = Number(b[pair.pvKey]) || 0;
          const ratioB = uB > 0 ? pvB / uB : 0;
          return sortOrder === 'asc' ? ratioA - ratioB : ratioB - ratioA;
        }
      }

      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (Number(valA) || 0) - (Number(valB) || 0) : (Number(valB) || 0) - (Number(valA) || 0);
    });
  }, [filteredRecords, sortField, sortOrder, medianMap]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Helper to render metric cell with distinct anomaly visual hierarchy
  const renderCellWithDeviation = (
    val: number,
    medianVal: number,
    dowName: string,
    metricHeader: string,
    isUser: boolean = false,
    isRatio: boolean = false
  ) => {
    const diffPct = medianVal > 0 ? ((val - medianVal) / medianVal) * 100 : 0;
    const isUp = diffPct >= 0;
    const diffSign = isUp ? '+' : '';
    const diffFormatted = `${diffSign}${diffPct.toFixed(1)}%`;
    const anomaly = classifyAnomaly(diffPct, anomalyThreshold);

    // In anomaly focus mode: dim regular cells so outliers instantly pop out!
    const isDimmed = focusAnomaliesOnly && !anomaly.isAnomaly;
    const dimClass = isDimmed ? 'opacity-30 hover:opacity-100 transition-opacity' : '';

    const formattedVal = isRatio ? formatRatio(val) : formatNumber(val);
    const formattedMedian = isRatio ? formatRatio(medianVal) : formatNumber(medianVal);

    const tooltip = `[${anomaly.label}] ${metricHeader}: ${formattedVal}\nTrung vị ${dowName}: ${formattedMedian}\nĐộ lệch vs thứ: ${diffFormatted}`;

    if (displayMode === 'value_only') {
      return (
        <td className={`${TABLE_STYLES.cellPadding} text-right cursor-help ${anomaly.cellBgClass} ${dimClass} ${isRatio ? 'border-r border-slate-200/50' : ''}`} title={tooltip}>
          <span className={`font-mono ${TABLE_STYLES.valFont} tabular-nums ${anomaly.textClass}`}>
            {formattedVal}
          </span>
        </td>
      );
    }

    if (displayMode === 'diff_only') {
      return (
        <td className={`${TABLE_STYLES.cellPadding} text-right cursor-help ${anomaly.cellBgClass} ${dimClass} ${isRatio ? 'border-r border-slate-200/50' : ''}`} title={tooltip}>
          <span
            className={`inline-block font-mono ${TABLE_STYLES.badgeFont} tabular-nums rounded text-center ${anomaly.badgeClass}`}
          >
            {diffFormatted}
          </span>
        </td>
      );
    }

    // Both (default): formatted value on top, high-visibility color badge below (no icons, pure color gradient)
    return (
      <td className={`${TABLE_STYLES.cellPadding} text-right cursor-help transition-colors ${anomaly.cellBgClass} ${dimClass} ${isRatio ? 'border-r border-slate-200/50' : ''}`} title={tooltip}>
        <div className="flex flex-col items-end justify-center leading-tight">
          <span className={`font-mono ${TABLE_STYLES.valFont} tabular-nums ${anomaly.textClass}`}>
            {formattedVal}
          </span>
          <span
            className={`inline-block font-mono tabular-nums leading-tight mt-0.5 rounded text-center ${TABLE_STYLES.badgeFont} ${anomaly.badgeClass}`}
          >
            {diffFormatted}
          </span>
        </div>
      </td>
    );
  };

  const exportTableCsv = () => {
    if (sortedRecords.length === 0) return;
    
    const headerCols = ['date_day', 'Thu', 'Site'];

    METRIC_PAIRS.forEach(p => {
      headerCols.push(`${p.pvHeader}`);
      headerCols.push(`${p.pvHeader}_TV_Thu`);
      headerCols.push(`${p.pvHeader}_Lech_%`);
      headerCols.push(`${p.pvHeader}_Danh_Gia`);
      headerCols.push(`${p.uHeader}`);
      headerCols.push(`${p.uHeader}_TV_Thu`);
      headerCols.push(`${p.uHeader}_Lech_%`);
      headerCols.push(`${p.uHeader}_Danh_Gia`);
      headerCols.push(`${p.shortLabel}_PV_U`);
      headerCols.push(`${p.shortLabel}_PV_U_TV_Thu`);
      headerCols.push(`${p.shortLabel}_PV_U_Lech_%`);
      headerCols.push(`${p.shortLabel}_PV_U_Danh_Gia`);
    });

    const rows = sortedRecords.map(r => {
      const dowInfo = getDayOfWeekInfo(r.date_day);
      const medianData = medianMap.get(dowInfo.dayIndex);

      const rowCols = [r.date_day, dowInfo.name, r.site];

      METRIC_PAIRS.forEach(p => {
        const pv = Number(r[p.pvKey]) || 0;
        const u = Number(r[p.uKey]) || 0;
        const pvMed = medianData?.mediansByMetric[p.pvKey] || 0;
        const uMed = medianData?.mediansByMetric[p.uKey] || 0;
        const rMed = medianData?.mediansByMetric[`${p.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);

        const pvDiffVal = pvMed > 0 ? ((pv - pvMed) / pvMed) * 100 : 0;
        const uDiffVal = uMed > 0 ? ((u - uMed) / uMed) * 100 : 0;
        const ratio = u > 0 ? pv / u : 0;
        const ratioDiffVal = rMed > 0 ? ((ratio - rMed) / rMed) * 100 : 0;

        const pvAnomaly = classifyAnomaly(pvDiffVal, anomalyThreshold);
        const uAnomaly = classifyAnomaly(uDiffVal, anomalyThreshold);
        const ratioAnomaly = classifyAnomaly(ratioDiffVal, anomalyThreshold);

        const pvDiffStr = `${pvDiffVal >= 0 ? '+' : ''}${pvDiffVal.toFixed(1)}%`;
        const uDiffStr = `${uDiffVal >= 0 ? '+' : ''}${uDiffVal.toFixed(1)}%`;
        const ratioDiffStr = `${ratioDiffVal >= 0 ? '+' : ''}${ratioDiffVal.toFixed(1)}%`;

        rowCols.push(
          String(pv), String(pvMed), pvDiffStr, pvAnomaly.label,
          String(u), String(uMed), uDiffStr, uAnomaly.label,
          ratio.toFixed(2), rMed.toFixed(2), ratioDiffStr, ratioAnomaly.label
        );
      });

      return rowCols.join(',');
    });

    const csvContent = '\uFEFF' + [headerCols.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ngoisao_do_lech_bat_thuong_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-8"
      id="data-table-section"
    >
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Table className="w-4.5 h-4.5 text-rose-600" />
            <span>Bảng Dữ Liệu Chi Tiết Theo Ngày</span>
          </h2>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-700 text-white shadow-2xs flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-300" />
            <span>Nhận diện điểm tăng/giảm bất thường</span>
          </span>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode (Paired, PV only, User only, Ratio only) */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs shadow-2xs">
            <button
              onClick={() => { setViewMode('paired'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                viewMode === 'paired' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ghép Cặp
            </button>
            <button
              onClick={() => { setViewMode('pv_only'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                viewMode === 'pv_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ PV
            </button>
            <button
              onClick={() => { setViewMode('u_only'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                viewMode === 'u_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ User
            </button>
            <button
              onClick={() => { setViewMode('ratio_only'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                viewMode === 'ratio_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ PV/U
            </button>
          </div>

          {/* Display Mode Toggle */}
          <div className="inline-flex items-center rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs shadow-2xs">
            <span className="pl-2 pr-1 text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <button
              onClick={() => setDisplayMode('both')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'both' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Số & % Lệch
            </button>
            <button
              onClick={() => setDisplayMode('diff_only')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'diff_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ % Lệch
            </button>
            <button
              onClick={() => setDisplayMode('value_only')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'value_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ Số
            </button>
          </div>

          <button
            onClick={exportTableCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs transition-colors"
            title="Tải toàn bộ bảng dữ liệu kèm phân loại điểm bất thường ra file CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Visual Anomaly Color Scale & Legend Bar */}
      <div className="mb-3.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        
        {/* Scale Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Màu độ lệch:</span>
          </span>

          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[11px] shadow-2xs" title="Tăng từ +20% trở lên so với trung vị thứ">
            ≥ +20% Tăng bất thường
          </span>

          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200/60" title="Tăng từ +5% đến +20%">
            +5% ~ +20% Tăng nhẹ
          </span>

          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px] border border-slate-200/60" title="Biến động bình thường ±5%">
            ±5% Ổn định
          </span>

          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-medium text-[11px] border border-rose-200/60" title="Giảm từ -5% đến -20%">
            -5% ~ -20% Giảm nhẹ
          </span>

          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[11px] shadow-2xs" title="Giảm từ -20% trở xuống so với trung vị thứ">
            ≤ -20% Giảm bất thường
          </span>
        </div>

        {/* Anomaly Radar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Focus Mode */}
          <button
            onClick={() => setFocusAnomaliesOnly(!focusAnomaliesOnly)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
              focusAnomaliesOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Làm mờ các ngày bình thường để các điểm bất thường nổi bật nhất"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${focusAnomaliesOnly ? 'text-white' : 'text-amber-500'}`} />
            <span>Soi Bất Thường</span>
          </button>

          {/* Filter only rows with anomalies */}
          <button
            onClick={() => { setFilterOutlierRowsOnly(!filterOutlierRowsOnly); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
              filterOutlierRowsOnly
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Chỉ giữ lại các ngày có ít nhất một chỉ số lệch vượt ngưỡng"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Chỉ xem ngày có biến động ({anomalyStats.daysWithAnomaly} ngày)</span>
          </button>
        </div>

      </div>

      {/* 3. Benchmark Baseline: Day-of-Week Medians Strip for Selected Metric */}
      {showMedianBenchmarks && (
        <div className="mb-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>Mức Trung Vị Chuẩn Theo Thứ</span>
                <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded normal-case">
                  Cố định từ đầu năm ({baselineRecords.length} ngày)
                </span>
                <span>:</span>
              </h3>
              <select
                value={benchmarkMetricId}
                onChange={(e) => setBenchmarkMetricId(e.target.value)}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                {METRIC_PAIRS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.pvHeader} / {p.uHeader})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <strong>{anomalyStats.spikeCount}</strong> điểm tăng bất thường (≥ +20%)
              </span>
              <span className="text-rose-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <strong>{anomalyStats.dropCount}</strong> điểm giảm bất thường (≤ -20%)
              </span>
            </div>
          </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {dowMedians.map((m) => {
                  const isSelected = selectedDowFilter === String(m.dayIndex);
                  const pvMed = m.mediansByMetric[selectedBenchmarkPair.pvKey] || 0;
                  const uMed = m.mediansByMetric[selectedBenchmarkPair.uKey] || 0;
                  const ratioMed = m.mediansByMetric[`${selectedBenchmarkPair.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);
                  const ratio = formatRatio(ratioMed);

                  return (
                    <button
                      key={m.dayIndex}
                      onClick={() => {
                        setSelectedDowFilter(prev => prev === String(m.dayIndex) ? 'all' : String(m.dayIndex));
                        setCurrentPage(1);
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/30'
                          : m.isWeekend
                          ? 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-100/50'
                          : 'bg-white border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${
                          m.isWeekend ? 'text-amber-800' : 'text-slate-800'
                        }`}>
                          {m.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {m.count} ngày
                        </span>
                      </div>

                      <div className="space-y-0.5 text-[11px]">
                        <div className="flex items-center justify-between text-rose-700 font-medium">
                          <span>PV:</span>
                          <span className="font-mono font-bold">{formatNumber(pvMed)}</span>
                        </div>
                        <div className="flex items-center justify-between text-blue-700 font-medium">
                          <span>User:</span>
                          <span className="font-mono font-bold">{formatNumber(uMed)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 pt-0.5 border-t border-slate-200/60 text-[10px]">
                          <span>PV/U:</span>
                          <span className="font-mono font-semibold text-emerald-600">{ratio}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
      )}

      {/* 4. Day of Week Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3.5 text-xs">
        <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-400" />
          <span>Lọc theo thứ:</span>
        </span>

        <button
          onClick={() => { setSelectedDowFilter('all'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            selectedDowFilter === 'all'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả ({records.length} ngày)
        </button>

        <button
          onClick={() => { setSelectedDowFilter('weekday'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            selectedDowFilter === 'weekday'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
          }`}
        >
          Ngày làm việc (T2 - T6)
        </button>

        <button
          onClick={() => { setSelectedDowFilter('weekend'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            selectedDowFilter === 'weekend'
              ? 'bg-amber-600 text-white font-semibold shadow-xs'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
          }`}
        >
          Cuối tuần (T7 & CN)
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1"></div>

        {DAY_OF_WEEK_NAMES.map((d, idx) => {
          const isCurrent = selectedDowFilter === String(idx);
          return (
            <button
              key={idx}
              onClick={() => { setSelectedDowFilter(String(idx)); setCurrentPage(1); }}
              className={`px-2 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                isCurrent
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : d.isWeekend
                  ? 'bg-amber-100/70 text-amber-900 hover:bg-amber-200/70'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.shortName}
            </button>
          );
        })}
      </div>

      {/* Scroll Navigation & Tips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 text-xs">
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span>Hiển thị toàn bộ <strong>{sortedRecords.length}</strong> ngày • Lăn chuột trong bảng để cuộn dọc • Giữ <strong>Shift + Lăn chuột</strong> (hoặc lăn trên hàng tiêu đề) để cuộn ngang</span>
        </div>
      </div>

      {/* 5. Table Container */}
      <div
        ref={tableContainerRef}
        className="overflow-auto rounded-lg border border-slate-200 shadow-2xs relative scroll-smooth focus:outline-none max-h-[620px]"
        tabIndex={0}
      >
        <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
          
          {/* Table Head */}
          <thead
            onWheel={handleHeaderWheel}
            className="sticky top-0 z-30 bg-slate-100 shadow-2xs select-none"
          >
            {viewMode === 'paired' ? (
              <>
                {/* Multi-level header */}
                <tr className="border-b border-slate-200 bg-slate-100/95 text-[11px]">
                  {/* Ngày */}
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('date_day')}
                    className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dayColWidth} cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none shadow-xs`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={TABLE_STYLES.headerText}>Ngày</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* THỨ */}
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('dow')}
                    className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dowColWidth} cursor-pointer hover:bg-slate-200/80 text-center select-none bg-slate-100 z-50 sticky top-0 ${TABLE_STYLES.dowLeft} shadow-xs`}
                    title="Bấm để sắp xếp theo thứ trong tuần"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={TABLE_STYLES.headerText}>Thứ</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th rowSpan={2} className={`${TABLE_STYLES.headerPadding} text-slate-500 bg-slate-100 sticky top-0 z-30 ${TABLE_STYLES.headerText}`}>Site</th>

                  {METRIC_PAIRS.map(p => (
                    <th key={p.id} colSpan={3} className={`${TABLE_STYLES.headerPadding} text-center border-l border-slate-200 font-bold text-slate-800 bg-slate-100 sticky top-0 z-30 ${TABLE_STYLES.headerText}`}>
                      {p.shortLabel}
                    </th>
                  ))}
                </tr>

                {/* Sub headers with individual sort options */}
                <tr className={`${TABLE_STYLES.headerText} uppercase text-slate-500 bg-slate-50/95 border-b border-slate-200`}>
                  {METRIC_PAIRS.map(p => (
                    <React.Fragment key={p.id}>
                      <th
                        onClick={() => handleSort(p.pvKey as string)}
                        className={`${TABLE_STYLES.headerPadding} border-l border-slate-200 text-rose-700 cursor-pointer hover:bg-slate-100 select-none text-right bg-slate-50`}
                        title={`Sắp xếp theo ${p.pvHeader}`}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          <span>PV</span>
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(p.uKey as string)}
                        className={`${TABLE_STYLES.headerPadding} text-blue-700 cursor-pointer hover:bg-slate-100 select-none text-right bg-slate-50`}
                        title={`Sắp xếp theo ${p.uHeader}`}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          <span>User</span>
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`${p.id}_ratio`)}
                        className={`${TABLE_STYLES.headerPadding} text-emerald-800 font-semibold cursor-pointer hover:bg-slate-100 select-none text-right bg-slate-50`}
                        title={`Sắp xếp theo tỷ lệ PV/U của ${p.shortLabel} (So với trung vị thứ)`}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          <span>PV/U</span>
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                        </div>
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </>
            ) : viewMode === 'pv_only' ? (
              <tr>
                <th onClick={() => handleSort('date_day')} className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dayColWidth} cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none shadow-xs`}>
                  <div className="flex items-center gap-1">
                    <span className={TABLE_STYLES.headerText}>Ngày</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('dow')} className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dowColWidth} cursor-pointer hover:bg-slate-200/80 text-center select-none sticky top-0 ${TABLE_STYLES.dowLeft} bg-slate-100 z-50 shadow-xs`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className={TABLE_STYLES.headerText}>Thứ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className={`${TABLE_STYLES.headerPadding} sticky top-0 bg-slate-100 z-30 ${TABLE_STYLES.headerText}`}>Site</th>
                {METRIC_PAIRS.map(p => (
                  <th
                    key={p.id}
                    onClick={() => handleSort(p.pvKey as string)}
                    className={`${TABLE_STYLES.headerPadding} border-l border-slate-200 text-rose-700 cursor-pointer hover:bg-slate-100 text-right select-none bg-slate-100 sticky top-0 z-30 ${TABLE_STYLES.headerText}`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{p.pvHeader}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                ))}
              </tr>
            ) : viewMode === 'u_only' ? (
              <tr>
                <th onClick={() => handleSort('date_day')} className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dayColWidth} cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none shadow-xs`}>
                  <div className="flex items-center gap-1">
                    <span className={TABLE_STYLES.headerText}>Ngày</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('dow')} className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dowColWidth} cursor-pointer hover:bg-slate-200/80 text-center select-none sticky top-0 ${TABLE_STYLES.dowLeft} bg-slate-100 z-50 shadow-xs`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className={TABLE_STYLES.headerText}>Thứ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className={`${TABLE_STYLES.headerPadding} sticky top-0 bg-slate-100 z-30 ${TABLE_STYLES.headerText}`}>Site</th>
                {METRIC_PAIRS.map(p => (
                  <th
                    key={p.id}
                    onClick={() => handleSort(p.uKey as string)}
                    className={`${TABLE_STYLES.headerPadding} border-l border-slate-200 text-blue-700 cursor-pointer hover:bg-slate-100 text-right select-none bg-slate-100 sticky top-0 z-30 ${TABLE_STYLES.headerText}`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{p.uHeader}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                ))}
              </tr>
            ) : (
              <tr>
                <th onClick={() => handleSort('date_day')} className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dayColWidth} cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none shadow-xs`}>
                  <div className="flex items-center gap-1">
                    <span className={TABLE_STYLES.headerText}>Ngày</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('dow')} className={`${TABLE_STYLES.headerPadding} ${TABLE_STYLES.dowColWidth} cursor-pointer hover:bg-slate-200/80 text-center select-none sticky top-0 ${TABLE_STYLES.dowLeft} bg-slate-100 z-50 shadow-xs`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className={TABLE_STYLES.headerText}>Thứ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className={`${TABLE_STYLES.headerPadding} sticky top-0 bg-slate-100 z-30 ${TABLE_STYLES.headerText}`}>Site</th>
                {METRIC_PAIRS.map(p => (
                  <th
                    key={p.id}
                    onClick={() => handleSort(`${p.id}_ratio`)}
                    className={`${TABLE_STYLES.headerPadding} border-l border-slate-200 text-emerald-800 cursor-pointer hover:bg-slate-100 text-right select-none bg-slate-100 sticky top-0 z-30 ${TABLE_STYLES.headerText}`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{p.shortLabel} PV/U</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                ))}
              </tr>
            )}
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={52} className="px-4 py-8 text-center text-slate-400 font-sans">
                  Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              sortedRecords.map((r) => {
                if (!r) return null;
                const dowInfo = getDayOfWeekInfo(r.date_day);
                const medianData = medianMap.get(dowInfo.dayIndex);
                const isOutlierRow = rowHasAnomaly(r);

                return (
                  <tr
                    key={r.date_day}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isOutlierRow && focusAnomaliesOnly ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    
                    {/* Ngày */}
                    <td className={`${TABLE_STYLES.cellPadding} ${TABLE_STYLES.dayColWidth} font-medium text-slate-900 sticky left-0 bg-white shadow-xs z-20 whitespace-nowrap font-mono ${TABLE_STYLES.valFont}`}>
                      <div className="flex items-center gap-1.5">
                        {isOutlierRow && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                            title="Ngày này có chỉ số biến động bất thường"
                          />
                        )}
                        <span>{formatDateVN(r.date_day)}</span>
                      </div>
                    </td>

                    {/* CỘT THỨ (2, 3, 4, 5, 6, 7, Chủ nhật) */}
                    <td className={`${TABLE_STYLES.cellPadding} ${TABLE_STYLES.dowColWidth} text-center whitespace-nowrap sticky ${TABLE_STYLES.dowLeft} bg-white z-10 shadow-xs`}>
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md ${TABLE_STYLES.badgeFont} font-semibold border ${
                        dowInfo.dayIndex === 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : dowInfo.dayIndex === 6
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {dowInfo.name}
                      </span>
                    </td>

                    <td className={`${TABLE_STYLES.cellPadding} text-slate-400 font-sans ${TABLE_STYLES.headerText}`}>
                      {r.site}
                    </td>

                    {/* All paired columns with individual deviation & anomaly recognition */}
                    {viewMode === 'paired' && METRIC_PAIRS.map(p => {
                      const pv = Number(r[p.pvKey]) || 0;
                      const u = Number(r[p.uKey]) || 0;
                      const pvMed = medianData?.mediansByMetric[p.pvKey] || 0;
                      const uMed = medianData?.mediansByMetric[p.uKey] || 0;
                      const ratio = u > 0 ? pv / u : 0;
                      const ratioMed = medianData?.mediansByMetric[`${p.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);

                      return (
                        <React.Fragment key={p.id}>
                          {/* PV with individual anomaly styling */}
                          {renderCellWithDeviation(pv, pvMed, dowInfo.name, p.pvHeader, false, false)}

                          {/* User with individual anomaly styling */}
                          {renderCellWithDeviation(u, uMed, dowInfo.name, p.uHeader, true, false)}

                          {/* Ratio with individual anomaly styling & median comparison */}
                          {renderCellWithDeviation(ratio, ratioMed, dowInfo.name, `${p.shortLabel} PV/U`, false, true)}
                        </React.Fragment>
                      );
                    })}

                    {/* PV only view */}
                    {viewMode === 'pv_only' && METRIC_PAIRS.map(p => {
                      const pv = Number(r[p.pvKey]) || 0;
                      const pvMed = medianData?.mediansByMetric[p.pvKey] || 0;
                      return (
                        <React.Fragment key={p.id}>
                          {renderCellWithDeviation(pv, pvMed, dowInfo.name, p.pvHeader, false, false)}
                        </React.Fragment>
                      );
                    })}

                    {/* User only view */}
                    {viewMode === 'u_only' && METRIC_PAIRS.map(p => {
                      const u = Number(r[p.uKey]) || 0;
                      const uMed = medianData?.mediansByMetric[p.uKey] || 0;
                      return (
                        <React.Fragment key={p.id}>
                          {renderCellWithDeviation(u, uMed, dowInfo.name, p.uHeader, true, false)}
                        </React.Fragment>
                      );
                    })}

                    {/* PV/U Ratio only view */}
                    {viewMode === 'ratio_only' && METRIC_PAIRS.map(p => {
                      const pv = Number(r[p.pvKey]) || 0;
                      const u = Number(r[p.uKey]) || 0;
                      const ratio = u > 0 ? pv / u : 0;
                      const pvMed = medianData?.mediansByMetric[p.pvKey] || 0;
                      const uMed = medianData?.mediansByMetric[p.uKey] || 0;
                      const ratioMed = medianData?.mediansByMetric[`${p.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);
                      return (
                        <React.Fragment key={p.id}>
                          {renderCellWithDeviation(ratio, ratioMed, dowInfo.name, `${p.shortLabel} PV/U`, false, true)}
                        </React.Fragment>
                      );
                    })}

                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>

      {/* 6. Footer Summary */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <span>Tổng số: <strong>{sortedRecords.length}</strong> ngày</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 text-[11px]">Đã hiển thị toàn bộ danh sách để cuộn xem</span>
        </div>
      </div>

    </div>
  );
};
