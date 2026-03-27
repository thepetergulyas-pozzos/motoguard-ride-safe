import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";

type Coord = { latitude: number; longitude: number };

type Props = {
  userLocation: Coord;
  rideCoords: Coord[];
  navRoute: Coord[] | null;
  speed: number;
  isDark: boolean;
  mapRef: React.RefObject<any>;
};

export function NativeMapView({ isDark }: Props) {
  const { c } = useTheme();
  return (
    <View style={{
      flex: 1, alignItems: "center", justifyContent: "center",
      backgroundColor: isDark ? "#1C1C1E" : "#E8EAF6", gap: 16, padding: 32,
    }}>
      <Ionicons name="map" size={64} color={c.textTertiary} />
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: c.text }}>Map View</Text>
      <Text style={{
        fontSize: 14, fontFamily: "Inter_400Regular", color: c.textSecondary,
        textAlign: "center", lineHeight: 22,
      }}>
        Live map is available on iOS and Android devices.{"\n"}
        Scan the QR code with Expo Go to see the full map experience.
      </Text>
    </View>
  );
}
