
export type UserRole = 'admin' | 'customer';
export type Theme = 'light' | 'dark' | 'system';

export interface Address {
  id: string;
  userId: string; // To associate address with user
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  password?: string; // Optional for display/update, required for creation
  role: UserRole;
  name?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  themePreference?: Theme;
  addresses?: Address[]; // New field for address book
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
  primaryImageId: string | null;
  additionalImageIds: string[];
  price: number;
  stock: number;
  categoryId: string;
  categoryName?: string; // For display purposes, not stored directly
  createdAt: string;
  updatedAt: string;
  views: number;
  purchases: number;
  averageRating: number;
  reviewCount: number;
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
  shippingAddress: Address; // Changed from any to Address
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
  description: string;
}
    