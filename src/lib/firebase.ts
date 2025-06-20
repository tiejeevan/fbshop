
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Added

// User-provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBZzmpOXwoSGlPIsUc--0gm2cigZ8L3T0",
  authDomain: "local-commerce-f5t0u.firebaseapp.com",
  projectId: "local-commerce-f5t0u",
  storageBucket: "local-commerce-f5t0u.appspot.com", // Corrected: usually .appspot.com
  messagingSenderId: "367065261580",
  appId: "1:367065261580:web:c983b6c6c96e273178f029"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null; // Added

if (typeof window !== 'undefined') {
  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket'];
  const missingEssentialKeys = essentialKeys.filter(key => !firebaseConfig[key]);

  if (missingEssentialKeys.length > 0) {
    console.error(
      `Firebase Initialization ABORTED: Missing critical Firebase configuration values in the hardcoded firebaseConfig object in src/lib/firebase.ts: ${missingEssentialKeys.join(', ')}. ` +
      "Please ensure all required keys are present. Firebase will not be available."
    );
  } else {
    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app); // Initialize storage
        console.log("Firebase initialized successfully with hardcoded config (Firestore & Storage).");
      } catch (error) {
        console.error("Firebase initialization error (hardcoded config):", error);
        app = null;
        db = null;
        storage = null;
      }
    } else {
      app = getApp();
      try {
        db = getFirestore(app);
        storage = getStorage(app); // Get existing storage instance
        console.log("Firebase app already initialized, using existing instance (Firestore & Storage - hardcoded config).");
      } catch (error) {
          console.error("Error getting Firestore/Storage from existing Firebase app (hardcoded config):", error);
          db = null;
          storage = null;
      }
    }
  }
}

export { db, app, storage }; // Export storage
