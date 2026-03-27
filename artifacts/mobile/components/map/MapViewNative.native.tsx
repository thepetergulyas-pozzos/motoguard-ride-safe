import React from "react";
import { Platform, StyleSheet } from "react-native";
import MapViewLib, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Colors from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

type Coord = { latitude: number; longitude: number };

type Props = {
  userLocation: Coord;
  rideCoords: Coord[];
  navRoute: Coord[] | null;
  speed: number;
  isDark: boolean;
  mapRef: React.RefObject<any>;
};

function speedToColor(speed: number): string {
  if (speed < 30) return "#30D158";
  if (speed < 70) return "#FF9F0A";
  if (speed < 100) return "#FF6B1A";
  return "#FF3B30";
}

export function NativeMapView({ userLocation, rideCoords, navRoute, speed, isDark, mapRef }: Props) {
  return (
    <MapViewLib
      ref={mapRef}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      style={StyleSheet.absoluteFill}
      showsUserLocation
      showsMyLocationButton
      followsUserLocation
      showsTraffic
      mapType="standard"
      userInterfaceStyle={isDark ? "dark" : "light"}
      initialRegion={{
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      {rideCoords.length > 1 && (
        <Polyline
          coordinates={rideCoords}
          strokeWidth={4}
          strokeColor={speedToColor(speed)}
        />
      )}
      {navRoute && navRoute.length > 1 && (
        <Polyline
          coordinates={navRoute}
          strokeWidth={5}
          strokeColor={Colors.dark.tint}
          lineDashPattern={[0]}
        />
      )}
      {navRoute && navRoute.length > 0 && (
        <Marker coordinate={navRoute[navRoute.length - 1]}>
          <View style={styles.destMarker}>
            <Ionicons name="flag" size={20} color="#FFF" />
          </View>
        </Marker>
      )}
    </MapViewLib>
  );
}

const styles = StyleSheet.create({
  destMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.dark.tint, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFF",
  },
});
