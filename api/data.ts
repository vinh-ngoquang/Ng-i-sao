import { parseTsvToRecords } from '../src/utils/googleSheetsSync';
import { INITIAL_RECORDS, GOOGLE_SHEETS_TSV_URL } from '../src/data/initialData';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const separator = GOOGLE_SHEETS_TSV_URL.includes('?') ? '&' : '?';
    const fetchUrl = `${GOOGLE_SHEETS_TSV_URL}${separator}_t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets responded with HTTP ${response.status}`);
    }

    const tsvText = await response.text();
    const { records } = parseTsvToRecords(tsvText);

    if (records && records.length > 0) {
      const sortedDates = Array.from(new Set(records.map((r) => r.date_day))).sort();
      const latestDate = sortedDates[sortedDates.length - 1] || '';
      return res.status(200).json({
        success: true,
        lastSyncTime: new Date().toISOString(),
        count: records.length,
        latestDate,
        sourceUrl: GOOGLE_SHEETS_TSV_URL,
        records,
      });
    }
  } catch (err: any) {
    console.warn('Live fetch in /api/data failed, falling back to INITIAL_RECORDS:', err.message);
  }

  const sortedDates = Array.from(new Set(INITIAL_RECORDS.map((r) => r.date_day))).sort();
  return res.status(200).json({
    success: true,
    lastSyncTime: new Date().toISOString(),
    count: INITIAL_RECORDS.length,
    latestDate: sortedDates[sortedDates.length - 1] || '',
    sourceUrl: GOOGLE_SHEETS_TSV_URL,
    records: INITIAL_RECORDS,
  });
}
