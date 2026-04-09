import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Alert, Linking, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { AccidentAlertOverlay } from "@/components/AccidentAlertOverlay";
import { useAccidentDetection } from "@/hooks/useAccidentDetection";
import { SubscriptionProvider, initializeRevenueCat } from "@/lib/revenuecat";
import { fetchRemoteConfig, compareVersions } from "@/constants/RemoteConfig";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
initializeRevenueCat();

SplashScreen.preventAutoHideAsync();

const APP_VERSION = "1.0.0";
const APP_STORE_URL = "https://apps.apple.com/app/motoguard";
const queryClient = new QueryClient();

function RootLayoutNav() {
  const { alert, dismiss } = useAccidentDetection();
  const { settings, isLoaded } = useApp();
  const countryNoticeShown = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    fetchRemoteConfig().then(async (config) => {
      if (!config) return;

      if (config.appConfig?.maintenanceMode) {
        Alert.alert(
          "Under Maintenance",
          "MotoGuard is temporarily unavailable for maintenance. Please try again later.",
          [],
          { cancelable: false }
        );
        return;
      }

      if (config.appConfig?.forceUpdateVersion) {
        const required = config.appConfig.forceUpdateVersion;
        if (compareVersions(APP_VERSION, required) < 0) {
          Alert.alert(
            "Update Required",
            "A critical safety update is available. Please update MotoGuard to continue.",
            [{ text: "Update Now", onPress: () => Linking.openURL(APP_STORE_URL) }],
            { cancelable: false }
          );
          return;
        }
      }

      if (!countryNoticeShown.current && Platform.OS !== "web") {
        try {
          const Location = await import("expo-location");
          const hasPermission = (await Location.getForegroundPermissionsAsync()).status === "granted";
          if (hasPermission) {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const places = await Location.reverseGeocodeAsync(pos.coords);
            const countryCode = places[0]?.isoCountryCode ?? "";
            const notice = config.legalNotices?.[countryCode];
            if (notice) {
              countryNoticeShown.current = true;
              Alert.alert("Legal Notice", notice, [{ text: "Got it" }]);
            }
          }
        } catch {
          // Location unavailable — skip country notice
        }
      }
    });
  }, [isLoaded]);

  if (!isLoaded) return null;

  const needsOnboarding = !settings.onboardingComplete || !settings.legalAccepted;

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
      </Stack>
      <AccidentAlertOverlay alert={alert} onDismiss={dismiss} />
      {isLoaded && needsOnboarding && <OnboardingRedirect />}
    </>
  );
}

function OnboardingRedirect() {
  React.useEffect(() => {
    router.replace("/onboarding");
  }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <QueryClientProvider client={queryClient}>
            <SubscriptionProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SubscriptionProvider>
          </QueryClientProvider>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
