/** Display labels for asset status (internal value -> UI label) */
export const STATUS_LABELS = {
  Available: 'Available',
  Rented: 'Sewa',
  Late: 'Perlu Diupdate',
};

export const CONDITION_OPTIONS = ['Bagus', 'Rusak', 'Dalam Perbaikan', 'Hilang'];

/** Jangka waktu update: value = days */
export const UPDATE_INTERVAL_OPTIONS = [
  { value: 1, label: 'Setiap 1 Hari sekali' },
  { value: 3, label: '3 Hari sekali' },
  { value: 7, label: '1 Minggu / 7 Hari Sekali' },
  { value: 30, label: 'Setiap 1 Bulan Sekali' },
  { value: 90, label: '3 Bulan sekali' },
  { value: 180, label: '6 Bulan Sekali' },
];

/** Hitung Due Update dari timestamp saat ini + interval (dalam hari) */
export function addDaysToDate(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Batasi teks dengan ... jika melebihi maxLen */
export function truncate(str, maxLen) {
  if (str == null || typeof str !== 'string') return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '...';
}
