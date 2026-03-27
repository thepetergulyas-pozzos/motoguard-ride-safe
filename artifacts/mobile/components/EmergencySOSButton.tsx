import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useApp, STRINGS, TIER_FEATURES } from "@/context/AppContext";
import { PaywallModal } from "@/components/ui/PaywallModal";
import { getLocalEmergencyNumber } from "@/utils/emergencyNumbers";

export function EmergencySOSButton() {
  const { c, isDark } = useTheme();
  const { settings } = useApp();
  const t = STRINGS[settings.language];
  const features = TIER_FEATURES[settings.subscription];

  const [showModal, setShowModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [countdown, setCountdown] = useState(settings.countdownSeconds);
  const [isCounting, setIsCounting] = useState(false);
  const [emergencyNumber, setEmergencyNumber] = useState("112");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getLocalEmergencyNumber().then(setEmergencyNumber).catch(() => {});
  }, []);

  useEffect(() => {
    if (isCounting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();

      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsCounting(false);
            setShowModal(false);
            if (Platform.OS !== "web") {
              Linking.openURL(`tel:${emergencyNumber}`).catch(() => {});
            }
            Alert.alert(`${t.calling112} ${emergencyNumber}`, t.confirmCall);
            return settings.countdownSeconds;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      pulseAnim.stopAnimation();
      ringAnim.stopAnimation();
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isCounting, emergencyNumber]);

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (!features.emergencyCall) { setShowPaywall(true); return; }
    setCountdown(settings.countdownSeconds);
    setShowModal(true);
    setIsCounting(true);
  };

  const handleCancel = () => {
    setIsCounting(false);
    setShowModal(false);
    setCountdown(settings.countdownSeconds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const modalBg = isDark ? "#1A0000" : "#FFF5F5";
  const modalBorder = isDark ? "rgba(255,59,48,0.3)" : "rgba(255,59,48,0.2)";

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.sosBtn,
          { transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <View style={styles.sosInner}>
          <Animated.View
            style={[
              styles.sosRing,
              {
                opacity: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
              },
            ]}
          />
          <Text style={styles.sosText}>{t.sos}</Text>
          <Text style={styles.sosNumber}>{emergencyNumber}</Text>
        </View>
      </Pressable>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={handleCancel}>
        <View style={styles.overlay}>
          <View style={[styles.countdownCard, { backgroundColor: modalBg, borderColor: modalBorder }]}>
            <Ionicons name="warning" size={40} color={Colors.dark.danger} />
            <Text style={[styles.countdownTitle, { color: c.text }]}>{t.confirmCall}</Text>
            <Text style={[styles.countdownSub, { color: c.textSecondary }]}>
              {emergencyNumber} · {t.countdown}
            </Text>
            <Animated.View style={[styles.countdownCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.countdownNum}>{countdown}</Text>
            </Animated.View>
            <Pressable
              onPress={handleCancel}
              style={[styles.cancelBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)" }]}
            >
              <Text style={[styles.cancelText, { color: c.text }]}>{t.cancel}</Text>
            </Pressable>
            <Text style={[styles.volumeHint, { color: c.textTertiary }]}>{t.volumeHint}</Text>
          </View>
        </View>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName={t.emergencyCallLabel} />
    </>
  );
}

const styles = StyleSheet.create({
  sosBtn: {
    marginHorizontal: 20, borderRadius: 20, overflow: "hidden",
    backgroundColor: Colors.dark.danger,
    shadowColor: Colors.dark.danger, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  sosInner: { paddingVertical: 22, alignItems: "center", justifyContent: "center", gap: 2 },
  sosRing: {
    position: "absolute", width: "100%", height: "100%",
    borderRadius: 20, borderWidth: 2, borderColor: Colors.dark.danger,
  },
  sosText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 4 },
  sosNumber: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)", letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  countdownCard: { width: "100%", borderRadius: 24, padding: 28, alignItems: "center", gap: 12, borderWidth: 1 },
  countdownTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  countdownSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  countdownCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.dark.danger, alignItems: "center", justifyContent: "center", marginVertical: 8,
  },
  countdownNum: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, marginTop: 4 },
  cancelText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  volumeHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
});
