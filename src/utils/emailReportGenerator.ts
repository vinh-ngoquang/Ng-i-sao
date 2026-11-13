import { NgoiSaoRecord } from '../types';
import { METRIC_PAIRS } from '../data/metricPairs';
import { computeDayOfWeekMedians, getDayOfWeekInfo, DayOfWeekMedian } from './dataProcessing';
import { formatDateVN, formatNumber, formatRatio } from './formatters';

export interface StreakInfo {
  direction: 'up' | 'down' | 'flat';
  days: number;
}

export interface SiteDailyReportSummary {
  siteName: string;
  date: string;
  dowName: string;
  baselineDays: number;
  dowSampleCount: number;
  totalPV: number;
  totalUser: number;
  totalRatio: number;
  spikeCount: number;
  dropCount: number;
}

export interface GeneratedEmailReport {
  targetDate: string;
  formattedDate: string;
  dowName: string;
  subject: string;
  html: string;
  siteSummaries: SiteDailyReportSummary[];
}

function getInlineBadgeStyle(diffPct: number): {
  bg: string;
  text: string;
  cellBg: string;
  label: string;
} {
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

function getSiteBrandColors(siteName: string) {
  const lower = siteName.toLowerCase();
  if (lower === 'vnexpress') {
    return {
      primary: '#b91c1c',
      lightBg: '#fef2f2',
      border: '#fecaca',
      badgeText: '#991b1b',
      shortCode: 'VNE',
    };
  }
  if (lower === 'english') {
    return {
      primary: '#1d4ed8',
      lightBg: '#eff6ff',
      border: '#bfdbfe',
      badgeText: '#1e40af',
      shortCode: 'ENG',
    };
  }
  return {
    primary: '#e11d48',
    lightBg: '#fff1f2',
    border: '#fecdd3',
    badgeText: '#9f1239',
    shortCode: 'NS',
  };
}

/**
 * Tính số ngày tăng/giảm liên tiếp (so với Trung vị cùng Thứ) tính ngược từ ngày báo cáo
 */
function computeStreakVsDowMedian(
  siteRecords: NgoiSaoRecord[],
  dowMediansMap: Map<number, DayOfWeekMedian>,
  getValue: (r: NgoiSaoRecord) => number,
  getMedianValue: (m: DayOfWeekMedian) => number
): StreakInfo {
  if (siteRecords.length === 0) return { direction: 'flat', days: 0 };

  const lastRec = siteRecords[siteRecords.length - 1];
  const lastDow = getDayOfWeekInfo(lastRec.date_day).dayIndex;
  const lastMedObj = dowMediansMap.get(lastDow);
  if (!lastMedObj) return { direction: 'flat', days: 0 };

  const firstDiff = getValue(lastRec) - getMedianValue(lastMedObj);
  if (Math.abs(firstDiff) < 1e-9) {
    return { direction: 'flat', days: 1 };
  }

  const targetDir: 'up' | 'down' = firstDiff > 0 ? 'up' : 'down';
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

function renderStreakBadge(streak: StreakInfo): string {
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

export function generateDailyEmailReport(
  records: NgoiSaoRecord[],
  requestedDate?: string
): GeneratedEmailReport {
  if (!records || records.length === 0) {
    return {
      targetDate: '',
      formattedDate: '',
      dowName: '',
      subject: '[Báo Cáo Hàng Ngày] Không có dữ liệu',
      html: '<p>Không có dữ liệu để tạo báo cáo.</p>',
      siteSummaries: [],
    };
  }

  const allDates = Array.from(new Set(records.map((r) => r.date_day))).sort();
  const targetDate =
    requestedDate && allDates.includes(requestedDate)
      ? requestedDate
      : allDates[allDates.length - 1];

  const formattedDate = formatDateVN(targetDate);
  const dowInfo = getDayOfWeekInfo(targetDate);

  const preferredOrder = ['Ngôi sao', 'VnExpress', 'English'];
  const existingSites = Array.from(new Set(records.map((r) => (r.site || 'Ngôi sao').trim())));
  const orderedSites = [
    ...preferredOrder.filter((s) =>
      existingSites.some((es) => es.toLowerCase() === s.toLowerCase())
    ),
    ...existingSites.filter(
      (es) => !preferredOrder.some((s) => s.toLowerCase() === es.toLowerCase())
    ),
  ];

  const siteSummaries: SiteDailyReportSummary[] = [];
  let siteSectionsHtml = '';

  orderedSites.forEach((siteName) => {
    const siteRecords = records
      .filter(
        (r) =>
          (r.site || 'Ngôi sao').trim().toLowerCase() === siteName.toLowerCase() &&
          r.date_day <= targetDate
      )
      .sort((a, b) => a.date_day.localeCompare(b.date_day));

    const dayRecord = siteRecords.find((r) => r.date_day === targetDate);
    if (!dayRecord) return;

    const dowMedians = computeDayOfWeekMedians(siteRecords);
    const dowMediansMap = new Map<number, DayOfWeekMedian>();
    dowMedians.forEach((m) => dowMediansMap.set(m.dayIndex, m));

    const medianData = dowMediansMap.get(dowInfo.dayIndex);
    if (!medianData) return;

    const brand = getSiteBrandColors(siteName);

    let spikeCount = 0;
    let dropCount = 0;

    // Precompute metrics & streaks for all 16 pairs so we can summarize by category group
    const pairMetrics = METRIC_PAIRS.map((pair) => {
      const pv = Number(dayRecord[pair.pvKey]) || 0;
      const u = Number(dayRecord[pair.uKey]) || 0;
      const ratio = u > 0 ? pv / u : 0;

      const pvMed = medianData.mediansByMetric[pair.pvKey] || 0;
      const uMed = medianData.mediansByMetric[pair.uKey] || 0;
      const rMed =
        medianData.mediansByMetric[`${pair.id}_ratio`] || (uMed > 0 ? pvMed / uMed : 0);

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
    const notableDropStreaks: string[] = [];

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

      // Render Category Group Header Row with Group Streak Summary
      if (pair.category !== currentCategory) {
        currentCategory = pair.category;
        const groupItems = pairMetrics.filter((x) => x.pair.category === currentCategory);
        const pvDrops = groupItems.filter((x) => x.pvStreak.direction === 'down');
        const uDrops = groupItems.filter((x) => x.uStreak.direction === 'down');

        const dropDetails = groupItems
          .filter((x) => x.pvStreak.direction === 'down' || x.uStreak.direction === 'down')
          .map((x) => {
            const parts: string[] = [];
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
        `${formatNumber(pv)}<div style="font:400 10px sans-serif;color:#64748b">TV ${dowInfo.shortName}: ${formatNumber(pvMed)}</div>` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${pvBg}border-right:1px solid #e2e8f0">` +
        `<b style="padding:1px 5px;border-radius:4px;background:${pvStyle.bg};color:${pvStyle.text};font:700 11px monospace">${pvPctStr}</b>` +
        `<div style="font:600 10px monospace;color:${pvDiffAbs >= 0 ? '#047857' : '#be123c'};margin-top:2px">${pvAbsStr}</div>` +
        `${renderStreakBadge(pvStreak)}` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${uBg}font:700 12px monospace;color:#0f172a">` +
        `${formatNumber(u)}<div style="font:400 10px sans-serif;color:#64748b">TV ${dowInfo.shortName}: ${formatNumber(uMed)}</div>` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${uBg}border-right:1px solid #e2e8f0">` +
        `<b style="padding:1px 5px;border-radius:4px;background:${uStyle.bg};color:${uStyle.text};font:700 11px monospace">${uPctStr}</b>` +
        `<div style="font:600 10px monospace;color:${uDiffAbs >= 0 ? '#047857' : '#be123c'};margin-top:2px">${uAbsStr}</div>` +
        `${renderStreakBadge(uStreak)}` +
        `</td>` +
        `<td align="right" nowrap style="padding:6px 8px;${rBg}font:700 12px monospace;color:#0f172a">` +
        `${formatRatio(ratio)}<div style="font:400 10px sans-serif;color:#64748b">TV ${dowInfo.shortName}: ${formatRatio(rMed)}</div>` +
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

    siteSummaries.push({
      siteName,
      date: targetDate,
      dowName: dowInfo.name,
      baselineDays: siteRecords.length,
      dowSampleCount: medianData.count,
      totalPV,
      totalUser,
      totalRatio,
      spikeCount,
      dropCount,
    });

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
                <span style="font-size:12px;color:#475569;margin-left:8px">• Ngày <strong>${formattedDate}</strong> (${dowInfo.name})</span>
              </td>
              <td align="right" style="font-size:11px;color:#475569">
                Benchmark cố định từ đầu năm: <strong>${siteRecords.length} ngày</strong> (${medianData.count} ngày ${dowInfo.name})
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
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
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
    dowName: dowInfo.name,
    subject,
    html,
    siteSummaries,
  };
}
