import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useApp, STRINGS } from "@/context/AppContext";

export function DroneComingSoonCard() {
  const { c } = useTheme();
  const { settings } = useApp();
  const t = STRINGS[settings.language];

  const features = [
    { icon: "videocam", label: t.droneFeature1 },
    { icon: "navigate", label: t.droneFeature2 },
    { icon: "location", label: t.droneFeature3 },
    { icon: "shield-checkmark", label: t.droneFeature4 },
  ];

  return (
    <View style={[styles.card, { backgroundColor: "rgba(175,82,222,0.08)", borderColor: "rgba(175,82,222,0.3)" }]}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: "rgba(175,82,222,0.15)" }]}>
          <Text style={styles.droneEmoji}>🚁</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: c.text }]}>{t.droneTitle}</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonText}>{t.comingSoon.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.desc, { color: c.textSecondary }]}>{t.droneDesc}</Text>
        </View>
      </View>

      <View style={[styles.features, { backgroundColor: "rgba(175,82,222,0.06)", borderColor: "rgba(175,82,222,0.15)" }]}>
        {features.map(({ icon, label }) => (
          <View key={icon} style={styles.featureRow}>
            <Ionicons name={icon as any} size={15} color="#AF52DE" />
            <Text style={[styles.featureText, { color: c.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.earlyAccess, { backgroundColor: "rgba(175,82,222,0.1)" }]}>
        <Ionicons name="star" size={14} color="#AF52DE" />
        <Text style={[styles.earlyText, { color: "#AF52DE" }]}>{t.droneEarlyAccess}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1.5, padding: 18, marginHorizontal: 20, gap: 14 },
  header: { flexDirection: "row", gap: 14 },
  iconBg: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  droneEmoji: { fontSize: 26 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  soonBadge: { backgroundColor: "rgba(175,82,222,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  soonText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#AF52DE", letterSpacing: 0.5 },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  features: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  earlyAccess: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  earlyText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
});
