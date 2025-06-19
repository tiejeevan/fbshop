
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
  slug: string; 
  description?: string;
  parentId: string | null; 
  imageId: string | null; 
  displayOrder: number; 
  isActive: boolean; 
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id:string;
  name: string;
  description: string;
  primaryImageId?: string | null; 
  additionalImageIds?: string[];  
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
  primaryImageId?: string | null; 
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
  primaryImageId?: string | null; 
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
  rating: number; 
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

export interface AdminActionLog {
  id: string;
  adminId: string;
  adminEmail: string;
  actionType: string; // e.g., 'PRODUCT_CREATE', 'CATEGORY_UPDATE', 'USER_DELETE'
  entityType?: string; // e.g., 'Product', 'Category', 'User'
  entityId?: string;   // ID of the affected entity
  timestamp: string;   // ISO date string
  description: string; // Human-readable description of the action
  // details?: any;     // Optional: for storing old/new values, complex for now
}
