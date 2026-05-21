export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  status?: 'active' | 'blocked';
  phone?: string;
  createdAt?: string;
  orderCount?: number;
  totalSpent?: number;
}

export interface Product {
  id: string;
  name: string;
  nameVi?: string;
  nameEn?: string;
  nameKey?: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  unit: string;
  stock: number;
  description: string;
  origin: string;
  rating: number;
  reviewCount: number;
  badge?: 'new' | 'sale' | 'hot';
  tags?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  address: string;
  phone: string;
  note?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  parentId?: string | null;
  level?: number;
  children?: Category[];
}
