-- ============================================================
-- PostgreSQL schema + seed data cho fruit-shop
-- File nay duoc PG container chay TU DONG khi init lan dau
-- (mount tai /docker-entrypoint-initdb.d/)
-- Khi postgres_data volume da co data thi se KHONG re-run
-- ============================================================

-- ─── SCHEMA ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'user'   CHECK (role   IN ('admin','user')),
  avatar        VARCHAR(500),
  status        VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  phone         VARCHAR(20),
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_count   INT          NOT NULL DEFAULT 0,
  total_spent   BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id        VARCHAR(36)  PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  icon      VARCHAR(50)  NOT NULL,
  slug      VARCHAR(100) NOT NULL UNIQUE,
  parent_id VARCHAR(36),
  level     SMALLINT     NOT NULL DEFAULT 1,
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS products (
  id             VARCHAR(36)   PRIMARY KEY,
  name_vi        VARCHAR(255)  NOT NULL,
  name_en        VARCHAR(255),
  name_key       VARCHAR(100),
  price          BIGINT        NOT NULL,
  original_price BIGINT,
  image          VARCHAR(500)  NOT NULL,
  images         JSONB,
  category       VARCHAR(100)  NOT NULL,
  unit           VARCHAR(50)   NOT NULL,
  stock          INT           NOT NULL DEFAULT 0,
  description    TEXT,
  origin         VARCHAR(255),
  rating         NUMERIC(3,2)  NOT NULL DEFAULT 5.00,
  review_count   INT           NOT NULL DEFAULT 0,
  badge          VARCHAR(10)   CHECK (badge IS NULL OR badge IN ('new','sale','hot')),
  tags           JSONB,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id          VARCHAR(50)  PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  items       JSONB        NOT NULL,
  total       BIGINT       NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','shipping','delivered','cancelled')),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  address     TEXT         NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id       ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ─── SEED: CATEGORIES ────────────────────────────────────────

INSERT INTO categories (id, name, icon, slug) VALUES
  ('1', 'Trái cây nhập khẩu',  '🍇', 'nhap-khau'),
  ('2', 'Trái cây trong nước', '🥭', 'trong-nuoc'),
  ('3', 'Ngũ quả',             '🍎', 'ngu-qua'),
  ('4', 'Giỏ quà trái cây',    '🧺', 'gio-qua'),
  ('5', 'Nước ép trái cây',    '🍊', 'nuoc-ep')
ON CONFLICT (id) DO NOTHING;

-- ─── SEED: USERS ─────────────────────────────────────────────
-- Demo accounts (passwords): admin123 / user123 / password123
-- Bcrypt hashes pre-computed (cost=10)

INSERT INTO users (id, name, email, password_hash, role, avatar, status, phone, created_at, order_count, total_spent) VALUES
  ('1', 'Admin',           'admin@fruitshop.vn',  '$2b$10$gj3gpTl9nEH88qlVwbbaUOQ/RTaPbV7gYSkjKSJ3ejWfZ/7DrGW3G', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',    'active',  '0901000001', '2024-01-01 00:00:00', 0,  0),
  ('2', 'Nguyễn Văn A',    'user@fruitshop.vn',   '$2b$10$XB2upxXvsDG.IEjzimoFouRzCJHk9jsR5Y99yjU96gOkYpMLVxuVu', 'user',  'https://api.dicebear.com/7.x/avataaars/svg?seed=user',     'active',  '0901234567', '2024-02-10 08:00:00', 8,  2450000),
  ('3', 'Trần Thị B',      'tranthib@gmail.com',  '$2b$10$k8CXsiMMM2/hiblAXT8KVe21hvb9PLnW1SaiffNCQwvpJnEO/HVdm', 'user',  'https://api.dicebear.com/7.x/avataaars/svg?seed=tranthib', 'active',  '0912345678', '2024-03-05 09:30:00', 5,  1890000),
  ('4', 'Lê Văn C',        'levanc@gmail.com',    '$2b$10$k8CXsiMMM2/hiblAXT8KVe21hvb9PLnW1SaiffNCQwvpJnEO/HVdm', 'user',  'https://api.dicebear.com/7.x/avataaars/svg?seed=levanc',   'blocked', '0923456789', '2024-03-12 14:00:00', 2,  640000),
  ('5', 'Phạm Thị D',      'phamthid@gmail.com',  '$2b$10$k8CXsiMMM2/hiblAXT8KVe21hvb9PLnW1SaiffNCQwvpJnEO/HVdm', 'user',  'https://api.dicebear.com/7.x/avataaars/svg?seed=phamthid', 'active',  '0934567890', '2024-04-01 10:00:00', 12, 5670000),
  ('6', 'Hoàng Văn E',     'hoangvane@gmail.com', '$2b$10$k8CXsiMMM2/hiblAXT8KVe21hvb9PLnW1SaiffNCQwvpJnEO/HVdm', 'user',  'https://api.dicebear.com/7.x/avataaars/svg?seed=hoangvane','active',  '0945678901', '2024-05-20 11:00:00', 3,  980000),
  ('7', 'Vũ Thị F',        'vuthif@gmail.com',    '$2b$10$k8CXsiMMM2/hiblAXT8KVe21hvb9PLnW1SaiffNCQwvpJnEO/HVdm', 'user',  'https://api.dicebear.com/7.x/avataaars/svg?seed=vuthif',   'blocked', '0956789012', '2024-06-08 13:30:00', 1,  320000),
  ('8', 'Đặng Văn G',      'dangvang@gmail.com',  '$2b$10$k8CXsiMMM2/hiblAXT8KVe21hvb9PLnW1SaiffNCQwvpJnEO/HVdm', 'user',  'https://api.dicebear.com/7.x/avataaars/svg?seed=dangvang', 'active',  '0967890123', '2025-01-15 08:00:00', 7,  3210000)
ON CONFLICT (id) DO NOTHING;

-- ─── SEED: PRODUCTS ──────────────────────────────────────────

INSERT INTO products (id, name_vi, name_en, name_key, price, original_price, image, images, category, unit, stock, description, origin, rating, review_count, badge, tags) VALUES
  ('1',  'Nho Mỹ đen không hạt',     'US Black Seedless Grapes',   'grape_black_seedless_us',   185000, 220000, 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=400&fit=crop', '["https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=800&h=800&fit=crop","https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=800&h=800&fit=crop"]'::jsonb, 'nhap-khau',  '500g',       50,  'Nho Mỹ đen không hạt nhập khẩu trực tiếp từ California. Quả to, ngọt, giòn, vỏ mỏng, không hạt. Giàu chất chống oxy hóa và vitamin C.', 'Mỹ',          4.8, 124, 'sale', '["nho","nhập khẩu","không hạt"]'::jsonb),
  ('2',  'Cherry Mỹ tươi',           'Fresh US Cherries',          'cherry_us_fresh',           320000, NULL,   'https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=400&h=400&fit=crop', NULL, 'nhap-khau',  '500g',       30,  'Cherry Mỹ tươi ngon, quả đỏ bóng, vị ngọt chua hài hòa. Nhập khẩu từ Washington State, loại premium.',                                  'Mỹ',          4.9, 89,  'hot',  '["cherry","nhập khẩu","tươi"]'::jsonb),
  ('3',  'Xoài cát Hòa Lộc',         'Hoa Loc Cat Mango',          'mango_hoa_loc',             75000,  90000,  'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop', NULL, 'trong-nuoc', 'kg',         100, 'Xoài cát Hòa Lộc - đặc sản Tiền Giang. Quả to, thịt vàng, ngọt thơm, ít xơ. Hái đúng độ chín.',                                         'Tiền Giang',  4.7, 256, 'sale', '["xoài","trong nước","đặc sản"]'::jsonb),
  ('4',  'Dâu tây Đà Lạt hữu cơ',    'Organic Da Lat Strawberry',  'strawberry_dalat_organic',  95000,  NULL,   'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400&h=400&fit=crop', NULL, 'ngu-qua',    '250g',       40,  'Dâu tây Đà Lạt trồng theo tiêu chuẩn hữu cơ, không thuốc trừ sâu. Quả đỏ đều, thơm ngọt tự nhiên.',                                     'Đà Lạt',      4.6, 178, 'new',  '["dâu tây","hữu cơ","Đà Lạt"]'::jsonb),
  ('5',  'Thanh long ruột đỏ',       'Red Dragon Fruit',           'dragon_fruit_red',          45000,  NULL,   'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=400&fit=crop', NULL, 'trong-nuoc', 'kg',         80,  'Thanh long ruột đỏ Long An, quả to đều, ruột đỏ đẹp, ngọt thanh mát. Giàu vitamin C và chất xơ.',                                       'Long An',     4.5, 312, NULL,   '["thanh long","trong nước"]'::jsonb),
  ('6',  'Sầu riêng Musang King',    'Musang King Durian',         'durian_musang_king',        850000, 950000, 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=400&h=400&fit=crop', NULL, 'nhap-khau',  'kg',         15,  'Sầu riêng Musang King Malaysia - giống sầu riêng ngon nhất thế giới. Cơm vàng, béo ngậy, vị đắng nhẹ đặc trưng.',                       'Malaysia',    4.9, 67,  'hot',  '["sầu riêng","nhập khẩu","musang king"]'::jsonb),
  ('7',  'Táo Fuji Nhật',            'Japanese Fuji Apple',        'apple_fuji_japan',          280000, NULL,   'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop', NULL, 'nhap-khau',  'hộp 6 quả',  25,  'Táo Fuji Nhật Bản chính hãng, quả tròn đều, vỏ đỏ bóng đẹp. Giòn, ngọt, thơm đặc trưng của táo Nhật.',                                  'Nhật Bản',    4.8, 145, NULL,   '["táo","nhập khẩu","nhật bản"]'::jsonb),
  ('8',  'Bơ booth 034',             'Booth 034 Avocado',          'avocado_booth_034',         55000,  65000,  'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=400&fit=crop', NULL, 'trong-nuoc', 'kg',         60,  'Bơ booth 034 Đắk Lắk, loại 1. Quả to, thịt vàng đậm, béo ngậy, không đắng. Hái đúng ngày chín.',                                        'Đắk Lắk',     4.7, 423, 'sale', '["bơ","trong nước","đắk lắk"]'::jsonb),
  ('9',  'Việt quất Mỹ tươi',        'Fresh US Blueberry',         'blueberry_us_fresh',        195000, NULL,   'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400&h=400&fit=crop', NULL, 'nhap-khau',  '250g',       20,  'Việt quất Mỹ tươi nhập khẩu, giàu chất chống oxy hóa. Quả tươi, không dập, vị chua ngọt dịu.',                                          'Mỹ',          4.6, 98,  'new',  '["việt quất","nhập khẩu","tươi"]'::jsonb),
  ('10', 'Dứa mật Ninh Bình',        'Ninh Binh Sweet Pineapple',  'pineapple_ninh_binh',       35000,  NULL,   'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&h=400&fit=crop', NULL, 'trong-nuoc', 'quả',        90,  'Dứa mật Ninh Bình đặc sản, quả to, lõi nhỏ, nhiều nước, ngọt thơm. Không chua, không xơ.',                                              'Ninh Bình',   4.5, 187, NULL,   '["dứa","trong nước","đặc sản"]'::jsonb),
  ('11', 'Giỏ quà trái cây cao cấp', 'Premium Fruit Gift Basket',  'gift_basket_premium',       650000, NULL,   'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop', NULL, 'gio-qua',    'giỏ',        10,  'Giỏ quà trái cây cao cấp gồm: nho Mỹ, cherry Mỹ, táo Fuji, lê Hàn Quốc. Thích hợp làm quà biếu tặng.',                                  'Tổng hợp',    4.9, 45,  'hot',  '["giỏ quà","quà tặng","cao cấp"]'::jsonb),
  ('12', 'Xoài sấy dẻo',             'Soft Dried Mango',           'mango_dried',               85000,  100000, 'https://images.unsplash.com/photo-1621955964441-c173e01c135b?w=400&h=400&fit=crop', NULL, 'ngu-qua',    '200g',       150, 'Xoài sấy dẻo không đường, giữ nguyên vị ngọt tự nhiên. Không chất bảo quản, an toàn cho sức khỏe.',                                     'Việt Nam',    4.6, 234, 'sale', '["xoài sấy","sấy khô","ăn vặt"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
