
// src/lib/firestoreDataService.ts
'use client';

import type {
  User, Product, Category, Cart, Order, UserRole,
  WishlistItem, Review, RecentlyViewedItem, Address, ActivityLog, Theme, CartItem, OrderItem,
  Job, JobSettings, ChatMessage, JobReview, JobCategory, Notification, JobSavedItem
} from '@/types';
import type { IDataService } from './dataService';
import type { Firestore } from 'firebase/firestore';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp, Timestamp, runTransaction, collectionGroup, documentId
} from 'firebase/firestore';
import { storage as firebaseStorage, db as firebaseDBInstance } from './firebase'; // Import Firebase Storage instance
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';


// Import the original localStorageDataService for fallbacks or specific local operations
import { localStorageDataService as localDBServiceFallback } from './localStorageDataService'; // For fallbacks


let db: Firestore | null = null;

const MAX_ACTIVITY_LOGS = 500; 
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
        await setDoc(jobSettingsDocRef, { 
            maxJobsPerUser: 5, 
            maxTimerDurationDays: 10,
            enableJobCreation: true,
            requireCompensation: false,
            maxCompensationAmount: 10000,
            allowUserJobEditing: true,
            markNewJobsAsUrgent: false,
        });
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
            name: 'Administrator',
            themePreference: 'system',
            addresses: [],
            averageJobRating: 0,
            jobReviewCount: 0,
            skills: [],
            badges: [],
            jobsCreatedCount: 0,
            jobsCompletedCount: 0,
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
        let needsUpdate = false;
        const updatePayload: Partial<User> = {};

        if (adminData.password !== 'a') { updatePayload.password = 'a'; needsUpdate = true; }
        if (adminData.themePreference === undefined) { updatePayload.themePreference = 'system'; needsUpdate = true; }
        if (adminData.addresses === undefined) { updatePayload.addresses = []; needsUpdate = true; }
        if (adminData.averageJobRating === undefined) { updatePayload.averageJobRating = 0; needsUpdate = true; }
        if (adminData.jobReviewCount === undefined) { updatePayload.jobReviewCount = 0; needsUpdate = true; }
        if (adminData.skills === undefined) { updatePayload.skills = []; needsUpdate = true; }
        if (adminData.badges === undefined) { updatePayload.badges = []; needsUpdate = true; }
        if (adminData.jobsCreatedCount === undefined) { updatePayload.jobsCreatedCount = 0; needsUpdate = true; }
        if (adminData.jobsCompletedCount === undefined) { updatePayload.jobsCompletedCount = 0; needsUpdate = true; }
        if (adminData.name !== 'Administrator') { updatePayload.name = 'Administrator'; needsUpdate = true; }

        if(needsUpdate) {
            await updateDoc(adminDoc.ref, {...updatePayload, updatedAt: serverTimestamp() });
            console.log("Default admin user updated with missing or incorrect fields.")
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
      averageJobRating: 0,
      jobReviewCount: 0,
      skills: [],
      badges: [],
      jobsCreatedCount: 0,
      jobsCompletedCount: 0,
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
        averageJobRating: 0,
        jobReviewCount: 0,
        skills: [],
        badges: [],
        jobsCreatedCount: 0,
        jobsCompletedCount: 0,
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
    const user = mapDocToType<User>(docSnap);

    if (user) {
        // Calculate dynamic stats
        const jobsCreatedQuery = query(collection(db, 'jobs'), where('createdById', '==', userId));
        const jobsCompletedQuery = query(collection(db, 'jobs'), where('acceptedById', '==', userId), where('status', '==', 'completed'));
        const [createdSnap, completedSnap] = await Promise.all([getDocs(jobsCreatedQuery), getDocs(jobsCompletedQuery)]);
        user.jobsCreatedCount = createdSnap.size;
        user.jobsCompletedCount = completedSnap.size;
        
        // Calculate badges
        const badges: string[] = [];
        if (user.jobsCompletedCount > 0) badges.push('first-job-done');
        if (user.jobsCompletedCount >= 5) badges.push('community-star');
        if ((user.averageJobRating || 0) >= 4.5 && (user.jobReviewCount || 0) >= 2) badges.push('top-rated');
        user.badges = badges;
    }
    
    return user;
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
          await this.deleteImage(imageUrl);
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

      // The UI now handles product re-assignment or deletion before this is called.
      // The UI also prevents deleting categories with sub-categories.

      const batch = writeBatch(db);
      
      const childCategoriesQuery = query(collection(db, "categories"), where("parentId", "==", categoryId));
      const childCategoriesSnapshot = await getDocs(childCategoriesQuery);
      childCategoriesSnapshot.forEach(childDoc => {
        batch.update(childDoc.ref, { parentId: null, updatedAt: serverTimestamp() });
      });

      if(categoryToDelete.imageId){
          await this.deleteImage(categoryToDelete.imageId);
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
    // Removed orderBy to avoid needing a composite index. Sorting is now done on the client.
    const q = query(categoriesCol, where("parentId", "==", parentId));
    const snapshot = await getDocs(q);
    const categories = mapDocsToTypeArray<Category>(snapshot);
    // Sort client-side
    return categories.sort((a,b) => a.displayOrder - b.displayOrder);
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
    let q;
    if (userId) {
      // Query by userId without ordering to avoid needing a composite index
      q = query(collection(db, "orders"), where("userId", "==", userId));
    } else {
      // Get all orders, ordered by date
      q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
    }
    const orderSnapshot = await getDocs(q);
    const orders = mapDocsToTypeArray<Order>(orderSnapshot);
    
    // If we filtered by user, we need to sort manually on the client-side
    if (userId) {
      orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }
    
    return orders;
  },
  
  async addOrder(orderData, actor): Promise<Order> {
    if (!db) throw new Error("Firestore not initialized");
    const newOrderRef = doc(collection(db, "orders"));

    try {
      const finalOrder = await runTransaction(db, async (transaction) => {
        // PHASE 1: READ all products
        const productRefs = orderData.items.map(item => doc(db!, "products", item.productId));
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // PHASE 2: VALIDATE all products
        const productsData: { product: Product, snap: any }[] = [];
        for (let i = 0; i < productSnaps.length; i++) {
          const productSnap = productSnaps[i];
          if (!productSnap.exists()) {
            throw new Error(`Product with ID ${orderData.items[i].productId} not found.`);
          }
          const product = productSnap.data() as Product;
          if (product.stock < orderData.items[i].quantity) {
            throw new Error(`Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${orderData.items[i].quantity}`);
          }
          productsData.push({ product, snap: productSnap });
        }
        
        // PHASE 3: WRITE all updates
        const orderItemsWithDetails: OrderItem[] = [];
        productsData.forEach((pData, i) => {
          const item = orderData.items[i]; // This is a CartItem
          transaction.update(pData.snap.ref, {
            stock: pData.product.stock - item.quantity,
            purchases: (pData.product.purchases || 0) + item.quantity,
            updatedAt: serverTimestamp()
          });

          orderItemsWithDetails.push({
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: item.price,
            name: pData.product.name || 'Unknown Product',
            primaryImageId: pData.product.primaryImageId,
          });
        });

        const newOrderDataFS = {
          ...orderData,
          id: newOrderRef.id,
          items: orderItemsWithDetails,
          shippingAddress: orderData.shippingAddress,
          orderDate: serverTimestamp(),
        };
        transaction.set(newOrderRef, newOrderDataFS); // WRITE the new order

        // Return the client-side representation of the order
        return {
          ...orderData,
          id: newOrderRef.id,
          items: orderItemsWithDetails,
          orderDate: new Date().toISOString(),
        } as Order;
      });
      
      // Add activity log outside the transaction
      await this.addActivityLog({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        actionType: 'ORDER_CREATE',
        entityType: 'Order',
        entityId: finalOrder.id,
        description: `Created order with ${finalOrder.items.length} item(s) for a total of $${finalOrder.totalAmount.toFixed(2)}.`
      });

      return finalOrder;

    } catch (e) {
      console.error("Firestore addOrder transaction failed: ", e);
      throw e;
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
  async addReview(reviewData, actor): Promise<Review> {
    if (!db) throw new Error("Firestore not initialized");
    
    const reviewDocRef = doc(collection(db, `products/${reviewData.productId}/reviews`));
    const newReviewFSData = {
      ...reviewData,
      id: reviewDocRef.id,
      createdAt: serverTimestamp(),
    };

    const productRef = doc(db, "products", reviewData.productId);

    await runTransaction(db, async (transaction) => {
        // PHASE 1: READ
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error("Product not found for review update!");
        
        // PHASE 2: CALCULATE
        const productData = productDoc.data() as Product;
        const oldReviewCount = productData.reviewCount || 0;
        const oldTotalRating = (productData.averageRating || 0) * oldReviewCount;
        
        const newReviewCount = oldReviewCount + 1;
        const newTotalRating = oldTotalRating + reviewData.rating;
        const newAverageRating = newReviewCount > 0 ? newTotalRating / newReviewCount : 0;
        
        // PHASE 3: WRITE
        transaction.set(reviewDocRef, newReviewFSData); 
        transaction.update(productRef, {
            averageRating: newAverageRating,
            reviewCount: newReviewCount,
            updatedAt: serverTimestamp(),
        });
    });
    
    // Add activity log outside transaction
    await this.addActivityLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      actionType: 'PRODUCT_REVIEW',
      entityType: 'Product',
      entityId: reviewData.productId,
      description: `Submitted a ${reviewData.rating}-star review for a product.`
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

  async getActivityLogs(options: { actorId?: string } = {}): Promise<ActivityLog[]> {
    if (!db) throw new Error("Firestore not initialized");
    const logsCol = collection(db, "activityLogs");
    const queryConstraints: any[] = [];
    if (options.actorId) {
        queryConstraints.push(where("actorId", "==", options.actorId));
    }
    queryConstraints.push(orderBy("timestamp", "desc"), limit(MAX_ACTIVITY_LOGS));
    
    const q = query(logsCol, ...queryConstraints);
    const snapshot = await getDocs(q);
    return mapDocsToTypeArray<ActivityLog>(snapshot);
  },
  async addActivityLog(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const logsCol = collection(db, 'activityLogs');
    const logDocRef = doc(logsCol);
    await setDoc(logDocRef, {
      ...logData,
      id: logDocRef.id,
      timestamp: serverTimestamp(),
    });
  },

  async saveImage(entityId: string, imageType: string, imageFile: File): Promise<string> {
    if (!firebaseStorage || !firebaseDBInstance) {
        console.warn("Firebase Storage or DB not configured. Falling back to local storage for image save.");
        return localDBServiceFallback.saveImage(entityId, imageType, imageFile);
    }
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('entityId', entityId);
    formData.append('imageType', imageType);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorText = await response.text();
            try {
                const errorBody = JSON.parse(errorText);
                 console.error('Upload API responded with an error:', errorBody);
                 throw new Error(errorBody.error || 'Failed to upload file.');
            } catch (e) {
                 console.error('Upload API responded with a non-JSON error:', errorText);
                 throw new Error(errorText || 'Failed to upload file due to server error.');
            }
        }
        const result = await response.json();
        return result.url;

    } catch (error) {
        console.error("API upload failed, trying local fallback:", error);
        try {
            return await localDBServiceFallback.saveImage(entityId, imageType, imageFile);
        } catch (localError) {
            console.error("Local image save also failed:", localError);
            throw new Error("Both API and local image uploads failed.");
        }
    }
  },

  async getImage(imageId: string): Promise<Blob | null> {
    // This is for local IndexedDB; Firebase URLs are handled directly.
    return localDBServiceFallback.getImage(imageId);
  },

  async deleteImage(imageId: string): Promise<void> {
    if (!imageId) return;
    if (imageId.startsWith('http')) {
        if (!firebaseStorage) return;
        try {
            const imageRef = storageRef(firebaseStorage, imageId);
            await deleteObject(imageRef);
        } catch (error: any) {
            if (error.code === 'storage/object-not-found') {
                console.warn(`Image to delete not found in Firebase: ${imageId}`);
            } else {
                console.error(`Error deleting image from Firebase: ${imageId}`, error);
            }
        }
    } else {
        await localDBServiceFallback.deleteImage(imageId);
    }
  },

  async deleteImagesForEntity(imageIds: string[]): Promise<void> {
    for (const imageId of imageIds) {
      await this.deleteImage(imageId);
    }
  },

  // Job Methods
  async getJobs(options: { userId?: string; status?: Job['status']; createdById?: string; acceptedById?: string; } = {}): Promise<Job[]> {
    if (!db) throw new Error("Firestore not initialized");
    const jobsColRef = collection(db, "jobs");
    const queryConstraints: any[] = [];
    
    let shouldSortInCode = false;

    if (options.status) {
        queryConstraints.push(where("status", "==", options.status));
        shouldSortInCode = true;
    }
    if (options.createdById) {
        queryConstraints.push(where("createdById", "==", options.createdById));
        shouldSortInCode = true;
    }
    if (options.acceptedById) {
        queryConstraints.push(where("acceptedById", "==", options.acceptedById));
        shouldSortInCode = true;
    }

    if (!shouldSortInCode) {
        queryConstraints.push(orderBy("createdAt", "desc"));
    }
    
    const q = query(jobsColRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    let jobs = mapDocsToTypeArray<Job>(snapshot);

    if (shouldSortInCode) {
        jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const now = new Date();
    const batch = writeBatch(db!);
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
      isUrgent: jobData.isUrgent || false,
      isVerified: false,
      location: jobData.location || null,
      preferredDate: jobData.preferredDate || null,
      estimatedDurationHours: jobData.estimatedDurationHours || null,
    };
    await setDoc(docRef, newJobFSData);
    return { ...jobData, id: docRef.id, status: 'open', createdAt: new Date().toISOString(), createdByName: creator.name || creator.email, creatorHasReviewed: false, acceptorHasReviewed: false, imageUrls: imageUrls, categoryId: jobData.categoryId, isUrgent: jobData.isUrgent || false, isVerified: false };
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
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            maxJobsPerUser: data.maxJobsPerUser ?? 5,
            maxTimerDurationDays: data.maxTimerDurationDays ?? 10,
            enableJobCreation: data.enableJobCreation ?? true,
            requireCompensation: data.requireCompensation ?? false,
            maxCompensationAmount: data.maxCompensationAmount ?? 10000,
            allowUserJobEditing: data.allowUserJobEditing ?? true,
            markNewJobsAsUrgent: data.markNewJobsAsUrgent ?? false,
        } as JobSettings;
    }
    return { maxJobsPerUser: 5, maxTimerDurationDays: 10, enableJobCreation: true, requireCompensation: false, maxCompensationAmount: 10000, allowUserJobEditing: true, markNewJobsAsUrgent: false };
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
    const revieweeUserRef = doc(db, "users", reviewData.revieweeId);
    
    await runTransaction(db, async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw new Error("Job not found for review update!");

        const revieweeDoc = await transaction.get(revieweeUserRef);
        if (!revieweeDoc.exists()) throw new Error("Reviewee user not found!");

        const revieweeData = revieweeDoc.data() as User;
        const oldReviewCount = revieweeData.jobReviewCount || 0;
        const oldTotalRating = (revieweeData.averageJobRating || 0) * oldReviewCount;
        
        const newReviewCount = oldReviewCount + 1;
        const newTotalRating = oldTotalRating + reviewData.rating;
        const newAverageRating = newReviewCount > 0 ? newTotalRating / newReviewCount : 0;
        
        transaction.set(reviewDocRef, newReviewFSData);
        
        const jobUpdatePayload: { creatorHasReviewed?: boolean, acceptorHasReviewed?: boolean, updatedAt: any } = { updatedAt: serverTimestamp() };
        if (jobDoc.data().createdById === reviewData.reviewerId) {
            jobUpdatePayload.creatorHasReviewed = true;
        } else if (jobDoc.data().acceptedById === reviewData.reviewerId) {
            jobUpdatePayload.acceptorHasReviewed = true;
        }
        
        transaction.update(jobRef, jobUpdatePayload);

        transaction.update(revieweeUserRef, {
            averageJobRating: newAverageRating,
            jobReviewCount: newReviewCount,
            updatedAt: serverTimestamp(),
        });
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
  async getReviewsForJobs(jobIds: string[]): Promise<JobReview[]> {
    if (!db) throw new Error("Firestore not initialized");
    if (!jobIds || jobIds.length === 0) return [];

    const allReviews: JobReview[] = [];
    
    // Firestore 'in' queries support up to 30 equality clauses.
    for (let i = 0; i < jobIds.length; i += 30) {
        const chunk = jobIds.slice(i, i + 30);
        if (chunk.length > 0) {
            const q = query(collectionGroup(db, 'jobReviews'), where('jobId', 'in', chunk));
            const snapshot = await getDocs(q);
            allReviews.push(...mapDocsToTypeArray<JobReview>(snapshot));
        }
    }
    
    return allReviews;
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

  async getSavedJobs(userId): Promise<JobSavedItem[]> {
    if (!db) throw new Error("Firestore not initialized");
    const savedJobsCol = collection(db, `users/${userId}/savedJobs`);
    const snapshot = await getDocs(query(savedJobsCol, orderBy("addedAt", "desc")));
    return mapDocsToTypeArray<JobSavedItem>(snapshot);
  },
  async addToSavedJobs(userId, jobId): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const savedJobRef = doc(db, `users/${userId}/savedJobs`, jobId);
    await setDoc(savedJobRef, { userId, jobId, addedAt: serverTimestamp() });
  },
  async removeFromSavedJobs(userId, jobId): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const savedJobRef = doc(db, `users/${userId}/savedJobs`, jobId);
    await deleteDoc(savedJobRef);
  },
  async isJobInSavedList(userId, jobId): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");
    const savedJobRef = doc(db, `users/${userId}/savedJobs`, jobId);
    const docSnap = await getDoc(savedJobRef);
    return docSnap.exists();
  },

  async reassignProductsToCategory(productIds: string[], newCategoryId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    if (productIds.length === 0) return;
    const batch = writeBatch(db);
    for (const productId of productIds) {
      batch.update(doc(db, "products", productId), { categoryId: newCategoryId });
    }
    await batch.commit();
  },
};

export { firestoreDataService };
