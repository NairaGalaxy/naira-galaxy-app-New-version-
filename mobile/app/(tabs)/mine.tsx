import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useMining } from "@/context/MiningContext";
import { AdModal } from "@/components/AdModal";
import Colors from "@/constants/colors";

const TOTAL_BUTTONS = 20;
const COINS_PER_BUTTON = 50;
const INTERSTITIAL_INTERVAL_MS = 60 * 1000; // 1 minute

const BUTTON_LABELS = [
  "Gold Rush", "Silver Strike", "Diamond Dig", "Crystal Cave",
  "Ruby Mine", "Emerald Pit", "Sapphire Shaft", "Topaz Tunnel",
  "Pearl Drop", "Opal Well", "Jade Lode", "Amber Vein",
  "Quartz Drill", "Onyx Shaft", "Garnet Hole", "Citrine Core",
  "Agate Pocket", "Bronze Pit", "Cobalt Mine", "Platinum Seam",
];

export default function MineScreen() {
  const { user, updateUserCoins } = useAuth();
  const { minedButtons, coinsEarnedToday, dailyLimit, canMineMore, completeMining, refreshMining } = useMining();
  const insets = useSafeAreaInsets();

  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showCoinPop, setShowCoinPop] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);

  const interstitialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinPopAnim = useRef(new Animated.Value(0)).current;
  const coinScaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    refreshMining();
    startInterstitialTimer();
    return () => {
      if (interstitialTimer.current) clearTimeout(interstitialTimer.current);
    };
  }, []);

  const startInterstitialTimer = () => {
    if (interstitialTimer.current) clearTimeout(interstitialTimer.current);
    interstitialTimer.current = setTimeout(() => {
      setShowInterstitial(true);
    }, INTERSTITIAL_INTERVAL_MS);
  };

  const handleInterstitialClose = () => {
    setShowInterstitial(false);
    startInterstitialTimer();
  };

  const handleMinePress = (index: number) => {
    if (!canMineMore) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (minedButtons.includes(index)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveButton(index);
    setShowRewardedAd(true);
  };

  const handleAdComplete = async () => {
    setShowRewardedAd(false);
    if (activeButton === null) return;
    try {
      const earned = await completeMining(activeButton);
      setLastEarned(earned);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user) updateUserCoins((user.totalCoins ?? 0) + earned);
      showCoinAnimation();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setActiveButton(null);
  };

  const handleAdClose = () => {
    setShowRewardedAd(false);
    setActiveButton(null);
  };

  const showCoinAnimation = () => {
    setShowCoinPop(true);
    coinPopAnim.setValue(0);
    coinScaleAnim.setValue(0.5);
    Animated.parallel([
      Animated.timing(coinPopAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(coinScaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => setShowCoinPop(false), 800);
    });
  };

  const progress = coinsEarnedToday / dailyLimit;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username ?? "Miner"} 👋</Text>
          <Text style={styles.subtitle}>Tap to mine your daily Naira coins</Text>
        </View>
        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeSymbol}>₦</Text>
          <Text style={styles.coinBadgeAmount}>{(user?.totalCoins ?? 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Daily Mining Progress</Text>
          <Text style={styles.progressAmount}>
            {coinsEarnedToday} / {dailyLimit} ₦
          </Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressButtons}>
          {minedButtons.length} / {TOTAL_BUTTONS} buttons mined
        </Text>
      </View>

      {/* Daily limit warning */}
      {!canMineMore && (
        <View style={styles.limitBanner}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.limitBannerText}>
            Daily limit reached! Come back tomorrow.
          </Text>
        </View>
      )}

      {/* Mine Buttons Grid */}
      <ScrollView
        style={styles.grid}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.buttonGrid}>
          {Array.from({ length: TOTAL_BUTTONS }).map((_, index) => {
            const mined = minedButtons.includes(index);
            const isActive = activeButton === index;
            return (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.mineBtn,
                  mined && styles.mineBtnMined,
                  !mined && !canMineMore && styles.mineBtnDisabled,
                  pressed && !mined && styles.mineBtnPressed,
                  isActive && styles.mineBtnActive,
                ]}
                onPress={() => handleMinePress(index)}
              >
                <View style={styles.mineBtnContent}>
                  <Ionicons
                    name={mined ? "checkmark-circle" : "hammer-outline"}
                    size={20}
                    color={mined ? Colors.success : Colors.gold}
                  />
                  <Text style={[styles.mineBtnLabel, mined && styles.mineBtnLabelMined]}>
                    {BUTTON_LABELS[index]}
                  </Text>
                  {!mined && (
                    <Text style={styles.mineBtnCoins}>+{COINS_PER_BUTTON} ₦</Text>
                  )}
                  {mined && (
                    <Text style={styles.mineBtnDone}>Mined!</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Coin Pop Animation */}
      {showCoinPop && (
        <Animated.View
          style={[
            styles.coinPop,
            {
              opacity: coinPopAnim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { scale: coinScaleAnim },
                { translateY: coinPopAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] }) },
              ],
            },
          ]}
        >
          <Text style={styles.coinPopText}>+{lastEarned} ₦</Text>
        </Animated.View>
      )}

      {/* Rewarded Ad Modal */}
      <AdModal
        visible={showRewardedAd}
        onComplete={handleAdComplete}
        onClose={handleAdClose}
        buttonLabel={activeButton !== null ? BUTTON_LABELS[activeButton] : ""}
        adDuration={35}
      />

      {/* Interstitial Ad Modal */}
      <Modal visible={showInterstitial} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.interstitialOverlay}>
          <View style={styles.interstitialBox}>
            <View style={styles.interstitialHeader}>
              <View style={styles.adBadge}>
                <Text style={styles.adBadgeText}>AD</Text>
              </View>
              <Text style={styles.interstitialTitle}>Advertisement</Text>
            </View>
            <View style={styles.interstitialContent}>
              <Ionicons name="megaphone-outline" size={48} color={Colors.gold} />
              <Text style={styles.interstitialSub}>Google AdMob</Text>
              <Text style={styles.interstitialNote}>Interstitial Ad Unit</Text>
              <Text style={styles.interstitialNote2}>Replace with your AdMob Interstitial Unit ID</Text>
            </View>
            <Pressable style={styles.interstitialClose} onPress={handleInterstitialClose}>
              <Text style={styles.interstitialCloseText}>Close Ad</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: { fontSize: 18, color: Colors.text, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  coinBadgeSymbol: { fontSize: 14, color: Colors.gold, fontFamily: "Inter_700Bold" },
  coinBadgeAmount: { fontSize: 14, color: Colors.gold, fontFamily: "Inter_700Bold" },
  progressSection: { paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  progressAmount: { fontSize: 13, color: Colors.gold, fontFamily: "Inter_700Bold" },
  progressBg: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  progressFill: { height: "100%", backgroundColor: Colors.gold, borderRadius: 4 },
  progressButtons: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  limitBannerText: { color: Colors.success, fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  grid: { flex: 1 },
  gridContent: { padding: 16, paddingBottom: 120 },
  buttonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mineBtn: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  mineBtnMined: {
    borderColor: Colors.success,
    backgroundColor: "rgba(34,197,94,0.07)",
  },
  mineBtnDisabled: { opacity: 0.5 },
  mineBtnPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  mineBtnActive: { borderColor: Colors.gold },
  mineBtnContent: {
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  mineBtnLabel: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  mineBtnLabelMined: { color: Colors.textSecondary },
  mineBtnCoins: { fontSize: 13, color: Colors.gold, fontFamily: "Inter_700Bold" },
  mineBtnDone: { fontSize: 12, color: Colors.success, fontFamily: "Inter_600SemiBold" },
  coinPop: {
    position: "absolute",
    bottom: "40%",
    alignSelf: "center",
    backgroundColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  coinPopText: { color: "#000", fontSize: 20, fontFamily: "Inter_700Bold" },
  interstitialOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  interstitialBox: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  interstitialHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  adBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  adBadgeText: { color: "#000", fontWeight: "800" as const, fontSize: 11, fontFamily: "Inter_700Bold" },
  interstitialTitle: { color: Colors.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium" },
  interstitialContent: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderStyle: "dashed",
    margin: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  interstitialSub: { color: Colors.text, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  interstitialNote: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" },
  interstitialNote2: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
  interstitialClose: {
    margin: 16,
    marginTop: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  interstitialCloseText: { color: Colors.text, fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
