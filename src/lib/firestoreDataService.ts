
// src/lib/firestoreDataService.ts
'use client';

import type {
  User, Product, Category, Cart, Order, LoginActivity, UserRole,
  WishlistItem, Review, RecentlyViewedItem, Address, AdminActionLog, Theme, CartItem, OrderItem,
  Job, JobSettings, ChatMessage, JobReview, JobCategory, Notification
} from '@/types';
import type { IDataService } from './dataService';
import type { Firestore } from 'firebase/firestore';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp, Timestamp, runTransaction, collectionGroup, documentId
} from 'firebase/firestore';
import { storage as firebaseStorage } from './firebase'; // Import Firebase Storage instance
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';


// Import the original localStorageDataService for fallbacks or specific local operations
import { localStorageDataService as localDBServiceFallback } from './localStorageDataService'; // For fallbacks
import { saveImage as saveImageToLocalDB, getImage as getImageFromLocalDB, deleteImage as deleteImageFromLocalDB, deleteImagesForProduct as deleteImagesForEntityFromLocalDB } from './indexedDbService';


let db: Firestore | null = null;

const MAX_FIRESTORE_ADMIN_LOGS = 500; 
const BATCH_LIMIT = 490; 

function convertTimestampsToISO(data: any): any {
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertTimestampsToISO(item));
  }
  if (typeof data === 'object' && data !== null) {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      res[key] = convertTimestampsToISO(data[key]);
    }
    return res;
  }
  return data;
}

function mapDocToType<T extends { id: string }>(docSnap: import('firebase/firestore').DocumentSnapshot): T | undefined {
    if (!docSnap.exists()) return undefined;
    const data = docSnap.data();
    const convertedData = convertTimestampsToISO(data);
    return { ...convertedData, id: docSnap.id } as T;
}

function mapDocsToTypeArray<T extends { id: string }>(querySnapshot: import('firebase/firestore').QuerySnapshot): T[] {
    return querySnapshot.docs.map(d => mapDocToType<T>(d) as T).filter(item => item !== undefined);
}


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

    const settingsRef = collection(db, "settings");
    
    // Seed Job Settings
    const jobSettingsDocRef = doc(settingsRef, 'jobs');
    const jobSettingsSnap = await getDoc(jobSettingsDocRef);
    if (!jobSettingsSnap.exists()) {
        console.log("Job settings not found in Firestore, creating default...");
        await setDoc(jobSettingsDocRef, { maxJobsPerUser: 5, maxTimerDurationDays: 10 });
    }

    // Seed Admin User
    const usersCol = collection(db, "users");
    const adminQuery = query(usersCol, where("email", "==", "a"), where("role", "==", "admin"), limit(1));
    const adminSnapshot = await getDocs(adminQuery);
    if (adminSnapshot.empty) {
        console.log("Admin user (a/a) not found in Firestore, creating one...");
        const adminData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
            email: 'a',
            password: 'a', 
            role: 'admin',
            name: 'Administrator (Firestore)',
            themePreference: 'system',
            addresses: [],
        };
        try {
            const userDocRef = doc(usersCol); 
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
        const adminDoc = adminSnapshot.docs[0];
        const adminData = adminDoc.data() as User;
        if (adminData.password !== 'a') {
            await updateDoc(adminDoc.ref, { password: 'a', updatedAt: serverTimestamp() });
            console.log("Updated existing admin password to 'a' for convenience.");
        }
        let needsUpdate = false;
        const updatePayload: Partial<User> = {};
        if (adminData.themePreference === undefined) {
            updatePayload.themePreference = 'system';
            needsUpdate = true;
        }
        if (adminData.addresses === undefined) {
            updatePayload.addresses = [];
            needsUpdate = true;
        }
        if(needsUpdate) {
            await updateDoc(adminDoc.ref, {...updatePayload, updatedAt: serverTimestamp() });
            console.log("Default admin user updated with missing fields (themePreference, addresses).")
        }
    }

    // Seed Categories
    const categoriesCol = collection(db, "categories");
    const catSnapshot = await getDocs(query(categoriesCol, limit(1)));
    if (catSnapshot.empty) {
        console.log("No categories found in Firestore, seeding initial categories...");
        const mockCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
          { name: 'Electronics (FS)', slug: 'electronics-fs', description: 'FS Gadgets & Devices', parentId: null, imageId: null, displayOrder: 1, isActive: true },
          { name: 'Books (FS)', slug: 'books-fs', description: 'FS Fiction & Non-Fiction', parentId: null, imageId: null, displayOrder: 2, isActive: true },
          { name: 'Home Goods (FS)', slug: 'home-goods-fs', description: 'FS For your home', parentId: null, imageId: null, displayOrder: 3, isActive: true },
          { name: 'Apparel (FS)', slug: 'apparel-fs', description: 'FS Clothing & Accessories', parentId: null, imageId: null, displayOrder: 4, isActive: true },
        ];
        const batch = writeBatch(db);
        mockCategories.forEach(catData => {
            const catDocRef = doc(categoriesCol);
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
    
    // Seed Job Categories
    const jobCategoriesCol = collection(db, "jobCategories");
    const jobCatSnapshot = await getDocs(query(jobCategoriesCol, limit(1)));
    if (jobCatSnapshot.empty) {
        console.log("No job categories found, seeding initial...");
         const mockJobCategories: Omit<JobCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
            { name: 'Manual Labor', slug: 'manual-labor', description: 'Physical tasks like moving, cleaning, etc.' },
            { name: 'Delivery', slug: 'delivery', description: 'Transporting items from one place to another.' },
        ];
        const batch = writeBatch(db);
        mockJobCategories.forEach(catData => {
            const catDocRef = doc(jobCategoriesCol);
            batch.set(catDocRef, {
                ...catData,
                id: catDocRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        });
        await batch.commit();
    }
  },

  async getUsers(): Promise<User[]> {
    if (!db) throw new Error("Firestore not initialized");
    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    return mapDocsToTypeArray<User>(userSnapshot);
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
    const clientNewUser: User = {
        ...userData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: userData.role || 'customer',
        themePreference: userData.themePreference || 'system',
        addresses: [],
    };
    return clientNewUser;
  },
  async updateUser(updatedUser: User): Promise<User | null> {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = doc(db, "users", updatedUser.id);
    const updatePayload: any = { ...updatedUser };
    delete updatePayload.id; 
    delete updatePayload.createdAt; 
    updatePayload.updatedAt = serverTimestamp();
    if (updatePayload.password === undefined || updatePayload.password === '') {
        delete updatePayload.password;
    }
    await updateDoc(userRef, updatePayload);
    const docSnap = await getDoc(userRef);
    return mapDocToType<User>(docSnap);
  },
  async deleteUser(userId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "users", userId));
      const wishlistCol = collection(db, `users/${userId}/wishlist`);
      const wishlistSnapshot = await getDocs(wishlistCol);
      wishlistSnapshot.docs.forEach(d => batch.delete(d.ref));
      const reviewsQuery = query(collectionGroup(db, 'reviews'), where('userId', '==', userId));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      reviewsSnapshot.forEach(reviewDoc => batch.delete(reviewDoc.ref));
      await batch.commit();
      localDBServiceFallback.clearCart(userId); 
      return true;
    } catch (error) {
      console.error("Error deleting user and related data from Firestore:", error);
      return false;
    }
  },
  async findUserByEmail(email: string): Promise<User | undefined> {
    if (!db) throw new Error("Firestore not initialized");
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return mapDocToType<User>(querySnapshot.docs[0]);
    }
    return undefined;
  },
  async findUserById(userId: string): Promise<User | undefined> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    return mapDocToType<User>(docSnap);
  },

  async getUserAddresses(userId: string): Promise<Address[]> {
    const user = await this.findUserById(userId);
    return user?.addresses || [];
  },
  async addAddressToUser(userId, addressData): Promise<Address | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    const newAddress: Address = {
      ...addressData,
      id: doc(collection(db!, "users")).id.substring(0, 20), 
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
    return mapDocsToTypeArray<Product>(productSnapshot);
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
        views:0, purchases:0, averageRating:0, reviewCount:0,
        primaryImageId: productData.primaryImageId || null,
        additionalImageIds: productData.additionalImageIds || [],
    } as Product;
  },
  async updateProduct(updatedProduct: Product): Promise<Product | null> {
    if (!db) throw new Error("Firestore not initialized");
    const productRef = doc(db, "products", updatedProduct.id);
    const updatePayload: any = { ...updatedProduct };
    delete updatePayload.id;
    delete updatePayload.createdAt;
    updatePayload.updatedAt = serverTimestamp();
    await updateDoc(productRef, updatePayload);
    const docSnap = await getDoc(productRef);
    return mapDocToType<Product>(docSnap);
  },
  async deleteProduct(productId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const productRef = doc(db, "products", productId);
      const product = await this.findProductById(productId); 

      const batch = writeBatch(db!);
      const reviewsCol = collection(db, `products/${productId}/reviews`);
      const reviewsSnapshot = await getDocs(reviewsCol);
      reviewsSnapshot.docs.forEach(d => batch.delete(d.ref));
      
      batch.delete(productRef);
      await batch.commit();

      if (product) {
        const imageIdsToDelete = [product.primaryImageId, ...(product.additionalImageIds || [])].filter(id => !!id) as string[];
        for (const imageUrl of imageIdsToDelete) {
            if (imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
                await this.deleteImage(imageUrl);
            } else {
                await deleteImageFromLocalDB(imageUrl); // Fallback to local if it's an old ID
            }
        }
      }
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
    return mapDocToType<Product>(docSnap);
  },

  async getCategories(): Promise<Category[]> {
    if (!db) throw new Error("Firestore not initialized");
    const categoriesCol = collection(db, "categories");
    const q = query(categoriesCol, orderBy("displayOrder"));
    const categorySnapshot = await getDocs(q);
    return mapDocsToTypeArray<Category>(categorySnapshot);
  },
  async addCategory(categoryData): Promise<Category> {
    if (!db) throw new Error("Firestore not initialized");
    const catRef = collection(db, "categories");
    const docRef = doc(catRef);
    const now = serverTimestamp();
    const newCategoryFSData = {
      ...categoryData,
      id: docRef.id,
      imageId: categoryData.imageId || null,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, newCategoryFSData);
    return {
      ...categoryData,
      id: docRef.id,
      imageId: categoryData.imageId || null,
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(), 
    } as Category;
  },
  async updateCategory(updatedCategory: Category): Promise<Category | null> {
    if (!db) throw new Error("Firestore not initialized");
    const catRef = doc(db, "categories", updatedCategory.id);
    const updatePayload: any = { ...updatedCategory };
    delete updatePayload.id;
    delete updatePayload.createdAt;
    updatePayload.updatedAt = serverTimestamp();
    await updateDoc(catRef, updatePayload);
    const docSnap = await getDoc(catRef);
    return mapDocToType<Category>(docSnap);
  },
  async deleteCategory(categoryId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const categoryToDelete = await this.findCategoryById(categoryId);
      if (!categoryToDelete) return false;

      const batch = writeBatch(db);
      const productsQuery = query(collection(db, "products"), where("categoryId", "==", categoryId));
      const productsSnapshot = await getDocs(productsQuery);
      productsSnapshot.forEach(prodDoc => {
        batch.update(prodDoc.ref, { categoryId: null, updatedAt: serverTimestamp() });
      });

      const childCategoriesQuery = query(collection(db, "categories"), where("parentId", "==", categoryId));
      const childCategoriesSnapshot = await getDocs(childCategoriesQuery);
      childCategoriesSnapshot.forEach(childDoc => {
        batch.update(childDoc.ref, { parentId: null, updatedAt: serverTimestamp() });
      });

      if(categoryToDelete.imageId){
          if (categoryToDelete.imageId.startsWith('https://firebasestorage.googleapis.com')) {
            await this.deleteImage(categoryToDelete.imageId);
          } else {
            await deleteImageFromLocalDB(categoryToDelete.imageId); // Fallback
          }
      }
      batch.delete(doc(db, "categories", categoryId));
      await batch.commit();
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
    return mapDocToType<Category>(docSnap);
  },
  async getChildCategories(parentId: string | null): Promise<Category[]> {
    if (!db) throw new Error("Firestore not initialized");
    const categoriesCol = collection(db, "categories");
    const q = query(categoriesCol, where("parentId", "==", parentId), orderBy("displayOrder"));
    const snapshot = await getDocs(q);
    return mapDocsToTypeArray<Category>(snapshot);
  },
  async getJobCategories(): Promise<JobCategory[]> {
    if (!db) throw new Error("Firestore not initialized");
    const jobCategoriesCol = collection(db, "jobCategories");
    const q = query(jobCategoriesCol, orderBy("name"));
    const snapshot = await getDocs(q);
    return mapDocsToTypeArray<JobCategory>(snapshot);
  },
  async addJobCategory(categoryData): Promise<JobCategory> {
    if (!db) throw new Error("Firestore not initialized");
    const catRef = collection(db, "jobCategories");
    const docRef = doc(catRef);
    const now = serverTimestamp();
    const newCategoryFSData = { ...categoryData, id: docRef.id, createdAt: now, updatedAt: now };
    await setDoc(docRef, newCategoryFSData);
    return { ...categoryData, id: docRef.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  },
  async updateJobCategory(updatedCategory: JobCategory): Promise<JobCategory | null> {
    if (!db) throw new Error("Firestore not initialized");
    const catRef = doc(db, "jobCategories", updatedCategory.id);
    const updatePayload: any = { ...updatedCategory };
    delete updatePayload.id;
    delete updatePayload.createdAt;
    updatePayload.updatedAt = serverTimestamp();
    await updateDoc(catRef, updatePayload);
    const docSnap = await getDoc(catRef);
    return mapDocToType<JobCategory>(docSnap);
  },
  async deleteJobCategory(categoryId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const batch = writeBatch(db);
      const jobsQuery = query(collection(db, "jobs"), where("categoryId", "==", categoryId));
      const jobsSnapshot = await getDocs(jobsQuery);
      jobsSnapshot.forEach(jobDoc => {
        batch.update(jobDoc.ref, { categoryId: null, updatedAt: serverTimestamp() });
      });
      batch.delete(doc(db, "jobCategories", categoryId));
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Error deleting job category from Firestore:", e);
      return false;
    }
  },
  async findJobCategoryById(categoryId: string | null): Promise<JobCategory | undefined> {
    if (!db || !categoryId) return undefined;
    const docRef = doc(db, "jobCategories", categoryId);
    const docSnap = await getDoc(docRef);
    return mapDocToType<JobCategory>(docSnap);
  },

  async getCart(userId: string): Promise<Cart | null> {
    return localDBServiceFallback.getCart(userId);
  },
  async updateCart(cart: Cart): Promise<void> {
    return localDBServiceFallback.updateCart(cart);
  },
  async clearCart(userId: string): Promise<void> {
    return localDBServiceFallback.clearCart(userId);
  },
  async moveToSavedForLater(userId: string, productId: string): Promise<void> {
    return localDBServiceFallback.moveToSavedForLater(userId, productId);
  },
  async moveToCartFromSaved(userId: string, productId: string): Promise<boolean> {
    return localDBServiceFallback.moveToCartFromSaved(userId, productId);
  },
  async removeFromSavedForLater(userId: string, productId: string): Promise<void> {
    return localDBServiceFallback.removeFromSavedForLater(userId, productId);
  },

  async getOrders(userId?: string): Promise<Order[]> {
    if (!db) throw new Error("Firestore not initialized");
    let q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
    if (userId) {
      q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("orderDate", "desc"));
    }
    const orderSnapshot = await getDocs(q);
    return mapDocsToTypeArray<Order>(orderSnapshot);
  },
  async addOrder(orderData): Promise<Order> {
    if (!db) throw new Error("Firestore not initialized");
    const ordersRef = collection(db, "orders");
    const newOrderRef = doc(ordersRef); 

    try {
      const finalOrder = await runTransaction(db, async (transaction) => {
        const orderItemsWithDetails: OrderItem[] = [];
        for (const item of orderData.items) {
          const productRef = doc(db!, "products", item.productId);
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
            name: product.name || 'Unknown Product',
            primaryImageId: product.primaryImageId,
          });
          
          transaction.update(productRef, { 
            stock: product.stock - item.quantity,
            purchases: (product.purchases || 0) + item.quantity,
            updatedAt: serverTimestamp()
          });
        }

        const newOrderDataFS = {
          ...orderData,
          id: newOrderRef.id, 
          items: orderItemsWithDetails,
          shippingAddress: orderData.shippingAddress,
          orderDate: serverTimestamp(),
        };
        transaction.set(newOrderRef, newOrderDataFS);
        
        return {
            ...orderData,
            id: newOrderRef.id,
            items: orderItemsWithDetails,
            orderDate: new Date().toISOString(), 
        } as Order;
      });
      return finalOrder;
    } catch (e) {
      console.error("Firestore addOrder transaction failed: ", e);
      throw e;
    }
  },

  async getLoginActivity(): Promise<LoginActivity[]> {
    if (!db) throw new Error("Firestore not initialized");
    const logsCol = collection(db, "loginActivities");
    const q = query(logsCol, orderBy("timestamp", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return mapDocsToTypeArray<LoginActivity>(snapshot);
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
        }).catch(err => console.error("Error updating lastLogin:", err));
    }
  },

  setCurrentUser(user: User | null): void {
    localDBServiceFallback.setCurrentUser(user);
  },
  getCurrentUser(): (User & { role: UserRole }) | null {
    return localDBServiceFallback.getCurrentUser();
  },

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    if (!db) throw new Error("Firestore not initialized");
    const wishlistCol = collection(db, `users/${userId}/wishlist`);
    const snapshot = await getDocs(query(wishlistCol, orderBy("addedAt", "desc")));
    return mapDocsToTypeArray<WishlistItem>(snapshot);
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
    return mapDocsToTypeArray<Review>(snapshot);
  },
  async addReview(reviewData): Promise<Review> {
    if (!db) throw new Error("Firestore not initialized");
    const reviewsCol = collection(db, `products/${reviewData.productId}/reviews`);
    const reviewDocRef = doc(reviewsCol);
    const newReviewFSData = {
      ...reviewData,
      id: reviewDocRef.id,
      createdAt: serverTimestamp(),
    };

    const productRef = doc(db, "products", reviewData.productId);
    await runTransaction(db, async (transaction) => {
        transaction.set(reviewDocRef, newReviewFSData); 

        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error("Product not found for review update!");
        
        const productData = productDoc.data() as Product;
        const oldReviewCount = productData.reviewCount || 0;
        const oldTotalRating = (productData.averageRating || 0) * oldReviewCount;
        
        const newReviewCount = oldReviewCount + 1;
        const newTotalRating = oldTotalRating + reviewData.rating;
        const newAverageRating = newReviewCount > 0 ? newTotalRating / newReviewCount : 0;

        transaction.update(productRef, {
            averageRating: newAverageRating,
            reviewCount: newReviewCount,
            updatedAt: serverTimestamp(),
        });
    });
    return { ...reviewData, id: reviewDocRef.id, createdAt: new Date().toISOString() }; 
  },
  async deleteReview(reviewIdString: string): Promise<void> { 
    if (!db) throw new Error("Firestore not initialized");
    
    const parts = reviewIdString.split('/'); 
    let productId: string | undefined;
    let reviewDocId: string;

    if (parts.length === 2) {
        productId = parts[0];
        reviewDocId = parts[1];
    } else if (parts.length === 1) {
        reviewDocId = parts[0];
        const reviewsGroup = collectionGroup(db, 'reviews');
        const q = query(reviewsGroup, where(documentId(), '==', reviewDocId), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.warn(`Review with ID ${reviewDocId} not found via collectionGroup query.`);
            return;
        }
        const reviewData = snapshot.docs[0].data() as Review;
        productId = reviewData.productId;
    } else {
        console.error("Invalid reviewId format for Firestore deletion. Got:", reviewIdString);
        return;
    }
    
    if(!productId) {
        console.error("Could not determine product ID for review deletion:", reviewIdString);
        return;
    }

    const reviewRef = doc(db, `products/${productId}/reviews`, reviewDocId);
    const reviewSnap = await getDoc(reviewRef);
    if (!reviewSnap.exists()) {
        console.warn(`Review products/${productId}/reviews/${reviewDocId} not found for deletion.`);
        return;
    }
    const reviewDataToDelete = reviewSnap.data() as Review;
    const productRef = doc(db, "products", productId);

    await runTransaction(db, async (transaction) => {
        transaction.delete(reviewRef);

        const productDoc = await transaction.get(productRef);
        if (productDoc.exists()) {
            const productData = productDoc.data() as Product;
            const oldReviewCount = productData.reviewCount || 0;
            const oldTotalRating = (productData.averageRating || 0) * oldReviewCount;
            const newReviewCount = Math.max(0, oldReviewCount - 1);
            const newTotalRating = oldTotalRating - reviewDataToDelete.rating;
            const newAverageRating = newReviewCount > 0 ? newTotalRating / newReviewCount : 0;
            transaction.update(productRef, {
                averageRating: newAverageRating,
                reviewCount: newReviewCount,
                updatedAt: serverTimestamp(),
            });
        }
    });
  },

  async getRecentlyViewed(userId: string): Promise<RecentlyViewedItem[]> {
    return localDBServiceFallback.getRecentlyViewed(userId); 
  },
  async addRecentlyViewed(userId: string, productId: string): Promise<void> {
    if (db) {
        const productRef = doc(db, "products", productId);
        try {
            await runTransaction(db, async (transaction) => {
                const productSnap = await transaction.get(productRef);
                if (productSnap.exists()) {
                    const productData = productSnap.data() as Product;
                    transaction.update(productRef, {
                        views: (productData.views || 0) + 1,
                        updatedAt: serverTimestamp()
                    });
                }
            });
        } catch (e) {
            console.error("Error updating product views in Firestore:", e);
        }
    }
    return localDBServiceFallback.addRecentlyViewed(userId, productId); 
  },

  async getGlobalTheme(): Promise<Theme> {
    return localDBServiceFallback.getGlobalTheme(); 
  },
  async setGlobalTheme(theme: Theme): Promise<void> {
    return localDBServiceFallback.setGlobalTheme(theme); 
  },

  async getAdminActionLogs(): Promise<AdminActionLog[]> {
    if (!db) throw new Error("Firestore not initialized for admin logs");
    const logsCollection = collection(db, 'adminActionLogs');
    const q = query(logsCollection, orderBy('timestamp', 'desc'), limit(MAX_FIRESTORE_ADMIN_LOGS));
    const snapshot = await getDocs(q);
    return mapDocsToTypeArray<AdminActionLog>(snapshot);
  },
  async addAdminActionLog(logData: Omit<AdminActionLog, 'id' | 'timestamp'>): Promise<void> {
    if (!db) throw new Error("Firestore not initialized for admin logs");
    const logsCollection = collection(db, 'adminActionLogs');
    const logDocRef = doc(logsCollection);
    await setDoc(logDocRef, {
      ...logData,
      id: logDocRef.id,
      timestamp: serverTimestamp(),
    });
    const snapshot = await getDocs(query(logsCollection, orderBy('timestamp', 'asc')));
    if (snapshot.size > MAX_FIRESTORE_ADMIN_LOGS) {
        const batch = writeBatch(db);
        let numToDelete = snapshot.size - MAX_FIRESTORE_ADMIN_LOGS;
        for (let i = 0; i < numToDelete && i < snapshot.docs.length && i < BATCH_LIMIT; i++) {
            batch.delete(snapshot.docs[i].ref);
        }
        await batch.commit().catch(err => console.error("Error trimming admin logs:", err));
    }
  },

  async saveImage(entityId: string, imageType: string, imageFile: File): Promise<string> {
    if (!firebaseStorage) {
      console.warn("Firebase Storage not available, falling back to LocalDB for image save.");
      return saveImageToLocalDB(entityId, imageType, imageFile);
    }
    const filePath = `images/${entityId}/${imageType}/${Date.now()}_${imageFile.name}`;
    const fileRef = storageRef(firebaseStorage, filePath);
    
    try {
      const uploadTask = await uploadBytesResumable(fileRef, imageFile);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image to Firebase Storage:", error);
      throw error;
    }
  },

  async getImage(imageId: string): Promise<Blob | null> {
     if (imageId.startsWith('http')) {
        console.warn("firestoreDataService.getImage called with a URL, this should be handled by client. Returning null.");
        return null;
    }
    return getImageFromLocalDB(imageId);
  },

  async deleteImage(imageId: string): Promise<void> {
    if (imageId.startsWith('http')) { // Assume it's a Firebase Storage URL
        if (!firebaseStorage) {
          console.warn("Firebase Storage not available for image deletion. Image URL:", imageId);
          return;
        }
        try {
          const imageRef = storageRef(firebaseStorage, imageId);
          await deleteObject(imageRef);
        } catch (error) {
          if ((error as any).code === 'storage/object-not-found') {
            console.warn(`Image not found in Firebase Storage for deletion: ${imageId}`);
          } else {
            console.error("Error deleting image from Firebase Storage:", error, imageId);
          }
        }
    } else {
        await deleteImageFromLocalDB(imageId);
    }
  },

  async deleteImagesForEntity(imageIds: string[]): Promise<void> {
    for (const id of imageIds) {
        if (id) await this.deleteImage(id);
    }
  },

  // Job Methods
  async getJobs(options = {}): Promise<Job[]> {
    if (!db) throw new Error("Firestore not initialized");
    const jobsColRef = collection(db, "jobs");
    const queryConstraints: any[] = [orderBy("createdAt", "desc")];
    if (options.status) queryConstraints.unshift(where("status", "==", options.status));
    if (options.createdById) queryConstraints.unshift(where("createdById", "==", options.createdById));
    if (options.acceptedById) queryConstraints.unshift(where("acceptedById", "==", options.acceptedById));
    
    const q = query(jobsColRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    const jobs = mapDocsToTypeArray<Job>(snapshot);

    const now = new Date();
    const batch = writeBatch(db);
    let hasUpdates = false;
    jobs.forEach(job => {
        if (job.status === 'open' && new Date(job.expiresAt) < now) {
            batch.update(doc(db!, "jobs", job.id), { status: 'expired' });
            job.status = 'expired'; 
            hasUpdates = true;
        }
    });
    if (hasUpdates) await batch.commit();
    
    return jobs;
  },
  async findJobById(jobId: string): Promise<Job | undefined> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "jobs", jobId);
    const docSnap = await getDoc(docRef);
    return mapDocToType<Job>(docSnap);
  },
  async addJob(jobData, images?): Promise<Job> {
    if (!db) throw new Error("Firestore not initialized");
    const creator = await this.findUserById(jobData.createdById);
    if (!creator) throw new Error("Job creator not found");

    const jobsRef = collection(db, "jobs");
    const docRef = doc(jobsRef);

    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      const uploadPromises = images.map((file, index) => 
        this.saveImage(`job_${docRef.id}`, `image_${index}`, file)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    const newJobFSData = {
      ...jobData,
      id: docRef.id,
      status: 'open',
      createdAt: serverTimestamp(),
      createdByName: creator.name || creator.email,
      creatorHasReviewed: false,
      acceptorHasReviewed: false,
      imageUrls: imageUrls,
      categoryId: jobData.categoryId || null,
    };
    await setDoc(docRef, newJobFSData);
    return { ...jobData, id: docRef.id, status: 'open', createdAt: new Date().toISOString(), createdByName: creator.name || creator.email, creatorHasReviewed: false, acceptorHasReviewed: false, imageUrls: imageUrls, categoryId: jobData.categoryId };
  },
  async updateJob(updatedJob): Promise<Job | null> {
    if (!db) throw new Error("Firestore not initialized");
    const jobRef = doc(db, "jobs", updatedJob.id);
    const oldJobSnap = await getDoc(jobRef);
    const oldJob = oldJobSnap.data() as Job | undefined;
    
    const updatePayload: any = { ...updatedJob, updatedAt: serverTimestamp() };
    await updateDoc(jobRef, updatePayload);

    if (oldJob && oldJob.status !== 'completed' && updatedJob.status === 'completed' && oldJob.acceptedById) {
      await this.addNotification({
        userId: oldJob.acceptedById,
        message: `Your job "${oldJob.title}" was marked as complete.`,
        link: `/profile/jobs`,
        type: 'job_completed',
        isRead: false
      });
    }

    const docSnap = await getDoc(jobRef);
    return mapDocToType<Job>(docSnap);
  },
  async deleteJob(jobId: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const jobToDelete = await this.findJobById(jobId);
      if (jobToDelete?.imageUrls && jobToDelete.imageUrls.length > 0) {
          await this.deleteImagesForEntity(jobToDelete.imageUrls);
      }
      await deleteDoc(doc(db, "jobs", jobId));
      return true;
    } catch (e) {
      console.error("Error deleting job from Firestore:", e);
      return false;
    }
  },
  async acceptJob(jobId, acceptingUserId, acceptingUserName): Promise<Job | null> {
    if (!db) throw new Error("Firestore not initialized");
    const jobRef = doc(db, "jobs", jobId);
    try {
      let jobCreatorId: string;
      await runTransaction(db, async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists() || jobDoc.data().status !== 'open') {
          throw new Error("Job is not available to be accepted.");
        }
        jobCreatorId = jobDoc.data().createdById;
        transaction.update(jobRef, {
          status: 'accepted',
          acceptedById: acceptingUserId,
          acceptedByName: acceptingUserName,
          acceptedAt: serverTimestamp(),
        });
      });
      const updatedJobDoc = await getDoc(jobRef);
      const updatedJob = mapDocToType<Job>(updatedJobDoc);

      if (updatedJob) {
        await this.addNotification({
            userId: updatedJob.createdById,
            message: `${acceptingUserName} accepted your job: "${updatedJob.title}"`,
            link: `/profile/jobs`,
            type: 'job_accepted',
            isRead: false
        });
      }
      return updatedJob;
    } catch (error) {
      console.error("Error accepting job:", error);
      return null;
    }
  },
  async getChatForJob(jobId: string): Promise<ChatMessage[]> {
    if (!db) throw new Error("Firestore not initialized");
    const chatCol = collection(db, `jobs/${jobId}/chatMessages`);
    const q = query(chatCol, orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);
    return mapDocsToTypeArray<ChatMessage>(snapshot);
  },
  async sendMessage(jobId: string, messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'jobId'>): Promise<ChatMessage> {
    if (!db) throw new Error("Firestore not initialized");
    const job = await this.findJobById(jobId);
    if (!job) throw new Error("Job not found");

    const chatCol = collection(db, `jobs/${jobId}/chatMessages`);
    const docRef = await addDoc(chatCol, {
      ...messageData,
      jobId,
      timestamp: serverTimestamp(),
    });

    const recipientId = messageData.senderId === job.createdById ? job.acceptedById : job.createdById;
    if (recipientId) {
        await this.addNotification({
            userId: recipientId,
            message: `New message from ${messageData.senderName} for job: "${job.title}"`,
            link: `/jobs/${jobId}/chat`,
            type: 'new_message',
            isRead: false,
        });
    }

    return {
      ...messageData,
      id: docRef.id,
      jobId,
      timestamp: new Date().toISOString(),
    };
  },
  
  async getJobSettings(): Promise<JobSettings> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "settings", "jobs");
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as JobSettings : { maxJobsPerUser: 5, maxTimerDurationDays: 10 };
  },
  async updateJobSettings(settings: JobSettings): Promise<JobSettings> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "settings", "jobs");
    await setDoc(docRef, settings, { merge: true });
    return settings;
  },

  async addJobReview(reviewData): Promise<JobReview> {
    if (!db) throw new Error("Firestore not initialized");
    const reviewsCol = collection(db, `jobs/${reviewData.jobId}/jobReviews`);
    const reviewDocRef = doc(reviewsCol);

    const newReviewFSData = {
      ...reviewData,
      id: reviewDocRef.id,
      createdAt: serverTimestamp(),
    };
    
    const jobRef = doc(db, "jobs", reviewData.jobId);
    
    await runTransaction(db, async (transaction) => {
        transaction.set(reviewDocRef, newReviewFSData);

        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw new Error("Job not found for review update!");
        
        const updatePayload: { creatorHasReviewed?: boolean, acceptorHasReviewed?: boolean, updatedAt: any } = { updatedAt: serverTimestamp() };
        if (jobDoc.data().createdById === reviewData.reviewerId) {
            updatePayload.creatorHasReviewed = true;
        } else if (jobDoc.data().acceptedById === reviewData.reviewerId) {
            updatePayload.acceptorHasReviewed = true;
        }
        
        transaction.update(jobRef, updatePayload);
    });

    return { ...reviewData, id: reviewDocRef.id, createdAt: new Date().toISOString() };
  },
  async getReviewsForJob(jobId: string): Promise<JobReview[]> {
      if (!db) throw new Error("Firestore not initialized");
      const reviewsCol = collection(db, `jobs/${jobId}/jobReviews`);
      const q = query(reviewsCol, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return mapDocsToTypeArray<JobReview>(snapshot);
  },
  async getReviewsAboutUser(userId: string): Promise<JobReview[]> {
      if (!db) throw new Error("Firestore not initialized");
      const reviewsGroup = collectionGroup(db, 'jobReviews');
      const q = query(reviewsGroup, where('revieweeId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return mapDocsToTypeArray<JobReview>(snapshot);
  },
  async addNotification(notificationData): Promise<Notification> {
    if (!db) throw new Error("Firestore not initialized");
    const notificationsCol = collection(db, `users/${notificationData.userId}/notifications`);
    const docRef = await addDoc(notificationsCol, {
      ...notificationData,
      createdAt: serverTimestamp(),
    });
    return { ...notificationData, id: docRef.id, createdAt: new Date().toISOString() };
  },
  async getNotifications(userId: string): Promise<Notification[]> {
    if (!db) throw new Error("Firestore not initialized");
    const notificationsCol = collection(db, `users/${userId}/notifications`);
    const q = query(notificationsCol, orderBy("createdAt", "desc"), limit(20));
    const snapshot = await getDocs(q);
    return mapDocsToTypeArray<Notification>(snapshot);
  },
  async markNotificationAsRead(userId, notificationId): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    const notificationRef = doc(db, `users/${userId}/notifications`, notificationId);
    await updateDoc(notificationRef, { isRead: true });
    return true;
  },
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const notificationsCol = collection(db, `users/${userId}/notifications`);
    const q = query(notificationsCol, where("isRead", "==", false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  },
};
