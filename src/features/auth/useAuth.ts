"use client";

import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const TEST_DISPLAY_NAME_KEY = "collab-board-test-display-name";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TEST_DISPLAY_NAME_KEY);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Sign in anonymously and use the given name for cursors/header (multiplayer testing). */
  const signInAsTestUser = useCallback(async (displayName: string) => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TEST_DISPLAY_NAME_KEY, displayName);
      }
    } catch (err) {
      console.error("Test user sign-in error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TEST_DISPLAY_NAME_KEY);
    }
    await firebaseSignOut(auth);
  }, []);

  const displayName =
    user &&
    typeof window !== "undefined" &&
    user.isAnonymous &&
    window.localStorage.getItem(TEST_DISPLAY_NAME_KEY)
      ? window.localStorage.getItem(TEST_DISPLAY_NAME_KEY)!
      : user?.displayName ?? user?.email ?? "Anonymous";

  return { user, loading, displayName, signInWithGoogle, signInAsTestUser, signOut };
}
