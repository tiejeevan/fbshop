
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// User-provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBZzmpOXwoSGlPIsUc--0gm2cigZ8L3T0",
  authDomain: "local-commerce-f5t0u.firebaseapp.com",
  projectId: "local-commerce-f5t0u",
  storageBucket: "local-commerce-f5t0u.appspot.com",
  messagingSenderId: "367065261580",
  appId: "1:367065261580:web:c983b6c6c96e273178f029"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket'];
const missingEssentialKeys = essentialKeys.filter(key => !firebaseConfig[key]);

if (missingEssentialKeys.length > 0) {
  console.error(
    `Firebase Initialization ABORTED: Missing critical Firebase configuration values in src/lib/firebase.ts: ${missingEssentialKeys.join(', ')}. ` +
    "Firebase will not be available."
  );
} else {
  // This universal check works on both server and client.
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully.");
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
  } else {
    app = getApp();
    // console.log("Firebase app already initialized, using existing instance.");
  }

  if (app) {
      try {
        db = getFirestore(app);
        // Explicitly pass the user-specified bucket URL to getStorage.
        storage = getStorage(app, "gs://local-commerce-f5t0u.firebasestorage.app");
      } catch (error) {
          console.error("Error getting Firestore/Storage from Firebase app:", error);
          db = null;
          storage = null;
      }
  }
}

export { db, app, storage };
