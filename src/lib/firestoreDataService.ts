
// src/lib/firestoreDataService.ts
'use client';

import type {
  User, Product, Category, Cart, Order, LoginActivity, UserRole,
  WishlistItem, Review, RecentlyViewedItem, Address, AdminActionLog, Theme, CartItem, OrderItem
} from '@/types';
import type { IDataService } from './dataService';
import type { Firestore } from 'firebase/firestore';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp, Timestamp, runTransaction, collectionGroup
} from 'firebase/firestore';

// Import the original localStorageDataService for fallbacks or specific local operations
import { localStorageDataService as localDBServiceFallback } from './localStorageDataService';
import { saveImage as saveImageToLocalDB, getImage as getImageFromLocalDB, deleteImage as deleteImageFromLocalDB, deleteImagesForProduct as deleteImagesForEntityFromLocalDB } from './indexedDbService';


let db: Firestore | null = null;

const MAX_FIRESTORE_ADMIN_LOGS = 500;

export const firestoreDataService: IDataService & { initialize: (firestoreInstance: Firestore) => void } = {
  initialize: (firestoreInstance: Firestore) => {
    db = firestoreInstance;
    console.log("FirestoreDataService initialized with DB instance.");
  },

  async initializeData(): Promise<void> {
    if (!db) {
        console.error("Firestore not initialized in firestoreDataService. Call initialize() first.");
        return;
    }
    console.log("Checking Firestore for initial data setup (seed)...");
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", "admin@localcommerce.com"), limit(1));
    const adminSnapshot = await getDocs(q);

    if (adminSnapshot.empty) {
        console.log("Admin user not found in Firestore, creating one...");
        const adminData: Omit<User, 'id' | 'password' | 'createdAt' | 'updatedAt'> = { // Timestamps will be server-generated
            email: 'admin@localcommerce.com',
            role: 'admin',
            name: 'Administrator (Firestore)',
            themePreference: 'system',
            addresses: [],
        };
        try {
            const userDocRef = doc(collection(db, "users"));
            await setDoc(userDocRef, {
                ...adminData,
                id: userDocRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            console.log("Default admin user created in Firestore with ID:", userDocRef.id);
        } catch (error) {
            console.error("Error creating default admin user in Firestore:", error);
        }
    } else {
        // console.log("Admin user already exists in Firestore.");
    }

    const categoriesCol = collection(db, "categories");
    const catSnapshot = await getDocs(query(categoriesCol, limit(1)));
    if (catSnapshot.empty) {
        console.log("No categories found in Firestore, seeding initial categories...");
        const mockCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
          { name: 'Electronics (FS)', slug: 'electronics-fs', description: 'FS Gadgets', parentId: null, imageId: null, displayOrder: 1, isActive: true },
          { name: 'Books (FS)', slug: 'books-fs', description: 'FS Books', parentId: null, imageId: null, displayOrder: 2, isActive: true },
        ];
        const batch = writeBatch(db);
        mockCategories.forEach(catData => {
            const catDocRef = doc(collection(db, "categories"));
            batch.set(catDocRef, {
                ...catData,
                id: catDocRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });
        await batch.commit();
        console.log("Initial categories seeded to Firestore.");
    }
    // console.log("Firestore data initialization check complete.");
  },

  async getUsers(): Promise<User[]> {
    if (!db) throw new Error("Firestore not initialized");
    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            lastLogin: (data.lastLogin as Timestamp)?.toDate().toISOString(),
        } as User;
    });
  },
  async addUser(userData): Promise<User> {
    if (!db) throw new Error("Firestore not initialized");
    const usersRef = collection(db, "users");
    const docRef = doc(usersRef);
    const nowServerTimestamp = serverTimestamp();
    const newUserFSData = {
      ...userData,
      id: docRef.id,
      createdAt: nowServerTimestamp,
      updatedAt: nowServerTimestamp,
      role: userData.role || 'customer',
      themePreference: userData.themePreference || 'system',
      addresses: [],
    };
    await setDoc(docRef, newUserFSData);
    return {
        ...userData, // Original data
        id: docRef.id, // Plus new ID
        createdAt: new Date().toISOString(), // Client-side approx for immediate use
        updatedAt: new Date().toISOString(), // Client-side approx
        role: userData.role || 'customer',
        themePreference: userData.themePreference || 'system',
        addresses: [],
    } as User;
  },
  async updateUser(updatedUser: User): Promise<User | null> {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = doc(db, "users", updatedUser.id);
    const updatePayload: any = { ...updatedUser };
    delete updatePayload.id; // Do not write the id field itself into the document
    updatePayload.updatedAt = serverTimestamp();
    // Password should ideally be handled by Firebase Auth, not directly in Firestore
    if (updatePayload.password === undefined || updatePayload.password === '') {
        delete updatePayload.password; // Don't update password if empty or undefined
    }

    await updateDoc(userRef, updatePayload);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as User;
    }
    return null;
  },
  async deleteUser(userId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      await deleteDoc(doc(db, "users", userId));
      // TODO: Consider deleting associated user data in other collections (carts, orders, reviews, etc.)
      return true;
    } catch (error) {
      console.error("Error deleting user from Firestore:", error);
      return false;
    }
  },
  async findUserByEmail(email: string): Promise<User | undefined> {
    if (!db) throw new Error("Firestore not initialized");
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as User;
    }
    return undefined;
  },
  async findUserById(userId: string): Promise<User | undefined> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
      return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as User;
    }
    return undefined;
  },

  async getUserAddresses(userId: string): Promise<Address[]> {
    const user = await this.findUserById(userId);
    return user?.addresses || [];
  },
  async addAddressToUser(userId, addressData): Promise<Address | null> {
    if (!db) throw new Error("Firestore not initialized");
    const user = await this.findUserById(userId);
    if (!user) return null;
    const newAddress: Address = {
      ...addressData,
      id: doc(collection(db, "users")).id.substring(0, 20), // Firestore auto-IDs are 20 chars
      userId,
      isDefault: addressData.isDefault || false,
    };
    const addresses = user.addresses || [];
    if (newAddress.isDefault) {
      addresses.forEach(addr => addr.isDefault = false);
    } else if (addresses.length === 0) {
      newAddress.isDefault = true;
    }
    addresses.push(newAddress);
    await this.updateUser({ ...user, addresses });
    return newAddress;
  },
   async updateUserAddress(userId, updatedAddress): Promise<Address | null> {
    const user = await this.findUserById(userId);
    if (!user || !user.addresses) return null;
    const addressIndex = user.addresses.findIndex(addr => addr.id === updatedAddress.id);
    if (addressIndex === -1) return null;
    if (updatedAddress.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    user.addresses[addressIndex] = updatedAddress;
    if (!user.addresses.some(addr => addr.isDefault) && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
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
      if (addressToDelete?.isDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
      }
      await this.updateUser(user);
      return true;
    }
    return false;
  },
  async setDefaultUserAddress(userId, addressId): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user || !user.addresses) return;
    user.addresses.forEach(addr => {
      addr.isDefault = addr.id === addressId;
    });
    await this.updateUser(user);
  },
  async findUserAddressById(userId, addressId): Promise<Address | undefined> {
      const user = await this.findUserById(userId);
      return user?.addresses?.find(addr => addr.id === addressId);
  },

  async getProducts(): Promise<Product[]> {
    if (!db) throw new Error("Firestore not initialized");
    const productsCol = collection(db, "products");
    const productSnapshot = await getDocs(productsCol);
    return productSnapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Product;
    });
  },
  async addProduct(productData): Promise<Product> {
    if (!db) throw new Error("Firestore not initialized");
    const productsRef = collection(db, "products");
    const docRef = doc(productsRef);
    const now = serverTimestamp();
    const newProductFSData = {
      ...productData,
      id: docRef.id,
      primaryImageId: productData.primaryImageId || null,
      additionalImageIds: productData.additionalImageIds || [],
      createdAt: now,
      updatedAt: now,
      views: 0,
      purchases: 0,
      averageRating: 0,
      reviewCount: 0,
    };
    await setDoc(docRef, newProductFSData);
     return {
        ...productData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views:0, purchases:0, averageRating:0, reviewCount:0
    } as Product;
  },
  async updateProduct(updatedProduct: Product): Promise<Product | null> {
    if (!db) throw new Error("Firestore not initialized");
    const productRef = doc(db, "products", updatedProduct.id);
    const updatePayload: any = { ...updatedProduct };
    delete updatePayload.id;
    updatePayload.updatedAt = serverTimestamp();
    await updateDoc(productRef, updatePayload);
    const docSnap = await getDoc(productRef);
     if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Product;
    }
    return null;
  },
  async deleteProduct(productId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      // Also delete associated images if they were in Firebase Storage
      const product = await this.findProductById(productId);
      if(product?.primaryImageId) await this.deleteImage(product.primaryImageId);
      if(product?.additionalImageIds) await this.deleteImagesForEntity(product.additionalImageIds);

      await deleteDoc(doc(db, "products", productId));
      // TODO: Delete reviews for this product from Firestore
      return true;
    } catch (e) {
      console.error("Error deleting product from Firestore:", e);
      return false;
    }
  },
  async findProductById(productId: string): Promise<Product | undefined> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Product;
    }
    return undefined;
  },

  async getCategories(): Promise<Category[]> {
    if (!db) throw new Error("Firestore not initialized");
    const categoriesCol = collection(db, "categories");
    const q = query(categoriesCol, orderBy("displayOrder"));
    const categorySnapshot = await getDocs(q);
    return categorySnapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Category;
    });
  },
  async addCategory(categoryData): Promise<Category> {
    if (!db) throw new Error("Firestore not initialized");
    const catRef = collection(db, "categories");
    const docRef = doc(catRef);
    const now = serverTimestamp();
    const newCategoryFSData = {
      ...categoryData,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, newCategoryFSData);
    return {
      ...categoryData,
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Category;
  },
  async updateCategory(updatedCategory: Category): Promise<Category | null> {
    if (!db) throw new Error("Firestore not initialized");
    const catRef = doc(db, "categories", updatedCategory.id);
    const updatePayload: any = { ...updatedCategory };
    delete updatePayload.id;
    updatePayload.updatedAt = serverTimestamp();
    await updateDoc(catRef, updatePayload);
    const docSnap = await getDoc(catRef);
     if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Category;
    }
    return null;
  },
  async deleteCategory(categoryId: string): Promise<boolean> {
     if (!db) throw new Error("Firestore not initialized");
    try {
      // Check for subcategories or products using this category before deleting
      const subcategories = await this.getChildCategories(categoryId);
      if (subcategories.length > 0) {
        console.error(`Cannot delete category ${categoryId}, it has subcategories.`);
        return false; // Or throw error
      }
      const productsQuery = query(collection(db, "products"), where("categoryId", "==", categoryId), limit(1));
      const productsSnapshot = await getDocs(productsQuery);
      if (!productsSnapshot.empty) {
          console.error(`Cannot delete category ${categoryId}, it's used by products.`);
          return false; // Or throw error
      }
      // If imageId is from Firebase Storage, delete it. For now, assume it's local.
      const category = await this.findCategoryById(categoryId);
      if(category?.imageId) await this.deleteImage(category.imageId);

      await deleteDoc(doc(db, "categories", categoryId));
      return true;
    } catch (e) {
      console.error("Error deleting category from Firestore:", e);
      return false;
    }
  },
  async findCategoryById(categoryId: string | null): Promise<Category | undefined> {
    if (!db || !categoryId) return undefined;
    const docRef = doc(db, "categories", categoryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Category;
    }
    return undefined;
  },
  async getChildCategories(parentId: string | null): Promise<Category[]> {
    if (!db) throw new Error("Firestore not initialized");
    const categoriesCol = collection(db, "categories");
    const q = query(categoriesCol, where("parentId", "==", parentId), orderBy("displayOrder"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Category;
    });
  },

  // Cart methods: These are complex for Firestore if they need to be persistent and shared.
  // Often, carts are kept client-side (like current localStorage) or in a temporary user-specific doc.
  // For this initial toggle, we will fallback to local storage behavior for carts.
  async getCart(userId: string): Promise<Cart | null> {
    console.warn("Firestore getCart: Using localStorage fallback.");
    return localDBServiceFallback.getCart(userId);
  },
  async updateCart(cart: Cart): Promise<void> {
    console.warn("Firestore updateCart: Using localStorage fallback.");
    return localDBServiceFallback.updateCart(cart);
  },
  async clearCart(userId: string): Promise<void> {
    console.warn("Firestore clearCart: Using localStorage fallback.");
    return localDBServiceFallback.clearCart(userId);
  },
  async moveToSavedForLater(userId: string, productId: string): Promise<void> {
    console.warn("Firestore moveToSavedForLater: Using localStorage fallback.");
    return localDBServiceFallback.moveToSavedForLater(userId, productId);
  },
  async moveToCartFromSaved(userId: string, productId: string): Promise<boolean> {
    console.warn("Firestore moveToCartFromSaved: Using localStorage fallback.");
    return localDBServiceFallback.moveToCartFromSaved(userId, productId);
  },
  async removeFromSavedForLater(userId: string, productId: string): Promise<void> {
    console.warn("Firestore removeFromSavedForLater: Using localStorage fallback.");
    return localDBServiceFallback.removeFromSavedForLater(userId, productId);
  },

  async getOrders(userId?: string): Promise<Order[]> {
    if (!db) throw new Error("Firestore not initialized");
    let q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
    if (userId) {
      q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("orderDate", "desc"));
    }
    const orderSnapshot = await getDocs(q);
    return orderSnapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            orderDate: (data.orderDate as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Order;
    });
  },
  async addOrder(orderData): Promise<Order> {
    if (!db) throw new Error("Firestore not initialized");
    const ordersRef = collection(db, "orders");
    const docRef = doc(ordersRef);

    // Prepare order items and update product stock in a transaction
    try {
      const newOrder = await runTransaction(db, async (transaction) => {
        const orderItemsWithDetails: OrderItem[] = [];
        for (const item of orderData.items) {
          const productRef = doc(db, "products", item.productId);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) {
            throw new Error(`Product ${item.productId} not found.`);
          }
          const product = productSnap.data() as Product;
          if (product.stock < item.quantity) {
            throw new Error(`Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
          }
          
          orderItemsWithDetails.push({
            ...item,
            name: product?.name || 'Unknown Product',
            primaryImageId: product?.primaryImageId,
          });
          
          transaction.update(productRef, { 
            stock: product.stock - item.quantity,
            purchases: (product.purchases || 0) + item.quantity,
            updatedAt: serverTimestamp()
          });
        }

        const newOrderDataFS = {
          ...orderData,
          items: orderItemsWithDetails,
          shippingAddress: orderData.shippingAddress,
          id: docRef.id,
          orderDate: serverTimestamp(), // Use server timestamp
        };
        transaction.set(docRef, newOrderDataFS);
        return {
            ...orderData, // original data for immediate return
            items: orderItemsWithDetails,
            id: docRef.id,
            orderDate: new Date().toISOString(), // client-side approx
        } as Order;
      });
      return newOrder;
    } catch (e) {
      console.error("Firestore addOrder transaction failed: ", e);
      throw e; // Re-throw to be caught by calling function
    }
  },

  async getLoginActivity(): Promise<LoginActivity[]> {
    if (!db) throw new Error("Firestore not initialized");
    const logsCol = collection(db, "loginActivities");
    const q = query(logsCol, orderBy("timestamp", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as LoginActivity;
    });
  },
  async addLoginActivity(userId, userEmail, type): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const logsCol = collection(db, "loginActivities");
    const logData = {
      userId,
      userEmail,
      type,
      timestamp: serverTimestamp(),
    };
    await addDoc(logsCol, logData);

    if (type === 'login') {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }
  },

  setCurrentUser(user: User | null): void {
    // Firebase Auth handles its own session. This is for local state if needed.
    // For toggle compatibility, call the local fallback's setCurrentUser.
    localDBServiceFallback.setCurrentUser(user);
  },
  getCurrentUser(): (User & { role: UserRole }) | null {
    return localDBServiceFallback.getCurrentUser();
  },

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    if (!db) throw new Error("Firestore not initialized");
    const wishlistCol = collection(db, `users/${userId}/wishlist`);
    const snapshot = await getDocs(wishlistCol);
    return snapshot.docs.map(d => d.data() as WishlistItem);
  },
  async addToWishlist(userId: string, productId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const wishlistItemRef = doc(db, `users/${userId}/wishlist`, productId);
    await setDoc(wishlistItemRef, { userId, productId, addedAt: serverTimestamp() });
  },
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const wishlistItemRef = doc(db, `users/${userId}/wishlist`, productId);
    await deleteDoc(wishlistItemRef);
  },
  async isProductInWishlist(userId: string, productId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    const wishlistItemRef = doc(db, `users/${userId}/wishlist`, productId);
    const docSnap = await getDoc(wishlistItemRef);
    return docSnap.exists();
  },

  async getReviewsForProduct(productId: string): Promise<Review[]> {
    if (!db) throw new Error("Firestore not initialized");
    const reviewsCol = collection(db, `products/${productId}/reviews`);
    const q = query(reviewsCol, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date(0).toISOString(),
        } as Review;
    });
  },
  async addReview(reviewData): Promise<Review> {
    if (!db) throw new Error("Firestore not initialized");
    const reviewsCol = collection(db, `products/${reviewData.productId}/reviews`);
    const docRef = doc(reviewsCol);
    const newReviewFSData = {
      ...reviewData,
      id: docRef.id,
      createdAt: serverTimestamp(),
    };
    await setDoc(docRef, newReviewFSData);

    // Update product averageRating and reviewCount (transaction recommended)
    const productRef = doc(db, "products", reviewData.productId);
    await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw "Product not found for review update!";
        const productData = productDoc.data();
        const currentReviews = await getDocs(query(collection(db, `products/${reviewData.productId}/reviews`))); // Re-fetch for accuracy
        const newReviewCount = currentReviews.size;
        const newTotalRating = currentReviews.docs.reduce((sum, doc) => sum + (doc.data().rating as number), 0);
        transaction.update(productRef, {
            averageRating: newReviewCount > 0 ? newTotalRating / newReviewCount : 0,
            reviewCount: newReviewCount,
            updatedAt: serverTimestamp(),
        });
    });

    return { ...reviewData, id: docRef.id, createdAt: new Date().toISOString() };
  },
  async deleteReview(reviewId: string): Promise<void> { // reviewId format: products/productId/reviews/reviewDocId
    if (!db) throw new Error("Firestore not initialized");
    console.warn(`Firestore deleteReview for ${reviewId}: Needs productID to properly update product stats. Assuming reviewId IS the full path or specific doc ID for now.`);
    // This is tricky because reviewId alone doesn't tell us the product.
    // We'd need to query for the review across all products or have the full path.
    // For now, this will be a TODO or require a more specific ID structure.
    // await deleteDoc(doc(db, "reviews", reviewId)); // If 'reviews' is a root collection
    // If reviews are subcollections: Need product ID.
    // For now, this method is largely a placeholder for Firestore.
    throw new Error("Firestore deleteReview: Full implementation required with product context.");
  },

  async getRecentlyViewed(userId: string): Promise<RecentlyViewedItem[]> {
    // This is often client-side or a small array in user doc.
    console.warn("Firestore getRecentlyViewed: Using localStorage fallback.");
    return localDBServiceFallback.getRecentlyViewed(userId);
  },
  async addRecentlyViewed(userId: string, productId: string): Promise<void> {
    // Could update a 'recentlyViewed' array in the user document in Firestore.
    console.warn("Firestore addRecentlyViewed: Using localStorage fallback and updating product views locally.");
    // Update product views (even if recently viewed is local for now)
    const product = await this.findProductById(productId);
    if (product && db) { // Ensure db is available if we were to write to Firestore
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, {
            views: (product.views || 0) + 1,
            updatedAt: serverTimestamp()
        });
    }
    return localDBServiceFallback.addRecentlyViewed(userId, productId); // Fallback for list
  },

  async getGlobalTheme(): Promise<Theme> {
    console.warn("Firestore getGlobalTheme: Returning 'system' as default. TODO: Implement settings doc in Firestore.");
    return 'system';
  },
  async setGlobalTheme(theme: Theme): Promise<void> {
    console.warn("Firestore setGlobalTheme: Not implemented. TODO: Implement settings doc in Firestore. Theme was:", theme);
  },

  async getAdminActionLogs(): Promise<AdminActionLog[]> {
    if (!db) throw new Error("Firestore not initialized for admin logs");
    const logsCollection = collection(db, 'adminActionLogs');
    const q = query(logsCollection, orderBy('timestamp', 'desc'), limit(MAX_FIRESTORE_ADMIN_LOGS));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      } as AdminActionLog;
    });
  },
  async addAdminActionLog(logData: Omit<AdminActionLog, 'id' | 'timestamp'>): Promise<void> {
    if (!db) throw new Error("Firestore not initialized for admin logs");
    const logsCollection = collection(db, 'adminActionLogs');
    await addDoc(logsCollection, {
      ...logData,
      timestamp: serverTimestamp(),
    });
    // TODO: Implement log trimming if storing in Firestore to manage size (e.g., Cloud Function)
  },

  // Image handling methods (delegate to local IndexedDB for now)
  // In a full Firebase setup, these would interact with Firebase Storage.
  async saveImage(entityId: string, imageType: string, imageFile: File): Promise<string> {
    console.warn(`Firestore saveImage for ${entityId}/${imageType}: Using IndexedDB fallback.`);
    return saveImageToLocalDB(entityId, imageType, imageFile);
  },
  async getImage(imageId: string): Promise<Blob | null> {
    console.warn(`Firestore getImage for ${imageId}: Using IndexedDB fallback.`);
    return getImageFromLocalDB(imageId);
  },
  async deleteImage(imageId: string): Promise<void> {
    console.warn(`Firestore deleteImage for ${imageId}: Using IndexedDB fallback.`);
    return deleteImageFromLocalDB(imageId);
  },
  async deleteImagesForEntity(imageIds: string[]): Promise<void> {
    console.warn(`Firestore deleteImagesForEntity: Using IndexedDB fallback.`);
    return deleteImagesForEntityFromLocalDB(imageIds);
  },
};
