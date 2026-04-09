import { Platform } from "react-native";
import { APP_VERSION } from "@/constants/SupportConfig";

const SHEETS_URL = process.env.EXPO_PUBLIC_SHEETS_URL ?? "";

async function sendToSheets(sheetName: string, rowData: (string | number)[]): Promise<void> {
  if (!SHEETS_URL) return;
  try {
    const row = [new Date().toISOString(), ...rowData];
    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet: sheetName, row }),
    });
  } catch (error: any) {
    console.warn("Sheets send failed:", error.message);
  }
}

export async function logDroneInterest(answer: string, language: string, tier: string): Promise<void> {
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
  await sendToSheets("Feature Votes", [featureId, featureName, action, language, tier, APP_VERSION]);
}

export async function logAppEvent(
  event: string,
  language: string,
  tier: string,
  value = ""
): Promise<void> {
  await sendToSheets("App Events", [event, language, tier, APP_VERSION, value]);
}
