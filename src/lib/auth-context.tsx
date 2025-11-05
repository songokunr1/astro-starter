"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const TOKEN_STORAGE_KEY = "fiszki-ai.jwt";

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  });

  const login = (newToken: string) => {
    setToken(newToken);
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, newToken);
  };

  const logout = () => {
    setToken(null);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      token,
      login,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
