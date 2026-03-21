import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface AdModalProps {
  visible: boolean;
  onComplete: () => void;
  onClose: () => void;
  buttonLabel: string;
  adDuration?: number; // seconds
}

export function AdModal({ visible, onComplete, onClose, buttonLabel, adDuration = 35 }: AdModalProps) {
  const [timeLeft, setTimeLeft] = useState(adDuration);
  const [canSkip, setCanSkip] = useState(false);
  const [completed, setCompleted] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setTimeLeft(adDuration);
      setCanSkip(false);
      setCompleted(false);
      progressAnim.setValue(0);
      return;
    }

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: adDuration * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCompleted(true);
          setCanSkip(true);
          return 0;
        }
        if (prev === Math.ceil(adDuration * 0.7)) setCanSkip(false);
        return prev - 1;
      });
    }, 1000);

    const skipTimer = setTimeout(() => setCanSkip(true), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(skipTimer);
    };
  }, [visible, adDuration]);

  const handleAction = () => {
    if (completed) {
      onComplete();
    } else if (canSkip) {
      onClose();
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Ad Header */}
          <View style={styles.header}>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>AD</Text>
            </View>
            <Text style={styles.headerText}>Watch to earn Naira coins</Text>
          </View>

          {/* Ad Placeholder */}
          <View style={styles.adArea}>
            <View style={styles.adPlaceholder}>
              <Ionicons name="play-circle" size={64} color={Colors.gold} />
              <Text style={styles.adPlaceholderTitle}>Google AdMob</Text>
              <Text style={styles.adPlaceholderSub}>Rewarded Ad</Text>
              <Text style={styles.adPlaceholderNote}>
                Replace with your AdMob Rewarded Ad Unit ID
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>
            <Text style={styles.timerText}>
              {completed ? "Ad complete!" : `${timeLeft}s`}
            </Text>
          </View>

          {/* Reward Info */}
          <View style={styles.rewardRow}>
            <Ionicons name="star" size={18} color={Colors.gold} />
            <Text style={styles.rewardText}>
              {completed ? `+50 Naira coins earned!` : `Mining: ${buttonLabel}`}
            </Text>
          </View>

          {/* Action Button */}
          <Pressable
            style={[
              styles.actionBtn,
              completed && styles.actionBtnComplete,
              !completed && !canSkip && styles.actionBtnDisabled,
            ]}
            onPress={handleAction}
            disabled={!completed && !canSkip}
          >
            <Text style={styles.actionBtnText}>
              {completed ? "Claim 50 Coins!" : canSkip ? "Skip Ad" : `Wait ${timeLeft}s...`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: 10,
  },
  adBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  adBadgeText: {
    color: "#000",
    fontWeight: "800" as const,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  headerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  adArea: {
    padding: 16,
  },
  adPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderStyle: "dashed",
    gap: 8,
  },
  adPlaceholderTitle: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  adPlaceholderSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  adPlaceholderNote: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  progressContainer: {
    paddingHorizontal: 16,
    gap: 6,
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  timerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rewardText: {
    color: Colors.gold,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  actionBtn: {
    margin: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
  },
  actionBtnComplete: {
    backgroundColor: Colors.gold,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
