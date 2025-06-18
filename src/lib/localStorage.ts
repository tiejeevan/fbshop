'use client';

import type { User, Product, Category, Cart, Order, LoginActivity, UserRole } from '@/types';

const KEYS = {
  USERS: 'localcommerce_users',
  PRODUCTS: 'localcommerce_products',
  CATEGORIES: 'localcommerce_categories',
  CARTS: 'localcommerce_carts',
  ORDERS: 'localcommerce_orders',
  LOGIN_ACTIVITY: 'localcommerce_login_activity',
  CURRENT_USER: 'localcommerce_current_user',
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

// Initialize default admin user and mock data
function initializeData() {
  if (typeof window === 'undefined') return;

  // Admin User
  let users = getItem<User[]>(KEYS.USERS) || [];
  let adminUser = users.find(user => user.role === 'admin' && user.email === 'admin@localcommerce.com');

  if (adminUser) {
    if (adminUser.password !== 'password') {
      adminUser.password = 'password';
      const userIndex = users.findIndex(u => u.id === adminUser!.id);
      if (userIndex !== -1) users[userIndex] = adminUser;
      setItem(KEYS.USERS, users);
      console.log('Default admin user password updated.');
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
    console.log('Default admin user created.');
  }

  // Mock Categories
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
    console.log('Mock categories created.');
  }

  // Mock Products
  let products = getItem<Product[]>(KEYS.PRODUCTS) || [];
  if (products.length === 0 && categories.length > 0) {
    const electronicsCat = categories.find(c => c.id === 'cat1_electronics');
    const booksCat = categories.find(c => c.id === 'cat2_books');
    const homeGoodsCat = categories.find(c => c.id === 'cat3_homegoods');
    const apparelCat = categories.find(c => c.id === 'cat4_apparel');

    const mockProducts: Product[] = [
      {
        id: crypto.randomUUID(),
        name: 'Wireless Headphones X2000',
        description: 'Experience immersive sound with these noise-cancelling wireless headphones. Long battery life and comfortable design for all-day listening.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 149.99,
        stock: 50,
        categoryId: electronicsCat?.id || categories[0].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 120,
        purchases: 15,
      },
      {
        id: crypto.randomUUID(),
        name: 'Smartwatch ProConnect',
        description: 'Stay connected and track your fitness with this feature-packed smartwatch. GPS, heart rate monitor, and a vibrant display.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 249.50,
        stock: 30,
        categoryId: electronicsCat?.id || categories[0].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 250,
        purchases: 35,
      },
      {
        id: crypto.randomUUID(),
        name: 'The Enigmatic Cipher',
        description: 'A thrilling mystery novel that will keep you on the edge of your seat until the very last page. By acclaimed author A. N. Other.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 19.99,
        stock: 100,
        categoryId: booksCat?.id || categories[1].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 85,
        purchases: 22,
      },
      {
        id: crypto.randomUUID(),
        name: 'Modern JavaScript Essentials',
        description: 'A comprehensive guide to modern JavaScript development, covering ES6+ features, frameworks, and best practices.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 39.95,
        stock: 75,
        categoryId: booksCat?.id || categories[1].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 150,
        purchases: 40,
      },
      {
        id: crypto.randomUUID(),
        name: 'Artisan Coffee Maker',
        description: 'Brew the perfect cup of coffee every morning with this stylish and efficient artisan coffee maker. Multiple brew settings.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 89.00,
        stock: 40,
        categoryId: homeGoodsCat?.id || categories[2].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 95,
        purchases: 18,
      },
      {
        id: crypto.randomUUID(),
        name: 'CozyPlush Throw Blanket',
        description: 'Ultra-soft and warm plush throw blanket, perfect for cozy evenings. Available in various colors.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 29.99,
        stock: 60,
        categoryId: homeGoodsCat?.id || categories[2].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 210,
        purchases: 55,
      },
      {
        id: crypto.randomUUID(),
        name: 'Urban Explorer T-Shirt',
        description: 'Comfortable and durable 100% cotton t-shirt with a unique urban graphic design. Perfect for everyday wear.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 24.99,
        stock: 120,
        categoryId: apparelCat?.id || categories[3].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 300,
        purchases: 70,
      },
      {
        id: crypto.randomUUID(),
        name: 'TrailBlazer Running Shoes',
        description: 'Lightweight and responsive running shoes designed for trail running. Excellent grip and cushioning for all terrains.',
        imageUrl: 'https://placehold.co/600x400.png',
        price: 119.99,
        stock: 45,
        categoryId: apparelCat?.id || categories[3].id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 180,
        purchases: 25,
      },
    ];
    products = mockProducts;
    setItem(KEYS.PRODUCTS, products);
    console.log('Mock products created.');
  }

  // Initialize other keys if they don't exist
  if (!getItem(KEYS.CARTS)) setItem(KEYS.CARTS, []);
  if (!getItem(KEYS.ORDERS)) setItem(KEYS.ORDERS, []);
  if (!getItem(KEYS.LOGIN_ACTIVITY)) setItem(KEYS.LOGIN_ACTIVITY, []);
}

// Run initialization once
if (typeof window !== 'undefined') {
    initializeData();
}


// User Management
export const getUsers = (): User[] => getItem<User[]>(KEYS.USERS) || [];
export const addUser = (user: User): User => {
  const users = getUsers();
  const newUser = { ...user, id: user.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
  users.push(newUser);
  setItem(KEYS.USERS, users);
  return newUser;
};
export const updateUser = (updatedUser: User): User | null => {
  let users = getUsers();
  const index = users.findIndex(u => u.id === updatedUser.id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updatedUser };
    setItem(KEYS.USERS, users);
    return users[index];
  }
  return null;
};
export const deleteUser = (userId: string): boolean => {
  let users = getUsers();
  const initialLength = users.length;
  users = users.filter(u => u.id !== userId);
  if (users.length < initialLength) {
    setItem(KEYS.USERS, users);
    return true;
  }
  return false;
};
export const findUserByEmail = (email: string): User | undefined => getUsers().find(u => u.email === email);

// Product Management
export const getProducts = (): Product[] => getItem<Product[]>(KEYS.PRODUCTS) || [];
export const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'purchases'>): Product => {
  const products = getProducts();
  const newProduct: Product = {
    ...product,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    purchases: 0,
  };
  products.push(newProduct);
  setItem(KEYS.PRODUCTS, products);
  return newProduct;
};
export const updateProduct = (updatedProduct: Product): Product | null => {
  let products = getProducts();
  const index = products.findIndex(p => p.id === updatedProduct.id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updatedProduct, updatedAt: new Date().toISOString() };
    setItem(KEYS.PRODUCTS, products);
    return products[index];
  }
  return null;
};
export const deleteProduct = (productId: string): boolean => {
  let products = getProducts();
  const initialLength = products.length;
  products = products.filter(p => p.id !== productId);
  if (products.length < initialLength) {
    setItem(KEYS.PRODUCTS, products);
    return true;
  }
  return false;
};
export const findProductById = (productId: string): Product | undefined => getProducts().find(p => p.id === productId);


// Category Management
export const getCategories = (): Category[] => getItem<Category[]>(KEYS.CATEGORIES) || [];
export const addCategory = (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category => {
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
export const updateCategory = (updatedCategory: Category): Category | null => {
  let categories = getCategories();
  const index = categories.findIndex(c => c.id === updatedCategory.id);
  if (index !== -1) {
    categories[index] = { ...categories[index], ...updatedCategory, updatedAt: new Date().toISOString() };
    setItem(KEYS.CATEGORIES, categories);
    return categories[index];
  }
  return null;
};
export const deleteCategory = (categoryId: string): boolean => {
  let categories = getCategories();
  const initialLength = categories.length;
  categories = categories.filter(c => c.id !== categoryId);
  if (categories.length < initialLength) {
    setItem(KEYS.CATEGORIES, categories);
    // Optionally, handle products associated with this category (e.g., set categoryId to null or a default)
    const products = getProducts();
    products.forEach(p => {
      if (p.categoryId === categoryId) {
        p.categoryId = ''; // Or some default category ID
        updateProduct(p);
      }
    });
    return true;
  }
  return false;
};
export const findCategoryById = (categoryId: string): Category | undefined => getCategories().find(c => c.id === categoryId);

// Cart Management
export const getCart = (userId: string): Cart | null => {
    const carts = getItem<Cart[]>(KEYS.CARTS) || [];
    return carts.find(cart => cart.userId === userId) || { userId, items: [], updatedAt: new Date().toISOString() };
};
export const updateCart = (cart: Cart): void => {
    let carts = getItem<Cart[]>(KEYS.CARTS) || [];
    const index = carts.findIndex(c => c.userId === cart.userId);
    const updatedCart = { ...cart, updatedAt: new Date().toISOString() };
    if (index !== -1) {
        carts[index] = updatedCart;
    } else {
        carts.push(updatedCart);
    }
    setItem(KEYS.CARTS, carts);
};
export const clearCart = (userId: string): void => {
    updateCart({ userId, items: [], updatedAt: new Date().toISOString() });
};

// Order Management
export const getOrders = (userId?: string): Order[] => {
    const allOrders = getItem<Order[]>(KEYS.ORDERS) || [];
    if (userId) {
        return allOrders.filter(order => order.userId === userId);
    }
    return allOrders;
};
export const addOrder = (orderData: Omit<Order, 'id' | 'orderDate'> & { userId: string }): Order => {
    const orders = getOrders();
    const newOrder: Order = {
        ...orderData,
        id: crypto.randomUUID(),
        orderDate: new Date().toISOString(),
    };
    orders.push(newOrder);
    setItem(KEYS.ORDERS, orders);

    // Decrement stock and increment purchases for each product in the order
    newOrder.items.forEach(item => {
      const product = findProductById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        product.purchases += item.quantity;
        updateProduct(product);
      }
    });

    return newOrder;
};

// Login Activity
export const getLoginActivity = (): LoginActivity[] => getItem<LoginActivity[]>(KEYS.LOGIN_ACTIVITY) || [];
export const addLoginActivity = (userId: string, userEmail: string, type: 'login' | 'logout'): void => {
    const activities = getLoginActivity();
    activities.push({
        id: crypto.randomUUID(),
        userId,
        userEmail,
        timestamp: new Date().toISOString(),
        type,
    });
    setItem(KEYS.LOGIN_ACTIVITY, activities);
};


// Current User Session
export const setCurrentUser = (user: User | null): void => {
  if (user) {
    setItem(KEYS.CURRENT_USER, { id: user.id, role: user.role, email: user.email, name: user.name });
  } else {
    removeItem(KEYS.CURRENT_USER);
  }
};

export const getCurrentUser = (): { id: string; role: UserRole; email: string; name?: string } | null => {
  return getItem<{ id: string; role: UserRole; email: string; name?: string }>(KEYS.CURRENT_USER);
};

export const localStorageService = {
  KEYS,
  getItem,
  setItem,
  removeItem,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  findUserByEmail,
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
  initializeData, // Export the initialization function
};
