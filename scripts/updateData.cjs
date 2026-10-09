const fs = require('fs');
const path = require('path');

(async () => {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQksM6-RzffQI5Va9Bx6X9oiii5Hd_BYZDjaRSNnHOuhke-FlQr9kuYOTXuuoA2SkZPyvrCF2_c6dkC/pub?gid=1633653606&single=true&output=tsv&_t=' + Date.now();
  console.log('Downloading fresh TSV from Google Sheets...');
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  
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

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(p => p.trim());
    if (parts.length < 5) continue;
    const obj = {};
    KEY_MAP.forEach((k, idx) => {
      if (idx === 0 || idx === 1) {
        obj[k] = parts[idx] || (idx === 1 ? 'Ngôi sao' : '');
      } else {
        const raw = parts[idx] ? parts[idx].replace(/,/g, '') : '0';
        obj[k] = Number(raw) || 0;
      }
    });
    if (obj.date_day && /^\d{4}-\d{2}-\d{2}/.test(obj.date_day)) {
      records.push(obj);
    }
  }

  console.log('Parsed records total:', records.length);
  const lastUpdated = new Date().toISOString();

  // Save initialData.json
  const jsonContent = JSON.stringify({ lastUpdated, count: records.length, records }, null, 2);
  fs.writeFileSync(path.resolve(process.cwd(), 'src/data/initialData.json'), jsonContent, 'utf8');

  // Save initialData.ts
  const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQksM6-RzffQI5Va9Bx6X9oiii5Hd_BYZDjaRSNnHOuhke-FlQr9kuYOTXuuoA2SkZPyvrCF2_c6dkC/pub?gid=1633653606&single=true&output=tsv';
  const tsContent = '// Auto-generated bundled dataset for instant startup\n' +
    'import { NgoiSaoRecord } from "../types";\n\n' +
    'export const INITIAL_LAST_UPDATED = "' + lastUpdated + '";\n' +
    'export const GOOGLE_SHEETS_TSV_URL = "' + tsvUrl + '";\n' +
    'export const INITIAL_RECORDS: NgoiSaoRecord[] = ' + JSON.stringify(records, null, 2) + ';\n';
  fs.writeFileSync(path.resolve(process.cwd(), 'src/data/initialData.ts'), tsContent, 'utf8');
  console.log('Successfully saved initialData.ts and initialData.json with ' + records.length + ' records!');
})();
