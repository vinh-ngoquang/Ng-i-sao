import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const GOOGLE_SHEETS_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQksM6-RzffQI5Va9Bx6X9oiii5Hd_BYZDjaRSNnHOuhke-FlQr9kuYOTXuuoA2SkZPyvrCF2_c6dkC/pub?gid=1633653606&single=true&output=tsv';

app.use(express.json());

// In-memory cache
let cachedRecords: any[] = [];
let lastSyncTime: string = new Date().toISOString();
let isSyncing = false;

const KEY_MAP = [
  'date_day', 'site',
  'pageviews', 'p_ex_direct', 'p_ex_google', 'p_ex_social', 'p_ex_referer',
  'p_in_home', 'p_in_folder', 'p_in_detail', 'p_in_other',
  'p_do', 'p_ov', 'p_unknown',
  'p_mobile', 'p_pc', 'p_app', 'p_tablet',
  'user', 'u_ex_direct', 'u_ex_google', 'u_ex_social', 'u_ex_referer',
  'u_in_home', 'u_in_folder', 'u_in_detail', 'u_in_other',
  'u_do', 'u_ov', 'u_unknown',
  'u_mobile', 'u_pc', 'u_app', 'u_tablet'
];

async function fetchTsvContent(url: string): Promise<string> {
  const separator = url.includes('?') ? '&' : '?';
  const fetchUrl = `${url}${separator}_t=${Date.now()}`;
  const response = await fetch(fetchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Google Sheets fetch failed with status: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function parseTSV(tsvContent: string): { records: Record<string, any>[]; headers: string[]; lines: string[] } {
  const lines = tsvContent.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { records: [], headers: [], lines: [] };

  const headers = lines[0].split('\t');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length < 5) continue;
    const obj: Record<string, any> = {};
    KEY_MAP.forEach((key, idx) => {
      if (idx === 0 || idx === 1) {
        obj[key] = parts[idx] ? parts[idx].trim() : '';
      } else {
        obj[key] = parts[idx] ? Number(parts[idx].trim()) || 0 : 0;
      }
    });
    records.push(obj);
  }
  return { records, headers, lines };
}

function updateMarkdownFile(headers: string[], lines: string[]) {
  try {
    let md = '# Dữ Liệu Thống Kê Site Ngôi Sao (Pageviews & Users)\n\n';
    md += `> **Nguồn dữ liệu gốc:** [Google Sheets Live TSV](${GOOGLE_SHEETS_TSV_URL})\n`;
    md += `> **Thời gian cập nhật tự động:** ${new Date().toISOString()}\n`;
    md += `> **Tổng số ngày ghi nhận:** ${lines.length - 1} ngày\n\n`;

    md += '## 1. Bảng Đối Chiếu Các Cặp Chỉ Số (Metric Pairs: Pageviews vs Users)\n\n';
    md += 'Mỗi chỉ số được ghép theo đúng thứ tự tương ứng giữa Pageviews và User:\n\n';
    md += '| STT | Nhóm | Tên Chỉ Số | Cột Pageview | Cột User | Mô Tả Phân Tích |\n';
    md += '|---|---|---|---|---|---|\n';
    md += '| 1 | Tổng quan | **Toàn Site** | `Pageviews` | `User` | Tổng lượt xem và tổng độc giả duy nhất |\n';
    md += '| 2 | Nguồn Ngoài | **Ex-Direct** | `P- Ex-Direct` | `U- Ex-Direct` | Truy cập trực tiếp / Bookmark |\n';
    md += '| 3 | Nguồn Ngoài | **Ex-Google** | `P- Ex-Google` | `U- Ex-Google` | Tìm kiếm tự nhiên Google |\n';
    md += '| 4 | Nguồn Ngoài | **Ex-Social** | `P- Ex-Social` | `U- Ex-Social` | Mạng xã hội (FB, Zalo, Tiktok...) |\n';
    md += '| 5 | Nguồn Ngoài | **Ex-Referer** | `P- Ex-Referer` | `U- Ex-Referer` | Liên kết giới thiệu từ trang khác |\n';
    md += '| 6 | Khu Vực Trang | **In-Home** | `P- In-Home` | `U- In-Home` | Trang chủ Ngôi Sao |\n';
    md += '| 7 | Khu Vực Trang | **In-Folder** | `P- In-Folder` | `U- In-Folder` | Trang chuyên mục bài viết |\n';
    md += '| 8 | Khu Vực Trang | **In-Detail** | `P- In-Detail` | `U- In-Detail` | Trang chi tiết bài viết (nội dung) |\n';
    md += '| 9 | Khu Vực Trang | **In-Other** | `P- In-Other` | `U- In-Other` | Các trang chuyên đề / trang khác |\n';
    md += '| 10 | Phân Loại | **DO** | `P- DO` | `U- DO` | Phân loại DO |\n';
    md += '| 11 | Phân Loại | **OV** | `P- OV` | `U- OV` | Phân loại OV |\n';
    md += '| 12 | Phân Loại | **Unknown** | `P- Unknown` | `U- Unknown` | Không xác định nguồn |\n';
    md += '| 13 | Thiết Bị | **Mobile** | `P- Mobile` | `U- Mobile` | Điện thoại di động |\n';
    md += '| 14 | Thiết Bị | **PC** | `P- PC` | `U- PC` | Máy tính để bàn / Laptop |\n';
    md += '| 15 | Thiết Bị | **App** | `P- App` | `U- App` | Ứng dụng điện thoại |\n';
    md += '| 16 | Thiết Bị | **Tablet** | `P- Tablet` | `U- Tablet` | Máy tính bảng |\n\n';

    // Day of week medians
    const DOW_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const buckets: { pv: number[]; u: number[] }[] = Array.from({ length: 7 }, () => ({ pv: [], u: [] }));

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length >= 20) {
        const dateStr = parts[0];
        const [y, m, d] = dateStr.split('-').map(Number);
        const dow = new Date(y, (m || 1) - 1, d || 1).getDay();
        const pv = Number(parts[2]) || 0;
        const u = Number(parts[18]) || 0;
        buckets[dow].pv.push(pv);
        buckets[dow].u.push(u);
      }
    }

    function calcMed(arr: number[]) {
      if (!arr.length) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
    }

    const medians = buckets.map((b, idx) => {
      const medPV = calcMed(b.pv);
      const medU = calcMed(b.u);
      const ratio = medU > 0 ? (medPV / medU).toFixed(2) : '0';
      return { name: DOW_NAMES[idx], count: b.pv.length, medPV, medU, ratio };
    });

    md += '## 2. Mức Trung Vị Chuẩn Theo Từng Thứ Trong Tuần (Baseline Medians)\n\n';
    md += '| Thứ | Số Ngày | Trung Vị Pageviews | Trung Vị User | Tỷ Lệ PV/User Trung Vị |\n';
    md += '|:---|:---:|---:|---:|---:|\n';
    medians.forEach(m => {
      md += `| **${m.name}** | ${m.count} | ${m.medPV.toLocaleString('vi-VN')} | ${m.medU.toLocaleString('vi-VN')} | ${m.ratio} |\n`;
    });
    md += '\n';

    md += '## 3. Toàn Bộ Bảng Dữ Liệu Chi Tiết Theo Ngày (Có Cột Thứ & So Sánh Trung Vị)\n\n';
    md += '| Ngày | Thứ | So Sánh Vs TV Thứ | ' + headers.slice(1).join(' | ') + ' |\n';
    md += '|:---:|:---:|:---:|' + headers.slice(1).map(() => '---').join(' | ') + ' |\n';

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      const dateStr = cols[0];
      const [y, m, d] = dateStr.split('-').map(Number);
      const dow = new Date(y, (m || 1) - 1, d || 1).getDay();
      const dowName = DOW_NAMES[dow];
      const med = medians[dow];
      const pv = Number(cols[2]) || 0;
      const u = Number(cols[18]) || 0;
      const pvDiff = med.medPV > 0 ? (((pv - med.medPV) / med.medPV) * 100).toFixed(1) : '0';
      const uDiff = med.medU > 0 ? (((u - med.medU) / med.medU) * 100).toFixed(1) : '0';
      const comp = `PV: ${Number(pvDiff) >= 0 ? '+' : ''}${pvDiff}% \\| U: ${Number(uDiff) >= 0 ? '+' : ''}${uDiff}%`;

      md += `| ${cols[0]} | **${dowName}** | ${comp} | ` + cols.slice(1).join(' | ') + ' |\n';
    }

    fs.writeFileSync(path.resolve(process.cwd(), 'DATA_NGOISAO.md'), md, 'utf8');
  } catch (err) {
    console.error('Lỗi khi ghi file DATA_NGOISAO.md:', err);
  }
}

async function syncDataFromGoogleSheets() {
  if (isSyncing) return cachedRecords;
  isSyncing = true;
  try {
    const tsvContent = await fetchTsvContent(GOOGLE_SHEETS_TSV_URL);
    const parsed = parseTSV(tsvContent);
    if (parsed.records && parsed.records.length > 0) {
      cachedRecords = parsed.records;
      lastSyncTime = new Date().toISOString();
      updateMarkdownFile(parsed.headers, parsed.lines);
      console.log(`[Sync] Đã cập nhật thành công ${cachedRecords.length} dòng dữ liệu và lưu vào DATA_NGOISAO.md`);
    }
  } catch (error) {
    console.error('[Sync] Lỗi tải dữ liệu Google Sheets:', error);
  } finally {
    isSyncing = false;
  }
  return cachedRecords;
}

// Load initial data from bundled JSON if exists
try {
  const initialPath = path.resolve(process.cwd(), 'src/data/initialData.json');
  if (fs.existsSync(initialPath)) {
    const raw = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
    cachedRecords = raw.records || [];
    lastSyncTime = raw.lastUpdated || lastSyncTime;
  }
} catch (e) {
  console.warn('Could not load initialData.json:', e);
}

// Start initial background sync
syncDataFromGoogleSheets();

// 1. API: Get Data (with auto-refresh option)
app.get('/api/data', async (req, res) => {
  const shouldRefresh = req.query.refresh === 'true';
  if (shouldRefresh || cachedRecords.length === 0) {
    await syncDataFromGoogleSheets();
  }
  const latestDate = cachedRecords.length > 0 ? cachedRecords[cachedRecords.length - 1].date_day : null;
  res.json({
    success: true,
    lastSyncTime,
    count: cachedRecords.length,
    latestDate,
    sourceUrl: GOOGLE_SHEETS_TSV_URL,
    records: cachedRecords
  });
});

// 2. API: Force Sync
app.post('/api/sync', async (req, res) => {
  try {
    const data = await syncDataFromGoogleSheets();
    const latestDate = data.length > 0 ? data[data.length - 1].date_day : null;
    res.json({
      success: true,
      lastSyncTime,
      count: data.length,
      latestDate,
      records: data,
      sourceUrl: GOOGLE_SHEETS_TSV_URL,
      message: 'Đồng bộ dữ liệu thành công và đã cập nhật DATA_NGOISAO.md'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. API: Get Markdown content
app.get('/api/markdown', (req, res) => {
  try {
    const mdPath = path.resolve(process.cwd(), 'DATA_NGOISAO.md');
    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf8');
      res.json({ success: true, markdown: content });
    } else {
      res.status(404).json({ success: false, error: 'File DATA_NGOISAO.md không tồn tại' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Ngôi Sao Dashboard đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer();
