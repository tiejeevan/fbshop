
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore }
from 'firebase/firestore';
// import { getAuth } from 'firebase/auth'; // If Firebase Auth is used later
// import { getStorage } from 'firebase/storage'; // If Firebase Storage is used later for images

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
// let auth;
// let storage;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    try {
      if (
        firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId
      ) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        // auth = getAuth(app);
        // storage = getStorage(app);
        console.log("Firebase initialized successfully.");
      } else {
        console.warn("Firebase configuration is missing. Firebase will not be initialized.");
      }
    } catch (error) {
      console.error("Firebase initialization error:", error);
      // Fallback or error handling for Firebase init failure
      app = null;
      db = null;
    }
  } else {
    app = getApp();
    db = getFirestore(app);
    // auth = getAuth(app);
    // storage = getStorage(app);
  }
}


export { db, app };
