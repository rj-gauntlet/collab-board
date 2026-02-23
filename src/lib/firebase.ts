import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const env = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasValidConfig = !!(env.projectId && env.databaseURL);

const firebaseConfig = hasValidConfig
  ? env
  : {
      apiKey: env.apiKey ?? "build-placeholder",
      authDomain: env.authDomain ?? "build-placeholder",
      databaseURL: "https://build-placeholder.firebaseio.com",
      projectId: env.projectId ?? "build-placeholder",
      storageBucket: env.storageBucket ?? "build-placeholder",
      messagingSenderId: env.messagingSenderId ?? "0",
      appId: env.appId ?? "build-placeholder",
    };

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

export const getFirebaseDatabase = () => rtdb;
export const auth = getAuth(app);

export default app;