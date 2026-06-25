import type { User, Product, Category, Order } from '@/types';

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin', email: 'admin@fruitshop.vn', role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', status: 'active', phone: '0901000001', createdAt: '2024-01-01T00:00:00Z', orderCount: 0, totalSpent: 0 },
  { id: '2', name: 'Nguyá»…n VÄƒn A', email: 'user@fruitshop.vn', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user', status: 'active', phone: '0901234567', createdAt: '2024-02-10T08:00:00Z', orderCount: 8, totalSpent: 2450000 },
  { id: '3', name: 'Tráº§n Thá»‹ B', email: 'tranthib@gmail.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tranthib', status: 'active', phone: '0912345678', createdAt: '2024-03-05T09:30:00Z', orderCount: 5, totalSpent: 1890000 },
  { id: '4', name: 'LÃª VÄƒn C', email: 'levanc@gmail.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=levanc', status: 'blocked', phone: '0923456789', createdAt: '2024-03-12T14:00:00Z', orderCount: 2, totalSpent: 640000 },
  { id: '5', name: 'Pháº¡m Thá»‹ D', email: 'phamthid@gmail.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=phamthid', status: 'active', phone: '0934567890', createdAt: '2024-04-01T10:00:00Z', orderCount: 12, totalSpent: 5670000 },
  { id: '6', name: 'HoÃ ng VÄƒn E', email: 'hoangvane@gmail.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hoangvane', status: 'active', phone: '0945678901', createdAt: '2024-05-20T11:00:00Z', orderCount: 3, totalSpent: 980000 },
  { id: '7', name: 'VÅ© Thá»‹ F', email: 'vuthif@gmail.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vuthif', status: 'blocked', phone: '0956789012', createdAt: '2024-06-08T13:30:00Z', orderCount: 1, totalSpent: 320000 },
  { id: '8', name: 'Äáº·ng VÄƒn G', email: 'dangvang@gmail.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dangvang', status: 'active', phone: '0967890123', createdAt: '2025-01-15T08:00:00Z', orderCount: 7, totalSpent: 3210000 },
];

import bcrypt from 'bcryptjs';
const hash = (p: string) => bcrypt.hashSync(p, 10);
export const MOCK_PASSWORDS: Record<string, string> = {
  'admin@fruitshop.vn': hash('admin123'),
  'user@fruitshop.vn': hash('user123'),
};

export const CATEGORIES: Category[] = [
  { id: '1', name: 'TrÃ¡i cÃ¢y nháº­p kháº©u', icon: 'ðŸ‡', slug: 'nhap-khau' },
  { id: '2', name: 'TrÃ¡i cÃ¢y trong nÆ°á»›c', icon: 'ðŸ¥­', slug: 'trong-nuoc' },
  { id: '3', name: 'NgÅ© quáº£', icon: 'ðŸŽ', slug: 'ngu-qua' },
  { id: '4', name: 'Giá» quÃ  trÃ¡i cÃ¢y', icon: 'ðŸ§º', slug: 'gio-qua' },
  { id: '5', name: 'NÆ°á»›c Ã©p trÃ¡i cÃ¢y', icon: 'ðŸŠ', slug: 'nuoc-ep' },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Nho Má»¹ Ä‘en khÃ´ng háº¡t', price: 185000, originalPrice: 220000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-8fc52d49553f.jpg', images: ['https://d2dmcrgjyyacvu.cloudfront.net/products/seed-848289cf1b07.jpg', 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-9b6b65dff6b4.jpg'], category: 'nhap-khau', unit: '500g', stock: 50, description: 'Nho Má»¹ Ä‘en khÃ´ng háº¡t nháº­p kháº©u trá»±c tiáº¿p tá»« California. Quáº£ to, ngá»t, giÃ²n, vá» má»ng, khÃ´ng háº¡t. GiÃ u cháº¥t chá»‘ng oxy hÃ³a vÃ  vitamin C.', origin: 'Má»¹', rating: 4.8, reviewCount: 124, badge: 'sale', tags: ['nho', 'nháº­p kháº©u', 'khÃ´ng háº¡t'] },
  { id: '2', name: 'Cherry Má»¹ tÆ°Æ¡i', price: 320000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-549e1585fdd1.jpg', category: 'nhap-khau', unit: '500g', stock: 30, description: 'Cherry Má»¹ tÆ°Æ¡i ngon, quáº£ Ä‘á» bÃ³ng, vá»‹ ngá»t chua hÃ i hÃ²a. Nháº­p kháº©u tá»« Washington State, loáº¡i premium.', origin: 'Má»¹', rating: 4.9, reviewCount: 89, badge: 'hot', tags: ['cherry', 'nháº­p kháº©u', 'tÆ°Æ¡i'] },
  { id: '3', name: 'XoÃ i cÃ¡t HÃ²a Lá»™c', price: 75000, originalPrice: 90000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-8fb3784b491b.jpg', category: 'trong-nuoc', unit: 'kg', stock: 100, description: 'XoÃ i cÃ¡t HÃ²a Lá»™c - Ä‘áº·c sáº£n Tiá»n Giang. Quáº£ to, thá»‹t vÃ ng, ngá»t thÆ¡m, Ã­t xÆ¡. HÃ¡i Ä‘Ãºng Ä‘á»™ chÃ­n.', origin: 'Tiá»n Giang', rating: 4.7, reviewCount: 256, badge: 'sale', tags: ['xoÃ i', 'trong nÆ°á»›c', 'Ä‘áº·c sáº£n'] },
  { id: '4', name: 'DÃ¢u tÃ¢y ÄÃ  Láº¡t há»¯u cÆ¡', price: 95000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-aa33b79ef69f.jpg', category: 'ngu-qua', unit: '250g', stock: 40, description: 'DÃ¢u tÃ¢y ÄÃ  Láº¡t trá»“ng theo tiÃªu chuáº©n há»¯u cÆ¡, khÃ´ng thuá»‘c trá»« sÃ¢u. Quáº£ Ä‘á» Ä‘á»u, thÆ¡m ngá»t tá»± nhiÃªn.', origin: 'ÄÃ  Láº¡t', rating: 4.6, reviewCount: 178, badge: 'new', tags: ['dÃ¢u tÃ¢y', 'há»¯u cÆ¡', 'ÄÃ  Láº¡t'] },
  { id: '5', name: 'Thanh long ruá»™t Ä‘á»', price: 45000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-6881884a06b3.jpg', category: 'trong-nuoc', unit: 'kg', stock: 80, description: 'Thanh long ruá»™t Ä‘á» Long An, quáº£ to Ä‘á»u, ruá»™t Ä‘á» Ä‘áº¹p, ngá»t thanh mÃ¡t. GiÃ u vitamin C vÃ  cháº¥t xÆ¡.', origin: 'Long An', rating: 4.5, reviewCount: 312, tags: ['thanh long', 'trong nÆ°á»›c'] },
  { id: '6', name: 'Sáº§u riÃªng Musang King', price: 850000, originalPrice: 950000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-bf080939419b.jpg', category: 'nhap-khau', unit: 'kg', stock: 15, description: 'Sáº§u riÃªng Musang King Malaysia - giá»‘ng sáº§u riÃªng ngon nháº¥t tháº¿ giá»›i. CÆ¡m vÃ ng, bÃ©o ngáº­y, vá»‹ Ä‘áº¯ng nháº¹ Ä‘áº·c trÆ°ng.', origin: 'Malaysia', rating: 4.9, reviewCount: 67, badge: 'hot', tags: ['sáº§u riÃªng', 'nháº­p kháº©u', 'musang king'] },
  { id: '7', name: 'TÃ¡o Fuji Nháº­t', price: 280000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-6461aeb4c831.jpg', category: 'nhap-khau', unit: 'há»™p 6 quáº£', stock: 25, description: 'TÃ¡o Fuji Nháº­t Báº£n chÃ­nh hÃ£ng, quáº£ trÃ²n Ä‘á»u, vá» Ä‘á» bÃ³ng Ä‘áº¹p. GiÃ²n, ngá»t, thÆ¡m Ä‘áº·c trÆ°ng cá»§a tÃ¡o Nháº­t.', origin: 'Nháº­t Báº£n', rating: 4.8, reviewCount: 145, tags: ['tÃ¡o', 'nháº­p kháº©u', 'nháº­t báº£n'] },
  { id: '8', name: 'BÆ¡ booth 034', price: 55000, originalPrice: 65000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-e979345316ac.jpg', category: 'trong-nuoc', unit: 'kg', stock: 60, description: 'BÆ¡ booth 034 Äáº¯k Láº¯k, loáº¡i 1. Quáº£ to, thá»‹t vÃ ng Ä‘áº­m, bÃ©o ngáº­y, khÃ´ng Ä‘áº¯ng. HÃ¡i Ä‘Ãºng ngÃ y chÃ­n.', origin: 'Äáº¯k Láº¯k', rating: 4.7, reviewCount: 423, badge: 'sale', tags: ['bÆ¡', 'trong nÆ°á»›c', 'Ä‘áº¯k láº¯k'] },
  { id: '9', name: 'Viá»‡t quáº¥t Má»¹ tÆ°Æ¡i', price: 195000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-529c1de12668.jpg', category: 'nhap-khau', unit: '250g', stock: 20, description: 'Viá»‡t quáº¥t Má»¹ tÆ°Æ¡i nháº­p kháº©u, giÃ u cháº¥t chá»‘ng oxy hÃ³a. Quáº£ tÆ°Æ¡i, khÃ´ng dáº­p, vá»‹ chua ngá»t dá»‹u.', origin: 'Má»¹', rating: 4.6, reviewCount: 98, badge: 'new', tags: ['viá»‡t quáº¥t', 'nháº­p kháº©u', 'tÆ°Æ¡i'] },
  { id: '10', name: 'Dá»©a máº­t Ninh BÃ¬nh', price: 35000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-3b9ed0557ede.jpg', category: 'trong-nuoc', unit: 'quáº£', stock: 90, description: 'Dá»©a máº­t Ninh BÃ¬nh Ä‘áº·c sáº£n, quáº£ to, lÃµi nhá», nhiá»u nÆ°á»›c, ngá»t thÆ¡m. KhÃ´ng chua, khÃ´ng xÆ¡.', origin: 'Ninh BÃ¬nh', rating: 4.5, reviewCount: 187, tags: ['dá»©a', 'trong nÆ°á»›c', 'Ä‘áº·c sáº£n'] },
  { id: '11', name: 'Giá» quÃ  trÃ¡i cÃ¢y cao cáº¥p', price: 650000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-1b5bf77b9c0f.jpg', category: 'gio-qua', unit: 'giá»', stock: 10, description: 'Giá» quÃ  trÃ¡i cÃ¢y cao cáº¥p gá»“m: nho Má»¹, cherry Má»¹, tÃ¡o Fuji, lÃª HÃ n Quá»‘c. ThÃ­ch há»£p lÃ m quÃ  biáº¿u táº·ng.', origin: 'Tá»•ng há»£p', rating: 4.9, reviewCount: 45, badge: 'hot', tags: ['giá» quÃ ', 'quÃ  táº·ng', 'cao cáº¥p'] },
  { id: '12', name: 'XoÃ i sáº¥y dáº»o', price: 85000, originalPrice: 100000, image: 'https://d2dmcrgjyyacvu.cloudfront.net/products/seed-b501e77c0959.jpg', category: 'ngu-qua', unit: '200g', stock: 150, description: 'XoÃ i sáº¥y dáº»o khÃ´ng Ä‘Æ°á»ng, giá»¯ nguyÃªn vá»‹ ngá»t tá»± nhiÃªn. KhÃ´ng cháº¥t báº£o quáº£n, an toÃ n cho sá»©c khá»e.', origin: 'Viá»‡t Nam', rating: 4.6, reviewCount: 234, badge: 'sale', tags: ['xoÃ i sáº¥y', 'sáº¥y khÃ´', 'Äƒn váº·t'] },
];

export const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', userId: '2', items: [{ product: MOCK_PRODUCTS[0], quantity: 2 }, { product: MOCK_PRODUCTS[2], quantity: 1 }], total: 445000, status: 'delivered', createdAt: '2026-04-05T10:00:00Z', address: '123 Nguyá»…n Huá»‡, Q1, TP.HCM', phone: '0901234567' },
  { id: 'ORD-002', userId: '2', items: [{ product: MOCK_PRODUCTS[1], quantity: 1 }], total: 320000, status: 'shipping', createdAt: '2026-04-05T14:30:00Z', address: '45 LÃª Lá»£i, Q1, TP.HCM', phone: '0912345678' },
  { id: 'ORD-003', userId: '2', items: [{ product: MOCK_PRODUCTS[5], quantity: 1 }], total: 850000, status: 'confirmed', createdAt: '2026-04-04T09:15:00Z', address: '78 Tráº§n HÆ°ng Äáº¡o, Q5, TP.HCM', phone: '0923456789' },
  { id: 'ORD-004', userId: '2', items: [{ product: MOCK_PRODUCTS[3], quantity: 2 }, { product: MOCK_PRODUCTS[4], quantity: 1 }], total: 235000, status: 'delivered', createdAt: '2026-04-04T16:00:00Z', address: '12 Nguyá»…n TrÃ£i, Q5, TP.HCM', phone: '0934567890' },
  { id: 'ORD-005', userId: '2', items: [{ product: MOCK_PRODUCTS[10], quantity: 1 }], total: 650000, status: 'pending', createdAt: '2026-04-03T11:30:00Z', address: '90 Äiá»‡n BiÃªn Phá»§, Q3, TP.HCM', phone: '0945678901' },
  { id: 'ORD-006', userId: '2', items: [{ product: MOCK_PRODUCTS[6], quantity: 2 }], total: 560000, status: 'cancelled', createdAt: '2026-04-03T08:00:00Z', address: '33 Hai BÃ  TrÆ°ng, Q1, TP.HCM', phone: '0956789012' },
  { id: 'ORD-007', userId: '2', items: [{ product: MOCK_PRODUCTS[7], quantity: 3 }, { product: MOCK_PRODUCTS[9], quantity: 2 }], total: 235000, status: 'delivered', createdAt: '2026-04-02T13:45:00Z', address: '56 LÃ½ ThÆ°á»ng Kiá»‡t, Q10, TP.HCM', phone: '0967890123' },
  { id: 'ORD-008', userId: '2', items: [{ product: MOCK_PRODUCTS[11], quantity: 2 }], total: 170000, status: 'delivered', createdAt: '2026-04-02T10:20:00Z', address: '18 CÃ¡ch Máº¡ng ThÃ¡ng 8, Q3, TP.HCM', phone: '0978901234' },
];
