import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  FileSpreadsheet,
  Clock,
  HelpCircle,
  UploadCloud,
  ChevronRight
} from 'lucide-react';
import { formatDateVN } from '../utils/formatters';
import { GOOGLE_SHEETS_TSV_URL } from '../data/initialData';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDays: number;
  lastSyncTime: string;
  isSyncing: boolean;
  onTriggerSync: () => void;
  latestDate: string;
  earliestDate: string;
  onImportCustomData?: (tsvText: string) => Promise<{ success: boolean; count: number; error?: string }>;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  isOpen,
  onClose,
  totalDays,
  lastSyncTime,
  isSyncing,
  onTriggerSync,
  latestDate,
  earliestDate,
  onImportCustomData,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'troubleshoot' | 'import'>('status');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' ngày ' +
      new Date(lastSyncTime).toLocaleDateString('vi-VN')
    : 'Chưa có thông tin';

  const handleImport = async () => {
    if (!importText.trim() || !onImportCustomData) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const res = await onImportCustomData(importText);
      if (res.success) {
        setImportStatus(`Thành công! Đã nạp ${res.count} dòng dữ liệu.`);
        setImportText('');
      } else {
        setImportStatus(`Lỗi: ${res.error || 'Dữ liệu không đúng định dạng'}`);
      }
    } catch (e: any) {
      setImportStatus(`Lỗi: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Trạng Thái Đồng Bộ Google Sheets
              </h2>
              <p className="text-xs text-slate-500">
                Chi tiết kết nối nguồn dữ liệu và giải đáp cập nhật
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'status'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Trạng thái hiện tại
          </button>
          <button
            onClick={() => setActiveTab('troubleshoot')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'troubleshoot'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            Tại sao chưa thấy số mới?
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
            Dán dữ liệu trực tiếp
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {activeTab === 'status' && (
            <>
              {/* Quick Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs text-slate-500 font-medium">Tổng số ngày ghi nhận</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{totalDays} ngày</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {earliestDate ? formatDateVN(earliestDate) : ''} - {latestDate ? formatDateVN(latestDate) : ''}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                  <div className="text-xs text-emerald-700 font-medium">Dữ liệu mới nhất đến</div>
                  <div className="text-xl font-bold text-emerald-800 mt-1">
                    {latestDate ? formatDateVN(latestDate) : 'N/A'}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">
                    Ghi nhận từ Google Sheets
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70">
                  <div className="text-xs text-rose-700 font-medium">Lần đồng bộ gần nhất</div>
                  <div className="text-xs font-semibold text-rose-900 mt-1.5 line-clamp-1">
                    {formattedSyncTime}
                  </div>
                  <div className="text-[11px] text-rose-600 mt-0.5">
                    {isSyncing ? 'Đang cập nhật...' : 'Sẵn sàng'}
                  </div>
                </div>
              </div>

              {/* Source Link */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Link xuất bản Google Sheets (TSV Output):</span>
                  <a
                    href={GOOGLE_SHEETS_TSV_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 underline"
                  >
                    Mở tab mới kiểm tra <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-600 break-all select-all">
                  {GOOGLE_SHEETS_TSV_URL}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  Hệ thống tự động bỏ qua cache (Cache-Busting) để luôn lấy bản mới nhất từ Google.
                </p>
                <button
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Đang tải lại dữ liệu...' : 'Ép đồng bộ lại ngay'}</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'troubleshoot' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-semibold text-sm">
                    Vì sao bạn vừa điền thêm ngày mới trên Google Sheet nhưng Dashboard chưa hiển thị?
                  </p>
                  <p>
                    Dữ liệu Dashboard kết nối qua link <strong>Xuất bản lên web (Publish to the web)</strong> của Google. Dưới đây là 3 nguyên nhân phổ biến và cách kiểm tra:
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">1</span>
                    Độ trễ bộ nhớ đệm (CDN Cache) của Google Sheets (5 - 15 phút)
                  </div>
                  <p className="mt-1.5 text-slate-600 ml-7 leading-relaxed">
                    Google Sheets không xuất bản link công khai theo từng giây gõ phím. Khi bạn nhập dòng mới vào trang tính, Google máy chủ cần <strong>từ 5 đến 15 phút</strong> để ghi dữ liệu ra link xuất bản TSV công khai.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">2</span>
                    Kiểm tra tùy chọn "Tự động xuất bản lại khi có thay đổi"
                  </div>
                  <div className="mt-1.5 text-slate-600 ml-7 space-y-1 leading-relaxed">
                    <p>Trong file Google Sheets của bạn:</p>
                    <ol className="list-decimal list-inside space-y-0.5 font-medium text-slate-800">
                      <li>Bấm menu <strong>Tệp (File)</strong> &gt; <strong>Chia sẻ (Share)</strong> &gt; <strong>Xuất bản lên web (Publish to web)</strong>.</li>
                      <li>Mở rộng mục <strong>Đã xuất bản nội dung &amp; cài đặt</strong> (Published content &amp; settings).</li>
                      <li>Đảm bảo đã tích chọn ô: <span className="text-rose-600 font-semibold">"Tự động xuất bản lại khi có thay đổi" (Automatically republish when changes are made)</span>.</li>
                    </ol>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">3</span>
                    Cách kiểm tra trực tiếp xem Google đã xuất bản chưa
                  </div>
                  <p className="mt-1.5 text-slate-600 ml-7 leading-relaxed">
                    Bấm vào nút bên dưới để mở thẳng link TSV xuất bản. Hãy cuộn xuống dòng cuối cùng cùng: nếu dòng cuối cùng vẫn là ngày <strong>{latestDate}</strong> thì nghĩa là Google Sheets chưa đẩy dữ liệu mới ra web. Khi Google đẩy ra, bạn bấm <strong>"Cập nhật trực tiếp"</strong> Dashboard sẽ hiển thị ngay lập tức!
                  </p>
                  <div className="ml-7 mt-2">
                    <a
                      href={GOOGLE_SHEETS_TSV_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium text-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
                      Mở link TSV kiểm tra dòng cuối cùng
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <p className="font-semibold">Cập nhật tức thì không cần chờ Google Sheets xuất bản:</p>
                <p className="mt-1">
                  Nếu bạn vừa có số liệu hôm nay và không muốn chờ 10 phút để Google CDN cập nhật, bạn có thể copy các dòng mới từ Google Sheets rồi dán vào khung bên dưới để nạp thẳng vào Dashboard!
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dán dữ liệu TSV hoặc CSV (Có dòng tiêu đề hoặc các dòng ngày mới):
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="2026-09-22&#9;Ngôi sao&#9;1200000&#9;..."
                  rows={6}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50/50"
                ></textarea>
              </div>

              {importStatus && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    importStatus.startsWith('Thành công')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {importStatus}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleImport}
                  disabled={isImporting || !importText.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isImporting ? 'Đang nạp...' : 'Nạp dữ liệu vào Dashboard'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Dữ liệu được lưu trong trình duyệt và file DATA_NGOISAO.md
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
