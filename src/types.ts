export interface NgoiSaoRecord {
  date_day: string;
  site: string;
  // Pageviews
  pageviews: number;
  p_ex_direct: number;
  p_ex_google: number;
  p_ex_social: number;
  p_ex_referer: number;
  p_in_home: number;
  p_in_folder: number;
  p_in_detail: number;
  p_in_other: number;
  p_do: number;
  p_ov: number;
  p_unknown: number;
  p_mobile: number;
  p_pc: number;
  p_app: number;
  p_tablet: number;
  // User
  user: number;
  u_ex_direct: number;
  u_ex_google: number;
  u_ex_social: number;
  u_ex_referer: number;
  u_in_home: number;
  u_in_folder: number;
  u_in_detail: number;
  u_in_other: number;
  u_do: number;
  u_ov: number;
  u_unknown: number;
  u_mobile: number;
  u_pc: number;
  u_app: number;
  u_tablet: number;
}

export type MetricCategory = 'total' | 'external' | 'internal' | 'distribution' | 'device';

export interface MetricPairDefinition {
  id: string;
  order: number;
  name: string;
  shortLabel: string;
  category: MetricCategory;
  categoryLabel: string;
  pvKey: keyof NgoiSaoRecord;
  uKey: keyof NgoiSaoRecord;
  pvHeader: string;
  uHeader: string;
  color: string;
  description: string;
}

export interface MetricAggregate {
  pair: MetricPairDefinition;
  totalPV: number;
  totalUser: number;
  avgPV: number;
  avgUser: number;
  pvShare: number; // % of total Pageviews
  userShare: number; // % of total Users
  ratio: number; // PV per User
  maxPV: number;
  maxUser: number;
  minPV: number;
  minUser: number;
}

export interface FilterState {
  dateRange: 'all' | '7d' | '14d' | '30d' | '90d' | 'custom';
  startDate: string;
  endDate: string;
  selectedCategory: 'all' | MetricCategory;
  activeMetricId: string;
}

export interface DayOfWeekInfo {
  dayIndex: number; // 0 = CN, 1 = T2, ..., 6 = T7
  name: string; // 'Chủ nhật', 'Thứ 2', ...
  shortName: string; // 'CN', 'T2', ...
  isWeekend: boolean;
}

export interface DayOfWeekMedian {
  dayIndex: number;
  name: string;
  shortName: string;
  isWeekend: boolean;
  count: number;
  medianPV: number;
  medianUser: number;
  medianRatio: number;
  mediansByMetric: Record<string, number>;
}

