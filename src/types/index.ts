
export type UserRole = 'admin' | 'customer';
export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  password?: string; // Password stored in plain text for this demo, not secure for production
  role: UserRole;
  name?: string;
  createdAt: string;
  lastLogin?: string;
  themePreference?: Theme;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id:string;
  name: string;
  description: string;
  imageUrl: string; // Primary image URL, mandatory
  imageUrls?: string[]; // Additional image URLs, up to 9
  price: number;
  stock: number;
  categoryId: string; // Ensure this links to a Category.id
  categoryName?: string; // For display convenience
  icon?: string | null; // CSS class name for the icon, or null
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
  price: number; // Price at the time of adding to cart
  name: string; // For display
  imageUrl?: string; // For display - will use product's primary imageUrl
  icon?: string | null; // For display
}

export interface Cart {
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceAtPurchase: number; // Price at the time of order
  name: string; // For display
  imageUrl?: string; // For display - will use product's primary imageUrl
  icon?: string | null; // For display
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Completed'; // Simulated status
  shippingAddress?: any; // Placeholder for shipping info
  paymentDetails?: any; // Placeholder for payment info
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
  userName: string; // Store userName at time of review for denormalization
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
  items: RecentlyViewedItem[]; // Store an array of product IDs, ordered by most recent
}
