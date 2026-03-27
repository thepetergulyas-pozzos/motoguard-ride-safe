import { Platform } from "react-native";

const EMERGENCY_NUMBERS: Record<string, string> = {
  HU: "112", AT: "112", DE: "112", FR: "112",
  IT: "112", ES: "112", PT: "112", RO: "112",
  PL: "112", CZ: "112", SK: "112", HR: "112",
  SI: "112", GR: "112", SE: "112", NO: "112",
  DK: "112", FI: "112", NL: "112", BE: "112",
  CH: "112", LU: "112", BG: "112", LT: "112",
  LV: "112", EE: "112", IE: "112", MT: "112",
  CY: "112", GB: "999", US: "911", CA: "911",
  AU: "000", NZ: "111", JP: "119", KR: "119",
  CN: "120", IN: "112", MX: "911", BR: "192",
  AR: "911", ZA: "10111",
};

export async function getLocalEmergencyNumber(): Promise<string> {
  if (Platform.OS === "web") return "112";
  try {
    const Location = await import("expo-location");
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const places = await Location.reverseGeocodeAsync(pos.coords);
    const code = places[0]?.isoCountryCode ?? "";
    return EMERGENCY_NUMBERS[code] ?? "112";
  } catch {
    return "112";
  }
}
