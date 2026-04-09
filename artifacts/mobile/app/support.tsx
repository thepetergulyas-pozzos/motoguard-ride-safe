import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import {
  APP_VERSION,
  SUPPORT_EMAILS,
  APP_STORE_URL,
  PLAY_STORE_URL,
  RESPONSE_TIMES,
  SUPPORT_STRINGS,
  BUG_CATEGORIES,
  SAFETY_ISSUE_TYPES,
  DEFAULT_FEATURE_REQUESTS,
  FAQ_ITEMS,
  type FeatureRequest,
} from "@/constants/SupportConfig";
import { logSupportTicket, logFeatureVote } from "@/constants/SheetsClient";

type View = "main" | "bug" | "feature" | "safety" | "faq";

const ACCENT = "#E8701A";

export default function SupportScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useApp();
  const lang = settings.language;
  const s = SUPPORT_STRINGS[lang];
  const tier = settings.subscription;
  const rt = RESPONSE_TIMES[tier] ?? RESPONSE_TIMES.free;

  const [view, setView] = useState<View>("main");

  const handleRate = async () => {
    Haptics.selectionAsync();
    const url = Platform.OS === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    await Linking.openURL(url);
  };

  const handleContact = async () => {
    Haptics.selectionAsync();
    const subject = encodeURIComponent("MotoGuard Support Request");
    await Linking.openURL(`mailto:${SUPPORT_EMAILS.general}?subject=${subject}`);
  };

  const MENU = [
    { id: "bug", icon: "🐛", color: ACCENT, title: s.bugTitle, subtitle: s.bugSubtitle, onPress: () => setView("bug") },
    { id: "feature", icon: "💡", color: "#F59E0B", title: s.featureTitle, subtitle: s.featureSubtitle, onPress: () => setView("feature") },
    { id: "safety", icon: "🚨", color: "#EF4444", title: s.safetyTitle, subtitle: s.safetySubtitle, onPress: () => setView("safety"), badge: "PRIORITY" },
    { id: "faq", icon: "📖", color: "#3B82F6", title: s.faqTitle, subtitle: s.faqSubtitle, onPress: () => setView("faq") },
    { id: "rate", icon: "⭐", color: "#F59E0B", title: s.rateTitle, subtitle: s.rateSubtitle, onPress: handleRate },
    { id: "contact", icon: "📧", color: "#8B5CF6", title: s.contactTitle, subtitle: s.contactSubtitle, onPress: handleContact },
  ];

  const renderHeader = (title: string) => (
    <View style={[styles.header, { borderBottomColor: c.separator, paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => setView("main")} style={[styles.backBtn, { backgroundColor: c.backgroundTertiary }]}>
        <Ionicons name="chevron-back" size={20} color={c.text} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: c.text }]}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (view === "bug") return <BugReportView c={c} s={s} lang={lang} tier={tier} renderHeader={renderHeader} insets={insets} />;
  if (view === "feature") return <FeatureRequestView c={c} s={s} lang={lang} tier={tier} renderHeader={renderHeader} insets={insets} />;
  if (view === "safety") return <SafetyIssueView c={c} s={s} lang={lang} tier={tier} renderHeader={renderHeader} insets={insets} />;
  if (view === "faq") return <FAQView c={c} s={s} lang={lang} renderHeader={renderHeader} insets={insets} />;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.mainHeader, { paddingTop: insets.top + 16, borderBottomColor: c.separator }]}>
        <View style={styles.mainHeaderRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.backgroundTertiary }]}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </Pressable>
          <Text style={[styles.mainTitle, { color: c.text }]}>{s.title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={[styles.responseBadge, { backgroundColor: `${rt.color}18`, borderColor: `${rt.color}33` }]}>
          <View style={[styles.responseDot, { backgroundColor: rt.color }]} />
          <Text style={[styles.responseLabel, { color: c.textSecondary }]}>{s.responseTime}: </Text>
          <Text style={[styles.responseTime, { color: rt.color }]}>{rt.label}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.mainContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {MENU.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => { item.onPress(); Haptics.selectionAsync(); }}
            style={({ pressed }) => [
              styles.menuCard,
              { backgroundColor: c.card, borderColor: c.cardBorder, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            </View>
            <View style={styles.menuText}>
              <View style={styles.menuTitleRow}>
                <Text style={[styles.menuTitle, { color: c.text }]}>{item.title}</Text>
                {item.badge && (
                  <View style={[styles.priorityBadge, { backgroundColor: "#EF444420" }]}>
                    <Text style={[styles.priorityText, { color: "#EF4444" }]}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuSubtitle, { color: c.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function BugReportView({ c, s, lang, tier, renderHeader, insets }: any) {
  const categories = BUG_CATEGORIES[lang] ?? BUG_CATEGORIES.en;
  const [category, setCategory] = useState(categories[0]);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [showCatPicker, setShowCatPicker] = useState(false);

  const sendReport = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logSupportTicket("Bug", category, summary, description, lang, tier).catch(() => {});
    const subject = encodeURIComponent(`[MotoGuard Bug] ${category} – v${APP_VERSION}`);
    const body = encodeURIComponent(
      `Category: ${category}\nSummary: ${summary}\nDescription: ${description}\nWhen: ${when}\n\n--- Automatic Info ---\nApp Version: ${APP_VERSION}\nOS: ${Platform.OS} ${Platform.Version}\nSubscription: ${tier}\nLanguage: ${lang}`
    );
    await Linking.openURL(`mailto:${SUPPORT_EMAILS.general}?subject=${subject}&body=${body}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {renderHeader(s.bugTitle)}
      <ScrollView contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 24 }]}>
        <FormLabel c={c} label={s.bugCategory} />
        <Pressable
          onPress={() => setShowCatPicker(!showCatPicker)}
          style={[styles.picker, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        >
          <Text style={[styles.pickerText, { color: c.text }]}>{category}</Text>
          <Ionicons name={showCatPicker ? "chevron-up" : "chevron-down"} size={16} color={c.textSecondary} />
        </Pressable>
        {showCatPicker && (
          <View style={[styles.dropdownList, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            {categories.map((cat: string) => (
              <Pressable
                key={cat}
                onPress={() => { setCategory(cat); setShowCatPicker(false); Haptics.selectionAsync(); }}
                style={[styles.dropdownItem, { borderBottomColor: c.separator }]}
              >
                <Text style={[styles.dropdownItemText, { color: cat === category ? ACCENT : c.text }]}>{cat}</Text>
                {cat === category && <Ionicons name="checkmark" size={16} color={ACCENT} />}
              </Pressable>
            ))}
          </View>
        )}

        <FormLabel c={c} label={s.bugSummary} extra={`${100 - summary.length} ${s.charLeft}`} />
        <TextInput
          style={[styles.textInput, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
          placeholder={s.bugSummaryPlaceholder}
          placeholderTextColor={c.textTertiary}
          value={summary}
          onChangeText={(t) => setSummary(t.slice(0, 100))}
          maxLength={100}
        />

        <FormLabel c={c} label={s.bugDescription} extra={`${500 - description.length} ${s.charLeft}`} />
        <TextInput
          style={[styles.textArea, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
          placeholder={s.bugDescriptionPlaceholder}
          placeholderTextColor={c.textTertiary}
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 500))}
          multiline
          maxLength={500}
        />

        <FormLabel c={c} label={s.bugWhen} />
        <TextInput
          style={[styles.textInput, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
          placeholder={s.bugWhenPlaceholder}
          placeholderTextColor={c.textTertiary}
          value={when}
          onChangeText={setWhen}
        />

        <Pressable
          onPress={sendReport}
          style={[styles.sendBtn, { backgroundColor: ACCENT }]}
        >
          <Ionicons name="mail" size={18} color="#FFF" />
          <Text style={styles.sendBtnText}>{s.bugSend}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SafetyIssueView({ c, s, lang, tier, renderHeader, insets }: any) {
  const issueTypes = SAFETY_ISSUE_TYPES[lang] ?? SAFETY_ISSUE_TYPES.en;
  const [issueType, setIssueType] = useState(issueTypes[0]);
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const sendReport = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    logSupportTicket("Safety", issueType, "", description, lang, tier).catch(() => {});
    const subject = encodeURIComponent(`[SAFETY CRITICAL] ${issueType} – v${APP_VERSION}`);
    const body = encodeURIComponent(
      `SAFETY ISSUE REPORT – PRIORITY\n\nIssue Type: ${issueType}\nWhen: ${when}\nDescription: ${description}\n\n--- Automatic Info ---\nApp Version: ${APP_VERSION}\nOS: ${Platform.OS} ${Platform.Version}\nSubscription: ${tier}\nLanguage: ${lang}`
    );
    await Linking.openURL(`mailto:${SUPPORT_EMAILS.safety}?subject=${subject}&body=${body}`);
  };

  const warningText = {
    hu: "⚠️ Ez az opció kizárólag az app biztonsági funkcióival kapcsolatos kritikus hibák bejelentésére szolgál. Valódi vészhelyzetben hívd a 112-t.",
    en: "⚠️ This option is exclusively for reporting critical bugs related to the app's safety functions (accident detection, emergency alerts). In a real emergency, call 112 or your local emergency number.",
    de: "⚠️ Diese Option dient ausschließlich zur Meldung kritischer Fehler bei den Sicherheitsfunktionen der App. Im Notfall wähle 112.",
    es: "⚠️ Esta opción es exclusivamente para reportar errores críticos relacionados con las funciones de seguridad de la app. En una emergencia real, llama al 112.",
    it: "⚠️ Questa opzione è esclusivamente per segnalare bug critici relativi alle funzioni di sicurezza dell'app. In un'emergenza reale, chiama il 112.",
    pt: "⚠️ Esta opção destina-se exclusivamente a reportar bugs críticos relacionados com as funções de segurança da app. Numa emergência real, liga para o 112.",
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {renderHeader(s.safetyTitle)}
      <ScrollView contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.safetyWarningBox, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)" }]}>
          <Text style={[styles.safetyWarningText, { color: "#DC2626" }]}>
            {(warningText as any)[lang] ?? warningText.en}
          </Text>
        </View>

        <FormLabel c={c} label={s.safetyIssueType} />
        <Pressable
          onPress={() => setShowPicker(!showPicker)}
          style={[styles.picker, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        >
          <Text style={[styles.pickerText, { color: c.text }]}>{issueType}</Text>
          <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={16} color={c.textSecondary} />
        </Pressable>
        {showPicker && (
          <View style={[styles.dropdownList, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            {issueTypes.map((type: string) => (
              <Pressable
                key={type}
                onPress={() => { setIssueType(type); setShowPicker(false); Haptics.selectionAsync(); }}
                style={[styles.dropdownItem, { borderBottomColor: c.separator }]}
              >
                <Text style={[styles.dropdownItemText, { color: type === issueType ? "#EF4444" : c.text }]}>{type}</Text>
                {type === issueType && <Ionicons name="checkmark" size={16} color="#EF4444" />}
              </Pressable>
            ))}
          </View>
        )}

        <FormLabel c={c} label={s.safetyWhen} />
        <TextInput
          style={[styles.textInput, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
          placeholder={s.bugWhenPlaceholder}
          placeholderTextColor={c.textTertiary}
          value={when}
          onChangeText={setWhen}
        />

        <FormLabel c={c} label={s.safetyDescription} extra={`${500 - description.length} ${s.charLeft}`} />
        <TextInput
          style={[styles.textArea, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
          placeholder={s.safetyDescriptionPlaceholder}
          placeholderTextColor={c.textTertiary}
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 500))}
          multiline
          maxLength={500}
        />

        <Pressable onPress={sendReport} style={[styles.sendBtn, { backgroundColor: "#EF4444" }]}>
          <Ionicons name="warning" size={18} color="#FFF" />
          <Text style={styles.sendBtnText}>{s.safetySend}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function FeatureRequestView({ c, s, lang, tier, renderHeader, insets }: any) {
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEFAULT_FEATURE_REQUESTS.map((f) => [f.id, f.votes]))
  );
  const [customIdea, setCustomIdea] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("feature_votes").then((stored) => {
      if (stored) setVotes(JSON.parse(stored));
    });
  }, []);

  const toggleVote = async (featureId: string) => {
    Haptics.selectionAsync();
    const wasVoted = !!votes[featureId];
    const action = wasVoted ? "unvote" : "vote";
    const feature = DEFAULT_FEATURE_REQUESTS.find((f) => f.id === featureId);
    const featureName = (feature?.title as any)?.[lang] ?? feature?.title?.en ?? featureId;
    logFeatureVote(featureId, featureName, action, lang, tier).catch(() => {});
    const newVotes = { ...votes };
    const delta = newVotes[featureId] ? -1 : 1;
    if (newVotes[featureId]) delete newVotes[featureId];
    else newVotes[featureId] = true;
    setVotes(newVotes);
    setLocalCounts((prev) => ({ ...prev, [featureId]: (prev[featureId] ?? 0) + delta }));
    await AsyncStorage.setItem("feature_votes", JSON.stringify(newVotes));
  };

  const submitCustomIdea = async () => {
    if (!customIdea.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const subject = encodeURIComponent("[MotoGuard] Feature Request");
    const body = encodeURIComponent(
      `Feature Idea: ${customIdea}\n\n--- User Info ---\nSubscription: ${tier}\nLanguage: ${lang}\nApp Version: ${APP_VERSION}`
    );
    await Linking.openURL(`mailto:${SUPPORT_EMAILS.features}?subject=${subject}&body=${body}`);
    setCustomIdea("");
  };

  const statusColor = (status: FeatureRequest["status"]) =>
    status === "completed" ? "#22C55E" : status === "in_progress" ? "#F59E0B" : "#6B7280";

  const statusLabel = (status: FeatureRequest["status"]) =>
    status === "completed" ? s.featureStatusCompleted :
    status === "in_progress" ? s.featureStatusInProgress : s.featureStatusPlanned;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {renderHeader(s.featureTitle)}
      <ScrollView contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {DEFAULT_FEATURE_REQUESTS.map((feature) => {
          const hasVoted = !!votes[feature.id];
          const count = localCounts[feature.id] ?? feature.votes;
          const isHighlighted = feature.status !== "planned";
          return (
            <View
              key={feature.id}
              style={[
                styles.featureCard,
                {
                  backgroundColor: isHighlighted ? `${statusColor(feature.status)}08` : c.card,
                  borderColor: isHighlighted ? `${statusColor(feature.status)}30` : c.cardBorder,
                },
              ]}
            >
              <View style={styles.featureTop}>
                <Text style={{ fontSize: 28 }}>{feature.icon}</Text>
                <View style={styles.featureMeta}>
                  <View style={styles.featureTitleRow}>
                    <Text style={[styles.featureTitle, { color: c.text }]}>
                      {(feature.title as any)[lang] ?? feature.title.en}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor(feature.status)}18` }]}>
                      <Text style={[styles.statusText, { color: statusColor(feature.status) }]}>
                        {statusLabel(feature.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.featureDesc, { color: c.textSecondary }]}>
                    {(feature.description as any)[lang] ?? feature.description.en}
                  </Text>
                </View>
              </View>
              <View style={styles.featureBottom}>
                <View style={[styles.voteCount, { backgroundColor: c.backgroundTertiary }]}>
                  <Ionicons name="arrow-up" size={14} color={hasVoted ? ACCENT : c.textSecondary} />
                  <Text style={[styles.voteNumber, { color: hasVoted ? ACCENT : c.textSecondary }]}>{count}</Text>
                </View>
                <Pressable
                  onPress={() => toggleVote(feature.id)}
                  style={[styles.voteBtn, { backgroundColor: hasVoted ? `${ACCENT}20` : c.backgroundTertiary, borderColor: hasVoted ? ACCENT : c.cardBorder }]}
                >
                  <Text style={[styles.voteBtnText, { color: hasVoted ? ACCENT : c.textSecondary }]}>
                    {hasVoted ? s.featureVoted : s.featureVote}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={[styles.customIdeaCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.customIdeaTitle, { color: c.text }]}>💡 {s.featureCustomTitle}</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: c.background, borderColor: c.cardBorder, color: c.text }]}
            placeholder={s.featureCustomPlaceholder}
            placeholderTextColor={c.textTertiary}
            value={customIdea}
            onChangeText={setCustomIdea}
            multiline
          />
          <Pressable
            onPress={submitCustomIdea}
            style={[styles.sendBtn, { backgroundColor: "#F59E0B" }]}
          >
            <Ionicons name="bulb" size={18} color="#FFF" />
            <Text style={styles.sendBtnText}>{s.featureCustomSend}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function FAQView({ c, s, lang, renderHeader, insets }: any) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {renderHeader(s.faqTitle)}
      <ScrollView contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 24 }]}>
        {FAQ_ITEMS.map((item) => {
          const isOpen = expanded === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => { setExpanded(isOpen ? null : item.id); Haptics.selectionAsync(); }}
              style={[styles.faqCard, { backgroundColor: c.card, borderColor: isOpen ? ACCENT : c.cardBorder }]}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: c.text, flex: 1 }]}>
                  {(item.question as any)[lang] ?? item.question.en}
                </Text>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={isOpen ? ACCENT : c.textSecondary} />
              </View>
              {isOpen && (
                <Text style={[styles.faqAnswer, { color: c.textSecondary }]}>
                  {(item.answer as any)[lang] ?? item.answer.en}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FormLabel({ c, label, extra }: { c: any; label: string; extra?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      {extra && <Text style={[styles.labelExtra, { color: c.textTertiary }]}>{extra}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mainHeader: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  mainHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mainTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  responseBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  responseDot: { width: 6, height: 6, borderRadius: 3 },
  responseLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  responseTime: { fontSize: 13, fontFamily: "Inter_700Bold" },
  mainContent: { padding: 16, gap: 10 },
  menuCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  menuIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1, gap: 2 },
  menuTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  formContent: { padding: 16, gap: 10 },
  safetyWarningBox: { borderRadius: 14, borderWidth: 1.5, padding: 14 },
  safetyWarningText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  label: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  labelExtra: { fontSize: 11, fontFamily: "Inter_400Regular" },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  pickerText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  dropdownList: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: -6 },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 13, borderBottomWidth: 1 },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  textInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100, textAlignVertical: "top" },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14, marginTop: 8 },
  sendBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  featureCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  featureTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  featureMeta: { flex: 1, gap: 4 },
  featureTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, flexWrap: "wrap" },
  featureTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  featureDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  featureBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  voteCount: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  voteNumber: { fontSize: 14, fontFamily: "Inter_700Bold" },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  voteBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  customIdeaCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  customIdeaTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  faqCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 0 },
  faqHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  faqQuestion: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  faqAnswer: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 12 },
});
