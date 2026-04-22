import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useMining } from "@/context/MiningContext";
import { AdModal } from "@/components/AdModal";
import Colors from "@/constants/colors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`; // ✅ FIXED

const TOTAL_BUTTONS = 20;
const COINS_PER_BUTTON = 50;
const INTERSTITIAL_INTERVAL_MS = 60 * 1000;

const BUTTON_LABELS = [
  "Gold Rush","Silver Strike","Diamond Dig","Crystal Cave",
  "Ruby Mine","Emerald Pit","Sapphire Shaft","Topaz Tunnel",
  "Pearl Drop","Opal Well","Jade Lode","Amber Vein",
  "Quartz Drill","Onyx Shaft","Garnet Hole","Citrine Core",
  "Agate Pocket","Bronze Pit","Cobalt Mine","Platinum Seam",
];

export default function MineScreen() {
  const { user, token, updateUserCoins } = useAuth();
  const { minedButtons, coinsEarnedToday, dailyLimit, canMineMore, refreshMining } = useMining();
  const insets = useSafeAreaInsets();

  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [showCoinPop, setShowCoinPop] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const interstitialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinPopAnim = useRef(new Animated.Value(0)).current;
  const coinScaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    refreshMining();
    return () => {
      if (interstitialTimer.current) clearTimeout(interstitialTimer.current);
    };
  }, []);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refreshMining();
    setRefreshing(false);
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

  // ✅ SECURE BACKEND MINING (FINAL FIX)
  const handleAdComplete = async () => {
    setShowRewardedAd(false);
    if (activeButton === null) return;

    try {
      const res = await fetch(`${API_BASE}/api/mine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buttonIndex: activeButton, // ✅ CORRECT
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Mining failed");
      }

      const earned = data.earned;
      setLastEarned(earned);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (user) {
        updateUserCoins(data.totalCoins); // ✅ TRUST SERVER
      }

      showCoinAnimation();

      // ✅ Sync UI with backend
      await refreshMining();

    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log(err.message);
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
      Animated.timing(coinPopAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(coinScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
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
          <Text style={styles.coinBadgeAmount}>
            {(user?.totalCoins ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Progress */}
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

      {!canMineMore && (
        <View style={styles.limitBanner}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.limitBannerText}>
            Daily limit reached! Come back tomorrow.
          </Text>
        </View>
      )}

      {/* Scroll */}
      <ScrollView
        style={styles.grid}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
          />
        }
      >
        <View style={styles.buttonGrid}>
          {Array.from({ length: TOTAL_BUTTONS }).map((_, index) => {
            const mined = minedButtons.includes(index);

            return (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.mineBtn,
                  mined && styles.mineBtnMined,
                  !mined && !canMineMore && styles.mineBtnDisabled,
                  pressed && !mined && styles.mineBtnPressed,
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

      {/* Rewarded Ad */}
      <AdModal
        visible={showRewardedAd}
        onComplete={handleAdComplete}
        onClose={handleAdClose}
        buttonLabel={activeButton !== null ? BUTTON_LABELS[activeButton] : ""}
        adDuration={35}
      />

      {/* Coin Animation */}
      {showCoinPop && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: "40%",
            alignSelf: "center",
            opacity: coinPopAnim,
            transform: [
              { scale: coinScaleAnim },
              {
                translateY: coinPopAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -80],
                }),
              },
            ],
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "bold", color: Colors.gold }}>
            +{lastEarned} ₦
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 20 },
  greeting: { fontSize: 18, color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textSecondary },
  coinBadge: { flexDirection: "row", gap: 4 },
  coinBadgeSymbol: { color: Colors.gold },
  coinBadgeAmount: { color: Colors.gold },
  progressSection: { paddingHorizontal: 20 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressBg: { height: 8, backgroundColor: "#222", borderRadius: 4 },
  progressFill: { height: "100%", backgroundColor: Colors.gold },
  progressButtons: { fontSize: 11, color: "#aaa" },
  limitBanner: { padding: 10 },
  limitBannerText: { color: Colors.success },
  grid: { flex: 1 },
  gridContent: { padding: 16 },
  buttonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mineBtn: { width: "47%", padding: 14, borderRadius: 12, backgroundColor: "#111" },
  mineBtnMined: { opacity: 0.5 },
  mineBtnDisabled: { opacity: 0.4 },
  mineBtnPressed: { opacity: 0.7 },
  mineBtnContent: { alignItems: "center" },
  mineBtnLabel: { color: "#fff" },
  mineBtnLabelMined: { color: "#aaa" },
  mineBtnCoins: { color: Colors.gold },
  mineBtnDone: { color: Colors.success },
});
