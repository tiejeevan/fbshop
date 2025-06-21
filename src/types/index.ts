

export type UserRole = 'admin' | 'customer';
export type Theme = 'light' | 'dark' | 'system';
export type DataSourceType = 'local' | 'firebase';

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
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  lastLogin?: string; // ISO Date string
  themePreference?: Theme;
  addresses?: Address[];
  averageJobRating?: number;
  jobReviewCount?: number;
  skills?: string[];
  badges?: string[];
  jobsCreatedCount?: number;
  jobsCompletedCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  imageId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
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
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  views: number;
  purchases: number;
  averageRating: number;
  reviewCount: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number; // Price at the time of adding to cart (could differ from current product price)
  name: string;
  primaryImageId?: string | null;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  savedForLaterItems?: CartItem[]; // Added for "Save for Later"
  updatedAt: string; // ISO Date string
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
  orderDate: string; // ISO Date string
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Completed';
  shippingAddress: Address; // Embed the address directly
  paymentDetails?: any; // e.g., { method: 'Card', transactionId: '...' }
}

export interface WishlistItem {
  userId: string;
  productId: string;
  addedAt: string; // ISO Date string
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string; // Denormalized for easier display
  rating: number;
  comment: string;
  createdAt: string; // ISO Date string
}

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: string; // ISO Date string
}

export interface UserRecentlyViewed {
  userId: string;
  items: RecentlyViewedItem[];
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  actionType: string;
  entityType?: string;
  entityId?: string;
  description: string;
  details?: Record<string, any>;
  timestamp: string; // ISO Date string
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'accepted' | 'completed' | 'expired';
  compensationAmount?: number;
  location?: string;
  preferredDate?: string; // ISO Date string
  estimatedDurationHours?: number;
  createdById: string;
  createdByName: string;
  createdAt: string; // ISO Date string
  expiresAt: string; // ISO Date string
  acceptedById?: string | null;
  acceptedByName?: string | null;
  acceptedAt?: string | null; // ISO Date string
  creatorHasReviewed?: boolean; // Did the creator leave a review for the acceptor?
  acceptorHasReviewed?: boolean; // Did the acceptor leave a review for the creator?
  imageUrls?: string[];
  categoryId?: string;
  categoryName?: string; // For display
  isUrgent?: boolean;
  isVerified?: boolean;
}

export interface ChatMessage {
  id: string;
  jobId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string; // ISO Date string
}

export interface JobSettings {
  maxJobsPerUser: number;
  maxTimerDurationDays: number;
}

export interface JobReview {
  id: string;
  jobId: string;
  reviewerId: string; // The user who is writing the review
  reviewerName: string;
  revieweeId: string; // The user being reviewed
  revieweeName: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: string; // ISO Date string
}

export interface Notification {
  id: string;
  userId: string; // The user who this notification is for
  message: string;
  link: string; // URL to navigate to when clicked
  isRead: boolean;
  createdAt: string; // ISO Date string
  type: 'job_accepted' | 'new_message' | 'job_completed' | 'job_expired' | 'generic';
}

export interface JobSavedItem {
  userId: string;
  jobId: string;
  addedAt: string; // ISO Date string
}
