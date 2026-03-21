import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout().then(() => router.replace("/(auth)/login"));
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const StatItem = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.fullName ?? "U").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.isAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={13} color={Colors.gold} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <StatItem label="Total Coins" value={`₦ ${(user?.totalCoins ?? 0).toLocaleString()}`} color={Colors.gold} />
        <View style={styles.statDivider} />
        <StatItem label="Daily Limit" value="₦ 1,000" />
        <View style={styles.statDivider} />
        <StatItem label="Mining Buttons" value="20" />
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="hammer" size={16} color={Colors.gold} /></View>
            <Text style={styles.infoText}>Tap each of the 20 mining buttons daily</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="play-circle" size={16} color={Colors.gold} /></View>
            <Text style={styles.infoText}>Watch a short rewarded ad to earn 50 ₦ coins per button</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="star" size={16} color={Colors.gold} /></View>
            <Text style={styles.infoText}>Earn up to 1,000 ₦ coins every day</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Ionicons name="card" size={16} color={Colors.gold} /></View>
            <Text style={styles.infoText}>Withdraw coins directly to your Nigerian bank account</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        {user?.isAdmin && (
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/admin")}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.gold} />
              <Text style={styles.menuItemText}>Admin Dashboard</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.menuItem, styles.menuItemDanger, pressed && { opacity: 0.7 }]}
          onPress={handleLogout}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={[styles.menuItemText, { color: Colors.error }]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>

      <Text style={styles.footer}>Naira Galaxy v1.0 · Built with security</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, gap: 24 },
  avatarSection: { alignItems: "center", gap: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: { fontSize: 36, fontWeight: "800" as const, color: "#000" },
  name: { fontSize: 22, color: Colors.text, fontFamily: "Inter_700Bold" },
  username: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  email: { fontSize: 13, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,200,66,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.3)",
  },
  adminBadgeText: { color: Colors.gold, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.surfaceBorder },
  statValue: { fontSize: 16, color: Colors.text, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, color: Colors.text, fontFamily: "Inter_700Bold" },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(245,200,66,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  menuItemDanger: { borderColor: "rgba(239,68,68,0.2)" },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemText: { fontSize: 15, color: Colors.text, fontFamily: "Inter_500Medium" },
  footer: { textAlign: "center", fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
});
