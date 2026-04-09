import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccidentDetectionCard } from "@/components/AccidentDetectionCard";
import { VoiceAgentCard } from "@/components/VoiceAgentCard";
import { VoiceStatusBadge } from "@/components/VoiceStatusBadge";
import { DroneComingSoonCard } from "@/components/DroneComingSoonCard";
import { useApp, STRINGS, TIER_FEATURES } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useRideTracking } from "@/hooks/useRideTracking";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useAccidentDetection } from "@/hooks/useAccidentDetection";
import { useLowBatteryAlert } from "@/hooks/useLowBatteryAlert";
import { getGpsStatus } from "@/services/LocationService";
import { logAppEvent } from "@/constants/SheetsClient";

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function SpeedDisplay({ speed, elapsed, distance, maxSpeed, isActive, rideStatus, t }: {
  speed: number; elapsed: number; distance: number; maxSpeed: number;
  isActive: boolean; rideStatus: string; t: Record<string, string>;
}) {
  const { c } = useTheme();
  const isPaused = rideStatus === "paused";
  const borderColor = isPaused ? "rgba(245,158,11,0.3)" : isActive ? "rgba(34,197,94,0.25)" : c.cardBorder;
  const bgColor = isPaused ? "rgba(245,158,11,0.06)" : isActive ? "rgba(34,197,94,0.06)" : c.card;
  return (
    <View style={[styles.speedCard, { backgroundColor: bgColor, borderColor }]}>
      {isPaused && (
        <View style={[styles.pausedBanner, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
          <Ionicons name="pause-circle" size={14} color="#F59E0B" />
          <Text style={[styles.pausedText, { color: "#F59E0B" }]} numberOfLines={2}>
            {t.ridePaused}
          </Text>
        </View>
      )}
      <View style={styles.speedRow}>
        <View style={styles.speedMain}>
          <Text style={[styles.speedNum, { color: c.text }]}>{Math.round(speed)}</Text>
          <Text style={[styles.speedUnit, { color: c.textSecondary }]}>km/h</Text>
        </View>
        <View style={styles.speedStats}>
          <View style={styles.speedStat}>
            <Ionicons name="navigate" size={14} color={c.textSecondary} />
            <Text style={[styles.speedStatVal, { color: c.text }]}>{distance.toFixed(1)} km</Text>
            <Text style={[styles.speedStatLabel, { color: c.textSecondary }]} numberOfLines={1}>
              {t.statDist}
            </Text>
          </View>
          <View style={[styles.speedDivider, { backgroundColor: c.separator }]} />
          <View style={styles.speedStat}>
            <Ionicons name="time" size={14} color={c.textSecondary} />
            <Text style={[styles.speedStatVal, { color: c.text }]}>{formatDuration(elapsed)}</Text>
            <Text style={[styles.speedStatLabel, { color: c.textSecondary }]} numberOfLines={1}>
              {t.statTime}
            </Text>
          </View>
          <View style={[styles.speedDivider, { backgroundColor: c.separator }]} />
          <View style={styles.speedStat}>
            <Ionicons name="flash" size={14} color={c.textSecondary} />
            <Text style={[styles.speedStatVal, { color: c.text }]}>{Math.round(maxSpeed)}</Text>
            <Text style={[styles.speedStatLabel, { color: c.textSecondary }]} numberOfLines={1}>
              {t.statMax}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function QuickStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.quickStat, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={[styles.quickStatIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.quickStatVal, { color: c.text }]}>{value}</Text>
      <Text
        style={[styles.quickStatLabel, { color: c.textSecondary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { settings, setAccidentActive } = useApp();
  const t = STRINGS[settings.language];
  const features = TIER_FEATURES[settings.subscription];
  const isWeb = Platform.OS === "web";
  const paddingTop = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { ride, startRide, stopRide } = useRideTracking();
  const voice = useVoiceAgent(ride.currentSpeedKmh, settings.language);
  const { alert: accidentAlert } = useAccidentDetection(ride.currentSpeedKmh);

  const riderName = settings.emergencyContacts[0]?.name ?? "Rider";
  useLowBatteryAlert({
    isRiding: ride.active,
    contacts: settings.emergencyContacts,
    riderName,
  });

  useEffect(() => {
    setAccidentActive(accidentAlert !== null);
  }, [accidentAlert]);

  const handleRideToggle = async () => {
    if (ride.active) {
      stopRide();
    } else {
      if (settings.rideLogs.length === 0) {
        logAppEvent("first_ride_started", settings.language, settings.subscription).catch(() => {});
      }
      await startRide();
    }
  };

  const gpsLost = ride.active && getGpsStatus() === "lost";
  const gpsEstimated = ride.active && getGpsStatus() === "estimated";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: paddingTop + 16, paddingBottom: isWeb ? 34 + 84 : 100 },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: c.textSecondary }]} numberOfLines={1}>
            {t.greeting}
          </Text>
          <Text style={[styles.appName, { color: c.text }]}>MotoGuard</Text>
        </View>
        <View style={styles.headerBadges}>
          {features.voiceAgent && (
            <VoiceStatusBadge
              status={voice.status}
              speed={ride.currentSpeedKmh}
              canToggle={voice.canToggle}
              onToggle={voice.toggleAgent}
            />
          )}
          <View style={[styles.tierBadge, { backgroundColor: `${c.tint}1F` }]}>
            <Ionicons name="star" size={12} color={c.tint} />
            <Text style={[styles.tierLabel, { color: c.tint }]}>{features.label}</Text>
          </View>
        </View>
      </View>

      {(gpsLost || gpsEstimated) && (
        <View style={[styles.gpsBanner, { backgroundColor: gpsLost ? "rgba(255,59,48,0.1)" : "rgba(245,158,11,0.1)" }]}>
          <Ionicons
            name={gpsLost ? "location-outline" : "navigate-circle-outline"}
            size={16}
            color={gpsLost ? c.danger : "#F59E0B"}
          />
          <Text style={[styles.gpsBannerText, { color: gpsLost ? c.danger : "#F59E0B" }]} numberOfLines={2}>
            {gpsLost ? t.gpsLost : t.gpsEstimated}
          </Text>
        </View>
      )}

      <SpeedDisplay
        speed={ride.currentSpeedKmh}
        elapsed={ride.elapsed}
        distance={ride.distanceKm}
        maxSpeed={ride.maxSpeedKmh}
        isActive={ride.active}
        rideStatus={ride.rideStatus}
        t={t}
      />

      <Pressable
        onPress={handleRideToggle}
        style={({ pressed }) => [
          styles.rideBtn,
          {
            backgroundColor: ride.active ? c.danger : c.success,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <Ionicons name={ride.active ? "stop-circle" : "play-circle"} size={22} color="#FFF" />
        <Text style={styles.rideBtnText} numberOfLines={1}>
          {ride.active ? t.stopRide : t.startRide}
        </Text>
      </Pressable>

      <View style={styles.quickStats}>
        <QuickStat icon="cloud-done" label={t.labelSensor} value="4Hz" color={c.success} />
        <QuickStat
          icon="people"
          label={t.labelContacts}
          value={`${settings.emergencyContacts.length}/${features.contactLimit === Infinity ? "∞" : features.contactLimit}`}
          color={c.tint}
        />
        <QuickStat icon="map" label={t.rides} value={`${settings.rideLogs.length}`} color="#5E9BF5" />
      </View>

      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionProtection}</Text>
      <AccidentDetectionCard />

      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionVoiceAI}</Text>
      <VoiceAgentCard
        status={voice.status}
        noiseFilter={voice.noiseFilter}
        setNoiseFilter={voice.setNoiseFilter}
        lastResponse={voice.lastResponse}
        canToggle={voice.canToggle}
        speed={ride.currentSpeedKmh}
        onToggle={voice.toggleAgent}
        autoActivatedMessage={voice.autoActivatedMessage}
        clearAutoActivatedMessage={voice.clearAutoActivatedMessage}
      />

      {features.drone && (
        <>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionDrone}</Text>
          <DroneComingSoonCard />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: -2 },
  headerBadges: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  tierLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  gpsBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, padding: 10, borderRadius: 10 },
  gpsBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  speedCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  pausedBanner: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  pausedText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  speedRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  speedMain: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  speedNum: { fontSize: 64, fontFamily: "Inter_700Bold", lineHeight: 64 },
  speedUnit: { fontSize: 16, fontFamily: "Inter_400Regular", marginBottom: 8 },
  speedStats: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  speedStat: { alignItems: "center", gap: 3 },
  speedStatVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  speedStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  speedDivider: { width: 1, height: 36 },
  rideBtn: {
    marginHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 14, borderRadius: 14,
  },
  rideBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  quickStats: { flexDirection: "row", paddingHorizontal: 20, gap: 12 },
  quickStat: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  quickStatIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickStatVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  quickStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5, paddingHorizontal: 20, marginTop: 4 },
});
