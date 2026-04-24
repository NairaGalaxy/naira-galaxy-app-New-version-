import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

// ✅ Your backend URL
const API_BASE = "https://naira-galaxy-app-new-version.onrender.com";
setBaseUrl(API_BASE);

// =========================
// TYPES
// =========================
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
  register: (
    username: string,
    email: string,
    password: string,
    fullName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserCoins: (totalCoins: number) => void;
}

// =========================
// CONTEXT
// =========================
const AuthContext = createContext<AuthContextType | null>(null);

// =========================
// PROVIDER
// =========================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // =========================
  // LOAD TOKEN ON APP START
  // =========================
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("naira_token");

        if (storedToken) {
          setToken(storedToken);

          // 🔐 make token available globally
          setAuthTokenGetter(() => storedToken);

          const res = await fetch(`${API_BASE}/api/auth/profile`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          const data = await res.json();

          if (res.ok && data.id) {
            setUser(data);
          } else {
            // token invalid → clear it
            await AsyncStorage.removeItem("naira_token");
            setToken(null);
          }
        }
      } catch (err) {
        console.log("Auth load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  // =========================
  // LOGIN
  // =========================
  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    // ✅ store token
    await AsyncStorage.setItem("naira_token", data.token);
    setToken(data.token);
    setAuthTokenGetter(() => data.token);

    // ✅ store user
    setUser(data.user);
  };

  // =========================
  // REGISTER
  // =========================
  const register = async (
    username: string,
    email: string,
    password: string,
    fullName: string
  ) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password, fullName }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    await AsyncStorage.setItem("naira_token", data.token);
    setToken(data.token);
    setAuthTokenGetter(() => data.token);

    setUser(data.user);
  };

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    await AsyncStorage.removeItem("naira_token");
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
  };

  // =========================
  // UPDATE COINS (SYNC WITH SERVER)
  // =========================
  const updateUserCoins = (totalCoins: number) => {
    setUser((prev) =>
      prev ? { ...prev, totalCoins } : prev
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUserCoins,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =========================
// HOOK
// =========================
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
        }
