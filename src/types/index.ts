
export type UserRole = 'admin' | 'customer';
export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  name?: string;
  createdAt: string;
  lastLogin?: string;
  themePreference?: Theme;
}

export interface Category {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier, now mandatory
  description?: string;
  parentId: string | null; // For subcategories, now mandatory (null for top-level)
  imageId: string | null; // For category image (ID for IndexedDB)
  displayOrder: number; // For custom sorting, now mandatory
  isActive: boolean; // To toggle visibility, now mandatory
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id:string;
  name: string;
  description: string;
  primaryImageId?: string | null; // ID for IndexedDB
  additionalImageIds?: string[];  // IDs for IndexedDB
  price: number;
  stock: number;
  categoryId: string;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  purchases: number;
  averageRating?: number;
  reviewCount?: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  primaryImageId?: string | null; // For display, ID for IndexedDB
}

export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  name: string;
  primaryImageId?: string | null; // For display, ID for IndexedDB
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Completed';
  shippingAddress?: any;
  paymentDetails?: any;
}

export interface LoginActivity {
  id: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  type: 'login' | 'logout';
}

export interface WishlistItem {
  userId: string;
  productId: string;
  addedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: string;
}

export interface UserRecentlyViewed {
  userId: string;
  items: RecentlyViewedItem[];
}

