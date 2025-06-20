
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth'; // If Firebase Auth is used later
// import { getStorage } from 'firebase/storage'; // If Firebase Storage is used later for images

// User-provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBZzmpOXwoSGlPIsUc--0gm2cigZ8L3T0",
  authDomain: "local-commerce-f5t0u.firebaseapp.com",
  projectId: "local-commerce-f5t0u",
  storageBucket: "local-commerce-f5t0u.appspot.com", // Corrected from user's paste, usually ends with .appspot.com
  messagingSenderId: "367065261580",
  appId: "1:367065261580:web:c983b6c6c96e273178f029"
  // measurementId is optional for Firestore, can be added if needed for Analytics
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
// let auth;
// let storage;

if (typeof window !== 'undefined') {
  // Check if all essential Firebase config keys are present in the hardcoded config
  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
  const missingEssentialKeys = essentialKeys.filter(key => !firebaseConfig[key]);

  if (missingEssentialKeys.length > 0) {
    console.error(
      `Firebase Initialization ABORTED: Missing critical Firebase configuration values in the hardcoded firebaseConfig object in src/lib/firebase.ts: ${missingEssentialKeys.join(', ')}. ` +
      "Please ensure all required keys are present. Firebase will not be available."
    );
    // db will remain null, and DataSourceContext will handle this by preventing a switch to Firebase
  } else {
    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        // auth = getAuth(app);
        // storage = getStorage(app);
        console.log("Firebase initialized successfully with hardcoded config.");
      } catch (error) {
        console.error("Firebase initialization error during initializeApp or getFirestore (hardcoded config):", error);
        app = null;
        db = null;
      }
    } else {
      app = getApp();
      try {
        db = getFirestore(app); // Ensure db is also fetched for existing app
        // auth = getAuth(app);
        // storage = getStorage(app);
        console.log("Firebase app already initialized, using existing instance (hardcoded config).");
      } catch (error) {
          console.error("Error getting Firestore from existing Firebase app (hardcoded config):", error);
          db = null;
      }
    }
  }
}

export { db, app };
