// ── Number formatting ──
export const formatILS = (n) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n || 0);

export const formatUSD = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const formatNumber = (n) =>
  new Intl.NumberFormat('he-IL').format(n || 0);

// ── Date formatting ──
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatMonth = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
};

export const todayISO = () => new Date().toISOString().split('T')[0];

export const monthKey = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.slice(0, 7); // "YYYY-MM"
};

// ── Hebrew month display ──
const HE_MONTHS = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export const heMonth = (monthNum) => HE_MONTHS[parseInt(monthNum)] || '';

export const heMonthYear = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  return `${heMonth(m)} ${y}`;
};

// ── Expense categories ──
export const EXPENSE_CATEGORIES = [
  'מלגות אברכים',
  'שכירות',
  'טלפון ותקשורת',
  'ציוד משרדי',
  'הנהלת חשבונות',
  'הוצאות בנק',
  'נסיעות',
  'אחר',
];

// ── Currency options ──
export const CURRENCIES = ['₪', '$', '€', '£'];

// ── Sum helpers ──
export const sumField = (arr, field) =>
  arr.reduce((s, item) => s + (parseFloat(item[field]) || 0), 0);

// ── Export to Excel ──
export const exportToExcel = (rows, headers, filename) => {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'נתונים');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  });
};
