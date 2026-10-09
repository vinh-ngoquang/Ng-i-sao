import React, { useState, useMemo, useRef } from 'react';
import { Table, ArrowUpDown, Download, Filter, Eye, AlertTriangle, Flame, Sparkles } from 'lucide-react';
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
      badgeClass: 'bg-emerald-600 text-white font-bold shadow-2xs',
      cellBgClass: 'bg-emerald-50/80',
      textClass: 'text-emerald-950 font-bold',
      isAnomaly: diffPct >= threshold,
    };
  }

  // +5% ~ +20% Tăng nhẹ - Xanh nhạt
  if (diffPct >= 5) {
    return {
      tier: 'mild_up',
      label: 'Tăng nhẹ',
      badgeClass: 'bg-emerald-100 text-emerald-800 font-medium',
      cellBgClass: '',
      textClass: 'text-slate-900',
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
      textClass: 'text-slate-700',
      isAnomaly: false,
    };
  }

  // -5% ~ -20% Giảm nhẹ (-20% đến <= -5%) - Hồng nhạt
  if (diffPct > -20) {
    return {
      tier: 'mild_down',
      label: 'Giảm nhẹ',
      badgeClass: 'bg-rose-100 text-rose-800 font-medium',
      cellBgClass: '',
      textClass: 'text-slate-900',
      isAnomaly: false,
    };
  }

  // ≤ -20% Giảm bất thường - Đỏ đậm nổi bật
  return {
    tier: 'extreme_down',
    label: 'Giảm bất thường',
    badgeClass: 'bg-rose-600 text-white font-bold shadow-2xs',
    cellBgClass: 'bg-rose-50/80',
    textClass: 'text-rose-950 font-bold',
    isAnomaly: Math.abs(diffPct) >= threshold,
  };
}

export type DisplayMode = 'both_pct' | 'both_abs' | 'diff_pct' | 'diff_abs' | 'value_only';

export const DataTableSection: React.FC<DataTableSectionProps> = ({ records, allSiteRecords, searchQuery }) => {
  const [viewMode, setViewMode] = useState<'paired' | 'pv_only' | 'u_only' | 'ratio_only'>('paired');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both_pct');
  const [sortField, setSortField] = useState<string>('date_day');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDowFilter, setSelectedDowFilter] = useState<string>('all');
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
  const [focusAnomaliesOnly, setFocusAnomaliesOnly] = useState<boolean>(false);
  const [filterOutlierRowsOnly, setFilterOutlierRowsOnly] = useState<boolean>(false);

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
          (r.site || '').toLowerCase().includes(q) ||
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

  // Helper to render metric cell with uniform height and precise alignment
  const renderCellWithDeviation = (
    val: number,
    medianVal: number,
    dowName: string,
    metricHeader: string,
    isUser: boolean = false,
    isRatio: boolean = false,
    extraColClass: string = ''
  ) => {
    const diffPct = medianVal > 0 ? ((val - medianVal) / medianVal) * 100 : 0;
    const diffAbs = val - medianVal;
    const isUp = diffPct >= 0;
    const diffSign = isUp ? '+' : '';
    const diffPctFormatted = `${diffSign}${diffPct.toFixed(1)}%`;
    const diffAbsFormatted = isRatio
      ? `${diffSign}${diffAbs.toFixed(2)}`
      : `${diffSign}${formatNumber(diffAbs)}`;
    const anomaly = classifyAnomaly(diffPct, anomalyThreshold);

    const isDimmed = focusAnomaliesOnly && !anomaly.isAnomaly;
    const dimClass = isDimmed ? 'opacity-30 hover:opacity-100 transition-opacity' : '';

    const formattedVal = isRatio ? formatRatio(val) : formatNumber(val);
    const formattedMedian = isRatio ? formatRatio(medianVal) : formatNumber(medianVal);

    const tooltip = `[${anomaly.label}] ${metricHeader}: ${formattedVal}\nTrung vị ${dowName}: ${formattedMedian}\nĐộ lệch %: ${diffPctFormatted}\nLệch tuyệt đối: ${diffAbsFormatted}`;

    if (displayMode === 'value_only') {
      return (
        <td className={`px-2 py-1.5 text-right cursor-help ${extraColClass} ${anomaly.cellBgClass} ${dimClass}`} title={tooltip}>
          <div className="flex items-center justify-end h-9">
            <span className={`font-mono text-xs tabular-nums ${anomaly.textClass}`}>
              {formattedVal}
            </span>
          </div>
        </td>
      );
    }

    if (displayMode === 'diff_pct') {
      return (
        <td className={`px-2 py-1.5 text-right cursor-help ${extraColClass} ${anomaly.cellBgClass} ${dimClass}`} title={tooltip}>
          <div className="flex items-center justify-end h-9">
            <span className={`inline-block font-mono text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded min-w-[48px] text-center ${anomaly.badgeClass}`}>
              {diffPctFormatted}
            </span>
          </div>
        </td>
      );
    }

    if (displayMode === 'diff_abs') {
      return (
        <td className={`px-2 py-1.5 text-right cursor-help ${extraColClass} ${anomaly.cellBgClass} ${dimClass}`} title={tooltip}>
          <div className="flex items-center justify-end h-9">
            <span className={`inline-block font-mono text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded min-w-[52px] text-center ${anomaly.badgeClass}`}>
              {diffAbsFormatted}
            </span>
          </div>
        </td>
      );
    }

    if (displayMode === 'both_abs') {
      return (
        <td className={`px-2 py-1.5 text-right cursor-help transition-colors ${extraColClass} ${anomaly.cellBgClass} ${dimClass}`} title={tooltip}>
          <div className="flex flex-col items-end justify-center h-9 leading-none">
            <span className={`font-mono text-xs tabular-nums mb-0.5 ${anomaly.textClass}`}>
              {formattedVal}
            </span>
            <span className={`inline-block font-mono text-[9.5px] tabular-nums font-semibold px-1 py-0.5 rounded min-w-[50px] text-center leading-tight ${anomaly.badgeClass}`}>
              {diffAbsFormatted}
            </span>
          </div>
        </td>
      );
    }

    // Both with % (default: both_pct): formatted value on top, % diff badge below
    return (
      <td className={`px-2 py-1.5 text-right cursor-help transition-colors ${extraColClass} ${anomaly.cellBgClass} ${dimClass}`} title={tooltip}>
        <div className="flex flex-col items-end justify-center h-9 leading-none">
          <span className={`font-mono text-xs tabular-nums mb-0.5 ${anomaly.textClass}`}>
            {formattedVal}
          </span>
          <span className={`inline-block font-mono text-[9.5px] tabular-nums font-semibold px-1 py-0.5 rounded min-w-[48px] text-center leading-tight ${anomaly.badgeClass}`}>
            {diffPctFormatted}
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
      headerCols.push(`${p.pvHeader}_Lech_Tuyet_Doi`);
      headerCols.push(`${p.pvHeader}_Danh_Gia`);
      headerCols.push(`${p.uHeader}`);
      headerCols.push(`${p.uHeader}_TV_Thu`);
      headerCols.push(`${p.uHeader}_Lech_%`);
      headerCols.push(`${p.uHeader}_Lech_Tuyet_Doi`);
      headerCols.push(`${p.uHeader}_Danh_Gia`);
      headerCols.push(`${p.shortLabel}_PV_U`);
      headerCols.push(`${p.shortLabel}_PV_U_TV_Thu`);
      headerCols.push(`${p.shortLabel}_PV_U_Lech_%`);
      headerCols.push(`${p.shortLabel}_PV_U_Lech_Tuyet_Doi`);
      headerCols.push(`${p.shortLabel}_PV_U_Danh_Gia`);
    });

    const rows = sortedRecords.map(r => {
      const dowInfo = getDayOfWeekInfo(r.date_day);
      const medianData = medianMap.get(dowInfo.dayIndex);

      const rowCols = [r.date_day, dowInfo.name, r.site || ''];

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

        const pvDiffAbs = pv - pvMed;
        const uDiffAbs = u - uMed;
        const ratioDiffAbs = ratio - rMed;

        const pvAnomaly = classifyAnomaly(pvDiffVal, anomalyThreshold);
        const uAnomaly = classifyAnomaly(uDiffVal, anomalyThreshold);
        const ratioAnomaly = classifyAnomaly(ratioDiffVal, anomalyThreshold);

        const pvDiffStr = `${pvDiffVal >= 0 ? '+' : ''}${pvDiffVal.toFixed(1)}%`;
        const uDiffStr = `${uDiffVal >= 0 ? '+' : ''}${uDiffVal.toFixed(1)}%`;
        const ratioDiffStr = `${ratioDiffVal >= 0 ? '+' : ''}${ratioDiffVal.toFixed(1)}%`;

        const pvDiffAbsStr = `${pvDiffAbs >= 0 ? '+' : ''}${pvDiffAbs}`;
        const uDiffAbsStr = `${uDiffAbs >= 0 ? '+' : ''}${uDiffAbs}`;
        const ratioDiffAbsStr = `${ratioDiffAbs >= 0 ? '+' : ''}${ratioDiffAbs.toFixed(2)}`;

        rowCols.push(
          String(pv), String(pvMed), pvDiffStr, pvDiffAbsStr, pvAnomaly.label,
          String(u), String(uMed), uDiffStr, uDiffAbsStr, uAnomaly.label,
          ratio.toFixed(2), rMed.toFixed(2), ratioDiffStr, ratioDiffAbsStr, ratioAnomaly.label
        );
      });

      return rowCols.join(',');
    });

    const csvContent = '\uFEFF' + [headerCols.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ngoisao_chi_tiet_do_lech_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs mb-8 space-y-4"
      id="data-table-section"
    >
      
      {/* 1. Header & Main Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
        
        {/* Title & Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Table className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Bảng Dữ Liệu Chi Tiết Theo Ngày
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">
                Hiển thị <strong className="text-slate-800 font-semibold">{sortedRecords.length}</strong> ngày • So sánh với mức trung vị chuẩn theo thứ
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhận diện tăng/giảm bất thường (±20%)</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* View Mode Selector */}
          <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200/80 text-xs shadow-2xs">
            <button
              onClick={() => setViewMode('paired')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
                viewMode === 'paired' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ghép Cặp (PV & User)
            </button>
            <button
              onClick={() => setViewMode('pv_only')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                viewMode === 'pv_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ PV
            </button>
            <button
              onClick={() => setViewMode('u_only')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                viewMode === 'u_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ User
            </button>
            <button
              onClick={() => setViewMode('ratio_only')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                viewMode === 'ratio_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chỉ PV/U
            </button>
          </div>

          {/* Display Mode Toggle with Absolute Diff options */}
          <div className="inline-flex items-center rounded-lg p-1 bg-slate-100 border border-slate-200/80 text-xs shadow-2xs">
            <span className="pl-2 pr-1 text-slate-400">
              <Eye className="w-3.5 h-3.5" />
            </span>
            <button
              onClick={() => setDisplayMode('both_pct')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'both_pct' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Hiển thị Giá trị thực + % Lệch so với trung vị thứ"
            >
              Số & % Lệch
            </button>
            <button
              onClick={() => setDisplayMode('both_abs')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'both_abs' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Hiển thị Giá trị thực + Số lệch tuyệt đối (±PV, ±User) so với trung vị thứ"
            >
              Số & Lệch Tuyệt Đối
            </button>
            <button
              onClick={() => setDisplayMode('diff_pct')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'diff_pct' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chỉ hiển thị % Lệch so với trung vị thứ"
            >
              Chỉ % Lệch
            </button>
            <button
              onClick={() => setDisplayMode('diff_abs')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'diff_abs' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chỉ hiển thị Số lệch tuyệt đối (±PV, ±User) so với trung vị thứ"
            >
              Chỉ Lệch Tuyệt Đối
            </button>
            <button
              onClick={() => setDisplayMode('value_only')}
              className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                displayMode === 'value_only' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chỉ hiển thị Giá trị thực tế"
            >
              Chỉ Số
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportTableCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs transition-colors"
            title="Tải toàn bộ bảng dữ liệu kèm phân loại điểm bất thường ra file CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Integrated Benchmark & Anomaly Control Panel */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-3">
        
        {/* Panel Top Row: Benchmark Metric Selector + Legend + Quick Outlier Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Left: Benchmark Selector & Baseline Sample Size */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Mức Trung Vị Chuẩn Theo Thứ:</span>
            </span>

            <select
              value={benchmarkMetricId}
              onChange={(e) => setBenchmarkMetricId(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer shadow-2xs"
            >
              {METRIC_PAIRS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.order}. {p.name} ({p.pvHeader} / {p.uHeader})
                </option>
              ))}
            </select>

            <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
              Mẫu: <strong className="text-slate-900 font-semibold">{baselineRecords.length} ngày</strong> từ đầu năm
            </span>
          </div>

          {/* Right: Anomaly Actions & Legend */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Legend scale */}
            <div className="hidden sm:flex items-center gap-1 text-[10.5px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-semibold">≥+20% Tăng</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">+5%~+20%</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">±5% Chuẩn</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-medium">-5%~-20%</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-semibold">≤-20% Giảm</span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

            {/* Toggle Highlight Outliers */}
            <button
              onClick={() => setFocusAnomaliesOnly(!focusAnomaliesOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                focusAnomaliesOnly
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Làm mờ các ngày bình thường để điểm bất thường nổi bật"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${focusAnomaliesOnly ? 'text-white' : 'text-amber-500'}`} />
              <span>Soi Bất Thường</span>
            </button>

            {/* Filter outlier rows */}
            <button
              onClick={() => setFilterOutlierRowsOnly(!filterOutlierRowsOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                filterOutlierRowsOnly
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Chỉ hiển thị các ngày có biến động lệch chuẩn"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Chỉ xem ngày biến động ({anomalyStats.daysWithAnomaly})</span>
            </button>
          </div>
        </div>

        {/* 7-Day Interactive Benchmark Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
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
                }}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/30'
                    : m.isWeekend
                    ? 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-100/60'
                    : 'bg-white border-slate-200 hover:bg-slate-100/80'
                }`}
                title={`Bấm để chỉ xem dữ liệu các ngày ${m.name}`}
              >
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-100">
                  <span className={`text-xs font-bold ${
                    m.isWeekend ? 'text-amber-900' : 'text-slate-900'
                  }`}>
                    {m.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {m.count} ngày
                  </span>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex items-center justify-between text-rose-700 font-medium">
                    <span className="text-[10px] text-slate-400 font-sans">PV:</span>
                    <span className="font-mono font-bold">{formatNumber(pvMed)}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-700 font-medium">
                    <span className="text-[10px] text-slate-400 font-sans">User:</span>
                    <span className="font-mono font-bold">{formatNumber(uMed)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700 font-medium pt-0.5 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 font-sans">PV/U:</span>
                    <span className="font-mono font-semibold">{ratio}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Filter Bar for DOW */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-500 font-medium text-[11px] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Lọc nhanh:</span>
          </span>

          <button
            onClick={() => setSelectedDowFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              selectedDowFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Tất cả ({records.length} ngày)
          </button>

          <button
            onClick={() => setSelectedDowFilter('weekday')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              selectedDowFilter === 'weekday'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            Ngày làm việc (T2 - T6)
          </button>

          <button
            onClick={() => setSelectedDowFilter('weekend')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              selectedDowFilter === 'weekend'
                ? 'bg-amber-600 text-white font-semibold shadow-xs'
                : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
            }`}
          >
            Cuối tuần (T7 & CN)
          </button>

          {DAY_OF_WEEK_NAMES.map((d, idx) => {
            const isCurrent = selectedDowFilter === String(idx);
            return (
              <button
                key={idx}
                onClick={() => setSelectedDowFilter(String(idx))}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {d.shortName}
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. Main Data Table Container */}
      <div
        ref={tableContainerRef}
        className="overflow-auto rounded-xl border border-slate-200 shadow-2xs relative scroll-smooth focus:outline-none max-h-[640px] bg-white"
        tabIndex={0}
      >
        <table className="w-full text-xs text-left border-collapse whitespace-nowrap table-fixed">
          
          {/* Table Colgroup for Rock-Solid Uniform Widths */}
          <colgroup>
            <col className="w-[100px]" />
            <col className="w-[68px]" />
            <col className="w-[84px]" />
            {viewMode === 'paired' && METRIC_PAIRS.map(p => (
              <React.Fragment key={p.id}>
                <col className="w-[84px]" />
                <col className="w-[84px]" />
                <col className="w-[74px]" />
              </React.Fragment>
            ))}
            {viewMode === 'pv_only' && METRIC_PAIRS.map(p => (
              <col key={p.id} className="w-[105px]" />
            ))}
            {viewMode === 'u_only' && METRIC_PAIRS.map(p => (
              <col key={p.id} className="w-[105px]" />
            ))}
            {viewMode === 'ratio_only' && METRIC_PAIRS.map(p => (
              <col key={p.id} className="w-[95px]" />
            ))}
          </colgroup>

          {/* Table Head */}
          <thead
            onWheel={handleHeaderWheel}
            className="sticky top-0 z-30 bg-slate-100 shadow-2xs select-none"
          >
            {viewMode === 'paired' ? (
              <>
                {/* Level 1 Header */}
                <tr className="border-b border-slate-200 bg-slate-100 text-[11px]">
                  {/* Ngày (Sticky Left 0) */}
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('date_day')}
                    className="p-2 cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none border-r border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <span>Ngày</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Thứ (Sticky Left 100px) */}
                  <th
                    rowSpan={2}
                    onClick={() => handleSort('dow')}
                    className="p-2 cursor-pointer hover:bg-slate-200/80 text-center select-none bg-slate-100 z-50 sticky top-0 left-[100px] border-r border-slate-200 shadow-2xs font-bold text-slate-800"
                    title="Sắp xếp theo thứ"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span>Thứ</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Site */}
                  <th rowSpan={2} className="p-2 text-slate-600 bg-slate-100 sticky top-0 z-30 font-semibold border-r border-slate-200">
                    Site
                  </th>

                  {/* 16 Metric Pairs */}
                  {METRIC_PAIRS.map(p => (
                    <th
                      key={p.id}
                      colSpan={3}
                      className="p-2 text-center font-bold text-slate-800 bg-slate-100 sticky top-0 z-30 border-r border-slate-200 truncate"
                      title={p.name}
                    >
                      <span className="text-[11px] font-bold text-slate-900">{p.shortLabel}</span>
                    </th>
                  ))}
                </tr>

                {/* Level 2 Subheaders */}
                <tr className="text-[10.5px] uppercase font-semibold text-slate-600 bg-slate-50/95 border-b border-slate-200">
                  {METRIC_PAIRS.map(p => (
                    <React.Fragment key={p.id}>
                      <th
                        onClick={() => handleSort(p.pvKey as string)}
                        className="py-1 px-1.5 text-rose-700 cursor-pointer hover:bg-slate-200/60 select-none text-right bg-slate-50"
                        title={`Sắp xếp ${p.pvHeader}`}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          <span>PV</span>
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(p.uKey as string)}
                        className="py-1 px-1.5 text-blue-700 cursor-pointer hover:bg-slate-200/60 select-none text-right bg-slate-50"
                        title={`Sắp xếp ${p.uHeader}`}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          <span>User</span>
                          <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort(`${p.id}_ratio`)}
                        className="py-1 px-1.5 text-emerald-800 cursor-pointer hover:bg-slate-200/60 select-none text-right bg-slate-50 border-r border-slate-200"
                        title={`Sắp xếp PV/U của ${p.shortLabel}`}
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
              <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-800">
                <th onClick={() => handleSort('date_day')} className="p-2 cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none border-r border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1">
                    <span>Ngày</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('dow')} className="p-2 cursor-pointer hover:bg-slate-200/80 text-center select-none sticky top-0 left-[100px] bg-slate-100 z-50 border-r border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Thứ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2 text-slate-600 bg-slate-100 sticky top-0 z-30 font-semibold border-r border-slate-200">Site</th>
                {METRIC_PAIRS.map(p => (
                  <th
                    key={p.id}
                    onClick={() => handleSort(p.pvKey as string)}
                    className="p-2 text-rose-700 cursor-pointer hover:bg-slate-200/60 text-right select-none bg-slate-100 sticky top-0 z-30 border-r border-slate-200"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{p.pvHeader}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                ))}
              </tr>
            ) : viewMode === 'u_only' ? (
              <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-800">
                <th onClick={() => handleSort('date_day')} className="p-2 cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none border-r border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1">
                    <span>Ngày</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('dow')} className="p-2 cursor-pointer hover:bg-slate-200/80 text-center select-none sticky top-0 left-[100px] bg-slate-100 z-50 border-r border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Thứ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2 text-slate-600 bg-slate-100 sticky top-0 z-30 font-semibold border-r border-slate-200">Site</th>
                {METRIC_PAIRS.map(p => (
                  <th
                    key={p.id}
                    onClick={() => handleSort(p.uKey as string)}
                    className="p-2 text-blue-700 cursor-pointer hover:bg-slate-200/60 text-right select-none bg-slate-100 sticky top-0 z-30 border-r border-slate-200"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{p.uHeader}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                ))}
              </tr>
            ) : (
              <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-800">
                <th onClick={() => handleSort('date_day')} className="p-2 cursor-pointer hover:bg-slate-200/80 sticky top-0 left-0 bg-slate-100 z-50 select-none border-r border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1">
                    <span>Ngày</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('dow')} className="p-2 cursor-pointer hover:bg-slate-200/80 text-center select-none sticky top-0 left-[100px] bg-slate-100 z-50 border-r border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Thứ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2 text-slate-600 bg-slate-100 sticky top-0 z-30 font-semibold border-r border-slate-200">Site</th>
                {METRIC_PAIRS.map(p => (
                  <th
                    key={p.id}
                    onClick={() => handleSort(`${p.id}_ratio`)}
                    className="p-2 text-emerald-800 cursor-pointer hover:bg-slate-200/60 text-right select-none bg-slate-100 sticky top-0 z-30 border-r border-slate-200"
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
                <td colSpan={52} className="px-4 py-12 text-center text-slate-400 font-sans">
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
                    className={`transition-colors hover:bg-slate-50 ${
                      isOutlierRow && focusAnomaliesOnly ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    
                    {/* Ngày (Sticky Left 0) */}
                    <td className="p-2 font-medium text-slate-900 sticky left-0 bg-white shadow-2xs z-20 whitespace-nowrap font-mono text-xs border-r border-slate-200">
                      <div className="flex items-center gap-1.5 h-9">
                        {isOutlierRow && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                            title="Ngày này có chỉ số biến động bất thường"
                          />
                        )}
                        <span>{formatDateVN(r.date_day)}</span>
                      </div>
                    </td>

                    {/* Thứ (Sticky Left 100px) */}
                    <td className="p-2 text-center whitespace-nowrap sticky left-[100px] bg-white z-20 shadow-2xs border-r border-slate-200">
                      <div className="flex items-center justify-center h-9">
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold border ${
                          dowInfo.dayIndex === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : dowInfo.dayIndex === 6
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {dowInfo.name}
                        </span>
                      </div>
                    </td>

                    {/* Site */}
                    <td className="p-2 text-slate-500 font-sans text-[11px] border-r border-slate-200 truncate">
                      <div className="flex items-center h-9">
                        <span className="truncate">{r.site}</span>
                      </div>
                    </td>

                    {/* All paired columns */}
                    {viewMode === 'paired' && METRIC_PAIRS.map(p => {
                      const pv = Number(r[p.pvKey]) || 0;
                      const u = Number(r[p.uKey]) || 0;
                      const pvMed = medianData?.mediansByMetric[p.pvKey] || 0;
                      const uMed = medianData?.mediansByMetric[p.uKey] || 0;
                      const ratio = u > 0 ? pv / u : 0;
                      const ratioMed = medianData?.mediansByMetric[`${p.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);

                      return (
                        <React.Fragment key={p.id}>
                          {renderCellWithDeviation(pv, pvMed, dowInfo.name, p.pvHeader, false, false, '')}
                          {renderCellWithDeviation(u, uMed, dowInfo.name, p.uHeader, true, false, '')}
                          {renderCellWithDeviation(ratio, ratioMed, dowInfo.name, `${p.shortLabel} PV/U`, false, true, 'border-r border-slate-200')}
                        </React.Fragment>
                      );
                    })}

                    {/* PV only view */}
                    {viewMode === 'pv_only' && METRIC_PAIRS.map(p => {
                      const pv = Number(r[p.pvKey]) || 0;
                      const pvMed = medianData?.mediansByMetric[p.pvKey] || 0;
                      return (
                        <React.Fragment key={p.id}>
                          {renderCellWithDeviation(pv, pvMed, dowInfo.name, p.pvHeader, false, false, 'border-r border-slate-200')}
                        </React.Fragment>
                      );
                    })}

                    {/* User only view */}
                    {viewMode === 'u_only' && METRIC_PAIRS.map(p => {
                      const u = Number(r[p.uKey]) || 0;
                      const uMed = medianData?.mediansByMetric[p.uKey] || 0;
                      return (
                        <React.Fragment key={p.id}>
                          {renderCellWithDeviation(u, uMed, dowInfo.name, p.uHeader, true, false, 'border-r border-slate-200')}
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
                          {renderCellWithDeviation(ratio, ratioMed, dowInfo.name, `${p.shortLabel} PV/U`, false, true, 'border-r border-slate-200')}
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

      {/* 4. Table Footer Tips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[11.5px] text-slate-500">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Đang hiển thị <strong>{sortedRecords.length}</strong> ngày</span>
          <span>•</span>
          <span>Cố định cột Ngày và Thứ khi cuộn ngang</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Mẹo: Giữ <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">Shift + Lăn chuột</kbd> để cuộn ngang bảng
        </div>
      </div>

    </div>
  );
};
