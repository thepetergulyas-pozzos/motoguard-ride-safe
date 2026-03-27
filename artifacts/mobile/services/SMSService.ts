import { Linking, Platform } from "react-native";

export async function sendEmergencySMS(
  phones: string[],
  message: string
): Promise<void> {
  if (Platform.OS === "web") {
    console.log("[WEB] SMS would be sent to:", phones.join(", "));
    console.log("[WEB] Message:", message);
    return;
  }

  try {
    const SMS = await import("expo-sms");
    const isAvailable = await SMS.isAvailableAsync();

    if (isAvailable) {
      await SMS.sendSMSAsync(phones, message);
    } else {
      const phoneNumbers = phones.join(",");
      await Linking.openURL(
        `sms:${phoneNumbers}?body=${encodeURIComponent(message)}`
      );
    }
  } catch (e) {
    console.warn("SMS not available:", e);
    const phoneNumbers = phones.join(",");
    await Linking.openURL(
      `sms:${phoneNumbers}?body=${encodeURIComponent(message)}`
    ).catch(() => {});
  }
}
