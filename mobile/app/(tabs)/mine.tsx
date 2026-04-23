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

// ✅ SAFE BASE URL (no crash if env missing)
const API_BASE =
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "http://localhost:10000";

const TOTAL_BUTTONS = 20;
const COINS_PER_BUTTON = 50;

const BUTTON_LABELS = [
  "Gold Rush","Silver Strike","Diamond Dig","Crystal Cave",
  "Ruby Mine","Emerald Pit","Sapphire Shaft","Topaz Tunnel",
  "Pearl Drop","Opal Well","Jade Lode","Amber Vein",
  "Quartz Drill","Onyx Shaft","Garnet Hole","Citrine Core",
  "Agate Pocket","Bronze Pit","Cobalt Mine","Platinum Seam",
];

export default function MineScreen() {
  const { user, token, updateUserCoins } = useAuth();
  const {
    minedButtons,
    coinsEarnedToday,
    dailyLimit,
    canMineMore,
    refreshMining,
  } = useMining();

  const insets = useSafeAreaInsets();

  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [showCoinPop, setShowCoinPop] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const coinPopAnim = useRef(new Animated.Value(0)).current;
  const coinScaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    refreshMining();
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

  // ✅ FINAL SECURE BACKEND MINING
  const handleAdComplete = async () => {
    setShowRewardedAd(false);

    if (activeButton === null) return;
    if (!token) {
      console.log("No auth token");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/mine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buttonIndex: activeButton, // ✅ MATCHES BACKEND
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Mining failed");
      }

      setLastEarned(data.earned);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (user) {
        updateUserCoins(data.totalCoins); // ✅ TRUST SERVER
      }

      showCoinAnimation();

      // ✅ Sync UI with backend
      await refreshMining();

    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log("Mining error:", err.message);
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
          <Text style={styles.greeting}>
            Hello, {user?.username ?? "Miner"} 👋
          </Text>
          <Text style={styles.subtitle}>
            Tap to mine your daily Naira coins
          </Text>
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

      {/* GRID */}
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
                    <Text style={styles.mineBtnCoins}>
                      +{COINS_PER_BUTTON} ₦
                    </Text>
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

      {/* Ad */}
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
