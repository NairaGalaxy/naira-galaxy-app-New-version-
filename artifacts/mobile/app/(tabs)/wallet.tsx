import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Withdrawal {
  id: number;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  createdAt: string;
}

interface Balance {
  totalCoins: number;
  pendingWithdrawal: number;
  availableBalance: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  approved: Colors.success,
  rejected: Colors.error,
  paid: Colors.gold,
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: "time-outline",
  approved: "checkmark-circle-outline",
  rejected: "close-circle-outline",
  paid: "cash-outline",
};

export default function WalletScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [balRes, wdRes] = await Promise.all([
        fetch(`${API_BASE}/api/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/wallet/withdrawals`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (balRes.ok) setBalance(await balRes.json());
      if (wdRes.ok) setWithdrawals(await wdRes.json());
    } catch {}
    setIsLoading(false);
  };

  const handleWithdraw = async () => {
    if (!amount || !bankName || !accountNumber || !accountName) {
      setFormError("Please fill in all fields");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Enter a valid amount");
      return;
    }
    if (numAmount > (balance?.availableBalance ?? 0)) {
      setFormError("Insufficient balance");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: numAmount, bankName, accountNumber, accountName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFormSuccess("Withdrawal request submitted! We'll process it soon.");
      setAmount(""); setBankName(""); setAccountNumber(""); setAccountName("");
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message ?? "Failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSubmitting(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Wallet</Text>

      {isLoading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Balance Cards */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Total Coins</Text>
                <Text style={styles.balanceValue}>₦ {balance?.totalCoins?.toLocaleString() ?? 0}</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Available</Text>
                <Text style={[styles.balanceValue, { color: Colors.success }]}>
                  ₦ {balance?.availableBalance?.toLocaleString() ?? 0}
                </Text>
              </View>
            </View>
            {(balance?.pendingWithdrawal ?? 0) > 0 && (
              <View style={styles.pendingRow}>
                <Ionicons name="time-outline" size={14} color={Colors.warning} />
                <Text style={styles.pendingText}>
                  ₦ {balance?.pendingWithdrawal?.toLocaleString()} pending withdrawal
                </Text>
              </View>
            )}
          </View>

          {/* Success Message */}
          {formSuccess ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.successText}>{formSuccess}</Text>
            </View>
          ) : null}

          {/* Withdraw Button */}
          <Pressable
            style={({ pressed }) => [styles.withdrawBtn, pressed && { opacity: 0.8 }]}
            onPress={() => { setShowForm(!showForm); setFormError(""); setFormSuccess(""); }}
          >
            <Ionicons name="arrow-down-circle-outline" size={20} color="#000" />
            <Text style={styles.withdrawBtnText}>
              {showForm ? "Cancel Withdrawal" : "Request Withdrawal"}
            </Text>
          </Pressable>

          {/* Withdrawal Form */}
          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Bank Details</Text>

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Amount (₦)</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Max: ₦${balance?.availableBalance ?? 0}`}
                  placeholderTextColor={Colors.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Access Bank"
                  placeholderTextColor={Colors.textMuted}
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit account number"
                  placeholderTextColor={Colors.textMuted}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Account Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="As it appears on your bank"
                  placeholderTextColor={Colors.textMuted}
                  value={accountName}
                  onChangeText={setAccountName}
                  autoCapitalize="words"
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }, submitting && { opacity: 0.7 }]}
                onPress={handleWithdraw}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Request</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Withdrawal History */}
          <Text style={styles.sectionTitle}>Withdrawal History</Text>
          {withdrawals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No withdrawals yet</Text>
            </View>
          ) : (
            withdrawals.map((w) => (
              <View key={w.id} style={styles.withdrawalItem}>
                <View style={styles.withdrawalLeft}>
                  <Ionicons
                    name={STATUS_ICONS[w.status] ?? "time-outline"}
                    size={22}
                    color={STATUS_COLORS[w.status] ?? Colors.textMuted}
                  />
                  <View>
                    <Text style={styles.withdrawalBank}>{w.bankName}</Text>
                    <Text style={styles.withdrawalAccount}>{w.accountNumber} · {w.accountName}</Text>
                    <Text style={styles.withdrawalDate}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.withdrawalRight}>
                  <Text style={styles.withdrawalAmount}>₦ {w.amount.toLocaleString()}</Text>
                  <Text style={[styles.withdrawalStatus, { color: STATUS_COLORS[w.status] ?? Colors.textMuted }]}>
                    {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, gap: 16 },
  pageTitle: { fontSize: 26, color: Colors.text, fontFamily: "Inter_700Bold" },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 12,
  },
  balanceRow: { flexDirection: "row" },
  balanceItem: { flex: 1, gap: 4 },
  balanceDivider: { width: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: 16 },
  balanceLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  balanceValue: { fontSize: 22, color: Colors.text, fontFamily: "Inter_700Bold" },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingText: { fontSize: 12, color: Colors.warning, fontFamily: "Inter_500Medium" },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.1)",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  successText: { color: Colors.success, fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    padding: 16,
  },
  withdrawBtnText: { color: "#000", fontSize: 15, fontFamily: "Inter_700Bold" },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 12,
  },
  formTitle: { fontSize: 17, color: Colors.text, fontFamily: "Inter_700Bold" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 10,
    borderRadius: 8,
  },
  errorText: { color: Colors.error, fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  inputWrapper: { gap: 6 },
  inputLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: { color: "#000", fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, color: Colors.text, fontFamily: "Inter_700Bold", marginTop: 8 },
  emptyState: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular" },
  withdrawalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  withdrawalLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  withdrawalBank: { fontSize: 14, color: Colors.text, fontFamily: "Inter_600SemiBold" },
  withdrawalAccount: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  withdrawalDate: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  withdrawalRight: { alignItems: "flex-end", gap: 4 },
  withdrawalAmount: { fontSize: 15, color: Colors.text, fontFamily: "Inter_700Bold" },
  withdrawalStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
