import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STRINGS,
  TIER_FEATURES,
  type ColorSchemePreference,
  type Language,
  useApp,
} from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { PaywallModal } from "@/components/ui/PaywallModal";
import { TERMS_OF_SERVICE, PRIVACY_POLICY, getLegalText } from "@/constants/LegalTexts";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

function AppearancePicker() {
  const { c } = useTheme();
  const { settings, updateSettings } = useApp();
  const t = STRINGS[settings.language];

  const APPEARANCE_OPTIONS: { value: ColorSchemePreference; icon: string; label: string }[] = [
    { value: "light", icon: "sunny", label: t.appearanceLight },
    { value: "system", icon: "phone-portrait", label: t.appearanceAuto },
    { value: "dark", icon: "moon", label: t.appearanceDark },
  ];

  return (
    <View style={[styles.appearancePicker, { backgroundColor: c.backgroundTertiary, borderColor: c.cardBorder }]}>
      {APPEARANCE_OPTIONS.map(({ value, icon, label }) => {
        const selected = settings.colorScheme === value;
        return (
          <Pressable
            key={value}
            onPress={() => {
              updateSettings({ colorScheme: value });
              Haptics.selectionAsync();
            }}
            style={({ pressed }) => [
              styles.appearanceOption,
              {
                backgroundColor: selected ? c.card : "transparent",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name={icon as any} size={18} color={selected ? c.tint : c.textSecondary} />
            <Text style={[
              styles.appearanceLabel,
              { color: selected ? c.tint : c.textSecondary, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" },
            ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingsRow({
  icon, label, value, onPress, locked, danger,
}: {
  icon: string; label: string; value?: string;
  onPress?: () => void; locked?: boolean; danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.cardBorder, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "rgba(255,59,48,0.1)" : `${c.tint}18` }]}>
        <Ionicons name={icon as any} size={18} color={danger ? c.danger : c.tint} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? c.danger : c.text }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: c.textSecondary }]}>{value}</Text>}
        {locked && <Ionicons name="lock-closed" size={14} color={c.textTertiary} />}
        {onPress && !locked && <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />}
      </View>
    </Pressable>
  );
}

function TierBadge({ tier, t }: { tier: keyof typeof TIER_FEATURES; t: Record<string, string> }) {
  const { c } = useTheme();
  const features = TIER_FEATURES[tier];
  const tierColors: Record<string, string> = {
    free: "#888",
    basic: "#5E9BF5",
    pro: c.tint,
    pro_drone: "#AF52DE",
    lifetime: "#FF9F0A",
  };
  const color = tierColors[tier] ?? c.tint;

  return (
    <View style={[styles.tierCard, { backgroundColor: `${color}18`, borderColor: `${color}33` }]}>
      <View style={styles.tierHeader}>
        <Ionicons name="shield" size={24} color={color} />
        <View>
          <Text style={[styles.tierName, { color }]}>{features.label}</Text>
          {features.price && (
            <Text style={[styles.tierPrice, { color: c.textSecondary }]}>{features.price}</Text>
          )}
        </View>
        {tier !== "free" && (
          <View style={[styles.activeBadge, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.activeText, { color }]}>{t.activeTier}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { settings, updateSettings } = useApp();
  const t = STRINGS[settings.language];
  const features = TIER_FEATURES[settings.subscription];
  const isWeb = Platform.OS === "web";
  const paddingTop = isWeb ? Math.max(insets.top, 67) : insets.top;

  const [showPaywall, setShowPaywall] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  const handleExportData = async () => {
    try {
      const export_data = {
        exportedAt: new Date().toISOString(),
        rides: settings.rideLogs,
        emergencyContacts: settings.emergencyContacts,
        language: settings.language,
        subscription: settings.subscription,
      };
      await Share.share({
        message: JSON.stringify(export_data, null, 2),
        title: "MotoGuard Data Export",
      });
    } catch {
      Alert.alert("Export Failed", "Unable to export data. Please try again.");
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      t.deleteDataTitle,
      t.deleteDataMsg,
      [
        { text: t.cancel ?? "Cancel", style: "cancel" },
        {
          text: t.deleteEverythingBtn,
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            updateSettings({
              rideLogs: [],
              emergencyContacts: [],
              onboardingComplete: false,
              legalAccepted: false,
              legalAcceptedVersion: "",
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleLangSelect = (lang: Language) => {
    if (!features.multilang && lang !== "en") {
      setShowLangPicker(false);
      setShowPaywall(true);
      return;
    }
    updateSettings({ language: lang });
    setShowLangPicker(false);
    Haptics.selectionAsync();
  };

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
      <Text style={[styles.pageTitle, { color: c.text }]}>{t.profile}</Text>

      <TierBadge tier={settings.subscription} t={t} />

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionAppearance}</Text>
        <View style={[styles.group, { borderColor: c.cardBorder }]}>
          <View style={[styles.row, { backgroundColor: c.card }]}>
            <View style={[styles.rowIcon, { backgroundColor: `${c.tint}18` }]}>
              <Ionicons name="contrast" size={18} color={c.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: c.text }]}>{t.displayMode}</Text>
              <Text style={[styles.rowSub, { color: c.textSecondary }]}>{t.displayModeDesc}</Text>
            </View>
          </View>
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <View style={[styles.row, { backgroundColor: c.card, paddingVertical: 12 }]}>
            <AppearancePicker />
          </View>
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.subscription.toUpperCase()}</Text>
        <View style={[styles.group, { borderColor: c.cardBorder }]}>
          <SettingsRow
            icon="star"
            label={t.subscription}
            value={TIER_FEATURES[settings.subscription].label}
            onPress={() => setShowPaywall(true)}
          />
        </View>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionPreferences}</Text>
        <View style={[styles.group, { borderColor: c.cardBorder }]}>
          <SettingsRow
            icon="language"
            label={t.language}
            value={LANGUAGES.find((l) => l.code === settings.language)?.label}
            onPress={() => setShowLangPicker(true)}
          />
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionFeatures}</Text>
        <View style={[styles.group, { borderColor: c.cardBorder }]}>
          <SettingsRow
            icon="shield-checkmark"
            label={t.accidentDetection}
            value={settings.accidentDetectionEnabled ? t.onLabel : t.offLabel}
          />
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <SettingsRow
            icon="call"
            label={t.emergencyCallLabel}
            value={features.emergencyCall ? t.enabled : t.locked}
            locked={!features.emergencyCall}
            onPress={!features.emergencyCall ? () => setShowPaywall(true) : undefined}
          />
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <SettingsRow
            icon="mic"
            label={t.voiceAgent}
            value={features.voiceAgent ? t.enabled : t.locked}
            locked={!features.voiceAgent}
            onPress={!features.voiceAgent ? () => setShowPaywall(true) : undefined}
          />
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <SettingsRow
            icon="airplane"
            label={t.droneControl}
            value={features.drone ? t.comingSoon : t.locked}
            locked={!features.drone}
            onPress={!features.drone ? () => setShowPaywall(true) : undefined}
          />
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <SettingsRow
            icon="download"
            label={t.exportLabel}
            value={features.export ? t.enabled : t.locked}
            locked={!features.export}
            onPress={!features.export ? () => setShowPaywall(true) : undefined}
          />
        </View>
      </View>

      {/* Privacy & Legal */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionPrivacyLegal}</Text>
        <View style={styles.privacyInfoRow}>
          <View style={[styles.privacyInfoCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Ionicons name="phone-portrait" size={20} color={c.tint} />
            <Text style={[styles.privacyInfoTitle, { color: c.text }]}>{t.onDeviceTitle}</Text>
            <Text style={[styles.privacyInfoDesc, { color: c.textSecondary }]}>{t.onDeviceDesc}</Text>
          </View>
          <View style={[styles.privacyInfoCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Ionicons name="eye-off" size={20} color={c.tint} />
            <Text style={[styles.privacyInfoTitle, { color: c.text }]}>{t.noTrackingTitle}</Text>
            <Text style={[styles.privacyInfoDesc, { color: c.textSecondary }]}>{t.noTrackingDesc}</Text>
          </View>
        </View>
        <View style={[styles.group, { borderColor: c.cardBorder }]}>
          <SettingsRow
            icon="cloud-download"
            label={t.exportData}
            value={t.exportDataDesc}
            onPress={handleExportData}
          />
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <SettingsRow
            icon="document-text"
            label={t.termsOfService}
            onPress={() => setLegalModal("terms")}
          />
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <SettingsRow
            icon="shield-checkmark"
            label={t.privacyLabel ?? "Privacy Policy"}
            onPress={() => setLegalModal("privacy")}
          />
          <View style={[styles.separator, { backgroundColor: c.separator }]} />
          <SettingsRow
            icon="trash"
            label={t.deleteAllData}
            danger
            onPress={handleDeleteAllData}
          />
        </View>
        <Text style={[styles.legalVersionNote, { color: c.textTertiary }]}>
          {t.legalVersion} {TERMS_OF_SERVICE.version} · {TERMS_OF_SERVICE.lastUpdated}
        </Text>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.supportLabel.toUpperCase()}</Text>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/support"); }}
          style={({ pressed }) => [
            styles.group,
            { borderColor: c.cardBorder, flexDirection: "row", alignItems: "center", padding: 16, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.rowIcon, { backgroundColor: "rgba(232,112,26,0.12)" }]}>
            <Ionicons name="help-buoy" size={18} color="#E8701A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: c.text }]}>{t.supportLabel}</Text>
            <Text style={[styles.rowValue, { color: c.textSecondary }]}>Bug reports · FAQ · Feature requests</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
        </Pressable>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t.sectionAbout}</Text>
        <View style={[styles.group, { borderColor: c.cardBorder }]}>
          <SettingsRow icon="information-circle" label={t.versionLabel} value="1.0.0" />
        </View>
      </View>

      {/* Language Picker Overlay */}
      {showLangPicker && (
        <View style={styles.langOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowLangPicker(false)} />
          <View style={[styles.langPicker, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.langTitle, { color: c.text }]}>{t.language}</Text>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => handleLangSelect(lang.code)}
                style={({ pressed }) => [
                  styles.langOption,
                  {
                    backgroundColor: settings.language === lang.code ? `${c.tint}22` : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, { color: c.text }]}>{lang.label}</Text>
                {settings.language === lang.code && <Ionicons name="checkmark" size={18} color={c.tint} />}
                {!features.multilang && lang.code !== "en" && (
                  <Ionicons name="lock-closed" size={14} color={c.textTertiary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />

      {legalModal && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalRoot, { backgroundColor: c.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.separator }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>
                {legalModal === "terms" ? t.termsOfService : t.privacyLabel ?? "Privacy Policy"}
              </Text>
              <Pressable
                onPress={() => setLegalModal(null)}
                style={[styles.modalClose, { backgroundColor: c.backgroundTertiary }]}
              >
                <Text style={[styles.modalCloseText, { color: c.text }]}>{t.closeBtn}</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={[styles.legalText, { color: c.textSecondary }]}>
                {legalModal === "terms"
                  ? getLegalText(TERMS_OF_SERVICE, settings.language)
                  : getLegalText(PRIVACY_POLICY, settings.language)}
              </Text>
            </ScrollView>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 8 },
  pageTitle: { fontSize: 30, fontFamily: "Inter_700Bold", marginBottom: 4 },
  tierCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8 },
  tierHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tierPrice: { fontSize: 12, fontFamily: "Inter_400Regular" },
  activeBadge: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  activeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { gap: 6 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5, paddingHorizontal: 4 },
  group: { borderRadius: 14, overflow: "hidden", borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  separator: { height: 1, marginLeft: 60 },
  appearancePicker: {
    flex: 1, flexDirection: "row", borderRadius: 10, padding: 3,
    borderWidth: 1, gap: 2,
  },
  appearanceOption: {
    flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center",
    paddingVertical: 8, borderRadius: 8, gap: 4,
  },
  appearanceLabel: { fontSize: 11 },
  langOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  langPicker: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, gap: 4 },
  langTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  langOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium" },
  privacyInfoRow: { flexDirection: "row", gap: 10 },
  privacyInfoCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  privacyInfoTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  privacyInfoDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  legalVersionNote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingTop: 4 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  modalClose: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  modalCloseText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalContent: { padding: 20 },
  legalText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
});
