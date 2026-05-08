import { MOCK_PRODUCTS } from './mockData';

export interface SaleRecord {
  date: string;
  productId: string;
  productName: string;
  category: string;
  qty: number;
  revenue: number;
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

export const MOCK_SALES: SaleRecord[] = (() => {
  const rand = rng(42);
  const records: SaleRecord[] = [];
  const today = new Date('2026-04-05');
  for (let d = 89; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    const numTx = Math.floor(rand() * 6) + 1;
    for (let t = 0; t < numTx; t++) {
      const p = MOCK_PRODUCTS[Math.floor(rand() * MOCK_PRODUCTS.length)];
      const qty = Math.floor(rand() * 5) + 1;
      records.push({ date: dateStr, productId: p.id, productName: p.name, category: p.category, qty, revenue: p.price * qty });
    }
  }
  return records;
})();
