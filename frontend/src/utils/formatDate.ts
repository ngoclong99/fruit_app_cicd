export const formatDate = (iso: string, locale = 'vi-VN'): string =>
  new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateTime = (iso: string, locale = 'vi-VN'): string =>
  new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
