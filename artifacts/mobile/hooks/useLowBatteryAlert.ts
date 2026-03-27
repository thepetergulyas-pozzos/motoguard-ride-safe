import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { getCurrentLocation } from "@/services/LocationService";
import { sendEmergencySMS } from "@/services/SMSService";
import type { EmergencyContact } from "@/context/AppContext";

const LOW_BATTERY_THRESHOLD = 15;
const RESET_THRESHOLD = 20;

export function useLowBatteryAlert({
  isRiding,
  contacts,
  riderName,
}: {
  isRiding: boolean;
  contacts: EmergencyContact[];
  riderName: string;
}) {
  const alertSentRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let subscription: { remove: () => void } | null = null;

    import("expo-battery").then((Battery) => {
      subscription = Battery.addBatteryLevelListener(async ({ batteryLevel }) => {
        const percent = Math.round(batteryLevel * 100);

        if (percent > RESET_THRESHOLD) {
          alertSentRef.current = false;
          return;
        }

        if (percent <= LOW_BATTERY_THRESHOLD && isRiding && !alertSentRef.current && contacts.length > 0) {
          alertSentRef.current = true;

          const loc = getCurrentLocation();
          const hasCoords = loc.latitude !== 0 || loc.longitude !== 0;
          const mapsLink = hasCoords
            ? `https://maps.google.com/?q=${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}`
            : "Location unavailable";

          const msg =
            `⚡ MOTOGUARD LOW BATTERY ALERT\n` +
            `Rider: ${riderName}\n` +
            `Battery: ${percent}% – phone may go offline soon\n` +
            `Last known location: ${mapsLink}\n` +
            `Time: ${new Date().toLocaleString()}\n` +
            `This is an automated safety alert from MotoGuard.`;

          const phones = contacts.map((c) => c.phone);
          await sendEmergencySMS(phones, msg).catch(() => {});

          Speech.speak(
            `Warning: battery at ${percent} percent. Emergency contacts notified of your location.`
          );
        }
      });
    });

    return () => {
      subscription?.remove();
    };
  }, [isRiding, contacts, riderName]);
}
