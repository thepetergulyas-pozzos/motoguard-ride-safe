import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { type VoiceStatus } from "@/hooks/useVoiceAgent";

type Props = {
  status: VoiceStatus;
  speed: number;
  canToggle: boolean;
  onToggle: () => void;
};

const STATUS_CONFIG: Record<VoiceStatus, { color: string; icon: string; label: string }> = {
  off: { color: "#636366", icon: "mic-off", label: "OFF" },
  listening: { color: "#FF9F0A", icon: "ear", label: "READY" },
  active: { color: "#FF6B1A", icon: "radio", label: "ACTIVE" },
  speak: { color: "#30AFF4", icon: "volume-medium", label: "SPEAK" },
};

export function VoiceStatusBadge({ status, speed, canToggle, onToggle }: Props) {
  const { c } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cfg = STATUS_CONFIG[status];

  useEffect(() => {
    if (status === "listening" || status === "active") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [status]);

  return (
    <Pressable
      onPress={canToggle ? onToggle : undefined}
      disabled={!canToggle}
      style={({ pressed }) => [
        styles.badge,
        {
          backgroundColor: `${cfg.color}20`,
          borderColor: `${cfg.color}55`,
          opacity: !canToggle && status === "off" ? 0.5 : pressed ? 0.8 : 1,
        }
      ]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
      </Animated.View>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  label: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
