import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

const STEPS = ["welcome", "voice", "location"] as const;
type Step = (typeof STEPS)[number];

const ACCENT = "#E8701A";

export default function OnboardingScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSettings } = useApp();

  const [step, setStep] = useState<Step>("welcome");
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (stepIndex + 1) / STEPS.length,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [stepIndex]);

  const handleNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) {
      setStep(next);
    } else {
      finish();
    }
  };

  const finish = () => {
    updateSettings({ onboardingComplete: true });
    router.replace("/(tabs)");
  };

  const startCalibration = async () => {
    setCalibrating(true);
    await new Promise((r) => setTimeout(r, 5000));
    setCalibrating(false);
    setCalibrated(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const requestLocation = async () => {
    if (Platform.OS === "web") {
      setLocationGranted(true);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === "granted");
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: c.backgroundTertiary }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: ACCENT,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === "welcome" && <WelcomeStep c={c} />}
        {step === "voice" && (
          <VoiceCalibStep
            c={c}
            calibrating={calibrating}
            calibrated={calibrated}
            onCalibrate={startCalibration}
          />
        )}
        {step === "location" && (
          <LocationStep
            c={c}
            granted={locationGranted}
            onRequest={requestLocation}
          />
        )}
      </ScrollView>

      <View style={styles.bottomRow}>
        {stepIndex > 0 && (
          <Pressable
            onPress={() => setStep(STEPS[stepIndex - 1])}
            style={[styles.backBtn, { borderColor: c.cardBorder }]}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
          </Pressable>
        )}
        <Pressable
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: ACCENT, flex: stepIndex > 0 ? 1 : undefined }]}
        >
          <Text style={styles.nextText}>
            {step === "location" ? "Get Started" : "Continue"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.dots}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.dot,
              {
                backgroundColor: i === stepIndex ? ACCENT : c.backgroundTertiary,
                width: i === stepIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function WelcomeStep({ c }: { c: any }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.heroEmoji}>
        <Text style={{ fontSize: 72 }}>🏍️</Text>
      </View>
      <Text style={[styles.stepTitle, { color: c.text }]}>Welcome to MotoGuard</Text>
      <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
        Your intelligent motorcycle safety companion. Let's get you set up in a few quick steps.
      </Text>
      <View style={styles.featureList}>
        {[
          { icon: "shield-checkmark", label: "Accident detection & emergency SOS" },
          { icon: "mic", label: "Hands-free AI voice agent" },
          { icon: "map", label: "Turn-by-turn navigation" },
          { icon: "time", label: "Ride history & statistics" },
        ].map(({ icon, label }) => (
          <View key={label} style={[styles.featureItem, { backgroundColor: "rgba(232,112,26,0.08)", borderColor: "rgba(232,112,26,0.15)" }]}>
            <Ionicons name={icon as any} size={20} color={ACCENT} />
            <Text style={[styles.featureItemText, { color: c.text }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function VoiceCalibStep({ c, calibrating, calibrated, onCalibrate }: {
  c: any; calibrating: boolean; calibrated: boolean; onCalibrate: () => void;
}) {
  const d0 = useRef(new Animated.Value(0.3)).current;
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;
  const d4 = useRef(new Animated.Value(0.3)).current;
  const dots = [d0, d1, d2, d3, d4];

  useEffect(() => {
    if (calibrating) {
      dots.forEach((dot, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 100),
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ])
        ).start();
      });
    } else {
      dots.forEach((d) => { d.stopAnimation(); d.setValue(calibrated ? 1 : 0.3); });
    }
  }, [calibrating]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.heroEmoji}>
        <Text style={{ fontSize: 72 }}>{calibrated ? "✅" : calibrating ? "🎙️" : "🎧"}</Text>
      </View>
      <Text style={[styles.stepTitle, { color: c.text }]}>
        {calibrated ? "Calibration Complete!" : "Voice Agent Setup"}
      </Text>
      <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
        {calibrated
          ? "The noise filter is calibrated for your environment. Your Voice Agent is ready."
          : calibrating
            ? "Stay quiet for 5 seconds... measuring ambient noise level"
            : 'MotoGuard uses a wake word "Hey MotoGuard" for hands-free control. Let\'s calibrate the noise filter.'}
      </Text>

      {calibrating && (
        <View style={styles.waveRow}>
          {dots.map((d, i) => (
            <Animated.View key={i} style={[styles.waveDot, { opacity: d, backgroundColor: ACCENT }]} />
          ))}
        </View>
      )}

      {!calibrated && !calibrating && (
        <Pressable
          onPress={onCalibrate}
          style={[styles.calibrateBtn, { backgroundColor: "rgba(232,112,26,0.12)", borderColor: "rgba(232,112,26,0.3)" }]}
        >
          <Ionicons name="mic" size={20} color={ACCENT} />
          <Text style={[styles.calibrateBtnText, { color: ACCENT }]}>Start 5-Second Calibration</Text>
        </Pressable>
      )}

      <Text style={[styles.skipNote, { color: c.textTertiary }]}>You can skip this step and calibrate later</Text>
    </View>
  );
}

function LocationStep({ c, granted, onRequest }: { c: any; granted: boolean | null; onRequest: () => void }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.heroEmoji}>
        <Text style={{ fontSize: 72 }}>{granted === true ? "📍" : "🗺️"}</Text>
      </View>
      <Text style={[styles.stepTitle, { color: c.text }]}>
        {granted === true ? "Location Access Granted!" : "Enable Location"}
      </Text>
      <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
        {granted === true
          ? "MotoGuard can now track your rides, show your position on the map, and provide navigation."
          : granted === false
            ? "Location was denied. You can enable it later in Settings. Some features may be limited."
            : "MotoGuard needs location access for ride tracking, map navigation, and accident response."}
      </Text>
      {granted === null && (
        <Pressable
          onPress={onRequest}
          style={[styles.calibrateBtn, { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" }]}
        >
          <Ionicons name="location" size={20} color="#22C55E" />
          <Text style={[styles.calibrateBtnText, { color: "#22C55E" }]}>Allow Location Access</Text>
        </Pressable>
      )}
      {granted === false && (
        <View style={[styles.deniedBox, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }]}>
          <Ionicons name="information-circle" size={18} color="#EF4444" />
          <Text style={[styles.deniedText, { color: "#EF4444" }]}>Enable in Settings › MotoGuard › Location</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressBar: { height: 4, marginHorizontal: 20, marginTop: 16, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  content: { padding: 24, gap: 24, flexGrow: 1 },
  stepContainer: { gap: 20, alignItems: "center" },
  heroEmoji: { width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(232,112,26,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  stepTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  stepDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 320 },
  featureList: { gap: 10, alignSelf: "stretch" },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  featureItemText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  waveRow: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", height: 40 },
  waveDot: { width: 8, height: 8, borderRadius: 4 },
  calibrateBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5 },
  calibrateBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  skipNote: { fontSize: 12, fontFamily: "Inter_400Regular" },
  deniedBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  deniedText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  bottomRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  backBtn: { width: 50, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 15, paddingHorizontal: 24, borderRadius: 14 },
  nextText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", paddingTop: 12 },
  dot: { height: 8, borderRadius: 4 },
});
