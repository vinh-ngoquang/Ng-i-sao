import { NgoiSaoRecord, MetricPairDefinition, MetricAggregate, FilterState, DayOfWeekInfo, DayOfWeekMedian } from '../types';
import { METRIC_PAIRS } from '../data/metricPairs';

export const DAY_OF_WEEK_NAMES: { name: string; shortName: string; isWeekend: boolean }[] = [
  { name: 'Chủ nhật', shortName: 'CN', isWeekend: true },
  { name: 'Thứ 2', shortName: 'T2', isWeekend: false },
  { name: 'Thứ 3', shortName: 'T3', isWeekend: false },
  { name: 'Thứ 4', shortName: 'T4', isWeekend: false },
  { name: 'Thứ 5', shortName: 'T5', isWeekend: false },
  { name: 'Thứ 6', shortName: 'T6', isWeekend: false },
  { name: 'Thứ 7', shortName: 'T7', isWeekend: true },
];

export function getDayOfWeekInfo(dateStr: string): DayOfWeekInfo {
  if (!dateStr) {
    return { dayIndex: 0, name: 'Chủ nhật', shortName: 'CN', isWeekend: true };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  const dayIndex = dateObj.getDay(); // 0 is Sunday, 1 is Monday ...
  const meta = DAY_OF_WEEK_NAMES[dayIndex] || DAY_OF_WEEK_NAMES[0];
  return {
    dayIndex,
    name: meta.name,
    shortName: meta.shortName,
    isWeekend: meta.isWeekend,
  };
}

export function calculateMedian(nums: number[]): number {
  if (!nums || nums.length === 0) return 0;
  const sorted = [...nums].filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function calculateMedianFloat(nums: number[], precision: number = 2): number {
  if (!nums || nums.length === 0) return 0;
  const sorted = [...nums].filter(n => typeof n === 'number' && !isNaN(n) && isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return Number(sorted[mid].toFixed(precision));
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(precision));
}

export function computeDayOfWeekMedians(records: NgoiSaoRecord[]): DayOfWeekMedian[] {
  if (!records || records.length === 0) {
    return DAY_OF_WEEK_NAMES.map((m, idx) => ({
      dayIndex: idx,
      name: m.name,
      shortName: m.shortName,
      isWeekend: m.isWeekend,
      count: 0,
      medianPV: 0,
      medianUser: 0,
      medianRatio: 0,
      mediansByMetric: {},
    }));
  }

  // Bucket records by dayIndex
  const buckets: NgoiSaoRecord[][] = Array.from({ length: 7 }, () => []);
  records.forEach(r => {
    const { dayIndex } = getDayOfWeekInfo(r.date_day);
    buckets[dayIndex].push(r);
  });

  return buckets.map((bucket, dayIndex) => {
    const meta = DAY_OF_WEEK_NAMES[dayIndex];
    const count = bucket.length;
    const pvList = bucket.map(r => Number(r.pageviews) || 0);
    const uList = bucket.map(r => Number(r.user) || 0);

    const medianPV = calculateMedian(pvList);
    const medianUser = calculateMedian(uList);
    
    // Calculate median PV/U ratio for total site on this day of week
    const totalRatioList = bucket
      .map(r => {
        const p = Number(r.pageviews) || 0;
        const u = Number(r.user) || 0;
        return u > 0 ? p / u : 0;
      })
      .filter(v => v > 0);
    const medianRatio = calculateMedianFloat(totalRatioList) || (medianUser > 0 ? Number((medianPV / medianUser).toFixed(2)) : 0);

    const mediansByMetric: Record<string, number> = {
      pageviews: medianPV,
      user: medianUser,
      ratio: medianRatio,
      total_ratio: medianRatio,
      pageviews_ratio: medianRatio,
    };

    // Calculate medians for all 16 pairs (PV, User, and PV/U ratio)
    METRIC_PAIRS.forEach(p => {
      const pairPVs = bucket.map(r => Number(r[p.pvKey]) || 0);
      const pairUs = bucket.map(r => Number(r[p.uKey]) || 0);
      const pairPVMed = calculateMedian(pairPVs);
      const pairUMed = calculateMedian(pairUs);

      mediansByMetric[p.pvKey] = pairPVMed;
      mediansByMetric[p.uKey] = pairUMed;

      const pairRatios = bucket
        .map(r => {
          const pv = Number(r[p.pvKey]) || 0;
          const u = Number(r[p.uKey]) || 0;
          return u > 0 ? pv / u : 0;
        })
        .filter(v => v > 0);

      const pairRatioMed = calculateMedianFloat(pairRatios) || (pairUMed > 0 ? Number((pairPVMed / pairUMed).toFixed(2)) : 0);
      mediansByMetric[`${p.id}_ratio`] = pairRatioMed;
      mediansByMetric[`${p.pvKey}_ratio`] = pairRatioMed;
    });

    return {
      dayIndex,
      name: meta.name,
      shortName: meta.shortName,
      isWeekend: meta.isWeekend,
      count,
      medianPV,
      medianUser,
      medianRatio,
      mediansByMetric,
    };
  });
}


export function getAvailableSites(records: NgoiSaoRecord[]): { id: string; name: string; count: number }[] {
  if (!records || records.length === 0) return [];
  const map = new Map<string, number>();
  records.forEach(r => {
    const site = r.site ? r.site.trim() : 'Ngôi sao';
    map.set(site, (map.get(site) || 0) + 1);
  });
  return Array.from(map.entries()).map(([name, count]) => ({
    id: name,
    name,
    count,
  }));
}

export function filterRecords(records: NgoiSaoRecord[], filter: FilterState): NgoiSaoRecord[] {
  if (!records || records.length === 0) return [];

  // Filter by Site first if selectedSite is set and not 'all'
  let bySite = records;
  if (filter.selectedSite && filter.selectedSite !== 'all') {
    bySite = records.filter(r => (r.site || '').toLowerCase() === filter.selectedSite.toLowerCase());
  }

  // Sort ascending by date
  const sorted = [...bySite].sort((a, b) => a.date_day.localeCompare(b.date_day));

  if (filter.dateRange === 'all') {
    return sorted;
  }

  if (filter.dateRange === 'custom') {
    return sorted.filter(r => {
      if (filter.startDate && r.date_day < filter.startDate) return false;
      if (filter.endDate && r.date_day > filter.endDate) return false;
      return true;
    });
  }

  const daysMap: Record<string, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 90
  };

  const days = daysMap[filter.dateRange] || sorted.length;
  return sorted.slice(-days);
}

export function computeMetricAggregates(records: NgoiSaoRecord[]): MetricAggregate[] {
  if (!records || records.length === 0) return [];

  const count = records.length;
  const totalSitePV = records.reduce((sum, r) => sum + (r.pageviews || 0), 0);
  const totalSiteUser = records.reduce((sum, r) => sum + (r.user || 0), 0);

  return METRIC_PAIRS.map(pair => {
    let totalPV = 0;
    let totalUser = 0;
    let maxPV = -Infinity;
    let maxUser = -Infinity;
    let minPV = Infinity;
    let minUser = Infinity;

    records.forEach(r => {
      const pv = Number(r[pair.pvKey]) || 0;
      const u = Number(r[pair.uKey]) || 0;

      totalPV += pv;
      totalUser += u;

      if (pv > maxPV) maxPV = pv;
      if (pv < minPV) minPV = pv;
      if (u > maxUser) maxUser = u;
      if (u < minUser) minUser = u;
    });

    const avgPV = count > 0 ? totalPV / count : 0;
    const avgUser = count > 0 ? totalUser / count : 0;
    const pvShare = totalSitePV > 0 ? (totalPV / totalSitePV) * 100 : 0;
    const userShare = totalSiteUser > 0 ? (totalUser / totalSiteUser) * 100 : 0;
    const ratio = totalUser > 0 ? totalPV / totalUser : 0;

    return {
      pair,
      totalPV,
      totalUser,
      avgPV,
      avgUser,
      pvShare,
      userShare,
      ratio,
      maxPV: maxPV === -Infinity ? 0 : maxPV,
      maxUser: maxUser === -Infinity ? 0 : maxUser,
      minPV: minPV === Infinity ? 0 : minPV,
      minUser: minUser === Infinity ? 0 : minUser
    };
  });
}

export function computeOverallSummary(records: NgoiSaoRecord[]) {
  if (!records || records.length === 0) {
    return {
      totalPV: 0,
      totalUser: 0,
      avgPV: 0,
      avgUser: 0,
      ratio: 0,
      peakDayPV: { date: '', val: 0 },
      peakDayUser: { date: '', val: 0 },
      lowestDayPV: { date: '', val: 0 },
      growthPV: 0,
      growthUser: 0
    };
  }

  const count = records.length;
  let totalPV = 0;
  let totalUser = 0;
  let peakDayPV = { date: records[0].date_day, val: records[0].pageviews };
  let peakDayUser = { date: records[0].date_day, val: records[0].user };
  let lowestDayPV = { date: records[0].date_day, val: records[0].pageviews };

  records.forEach(r => {
    totalPV += r.pageviews || 0;
    totalUser += r.user || 0;

    if (r.pageviews > peakDayPV.val) {
      peakDayPV = { date: r.date_day, val: r.pageviews };
    }
    if (r.user > peakDayUser.val) {
      peakDayUser = { date: r.date_day, val: r.user };
    }
    if (r.pageviews < lowestDayPV.val) {
      lowestDayPV = { date: r.date_day, val: r.pageviews };
    }
  });

  const avgPV = count > 0 ? Math.round(totalPV / count) : 0;
  const avgUser = count > 0 ? Math.round(totalUser / count) : 0;
  const ratio = totalUser > 0 ? totalPV / totalUser : 0;

  // Comparison between first half and second half of period to show growth trend
  let growthPV = 0;
  let growthUser = 0;
  if (count >= 14) {
    const half = Math.floor(count / 2);
    const firstHalfPV = records.slice(0, half).reduce((s, r) => s + r.pageviews, 0) / half;
    const secondHalfPV = records.slice(half).reduce((s, r) => s + r.pageviews, 0) / (count - half);
    if (firstHalfPV > 0) growthPV = ((secondHalfPV - firstHalfPV) / firstHalfPV) * 100;

    const firstHalfU = records.slice(0, half).reduce((s, r) => s + r.user, 0) / half;
    const secondHalfU = records.slice(half).reduce((s, r) => s + r.user, 0) / (count - half);
    if (firstHalfU > 0) growthUser = ((secondHalfU - firstHalfU) / firstHalfU) * 100;
  }

  return {
    totalPV,
    totalUser,
    avgPV,
    avgUser,
    ratio,
    peakDayPV,
    peakDayUser,
    lowestDayPV,
    growthPV,
    growthUser
  };
}

export function prepareTimeSeriesData(
  records: NgoiSaoRecord[],
  selectedPair: MetricPairDefinition,
  mode: 'daily' | 'ma7' | 'cumulative'
) {
  if (!records || records.length === 0) return [];

  let cumPV = 0;
  let cumUser = 0;

  return records.map((r, idx) => {
    const pv = Number(r[selectedPair.pvKey]) || 0;
    const u = Number(r[selectedPair.uKey]) || 0;
    cumPV += pv;
    cumUser += u;

    let chartPV = pv;
    let chartUser = u;

    if (mode === 'cumulative') {
      chartPV = cumPV;
      chartUser = cumUser;
    } else if (mode === 'ma7') {
      // 7-day moving average
      const startIdx = Math.max(0, idx - 6);
      const window = records.slice(startIdx, idx + 1);
      const windowSumPV = window.reduce((s, w) => s + (Number(w[selectedPair.pvKey]) || 0), 0);
      const windowSumU = window.reduce((s, w) => s + (Number(w[selectedPair.uKey]) || 0), 0);
      chartPV = Math.round(windowSumPV / window.length);
      chartUser = Math.round(windowSumU / window.length);
    }

    const ratio = chartUser > 0 ? Number((chartPV / chartUser).toFixed(2)) : 0;

    return {
      date: r.date_day,
      displayDate: r.date_day.slice(5), // MM-DD
      pageviews: chartPV,
      user: chartUser,
      rawPV: pv,
      rawUser: u,
      ratio
    };
  });
}
