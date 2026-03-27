import { Platform } from "react-native";

export type LocationData = {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  accuracy: number;
};

export type GpsStatus = "ok" | "lost" | "estimated";

export type LocationCallback = (data: LocationData) => void;

let locationSubscription: { remove: () => void } | null = null;
let currentLocation: LocationData = {
  latitude: 0,
  longitude: 0,
  speedKmh: 0,
  heading: 0,
  accuracy: 0,
};

let gpsStatus: GpsStatus = "ok";
let lastFixTime = Date.now();
let gpsLostTimer: ReturnType<typeof setTimeout> | null = null;

const GPS_LOSS_ACCURACY_THRESHOLD = 50;
const GPS_LOSS_TIME_MS = 15_000;

export function getCurrentLocation(): LocationData {
  return currentLocation;
}

export function getGpsStatus(): GpsStatus {
  return gpsStatus;
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return false;
    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === "granted";
  } catch {
    return false;
  }
}

export async function startLocationTracking(onUpdate: LocationCallback): Promise<void> {
  stopLocationTracking();
  if (Platform.OS === "web") return;

  gpsStatus = "ok";
  lastFixTime = Date.now();

  try {
    const Location = await import("expo-location");
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (location) => {
        const { latitude, longitude, speed, heading, accuracy } = location.coords;

        lastFixTime = Date.now();
        if (gpsLostTimer) { clearTimeout(gpsLostTimer); gpsLostTimer = null; }

        if ((accuracy ?? 0) > GPS_LOSS_ACCURACY_THRESHOLD) {
          gpsStatus = "estimated";
        } else {
          gpsStatus = "ok";
        }

        currentLocation = {
          latitude,
          longitude,
          speedKmh: Math.max(0, (speed ?? 0) * 3.6),
          heading: heading ?? 0,
          accuracy: accuracy ?? 0,
        };

        gpsLostTimer = setTimeout(() => {
          gpsStatus = "lost";
        }, GPS_LOSS_TIME_MS);

        onUpdate(currentLocation);
      }
    );
  } catch (e) {
    console.warn("Location tracking unavailable:", e);
  }
}

export function stopLocationTracking(): void {
  locationSubscription?.remove();
  locationSubscription = null;
  if (gpsLostTimer) { clearTimeout(gpsLostTimer); gpsLostTimer = null; }
  gpsStatus = "ok";
}

export async function getCurrentPositionOnce(): Promise<LocationData | null> {
  if (Platform.OS === "web") return null;
  try {
    const Location = await import("expo-location");
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      speedKmh: Math.max(0, (pos.coords.speed ?? 0) * 3.6),
      heading: pos.coords.heading ?? 0,
      accuracy: pos.coords.accuracy ?? 0,
    };
  } catch {
    return null;
  }
}

export function buildEmergencySMS(
  riderName: string,
  lat: number,
  lon: number,
  level: string
): string {
  const mapsLink = `https://maps.google.com/?q=${lat},${lon}`;
  return `🚨 MOTOGUARD EMERGENCY ALERT
Rider: ${riderName}
Level: ${level}
Location: ${mapsLink}
Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}
Time: ${new Date().toLocaleString()}
Sent by MotoGuard Safety App`;
}
