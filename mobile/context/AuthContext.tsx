import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
setBaseUrl(API_BASE);

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  totalCoins: number;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserCoins: (totalCoins: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let currentToken: string | null = null;
    setAuthTokenGetter(() => currentToken);

    AsyncStorage.getItem("naira_token").then((stored) => {
      if (stored) {
        currentToken = stored;
        setToken(stored);
        setAuthTokenGetter(() => currentToken);
        fetch(`${API_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${stored}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.id) setUser(data);
          })
          .catch(() => {})
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    await AsyncStorage.setItem("naira_token", data.token);
    setToken(data.token);
    setAuthTokenGetter(() => data.token);
    setUser(data.user);
  };

  const register = async (username: string, email: string, password: string, fullName: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, fullName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Registration failed");
    await AsyncStorage.setItem("naira_token", data.token);
    setToken(data.token);
    setAuthTokenGetter(() => data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("naira_token");
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
  };

  const updateUserCoins = (totalCoins: number) => {
    setUser((prev) => prev ? { ...prev, totalCoins } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUserCoins }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
