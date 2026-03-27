import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useApp, STRINGS } from "@/context/AppContext";

export function AccidentDetectionCard() {
  const { c, Colors } = useTheme();
  const { settings, updateSettings } = useApp();
  const t = STRINGS[settings.language];
  const active = settings.accidentDetectionEnabled;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      fadeAnim.stopAnimation();
      pulseAnim.setValue(1);
      fadeAnim.setValue(0.4);
    }
  }, [active, pulseAnim, fadeAnim]);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings({ accidentDetectionEnabled: !active });
  };

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: active
            ? "rgba(48,209,88,0.08)"
            : c.card,
          borderColor: active ? "rgba(48,209,88,0.3)" : c.cardBorder,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          {active && (
            <Animated.View
              style={[
                styles.pulse,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: Colors.dark.success,
                },
              ]}
            />
          )}
          <View
            style={[
              styles.iconBg,
              {
                backgroundColor: active
                  ? "rgba(48,209,88,0.2)"
                  : c.backgroundTertiary,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={28}
              color={active ? Colors.dark.success : c.textSecondary}
            />
          </View>
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: c.text }]}>
            {t.accidentDetection}
          </Text>
          <Text
            style={[
              styles.status,
              { color: active ? Colors.dark.success : c.danger },
            ]}
          >
            {active ? t.active : t.inactive}
          </Text>
        </View>

        <View
          style={[
            styles.toggle,
            {
              backgroundColor: active
                ? Colors.dark.success
                : c.backgroundTertiary,
            },
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              { transform: [{ translateX: active ? 20 : 2 }] },
            ]}
          />
        </View>
      </View>

      <View
        style={[
          styles.separator,
          { backgroundColor: active ? "rgba(48,209,88,0.15)" : c.separator },
        ]}
      />

      <View style={styles.statsRow}>
        <StatPill icon="hardware-chip" label="MAIDS Standard" color={c.textSecondary} />
        <StatPill icon="analytics" label="10Hz IMU" color={c.textSecondary} />
        <StatPill icon="wifi" label="Offline" color={c.textSecondary} />
      </View>
    </Pressable>
  );
}

function StatPill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon as any} size={12} color={color} />
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginHorizontal: 20,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconContainer: { alignItems: "center", justifyContent: "center", width: 52, height: 52 },
  pulse: { position: "absolute", width: 52, height: 52, borderRadius: 26 },
  iconBg: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  textBlock: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  status: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: "center" },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  separator: { height: 1, marginVertical: 14 },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(128,128,128,0.1)", paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 6,
  },
  pillLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
