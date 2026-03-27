import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const ENTITLEMENTS = {
  basic: "basic",
  pro: "pro",
  pro_drone: "pro_drone",
} as const;

function getRevenueCatApiKey(): string | null {
  if (!REVENUECAT_TEST_API_KEY) return null;

  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY ?? REVENUECAT_TEST_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY ?? REVENUECAT_TEST_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat(): boolean {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.log("[RevenueCat] No API key configured — skipping init");
    return false;
  }
  try {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    console.log("[RevenueCat] Configured successfully");
    return true;
  } catch (e) {
    console.warn("[RevenueCat] Configure failed:", e);
    return false;
  }
}

export type ActiveTier = "free" | "basic" | "pro" | "pro_drone";

function getActiveTier(entitlements: Record<string, unknown>): ActiveTier {
  if (entitlements[ENTITLEMENTS.pro_drone]) return "pro_drone";
  if (entitlements[ENTITLEMENTS.pro]) return "pro";
  if (entitlements[ENTITLEMENTS.basic]) return "basic";
  return "free";
}

function useSubscriptionContext() {
  const enabled = !!getRevenueCatApiKey();

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      const info = await Purchases.getCustomerInfo();
      return info;
    },
    staleTime: 60_000,
    enabled,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings();
      return offerings;
    },
    staleTime: 300_000,
    enabled,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: any) => {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const activeTier = getActiveTier(
    customerInfoQuery.data?.entitlements.active ?? {}
  );

  return {
    isConfigured: enabled,
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    activeTier,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
