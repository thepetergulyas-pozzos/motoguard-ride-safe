import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useApp, STRINGS } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

let isLiquidGlass = false;
let NativeTabs: any = null;
let Icon: any = null;
let LabelComp: any = null;

try {
  const glassEffect = require("expo-glass-effect");
  isLiquidGlass = typeof glassEffect.isLiquidGlassAvailable === "function"
    ? glassEffect.isLiquidGlassAvailable()
    : false;
} catch {
  isLiquidGlass = false;
}

if (isLiquidGlass) {
  try {
    const nativeTabs = require("expo-router/unstable-native-tabs");
    NativeTabs = nativeTabs.NativeTabs;
    Icon = nativeTabs.Icon;
    LabelComp = nativeTabs.Label;
  } catch {
    isLiquidGlass = false;
  }
}

function NativeTabLayout() {
  const { settings } = useApp();
  const t = STRINGS[settings.language];

  if (!NativeTabs || !Icon || !LabelComp) return <ClassicTabLayout />;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "gauge.medium", selected: "gauge.high" }} />
        <LabelComp>{t.dashboard}</LabelComp>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="emergency">
        <Icon sf={{ default: "shield", selected: "shield.fill" }} />
        <LabelComp>{t.emergency}</LabelComp>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <LabelComp>{t.map ?? "Map"}</LabelComp>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rides">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <LabelComp>{t.rides}</LabelComp>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <LabelComp>{t.profile}</LabelComp>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { c, isDark } = useTheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { settings } = useApp();
  const t = STRINGS[settings.language];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#0A0A0A" : "#fff",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: c.separator,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "#0A0A0A" : "#fff" },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.dashboard,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gauge.medium" tintColor={color} size={24} />
            ) : (
              <Feather name="activity" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: t.emergency,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shield.fill" tintColor={color} size={24} />
            ) : (
              <Ionicons name="shield" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t.map ?? "Map",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="map.fill" tintColor={color} size={24} />
            ) : (
              <Ionicons name="map" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: t.rides,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="clock" tintColor={color} size={24} />
            ) : (
              <Ionicons name="time-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlass) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
