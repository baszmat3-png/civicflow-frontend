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
