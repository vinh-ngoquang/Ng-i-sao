// Number and date formatters for Vietnamese locale

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val));
}

export function formatCompact(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + ' B';
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(2).replace(/\.00$/, '') + ' Tr';
  }
  if (val >= 1_000) {
    return (val / 1_000).toFixed(1).replace(/\.0$/, '') + ' K';
  }
  return formatNumber(val);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return val.toFixed(1) + '%';
}

export function formatRatio(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return val.toFixed(2);
}

export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}
