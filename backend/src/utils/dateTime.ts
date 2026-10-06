/**
 * Utility functions to format dates and times in UTC+3 (Iraq / Baghdad / Riyadh timezone)
 */

export const toPlus3Date = (dateInput: Date | string | number | null | undefined): Date | null => {
  if (!dateInput) return null;
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;
  // Shift by +3 hours (3 * 3600 * 1000 ms)
  return new Date(d.getTime() + 3 * 60 * 60 * 1000);
};

export const formatDateTimePlus3 = (dateInput: Date | string | number | null | undefined): string => {
  const d = toPlus3Date(dateInput);
  if (!d) return '';
  return d.toISOString().replace('T', ' ').substring(0, 16);
};

export const formatDatePlus3 = (dateInput: Date | string | number | null | undefined): string => {
  const d = toPlus3Date(dateInput);
  if (!d) return '';
  return d.toISOString().split('T')[0];
};

export const formatTimePlus3 = (dateInput: Date | string | number | null | undefined): string => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ar-SA', {
    timeZone: 'Asia/Baghdad',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getIraqTimeParts = (dateInput: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(dateInput);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10) - 1; // 0-indexed
  const day = parseInt(getPart('day'), 10);
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const totalMinutes = hour * 60 + minute;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    totalMinutes
  };
};
