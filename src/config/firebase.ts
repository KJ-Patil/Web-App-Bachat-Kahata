import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const isConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

if (!isConfigured && typeof window !== "undefined") {
  console.warn(
    "[Firebase] NEXT_PUBLIC_FIREBASE_API_KEY is not configured in .env.local. Using placeholder config for local development UI preview. Authentication and Firestore sync require real Firebase credentials."
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForLocalDevelopment123",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sample-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sample-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sample-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:abcdef",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX",
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore with persistent multi-tab caching on the client side
let db: Firestore;

if (typeof window !== "undefined") {
  db = initializeFirestore(app, {
    // In-memory cache only: Firestore must NOT persist a plaintext copy of the
    // user's financial data to IndexedDB on disk. The app's own localStorage is
    // the offline cache, and it is encrypted at rest (see core/store/encryption).
    localCache: memoryLocalCache(),
    // Silently drop `undefined` fields instead of throwing on setDoc/updateDoc,
    // so optional fields left unset (e.g. a customer's description) don't crash writes.
    ignoreUndefinedProperties: true,
  });
} else {
  db = getFirestore(app);
}

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
