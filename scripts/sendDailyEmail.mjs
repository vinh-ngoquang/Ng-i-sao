import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const GOOGLE_SHEETS_TSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQksM6-RzffQI5Va9Bx6X9oiii5Hd_BYZDjaRSNnHOuhke-FlQr9kuYOTXuuoA2SkZPyvrCF2_c6dkC/pub?gid=1633653606&single=true&output=tsv';

const KEY_MAP = [
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

const METRIC_PAIRS = [
  { id: 'total', shortLabel: 'Total', category: 'total', categoryLabel: 'Tổng quan', pvKey: 'pageviews', uKey: 'user', color: '#e11d48' },
  { id: 'ex_direct', shortLabel: 'Ex-Direct', category: 'external', categoryLabel: 'Nguồn Ngoài', pvKey: 'p_ex_direct', uKey: 'u_ex_direct', color: '#2563eb' },
  { id: 'ex_google', shortLabel: 'Ex-Google', category: 'external', categoryLabel: 'Nguồn Ngoài', pvKey: 'p_ex_google', uKey: 'u_ex_google', color: '#059669' },
  { id: 'ex_social', shortLabel: 'Ex-Social', category: 'external', categoryLabel: 'Nguồn Ngoài', pvKey: 'p_ex_social', uKey: 'u_ex_social', color: '#7c3aed' },
  { id: 'ex_referer', shortLabel: 'Ex-Referer', category: 'external', categoryLabel: 'Nguồn Ngoài', pvKey: 'p_ex_referer', uKey: 'u_ex_referer', color: '#d97706' },
  { id: 'in_home', shortLabel: 'In-Home', category: 'internal', categoryLabel: 'Khu Vực Trang', pvKey: 'p_in_home', uKey: 'u_in_home', color: '#0284c7' },
  { id: 'in_folder', shortLabel: 'In-Folder', category: 'internal', categoryLabel: 'Khu Vực Trang', pvKey: 'p_in_folder', uKey: 'u_in_folder', color: '#0891b2' },
  { id: 'in_detail', shortLabel: 'In-Detail', category: 'internal', categoryLabel: 'Khu Vực Trang', pvKey: 'p_in_detail', uKey: 'u_in_detail', color: '#db2777' },
  { id: 'in_other', shortLabel: 'In-Other', category: 'internal', categoryLabel: 'Khu Vực Trang', pvKey: 'p_in_other', uKey: 'u_in_other', color: '#64748b' },
  { id: 'do', shortLabel: 'DO', category: 'distribution', categoryLabel: 'Phân Loại Lưu Lượng', pvKey: 'p_do', uKey: 'u_do', color: '#ea580c' },
  { id: 'ov', shortLabel: 'OV', category: 'distribution', categoryLabel: 'Phân Loại Lưu Lượng', pvKey: 'p_ov', uKey: 'u_ov', color: '#4f46e5' },
  { id: 'unknown', shortLabel: 'Unknown', category: 'distribution', categoryLabel: 'Phân Loại Lưu Lượng', pvKey: 'p_unknown', uKey: 'u_unknown', color: '#94a3b8' },
  { id: 'mobile', shortLabel: 'Mobile', category: 'device', categoryLabel: 'Thiết Bị', pvKey: 'p_mobile', uKey: 'u_mobile', color: '#10b981' },
  { id: 'pc', shortLabel: 'PC', category: 'device', categoryLabel: 'Thiết Bị', pvKey: 'p_pc', uKey: 'u_pc', color: '#3b82f6' },
  { id: 'app', shortLabel: 'App', category: 'device', categoryLabel: 'Thiết Bị', pvKey: 'p_app', uKey: 'u_app', color: '#8b5cf6' },
  { id: 'tablet', shortLabel: 'Tablet', category: 'device', categoryLabel: 'Thiết Bị', pvKey: 'p_tablet', uKey: 'u_tablet', color: '#f59e0b' },
];

function parseTsvToRecords(tsvText) {
  const lines = tsvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : ';';
  const isHeader = !/^\d{4}-\d{2}-\d{2}/.test(firstLine);
  const startIndex = isHeader ? 1 : 0;
  const records = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 3) continue;
    const obj = {};
    KEY_MAP.forEach((k, idx) => {
      if (idx === 0 || idx === 1) {
        obj[k] = parts[idx] ? parts[idx].trim() : idx === 1 ? 'Ngôi sao' : '';
      } else {
        const raw = parts[idx] ? parts[idx].replace(/,/g, '') : '0';
        obj[k] = Number(raw) || 0;
      }
    });
    if (obj.date_day && /^\d{4}-\d{2}-\d{2}/.test(obj.date_day)) {
      records.push(obj);
    }
  }
  return records;
}

async function fetchLiveGoogleSheets() {
  try {
    const url = `${GOOGLE_SHEETS_TSV_URL}&_t=${Date.now()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    if (!response.ok) {
      throw new Error(`Google Sheets trả về HTTP ${response.status}`);
    }
    const tsvText = await response.text();
    const records = parseTsvToRecords(tsvText);
    if (records.length > 0) return records;
  } catch (err) {
    console.warn('⚠️ Không tải được trực tiếp từ Google Sheets, dùng dữ liệu dự phòng initialData.json:', err.message);
  }

  const jsonPath = path.resolve(process.cwd(), 'src/data/initialData.json');
  if (fs.existsSync(jsonPath)) {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return Array.isArray(raw) ? raw : raw.records || [];
  }
  return [];
}

function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val));
}

function formatRatio(val) {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toFixed(2);
}

function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDayOfWeekInfo(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const dayIndex = dt.getDay();
  const names = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const shortNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return {
    dayIndex,
    name: names[dayIndex] || '',
    shortName: shortNames[dayIndex] || '',
  };
}

function getMedian(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeAllDowMediansForSite(siteRecords) {
  const map = new Map();
  for (let d = 0; d < 7; d++) {
    const sameDow = siteRecords.filter((r) => getDayOfWeekInfo(r.date_day).dayIndex === d);
    const mediansByMetric = {};
    METRIC_PAIRS.forEach((pair) => {
      mediansByMetric[pair.pvKey] = Math.round(getMedian(sameDow.map((r) => Number(r[pair.pvKey]) || 0)));
      mediansByMetric[pair.uKey] = Math.round(getMedian(sameDow.map((r) => Number(r[pair.uKey]) || 0)));
      mediansByMetric[`${pair.id}_ratio`] = getMedian(
        sameDow.map((r) => {
          const pv = Number(r[pair.pvKey]) || 0;
          const u = Number(r[pair.uKey]) || 0;
          return u > 0 ? pv / u : 0;
        })
      );
    });
    map.set(d, { dayIndex: d, count: sameDow.length, mediansByMetric });
  }
  return map;
}

function computeStreakVsDowMedian(siteRecords, dowMediansMap, getValue, getMedianValue) {
  if (siteRecords.length === 0) return { direction: 'flat', days: 0 };

  const lastRec = siteRecords[siteRecords.length - 1];
  const lastDow = getDayOfWeekInfo(lastRec.date_day).dayIndex;
  const lastMedObj = dowMediansMap.get(lastDow);
  if (!lastMedObj) return { direction: 'flat', days: 0 };

  const firstDiff = getValue(lastRec) - getMedianValue(lastMedObj);
  if (Math.abs(firstDiff) < 1e-9) {
    return { direction: 'flat', days: 1 };
  }

  const targetDir = firstDiff > 0 ? 'up' : 'down';
  let days = 0;

  for (let i = siteRecords.length - 1; i >= 0; i--) {
    const rec = siteRecords[i];
    const dow = getDayOfWeekInfo(rec.date_day).dayIndex;
    const medObj = dowMediansMap.get(dow);
    if (!medObj) break;

    const diff = getValue(rec) - getMedianValue(medObj);
    if (targetDir === 'down' && diff < -1e-9) {
      days++;
    } else if (targetDir === 'up' && diff > 1e-9) {
      days++;
    } else {
      break;
    }
  }

  return { direction: targetDir, days };
}

function renderStreakBadge(streak) {
  if (streak.direction === 'down') {
    const isLongDrop = streak.days >= 3;
    const style = isLongDrop
      ? 'background:#ffe4e6;color:#be123c;border:1px solid #fda4af;padding:1px 4px;border-radius:3px;font:700 10px sans-serif;display:inline-block;margin-top:2px'
      : 'color:#be123c;font:700 10px sans-serif;display:inline-block;margin-top:2px';
    return `<div style="${style}">▼ Giảm ${streak.days} ngày LT</div>`;
  }
  if (streak.direction === 'up') {
    return `<div style="color:#047857;font:600 10px sans-serif;margin-top:2px">▲ Tăng ${streak.days} ngày LT</div>`;
  }
  return `<div style="color:#64748b;font:400 10px sans-serif;margin-top:2px">— Ngang TV</div>`;
}

function getInlineBadgeStyle(diffPct) {
  if (isNaN(diffPct) || !isFinite(diffPct)) {
    return { bg: '#f1f5f9', text: '#64748b', cellBg: '#ffffff', label: 'Ổn định' };
  }
  if (diffPct >= 20) {
    return { bg: '#059669', text: '#ffffff', cellBg: '#ecfdf5', label: 'Tăng bất thường' };
  }
  if (diffPct >= 5) {
    return { bg: '#d1fae5', text: '#065f46', cellBg: '#ffffff', label: 'Tăng nhẹ' };
  }
  if (diffPct > -5) {
    return { bg: '#f1f5f9', text: '#64748b', cellBg: '#ffffff', label: 'Ổn định' };
  }
  if (diffPct > -20) {
    return { bg: '#ffe4e6', text: '#9f1239', cellBg: '#ffffff', label: 'Giảm nhẹ' };
  }
  return { bg: '#e11d48', text: '#ffffff', cellBg: '#fff1f2', label: 'Giảm bất thường' };
}

function getSiteBrandColors(siteName) {
  const lower = siteName.toLowerCase();
  if (lower === 'vnexpress') {
    return { primary: '#b91c1c', lightBg: '#fef2f2', border: '#fecaca', shortCode: 'VNE' };
  }
  if (lower === 'english') {
    return { primary: '#1d4ed8', lightBg: '#eff6ff', border: '#bfdbfe', shortCode: 'ENG' };
  }
  return { primary: '#e11d48', lightBg: '#fff1f2', border: '#fecdd3', shortCode: 'NS' };
}

function generateDailyEmailReport(records, requestedDate) {
  const allDates = Array.from(new Set(records.map((r) => r.date_day))).sort();
  const targetDate = requestedDate && allDates.includes(requestedDate) ? requestedDate : allDates[allDates.length - 1];
  const formattedDate = formatDateVN(targetDate);
  const dowInfo = getDayOfWeekInfo(targetDate);

  const preferredOrder = ['Ngôi sao', 'VnExpress', 'English'];
  const existingSites = Array.from(new Set(records.map((r) => (r.site || 'Ngôi sao').trim())));
  const orderedSites = [
    ...preferredOrder.filter((s) => existingSites.some((es) => es.toLowerCase() === s.toLowerCase())),
    ...existingSites.filter((es) => !preferredOrder.some((s) => s.toLowerCase() === es.toLowerCase())),
  ];

  let siteSectionsHtml = '';
  const plainTextLines = [
    `BÁO CÁO DỮ LIỆU HÀNG NGÀY — ${dowInfo.name.toUpperCase()}, ${formattedDate}`,
    `So sánh với Trung vị chuẩn theo ${dowInfo.name} tính cố định từ đầu năm`,
    '====================================================================',
    '',
  ];

  orderedSites.forEach((siteName) => {
    const siteRecords = records
      .filter((r) => (r.site || 'Ngôi sao').trim().toLowerCase() === siteName.toLowerCase() && r.date_day <= targetDate)
      .sort((a, b) => a.date_day.localeCompare(b.date_day));

    const dayRecord = siteRecords.find((r) => r.date_day === targetDate) || siteRecords[siteRecords.length - 1];
    if (!dayRecord) return;

    const recordDow = getDayOfWeekInfo(dayRecord.date_day);
    const dowMediansMap = computeAllDowMediansForSite(siteRecords);
    const medianData = dowMediansMap.get(recordDow.dayIndex);
    const brand = getSiteBrandColors(siteName);

    let spikeCount = 0;
    let dropCount = 0;

    const pairMetrics = METRIC_PAIRS.map((pair) => {
      const pv = Number(dayRecord[pair.pvKey]) || 0;
      const u = Number(dayRecord[pair.uKey]) || 0;
      const ratio = u > 0 ? pv / u : 0;

      const pvMed = medianData.mediansByMetric[pair.pvKey] || 0;
      const uMed = medianData.mediansByMetric[pair.uKey] || 0;
      const rMed = medianData.mediansByMetric[`${pair.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);

      const pvDiffPct = pvMed > 0 ? ((pv - pvMed) / pvMed) * 100 : 0;
      const uDiffPct = uMed > 0 ? ((u - uMed) / uMed) * 100 : 0;
      const rDiffPct = rMed > 0 ? ((ratio - rMed) / rMed) * 100 : 0;

      const pvDiffAbs = pv - pvMed;
      const uDiffAbs = u - uMed;
      const rDiffAbs = ratio - rMed;

      const pvStreak = computeStreakVsDowMedian(
        siteRecords,
        dowMediansMap,
        (r) => Number(r[pair.pvKey]) || 0,
        (m) => m.mediansByMetric[pair.pvKey] || 0
      );
      const uStreak = computeStreakVsDowMedian(
        siteRecords,
        dowMediansMap,
        (r) => Number(r[pair.uKey]) || 0,
        (m) => m.mediansByMetric[pair.uKey] || 0
      );
      const rStreak = computeStreakVsDowMedian(
        siteRecords,
        dowMediansMap,
        (r) => {
          const rPv = Number(r[pair.pvKey]) || 0;
          const rU = Number(r[pair.uKey]) || 0;
          return rU > 0 ? rPv / rU : 0;
        },
        (m) => {
          const mPv = m.mediansByMetric[pair.pvKey] || 0;
          const mU = m.mediansByMetric[pair.uKey] || 0;
          return m.mediansByMetric[`${pair.id}_ratio`] || (mU > 0 ? mPv / mU : 0);
        }
      );

      return {
        pair,
        pv,
        u,
        ratio,
        pvMed,
        uMed,
        rMed,
        pvDiffPct,
        uDiffPct,
        rDiffPct,
        pvDiffAbs,
        uDiffAbs,
        rDiffAbs,
        pvStreak,
        uStreak,
        rStreak,
      };
    });

    let rowsHtml = '';
    let currentCategory = '';
    const notableDropStreaks = [];

    pairMetrics.forEach((item, idx) => {
      const {
        pair,
        pv,
        u,
        ratio,
        pvMed,
        uMed,
        rMed,
        pvDiffPct,
        uDiffPct,
        rDiffPct,
        pvDiffAbs,
        uDiffAbs,
        rDiffAbs,
        pvStreak,
        uStreak,
        rStreak,
      } = item;

      if (pvStreak.direction === 'down' && pvStreak.days >= 3) {
        notableDropStreaks.push(`${pair.shortLabel} (PV giảm ${pvStreak.days} ngày LT)`);
      }
      if (uStreak.direction === 'down' && uStreak.days >= 3) {
        notableDropStreaks.push(`${pair.shortLabel} (User giảm ${uStreak.days} ngày LT)`);
      }

      if (pair.category !== currentCategory) {
        currentCategory = pair.category;
        const groupItems = pairMetrics.filter((x) => x.pair.category === currentCategory);
        const pvDrops = groupItems.filter((x) => x.pvStreak.direction === 'down');
        const uDrops = groupItems.filter((x) => x.uStreak.direction === 'down');

        const dropDetails = groupItems
          .filter((x) => x.pvStreak.direction === 'down' || x.uStreak.direction === 'down')
          .map((x) => {
            const parts = [];
            if (x.pvStreak.direction === 'down') parts.push(`PV -${x.pvStreak.days}d`);
            if (x.uStreak.direction === 'down') parts.push(`U -${x.uStreak.days}d`);
            return `${x.pair.shortLabel} (${parts.join(', ')})`;
          });

        const groupSummaryText =
          dropDetails.length > 0
            ? `<span style="color:#be123c">▼ Đang giảm so với TV Thứ (${pvDrops.length}/${groupItems.length} PV, ${uDrops.length}/${groupItems.length} User): <strong>${dropDetails.join(' • ')}</strong></span>`
            : `<span style="color:#047857">▲ Tất cả chỉ số trong nhóm đều tăng/ngang so với TV Thứ</span>`;

        rowsHtml +=
          `<tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;border-bottom:1px solid #cbd5e1">` +
          `<td colspan="7" style="padding:6px 9px;font:700 11px sans-serif;color:#1e293b">` +
          `<span style="text-transform:uppercase;letter-spacing:0.4px;margin-right:10px">■ Nhóm: ${pair.categoryLabel}</span>` +
          `<span style="font:600 11px sans-serif">${groupSummaryText}</span>` +
          `</td></tr>`;
      }

      if (pvDiffPct >= 20) spikeCount++;
      else if (pvDiffPct <= -20) dropCount++;
      if (uDiffPct >= 20) spikeCount++;
      else if (uDiffPct <= -20) dropCount++;
      if (rDiffPct >= 20) spikeCount++;
      else if (rDiffPct <= -20) dropCount++;

      const pvStyle = getInlineBadgeStyle(pvDiffPct);
      const uStyle = getInlineBadgeStyle(uDiffPct);
      const rStyle = getInlineBadgeStyle(rDiffPct);

      const pvPctStr = `${pvDiffPct >= 0 ? '+' : ''}${pvDiffPct.toFixed(1)}%`;
      const uPctStr = `${uDiffPct >= 0 ? '+' : ''}${uDiffPct.toFixed(1)}%`;
      const rPctStr = `${rDiffPct >= 0 ? '+' : ''}${rDiffPct.toFixed(1)}%`;

      const pvAbsStr = `${pvDiffAbs >= 0 ? '+' : ''}${formatNumber(pvDiffAbs)}`;
      const uAbsStr = `${uDiffAbs >= 0 ? '+' : ''}${formatNumber(uDiffAbs)}`;
      const rAbsStr = `${rDiffAbs >= 0 ? '+' : ''}${rDiffAbs.toFixed(2)}`;

      const isTotalRow = pair.id === 'total';
      const rowBg = isTotalRow ? '#f8fafc' : idx % 2 === 0 ? '#ffffff' : '#fcfcfd';

      const pvBg = pvStyle.cellBg !== '#ffffff' ? `background:${pvStyle.cellBg};` : '';
      const uBg = uStyle.cellBg !== '#ffffff' ? `background:${uStyle.cellBg};` : '';
      const rBg = rStyle.cellBg !== '#ffffff' ? `background:${rStyle.cellBg};` : '';

      rowsHtml +=
        `<tr style="background:${rowBg};border-bottom:1px solid #e2e8f0">` +
        `<td nowrap style="padding:6px 8px;font:${isTotalRow ? '700' : '600'} 12px sans-serif;color:#0f172a;border-right:1px solid #e2e8f0">` +
        `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${pair.color};margin-right:5px"></span>${pair.shortLabel}` +
        `<div style="font:400 10px sans-serif;color:#64748b;margin-left:12px">${pair.categoryLabel}</div>` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${pvBg}font:700 12px monospace;color:#0f172a">` +
        `${formatNumber(pv)}<div style="font:400 10px sans-serif;color:#64748b">TV ${recordDow.shortName}: ${formatNumber(pvMed)}</div>` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${pvBg}border-right:1px solid #e2e8f0">` +
        `<b style="padding:1px 5px;border-radius:4px;background:${pvStyle.bg};color:${pvStyle.text};font:700 11px monospace">${pvPctStr}</b>` +
        `<div style="font:600 10px monospace;color:${pvDiffAbs >= 0 ? '#047857' : '#be123c'};margin-top:2px">${pvAbsStr}</div>` +
        `${renderStreakBadge(pvStreak)}` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${uBg}font:700 12px monospace;color:#0f172a">` +
        `${formatNumber(u)}<div style="font:400 10px sans-serif;color:#64748b">TV ${recordDow.shortName}: ${formatNumber(uMed)}</div>` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${uBg}border-right:1px solid #e2e8f0">` +
        `<b style="padding:1px 5px;border-radius:4px;background:${uStyle.bg};color:${uStyle.text};font:700 11px monospace">${uPctStr}</b>` +
        `<div style="font:600 10px monospace;color:${uDiffAbs >= 0 ? '#047857' : '#be123c'};margin-top:2px">${uAbsStr}</div>` +
        `${renderStreakBadge(uStreak)}` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${rBg}font:700 12px monospace;color:#0f172a">` +
        `${formatRatio(ratio)}<div style="font:400 10px sans-serif;color:#64748b">TV ${recordDow.shortName}: ${formatRatio(rMed)}</div>` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${rBg}">` +
        `<b style="padding:1px 5px;border-radius:4px;background:${rStyle.bg};color:${rStyle.text};font:700 11px monospace">${rPctStr}</b>` +
        `<div style="font:600 10px monospace;color:${rDiffAbs >= 0 ? '#047857' : '#be123c'};margin-top:2px">${rAbsStr}</div>` +
        `${renderStreakBadge(rStreak)}` +
        `</td>` +
        `</tr>`;
    });

    const totalPV = Number(dayRecord.pageviews) || 0;
    const totalUser = Number(dayRecord.user) || 0;
    const totalRatio = totalUser > 0 ? totalPV / totalUser : 0;

    plainTextLines.push(`■ Site: ${siteName} (${formatDateVN(dayRecord.date_day)})`);
    plainTextLines.push(`  - Tổng Pageviews: ${formatNumber(totalPV)} | Tổng Users: ${formatNumber(totalUser)} | PV/User: ${formatRatio(totalRatio)}`);
    if (notableDropStreaks.length > 0) {
      plainTextLines.push(`  - Cảnh báo giảm liên tục (≥3 ngày vs TV Thứ): ${notableDropStreaks.join(', ')}`);
    }
    plainTextLines.push('');

    const dropAlertHtml =
      notableDropStreaks.length > 0
        ? `<div style="margin-top:6px;padding:6px 10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:6px;font-size:11px;color:#9f1239">` +
          `<strong>⚠️ Cảnh báo giảm liên tục (≥3 ngày so với TV Thứ):</strong> ${notableDropStreaks.join(' • ')}` +
          `</div>`
        : '';

    siteSectionsHtml += `
      <div style="margin-bottom:24px;background:#fff;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden">
        <div style="background:${brand.lightBg};border-bottom:2px solid ${brand.border};padding:12px 16px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="display:inline-block;padding:3px 9px;border-radius:6px;background:${brand.primary};color:#fff;font-size:12px;font-weight:800;margin-right:8px">${brand.shortCode}</span>
                <span style="font-size:16px;font-weight:800;color:#0f172a">Site: ${siteName}</span>
                <span style="font-size:12px;color:#475569;margin-left:8px">• Ngày <strong>${formatDateVN(dayRecord.date_day)}</strong> (${recordDow.name})</span>
              </td>
              <td align="right" style="font-size:11px;color:#475569">
                Benchmark cố định từ đầu năm: <strong>${siteRecords.length} ngày</strong> (${medianData.count} ngày ${recordDow.name})
              </td>
            </tr>
          </table>
          <div style="margin-top:8px;padding-top:8px;border-top:1px dashed ${brand.border};font-size:12px;color:#334155">
            <span style="margin-right:14px">Tổng PV: <strong style="color:#e11d48;font-family:monospace">${formatNumber(totalPV)}</strong></span>
            <span style="margin-right:14px">Tổng User: <strong style="color:#2563eb;font-family:monospace">${formatNumber(totalUser)}</strong></span>
            <span style="margin-right:14px">PV/User: <strong style="color:#059669;font-family:monospace">${formatRatio(totalRatio)}</strong></span>
            <span style="margin-right:12px;color:#047857">▲ Tăng ≥+20%: <strong>${spikeCount}</strong></span>
            <span style="color:#be123c">▼ Giảm ≤-20%: <strong>${dropCount}</strong></span>
          </div>
          ${dropAlertHtml}
        </div>
        <div style="overflow-x:auto">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">
            <thead>
              <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;font-size:11px;font-weight:700;color:#334155;text-transform:uppercase">
                <th rowspan="2" align="left" style="padding:7px 8px;border-right:1px solid #cbd5e1">Cặp Chỉ Số</th>
                <th colspan="2" align="center" style="padding:5px 8px;color:#be123c;border-right:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1">Pageviews (PV)</th>
                <th colspan="2" align="center" style="padding:5px 8px;color:#1d4ed8;border-right:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1">Users (Độc Giả)</th>
                <th colspan="2" align="center" style="padding:5px 8px;color:#047857;border-bottom:1px solid #cbd5e1">Tỷ Lệ PV / User</th>
              </tr>
              <tr style="background:#f8fafc;border-bottom:2px solid #cbd5e1;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">
                <th align="right" style="padding:4px 8px">Số Thực & TV</th>
                <th align="right" style="padding:4px 8px;border-right:1px solid #cbd5e1">Lệch & Chuỗi Ngày</th>
                <th align="right" style="padding:4px 8px">Số Thực & TV</th>
                <th align="right" style="padding:4px 8px;border-right:1px solid #cbd5e1">Lệch & Chuỗi Ngày</th>
                <th align="right" style="padding:4px 8px">Số Thực & TV</th>
                <th align="right" style="padding:4px 8px">Lệch & Chuỗi Ngày</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>`;
  });

  const subject = `[Báo Cáo Hàng Ngày] Pageviews & Users (${orderedSites.join(' • ')}) - Ngày ${formattedDate} (${dowInfo.name})`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:960px;margin:0 auto;padding:16px 10px">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:16px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#fda4af;font-weight:700;margin-bottom:4px">BÁO CÁO TỰ ĐỘNG HÀNG NGÀY • GOOGLE SHEETS LIVE</div>
      <h1 style="margin:0 0 6px 0;font-size:19px;font-weight:800;color:#fff">Thống Kê Chi Tiết Pageviews & Users — Ngày ${formattedDate} (${dowInfo.name})</h1>
      <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.5">Dữ liệu ngày mới nhất của 3 site (<strong>${orderedSites.join(', ')}</strong>) đối chiếu với <strong>Mức Trung Vị Chuẩn Theo ${dowInfo.name}</strong> (tính cố định từ đầu năm 01/01/2026). Bao gồm Số thực tế, % Lệch, Số lệch tuyệt đối và <strong>Chuỗi ngày tăng/giảm liên tiếp (LT) so với Trung vị Thứ</strong>.</p>
    </div>
    <div style="background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:9px 14px;margin-bottom:16px;font-size:11px;color:#475569">
      <strong style="color:#0f172a;margin-right:8px">Chú giải độ lệch & chuỗi ngày vs Trung vị Thứ:</strong>
      <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#059669;color:#fff;font-weight:700;margin-right:6px">≥ +20% Tăng bất thường</span>
      <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#d1fae5;color:#065f46;font-weight:600;margin-right:6px">+5% ~ +20% Tăng nhẹ</span>
      <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:#64748b;margin-right:6px">±5% Ổn định</span>
      <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#ffe4e6;color:#9f1239;font-weight:600;margin-right:6px">-5% ~ -20% Giảm nhẹ</span>
      <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#e11d48;color:#fff;font-weight:700;margin-right:6px">≤ -20% Giảm bất thường</span>
      <span style="display:inline-block;padding:1px 5px;border-radius:3px;background:#ffe4e6;color:#be123c;border:1px solid #fda4af;font-weight:700">▼ Giảm X ngày LT: Giảm liên tiếp X ngày so với TV Thứ</span>
    </div>
    ${siteSectionsHtml}
    <div style="text-align:center;font-size:11px;color:#64748b;padding:10px 0;border-top:1px solid #cbd5e1">
      Email được tạo tự động từ hệ thống <strong>Dashboard Thống Kê Pageviews & Users</strong> • Cập nhật lúc ${new Date().toLocaleString('vi-VN')}
    </div>
  </div>
</body>
</html>`.replace(/\n\s+/g, '\n').trim();

  return {
    targetDate,
    formattedDate,
    subject,
    html,
    text: plainTextLines.join('\n'),
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const emailTo = (process.env.EMAIL_TO || smtpUser).trim();
  const targetDate = (process.env.REPORT_DATE || '').trim() || undefined;

  if (!isDryRun && (!smtpUser || !smtpPass)) {
    console.error('❌ Thiếu biến môi trường SMTP_USER hoặc SMTP_PASS trong GitHub Secrets.');
    process.exit(1);
  }

  console.log('🔄 Đang tải dữ liệu trực tiếp từ Google Sheets...');
  const records = await fetchLiveGoogleSheets();
  console.log(`✅ Đã tải ${records.length} dòng dữ liệu.`);

  if (records.length === 0) {
    console.error('❌ Không có dữ liệu để tạo báo cáo.');
    process.exit(1);
  }

  const report = generateDailyEmailReport(records, targetDate);
  console.log(`📊 Đã tạo báo cáo: ${report.subject} (Độ dài HTML: ${report.html.length} ký tự)`);

  if (isDryRun) {
    console.log('✅ Dry-run hoàn tất thành công!');
    return;
  }

  console.log(`📧 Đang gửi báo cáo ngày ${report.formattedDate} (${report.targetDate}) tới: ${emailTo}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: `"Dashboard Pageviews & Users" <${smtpUser}>`,
    to: emailTo,
    subject: report.subject,
    text: report.text,
    html: report.html,
  });

  console.log(`🎉 Đã gửi email thành công! Message ID: ${info.messageId}`);
}

main().catch((err) => {
  console.error('❌ Lỗi khi gửi email báo cáo hàng ngày:', err);
  process.exit(1);
});
