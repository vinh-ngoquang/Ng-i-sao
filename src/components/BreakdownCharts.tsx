import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import { PieChart as PieIcon, BarChart2, Smartphone, Globe, Layout, ShieldAlert } from 'lucide-react';
import { MetricAggregate } from '../types';
import { formatCompact, formatNumber, formatPercent, formatRatio } from '../utils/formatters';

interface BreakdownChartsProps {
  aggregates: MetricAggregate[];
}

export const BreakdownCharts: React.FC<BreakdownChartsProps> = ({ aggregates }) => {
  const [activeTab, setActiveTab] = useState<'external' | 'internal' | 'device' | 'distribution'>('external');

  const groups = {
    external: {
      title: 'Nguồn Ngoài (External Sources)',
      desc: 'So sánh lưu lượng từ Direct, Google, Social và Referer',
      icon: Globe,
      pairs: aggregates.filter(a => a.pair.category === 'external')
    },
    internal: {
      title: 'Khu Vực Trang (Internal Sections)',
      desc: 'Lưu lượng độc giả phân bổ tại Trang chủ, Chuyên mục, Chi tiết bài viết và Trang khác',
      icon: Layout,
      pairs: aggregates.filter(a => a.pair.category === 'internal')
    },
    device: {
      title: 'Thiết Bị (Devices & Platforms)',
      desc: 'Tỷ trọng thiết bị truy cập giữa Mobile, PC, App và Tablet',
      icon: Smartphone,
      pairs: aggregates.filter(a => a.pair.category === 'device')
    },
    distribution: {
      title: 'Phân Loại Lưu Lượng (DO / OV / Unknown)',
      desc: 'Cơ cấu phân bổ giữa các nhóm luồng độc giả',
      icon: ShieldAlert,
      pairs: aggregates.filter(a => a.pair.category === 'distribution')
    }
  };

  const currentGroup = groups[activeTab];
  const chartData = currentGroup.pairs.map(p => ({
    name: p.pair.shortLabel,
    fullName: p.pair.name,
    pageviews: p.totalPV,
    user: p.totalUser,
    pvShare: p.pvShare,
    userShare: p.userShare,
    ratio: p.ratio,
    pvHeader: p.pair.pvHeader,
    uHeader: p.pair.uHeader
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-6" id="breakdown-charts-section">
      
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-rose-600" />
            <span>Phân Tích Cơ Cấu Từng Nhóm Chỉ Số</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentGroup.desc}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(Object.keys(groups) as Array<keyof typeof groups>).map(key => {
            const grp = groups[key];
            const Icon = grp.icon;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                id={`btn-breakdown-tab-${key}`}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{key === 'external' ? 'Nguồn Ngoài' : key === 'internal' ? 'Khu Vực Trang' : key === 'device' ? 'Thiết Bị' : 'Phân Loại'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart and Comparative Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        
        {/* Left: Bar Chart */}
        <div className="lg:col-span-2 h-72 min-h-[288px] w-full">
          <ResponsiveContainer width="100%" height={288} minHeight={288}>
            <BarChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tickLine={false} stroke="#64748b" fontSize={11} />
              <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatCompact(v)} width={50} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length && payload[0]?.payload) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-44">
                        <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">{d.fullName}</p>
                        <div className="flex items-center justify-between text-rose-300">
                          <span>{d.pvHeader}:</span>
                          <span className="font-mono font-bold text-white">{formatCompact(d.pageviews || 0)} ({formatPercent(d.pvShare || 0)})</span>
                        </div>
                        <div className="flex items-center justify-between text-blue-300">
                          <span>{d.uHeader}:</span>
                          <span className="font-mono font-bold text-white">{formatCompact(d.user || 0)} ({formatPercent(d.userShare || 0)})</span>
                        </div>
                        <div className="flex items-center justify-between text-violet-300 pt-1 border-t border-slate-800">
                          <span>Tỷ lệ PV/User:</span>
                          <span className="font-mono font-bold text-emerald-400">{formatRatio(d.ratio || 0)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={30}
                formatter={(val) => {
                  if (val === 'pageviews') return <span className="text-xs font-semibold text-rose-600">Pageviews (Lượt xem)</span>;
                  if (val === 'user') return <span className="text-xs font-semibold text-blue-600">User (Độc giả)</span>;
                  return val;
                }}
              />
              <Bar dataKey="pageviews" fill="#e11d48" radius={[4, 4, 0, 0]} name="pageviews" />
              <Bar dataKey="user" fill="#2563eb" radius={[4, 4, 0, 0]} name="user" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Comparative Breakdown List */}
        <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Bảng Cơ Cấu & Tỷ Trọng
          </h3>
          {chartData.map((d, i) => (
            <div key={d.name} className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">{d.name}</span>
                <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  {formatRatio(d.ratio)} PV/U
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <div>
                  <span className="text-rose-600 font-semibold">PV: </span>
                  <strong className="text-slate-700">{formatCompact(d.pageviews)}</strong> ({formatPercent(d.pvShare)})
                </div>
                <div>
                  <span className="text-blue-600 font-semibold">User: </span>
                  <strong className="text-slate-700">{formatCompact(d.user)}</strong> ({formatPercent(d.userShare)})
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 flex">
                <div className="bg-rose-500 h-full" style={{ width: `${Math.min(d.pvShare, 100)}%` }} />
                <div className="bg-blue-500 h-full opacity-80" style={{ width: `${Math.min(d.userShare, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
