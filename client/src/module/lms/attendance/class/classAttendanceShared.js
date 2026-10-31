export const CLASS_STATUS_META = {
  present: { label: 'Hadir', color: 'green' },
  late: { label: 'Telat', color: 'gold' },
  excused: { label: 'Sakit/Izin', color: 'blue' },
  absent: { label: 'Absen', color: 'red' },
  incomplete: { label: 'Belum lengkap', color: 'orange' },
  insufficient_hours: { label: 'Jam kurang', color: 'orange' },
  pending: { label: 'Belum tap', color: 'default' },
};

export const CLASS_STATUS_OPTIONS = Object.entries(CLASS_STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export const statusLabel = (value) => CLASS_STATUS_META[value]?.label || value || '-';

/** Report timestamps are Jakarta-local "YYYY-MM-DD HH:mm:ss" strings. */
export const timeOnly = (value) => (value ? String(value).slice(11, 16) : '');
