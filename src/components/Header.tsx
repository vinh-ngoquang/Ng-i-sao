import React from 'react';
import { RefreshCw, FileText, Download, CheckCircle2, AlertCircle, ExternalLink, Calendar, HelpCircle } from 'lucide-react';
import { formatDateVN } from '../utils/formatters';

interface HeaderProps {
  siteName: string;
  totalDays: number;
  dateRangeText: string;
  lastSyncTime: string;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenSyncStatus: () => void;
  onOpenMarkdown: () => void;
  onExportCsv: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  siteName,
  totalDays,
  dateRangeText,
  lastSyncTime,
  isSyncing,
  onRefresh,
  onOpenSyncStatus,
  onOpenMarkdown,
  onExportCsv,
}) => {
  const syncDateFormatted = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' +
      new Date(lastSyncTime).toLocaleDateString('vi-VN')
    : 'Chưa đồng bộ';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs" id="dashboard-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Site info and title */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-sm font-bold text-lg tracking-tight">
              NS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Dashboard {siteName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Site: {siteName}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Đồng bộ Google Sheets
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Dữ liệu: <strong className="text-slate-700 font-semibold">{totalDays} ngày</strong> ({dateRangeText})</span>
                <span>•</span>
                <span>Cập nhật: <span className="font-medium text-slate-700">{syncDateFormatted}</span></span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                id="btn-sync-live"
                onClick={onRefresh}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-white hover:bg-slate-50 text-slate-800 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Lấy dữ liệu mới nhất từ Google Sheets link"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin text-rose-600' : ''}`} />
                <span>{isSyncing ? 'Đang cập nhật...' : 'Cập nhật trực tiếp'}</span>
              </button>
              <button
                onClick={onOpenSyncStatus}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                title="Xem trạng thái kết nối & hướng dẫn cập nhật dữ liệu Google Sheets"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              id="btn-open-markdown"
              onClick={onOpenMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer border border-rose-200"
              title="Xem và tải file DATA_NGOISAO.md"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Xem File MD</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-xs"
              title="Xuất bảng dữ liệu ra file CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
