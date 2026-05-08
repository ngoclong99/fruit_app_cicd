export const truncate = (str: string, max: number): string =>
  str.length > max ? str.slice(0, max) + '...' : str;

export const slugify = (str: string): string =>
  str.toLowerCase().normalize('NFD').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
