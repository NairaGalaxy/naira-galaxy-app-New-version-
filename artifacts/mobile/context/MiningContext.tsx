import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const TOTAL_BUTTONS = 20;
const COINS_PER_BUTTON = 50;
const DAILY_LIMIT = 1000;

interface MiningContextType {
  minedButtons: number[];
  coinsEarnedToday: number;
  dailyLimit: number;
  canMineMore: boolean;
  isLoading: boolean;
  completeMining: (buttonIndex: number) => Promise<number>;
  refreshMining: () => Promise<void>;
}

const MiningContext = createContext<MiningContextType | null>(null);

export function MiningProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [minedButtons, setMinedButtons] = useState<number[]>([]);
  const [coinsEarnedToday, setCoinsEarnedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMining = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mining/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMinedButtons(data.minedButtons ?? []);
        setCoinsEarnedToday(data.coinsEarnedToday ?? 0);
      }
    } catch {}
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    refreshMining();
  }, [refreshMining]);

  const completeMining = async (buttonIndex: number): Promise<number> => {
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`${API_BASE}/api/mining/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ buttonIndex }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Mining failed");
    setMinedButtons(data.minedButtons ?? []);
    setCoinsEarnedToday(data.totalCoinsToday ?? 0);
    return data.coinsEarned ?? COINS_PER_BUTTON;
  };

  return (
    <MiningContext.Provider
      value={{
        minedButtons,
        coinsEarnedToday,
        dailyLimit: DAILY_LIMIT,
        canMineMore: coinsEarnedToday < DAILY_LIMIT,
        isLoading,
        completeMining,
        refreshMining,
      }}
    >
      {children}
    </MiningContext.Provider>
  );
}

export function useMining(): MiningContextType {
  const ctx = useContext(MiningContext);
  if (!ctx) throw new Error("useMining must be used within MiningProvider");
  return ctx;
}
