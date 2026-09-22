import { NgoiSaoRecord } from '../types';
import { METRIC_PAIRS } from '../data/metricPairs';
import { GOOGLE_SHEETS_TSV_URL } from '../data/initialData';

const KEY_MAP: (keyof NgoiSaoRecord)[] = [
  'date_day',
  'site',
  'pageviews',
  'p_ex_direct',
  'p_ex_google',
  'p_ex_social',
  'p_ex_referer',
  'p_in_home',
  'p_in_folder',
  'p_in_detail',
  'p_in_other',
  'p_do',
  'p_ov',
  'p_unknown',
  'p_mobile',
  'p_pc',
  'p_app',
  'p_tablet',
  'user',
  'u_ex_direct',
  'u_ex_google',
  'u_ex_social',
  'u_ex_referer',
  'u_in_home',
  'u_in_folder',
  'u_in_detail',
  'u_in_other',
  'u_do',
  'u_ov',
  'u_unknown',
  'u_mobile',
  'u_pc',
  'u_app',
  'u_tablet',
];

export function parseTsvToRecords(tsvText: string): { records: NgoiSaoRecord[]; rawLines: string[]; headers: string[] } {
  const lines = tsvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { records: [], rawLines: [], headers: [] };

  const headers = lines[0].split('\t');
  const records: NgoiSaoRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length < 5) continue;
    const obj: any = {};
    KEY_MAP.forEach((k, idx) => {
      if (idx === 0 || idx === 1) {
        obj[k] = parts[idx] ? parts[idx].trim() : '';
      } else {
        obj[k] = parts[idx] ? Number(parts[idx].trim()) || 0 : 0;
      }
    });
    if (obj.date_day) {
      records.push(obj as NgoiSaoRecord);
    }
  }

  return { records, rawLines: lines, headers };
}

export function generateMarkdownContent(records: NgoiSaoRecord[], lastSyncIso?: string): string {
  const syncTime = lastSyncIso ? new Date(lastSyncIso).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
  
  let md = '# Dữ Liệu Thống Kê Site Ngôi Sao (Pageviews & Users)\n\n';
  md += `> **Nguồn dữ liệu gốc:** [Google Sheets Live TSV](${GOOGLE_SHEETS_TSV_URL})\n`;
  md += `> **Thời gian đồng bộ:** ${syncTime}\n`;
  md += `> **Tổng số ngày ghi nhận:** ${records.length} ngày\n\n`;

  md += '## 1. Danh Sách 16 Cặp Chỉ Số Được Ghép Nối\n\n';
  md += '| STT | Cặp Chỉ Số | Pageview (P-) | User (U-) | Nhóm Phân Loại |\n';
  md += '|:---:|:---|:---|:---|:---|\n';
  METRIC_PAIRS.forEach((p, idx) => {
    md += `| ${idx + 1} | **${p.name}** | \`${p.pvHeader}\` | \`${p.uHeader}\` | ${p.categoryLabel} |\n`;
  });

  // Section: Day-of-week median benchmarks
  const dowBuckets: NgoiSaoRecord[][] = Array.from({ length: 7 }, () => []);
  const DOW_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  records.forEach(r => {
    const [y, m, d] = r.date_day.split('-').map(Number);
    const dow = new Date(y, (m || 1) - 1, d || 1).getDay();
    dowBuckets[dow].push(r);
  });

  function getMed(arr: number[]) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }

  const dowMedians = dowBuckets.map((bucket, idx) => {
    const medPV = getMed(bucket.map(r => r.pageviews));
    const medUser = getMed(bucket.map(r => r.user));
    const ratio = medUser > 0 ? (medPV / medUser).toFixed(2) : '0';
    return { name: DOW_NAMES[idx], count: bucket.length, medPV, medUser, ratio };
  });

  md += '\n## 2. Mức Trung Vị Chuẩn Theo Thứ Trong Tuần (Baseline Medians)\n\n';
  md += '| Thứ | Số Ngày Ghi Nhận | Trung Vị Pageviews | Trung Vị User | Tỷ Lệ PV/User Trung Vị |\n';
  md += '|:---|:---:|---:|---:|---:|\n';
  dowMedians.forEach(dm => {
    md += `| **${dm.name}** | ${dm.count} | ${dm.medPV.toLocaleString('vi-VN')} | ${dm.medUser.toLocaleString('vi-VN')} | ${dm.ratio} |\n`;
  });

  md += '\n## 3. Bảng Dữ Liệu Chi Tiết Theo Ngày (Có Cột Thứ & So Sánh Trung Vị)\n\n';

  // Table header
  md += '| Ngày | Thứ | So Sánh Vs TV Thứ | Site | Pageviews | User | Tỷ Lệ PV/U | P- Ex-Direct | U- Ex-Direct | P- Ex-Google | U- Ex-Google | P- Mobile | U- Mobile |\n';
  md += '|:---:|:---:|:---:|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';

  // Write records in descending date order
  const descRecords = [...records].reverse();
  descRecords.forEach((r) => {
    const [y, m, d] = r.date_day.split('-').map(Number);
    const dow = new Date(y, (m || 1) - 1, d || 1).getDay();
    const dowName = DOW_NAMES[dow];
    const medInfo = dowMedians[dow];
    const pvDiff = medInfo.medPV > 0 ? (((r.pageviews - medInfo.medPV) / medInfo.medPV) * 100).toFixed(1) : '0';
    const uDiff = medInfo.medUser > 0 ? (((r.user - medInfo.medUser) / medInfo.medUser) * 100).toFixed(1) : '0';
    const compText = `PV: ${Number(pvDiff) >= 0 ? '+' : ''}${pvDiff}% \\| U: ${Number(uDiff) >= 0 ? '+' : ''}${uDiff}%`;
    const ratio = r.user > 0 ? (r.pageviews / r.user).toFixed(2) : '0';

    md += `| ${r.date_day} | **${dowName}** | ${compText} | ${r.site} | ${r.pageviews.toLocaleString('vi-VN')} | ${r.user.toLocaleString('vi-VN')} | ${ratio} | ${r.p_ex_direct.toLocaleString('vi-VN')} | ${r.u_ex_direct.toLocaleString('vi-VN')} | ${r.p_ex_google.toLocaleString('vi-VN')} | ${r.u_ex_google.toLocaleString('vi-VN')} | ${r.p_mobile.toLocaleString('vi-VN')} | ${r.u_mobile.toLocaleString('vi-VN')} |\n`;
  });

  md += '\n---\n*Dữ liệu tự động đồng bộ từ link Google Sheets và lưu vào DATA_NGOISAO.md*.\n';
  return md;
}

export async function fetchLiveGoogleSheetsData(): Promise<{ records: NgoiSaoRecord[]; lastSync: string }> {
  const res = await fetch(GOOGLE_SHEETS_TSV_URL, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!res.ok) {
    throw new Error(`Google Sheets fetch failed with status: ${res.status}`);
  }

  const text = await res.text();
  const { records } = parseTsvToRecords(text);
  if (records.length === 0) {
    throw new Error('No records found in Google Sheets TSV');
  }

  return {
    records,
    lastSync: new Date().toISOString(),
  };
}
