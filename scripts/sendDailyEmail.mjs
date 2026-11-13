import nodemailer from 'nodemailer';

const GOOGLE_SHEETS_TSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQksM6-RzffQI5Va9Bx6X9oiii5Hd_BYZDjaRSNnHOuhke-FlQr9kuYOTXuuoA2SkZPyvrCF2_c6dkC/pub?gid=1633653606&single=true&output=tsv';

const METRIC_PAIRS = [
  { id: 'total', label: '1. Tổng Toàn Site', category: 'overview', pvKey: 'total_pageviews', userKey: 'total_users' },
  { id: 'mobile', label: '2. Mobile', category: 'device', pvKey: 'mobile_pageviews', userKey: 'mobile_users' },
  { id: 'pc', label: '3. PC / Desktop', category: 'device', pvKey: 'pc_pageviews', userKey: 'pc_users' },
  { id: 'tablet', label: '4. Tablet', category: 'device', pvKey: 'tablet_pageviews', userKey: 'tablet_users' },
  { id: 'ex_direct', label: '5. Ex-Direct', category: 'external_source', pvKey: 'ex_direct_pageviews', userKey: 'ex_direct_users' },
  { id: 'ex_google', label: '6. Ex-Google (SEO)', category: 'external_source', pvKey: 'ex_google_pageviews', userKey: 'ex_google_users' },
  { id: 'ex_social', label: '7. Ex-Social', category: 'external_source', pvKey: 'ex_social_pageviews', userKey: 'ex_social_users' },
  { id: 'ex_referral', label: '8. Ex-Referral', category: 'external_source', pvKey: 'ex_referral_pageviews', userKey: 'ex_referral_users' },
  { id: 'ex_other', label: '9. Ex-Other', category: 'external_source', pvKey: 'ex_other_pageviews', userKey: 'ex_other_users' },
  { id: 'in_home', label: '10. In-Home (Trang chủ)', category: 'internal_section', pvKey: 'in_home_pageviews', userKey: 'in_home_users' },
  { id: 'in_cur_folder', label: '11. In-Cur-Folder (Chuyên mục)', category: 'internal_section', pvKey: 'in_cur_folder_pageviews', userKey: 'in_cur_folder_users' },
  { id: 'in_oth_folder', label: '12. In-Oth-Folder (Chuyên mục khác)', category: 'internal_section', pvKey: 'in_oth_folder_pageviews', userKey: 'in_oth_folder_users' },
  { id: 'in_cur_detail', label: '13. In-Cur-Detail (Bài cùng mục)', category: 'internal_section', pvKey: 'in_cur_detail_pageviews', userKey: 'in_cur_detail_users' },
  { id: 'in_oth_detail', label: '14. In-Oth-Detail (Bài mục khác)', category: 'internal_section', pvKey: 'in_oth_detail_pageviews', userKey: 'in_oth_detail_users' },
  { id: 'in_vnexpress', label: '15. In-VnExpress (Chéo từ VNE)', category: 'internal_section', pvKey: 'in_vnexpress_pageviews', userKey: 'in_vnexpress_users' },
  { id: 'in_other', label: '16. In-Other (Nội bộ khác)', category: 'internal_section', pvKey: 'in_other_pageviews', userKey: 'in_other_users' },
];

const CATEGORY_LABELS = {
  overview: 'TỔNG QUAN TOÀN SITE',
  device: 'NHÓM THIẾT BỊ (DEVICE)',
  external_source: 'NGUỒN NGOÀI (EXTERNAL TRAFFIC)',
  internal_section: 'LUÂN CHUYỂN NỘI BỘ (INTERNAL TRAFFIC)',
};

const SITE_CONFIGS = [
  { id: 'Ngôi sao', title: 'Ngôi Sao (ngoisao.vnexpress.net)', color: '#e11d48', bgLight: '#fff1f2', border: '#fecdd3' },
  { id: 'VnExpress', title: 'VnExpress (vnexpress.net)', color: '#b91c1c', bgLight: '#fef2f2', border: '#fecaca' },
  { id: 'English', title: 'VnExpress International (e.vnexpress.net)', color: '#1d4ed8', bgLight: '#eff6ff', border: '#bfdbfe' },
];

function cleanNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

async function fetchLiveGoogleSheets() {
  const url = `${GOOGLE_SHEETS_TSV_URL}&_t=${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });
  if (!response.ok) {
    throw new Error(`Google Sheets trả về HTTP ${response.status}`);
  }
  const tsvText = await response.text();
  const lines = tsvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 34) continue;
    const dateStr = cols[1]?.trim();
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

    records.push({
      site: cols[0]?.trim() || 'Ngôi sao',
      date_day: dateStr,
      total_pageviews: cleanNumber(cols[2]),
      total_users: cleanNumber(cols[3]),
      mobile_pageviews: cleanNumber(cols[4]),
      mobile_users: cleanNumber(cols[5]),
      pc_pageviews: cleanNumber(cols[6]),
      pc_users: cleanNumber(cols[7]),
      tablet_pageviews: cleanNumber(cols[8]),
      tablet_users: cleanNumber(cols[9]),
      ex_direct_pageviews: cleanNumber(cols[10]),
      ex_direct_users: cleanNumber(cols[11]),
      ex_google_pageviews: cleanNumber(cols[12]),
      ex_google_users: cleanNumber(cols[13]),
      ex_social_pageviews: cleanNumber(cols[14]),
      ex_social_users: cleanNumber(cols[15]),
      ex_referral_pageviews: cleanNumber(cols[16]),
      ex_referral_users: cleanNumber(cols[17]),
      ex_other_pageviews: cleanNumber(cols[18]),
      ex_other_users: cleanNumber(cols[19]),
      in_home_pageviews: cleanNumber(cols[20]),
      in_home_users: cleanNumber(cols[21]),
      in_cur_folder_pageviews: cleanNumber(cols[22]),
      in_cur_folder_users: cleanNumber(cols[23]),
      in_oth_folder_pageviews: cleanNumber(cols[24]),
      in_oth_folder_users: cleanNumber(cols[25]),
      in_cur_detail_pageviews: cleanNumber(cols[26]),
      in_cur_detail_users: cleanNumber(cols[27]),
      in_oth_detail_pageviews: cleanNumber(cols[28]),
      in_oth_detail_users: cleanNumber(cols[29]),
      in_vnexpress_pageviews: cleanNumber(cols[30]),
      in_vnexpress_users: cleanNumber(cols[31]),
      in_other_pageviews: cleanNumber(cols[32]),
      in_other_users: cleanNumber(cols[33]),
    });
  }
  records.sort((a, b) => a.date_day.localeCompare(b.date_day));
  return records;
}

function formatNumberFull(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val));
}

function formatCompactVN(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} Tr`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)} K`;
  return `${sign}${Math.round(abs)}`;
}

function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDayOfWeekInfo(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  const labels = {
    0: 'Chủ Nhật',
    1: 'Thứ Hai',
    2: 'Thứ Ba',
    3: 'Thứ Tư',
    4: 'Thứ Năm',
    5: 'Thứ Sáu',
    6: 'Thứ Bảy',
  };
  return { dow, label: labels[dow] || '' };
}

function getMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function computeDowMediansForSite(siteRecords, dow) {
  const sameDowRecords = siteRecords.filter((r) => getDayOfWeekInfo(r.date_day).dow === dow);
  const medians = {};
  for (const pair of METRIC_PAIRS) {
    medians[pair.pvKey] = getMedian(sameDowRecords.map((r) => Number(r[pair.pvKey]) || 0));
    medians[pair.userKey] = getMedian(sameDowRecords.map((r) => Number(r[pair.userKey]) || 0));
  }
  return { medians, count: sameDowRecords.length };
}

function getBadgeInlineStyle(pctDiff) {
  if (pctDiff >= 20) {
    return 'background-color:#059669;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:700;font-size:11px;display:inline-block;';
  }
  if (pctDiff >= 5) {
    return 'background-color:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:1px 5px;border-radius:4px;font-weight:600;font-size:11px;display:inline-block;';
  }
  if (pctDiff <= -20) {
    return 'background-color:#e11d48;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:700;font-size:11px;display:inline-block;';
  }
  if (pctDiff <= -5) {
    return 'background-color:#fff1f2;color:#be123c;border:1px solid #fecdd3;padding:1px 5px;border-radius:4px;font-weight:600;font-size:11px;display:inline-block;';
  }
  return 'background-color:#f1f5f9;color:#475569;padding:1px 5px;border-radius:4px;font-weight:500;font-size:11px;display:inline-block;';
}

function formatDiffCell(actual, median) {
  const absDiff = actual - median;
  const pctDiff = median > 0 ? ((actual - median) / median) * 100 : 0;
  const pctSign = pctDiff > 0 ? '+' : '';
  const absSign = absDiff > 0 ? '+' : '';
  const badgeStyle = getBadgeInlineStyle(pctDiff);
  const absColor = absDiff > 0 ? '#047857' : absDiff < 0 ? '#be123c' : '#64748b';

  return `
    <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:3px;">
      ${formatNumberFull(actual)}
    </div>
    <div style="margin-bottom:2px;">
      <span style="${badgeStyle}">${pctSign}${pctDiff.toFixed(1)}%</span>
      <span style="font-size:11px;font-weight:600;color:${absColor};margin-left:4px;">(${absSign}${formatCompactVN(absDiff)})</span>
    </div>
    <div style="font-size:10px;color:#64748b;">
      TV: ${formatNumberFull(median)}
    </div>
  `;
}

function generateDailyEmailReport(allRecords, targetDate) {
  const sortedDates = Array.from(new Set(allRecords.map((r) => r.date_day))).sort();
  const reportDate = targetDate && sortedDates.includes(targetDate) ? targetDate : sortedDates[sortedDates.length - 1];
  const minDate = sortedDates[0] || reportDate;
  const dowInfo = getDayOfWeekInfo(reportDate);
  const dateVN = formatDateVN(reportDate);

  const subject = `[Báo Cáo Traffic Hàng Ngày] ${dowInfo.label}, ${dateVN} — Ngôi Sao • VnExpress • English`;

  let siteSectionsHtml = '';
  let plainTextLines = [
    `BÁO CÁO DỮ LIỆU CHI TIẾT HÀNG NGÀY — ${dowInfo.label.toUpperCase()}, ${dateVN}`,
    `So sánh với Trung Vị Cùng Thứ (${dowInfo.label}) tính từ đầu năm (${formatDateVN(minDate)} đến ${dateVN})`,
    '====================================================================',
    '',
  ];

  for (const siteCfg of SITE_CONFIGS) {
    const siteRecords = allRecords
      .filter((r) => (r.site || '').toLowerCase() === siteCfg.id.toLowerCase())
      .sort((a, b) => a.date_day.localeCompare(b.date_day));

    const latestRecord = siteRecords.find((r) => r.date_day === reportDate) || siteRecords[siteRecords.length - 1];
    if (!latestRecord) continue;

    const recordDow = getDayOfWeekInfo(latestRecord.date_day);
    const { medians, count: sameDowCount } = computeDowMediansForSite(siteRecords, recordDow.dow);

    const totalPV = latestRecord.total_pageviews;
    const totalUsers = latestRecord.total_users;
    const medPV = medians.total_pageviews || 0;
    const medUsers = medians.total_users || 0;
    const pvPct = medPV > 0 ? ((totalPV - medPV) / medPV) * 100 : 0;
    const userPct = medUsers > 0 ? ((totalUsers - medUsers) / medUsers) * 100 : 0;
    const pvPerUser = totalUsers > 0 ? (totalPV / totalUsers).toFixed(2) : '0.00';

    plainTextLines.push(`■ SITE: ${siteCfg.title} (Ngày ${formatDateVN(latestRecord.date_day)})`);
    plainTextLines.push(
      `  - Tổng Pageviews: ${formatNumberFull(totalPV)} (${pvPct >= 0 ? '+' : ''}${pvPct.toFixed(1)}% | ${totalPV - medPV >= 0 ? '+' : ''}${formatNumberFull(totalPV - medPV)} vs Trung vị ${recordDow.label}: ${formatNumberFull(medPV)})`
    );
    plainTextLines.push(
      `  - Tổng Users:     ${formatNumberFull(totalUsers)} (${userPct >= 0 ? '+' : ''}${userPct.toFixed(1)}% | ${totalUsers - medUsers >= 0 ? '+' : ''}${formatNumberFull(totalUsers - medUsers)} vs Trung vị ${recordDow.label}: ${formatNumberFull(medUsers)})`
    );
    plainTextLines.push('');

    let rowsHtml = '';
    let currentCategory = '';

    for (const pair of METRIC_PAIRS) {
      if (pair.category !== currentCategory) {
        currentCategory = pair.category;
        rowsHtml += `
          <tr>
            <td colspan="4" style="background-color:#f8fafc;padding:7px 12px;font-size:11px;font-weight:700;color:#475569;letter-spacing:0.04em;border-bottom:1px solid #e2e8f0;border-top:1px solid #e2e8f0;">
              ${CATEGORY_LABELS[currentCategory] || currentCategory}
            </td>
          </tr>
        `;
      }

      const pvActual = Number(latestRecord[pair.pvKey]) || 0;
      const pvMedian = medians[pair.pvKey] || 0;
      const userActual = Number(latestRecord[pair.userKey]) || 0;
      const userMedian = medians[pair.userKey] || 0;
      const ratioActual = userActual > 0 ? (pvActual / userActual).toFixed(2) : '0.00';
      const ratioMedian = userMedian > 0 ? (pvMedian / userMedian).toFixed(2) : '0.00';

      rowsHtml += `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#1e293b;vertical-align:top;">
            ${pair.label}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;background-color:#fffdf9;">
            ${formatDiffCell(pvActual, pvMedian)}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;">
            ${formatDiffCell(userActual, userMedian)}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;font-size:12px;color:#334155;">
            <div style="font-weight:700;color:#0f172a;">${ratioActual}</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">TV: ${ratioMedian}</div>
          </td>
        </tr>
      `;
    }

    siteSectionsHtml += `
      <div style="margin-bottom:28px;border:1px solid ${siteCfg.border};border-radius:10px;overflow:hidden;background-color:#ffffff;">
        <div style="background-color:${siteCfg.color};color:#ffffff;padding:12px 16px;">
          <div style="font-size:16px;font-weight:700;">${siteCfg.title}</div>
          <div style="font-size:12px;opacity:0.92;margin-top:2px;">
            Ngày dữ liệu: <strong>${recordDow.label}, ${formatDateVN(latestRecord.date_day)}</strong> • Đối chiếu Trung vị của <strong>${sameDowCount} ngày ${recordDow.label}</strong> từ đầu năm (${formatDateVN(siteRecords[0]?.date_day || minDate)} – ${formatDateVN(latestRecord.date_day)})
          </div>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:${siteCfg.bgLight};border-bottom:1px solid ${siteCfg.border};">
          <tr>
            <td width="34%" style="padding:10px 14px;border-right:1px solid ${siteCfg.border};">
              <div style="font-size:11px;color:#475569;font-weight:600;">TỔNG PAGEVIEWS</div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:2px;">${formatNumberFull(totalPV)}</div>
              <div style="font-size:11px;color:${pvPct >= 0 ? '#047857' : '#be123c'};font-weight:600;margin-top:2px;">
                ${pvPct >= 0 ? '+' : ''}${pvPct.toFixed(1)}% (${totalPV - medPV >= 0 ? '+' : ''}${formatCompactVN(totalPV - medPV)}) vs TV
              </div>
            </td>
            <td width="34%" style="padding:10px 14px;border-right:1px solid ${siteCfg.border};">
              <div style="font-size:11px;color:#475569;font-weight:600;">TỔNG USERS</div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:2px;">${formatNumberFull(totalUsers)}</div>
              <div style="font-size:11px;color:${userPct >= 0 ? '#047857' : '#be123c'};font-weight:600;margin-top:2px;">
                ${userPct >= 0 ? '+' : ''}${userPct.toFixed(1)}% (${totalUsers - medUsers >= 0 ? '+' : ''}${formatCompactVN(totalUsers - medUsers)}) vs TV
              </div>
            </td>
            <td width="32%" style="padding:10px 14px;">
              <div style="font-size:11px;color:#475569;font-weight:600;">ĐỘ SÂU ĐỌC (PV/USER)</div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:2px;">${pvPerUser}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">
                TV ${recordDow.label}: ${medUsers > 0 ? (medPV / medUsers).toFixed(2) : '0.00'}
              </div>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background-color:#f1f5f9;">
              <th align="left" width="32%" style="padding:9px 12px;font-size:11px;font-weight:700;color:#334155;border-bottom:2px solid #cbd5e1;text-transform:uppercase;">Chỉ Số / Phân Nhóm</th>
              <th align="right" width="28%" style="padding:9px 12px;font-size:11px;font-weight:700;color:#334155;border-bottom:2px solid #cbd5e1;text-transform:uppercase;">Pageviews (Lệch % & Số)</th>
              <th align="right" width="28%" style="padding:9px 12px;font-size:11px;font-weight:700;color:#334155;border-bottom:2px solid #cbd5e1;text-transform:uppercase;">Users (Lệch % & Số)</th>
              <th align="right" width="12%" style="padding:9px 12px;font-size:11px;font-weight:700;color:#334155;border-bottom:2px solid #cbd5e1;text-transform:uppercase;">PV/U</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:820px;margin:0 auto;padding:20px 12px;">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#ffffff;padding:20px 22px;border-radius:12px;margin-bottom:20px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;">
        BÁO CÁO TỰ ĐỘNG HÀNG NGÀY • BẢNG DỮ LIỆU CHI TIẾT THEO NGÀY
      </div>
      <div style="font-size:20px;font-weight:800;margin-top:4px;">
        Thống Kê Pageviews & Users — ${dowInfo.label}, ${dateVN}
      </div>
      <div style="font-size:12px;color:#cbd5e1;margin-top:6px;">
        Chuẩn đối chiếu: <strong>Trung vị cùng thứ (${dowInfo.label}) cố định từ đầu năm (${formatDateVN(minDate)} đến ${dateVN})</strong>
      </div>
    </div>

    ${siteSectionsHtml}

    <div style="text-align:center;font-size:11px;color:#64748b;padding:12px 0;">
      Email được gửi tự động từ hệ thống <strong>Dashboard Thống Kê Pageviews & Users</strong> • Nguồn dữ liệu: Google Sheets Live.
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    subject,
    html,
    text: plainTextLines.join('\n'),
    reportDate,
  };
}

async function main() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailTo = process.env.EMAIL_TO || smtpUser;
  const targetDate = process.env.REPORT_DATE || undefined;

  if (!smtpUser || !smtpPass) {
    console.error('❌ Thiếu biến môi trường SMTP_USER hoặc SMTP_PASS.');
    process.exit(1);
  }

  console.log('🔄 Đang tải dữ liệu trực tiếp từ Google Sheets...');
  const records = await fetchLiveGoogleSheets();
  console.log(`✅ Đã tải ${records.length} dòng dữ liệu.`);

  const report = generateDailyEmailReport(records, targetDate);
  console.log(`📧 Đang gửi báo cáo ngày ${report.reportDate} tới: ${emailTo}`);

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
    from: `"Dashboard Traffic Daily" <${smtpUser}>`,
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
