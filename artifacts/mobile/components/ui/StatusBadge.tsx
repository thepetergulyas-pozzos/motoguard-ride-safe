import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";

type Props = { active: boolean; label?: string; size?: "sm" | "md" };

export function StatusBadge({ active, label, size = "md" }: Props) {
  const { c } = useTheme();
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: active ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 59, 48, 0.15)",
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 3 : 5,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: active ? c.success : c.danger,
            width: isSmall ? 6 : 8,
            height: isSmall ? 6 : 8,
            borderRadius: isSmall ? 3 : 4,
          },
        ]}
      />
      {label ? (
        <Text
          style={[
            styles.label,
            { color: active ? c.success : c.danger, fontSize: isSmall ? 10 : 12 },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 100 },
  dot: {},
  label: { fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
