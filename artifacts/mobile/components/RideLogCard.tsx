import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { type RideLog, STRINGS, useApp } from "@/context/AppContext";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type Props = { ride: RideLog };

export function RideLogCard({ ride }: Props) {
  const { c } = useTheme();
  const { settings } = useApp();
  const t = STRINGS[settings.language];

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: "rgba(255,107,26,0.12)" }]}>
          <Ionicons name="map" size={18} color={Colors.dark.tint} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.route, { color: c.text }]}>{ride.route || "Unnamed Route"}</Text>
          <Text style={[styles.date, { color: c.textSecondary }]}>{formatDate(ride.date)}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <StatItem label={t.duration} value={formatDuration(ride.duration)} icon="time-outline" c={c} />
        <StatItem label={t.distance} value={`${ride.distance.toFixed(1)} km`} icon="speedometer-outline" c={c} />
        <StatItem label={t.maxSpeed} value={`${ride.maxSpeed} km/h`} icon="flash-outline" c={c} />
        <StatItem label={t.avgSpeed} value={`${ride.avgSpeed} km/h`} icon="analytics-outline" c={c} />
      </View>
    </View>
  );
}

function StatItem({ label, value, icon, c }: {
  label: string; value: string; icon: string; c: (typeof Colors)["dark"];
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={14} color={c.textSecondary} />
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  route: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stats: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", gap: 3, flex: 1 },
  statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
