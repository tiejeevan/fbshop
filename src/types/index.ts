
export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  email: string;
  password?: string; // Password stored in plain text for this demo, not secure for production
  role: UserRole;
  name?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  stock: number;
  categoryId: string; // Ensure this links to a Category.id
  categoryName?: string; // For display convenience
  icon?: string | null; // Name of the lucide-icon, can be null
  createdAt: string;
  updatedAt: string;
  views: number;
  purchases: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number; // Price at the time of adding to cart
  name: string; // For display
  imageUrl?: string; // For display
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
