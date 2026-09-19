import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "sentinel_session";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  // Real login now: hits the backend, which validates the jurisdiction
  // against what's actually loaded and returns a signed JWT. That token
  // -- not a client-side dropdown -- is what every subsequent API call
  // proves identity with, and it's what the backend uses to enforce
  // which jurisdiction's data you're allowed to see.
  const login = async (name, roleId, jurisdiction = null) => {
    setError(null);
    try {
      const res = await fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, roleId, jurisdiction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return false;
      }
      setSession(data);
      return true;
    } catch (e) {
      setError("Could not reach the backend API. Is it running?");
      return false;
    }
  };

  const logout = () => setSession(null);

  const user = session ? { name: session.name, roleId: session.role, jurisdiction: session.jurisdiction } : null;

  return (
    <AuthContext.Provider value={{ user, token: session?.token || null, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
