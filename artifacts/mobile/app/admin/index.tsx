import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  totalCoins: number;
  createdAt: string;
  lastMiningDate?: string;
  todayCoins?: number;
}

interface AdminWithdrawal {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  createdAt: string;
}

type Tab = "users" | "withdrawals";

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  approved: Colors.success,
  rejected: Colors.error,
  paid: Colors.gold,
};

export default function AdminScreen() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("withdrawals");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      router.replace("/(tabs)/mine");
      return;
    }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [uRes, wRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (wRes.ok) setWithdrawals(await wRes.json());
    } catch {}
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const updateStatus = async (withdrawalId: number, status: string) => {
    if (!token) return;
    setUpdatingId(withdrawalId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${withdrawalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setWithdrawals((prev) =>
          prev.map((w) => w.id === withdrawalId ? { ...w, status } : w)
        );
      }
    } catch {}
    setUpdatingId(null);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const totalUsersCoins = users.reduce((s, u) => s + u.totalCoins, 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.gold} />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{users.length}</Text>
              <Text style={styles.statLbl}>Users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: Colors.warning }]}>{pendingCount}</Text>
              <Text style={styles.statLbl}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: Colors.gold }]}>
                ₦{totalUsersCoins.toLocaleString()}
              </Text>
              <Text style={styles.statLbl}>Total Coins</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, tab === "withdrawals" && styles.tabBtnActive]}
              onPress={() => setTab("withdrawals")}
            >
              <Text style={[styles.tabBtnText, tab === "withdrawals" && styles.tabBtnTextActive]}>
                Withdrawals {pendingCount > 0 ? `(${pendingCount})` : ""}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === "users" && styles.tabBtnActive]}
              onPress={() => setTab("users")}
            >
              <Text style={[styles.tabBtnText, tab === "users" && styles.tabBtnTextActive]}>
                Users ({users.length})
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
            }
          >
            {tab === "withdrawals" && (
              withdrawals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No withdrawal requests</Text>
                </View>
              ) : (
                withdrawals.map((w) => (
                  <View key={w.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardName}>{w.fullName}</Text>
                        <Text style={styles.cardSub}>@{w.username}</Text>
                      </View>
                      <View>
                        <Text style={styles.cardAmount}>₦ {w.amount.toLocaleString()}</Text>
                        <Text style={[styles.cardStatus, { color: STATUS_COLORS[w.status] ?? Colors.textMuted }]}>
                          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.bankInfo}>
                      <Ionicons name="business-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.bankText}>{w.bankName}</Text>
                    </View>
                    <View style={styles.bankInfo}>
                      <Ionicons name="card-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.bankText}>{w.accountNumber} · {w.accountName}</Text>
                    </View>
                    <Text style={styles.cardDate}>{new Date(w.createdAt).toLocaleString()}</Text>

                    {/* Actions */}
                    {w.status === "pending" && (
                      <View style={styles.actionRow}>
                        <Pressable
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => updateStatus(w.id, "approved")}
                          disabled={updatingId === w.id}
                        >
                          {updatingId === w.id ? (
                            <ActivityIndicator color="#000" size="small" />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={14} color="#000" />
                              <Text style={styles.approveBtnText}>Approve</Text>
                            </>
                          )}
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => updateStatus(w.id, "rejected")}
                          disabled={updatingId === w.id}
                        >
                          <Ionicons name="close" size={14} color={Colors.error} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    )}
                    {w.status === "approved" && (
                      <Pressable
                        style={[styles.actionBtn, styles.paidBtn]}
                        onPress={() => updateStatus(w.id, "paid")}
                        disabled={updatingId === w.id}
                      >
                        {updatingId === w.id ? (
                          <ActivityIndicator color="#000" size="small" />
                        ) : (
                          <>
                            <Ionicons name="cash-outline" size={14} color="#000" />
                            <Text style={styles.paidBtnText}>Mark as Paid</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                ))
              )
            )}

            {tab === "users" && (
              users.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No users yet</Text>
                </View>
              ) : (
                users.map((u) => (
                  <View key={u.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{u.fullName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardName}>{u.fullName}</Text>
                        <Text style={styles.cardSub}>@{u.username} · {u.email}</Text>
                      </View>
                      <Text style={[styles.cardAmount, { color: Colors.gold }]}>
                        ₦{u.totalCoins.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.userMeta}>
                      <View style={styles.userMetaItem}>
                        <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.userMetaText}>
                          Joined {new Date(u.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {u.lastMiningDate && (
                        <View style={styles.userMetaItem}>
                          <Ionicons name="hammer-outline" size={12} color={Colors.textMuted} />
                          <Text style={styles.userMetaText}>
                            Last mined {u.lastMiningDate}
                          </Text>
                        </View>
                      )}
                      {(u.todayCoins ?? 0) > 0 && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>Today: ₦{u.todayCoins}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, color: Colors.text, fontFamily: "Inter_700Bold" },
  adminBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245,200,66,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statVal: { fontSize: 18, color: Colors.text, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tabBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  tabBtnText: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_600SemiBold" },
  tabBtnTextActive: { color: "#000" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  emptyState: { alignItems: "center", gap: 12, paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardName: { fontSize: 15, color: Colors.text, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  cardAmount: { fontSize: 17, color: Colors.text, fontFamily: "Inter_700Bold", textAlign: "right" },
  cardStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  bankInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  bankText: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  cardDate: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    padding: 10,
  },
  approveBtn: { backgroundColor: Colors.gold },
  approveBtnText: { color: "#000", fontSize: 13, fontFamily: "Inter_700Bold" },
  rejectBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  rejectBtnText: { color: Colors.error, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  paidBtn: { backgroundColor: Colors.success },
  paidBtnText: { color: "#000", fontSize: 13, fontFamily: "Inter_700Bold" },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { fontSize: 16, fontWeight: "800" as const, color: "#000" },
  userMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  userMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  userMetaText: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  todayBadge: {
    backgroundColor: "rgba(245,200,66,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  todayBadgeText: { fontSize: 11, color: Colors.gold, fontFamily: "Inter_600SemiBold" },
});
