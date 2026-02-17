import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// These values are pulled from your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized already (standard Next.js pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export the specific services for use in your components
export const db = getFirestore(app);      // Persistent board data
export const rtdb = getDatabase(app);    // Low-latency cursor sync

/** Alias for RTDB - used by cursor/whiteboard slices */
export const getFirebaseDatabase = () => rtdb;
export const auth = getAuth(app);        // User identity management

export default app;