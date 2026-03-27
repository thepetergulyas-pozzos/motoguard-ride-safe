import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: "sm" | "md" | "lg";
};

export function Button({
  label, onPress, variant = "primary", loading, disabled, style, size = "md",
}: Props) {
  const { c, Colors } = useTheme();

  const bgColor = {
    primary: Colors.dark.tint,
    secondary: c.backgroundTertiary,
    danger: c.danger,
    ghost: "transparent",
  }[variant];

  const textColor = {
    primary: "#FFFFFF",
    secondary: c.text,
    danger: "#FFFFFF",
    ghost: Colors.dark.tint,
  }[variant];

  const padding = {
    sm: { paddingVertical: 8, paddingHorizontal: 16 },
    md: { paddingVertical: 14, paddingHorizontal: 20 },
    lg: { paddingVertical: 18, paddingHorizontal: 24 },
  }[size];

  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        padding,
        {
          backgroundColor: bgColor,
          opacity: pressed || disabled ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" || variant === "ghost" ? Colors.dark.tint : "#fff"}
          size="small"
        />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
});
