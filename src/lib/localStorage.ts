
'use client';

import type { User, Product, Category, Cart, Order, LoginActivity, UserRole, WishlistItem, Review, UserRecentlyViewed, RecentlyViewedItem, Theme, CartItem, OrderItem } from '@/types';

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
  THEME: 'localcommerce_theme', // Global theme preference
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
    console.error(`Error setting item ${key} in localStorage`, error);
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}

let isDataInitialized = false;

function initializeDataOnce() {
  if (typeof window === 'undefined' || isDataInitialized) return;

  let users = getItem<User[]>(KEYS.USERS) || [];
  let adminUser = users.find(user => user.role === 'admin' && user.email === 'admin@localcommerce.com');

  if (adminUser) {
    if (adminUser.password !== 'password') {
      adminUser.password = 'password';
      const userIndex = users.findIndex(u => u.id === adminUser!.id);
      if (userIndex !== -1) users[userIndex] = adminUser;
      setItem(KEYS.USERS, users);
    }
  } else {
    adminUser = {
      id: crypto.randomUUID(),
      email: 'admin@localcommerce.com',
      password: 'password',
      role: 'admin',
      name: 'Administrator',
      createdAt: new Date().toISOString(),
    };
    users.push(adminUser);
    setItem(KEYS.USERS, users);
  }

  let categories = getItem<Category[]>(KEYS.CATEGORIES) || [];
  if (categories.length === 0) {
    const mockCategories: Category[] = [
      { id: 'cat1_electronics', name: 'Electronics', description: 'Gadgets, devices, and more.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat2_books', name: 'Books', description: 'Fiction, non-fiction, and educational.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat3_homegoods', name: 'Home Goods', description: 'For your lovely home.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat4_apparel', name: 'Apparel', description: 'Clothing and accessories.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    categories = mockCategories;
    setItem(KEYS.CATEGORIES, categories);
  }

  let products = getItem<Product[]>(KEYS.PRODUCTS) || [];
  if (products.length === 0 && categories.length > 0) {
    const electronicsCat = categories.find(c => c.id === 'cat1_electronics');
    const booksCat = categories.find(c => c.id === 'cat2_books');

    const mockProducts: Product[] = [
      {
        id: crypto.randomUUID(),
        name: 'Wireless Headphones X2000',
        description: 'Experience immersive sound with these noise-cancelling wireless headphones. Long battery life and comfortable design for all-day listening.',
        imageUrl: 'https://placehold.co/600x400.png?text=Primary+Headphones',
        imageUrls: ['https://placehold.co/600x400.png?text=Headphones+Angle+1', 'https://placehold.co/600x400.png?text=Headphones+Angle+2', 'https://placehold.co/600x400.png?text=Headphones+On+Ear'],
        price: 149.99,
        stock: 50,
        categoryId: electronicsCat?.id || categories[0].id,
        icon: 'css-icon-home',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 120,
        purchases: 15,
      },
      {
        id: crypto.randomUUID(),
        name: 'Smartwatch ProConnect',
        description: 'Stay connected and track your fitness with this feature-packed smartwatch. GPS, heart rate monitor, and a vibrant display.',
        imageUrl: 'https://placehold.co/600x400.png?text=Smartwatch+Main',
        imageUrls: ['https://placehold.co/600x400.png?text=Smartwatch+Screen', 'https://placehold.co/600x400.png?text=Smartwatch+Side'],
        price: 249.50,
        stock: 30,
        categoryId: electronicsCat?.id || categories[0].id,
        icon: 'css-icon-settings',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 250,
        purchases: 35,
      },
       {
        id: crypto.randomUUID(),
        name: 'The Enigmatic Cipher',
        description: 'A thrilling mystery novel that will keep you on the edge of your seat until the very last page. By acclaimed author A. N. Other.',
        imageUrl: 'https://placehold.co/600x400.png?text=Book+Cover',
        price: 19.99,
        stock: 100,
        categoryId: booksCat?.id || categories[1].id,
        icon: 'css-icon-file',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 85,
        purchases: 22,
      },
    ];
    products = mockProducts.map(p => ({ ...p, averageRating: 0, reviewCount: 0, imageUrls: (p.imageUrls || []).filter(Boolean) }));
    setItem(KEYS.PRODUCTS, products);
  }

  if (!getItem(KEYS.CARTS)) setItem(KEYS.CARTS, []);
  if (!getItem(KEYS.ORDERS)) setItem(KEYS.ORDERS, []);
  if (!getItem(KEYS.LOGIN_ACTIVITY)) setItem(KEYS.LOGIN_ACTIVITY, []);
  if (!getItem(KEYS.WISHLISTS)) setItem(KEYS.WISHLISTS, []);
  if (!getItem(KEYS.REVIEWS)) setItem(KEYS.REVIEWS, []);
  if (!getItem(KEYS.RECENTLY_VIEWED)) setItem(KEYS.RECENTLY_VIEWED, []);
  if (!getItem(KEYS.THEME)) setItem(KEYS.THEME, 'system');
  
  isDataInitialized = true;
}

if (typeof window !== 'undefined') {
    initializeDataOnce();
}

const getUsers = (): User[] => getItem<User[]>(KEYS.USERS) || [];
const addUser = (user: Omit<User, 'id' | 'createdAt' | 'role'> & { role?: UserRole }): User => {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    role: user.role || 'customer', 
  };
  users.push(newUser);
  setItem(KEYS.USERS, users);
  return newUser;
};
const updateUser = (updatedUser: User): User | null => {
  let users = getUsers();
  const index = users.findIndex(u => u.id === updatedUser.id);
  if (index !== -1) {
    const existingPassword = users[index].password;
    const existingTheme = users[index].themePreference;
    users[index] = { 
      ...users[index], 
      ...updatedUser, 
      password: updatedUser.password || existingPassword,
      themePreference: updatedUser.themePreference || existingTheme,
    };
    setItem(KEYS.USERS, users);
    const sessionUser = getCurrentUser();
    if (sessionUser && sessionUser.id === updatedUser.id) {
      setCurrentUser(users[index]);
    }
    return users[index];
  }
  return null;
};
const deleteUser = (userId: string): boolean => {
  let users = getUsers();
  const initialLength = users.length;
  users = users.filter(u => u.id !== userId);
  if (users.length < initialLength) {
    setItem(KEYS.USERS, users);
    return true;
  }
  return false;
};
const findUserByEmail = (email: string): User | undefined => getUsers().find(u => u.email === email);
const findUserById = (userId: string): User | undefined => getUsers().find(u => u.id === userId);

const getProducts = (): Product[] => getItem<Product[]>(KEYS.PRODUCTS) || [];
const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'purchases' | 'averageRating' | 'reviewCount'>): Product => {
  const products = getProducts();
  const newProduct: Product = {
    ...product,
    id: crypto.randomUUID(),
    imageUrl: product.imageUrl, // Primary URL is now mandatory from form
    imageUrls: (product.imageUrls || []).filter(url => url && url.trim() !== ''),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    purchases: 0,
    icon: product.icon || null,
    averageRating: 0,
    reviewCount: 0,
  };
  products.push(newProduct);
  setItem(KEYS.PRODUCTS, products);
  return newProduct;
};
const updateProduct = (updatedProduct: Product): Product | null => {
  let products = getProducts();
  const index = products.findIndex(p => p.id === updatedProduct.id);
  if (index !== -1) {
    products[index] = { 
        ...products[index], 
        ...updatedProduct, 
        imageUrl: updatedProduct.imageUrl, // Primary URL is mandatory
        imageUrls: (updatedProduct.imageUrls || []).filter(url => url && url.trim() !== ''),
        icon: updatedProduct.icon || null,
        updatedAt: new Date().toISOString() 
    };
    setItem(KEYS.PRODUCTS, products);
    return products[index];
  }
  return null;
};
const deleteProduct = (productId: string): boolean => {
  let products = getProducts();
  const initialLength = products.length;
  products = products.filter(p => p.id !== productId);
  if (products.length < initialLength) {
    setItem(KEYS.PRODUCTS, products);
    let reviews = getReviewsForProduct(productId);
    reviews.forEach(review => deleteReview(review.id));
    return true;
  }
  return false;
};
const findProductById = (productId: string): Product | undefined => getProducts().find(p => p.id === productId);

const getCategories = (): Category[] => getItem<Category[]>(KEYS.CATEGORIES) || [];
const addCategory = (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category => {
  const categories = getCategories();
  const newCategory: Category = {
    ...category,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  categories.push(newCategory);
  setItem(KEYS.CATEGORIES, categories);
  return newCategory;
};
const updateCategory = (updatedCategory: Category): Category | null => {
  let categories = getCategories();
  const index = categories.findIndex(c => c.id === updatedCategory.id);
  if (index !== -1) {
    categories[index] = { ...categories[index], ...updatedCategory, updatedAt: new Date().toISOString() };
    setItem(KEYS.CATEGORIES, categories);
    return categories[index];
  }
  return null;
};
const deleteCategory = (categoryId: string): boolean => {
  let categories = getCategories();
  const initialLength = categories.length;
  categories = categories.filter(c => c.id !== categoryId);
  if (categories.length < initialLength) {
    setItem(KEYS.CATEGORIES, categories);
    const products = getProducts();
    products.forEach(p => {
      if (p.categoryId === categoryId) {
        p.categoryId = ''; 
        updateProduct(p);
      }
    });
    return true;
  }
  return false;
};
const findCategoryById = (categoryId: string): Category | undefined => getCategories().find(c => c.id === categoryId);

const getCart = (userId: string): Cart | null => {
    const carts = getItem<Cart[]>(KEYS.CARTS) || [];
    const userCart = carts.find(cart => cart.userId === userId);
    if (userCart) return userCart;
    const newCart: Cart = { userId, items: [], updatedAt: new Date().toISOString() };
    carts.push(newCart);
    setItem(KEYS.CARTS, carts);
    return newCart;
};
const updateCart = (cart: Cart): void => {
    let carts = getItem<Cart[]>(KEYS.CARTS) || [];
    const index = carts.findIndex(c => c.userId === cart.userId);
    const productDetailsCache: Record<string, Product | undefined> = {};
    
    const updatedItems = cart.items.map(item => {
      if (!productDetailsCache[item.productId]) {
        productDetailsCache[item.productId] = findProductById(item.productId);
      }
      const product = productDetailsCache[item.productId];
      return {
        ...item,
        name: product?.name || item.name,
        imageUrl: product?.imageUrl || item.imageUrl, // Use product's primary image
        icon: product?.icon || item.icon,
      };
    });

    const updatedCart = { ...cart, items: updatedItems, updatedAt: new Date().toISOString() };

    if (index !== -1) {
        carts[index] = updatedCart;
    } else {
        carts.push(updatedCart);
    }
    setItem(KEYS.CARTS, carts);
};
const clearCart = (userId: string): void => {
    updateCart({ userId, items: [], updatedAt: new Date().toISOString() });
};

const getOrders = (userId?: string): Order[] => {
    const allOrders = getItem<Order[]>(KEYS.ORDERS) || [];
    if (userId) {
        return allOrders.filter(order => order.userId === userId).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }
    return allOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
};

const addOrder = (orderData: Omit<Order, 'id' | 'orderDate'> & { userId: string }): Order => {
    const orders = getOrders();
    const productDetailsCache: Record<string, Product | undefined> = {};

    const orderItemsWithDetails: OrderItem[] = orderData.items.map(item => {
      if (!productDetailsCache[item.productId]) {
        productDetailsCache[item.productId] = findProductById(item.productId);
      }
      const product = productDetailsCache[item.productId];
      return {
        ...item,
        name: product?.name || 'Unknown Product',
        imageUrl: product?.imageUrl, // Use product's primary image
        icon: product?.icon,
      };
    });

    const newOrder: Order = {
        ...orderData,
        items: orderItemsWithDetails,
        id: crypto.randomUUID(),
        orderDate: new Date().toISOString(),
    };
    orders.push(newOrder);
    setItem(KEYS.ORDERS, orders);

    newOrder.items.forEach(item => {
      const product = findProductById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        product.purchases = (product.purchases || 0) + item.quantity;
        updateProduct(product);
      }
    });
    return newOrder;
};

const getLoginActivity = (): LoginActivity[] => getItem<LoginActivity[]>(KEYS.LOGIN_ACTIVITY) || [];
const addLoginActivity = (userId: string, userEmail: string, type: 'login' | 'logout'): void => {
    const activities = getLoginActivity();
    activities.push({
        id: crypto.randomUUID(),
        userId,
        userEmail,
        timestamp: new Date().toISOString(),
        type,
    });
    setItem(KEYS.LOGIN_ACTIVITY, activities.slice(-100)); 
};

const setCurrentUser = (user: User | null): void => {
  if (user) {
    setItem(KEYS.CURRENT_USER, { id: user.id, role: user.role, email: user.email, name: user.name, themePreference: user.themePreference });
  } else {
    removeItem(KEYS.CURRENT_USER);
  }
};

const getCurrentUser = (): (User & { role: UserRole }) | null => {
  return getItem<(User & { role: UserRole })>(KEYS.CURRENT_USER);
};

const getAllWishlists = (): WishlistItem[] => getItem<WishlistItem[]>(KEYS.WISHLISTS) || [];
const getWishlist = (userId: string): WishlistItem[] => {
  return getAllWishlists().filter(item => item.userId === userId);
};
const addToWishlist = (userId: string, productId: string): void => {
  const wishlists = getAllWishlists();
  if (!wishlists.find(item => item.userId === userId && item.productId === productId)) {
    wishlists.push({ userId, productId, addedAt: new Date().toISOString() });
    setItem(KEYS.WISHLISTS, wishlists);
  }
};
const removeFromWishlist = (userId: string, productId: string): void => {
  let wishlists = getAllWishlists();
  wishlists = wishlists.filter(item => !(item.userId === userId && item.productId === productId));
  setItem(KEYS.WISHLISTS, wishlists);
};
const isProductInWishlist = (userId: string, productId: string): boolean => {
  return getAllWishlists().some(item => item.userId === userId && item.productId === productId);
};

const getAllReviews = (): Review[] => getItem<Review[]>(KEYS.REVIEWS) || [];
const getReviewsForProduct = (productId: string): Review[] => {
  return getAllReviews().filter(review => review.productId === productId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
const addReview = (reviewData: Omit<Review, 'id' | 'createdAt'>): Review => {
  const reviews = getAllReviews();
  const newReview: Review = {
    ...reviewData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  reviews.push(newReview);
  setItem(KEYS.REVIEWS, reviews);
  const product = findProductById(reviewData.productId);
  if (product) {
    const productReviews = getReviewsForProduct(reviewData.productId);
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    product.averageRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
    product.reviewCount = productReviews.length;
    updateProduct(product);
  }
  return newReview;
};
const deleteReview = (reviewId: string): void => {
  let reviews = getAllReviews();
  const reviewToDelete = reviews.find(r => r.id === reviewId);
  if (!reviewToDelete) return;
  reviews = reviews.filter(r => r.id !== reviewId);
  setItem(KEYS.REVIEWS, reviews);
  const product = findProductById(reviewToDelete.productId);
  if (product) {
    const productReviews = getReviewsForProduct(reviewToDelete.productId);
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    product.averageRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
    product.reviewCount = productReviews.length;
    updateProduct(product);
  }
};

const MAX_RECENTLY_VIEWED = 5;
const getAllRecentlyViewed = (): UserRecentlyViewed[] => getItem<UserRecentlyViewed[]>(KEYS.RECENTLY_VIEWED) || [];
const getRecentlyViewed = (userId: string): RecentlyViewedItem[] => {
  const userLog = getAllRecentlyViewed().find(log => log.userId === userId);
  return userLog ? userLog.items : [];
};
const addRecentlyViewed = (userId: string, productId: string): void => {
  let allLogs = getAllRecentlyViewed();
  let userLog = allLogs.find(log => log.userId === userId);
  if (!userLog) {
    userLog = { userId, items: [] };
    allLogs.push(userLog);
  }
  userLog.items = userLog.items.filter(item => item.productId !== productId);
  userLog.items.unshift({ productId, viewedAt: new Date().toISOString() });
  userLog.items = userLog.items.slice(0, MAX_RECENTLY_VIEWED);
  setItem(KEYS.RECENTLY_VIEWED, allLogs);
};

const getGlobalTheme = (): Theme => getItem<Theme>(KEYS.THEME) || 'system';
const setGlobalTheme = (theme: Theme): void => {
  setItem(KEYS.THEME, theme);
};

const localStorageService = {
  KEYS,
  getItem,
  setItem,
  removeItem,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  findProductById,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  findCategoryById,
  getCart,
  updateCart,
  clearCart,
  getOrders,
  addOrder,
  getLoginActivity,
  addLoginActivity,
  setCurrentUser,
  getCurrentUser,
  initializeData: initializeDataOnce,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isProductInWishlist,
  getReviewsForProduct,
  addReview,
  deleteReview,
  getRecentlyViewed,
  addRecentlyViewed,
  getGlobalTheme,
  setGlobalTheme,
};

export { localStorageService };
