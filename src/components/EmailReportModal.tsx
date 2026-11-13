import React, { useState, useMemo, useEffect } from 'react';
import { X, Mail, Send, Copy, Check, Calendar, Settings, Sparkles, AlertCircle, CheckCircle2, KeyRound, Clock } from 'lucide-react';
import { NgoiSaoRecord } from '../types';
import { generateDailyEmailReport } from '../utils/emailReportGenerator';
import { formatDateVN } from '../utils/formatters';

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: NgoiSaoRecord[];
}

export const EmailReportModal: React.FC<EmailReportModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(records.map((r) => r.date_day))).sort((a, b) => b.localeCompare(a));
    return dates;
  }, [records]);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'automation'>('preview');

  // SMTP & Recipient state (persisted in localStorage for convenience)
  const [emailTo, setEmailTo] = useState<string>(() => localStorage.getItem('ngoisao_email_to') || '');
  const [smtpUser, setSmtpUser] = useState<string>(() => localStorage.getItem('ngoisao_smtp_user') || '');
  const [smtpPass, setSmtpPass] = useState<string>(() => localStorage.getItem('ngoisao_smtp_pass') || '');
  const [showSmtpConfig, setShowSmtpConfig] = useState<boolean>(false);

  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);

  useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.includes(selectedDate))) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const report = useMemo(() => {
    if (!records || records.length === 0) return null;
    return generateDailyEmailReport(records, selectedDate || undefined);
  }, [records, selectedDate]);

  if (!isOpen) return null;

  const handleSaveLocalConfig = (to: string, user: string, pass: string) => {
    try {
      localStorage.setItem('ngoisao_email_to', to);
      localStorage.setItem('ngoisao_smtp_user', user);
      localStorage.setItem('ngoisao_smtp_pass', pass);
    } catch {
      // ignore storage errors
    }
  };

  const handleSendEmailNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    handleSaveLocalConfig(emailTo, smtpUser, smtpPass);
    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailTo: emailTo.trim() || undefined,
          smtpUser: smtpUser.trim() || undefined,
          smtpPass: smtpPass.trim() || undefined,
          date: report.reportDate,
          records,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSendResult({
          type: 'success',
          message: data.message || `Đã gửi email báo cáo ngày ${formatDateVN(report.reportDate)} thành công!`,
        });
      } else {
        setSendResult({
          type: 'error',
          message: data.error || 'Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP Gmail.',
        });
        setShowSmtpConfig(true);
      }
    } catch (err: any) {
      setSendResult({
        type: 'error',
        message: 'Lỗi kết nối tới API gửi mail (/api/send-email). Bạn có thể bấm "Copy Nội Dung Email" để dán trực tiếp vào Gmail.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyRichEmail = async () => {
    if (!report) return;
    try {
      if (typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([report.html], { type: 'text/html' });
        const textBlob = new Blob([report.text], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(report.html);
      }
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3000);
    } catch {
      await navigator.clipboard.writeText(report.text);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-inner">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Báo Cáo Email Tự Động Hàng Ngày (3 Site)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Clock className="w-3 h-3" /> 07:30 sáng hàng ngày
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tổng hợp dữ liệu ngày mới nhất của <strong>Ngôi sao</strong> • <strong>VnExpress</strong> • <strong>English</strong> kèm % lệch &amp; số lệch tuyệt đối so với Trung vị từ đầu năm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Xem Trước &amp; Gửi Ngay
              </button>
              <button
                onClick={() => setActiveTab('automation')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'automation'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Cấu Hình Tự Động (Cron)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'preview' ? (
          <>
            {/* Send Controls Bar */}
            <form onSubmit={handleSendEmailNow} className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                {/* Date selector */}
                <div className="w-full sm:w-auto">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Ngày Dữ Liệu Báo Cáo
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full sm:w-52 pl-8 pr-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {availableDates.map((d, idx) => (
                        <option key={d} value={d}>
                          {formatDateVN(d)} {idx === 0 ? '(Mới nhất)' : ''}
                        </option>
                      ))}
                    </select>
                    <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Recipient Email */}
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Email Người Nhận (Cách nhau bởi dấu phẩy nếu gửi nhiều người)
                  </label>
                  <input
                    type="text"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="vd: banbientap@vnexpress.net, quangvinh@gmail.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Toggle SMTP Credentials */}
                <button
                  type="button"
                  onClick={() => setShowSmtpConfig((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    showSmtpConfig
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Tài khoản Gmail SMTP</span>
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Đang gửi email...' : 'Gửi Email Ngay'}</span>
                </button>

                {/* Copy Formatted HTML Button */}
                <button
                  type="button"
                  onClick={handleCopyRichEmail}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  title="Copy toàn bộ bảng báo cáo đã định dạng màu sắc để dán thẳng vào Gmail hoặc Outlook"
                >
                  {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHtml ? 'Đã Copy Bảng Báo Cáo!' : 'Copy Bảng Dán Vào Gmail'}</span>
                </button>
              </div>

              {/* Optional SMTP Credentials Input */}
              {showSmtpConfig && (
                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Gmail Gửi Đi (`SMTP_USER`)
                    </label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="your-email@gmail.com (Để trống nếu đã cấu hình trên Server/Vercel)"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mật Khẩu Ứng Dụng Gmail 16 Ký Tự (`SMTP_PASS`)
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx (App Password của Google)"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* Status Banner */}
              {sendResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                    sendResult.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {sendResult.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{sendResult.message}</span>
                </div>
              )}
            </form>

            {/* Subject Preview Bar */}
            {report && (
              <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div>
                  <span className="font-semibold text-slate-500">Tiêu đề Email: </span>
                  <strong className="text-slate-900">{report.subject}</strong>
                </div>
                <span className="text-[11px] text-slate-500">
                  Hiển thị đầy đủ 16 cặp chỉ số × 3 Site ( Thực tế • % Lệch • Số lệch tuyệt đối • Trung vị cùng thứ từ đầu năm )
                </span>
              </div>
            )}

            {/* Live HTML Email Preview */}
            <div className="flex-1 overflow-y-auto bg-slate-200/70 p-3 sm:p-5">
              {report ? (
                <div
                  className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-4xl mx-auto overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: report.html }}
                />
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Không có dữ liệu để tạo báo cáo email.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Automation Setup Guide Tab */
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50 text-slate-800">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Flow Tự Động Gửi Mail Hàng Ngày Đã Được Thiết Lập Sẵn
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Hệ thống đã được tích hợp cả 2 cơ chế tự động chạy lúc <strong>07:30 sáng hàng ngày (giờ Việt Nam)</strong>:
                    <br />
                    1. <strong>GitHub Actions Workflow</strong> (<code>.github/workflows/daily-email-report.yml</code>) chạy script <code>scripts/sendDailyEmail.mjs</code> hoàn toàn miễn phí.
                    <br />
                    2. <strong>Vercel Cron Job</strong> (<code>vercel.json</code> → <code>/api/send-email</code>).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Gmail App Password */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Bước 1: Tạo Mật Khẩu Ứng Dụng Gmail (App Password)
                </div>
                <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Truy cập trang quản lý tài khoản Google:{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-600 font-semibold underline"
                    >
                      myaccount.google.com/apppasswords
                    </a>{' '}
                    (Cần bật xác minh 2 bước).
                  </li>
                  <li>
                    Đặt tên ứng dụng là <code>Dashboard Traffic Daily</code> và nhấn <strong>Tạo (Create)</strong>.
                  </li>
                  <li>
                    Copy chuỗi <strong>16 ký tự</strong> được Google cấp (dùng làm <code>SMTP_PASS</code>).
                  </li>
                </ol>
              </div>

              {/* Step 2: Configure GitHub Secrets / Vercel Env */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Bước 2: Khai Báo 3 Biến Môi Trường (Secrets)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vào GitHub Repo của bạn → <strong>Settings</strong> → <strong>Secrets and variables</strong> → <strong>Actions</strong> → <strong>New repository secret</strong> (hoặc trong <strong>Vercel Environment Variables</strong>) và thêm 3 biến:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs space-y-1.5">
                  <div>
                    <span className="text-emerald-400">SMTP_USER</span> = <span className="text-amber-300">email-cua-ban@gmail.com</span>
                  </div>
                  <div>
                    <span className="text-emerald-400">SMTP_PASS</span> = <span className="text-amber-300">xxxx xxxx xxxx xxxx</span> <span className="text-slate-400"># App Password 16 ký tự</span>
                  </div>
                  <div>
                    <span className="text-emerald-400">EMAIL_TO</span> = <span className="text-amber-300">nguoinhan1@gmail.com, nguoinhan2@vnexpress.net</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Manual Trigger on GitHub Actions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-700">
                Cách Chạy Thử Ngay Trên GitHub Actions Hoặc Máy Cá Nhân
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                • <strong>Trên GitHub:</strong> Mở tab <strong>Actions</strong> → chọn workflow <strong>"Gửi Email Báo Cáo Traffic Hàng Ngày"</strong> → bấm <strong>Run workflow</strong>.
                <br />• <strong>Trên Terminal máy tính:</strong> Chạy lệnh <code>npm run send-email</code> (với các biến môi trường <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>EMAIL_TO</code>).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
