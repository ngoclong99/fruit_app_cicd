import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '@/db';

async function seed() {
  console.log('Seeding database...');

  // Categories
  const categories = [
    { id: '1', name: 'Trái cây nhập khẩu', icon: '🍇', slug: 'nhap-khau' },
    { id: '2', name: 'Trái cây trong nước', icon: '🥭', slug: 'trong-nuoc' },
    { id: '3', name: 'Ngũ quả', icon: '🍎', slug: 'ngu-qua' },
    { id: '4', name: 'Giỏ quà trái cây', icon: '🧺', slug: 'gio-qua' },
    { id: '5', name: 'Nước ép trái cây', icon: '🍊', slug: 'nuoc-ep' },
  ];
  for (const c of categories) {
    await pool.query(
      'INSERT INTO categories (id, name, icon, slug) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [c.id, c.name, c.icon, c.slug]
    );
  }
  console.log('✓ Categories');

  // Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);
  const defaultHash = await bcrypt.hash('password123', 10);
  const users = [
    { id: '1', name: 'Admin', email: 'admin@fruitshop.vn', hash: adminHash, role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', status: 'active', phone: '0901000001', createdAt: '2024-01-01 00:00:00', orderCount: 0, totalSpent: 0 },
    { id: '2', name: 'Nguyễn Văn A', email: 'user@fruitshop.vn', hash: userHash, role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user', status: 'active', phone: '0901234567', createdAt: '2024-02-10 08:00:00', orderCount: 8, totalSpent: 2450000 },
    { id: '3', name: 'Trần Thị B', email: 'tranthib@gmail.com', hash: defaultHash, role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tranthib', status: 'active', phone: '0912345678', createdAt: '2024-03-05 09:30:00', orderCount: 5, totalSpent: 1890000 },
    { id: '4', name: 'Lê Văn C', email: 'levanc@gmail.com', hash: defaultHash, role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=levanc', status: 'blocked', phone: '0923456789', createdAt: '2024-03-12 14:00:00', orderCount: 2, totalSpent: 640000 },
    { id: '5', name: 'Phạm Thị D', email: 'phamthid@gmail.com', hash: defaultHash, role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=phamthid', status: 'active', phone: '0934567890', createdAt: '2024-04-01 10:00:00', orderCount: 12, totalSpent: 5670000 },
    { id: '6', name: 'Hoàng Văn E', email: 'hoangvane@gmail.com', hash: defaultHash, role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hoangvane', status: 'active', phone: '0945678901', createdAt: '2024-05-20 11:00:00', orderCount: 3, totalSpent: 980000 },
    { id: '7', name: 'Vũ Thị F', email: 'vuthif@gmail.com', hash: defaultHash, role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vuthif', status: 'blocked', phone: '0956789012', createdAt: '2024-06-08 13:30:00', orderCount: 1, totalSpent: 320000 },
    { id: '8', name: 'Đặng Văn G', email: 'dangvang@gmail.com', hash: defaultHash, role: 'user', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dangvang', status: 'active', phone: '0967890123', createdAt: '2025-01-15 08:00:00', orderCount: 7, totalSpent: 3210000 },
  ];
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, avatar, status, phone, created_at, order_count, total_spent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.name, u.email, u.hash, u.role, u.avatar, u.status, u.phone, u.createdAt, u.orderCount, u.totalSpent]
    );
  }
  console.log('✓ Users');

  // Products (su dung name_vi/name_en/name_key theo schema moi)
  const products = [
    { id: '1', nameVi: 'Nho Mỹ đen không hạt', nameEn: 'US Black Seedless Grapes', nameKey: 'grape_black_seedless_us', price: 185000, originalPrice: 220000, image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=400&fit=crop', images: ['https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=800&h=800&fit=crop', 'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=800&h=800&fit=crop'], category: 'nhap-khau', unit: '500g', stock: 50, description: 'Nho Mỹ đen không hạt nhập khẩu trực tiếp từ California. Quả to, ngọt, giòn, vỏ mỏng, không hạt. Giàu chất chống oxy hóa và vitamin C.', origin: 'Mỹ', rating: 4.8, reviewCount: 124, badge: 'sale', tags: ['nho', 'nhập khẩu', 'không hạt'] },
    { id: '2', nameVi: 'Cherry Mỹ tươi', nameEn: 'Fresh US Cherries', nameKey: 'cherry_us_fresh', price: 320000, originalPrice: null, image: 'https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=400&h=400&fit=crop', images: null, category: 'nhap-khau', unit: '500g', stock: 30, description: 'Cherry Mỹ tươi ngon, quả đỏ bóng, vị ngọt chua hài hòa. Nhập khẩu từ Washington State, loại premium.', origin: 'Mỹ', rating: 4.9, reviewCount: 89, badge: 'hot', tags: ['cherry', 'nhập khẩu', 'tươi'] },
    { id: '3', nameVi: 'Xoài cát Hòa Lộc', nameEn: 'Hoa Loc Cat Mango', nameKey: 'mango_hoa_loc', price: 75000, originalPrice: 90000, image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop', images: null, category: 'trong-nuoc', unit: 'kg', stock: 100, description: 'Xoài cát Hòa Lộc - đặc sản Tiền Giang. Quả to, thịt vàng, ngọt thơm, ít xơ. Hái đúng độ chín.', origin: 'Tiền Giang', rating: 4.7, reviewCount: 256, badge: 'sale', tags: ['xoài', 'trong nước', 'đặc sản'] },
    { id: '4', nameVi: 'Dâu tây Đà Lạt hữu cơ', nameEn: 'Organic Da Lat Strawberry', nameKey: 'strawberry_dalat_organic', price: 95000, originalPrice: null, image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400&h=400&fit=crop', images: null, category: 'ngu-qua', unit: '250g', stock: 40, description: 'Dâu tây Đà Lạt trồng theo tiêu chuẩn hữu cơ, không thuốc trừ sâu. Quả đỏ đều, thơm ngọt tự nhiên.', origin: 'Đà Lạt', rating: 4.6, reviewCount: 178, badge: 'new', tags: ['dâu tây', 'hữu cơ', 'Đà Lạt'] },
    { id: '5', nameVi: 'Thanh long ruột đỏ', nameEn: 'Red Dragon Fruit', nameKey: 'dragon_fruit_red', price: 45000, originalPrice: null, image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=400&fit=crop', images: null, category: 'trong-nuoc', unit: 'kg', stock: 80, description: 'Thanh long ruột đỏ Long An, quả to đều, ruột đỏ đẹp, ngọt thanh mát. Giàu vitamin C và chất xơ.', origin: 'Long An', rating: 4.5, reviewCount: 312, badge: null, tags: ['thanh long', 'trong nước'] },
    { id: '6', nameVi: 'Sầu riêng Musang King', nameEn: 'Musang King Durian', nameKey: 'durian_musang_king', price: 850000, originalPrice: 950000, image: 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=400&h=400&fit=crop', images: null, category: 'nhap-khau', unit: 'kg', stock: 15, description: 'Sầu riêng Musang King Malaysia - giống sầu riêng ngon nhất thế giới. Cơm vàng, béo ngậy, vị đắng nhẹ đặc trưng.', origin: 'Malaysia', rating: 4.9, reviewCount: 67, badge: 'hot', tags: ['sầu riêng', 'nhập khẩu', 'musang king'] },
    { id: '7', nameVi: 'Táo Fuji Nhật', nameEn: 'Japanese Fuji Apple', nameKey: 'apple_fuji_japan', price: 280000, originalPrice: null, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop', images: null, category: 'nhap-khau', unit: 'hộp 6 quả', stock: 25, description: 'Táo Fuji Nhật Bản chính hãng, quả tròn đều, vỏ đỏ bóng đẹp. Giòn, ngọt, thơm đặc trưng của táo Nhật.', origin: 'Nhật Bản', rating: 4.8, reviewCount: 145, badge: null, tags: ['táo', 'nhập khẩu', 'nhật bản'] },
    { id: '8', nameVi: 'Bơ booth 034', nameEn: 'Booth 034 Avocado', nameKey: 'avocado_booth_034', price: 55000, originalPrice: 65000, image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=400&fit=crop', images: null, category: 'trong-nuoc', unit: 'kg', stock: 60, description: 'Bơ booth 034 Đắk Lắk, loại 1. Quả to, thịt vàng đậm, béo ngậy, không đắng. Hái đúng ngày chín.', origin: 'Đắk Lắk', rating: 4.7, reviewCount: 423, badge: 'sale', tags: ['bơ', 'trong nước', 'đắk lắk'] },
    { id: '9', nameVi: 'Việt quất Mỹ tươi', nameEn: 'Fresh US Blueberry', nameKey: 'blueberry_us_fresh', price: 195000, originalPrice: null, image: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400&h=400&fit=crop', images: null, category: 'nhap-khau', unit: '250g', stock: 20, description: 'Việt quất Mỹ tươi nhập khẩu, giàu chất chống oxy hóa. Quả tươi, không dập, vị chua ngọt dịu.', origin: 'Mỹ', rating: 4.6, reviewCount: 98, badge: 'new', tags: ['việt quất', 'nhập khẩu', 'tươi'] },
    { id: '10', nameVi: 'Dứa mật Ninh Bình', nameEn: 'Ninh Binh Sweet Pineapple', nameKey: 'pineapple_ninh_binh', price: 35000, originalPrice: null, image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&h=400&fit=crop', images: null, category: 'trong-nuoc', unit: 'quả', stock: 90, description: 'Dứa mật Ninh Bình đặc sản, quả to, lõi nhỏ, nhiều nước, ngọt thơm. Không chua, không xơ.', origin: 'Ninh Bình', rating: 4.5, reviewCount: 187, badge: null, tags: ['dứa', 'trong nước', 'đặc sản'] },
    { id: '11', nameVi: 'Giỏ quà trái cây cao cấp', nameEn: 'Premium Fruit Gift Basket', nameKey: 'gift_basket_premium', price: 650000, originalPrice: null, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop', images: null, category: 'gio-qua', unit: 'giỏ', stock: 10, description: 'Giỏ quà trái cây cao cấp gồm: nho Mỹ, cherry Mỹ, táo Fuji, lê Hàn Quốc. Thích hợp làm quà biếu tặng.', origin: 'Tổng hợp', rating: 4.9, reviewCount: 45, badge: 'hot', tags: ['giỏ quà', 'quà tặng', 'cao cấp'] },
    { id: '12', nameVi: 'Xoài sấy dẻo', nameEn: 'Soft Dried Mango', nameKey: 'mango_dried', price: 85000, originalPrice: 100000, image: 'https://images.unsplash.com/photo-1621955964441-c173e01c135b?w=400&h=400&fit=crop', images: null, category: 'ngu-qua', unit: '200g', stock: 150, description: 'Xoài sấy dẻo không đường, giữ nguyên vị ngọt tự nhiên. Không chất bảo quản, an toàn cho sức khỏe.', origin: 'Việt Nam', rating: 4.6, reviewCount: 234, badge: 'sale', tags: ['xoài sấy', 'sấy khô', 'ăn vặt'] },
  ];
  for (const p of products) {
    await pool.query(
      `INSERT INTO products (id, name_vi, name_en, name_key, price, original_price, image, images, category, unit, stock, description, origin, rating, review_count, badge, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb) ON CONFLICT (id) DO NOTHING`,
      [
        p.id, p.nameVi, p.nameEn, p.nameKey, p.price, p.originalPrice,
        p.image, p.images ? JSON.stringify(p.images) : null,
        p.category, p.unit, p.stock, p.description, p.origin,
        p.rating, p.reviewCount, p.badge,
        p.tags ? JSON.stringify(p.tags) : null,
      ]
    );
  }
  console.log('✓ Products');

  // Helper to get product snapshot by id (for orders' items JSON)
  const getProduct = (id: string) => {
    const p = products.find((x) => x.id === id)!;
    return {
      id: p.id, name: p.nameVi, price: p.price, originalPrice: p.originalPrice,
      image: p.image, category: p.category, unit: p.unit, stock: p.stock,
      description: p.description, origin: p.origin, rating: p.rating, reviewCount: p.reviewCount,
      badge: p.badge, tags: p.tags ?? undefined,
    };
  };

  // Orders
  const orders = [
    { id: 'ORD-001', userId: '2', items: [{ product: getProduct('1'), quantity: 2 }, { product: getProduct('3'), quantity: 1 }], total: 445000, status: 'delivered', createdAt: '2026-04-05 10:00:00', address: '123 Nguyễn Huệ, Q1, TP.HCM', phone: '0901234567', note: null },
    { id: 'ORD-002', userId: '2', items: [{ product: getProduct('2'), quantity: 1 }], total: 320000, status: 'shipping', createdAt: '2026-04-05 14:30:00', address: '45 Lê Lợi, Q1, TP.HCM', phone: '0912345678', note: null },
    { id: 'ORD-003', userId: '2', items: [{ product: getProduct('6'), quantity: 1 }], total: 850000, status: 'confirmed', createdAt: '2026-04-04 09:15:00', address: '78 Trần Hưng Đạo, Q5, TP.HCM', phone: '0923456789', note: null },
    { id: 'ORD-004', userId: '2', items: [{ product: getProduct('4'), quantity: 2 }, { product: getProduct('5'), quantity: 1 }], total: 235000, status: 'delivered', createdAt: '2026-04-04 16:00:00', address: '12 Nguyễn Trãi, Q5, TP.HCM', phone: '0934567890', note: null },
    { id: 'ORD-005', userId: '2', items: [{ product: getProduct('11'), quantity: 1 }], total: 650000, status: 'pending', createdAt: '2026-04-03 11:30:00', address: '90 Điện Biên Phủ, Q3, TP.HCM', phone: '0945678901', note: null },
    { id: 'ORD-006', userId: '2', items: [{ product: getProduct('7'), quantity: 2 }], total: 560000, status: 'cancelled', createdAt: '2026-04-03 08:00:00', address: '33 Hai Bà Trưng, Q1, TP.HCM', phone: '0956789012', note: null },
    { id: 'ORD-007', userId: '2', items: [{ product: getProduct('8'), quantity: 3 }, { product: getProduct('10'), quantity: 2 }], total: 235000, status: 'delivered', createdAt: '2026-04-02 13:45:00', address: '56 Lý Thường Kiệt, Q10, TP.HCM', phone: '0967890123', note: null },
    { id: 'ORD-008', userId: '2', items: [{ product: getProduct('12'), quantity: 2 }], total: 170000, status: 'delivered', createdAt: '2026-04-02 10:20:00', address: '18 Cách Mạng Tháng 8, Q3, TP.HCM', phone: '0978901234', note: null },
  ];
  for (const o of orders) {
    await pool.query(
      `INSERT INTO orders (id, user_id, items, total, status, created_at, address, phone, note)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [o.id, o.userId, JSON.stringify(o.items), o.total, o.status, o.createdAt, o.address, o.phone, o.note]
    );
  }
  console.log('✓ Orders');

  await pool.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
