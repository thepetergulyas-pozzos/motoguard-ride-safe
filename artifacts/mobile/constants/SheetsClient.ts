import { Platform } from "react-native";
import { APP_VERSION } from "@/constants/SupportConfig";

const SHEETS_URL = process.env.EXPO_PUBLIC_SHEETS_URL ?? "";

async function sendToSheets(sheetName: string, rowData: (string | number)[]): Promise<void> {
  if (!SHEETS_URL) {
    console.warn("[Sheets] EXPO_PUBLIC_SHEETS_URL is not set – skipping");
    return;
  }
  const row = [new Date().toISOString(), ...rowData];
  const payload = { sheet: sheetName, row };
  console.log("[Sheets] Sending →", sheetName, JSON.stringify(payload));
  try {
    const res = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log("[Sheets] Response ←", sheetName, res.status, text.slice(0, 120));
  } catch (error: any) {
    console.warn("[Sheets] Fetch error:", sheetName, error?.message ?? error);
  }
}

export async function logDroneInterest(answer: string, language: string, tier: string): Promise<void> {
  console.log("[Sheets] logDroneInterest", { answer, language, tier });
  await sendToSheets("Drone Interest", [answer, language, tier, APP_VERSION, Platform.OS]);
}

export async function logSupportTicket(
  type: string,
  category: string,
  summary: string,
  description: string,
  language: string,
  tier: string
): Promise<void> {
  console.log("[Sheets] logSupportTicket", { type, category, summary, language, tier });
  await sendToSheets("Support Tickets", [
    type, category, summary, description, language, tier,
    APP_VERSION, type === "Safety" ? "Critical" : "Normal", "New",
  ]);
}

export async function logFeatureVote(
  featureId: string,
  featureName: string,
  action: string,
  language: string,
  tier: string
): Promise<void> {
  console.log("[Sheets] logFeatureVote", { featureId, action, language });
  await sendToSheets("Feature Votes", [featureId, featureName, action, language, tier, APP_VERSION]);
}

export async function logAppEvent(
  event: string,
  language: string,
  tier: string,
  value = ""
): Promise<void> {
  console.log("[Sheets] logAppEvent", { event, language, tier, value });
  await sendToSheets("App Events", [event, language, tier, APP_VERSION, value]);
}
