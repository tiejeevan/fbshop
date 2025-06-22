
// src/lib/dataService.ts
import type {
  User, Product, Category, Cart, Order, UserRole,
  WishlistItem, Review, RecentlyViewedItem, Address, ActivityLog, Theme, CartItem, OrderItem,
  Job, JobSettings, ChatMessage, JobReview, JobCategory, Notification, JobSavedItem
} from '@/types';

export interface IDataService {
  // Initialization
  initializeData: () => Promise<void>;

  // User methods
  getUsers: () => Promise<User[]>;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'role' | 'addresses' | 'themePreference'> & { role?: UserRole, themePreference?: Theme }) => Promise<User>;
  updateUser: (updatedUser: User) => Promise<User | null>;
  deleteUser: (userId: string) => Promise<boolean>;
  findUserByEmail: (email: string) => Promise<User | undefined>;
  findUserById: (userId: string) => Promise<User | undefined>;

  // User Address methods
  getUserAddresses: (userId: string) => Promise<Address[]>;
  addAddressToUser: (userId: string, addressData: Omit<Address, 'id' | 'userId' | 'isDefault'> & { isDefault?: boolean }) => Promise<Address | null>;
  updateUserAddress: (userId: string, updatedAddress: Address) => Promise<Address | null>;
  deleteUserAddress: (userId: string, addressId: string) => Promise<boolean>;
  setDefaultUserAddress: (userId: string, addressId: string) => Promise<void>;
  findUserAddressById: (userId: string, addressId: string) => Promise<Address | undefined>;

  // Product methods
  getProducts: () => Promise<Product[]>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'| 'views' | 'purchases' | 'averageRating' | 'reviewCount'>) => Promise<Product>;
  updateProduct: (updatedProduct: Product) => Promise<Product | null>;
  deleteProduct: (productId: string) => Promise<boolean>;
  findProductById: (productId: string) => Promise<Product | undefined>;

  // Category methods
  getCategories: () => Promise<Category[]>;
  addCategory: (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (updatedCategory: Category) => Promise<Category | null>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  findCategoryById: (categoryId: string | null) => Promise<Category | undefined>;
  getChildCategories: (parentId: string | null) => Promise<Category[]>;

  // Job Category methods
  getJobCategories: () => Promise<JobCategory[]>;
  addJobCategory: (categoryData: Omit<JobCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<JobCategory>;
  updateJobCategory: (updatedCategory: JobCategory) => Promise<JobCategory | null>;
  deleteJobCategory: (categoryId: string) => Promise<boolean>;
  findJobCategoryById: (categoryId: string | null) => Promise<JobCategory | undefined>;

  // Cart methods
  getCart: (userId: string) => Promise<Cart | null>;
  updateCart: (cart: Cart) => Promise<void>;
  clearCart: (userId: string) => Promise<void>;
  moveToSavedForLater: (userId: string, productId: string) => Promise<void>;
  moveToCartFromSaved: (userId: string, productId: string) => Promise<boolean>;
  removeFromSavedForLater: (userId: string, productId: string) => Promise<void>;

  // Order methods
  getOrders: (userId?: string) => Promise<Order[]>;
  addOrder: (orderData: Omit<Order, 'id' | 'orderDate'> & { userId: string }, actor: { id: string, email: string, role: UserRole }) => Promise<Order>;

  // Wishlist methods
  getWishlist: (userId: string) => Promise<WishlistItem[]>;
  addToWishlist: (userId: string, productId: string) => Promise<void>;
  removeFromWishlist: (userId: string, productId: string) => Promise<void>;
  isProductInWishlist: (userId: string, productId: string) => Promise<boolean>;

  // Review methods
  getReviewsForProduct: (productId: string) => Promise<Review[]>;
  addReview: (reviewData: Omit<Review, 'id' | 'createdAt'>) => Promise<Review>;
  deleteReview: (reviewId: string) => Promise<void>;

  // Recently Viewed
  getRecentlyViewed: (userId: string) => Promise<RecentlyViewedItem[]>;
  addRecentlyViewed: (userId: string, productId: string) => Promise<void>;
  
  // Theme
  getGlobalTheme: () => Promise<Theme>;
  setGlobalTheme: (theme: Theme) => Promise<void>;
  
  // Activity Logs (Unified System)
  getActivityLogs: (options?: { actorId?: string }) => Promise<ActivityLog[]>;
  addActivityLog: (logData: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;

  // Current User (Session management specific)
  setCurrentUser: (user: User | null) => void;
  getCurrentUser: () => (User & { role: UserRole }) | null;

  // Image handling methods (delegated to specific services like IndexedDB or Firebase Storage)
  saveImage: (entityId: string, imageType: string, imageFile: File) => Promise<string>;
  getImage: (imageId: string) => Promise<Blob | null>;
  deleteImage: (imageId: string) => Promise<void>;
  deleteImagesForEntity: (imageIds: string[]) => Promise<void>;

  // Job methods
  getJobs: (options?: { userId?: string; status?: Job['status']; createdById?: string; acceptedById?: string; }) => Promise<Job[]>;
  addJob: (jobData: Omit<Job, 'id' | 'createdAt' | 'createdByName' | 'creatorHasReviewed' | 'acceptorHasReviewed'| 'imageUrls' | 'categoryName'>, images?: File[]) => Promise<Job>;
  updateJob: (updatedJob: Partial<Job> & { id: string }) => Promise<Job | null>;
  deleteJob: (jobId: string) => Promise<boolean>;
  findJobById: (jobId: string) => Promise<Job | undefined>;
  acceptJob: (jobId: string, acceptingUserId: string, acceptingUserName: string) => Promise<Job | null>;

  // Job Chat Methods
  getChatForJob: (jobId: string) => Promise<ChatMessage[]>;
  sendMessage: (jobId: string, messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'jobId'>) => Promise<ChatMessage>;

  // Job Review Methods
  addJobReview: (reviewData: Omit<JobReview, 'id' | 'createdAt'>) => Promise<JobReview>;
  getReviewsForJob: (jobId: string) => Promise<JobReview[]>;
  getReviewsForJobs: (jobIds: string[]) => Promise<JobReview[]>;
  getReviewsAboutUser: (userId: string) => Promise<JobReview[]>;

  // Job Settings methods
  getJobSettings: () => Promise<JobSettings>;
  updateJobSettings: (settings: JobSettings) => Promise<JobSettings>;
  
  // Notification methods
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<Notification>;
  getNotifications: (userId: string) => Promise<Notification[]>;
  markNotificationAsRead: (userId: string, notificationId: string) => Promise<boolean>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;

  // Saved Jobs methods
  getSavedJobs: (userId: string) => Promise<JobSavedItem[]>;
  addToSavedJobs: (userId: string, jobId: string) => Promise<void>;
  removeFromSavedJobs: (userId: string, jobId: string) => Promise<void>;
  isJobInSavedList: (userId: string, jobId: string) => Promise<boolean>;
}
