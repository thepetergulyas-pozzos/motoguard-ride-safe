import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
};

export function Card({ children, style, onPress, disabled }: Props) {
  const { c } = useTheme();

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: c.card,
            borderColor: c.cardBorder,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, overflow: "hidden" },
});
