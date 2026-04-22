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
  RefreshControl, // ✅ ADDED
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
const INTERSTITIAL_INTERVAL_MS = 60 * 1000;

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

  const [refreshing, setRefreshing] = useState(false); // ✅ ADDED

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

  // ✅ REFRESH FUNCTION
  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refreshMining();
    setRefreshing(false);
  };

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

      {/* ✅ UPDATED SCROLLVIEW */}
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
                  {mined && <Text style={styles.mineBtnDone}>Mined!</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Coin animation + Ads remain unchanged */}
    </View>
  );
}
