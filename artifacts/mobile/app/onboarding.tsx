import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STRINGS, type Language, useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { TERMS_OF_SERVICE, PRIVACY_POLICY, getLegalText } from "@/constants/LegalTexts";
import { logAppEvent } from "@/constants/SheetsClient";

const STEPS = ["welcome", "language", "legal", "voice", "location"] as const;
type Step = (typeof STEPS)[number];

const ACCENT = "#E8701A";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

export default function OnboardingScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSettings, settings } = useApp();

  const [step, setStep] = useState<Step>("welcome");
  const [ready, setReady] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [ridingAccepted, setRidingAccepted] = useState(false);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  const t = STRINGS[settings.language];
  const stepIndex = STEPS.indexOf(step);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function detectStartStep() {
      const savedLang = await AsyncStorage.getItem("app_language");
      const savedLegal = await AsyncStorage.getItem("legal_accepted");

      if (savedLang) {
        const lang = savedLang as Language;
        setSelectedLang(lang);
        updateSettings({ language: lang });

        if (!savedLegal) {
          setStep("legal");
        } else {
          try {
            const legalData = JSON.parse(savedLegal);
            if (legalData.termsVersion !== TERMS_OF_SERVICE.version) {
              setStep("legal");
            } else {
              setStep("welcome");
            }
          } catch {
            setStep("legal");
          }
        }
      } else {
        setStep("welcome");
      }
      setReady(true);
    }
    detectStartStep();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (stepIndex + 1) / STEPS.length,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [stepIndex]);

  if (!ready) return null;

  const canProceedLegal = termsAccepted && privacyAccepted && ridingAccepted;
  const canProceedLanguage = selectedLang !== null;

  const handleSelectLanguage = async (lang: Language) => {
    setSelectedLang(lang);
    await AsyncStorage.setItem("app_language", lang);
    updateSettings({ language: lang });
    Haptics.selectionAsync();
  };

  const handleNext = async () => {
    if (step === "welcome") {
      setStep("language");
    } else if (step === "language") {
      setStep("legal");
    } else if (step === "legal") {
      await AsyncStorage.setItem(
        "legal_accepted",
        JSON.stringify({
          termsVersion: TERMS_OF_SERVICE.version,
          privacyVersion: PRIVACY_POLICY.version,
          language: settings.language,
          acceptedAt: new Date().toISOString(),
        })
      );
      updateSettings({
        legalAccepted: true,
        legalAcceptedVersion: TERMS_OF_SERVICE.version,
      });
      setStep("voice");
    } else if (step === "voice") {
      setStep("location");
    } else if (step === "location") {
      updateSettings({ onboardingComplete: true });
      logAppEvent("onboarding_completed", selectedLang ?? settings.language, settings.subscription).catch(() => {});
      router.replace("/(tabs)");
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  const startCalibration = async () => {
    setCalibrating(true);
    await new Promise((r) => setTimeout(r, 5000));
    setCalibrating(false);
    setCalibrated(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const requestLocation = async () => {
    if (Platform.OS === "web") { setLocationGranted(true); return; }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === "granted");
    Haptics.selectionAsync();
  };

  const isNextDisabled =
    (step === "language" && !canProceedLanguage) ||
    (step === "legal" && !canProceedLegal);

  const nextLabel =
    step === "welcome" ? "Get Started"
      : step === "legal" ? t.acceptAndRide
      : step === "location" ? "Finish"
      : "Continue";

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {step !== "welcome" && (
        <View style={[styles.progressBar, { backgroundColor: c.backgroundTertiary }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: ACCENT,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          step === "welcome" && styles.welcomeContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {step === "welcome" && <WelcomeStep c={c} />}
        {step === "language" && (
          <LanguageStep
            c={c}
            selectedLang={selectedLang}
            onSelect={handleSelectLanguage}
          />
        )}
        {step === "legal" && (
          <LegalStep
            c={c}
            t={t}
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            ridingAccepted={ridingAccepted}
            onToggleTerms={() => { setTermsAccepted(!termsAccepted); Haptics.selectionAsync(); }}
            onTogglePrivacy={() => { setPrivacyAccepted(!privacyAccepted); Haptics.selectionAsync(); }}
            onToggleRiding={() => { setRidingAccepted(!ridingAccepted); Haptics.selectionAsync(); }}
            onViewTerms={() => setLegalModal("terms")}
            onViewPrivacy={() => setLegalModal("privacy")}
          />
        )}
        {step === "voice" && (
          <VoiceCalibStep
            c={c}
            t={t}
            calibrating={calibrating}
            calibrated={calibrated}
            onCalibrate={startCalibration}
          />
        )}
        {step === "location" && (
          <LocationStep
            c={c}
            t={t}
            granted={locationGranted}
            onRequest={requestLocation}
          />
        )}
      </ScrollView>

      <View style={[styles.bottomRow, step === "welcome" && styles.bottomRowCentered]}>
        {step !== "welcome" && (
          <Pressable
            onPress={handleBack}
            style={[styles.backBtn, { borderColor: c.cardBorder }]}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
          </Pressable>
        )}
        <Pressable
          onPress={isNextDisabled ? undefined : handleNext}
          style={[
            styles.nextBtn,
            {
              backgroundColor: isNextDisabled ? c.backgroundTertiary : ACCENT,
              flex: step !== "welcome" ? 1 : undefined,
              alignSelf: step === "welcome" ? "center" : undefined,
              paddingHorizontal: step === "welcome" ? 40 : 24,
            },
          ]}
        >
          <Text style={[styles.nextText, { color: isNextDisabled ? c.textTertiary : "#FFF" }]}>
            {nextLabel}
          </Text>
          <Ionicons
            name={step === "welcome" ? "arrow-forward" : step === "legal" ? "checkmark-circle" : "chevron-forward"}
            size={18}
            color={isNextDisabled ? c.textTertiary : "#FFF"}
          />
        </Pressable>
      </View>

      {step !== "welcome" && (
        <View style={styles.dots}>
          {STEPS.slice(1).map((s, i) => {
            const realIndex = i + 1;
            const isActive = realIndex === stepIndex;
            return (
              <View
                key={s}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? ACCENT : realIndex < stepIndex ? `${ACCENT}60` : c.backgroundTertiary,
                    width: isActive ? 20 : 8,
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {legalModal && (
        <LegalTextModal
          c={c}
          closeLabel={t.closeBtn}
          title={legalModal === "terms" ? t.termsOfService : t.privacyLabel ?? "Privacy Policy"}
          text={
            legalModal === "terms"
              ? getLegalText(TERMS_OF_SERVICE, settings.language)
              : getLegalText(PRIVACY_POLICY, settings.language)
          }
          onClose={() => setLegalModal(null)}
        />
      )}
    </View>
  );
}

function WelcomeStep({ c }: { c: any }) {
  return (
    <View style={styles.welcomeStep}>
      <View style={[styles.logoCircle, { backgroundColor: "rgba(232,112,26,0.1)", borderColor: "rgba(232,112,26,0.2)" }]}>
        <Text style={{ fontSize: 72 }}>🏍️</Text>
      </View>
      <Text style={[styles.welcomeTitle, { color: c.text }]}>Welcome to MotoGuard</Text>
      <Text style={[styles.welcomeSub, { color: c.textSecondary }]}>
        Your smartest riding companion
      </Text>
    </View>
  );
}

function LanguageStep({ c, selectedLang, onSelect }: {
  c: any;
  selectedLang: Language | null;
  onSelect: (lang: Language) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: c.text }]}>Choose your language</Text>
      <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
        Select your preferred language for MotoGuard
      </Text>
      <View style={styles.langGrid}>
        {LANGUAGES.map((lang) => {
          const selected = selectedLang === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => onSelect(lang.code)}
              style={({ pressed }) => [
                styles.langCard,
                {
                  backgroundColor: selected ? `${ACCENT}15` : c.card,
                  borderColor: selected ? ACCENT : c.cardBorder,
                  borderWidth: selected ? 2 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langName, { color: selected ? ACCENT : c.text }]}>{lang.label}</Text>
              {selected && (
                <View style={[styles.langCheckMark, { backgroundColor: ACCENT }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CheckboxRow({
  checked, onToggle, label, linkText, onLinkPress, c,
}: {
  checked: boolean; onToggle: () => void;
  label: string; linkText?: string; onLinkPress?: () => void; c: any;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.checkRow}>
      <View
        style={[
          styles.checkbox,
          { borderColor: checked ? ACCENT : c.cardBorder, backgroundColor: checked ? ACCENT : "transparent" },
        ]}
      >
        {checked && <Ionicons name="checkmark" size={14} color="#FFF" />}
      </View>
      <Text style={[styles.checkLabel, { color: c.text }]}>
        {label}
        {linkText && (
          <Text
            onPress={(e) => { e.stopPropagation?.(); onLinkPress?.(); }}
            style={{ color: ACCENT, fontFamily: "Inter_600SemiBold" }}
          >
            {"  "}{linkText}
          </Text>
        )}
      </Text>
    </Pressable>
  );
}

function LegalStep({
  c, t,
  termsAccepted, privacyAccepted, ridingAccepted,
  onToggleTerms, onTogglePrivacy, onToggleRiding,
  onViewTerms, onViewPrivacy,
}: {
  c: any; t: Record<string, string>;
  termsAccepted: boolean; privacyAccepted: boolean; ridingAccepted: boolean;
  onToggleTerms: () => void; onTogglePrivacy: () => void; onToggleRiding: () => void;
  onViewTerms: () => void; onViewPrivacy: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={[styles.heroEmoji, { backgroundColor: "rgba(232,112,26,0.08)" }]}>
        <Text style={{ fontSize: 56 }}>🛡️</Text>
      </View>
      <Text style={[styles.stepTitle, { color: c.text }]}>{t.beforeYouRide}</Text>
      <Text style={[styles.stepDesc, { color: c.textSecondary }]}>{t.reviewTermsSub}</Text>

      <View style={[styles.checkboxGroup, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <CheckboxRow
          c={c}
          checked={termsAccepted}
          onToggle={onToggleTerms}
          label={t.acceptTermsCheck}
          linkText="↗"
          onLinkPress={onViewTerms}
        />
        <View style={[styles.checkSep, { backgroundColor: c.separator }]} />
        <CheckboxRow
          c={c}
          checked={privacyAccepted}
          onToggle={onTogglePrivacy}
          label={t.acceptPrivacyCheck}
          linkText="↗"
          onLinkPress={onViewPrivacy}
        />
        <View style={[styles.checkSep, { backgroundColor: c.separator }]} />
        <CheckboxRow
          c={c}
          checked={ridingAccepted}
          onToggle={onToggleRiding}
          label={t.legalRidingCheck}
        />
      </View>

      <Text style={[styles.footnote, { color: c.textTertiary }]}>{t.legalFootnote}</Text>
    </View>
  );
}

function VoiceCalibStep({ c, t, calibrating, calibrated, onCalibrate }: {
  c: any; t: Record<string, string>;
  calibrating: boolean; calibrated: boolean; onCalibrate: () => void;
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
      <View style={[styles.heroEmoji, { backgroundColor: "rgba(232,112,26,0.08)" }]}>
        <Text style={{ fontSize: 72 }}>{calibrated ? "✅" : calibrating ? "🎙️" : "🎧"}</Text>
      </View>
      <Text style={[styles.stepTitle, { color: c.text }]}>
        {calibrated ? "Calibration Complete!" : "Voice Agent Setup"}
      </Text>
      <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
        {calibrated
          ? "The noise filter is calibrated. Your Voice Agent is ready."
          : calibrating
            ? "Stay quiet for 5 seconds... measuring ambient noise level"
            : "MotoGuard uses a wake word \"Hey MotoGuard\" for hands-free control. Calibrate the noise filter for best results."}
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
          style={[styles.actionBtn, { backgroundColor: "rgba(232,112,26,0.1)", borderColor: "rgba(232,112,26,0.25)" }]}
        >
          <Ionicons name="mic" size={20} color={ACCENT} />
          <Text style={[styles.actionBtnText, { color: ACCENT }]}>Start 5-Second Calibration</Text>
        </Pressable>
      )}
      <Text style={[styles.skipNote, { color: c.textTertiary }]}>
        You can skip this and calibrate later in Settings
      </Text>
    </View>
  );
}

function LocationStep({ c, t, granted, onRequest }: {
  c: any; t: Record<string, string>; granted: boolean | null; onRequest: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={[styles.heroEmoji, { backgroundColor: "rgba(34,197,94,0.08)" }]}>
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
          style={[styles.actionBtn, { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.25)" }]}
        >
          <Ionicons name="location" size={20} color="#22C55E" />
          <Text style={[styles.actionBtnText, { color: "#22C55E" }]}>Allow Location Access</Text>
        </Pressable>
      )}
      {granted === false && (
        <View style={[styles.infoBox, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }]}>
          <Ionicons name="information-circle" size={18} color="#EF4444" />
          <Text style={[styles.infoText, { color: "#EF4444" }]}>
            Enable in Settings › MotoGuard › Location
          </Text>
        </View>
      )}
    </View>
  );
}

function LegalTextModal({ c, title, text, closeLabel, onClose }: {
  c: any; title: string; text: string; closeLabel: string; onClose: () => void;
}) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: c.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: c.separator }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
          <Pressable onPress={onClose} style={[styles.modalClose, { backgroundColor: c.backgroundTertiary }]}>
            <Text style={[styles.modalCloseText, { color: c.text }]}>{closeLabel}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.legalText, { color: c.textSecondary }]}>{text}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressBar: { height: 4, marginHorizontal: 20, marginTop: 16, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  content: { padding: 24, gap: 20, flexGrow: 1 },
  welcomeContent: { justifyContent: "center", alignItems: "center", flexGrow: 1 },
  welcomeStep: { alignItems: "center", gap: 20 },
  welcomeTitle: { fontSize: 30, fontFamily: "Inter_700Bold", textAlign: "center" },
  welcomeSub: { fontSize: 17, fontFamily: "Inter_400Regular", textAlign: "center" },
  logoCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  stepContainer: { gap: 18, alignItems: "center" },
  stepTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  stepDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 320 },
  heroEmoji: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", alignSelf: "stretch" },
  langCard: {
    width: "47%", borderRadius: 16, padding: 16, alignItems: "center", gap: 8,
    position: "relative",
  },
  langFlag: { fontSize: 32 },
  langName: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  langCheckMark: {
    position: "absolute", top: 8, right: 8, width: 20, height: 20,
    borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  checkboxGroup: { alignSelf: "stretch", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  checkSep: { height: 1, marginLeft: 46 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  checkLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  footnote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waveRow: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", height: 40 },
  waveDot: { width: 8, height: 8, borderRadius: 4 },
  skipNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  bottomRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  bottomRowCentered: { justifyContent: "center" },
  backBtn: { width: 50, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, paddingHorizontal: 24, borderRadius: 14,
  },
  nextText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", paddingTop: 12 },
  dot: { height: 8, borderRadius: 4 },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  modalClose: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  modalCloseText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalContent: { padding: 20 },
  legalText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
});
