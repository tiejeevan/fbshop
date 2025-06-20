
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
  // Check if all essential Firebase config keys are present
  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
  const missingEssentialKeys = essentialKeys.filter(key => !firebaseConfig[key]);

  if (missingEssentialKeys.length > 0) {
    console.error(
      `Firebase Initialization ABORTED: Missing critical Firebase configuration variables in your .env file: ${missingEssentialKeys.join(', ')}. ` +
      "Please ensure all NEXT_PUBLIC_FIREBASE_* variables are correctly set. Firebase will not be available."
    );
    // db will remain null, and DataSourceContext will handle this by preventing a switch to Firebase
  } else {
    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        // auth = getAuth(app);
        // storage = getStorage(app);
        console.log("Firebase initialized successfully.");
      } catch (error) {
        console.error("Firebase initialization error during initializeApp or getFirestore:", error);
        app = null;
        db = null;
      }
    } else {
      app = getApp();
      try {
        db = getFirestore(app); // Ensure db is also fetched for existing app
        // auth = getAuth(app);
        // storage = getStorage(app);
        console.log("Firebase app already initialized, using existing instance.");
      } catch (error) {
          console.error("Error getting Firestore from existing Firebase app:", error);
          db = null;
      }
    }
  }
}


export { db, app };
