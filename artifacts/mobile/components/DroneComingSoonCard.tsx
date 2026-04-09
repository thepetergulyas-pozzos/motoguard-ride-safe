import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useApp, STRINGS } from "@/context/AppContext";
import { logDroneInterest } from "@/constants/SheetsClient";

const ACCENT = "#E8701A";

const DRONE_POLL = {
  question: {
    hu: "Érdekel a drón funkció?",
    en: "Interested in the drone feature?",
    de: "Interessiert dich die Drohnen-Funktion?",
    es: "¿Te interesa la función de dron?",
    it: "Ti interessa la funzione drone?",
    pt: "Tens interesse na função drone?",
  },
  yes: {
    hu: "Igen, várom!",
    en: "Yes, I can't wait!",
    de: "Ja, ich freue mich!",
    es: "¡Sí, lo espero!",
    it: "Sì, non vedo l'ora!",
    pt: "Sim, mal posso esperar!",
  },
  no: {
    hu: "Nem igazán",
    en: "Not really",
    de: "Nicht wirklich",
    es: "No mucho",
    it: "Non molto",
    pt: "Não muito",
  },
  thankYes: {
    hu: "Köszönjük! Értesítünk ha elérhető.",
    en: "Thanks! We'll notify you when it's live.",
    de: "Danke! Wir benachrichtigen dich.",
    es: "¡Gracias! Te avisaremos cuando esté disponible.",
    it: "Grazie! Ti avviseremo quando sarà disponibile.",
    pt: "Obrigado! Notificaremos quando estiver disponível.",
  },
  thankNo: {
    hu: "Köszönjük a visszajelzást!",
    en: "Thanks for your feedback!",
    de: "Danke für dein Feedback!",
    es: "¡Gracias por tu opinión!",
    it: "Grazie per il tuo feedback!",
    pt: "Obrigado pelo teu feedback!",
  },
  comingSoon: {
    hu: "HAMAROSAN",
    en: "COMING SOON",
    de: "DEMNÄCHST",
    es: "PRÓXIMAMENTE",
    it: "PROSSIMAMENTE",
    pt: "EM BREVE",
  },
};

function get(obj: Record<string, string>, lang: string): string {
  return (obj as any)[lang] ?? obj.en;
}

export function DronePollCard() {
  const { c } = useTheme();
  const { settings } = useApp();
  const lang = settings.language;
  const tier = settings.subscription;

  const [loaded, setLoaded] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankText, setThankText] = useState("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("drone_interest_voted").then((v) => {
      setAlreadyVoted(!!v);
      setLoaded(true);
    });
  }, []);

  const handleVote = async (choice: "yes" | "no") => {
    await AsyncStorage.setItem("drone_interest_voted", choice);
    logDroneInterest(choice, lang, tier).catch(() => {});
    setThankText(choice === "yes" ? get(DRONE_POLL.thankYes, lang) : get(DRONE_POLL.thankNo, lang));
    setShowThankYou(true);
    setTimeout(() => setVisible(false), 2000);
  };

  if (!loaded || alreadyVoted || !visible) return null;

  return (
    <View style={[poll.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={poll.topRow}>
        <View style={[poll.iconCircle, { backgroundColor: `rgba(232,112,26,0.12)` }]}>
          <Text style={poll.droneEmoji}>🚁</Text>
        </View>
        <View style={[poll.badge, { backgroundColor: `rgba(232,112,26,0.15)` }]}>
          <Text style={[poll.badgeText, { color: ACCENT }]}>{get(DRONE_POLL.comingSoon, lang)}</Text>
        </View>
      </View>

      {showThankYou ? (
        <Text style={[poll.thankText, { color: ACCENT }]}>{thankText}</Text>
      ) : (
        <>
          <Text style={[poll.question, { color: c.text }]}>{get(DRONE_POLL.question, lang)}</Text>
          <View style={poll.btns}>
            <Pressable
              onPress={() => handleVote("yes")}
              style={({ pressed }) => [poll.btn, poll.btnYes, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={poll.btnYesText}>{get(DRONE_POLL.yes, lang)}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleVote("no")}
              style={({ pressed }) => [poll.btn, poll.btnNo, { borderColor: c.cardBorder, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[poll.btnNoText, { color: c.textSecondary }]}>{get(DRONE_POLL.no, lang)}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const poll = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  droneEmoji: { fontSize: 22 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  question: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  btns: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  btnYes: { backgroundColor: ACCENT },
  btnYesText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  btnNo: { backgroundColor: "transparent", borderWidth: 1 },
  btnNoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  thankText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    paddingVertical: 4,
  },
});

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
