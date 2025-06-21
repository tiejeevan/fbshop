
// src/lib/localStorageDataService.ts
'use client';

import type {
  User, Product, Category, Cart, Order, LoginActivity, UserRole,
  WishlistItem, Review, RecentlyViewedItem, Address, AdminActionLog, Theme, CartItem, OrderItem,
  Job, JobSettings
} from '@/types';
import {
    saveImage as saveImageToDB,
    getImage as getImageFromDB,
    deleteImage as deleteImageFromDB,
    deleteImagesForProduct as deleteImagesForEntityFromDB,
    addAdminActionLogToDB,
    getAdminActionLogsFromDB
} from './indexedDbService';
import type { IDataService } from './dataService';
import { simpleUUID } from '@/lib/utils';

const KEYS = {
  USERS: 'localcommerce_users',
  PRODUCTS: 'localcommerce_products',
  CATEGORIES: 'localcommerce_categories',
  CARTS: 'localcommerce_carts',
  ORDERS: 'localcommerce_orders',
  LOGIN_ACTIVITY: 'localcommerce_login_activity',
  CURRENT_USER: 'localcommerce_current_user',
  WISHLISTS: 'localcommerce_wishlists',
  REVIEWS: 'localcommerce_reviews',
  RECENTLY_VIEWED: 'localcommerce_recently_viewed',
  THEME: 'localcommerce_theme',
  JOBS: 'localcommerce_jobs',
  JOB_SETTINGS: 'localcommerce_job_settings',
};

function getItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage`, error);
    return null;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage: `, error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      alert('Local storage quota exceeded. Please ensure product metadata is concise.');
    }
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}

let isDataInitialized = false;

const localStorageDataService: IDataService = {
  async initializeData(): Promise<void> {
    if (typeof window === 'undefined' || isDataInitialized) {
      return;
    }
    
    // Default User
    let users = getItem<User[]>(KEYS.USERS) || [];
    if (!users.find(u => u.email === 'admin@localcommerce.com')) {
        users.push({ id: simpleUUID(), email: 'admin@localcommerce.com', password: 'password', role: 'admin', name: 'Administrator', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), themePreference: 'system', addresses: [], });
        setItem(KEYS.USERS, users);
    }
    
    // Default Categories
    if (!getItem(KEYS.CATEGORIES)) {
        const mockCategoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
            { name: 'Electronics', slug: 'electronics', description: 'Gadgets, devices, and more.', parentId: null, imageId: null, displayOrder: 1, isActive: true },
            { name: 'Books', slug: 'books', description: 'Fiction, non-fiction, and educational.', parentId: null, imageId: null, displayOrder: 2, isActive: true },
        ];
        const categories = mockCategoryData.map(c => ({...c, id: simpleUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}));
        setItem(KEYS.CATEGORIES, categories);
    }

    // Other keys
    if (!getItem(KEYS.PRODUCTS)) setItem(KEYS.PRODUCTS, []);
    if (!getItem(KEYS.CARTS)) setItem(KEYS.CARTS, []);
    if (!getItem(KEYS.ORDERS)) setItem(KEYS.ORDERS, []);
    if (!getItem(KEYS.LOGIN_ACTIVITY)) setItem(KEYS.LOGIN_ACTIVITY, []);
    if (!getItem(KEYS.WISHLISTS)) setItem(KEYS.WISHLISTS, []);
    if (!getItem(KEYS.REVIEWS)) setItem(KEYS.REVIEWS, []);
    if (!getItem(KEYS.RECENTLY_VIEWED)) setItem(KEYS.RECENTLY_VIEWED, []);
    if (!getItem(KEYS.THEME)) setItem(KEYS.THEME, 'system');
    if (!getItem(KEYS.JOBS)) setItem(KEYS.JOBS, []);
    if (!getItem(KEYS.JOB_SETTINGS)) setItem(KEYS.JOB_SETTINGS, { maxJobsPerUser: 5, maxTimerDurationDays: 10 });
    
    isDataInitialized = true;
  },

  async getUsers(): Promise<User[]> { return getItem<User[]>(KEYS.USERS) || []; },
  async addUser(userData): Promise<User> {
    const users = await this.getUsers();
    const now = new Date().toISOString();
    const newUser: User = {
      ...userData,
      id: simpleUUID(),
      createdAt: now,
      updatedAt: now,
      role: userData.role || 'customer',
      themePreference: userData.themePreference || 'system',
      addresses: [],
    };
    users.push(newUser);
    setItem(KEYS.USERS, users);
    return newUser;
  },
  async updateUser(updatedUser: User): Promise<User | null> {
    let users = await this.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        ...updatedUser,
        password: updatedUser.password || users[index].password,
        themePreference: updatedUser.themePreference || users[index].themePreference || 'system',
        updatedAt: new Date().toISOString(),
        addresses: updatedUser.addresses || users[index].addresses || [],
      };
      setItem(KEYS.USERS, users);
      const sessionUser = this.getCurrentUser();
      if (sessionUser && sessionUser.id === updatedUser.id) {
        this.setCurrentUser(users[index]);
      }
      return users[index];
    }
    return null;
  },
  async deleteUser(userId: string): Promise<boolean> {
    let users = await this.getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);
    if (users.length < initialLength) {
      setItem(KEYS.USERS, users);
      return true;
    }
    return false;
  },
  async findUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.email === email);
  },
  async findUserById(userId: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === userId);
  },
  async getUserAddresses(userId: string): Promise<Address[]> {
    const user = await this.findUserById(userId);
    return user?.addresses || [];
  },
  async addAddressToUser(userId, addressData): Promise<Address | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    const newAddress: Address = { ...addressData, id: simpleUUID(), userId, isDefault: addressData.isDefault || false };
    user.addresses = user.addresses || [];
    if (newAddress.isDefault) user.addresses.forEach(addr => addr.isDefault = false);
    else if (user.addresses.length === 0) newAddress.isDefault = true;
    user.addresses.push(newAddress);
    await this.updateUser(user);
    return newAddress;
  },
  async updateUserAddress(userId, updatedAddress): Promise<Address | null> {
    const user = await this.findUserById(userId);
    if (!user || !user.addresses) return null;
    const addressIndex = user.addresses.findIndex(addr => addr.id === updatedAddress.id);
    if (addressIndex === -1) return null;
    if (updatedAddress.isDefault) user.addresses.forEach(addr => addr.isDefault = false);
    user.addresses[addressIndex] = updatedAddress;
    if (!user.addresses.some(addr => addr.isDefault) && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await this.updateUser(user);
    return updatedAddress;
  },
  async deleteUserAddress(userId, addressId): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user || !user.addresses) return false;
    const initialLength = user.addresses.length;
    const addressToDelete = user.addresses.find(addr => addr.id === addressId);
    user.addresses = user.addresses.filter(addr => addr.id !== addressId);
    if (user.addresses.length < initialLength) {
        if (addressToDelete?.isDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
        await this.updateUser(user);
        return true;
    }
    return false;
  },
  async setDefaultUserAddress(userId, addressId): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user || !user.addresses) return;
    user.addresses.forEach(addr => { addr.isDefault = addr.id === addressId; });
    await this.updateUser(user);
  },
  async findUserAddressById(userId, addressId): Promise<Address | undefined> {
      const user = await this.findUserById(userId);
      return user?.addresses?.find(addr => addr.id === addressId);
  },
  async getProducts(): Promise<Product[]> { return getItem<Product[]>(KEYS.PRODUCTS) || []; },
  async addProduct(productData): Promise<Product> {
    const products = await this.getProducts();
    const now = new Date().toISOString();
    const newProduct: Product = { ...productData, id: simpleUUID(), primaryImageId: productData.primaryImageId || null, additionalImageIds: (productData.additionalImageIds || []), createdAt: now, updatedAt: now, views: 0, purchases: 0, averageRating: 0, reviewCount: 0 };
    products.push(newProduct);
    setItem(KEYS.PRODUCTS, products);
    return newProduct;
  },
  async updateProduct(updatedProduct): Promise<Product | null> {
    let products = await this.getProducts();
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updatedProduct, primaryImageId: updatedProduct.primaryImageId || null, additionalImageIds: (updatedProduct.additionalImageIds || []), updatedAt: new Date().toISOString() };
      setItem(KEYS.PRODUCTS, products);
      return products[index];
    }
    return null;
  },
  async deleteProduct(productId): Promise<boolean> {
    let products = await this.getProducts();
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete) return false;
    const initialLength = products.length;
    products = products.filter(p => p.id !== productId);
    if (products.length < initialLength) {
      setItem(KEYS.PRODUCTS, products);
      const imageIdsToDelete = [productToDelete.primaryImageId, ...(productToDelete.additionalImageIds || [])].filter(id => !!id) as string[];
      if (imageIdsToDelete.length > 0) await this.deleteImagesForEntity(imageIdsToDelete);
      let reviews = await this.getReviewsForProduct(productId);
      for (const review of reviews) await this.deleteReview(review.id);
      return true;
    }
    return false;
  },
  async findProductById(productId): Promise<Product | undefined> { return (await this.getProducts()).find(p => p.id === productId); },
  async getCategories(): Promise<Category[]> { return (getItem<Category[]>(KEYS.CATEGORIES) || []).sort((a, b) => a.displayOrder - b.displayOrder); },
  async addCategory(categoryData): Promise<Category> {
    const categories = await this.getCategories();
    const now = new Date().toISOString();
    const newCategory: Category = { id: `cat_${categoryData.slug}_${simpleUUID().slice(0,4)}`, name: categoryData.name, slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''), description: categoryData.description || '', parentId: categoryData.parentId || null, imageId: categoryData.imageId || null, displayOrder: categoryData.displayOrder === undefined ? (categories.length > 0 ? Math.max(...categories.map(c => c.displayOrder)) + 1 : 1) : categoryData.displayOrder, isActive: categoryData.isActive === undefined ? true : categoryData.isActive, createdAt: now, updatedAt: now };
    categories.push(newCategory);
    setItem(KEYS.CATEGORIES, categories);
    return newCategory;
  },
  async updateCategory(updatedCategory): Promise<Category | null> {
    let categories = getItem<Category[]>(KEYS.CATEGORIES) || [];
    const index = categories.findIndex(c => c.id === updatedCategory.id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updatedCategory, slug: updatedCategory.slug || categories[index].slug || updatedCategory.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''), description: updatedCategory.description || categories[index].description || '', updatedAt: new Date().toISOString() };
      setItem(KEYS.CATEGORIES, categories);
      return categories[index];
    }
    return null;
  },
  async deleteCategory(categoryId): Promise<boolean> {
    let categories = getItem<Category[]>(KEYS.CATEGORIES) || [];
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return false;
    const initialLength = categories.length;
    categories = categories.filter(c => c.id !== categoryId);
    if (categories.length < initialLength) {
      setItem(KEYS.CATEGORIES, categories);
      if (categoryToDelete.imageId) await this.deleteImage(categoryToDelete.imageId);
      const products = await this.getProducts();
      for (const p of products) if (p.categoryId === categoryId) { p.categoryId = ''; await this.updateProduct(p); }
      const childCategories = (await this.getCategories()).filter(c => c.parentId === categoryId);
      for (const child of childCategories) { child.parentId = null; await this.updateCategory(child); }
      return true;
    }
    return false;
  },
  async findCategoryById(categoryId): Promise<Category | undefined> { return !categoryId ? undefined : (await this.getCategories()).find(c => c.id === categoryId); },
  async getChildCategories(parentId): Promise<Category[]> { return (await this.getCategories()).filter(category => category.parentId === parentId); },
  async getCart(userId): Promise<Cart | null> {
      const carts = getItem<Cart[]>(KEYS.CARTS) || [];
      let userCart = carts.find(cart => cart.userId === userId);
      if (userCart) { userCart.savedForLaterItems = userCart.savedForLaterItems || []; return userCart; }
      const newCart: Cart = { userId, items: [], savedForLaterItems: [], updatedAt: new Date().toISOString() };
      carts.push(newCart);
      setItem(KEYS.CARTS, carts);
      return newCart;
  },
  async updateCart(cart): Promise<void> {
      let carts = getItem<Cart[]>(KEYS.CARTS) || [];
      const index = carts.findIndex(c => c.userId === cart.userId);
      const updatedItems: CartItem[] = [];
      for (const item of cart.items) { const product = await this.findProductById(item.productId); updatedItems.push({ ...item, name: product?.name || item.name, primaryImageId: product?.primaryImageId || item.primaryImageId }); }
      const updatedSavedForLaterItems: CartItem[] = [];
      for (const item of (cart.savedForLaterItems || [])) { const product = await this.findProductById(item.productId); updatedSavedForLaterItems.push({ ...item, name: product?.name || item.name, primaryImageId: product?.primaryImageId || item.primaryImageId }); }
      const updatedCart = { ...cart, items: updatedItems, savedForLaterItems: updatedSavedForLaterItems, updatedAt: new Date().toISOString() };
      if (index !== -1) carts[index] = updatedCart;
      else carts.push(updatedCart);
      setItem(KEYS.CARTS, carts);
  },
  async clearCart(userId): Promise<void> { const cart = await this.getCart(userId); if (cart) await this.updateCart({ ...cart, items: [], updatedAt: new Date().toISOString() }); },
  async moveToSavedForLater(userId, productId): Promise<void> {
      const cart = await this.getCart(userId);
      if (!cart) return;
      const itemIndex = cart.items.findIndex(item => item.productId === productId);
      if (itemIndex === -1) return;
      const [itemToMove] = cart.items.splice(itemIndex, 1);
      cart.savedForLaterItems = cart.savedForLaterItems || [];
      const existingSavedItemIndex = cart.savedForLaterItems.findIndex(item => item.productId === productId);
      if (existingSavedItemIndex > -1) cart.savedForLaterItems[existingSavedItemIndex].quantity += itemToMove.quantity;
      else cart.savedForLaterItems.push(itemToMove);
      await this.updateCart(cart);
  },
  async moveToCartFromSaved(userId, productId): Promise<boolean> {
      const cart = await this.getCart(userId);
      if (!cart || !cart.savedForLaterItems) return false;
      const itemIndex = cart.savedForLaterItems.findIndex(item => item.productId === productId);
      if (itemIndex === -1) return false;
      const [itemToMove] = cart.savedForLaterItems.splice(itemIndex, 1);
      const product = await this.findProductById(itemToMove.productId);
      if (!product || product.stock < itemToMove.quantity) { cart.savedForLaterItems.push(itemToMove); await this.updateCart(cart); return false; }
      const existingCartItemIndex = cart.items.findIndex(item => item.productId === productId);
      if (existingCartItemIndex > -1) {
          if (cart.items[existingCartItemIndex].quantity + itemToMove.quantity <= product.stock) cart.items[existingCartItemIndex].quantity += itemToMove.quantity;
          else { cart.savedForLaterItems.push(itemToMove); await this.updateCart(cart); return false; }
      } else { cart.items.push(itemToMove); }
      await this.updateCart(cart);
      return true;
  },
  async removeFromSavedForLater(userId, productId): Promise<void> {
      const cart = await this.getCart(userId);
      if (!cart || !cart.savedForLaterItems) return;
      cart.savedForLaterItems = cart.savedForLaterItems.filter(item => item.productId !== productId);
      await this.updateCart(cart);
  },
  async getOrders(userId?): Promise<Order[]> {
      const allOrders = getItem<Order[]>(KEYS.ORDERS) || [];
      if (userId) return allOrders.filter(order => order.userId === userId).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      return allOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  },
  async addOrder(orderData): Promise<Order> {
      const orders = await this.getOrders();
      const orderItemsWithDetails: OrderItem[] = [];
      for (const item of orderData.items) { const product = await this.findProductById(item.productId); orderItemsWithDetails.push({ ...item, name: product?.name || 'Unknown Product', primaryImageId: product?.primaryImageId }); }
      const newOrder: Order = { ...orderData, items: orderItemsWithDetails, shippingAddress: orderData.shippingAddress, id: simpleUUID(), orderDate: new Date().toISOString() };
      orders.push(newOrder);
      setItem(KEYS.ORDERS, orders);
      for (const item of newOrder.items) {
        const product = await this.findProductById(item.productId);
        if (product) { product.stock -= item.quantity; product.purchases = (product.purchases || 0) + item.quantity; await this.updateProduct(product); }
      }
      return newOrder;
  },
  async getLoginActivity(): Promise<LoginActivity[]> { return getItem<LoginActivity[]>(KEYS.LOGIN_ACTIVITY) || []; },
  async addLoginActivity(userId, userEmail, type): Promise<void> {
      const activities = await this.getLoginActivity();
      const now = new Date().toISOString();
      activities.push({ id: simpleUUID(), userId, userEmail, timestamp: now, type });
      setItem(KEYS.LOGIN_ACTIVITY, activities.slice(-100));
      const user = await this.findUserById(userId);
      if (user && type === 'login') { user.lastLogin = now; user.updatedAt = now; await this.updateUser(user); }
  },
  setCurrentUser(user: User | null): void { user ? setItem(KEYS.CURRENT_USER, { id: user.id, role: user.role, email: user.email, name: user.name, themePreference: user.themePreference, addresses: user.addresses || [] }) : removeItem(KEYS.CURRENT_USER); },
  getCurrentUser(): (User & { role: UserRole }) | null { return getItem<(User & { role: UserRole })>(KEYS.CURRENT_USER); },
  async getWishlist(userId): Promise<WishlistItem[]> { return (getItem<WishlistItem[]>(KEYS.WISHLISTS) || []).filter(item => item.userId === userId); },
  async addToWishlist(userId, productId): Promise<void> {
    const wishlists = getItem<WishlistItem[]>(KEYS.WISHLISTS) || [];
    if (!wishlists.find(item => item.userId === userId && item.productId === productId)) { wishlists.push({ userId, productId, addedAt: new Date().toISOString() }); setItem(KEYS.WISHLISTS, wishlists); }
  },
  async removeFromWishlist(userId, productId): Promise<void> { let wishlists = getItem<WishlistItem[]>(KEYS.WISHLISTS) || []; wishlists = wishlists.filter(item => !(item.userId === userId && item.productId === productId)); setItem(KEYS.WISHLISTS, wishlists); },
  async isProductInWishlist(userId, productId): Promise<boolean> { return (getItem<WishlistItem[]>(KEYS.WISHLISTS) || []).some(item => item.userId === userId && item.productId === productId); },
  async getReviewsForProduct(productId): Promise<Review[]> { return (getItem<Review[]>(KEYS.REVIEWS) || []).filter(review => review.productId === productId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); },
  async addReview(reviewData): Promise<Review> {
    const reviews = getItem<Review[]>(KEYS.REVIEWS) || [];
    const newReview: Review = { ...reviewData, id: simpleUUID(), createdAt: new Date().toISOString() };
    reviews.push(newReview);
    setItem(KEYS.REVIEWS, reviews);
    const product = await this.findProductById(reviewData.productId);
    if (product) {
      const productReviews = await this.getReviewsForProduct(reviewData.productId);
      const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
      product.averageRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
      product.reviewCount = productReviews.length;
      await this.updateProduct(product);
    }
    return newReview;
  },
  async deleteReview(reviewId): Promise<void> {
    let reviews = getItem<Review[]>(KEYS.REVIEWS) || [];
    const reviewToDelete = reviews.find(r => r.id === reviewId);
    if (!reviewToDelete) return;
    reviews = reviews.filter(r => r.id !== reviewId);
    setItem(KEYS.REVIEWS, reviews);
    const product = await this.findProductById(reviewToDelete.productId);
    if (product) {
      const productReviews = await this.getReviewsForProduct(reviewToDelete.productId);
      const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
      product.averageRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
      product.reviewCount = productReviews.length;
      await this.updateProduct(product);
    }
  },
  async getRecentlyViewed(userId): Promise<RecentlyViewedItem[]> { return (getItem<UserRecentlyViewed[]>(KEYS.RECENTLY_VIEWED) || []).find(log => log.userId === userId)?.items || []; },
  async addRecentlyViewed(userId, productId): Promise<void> {
    let allLogs = getItem<UserRecentlyViewed[]>(KEYS.RECENTLY_VIEWED) || [];
    let userLog = allLogs.find(log => log.userId === userId);
    const product = await this.findProductById(productId);
    if (!product) return;
    if (!userLog) { userLog = { userId, items: [] }; allLogs.push(userLog); }
    userLog.items = userLog.items.filter(item => item.productId !== productId);
    userLog.items.unshift({ productId, viewedAt: new Date().toISOString() });
    userLog.items = userLog.items.slice(0, 5);
    setItem(KEYS.RECENTLY_VIEWED, allLogs);
    product.views = (product.views || 0) + 1;
    await this.updateProduct(product);
  },
  async getGlobalTheme(): Promise<Theme> { return getItem<Theme>(KEYS.THEME) || 'system'; },
  async setGlobalTheme(theme): Promise<void> { setItem(KEYS.THEME, theme); },
  async getAdminActionLogs(): Promise<AdminActionLog[]> { return getAdminActionLogsFromDB(); },
  async addAdminActionLog(logData): Promise<void> { await addAdminActionLogToDB(logData); },
  async saveImage(entityId, imageType, imageFile): Promise<string> { return saveImageToDB(entityId, imageType, imageFile); },
  async getImage(imageId): Promise<Blob | null> { return getImageFromDB(imageId); },
  async deleteImage(imageId): Promise<void> { return deleteImageFromDB(imageId); },
  async deleteImagesForEntity(imageIds): Promise<void> { return deleteImagesForEntityFromDB(imageIds); },

  // Job methods
  async getJobs(options = {}): Promise<Job[]> {
    let jobs = getItem<Job[]>(KEYS.JOBS) || [];
    
    const now = new Date();
    jobs.forEach(job => {
        if (job.status === 'open' && new Date(job.expiresAt) < now) {
            job.status = 'expired';
        }
    });
    setItem(KEYS.JOBS, jobs);

    if (options.status) {
        jobs = jobs.filter(j => j.status === options.status);
    }
    if (options.createdById) {
        jobs = jobs.filter(j => j.createdById === options.createdById);
    }
    if (options.acceptedById) {
        jobs = jobs.filter(j => j.acceptedById === options.acceptedById);
    }
    if (options.userId) { // A generic user id can be for creator or acceptor
        jobs = jobs.filter(j => j.createdById === options.userId || j.acceptedById === options.userId);
    }
    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async findJobById(jobId: string): Promise<Job | undefined> {
    const jobs = await this.getJobs();
    return jobs.find(j => j.id === jobId);
  },
  async addJob(jobData): Promise<Job> {
    const jobs = getItem<Job[]>(KEYS.JOBS) || [];
    const creator = await this.findUserById(jobData.createdById);
    if (!creator) throw new Error("Job creator not found");

    const newJob: Job = {
        ...jobData,
        id: simpleUUID(),
        status: 'open',
        createdAt: new Date().toISOString(),
        createdByName: creator.name || creator.email,
    };
    jobs.push(newJob);
    setItem(KEYS.JOBS, jobs);
    return newJob;
  },
  async updateJob(updatedJob): Promise<Job | null> {
    let jobs = getItem<Job[]>(KEYS.JOBS) || [];
    const index = jobs.findIndex(j => j.id === updatedJob.id);
    if (index !== -1) {
        jobs[index] = { ...jobs[index], ...updatedJob };
        setItem(KEYS.JOBS, jobs);
        return jobs[index];
    }
    return null;
  },
  async deleteJob(jobId: string): Promise<boolean> {
    let jobs = getItem<Job[]>(KEYS.JOBS) || [];
    const initialLength = jobs.length;
    jobs = jobs.filter(j => j.id !== jobId);
    if (jobs.length < initialLength) {
        setItem(KEYS.JOBS, jobs);
        return true;
    }
    return false;
  },
  async acceptJob(jobId, acceptingUserId, acceptingUserName): Promise<Job | null> {
    const job = await this.findJobById(jobId);
    if (!job || job.status !== 'open') return null;

    job.status = 'accepted';
    job.acceptedById = acceptingUserId;
    job.acceptedByName = acceptingUserName;
    job.acceptedAt = new Date().toISOString();
    
    return this.updateJob(job);
  },
  async getJobSettings(): Promise<JobSettings> {
    return getItem<JobSettings>(KEYS.JOB_SETTINGS) || { maxJobsPerUser: 5, maxTimerDurationDays: 10 };
  },
  async updateJobSettings(settings: JobSettings): Promise<JobSettings> {
    setItem(KEYS.JOB_SETTINGS, settings);
    return settings;
  },
};

export { localStorageDataService };
