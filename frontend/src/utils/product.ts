import type { Product } from '@/types';

export function getProductName(p: Product, lang: string): string {
  if (lang !== 'vi' && p.nameEn) return p.nameEn;
  return p.nameVi ?? p.name;
}
