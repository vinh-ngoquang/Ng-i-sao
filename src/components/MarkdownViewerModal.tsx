import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, FileText, RefreshCw, ExternalLink } from 'lucide-react';
import { NgoiSaoRecord } from '../types';
import { generateMarkdownContent } from '../utils/googleSheetsSync';

interface MarkdownViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
  lastSyncTime: string;
  records: NgoiSaoRecord[];
}

export const MarkdownViewerModal: React.FC<MarkdownViewerModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  isSyncing,
  lastSyncTime,
  records,
}) => {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchMarkdown();
    }
  }, [isOpen]);

  const fetchMarkdown = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/markdown');
      if (res.ok) {
        const data = await res.json();
        if (data.markdown) {
          setMarkdownContent(data.markdown);
          return;
        }
      }
      // Fallback: generate from current records
      setMarkdownContent(generateMarkdownContent(records, lastSyncTime));
    } catch (err) {
      setMarkdownContent(generateMarkdownContent(records, lastSyncTime));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!markdownContent) return;
    navigator.clipboard.writeText(markdownContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadMdFile = () => {
    if (!markdownContent) return;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DATA_NGOISAO.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>File DATA_NGOISAO.md</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                  Auto-updated
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ dữ liệu từ Google Sheets đã được lưu trữ và đồng bộ vào file Markdown tại thư mục gốc.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép!' : 'Sao chép MD'}</span>
            </button>

            <button
              onClick={downloadMdFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed selection:bg-rose-600 selection:text-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span>Đang tải nội dung file Markdown...</span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed">
              {markdownContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>File lưu tại: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">/DATA_NGOISAO.md</code></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onRefresh();
                setTimeout(fetchMarkdown, 1000);
              }}
              disabled={isSyncing}
              className="text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Làm mới & đồng bộ lại từ link</span>
            </button>
            <span>•</span>
            <a
              href="https://docs.google.com/spreadsheets/d/e/2PACX-1vQksM6-RzffQI5Va9Bx6X9oiii5Hd_BYZDjaRSNnHOuhke-FlQr9kuYOTXuuoA2SkZPyvrCF2_c6dkC/pub?gid=1633653606&single=true&output=tsv"
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>Xem TSV gốc</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
