import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useApp, TIER_FEATURES, type SubscriptionTier } from "@/context/AppContext";
import { useSubscription } from "@/lib/revenuecat";
import { Button } from "./Button";
import { logAppEvent } from "@/constants/SheetsClient";
import { DroneInterestPoll } from "@/components/DroneComingSoonCard";

type Props = { visible: boolean; onClose: () => void; featureName?: string };

type PlanMeta = {
  color: string;
  icon: string;
  tier: SubscriptionTier;
  entitlement: string;
  isLifetime?: boolean;
};

const PLAN_META: Record<string, PlanMeta> = {
  basic: { color: "#5E9BF5", icon: "shield-half", tier: "basic", entitlement: "basic" },
  pro: { color: "#E8701A", icon: "shield", tier: "pro", entitlement: "pro" },
  pro_drone: { color: "#AF52DE", icon: "airplane", tier: "pro_drone", entitlement: "pro_drone" },
};

const LIFETIME_META: PlanMeta = {
  color: "#FF9F0A",
  icon: "infinite",
  tier: "lifetime",
  entitlement: "lifetime",
  isLifetime: true,
};

export function PaywallModal({ visible, onClose, featureName }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const { offerings, purchase, isPurchasing, isConfigured } = useSubscription();

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmTier, setConfirmTier] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      logAppEvent("paywall_opened", settings.language, settings.subscription, featureName ?? "").catch(() => {});
    }
  }, [visible]);

  const handleSelect = async (offeringKey: string, pkg: any) => {
    const meta = offeringKey === "lifetime" ? LIFETIME_META : PLAN_META[offeringKey];
    if (!meta) return;

    if (!isConfigured) {
      updateSettings({ subscription: meta.tier });
      logAppEvent("subscription_purchased", settings.language, meta.tier, meta.tier).catch(() => {});
      onClose();
      return;
    }

    if (__DEV__) {
      setConfirmTier(offeringKey);
      return;
    }

    try {
      setPurchasing(offeringKey);
      await purchase(pkg);
      updateSettings({ subscription: meta.tier });
      logAppEvent("subscription_purchased", settings.language, meta.tier, meta.tier).catch(() => {});
      onClose();
    } catch (e: any) {
      if (!e?.userCancelled) console.error("Purchase error:", e);
    } finally {
      setPurchasing(null);
    }
  };

  const handleDevConfirm = async (offeringKey: string, pkg: any) => {
    setConfirmTier(null);
    const meta = offeringKey === "lifetime" ? LIFETIME_META : PLAN_META[offeringKey];
    if (!meta) return;
    try {
      setPurchasing(offeringKey);
      await purchase(pkg);
      updateSettings({ subscription: meta.tier });
      logAppEvent("subscription_purchased", settings.language, meta.tier, meta.tier).catch(() => {});
      onClose();
    } catch (e: any) {
      if (!e?.userCancelled) console.error("Purchase error:", e);
    } finally {
      setPurchasing(null);
    }
  };

  const getPriceForKey = (key: string) => {
    const offering = offerings?.all?.[key];
    const pkg = offering?.availablePackages?.[0];
    return pkg?.product.priceString ?? null;
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: c.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: c.textTertiary }]} />

          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: "rgba(232,112,26,0.15)" }]}>
              <Ionicons name="star" size={28} color="#E8701A" />
            </View>
            <Text style={[styles.title, { color: c.text }]}>Unlock Premium</Text>
            {featureName ? (
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>{featureName} requires a paid plan</Text>
            ) : (
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>Choose the plan that fits your ride</Text>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.plans} showsVerticalScrollIndicator={false}>
            {/* Lifetime – best value card */}
            <LifetimeCard
              isSelected={settings.subscription === "lifetime"}
              isBuying={purchasing === "lifetime"}
              price={getPriceForKey("lifetime") ?? "$39.99"}
              c={c}
              onSelect={() => handleSelect("lifetime", offerings?.all?.["lifetime"]?.availablePackages?.[0])}
            />

            {/* Monthly plans */}
            {(["basic", "pro", "pro_drone"] as const).map((key) => {
              const meta = PLAN_META[key];
              const offering = offerings?.all?.[key];
              const pkg = offering?.availablePackages?.[0];
              const price = getPriceForKey(key) ?? TIER_FEATURES[meta.tier].price ?? "—";
              const features = TIER_FEATURES[meta.tier];
              const isSelected = settings.subscription === meta.tier;
              const isBuying = purchasing === key;

              return (
                <PlanCard
                  key={key}
                  offeringKey={key}
                  meta={meta}
                  isSelected={isSelected}
                  isBuying={isBuying}
                  price={price}
                  features={features}
                  c={c}
                  onSelect={() => handleSelect(key, pkg)}
                />
              );
            })}

            {/* Drone Interest Poll – shown for Free / Basic / Pro users */}
            {settings.subscription !== "pro_drone" && settings.subscription !== "lifetime" && (
              <DroneInterestPoll lang={settings.language} tier={settings.subscription} />
            )}
          </ScrollView>

          <Button label="Maybe Later" onPress={onClose} variant="ghost" style={{ marginTop: 8, marginHorizontal: 20 }} />
        </View>
      </Modal>

      {confirmTier && (() => {
        const meta = confirmTier === "lifetime" ? LIFETIME_META : PLAN_META[confirmTier];
        const offering = offerings?.all?.[confirmTier];
        const pkg = offering?.availablePackages?.[0];
        const features = TIER_FEATURES[meta?.tier ?? "basic"];
        const price = pkg?.product.priceString ?? features.price ?? "—";
        const isLifetime = confirmTier === "lifetime";

        return (
          <Modal visible animationType="fade" transparent onRequestClose={() => setConfirmTier(null)}>
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
                <Ionicons name="storefront" size={32} color="#E8701A" />
                <Text style={[styles.confirmTitle, { color: c.text }]}>Confirm Test Purchase</Text>
                <Text style={[styles.confirmSub, { color: c.textSecondary }]}>
                  This is a test store purchase. You will not be charged.{"\n"}
                  {features.label} · {price}{isLifetime ? " (one-time)" : "/mo"}
                </Text>
                <View style={styles.confirmBtns}>
                  <Pressable
                    onPress={() => setConfirmTier(null)}
                    style={[styles.confirmBtn, { backgroundColor: c.backgroundTertiary }]}
                  >
                    <Text style={[styles.confirmBtnText, { color: c.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDevConfirm(confirmTier, pkg)}
                    style={[styles.confirmBtn, { backgroundColor: "#E8701A" }]}
                  >
                    <Text style={[styles.confirmBtnText, { color: "#FFF" }]}>Confirm</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
    </>
  );
}

function LifetimeCard({
  isSelected,
  isBuying,
  price,
  c,
  onSelect,
}: {
  isSelected: boolean;
  isBuying: boolean;
  price: string;
  c: any;
  onSelect: () => void;
}) {
  const gold = "#FF9F0A";

  return (
    <Pressable
      onPress={onSelect}
      disabled={isBuying}
      style={({ pressed }) => [
        styles.lifetimeCard,
        {
          backgroundColor: isSelected ? "rgba(255,159,10,0.15)" : "rgba(255,159,10,0.08)",
          borderColor: gold,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.bestValueBadge}>
        <Ionicons name="star" size={12} color="#000" />
        <Text style={styles.bestValueText}>BEST VALUE</Text>
      </View>

      <View style={styles.lifetimeHeader}>
        <View style={[styles.planIcon, { backgroundColor: "rgba(255,159,10,0.25)" }]}>
          <Ionicons name="infinite" size={24} color={gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planName, { color: c.text }]}>Lifetime Access</Text>
          <View style={styles.lifetimePriceRow}>
            <Text style={[styles.lifetimePrice, { color: gold }]}>{price}</Text>
            <Text style={[styles.lifetimeSub, { color: c.textSecondary }]}> · one-time payment</Text>
          </View>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={gold} />}
      </View>

      <View style={[styles.divider, { backgroundColor: "rgba(255,159,10,0.25)" }]} />

      <View style={styles.features}>
        {[
          "All current features",
          "All future features",
          "DJI Drone (when released)",
          "Priority support",
          "No recurring charges",
        ].map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={gold} />
            <Text style={[styles.featureLabel, { color: c.text }]}>{f}</Text>
          </View>
        ))}
      </View>

      {/* Drone Coming Soon section */}
      <DroneComingSoonBanner c={c} />

      {!isSelected && (
        <Pressable
          onPress={onSelect}
          disabled={isBuying}
          style={[styles.selectBtn, { backgroundColor: gold, opacity: isBuying ? 0.7 : 1 }]}
        >
          {isBuying ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={[styles.selectBtnText, { color: "#000" }]}>Get Lifetime Access</Text>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

function DroneComingSoonBanner({ c }: { c: any }) {
  return (
    <View style={[styles.droneBanner, { backgroundColor: "rgba(175,82,222,0.08)", borderColor: "rgba(175,82,222,0.25)" }]}>
      <View style={styles.droneBannerHeader}>
        <Text style={styles.droneEmoji}>🚁</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.droneBannerTitle, { color: c.text }]}>DJI Drone Integration</Text>
          <View style={[styles.comingSoonBadge, { backgroundColor: "rgba(175,82,222,0.15)" }]}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
        </View>
      </View>
      <View style={[styles.droneDivider, { backgroundColor: "rgba(175,82,222,0.2)" }]} />
      <Text style={[styles.droneBannerDesc, { color: c.textSecondary }]}>
        Aerial footage, FOLLOW mode, GPS recovery – in a future update for this plan.
      </Text>
      <View style={styles.droneEarlyRow}>
        <Text style={{ fontSize: 13 }}>⭐</Text>
        <Text style={[styles.droneEarlyText, { color: "#AF52DE" }]}>
          Subscribe now for early access when it launches
        </Text>
      </View>
    </View>
  );
}

type PlanCardProps = {
  offeringKey: string;
  meta: PlanMeta;
  isSelected: boolean;
  isBuying: boolean;
  price: string;
  features: (typeof TIER_FEATURES)[SubscriptionTier];
  c: any;
  onSelect: () => void;
};

function PlanCard({ offeringKey, meta, isSelected, isBuying, price, features, c, onSelect }: PlanCardProps) {
  const { color, icon } = meta;
  const priceStr = typeof price === "string" ? price : "—";
  const hasPerMonth = priceStr.includes("/mo") || (!priceStr.includes("one") && priceStr !== "—");
  const displayPrice = hasPerMonth && !priceStr.includes("/mo") ? `${priceStr}/mo` : priceStr;

  return (
    <Pressable
      onPress={onSelect}
      disabled={isBuying}
      style={({ pressed }) => [
        styles.planCard,
        {
          backgroundColor: isSelected ? `${color}22` : c.card,
          borderColor: isSelected ? color : c.cardBorder,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.planHeader}>
        <View style={[styles.planIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.planTitleRow}>
          <Text style={[styles.planName, { color: c.text }]}>{features.label}</Text>
          <Text style={[styles.planPrice, { color }]}>{displayPrice}</Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={22} color={color} />}
      </View>

      <View style={[styles.divider, { backgroundColor: c.separator }]} />

      <View style={styles.features}>
        <FeatureRow
          icon="people"
          label={features.contactLimit === Infinity ? "Unlimited emergency contacts" : `${features.contactLimit} emergency contact${features.contactLimit > 1 ? "s" : ""}`}
          c={c}
          color={color}
        />
        {features.emergencyCall && <FeatureRow icon="call" label="112 emergency call" c={c} color={color} />}
        {features.multilang && <FeatureRow icon="globe" label="6 languages" c={c} color={color} />}
        {features.mapNav && <FeatureRow icon="navigate" label="Turn-by-turn navigation" c={c} color={color} />}
        {features.voiceAgent && <FeatureRow icon="mic" label="AI Voice Agent (wake word)" c={c} color={color} />}
        {features.export && <FeatureRow icon="download" label="GPX/CSV export" c={c} color={color} />}
        {features.prioritySupport && <FeatureRow icon="headset" label="Priority support (48h)" c={c} color={color} />}
        {features.allFuture && <FeatureRow icon="flash" label="All future features" c={c} color={color} />}
      </View>

      {/* Drone coming soon for pro_drone */}
      {offeringKey === "pro_drone" && <DroneComingSoonBanner c={c} />}

      {!isSelected && (
        <Pressable
          onPress={onSelect}
          disabled={isBuying}
          style={[styles.selectBtn, { backgroundColor: color, opacity: isBuying ? 0.7 : 1 }]}
        >
          {isBuying ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.selectBtnText}>Get {features.label}</Text>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

function FeatureRow({ icon, label, c, color }: { icon: string; label: string; c: any; color: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[styles.featureLabel, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 24 },
  header: { alignItems: "center", paddingHorizontal: 20, marginBottom: 24, gap: 8 },
  iconBadge: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  plans: { paddingHorizontal: 20, gap: 12, paddingBottom: 12 },
  lifetimeCard: { borderRadius: 20, borderWidth: 2, padding: 18, position: "relative" },
  bestValueBadge: {
    position: "absolute", top: -1, right: 16, backgroundColor: "#FF9F0A",
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 0,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  bestValueText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 0.5 },
  lifetimeHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  lifetimePriceRow: { flexDirection: "row", alignItems: "center" },
  lifetimePrice: { fontSize: 18, fontFamily: "Inter_700Bold" },
  lifetimeSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  planCard: { borderRadius: 16, borderWidth: 1.5, padding: 16 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planTitleRow: { flex: 1, gap: 2 },
  planName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginVertical: 12 },
  features: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  selectBtn: { marginTop: 12, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  selectBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  droneBanner: { marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  droneBannerHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  droneEmoji: { fontSize: 22 },
  droneBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  comingSoonBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  comingSoonText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#AF52DE", letterSpacing: 0.8 },
  droneDivider: { height: 1 },
  droneBannerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  droneEarlyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  droneEarlyText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmCard: { width: "100%", borderRadius: 20, padding: 24, alignItems: "center", gap: 14, borderWidth: 1 },
  confirmTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  confirmSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  confirmBtns: { flexDirection: "row", gap: 12, width: "100%" },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
