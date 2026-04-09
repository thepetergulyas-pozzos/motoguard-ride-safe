import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RideLogCard } from "@/components/RideLogCard";
import { STRINGS, TIER_FEATURES, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { PaywallModal } from "@/components/ui/PaywallModal";

function SimulateRideButton({ onSimulate, t }: { onSimulate: () => void; t: Record<string, string> }) {
  const { c } = useTheme();
  const [active, setActive] = useState(false);

  const handlePress = () => {
    if (active) return;
    setActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => { setActive(false); onSimulate(); }, 2000);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.simulateBtn,
        {
          backgroundColor: active ? c.tint : c.backgroundTertiary,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={16} color={active ? "#fff" : c.textSecondary} />
      <Text style={[styles.simulateBtnText, { color: active ? "#fff" : c.textSecondary }]} numberOfLines={1}>
        {active ? t.recordingRide : t.simulateRide}
      </Text>
    </Pressable>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text
        style={[styles.statLabel, { color: c.textSecondary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </View>
  );
}

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { settings, addRideLog, clearRideLogs } = useApp();
  const t = STRINGS[settings.language];
  const features = TIER_FEATURES[settings.subscription];
  const isWeb = Platform.OS === "web";
  const paddingTop = isWeb ? Math.max(insets.top, 67) : insets.top;
  const paddingBottom = isWeb ? 34 + 84 : 100;

  const [showPaywall, setShowPaywall] = useState(false);
  const canAddMore = features.logLimit === Infinity || settings.rideLogs.length < features.logLimit;

  const handleSimulate = () => {
    if (!canAddMore) { setShowPaywall(true); return; }
    const routes = ["Mountain Pass", "City Loop", "Coastal Hwy", "Country Road", "Track Day"];
    addRideLog({
      date: new Date().toISOString(),
      duration: Math.floor(Math.random() * 5400) + 600,
      distance: Math.random() * 120 + 10,
      maxSpeed: Math.floor(Math.random() * 80) + 80,
      avgSpeed: Math.floor(Math.random() * 40) + 50,
      route: routes[Math.floor(Math.random() * routes.length)],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClear = () => {
    Alert.alert(t.clearAllTitle, t.clearAllMsg, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.clear, style: "destructive",
        onPress: () => { clearRideLogs(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
      },
    ]);
  };

  const ridesLoggedLabel = t.ridesLoggedText.replace("{n}", settings.rideLogs.length.toString());
  const maxLabel = features.logLimit !== Infinity ? ` · ${features.logLimit} ${t.ridesMax}` : "";

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={settings.rideLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: paddingTop + 16, paddingBottom }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.titleRow}>
              <Text style={[styles.pageTitle, { color: c.text }]}>{t.rideHistory}</Text>
              {settings.rideLogs.length > 0 && (
                <Pressable onPress={handleClear} hitSlop={8}>
                  <Text style={[styles.clearText, { color: c.danger }]}>{t.clear}</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.statsRow}>
              <StatCard label={t.totalRides} value={settings.rideLogs.length.toString()} icon="flag" color="#5E9BF5" />
              <StatCard
                label={t.totalDistance}
                value={`${settings.rideLogs.reduce((acc, r) => acc + r.distance, 0).toFixed(0)} km`}
                icon="map"
                color={c.tint}
              />
            </View>

            {!features.export && (
              <Pressable
                onPress={() => setShowPaywall(true)}
                style={({ pressed }) => [
                  styles.exportBanner,
                  { backgroundColor: "rgba(255,107,26,0.08)", borderColor: "rgba(255,107,26,0.2)", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="download-outline" size={18} color={c.tint} />
                <Text style={[styles.exportText, { color: c.tint }]} numberOfLines={1}>
                  {t.exportUnlock} → Pro
                </Text>
                <Ionicons name="chevron-forward" size={16} color={c.tint} />
              </Pressable>
            )}

            <SimulateRideButton onSimulate={handleSimulate} t={t} />
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]} numberOfLines={1}>
              {ridesLoggedLabel}{maxLabel}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>{t.noRides}</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>{t.startRiding}</Text>
          </View>
        }
        renderItem={({ item }) => <RideLogCard ride={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName={t.exportLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 20, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  pageTitle: { fontSize: 30, fontFamily: "Inter_700Bold" },
  clearText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  exportBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  exportText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  simulateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  simulateBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5, marginTop: 4 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
