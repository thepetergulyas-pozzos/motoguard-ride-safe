import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useApp, STRINGS } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { type AlertState } from "@/hooks/useAccidentDetection";
import { getCurrentPositionOnce, buildEmergencySMS } from "@/services/LocationService";
import { sendEmergencySMS } from "@/services/SMSService";

type Props = {
  alert: AlertState | null;
  onDismiss: () => void;
};

export function AccidentAlertOverlay({ alert, onDismiss }: Props) {
  const { c, isDark } = useTheme();
  const { settings } = useApp();
  const t = STRINGS[settings.language];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const emergencySentRef = useRef(false);

  const level = alert?.level ?? "none";

  const LEVEL_CONFIG = {
    warning: {
      color: "#FF9F0A", icon: "warning" as const,
      title: t.alertWarningTitle, sub: t.alertWarningSub, label: t.alertWarningBtn,
    },
    alert: {
      color: "#FF3B30", icon: "alert-circle" as const,
      title: t.alertAlertTitle, sub: t.alertAlertSub, label: t.cancel,
    },
    emergency: {
      color: "#FF3B30", icon: "medkit" as const,
      title: t.alertEmergencyTitle, sub: t.alertEmergencySub, label: t.alertWarningBtn,
    },
    none: {
      color: "#FF9F0A", icon: "warning" as const,
      title: "", sub: "", label: "",
    },
  };

  const cfg = LEVEL_CONFIG[level];

  useEffect(() => {
    if (!alert) {
      emergencySentRef.current = false;
      return;
    }
    if (alert.level === "emergency" && !emergencySentRef.current) {
      emergencySentRef.current = true;
      triggerEmergency();
    }
  }, [alert?.level]);

  useEffect(() => {
    if (!alert) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    return () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };
  }, [alert]);

  const triggerEmergency = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const contacts = settings.emergencyContacts;
    if (!contacts.length) return;
    const location = await getCurrentPositionOnce();
    const lat = location?.latitude ?? 0;
    const lon = location?.longitude ?? 0;
    const message = buildEmergencySMS("Rider", lat, lon, "EMERGENCY");
    const phones = contacts.map((c) => c.phone);
    await sendEmergencySMS(phones, message);
  };

  const handleCall112 = () => {
    Linking.openURL("tel:112").catch(() => {});
  };

  if (!alert || level === "none") return null;

  const bgColor = isDark ? "rgba(10,10,10,0.96)" : "rgba(255,255,255,0.97)";

  const smsSentText = t.alertSmsCount.replace("{n}", settings.emergencyContacts.length.toString());

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bgColor, borderColor: `${cfg.color}44` }]}>
          <Animated.View
            style={[
              styles.iconCircle,
              { backgroundColor: `${cfg.color}22`, transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name={cfg.icon} size={44} color={cfg.color} />
          </Animated.View>

          <Text style={[styles.title, { color: cfg.color }]}>{cfg.title}</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>{cfg.sub}</Text>

          {alert.countdown > 0 && level !== "emergency" && (
            <View style={[styles.countdownCircle, { backgroundColor: cfg.color }]}>
              <Text style={styles.countdownNum}>{alert.countdown}</Text>
            </View>
          )}

          {level === "emergency" && (
            <View style={styles.emergencyInfo}>
              <Ionicons name="checkmark-circle" size={18} color={c.success} />
              <Text style={[styles.emergencyText, { color: c.success }]}>
                {settings.emergencyContacts.length > 0 ? smsSentText : t.noContactsConfig}
              </Text>
            </View>
          )}

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: cfg.color, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.btnText}>{cfg.label}</Text>
          </Pressable>

          {(level === "alert" || level === "emergency") && (
            <Pressable
              onPress={handleCall112}
              style={({ pressed }) => [
                styles.callBtn,
                { borderColor: cfg.color, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="call" size={18} color={cfg.color} />
              <Text style={[styles.callText, { color: cfg.color }]}>{t.call112}</Text>
            </Pressable>
          )}

          <Text style={[styles.gForce, { color: c.textTertiary }]}>
            G-force: {alert.gForce.toFixed(2)}g
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  card: {
    width: "100%", borderRadius: 28, padding: 28,
    alignItems: "center", gap: 14, borderWidth: 1.5,
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  countdownCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  countdownNum: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFF" },
  emergencyInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  emergencyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  btn: {
    width: "100%", paddingVertical: 16, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  btnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" },
  callBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    width: "100%", paddingVertical: 13, borderRadius: 14,
    justifyContent: "center", borderWidth: 1.5,
  },
  callText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  gForce: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
