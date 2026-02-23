"use client";

import { useEffect } from "react";
import { enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Enables Firestore offline persistence so the app keeps working across brief
 * network drops and reconnects more smoothly. Runs once on mount, client-only.
 */
export function FirestorePersistenceInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      if (err?.code === "failed-precondition" || err?.name === "FirebaseError") {
        // Multiple tabs open, or persistence already enabled; app still works.
        return;
      }
      console.warn("Firestore offline persistence could not be enabled:", err);
    });
  }, []);
  return null;
}
