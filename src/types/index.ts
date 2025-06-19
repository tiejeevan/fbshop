
export type UserRole = 'admin' | 'customer';
export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  password?: string; // Optional for display/update, required for creation
  role: UserRole;
  name?: string;
  createdAt: string;
  updatedAt: string; // Added for consistency
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
  primaryImageId: string | null; // Changed from optional to nullable
  additionalImageIds: string[];  // Changed from optional to mandatory (can be empty array)
  price: number;
  stock: number;
  categoryId: string;
  categoryName?: string; // For display purposes, not stored directly
  createdAt: string;
  updatedAt: string;
  views: number;
  purchases: number;
  averageRating: number; // Ensure it's always present
  reviewCount: number;   // Ensure it's always present
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
  actionType: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
  description: string; // This will now hold more detailed information
}
    