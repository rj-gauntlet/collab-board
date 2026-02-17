'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

export default function FirebaseTest() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Attempt anonymous sign-in
    signInAnonymously(auth).catch((err) => {
      console.error("Auth Error:", err);
      setError(err.message);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 m-4 border-2 rounded-lg bg-slate-50">
      <h2 className="text-xl font-bold mb-2 text-slate-800">Firebase Connection Test</h2>
      
      {error ? (
        <div className="text-red-500 font-medium">
          ❌ Connection Failed: {error}
        </div>
      ) : user ? (
        <div className="text-green-600 font-medium">
          ✅ Connected! User ID: <span className="text-xs font-mono bg-green-100 p-1">{user.uid}</span>
        </div>
      ) : (
        <div className="text-amber-500 animate-pulse">
          ⏳ Connecting to Firebase...
        </div>
      )}
    </div>
  );
}