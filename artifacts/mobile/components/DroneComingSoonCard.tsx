import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useApp, STRINGS } from "@/context/AppContext";
import { logDroneInterest } from "@/constants/SheetsClient";

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
    pt: "Não molto",
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
};

export function DroneInterestPoll({ lang, tier }: { lang: string; tier: string }) {
  const { c } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankText, setThankText] = useState("");
  const [visible, setVisible] = useState(true);

  const get = (obj: Record<string, string>) => (obj as any)[lang] ?? obj.en;

  useEffect(() => {
    AsyncStorage.getItem("drone_interest_voted").then((v) => {
      setAlreadyVoted(!!v);
      setLoaded(true);
    });
  }, []);

  const handleVote = async (choice: "yes" | "no") => {
    await AsyncStorage.setItem("drone_interest_voted", choice);
    logDroneInterest(choice, lang, tier).catch(() => {});
    setThankText(choice === "yes" ? get(DRONE_POLL.thankYes) : get(DRONE_POLL.thankNo));
    setShowThankYou(true);
    setTimeout(() => setVisible(false), 2000);
  };

  if (!loaded || alreadyVoted || !visible) return null;

  return (
    <View style={[pollStyles.card, { backgroundColor: "rgba(175,82,222,0.06)", borderColor: "rgba(175,82,222,0.2)" }]}>
      {showThankYou ? (
        <Text style={pollStyles.thankText}>{thankText}</Text>
      ) : (
        <>
          <Text style={[pollStyles.question, { color: c.text }]}>{get(DRONE_POLL.question)}</Text>
          <View style={pollStyles.btns}>
            <Pressable
              onPress={() => handleVote("yes")}
              style={({ pressed }) => [
                pollStyles.btn,
                { backgroundColor: "rgba(175,82,222,0.15)", borderColor: "rgba(175,82,222,0.5)", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[pollStyles.btnText, { color: "#AF52DE" }]}>{get(DRONE_POLL.yes)}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleVote("no")}
              style={({ pressed }) => [
                pollStyles.btn,
                { backgroundColor: c.backgroundTertiary, borderColor: c.cardBorder, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[pollStyles.btnText, { color: c.textSecondary }]}>{get(DRONE_POLL.no)}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const pollStyles = StyleSheet.create({
  card: { marginTop: 10, borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  question: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  btns: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  thankText: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center", color: "#AF52DE" },
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

      <DroneInterestPoll lang={settings.language} tier={settings.subscription} />
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
