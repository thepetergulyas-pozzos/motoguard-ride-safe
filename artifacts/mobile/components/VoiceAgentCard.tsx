import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { STRINGS, TIER_FEATURES, useApp } from "@/context/AppContext";
import { PaywallModal } from "@/components/ui/PaywallModal";
import { type VoiceStatus, type NoiseFilter } from "@/hooks/useVoiceAgent";

type Props = {
  status: VoiceStatus;
  noiseFilter: NoiseFilter;
  setNoiseFilter: (v: NoiseFilter) => void;
  lastResponse: string | null;
  canToggle: boolean;
  speed: number;
  onToggle: () => void;
  autoActivatedMessage?: string | null;
  clearAutoActivatedMessage?: () => void;
};

function WaveformBars({ active, color }: { active: boolean; color: string }) {
  const a0 = useRef(new Animated.Value(0.2)).current;
  const a1 = useRef(new Animated.Value(0.2)).current;
  const a2 = useRef(new Animated.Value(0.2)).current;
  const a3 = useRef(new Animated.Value(0.2)).current;
  const a4 = useRef(new Animated.Value(0.2)).current;
  const anims = [a0, a1, a2, a3, a4];

  useEffect(() => {
    if (active) {
      anims.forEach((anim, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 90),
            Animated.timing(anim, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.2, duration: 380, useNativeDriver: true }),
          ])
        ).start();
      });
    } else {
      anims.forEach((a) => { a.stopAnimation(); a.setValue(0.2); });
    }
  }, [active]);

  return (
    <View style={styles.wave}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={[styles.bar, { transform: [{ scaleY: anim }], backgroundColor: color }]} />
      ))}
    </View>
  );
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      <Ionicons name="information-circle" size={14} color="#FFF" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export function VoiceAgentCard({
  status, noiseFilter, setNoiseFilter, lastResponse,
  canToggle, speed, onToggle, autoActivatedMessage, clearAutoActivatedMessage,
}: Props) {
  const { c } = useTheme();
  const { settings } = useApp();
  const t = STRINGS[settings.language];
  const features = TIER_FEATURES[settings.subscription];
  const [showPaywall, setShowPaywall] = React.useState(false);
  const [speedWarning, setSpeedWarning] = React.useState(false);
  const [autoToast, setAutoToast] = React.useState<string | null>(null);

  const isActive = status === "active" || status === "speak";
  const isListening = status === "listening";

  const NOISE_LEVELS: { value: NoiseFilter; label: string }[] = [
    { value: 1, label: t.noiseFilterLow },
    { value: 2, label: t.noiseFilterMed },
    { value: 3, label: t.noiseFilterHigh },
  ];

  const statusColor =
    status === "off" ? c.textTertiary :
    status === "listening" ? "#F59E0B" :
    status === "active" ? c.tint :
    "#30AFF4";

  const statusLabel =
    status === "off" ? t.voiceOff :
    status === "listening" ? t.voiceListening :
    status === "active" ? t.voiceDetecting :
    t.voiceResponding;

  const handleTogglePress = useCallback(() => {
    if (canToggle) { onToggle(); }
    else { setSpeedWarning(true); }
  }, [canToggle, onToggle]);

  useEffect(() => {
    if (autoActivatedMessage) setAutoToast(autoActivatedMessage);
  }, [autoActivatedMessage]);

  if (!features.voiceAgent) {
    return (
      <>
        <Pressable
          onPress={() => setShowPaywall(true)}
          style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        >
          <View style={styles.row}>
            <View style={[styles.iconBg, { backgroundColor: c.backgroundTertiary }]}>
              <Ionicons name="mic" size={22} color={c.textTertiary} />
            </View>
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: c.text }]}>{t.voiceAgent}</Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>{t.voiceHandsFree}</Text>
            </View>
            <View style={[styles.lockBadge, { backgroundColor: `${c.tint}1F` }]}>
              <Ionicons name="lock-closed" size={14} color={c.tint} />
              <Text style={[styles.lockText, { color: c.tint }]}>Pro</Text>
            </View>
          </View>
          <View style={[styles.proRow, { backgroundColor: c.tint }]}>
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={styles.proLabel}>{t.voiceUpgradePro}</Text>
          </View>
        </Pressable>
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName={t.voiceAgent} />
      </>
    );
  }

  return (
    <View style={[styles.card, {
      backgroundColor: status !== "off" ? `${c.tint}0F` : c.card,
      borderColor: status !== "off" ? `${c.tint}40` : c.cardBorder,
    }]}>
      <View style={styles.row}>
        <View style={[styles.iconBg, { backgroundColor: status !== "off" ? `${c.tint}26` : c.backgroundTertiary }]}>
          <Ionicons
            name={status === "speak" ? "volume-medium" : status === "active" ? "radio" : "mic"}
            size={22}
            color={status !== "off" ? c.tint : c.textSecondary}
          />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: c.text }]}>{t.voiceAgent}</Text>
          <Text style={[styles.sub, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        <Pressable
          onPress={handleTogglePress}
          style={[
            styles.toggleBtn,
            { backgroundColor: status !== "off" ? c.tint : c.backgroundTertiary, opacity: !canToggle ? 0.4 : 1 },
          ]}
        >
          <Ionicons
            name={status !== "off" ? "pause" : "play"}
            size={14}
            color={status !== "off" ? "#FFF" : c.textSecondary}
          />
          {!canToggle && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={9} color={status !== "off" ? "#FFF" : c.textTertiary} />
            </View>
          )}
        </Pressable>
      </View>

      {(isListening || isActive) && (
        <WaveformBars active={isActive} color={c.tint} />
      )}

      {lastResponse && (
        <View style={[styles.responseBox, { backgroundColor: c.backgroundTertiary }]}>
          <Ionicons name="chatbubble-ellipses" size={13} color={c.tint} />
          <Text style={[styles.responseText, { color: c.text }]}>{lastResponse}</Text>
        </View>
      )}

      {!canToggle && (
        <View style={[styles.autoInfo, { backgroundColor: c.backgroundTertiary }]}>
          <Ionicons name="speedometer-outline" size={14} color={c.textSecondary} />
          <Text style={[styles.autoText, { color: c.textSecondary }]}>
            {t.voiceAutoManaged} · {Math.round(speed)} km/h
          </Text>
        </View>
      )}

      <View style={styles.noisePicker}>
        <Ionicons name="options-outline" size={13} color={c.textTertiary} />
        <Text style={[styles.noiseLabel, { color: c.textTertiary }]}>{t.noiseFilter}</Text>
        <View style={styles.noiseOptions}>
          {NOISE_LEVELS.map(({ value, label }) => {
            const active = noiseFilter === value;
            return (
              <Pressable
                key={value}
                onPress={() => setNoiseFilter(value)}
                style={[styles.noiseBtn, {
                  backgroundColor: active ? c.tint : c.backgroundTertiary,
                  borderColor: active ? c.tint : c.cardBorder,
                }]}
              >
                <Text style={[styles.noiseBtnText, { color: active ? "#FFF" : c.textSecondary }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {speedWarning && (
        <Toast message={t.voiceAutoManaged} onDismiss={() => setSpeedWarning(false)} />
      )}
      {autoToast && (
        <Toast
          message={autoToast}
          onDismiss={() => { setAutoToast(null); clearAutoActivatedMessage?.(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1.5, padding: 18, marginHorizontal: 20, gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBg: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  textBlock: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  lockText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  proRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  proLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  toggleBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  lockOverlay: {
    position: "absolute", bottom: 4, right: 4,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  wave: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, gap: 5 },
  bar: { width: 4, height: 28, borderRadius: 2 },
  responseBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12 },
  responseText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  autoInfo: { flexDirection: "row", alignItems: "center", gap: 7, padding: 10, borderRadius: 10 },
  autoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  noisePicker: { flexDirection: "row", alignItems: "center", gap: 8 },
  noiseLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noiseOptions: { flexDirection: "row", gap: 6, flex: 1 },
  noiseBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: "center", borderWidth: 1 },
  noiseBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(30,30,50,0.92)",
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
  },
  toastText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FFF", flex: 1 },
});
