import nodemailer from 'nodemailer';
import { generateDailyEmailReport } from '../src/utils/emailReportGenerator';
import { parseTsvToRecords } from '../src/utils/googleSheetsSync';
import { INITIAL_RECORDS, GOOGLE_SHEETS_TSV_URL } from '../src/data/initialData';

async function getLatestRecords() {
  try {
    const fetchUrl = `${GOOGLE_SHEETS_TSV_URL}&_t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    if (response.ok) {
      const tsv = await response.text();
      const parsed = parseTsvToRecords(tsv);
      if (parsed.records && parsed.records.length > 0) {
        return parsed.records;
      }
    }
  } catch (err) {
    console.warn('Fallback to bundled records:', err);
  }
  return INITIAL_RECORDS;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = req.method === 'POST' ? req.body || {} : {};
    const query = req.query || {};

    const toEmail = (body.to || query.to || process.env.EMAIL_TO || '').trim();
    const smtpUser = (body.smtpUser || process.env.SMTP_USER || '').trim();
    const smtpPass = (body.smtpPass || process.env.SMTP_PASS || '').replace(/\s+/g, '');
    const targetDate = body.targetDate || query.date || undefined;

    if (!toEmail) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu địa chỉ email người nhận (EMAIL_TO). Vui lòng nhập email người nhận hoặc cấu hình biến môi trường EMAIL_TO.',
      });
    }

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin tài khoản gửi Gmail (SMTP_USER / SMTP_PASS). Vui lòng nhập Gmail và Mật khẩu ứng dụng (App Password) 16 ký tự hoặc cấu hình trong Environment Variables.',
      });
    }

    // Use provided records from client if available, otherwise fetch live from Google Sheets
    const records = Array.isArray(body.records) && body.records.length > 0
      ? body.records
      : await getLatestRecords();

    const report = generateDailyEmailReport(records, targetDate);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Dashboard Pageviews & Users" <${smtpUser}>`,
      to: toEmail,
      subject: body.customSubject || report.subject,
      html: report.html,
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      targetDate: report.targetDate,
      formattedDate: report.formattedDate,
      to: toEmail,
      subject: report.subject,
    });
  } catch (err: any) {
    console.error('Send email error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Không thể gửi email. Vui lòng kiểm tra lại Gmail App Password.',
    });
  }
}
