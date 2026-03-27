import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp, STRINGS, TIER_FEATURES } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { useRideTracking } from "@/hooks/useRideTracking";
import { useMapNavigation } from "@/hooks/useMapNavigation";
import * as Speech from "expo-speech";
import { PaywallModal } from "@/components/ui/PaywallModal";
import { NativeMapView } from "@/components/map/MapViewNative";

const TAB_BAR_HEIGHT = 49;

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function MapScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, accidentActive } = useApp();
  const t = STRINGS[settings.language];
  const features = TIER_FEATURES[settings.subscription];
  const { speed, isTracking, trackPoints } = useRideTracking();
  const nav = useMapNavigation(settings.language);
  const mapRef = useRef<any>(null);

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const navPausedByAccidentRef = useRef(false);

  useEffect(() => {
    if (accidentActive && nav.status === "navigating") {
      navPausedByAccidentRef.current = true;
      nav.stopNavigation();
      Speech.speak("Navigation paused. Are you OK?");
    }
    if (!accidentActive && navPausedByAccidentRef.current) {
      navPausedByAccidentRef.current = false;
    }
  }, [accidentActive]);

  const canNavigate = features.emergencyCall;

  const userLocation =
    trackPoints.length > 0
      ? trackPoints[trackPoints.length - 1]
      : { latitude: 47.4979, longitude: 19.0402 };

  const togglePanel = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    setPanelExpanded((v) => !v);
  }, []);

  const handleStartNav = () => {
    if (!canNavigate) { setPaywallVisible(true); return; }
    nav.startNavigation(userLocation, nav.destination);
    setPanelExpanded(false);
  };

  const handleStopNav = () => {
    nav.stopNavigation();
    setPanelExpanded(false);
  };

  const isNavigating = nav.status === "navigating" || nav.status === "arrived";
  const navRouteCoords = nav.route?.coordinates ?? null;
  const panelBottom = TAB_BAR_HEIGHT + insets.bottom;
  const topOffset = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[StyleSheet.absoluteFill, { paddingTop: Platform.OS === "web" ? topOffset : 0 }]}
        pointerEvents="box-none"
      >
        <NativeMapView
          mapRef={mapRef}
          userLocation={userLocation}
          rideCoords={trackPoints}
          navRoute={navRouteCoords}
          speed={speed}
          isDark={isDark}
        />
      </View>

      {nav.status === "navigating" && nav.currentNavStep && (
        <View style={{ paddingTop: topOffset }}>
          <NavigationHUD step={nav.currentNavStep} onStop={handleStopNav} />
        </View>
      )}

      {nav.status === "arrived" && (
        <View style={[styles.arrivedBanner, { marginTop: topOffset, marginHorizontal: 12 }]}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.dark.success} />
          <Text style={styles.arrivedText}>{t.arrived}</Text>
          <Pressable onPress={handleStopNav} hitSlop={12}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      )}

      <NavigationPanel
        nav={nav}
        canNavigate={canNavigate}
        c={c}
        isDark={isDark}
        onStart={handleStartNav}
        onStop={handleStopNav}
        panelExpanded={panelExpanded}
        togglePanel={togglePanel}
        bottom={panelBottom}
        t={t}
      />

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        featureName={t.map}
      />
    </View>
  );
}

function NavigationHUD({
  step, onStop,
}: {
  step: { instruction: string; distance: string; direction: string };
  onStop: () => void;
}) {
  return (
    <View style={[styles.hud, { backgroundColor: Colors.dark.tint }]}>
      <TurnArrow direction={step.direction} color="#FFF" />
      <View style={styles.hudText}>
        <Text style={styles.hudDistance}>{step.distance}</Text>
        <Text style={styles.hudStreet} numberOfLines={1}>{step.instruction}</Text>
      </View>
      <Pressable onPress={onStop} style={styles.hudStop} hitSlop={12}>
        <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </View>
  );
}

function TurnArrow({ direction, color }: { direction: string; color: string }) {
  const iconMap: Record<string, string> = {
    straight: "arrow-up", left: "arrow-back", right: "arrow-forward",
    "slight-left": "arrow-up-circle-outline", "slight-right": "arrow-up-circle-outline",
    "u-turn": "return-up-back", arrive: "flag",
  };
  return <Ionicons name={(iconMap[direction] ?? "arrow-up") as any} size={32} color={color} />;
}

type NavPanelProps = {
  nav: ReturnType<typeof useMapNavigation>;
  canNavigate: boolean;
  c: typeof Colors["dark"];
  isDark: boolean;
  onStart: () => void;
  onStop: () => void;
  panelExpanded: boolean;
  togglePanel: () => void;
  bottom: number;
  t: Record<string, string>;
};

function NavigationPanel({ nav, canNavigate, c, isDark, onStart, onStop, panelExpanded, togglePanel, bottom, t }: NavPanelProps) {
  const isNavigating = nav.status === "navigating" || nav.status === "arrived";
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "position" : undefined}
      keyboardVerticalOffset={bottom}
      style={[styles.panelWrapper, { bottom }]}
    >
      <View style={[styles.panel, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
        <Pressable
          style={styles.panelHandle}
          onPress={() => !isNavigating && togglePanel()}
          hitSlop={8}
        >
          <View style={[styles.handleBar, { backgroundColor: isDark ? "#3A3A3C" : "#C8C8CC" }]} />
        </Pressable>

        {isNavigating ? (
          <ActiveNavInfo nav={nav} c={c} onStop={onStop} t={t} />
        ) : (
          <DestinationSearch
            nav={nav}
            canNavigate={canNavigate}
            c={c}
            isDark={isDark}
            onStart={onStart}
            panelExpanded={panelExpanded}
            t={t}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function DestinationSearch({
  nav, canNavigate, c, isDark, onStart, panelExpanded, t,
}: {
  nav: ReturnType<typeof useMapNavigation>;
  canNavigate: boolean;
  c: typeof Colors["dark"];
  isDark: boolean;
  onStart: () => void;
  panelExpanded: boolean;
  t: Record<string, string>;
}) {
  const quickDestinations = [
    { key: "quickHome", label: t.quickHome },
    { key: "quickWork", label: t.quickWork },
    { key: "quickFuel", label: t.quickFuel },
  ];

  return (
    <View style={styles.searchContainer}>
      <View style={[
        styles.searchRow,
        { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7", borderColor: isDark ? "#3A3A3C" : "#E5E5EA" },
      ]}>
        <Ionicons name="search" size={18} color={c.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder={t.whereTo}
          placeholderTextColor={c.textSecondary}
          value={nav.destination}
          onChangeText={nav.setDestination}
          returnKeyType="go"
          onSubmitEditing={onStart}
          editable={nav.status !== "searching"}
        />
        {nav.destination.length > 0 && (
          <Pressable onPress={() => nav.setDestination("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={c.textTertiary} />
          </Pressable>
        )}
      </View>

      {nav.errorMsg && (
        <Text style={[styles.errorText, { color: "#FF3B30" }]}>{nav.errorMsg}</Text>
      )}

      {panelExpanded && (
        <View style={styles.navActions}>
          <Pressable
            onPress={onStart}
            disabled={!nav.destination.trim() || nav.status === "searching"}
            style={({ pressed }) => [
              styles.startBtn,
              {
                backgroundColor: Colors.dark.tint,
                opacity: !nav.destination.trim() || nav.status === "searching" ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {nav.status === "searching" ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="navigate" size={18} color="#FFF" />
                <Text style={styles.startBtnText}>{t.startNav}</Text>
              </>
            )}
          </Pressable>

          {!canNavigate && (
            <View style={[styles.lockedBanner, { backgroundColor: "rgba(255,107,26,0.1)", borderColor: "rgba(255,107,26,0.3)" }]}>
              <Ionicons name="lock-closed" size={14} color={Colors.dark.tint} />
              <Text style={[styles.lockedText, { color: Colors.dark.tint }]}>{t.navLocked}</Text>
            </View>
          )}

          <View style={styles.quickDestinations}>
            {quickDestinations.map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => nav.setDestination(label)}
                style={({ pressed }) => [
                  styles.quickBtn,
                  { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.quickText, { color: c.textSecondary }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function ActiveNavInfo({
  nav, c, onStop, t,
}: {
  nav: ReturnType<typeof useMapNavigation>;
  c: typeof Colors["dark"];
  onStop: () => void;
  t: Record<string, string>;
}) {
  const step = nav.currentNavStep;
  return (
    <View style={styles.activeNav}>
      {step && (
        <View style={styles.stepRow}>
          <TurnArrow direction={step.direction} color={Colors.dark.tint} />
          <View style={styles.stepText}>
            <Text style={[styles.stepInstruction, { color: c.text }]} numberOfLines={2}>
              {step.instruction}
            </Text>
            <Text style={[styles.stepDistance, { color: c.textSecondary }]}>{step.distance}</Text>
          </View>
        </View>
      )}
      {nav.route && (
        <View style={styles.routeInfo}>
          <Text style={[styles.routeInfoText, { color: c.textSecondary }]}>
            {nav.route.totalDistanceKm} · {nav.route.estimatedMinutes} min
          </Text>
          <Pressable
            onPress={onStop}
            style={({ pressed }) => [styles.stopNavBtn, { backgroundColor: "#FF3B30", opacity: pressed ? 0.85 : 1 }]}
            hitSlop={8}
          >
            <Text style={styles.stopNavText}>{t.endNav}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hud: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginTop: 8,
    borderRadius: 16, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  hudText: { flex: 1 },
  hudDistance: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  hudStreet: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" },
  hudStop: { padding: 4 },
  arrivedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1C1C1E", borderRadius: 12, padding: 14 },
  arrivedText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  panelWrapper: { position: "absolute", left: 0, right: 0 },
  panel: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 16,
  },
  panelHandle: { alignItems: "center", paddingVertical: 10 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 22 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6, marginLeft: 4 },
  navActions: { marginTop: 12, gap: 10 },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  startBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  lockedBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  lockedText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  quickDestinations: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  quickText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  activeNav: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepText: { flex: 1, gap: 2 },
  stepInstruction: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  stepDistance: { fontSize: 13, fontFamily: "Inter_400Regular" },
  routeInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  routeInfoText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  stopNavBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  stopNavText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
