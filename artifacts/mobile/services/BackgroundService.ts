import { Platform } from "react-native";

export async function activateKeepAwake(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { activateKeepAwakeAsync } = await import("expo-keep-awake");
    await activateKeepAwakeAsync("motoguard-ride");
  } catch (e) {
    console.warn("Keep awake not available:", e);
  }
}

export async function deactivateKeepAwake(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { deactivateKeepAwake } = await import("expo-keep-awake");
    deactivateKeepAwake("motoguard-ride");
  } catch (e) {
    console.warn("Keep awake deactivate failed:", e);
  }
}

const BACKGROUND_ACCIDENT_TASK = "background-accident-detection";

export async function registerBackgroundTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const TaskManager = await import("expo-task-manager");
    const BackgroundFetch = await import("expo-background-fetch");

    if (!TaskManager.isTaskDefined(BACKGROUND_ACCIDENT_TASK)) {
      TaskManager.defineTask(BACKGROUND_ACCIDENT_TASK, async () => {
        return BackgroundFetch.BackgroundFetchResult.NewData;
      });
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_ACCIDENT_TASK, {
      minimumInterval: 15,
      stopOnTerminate: false,
      startOnBoot: false,
    });
  } catch (e) {
    console.warn("Background task registration failed:", e);
  }
}

export async function unregisterBackgroundTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const BackgroundFetch = await import("expo-background-fetch");
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_ACCIDENT_TASK);
  } catch (e) {
    console.warn("Background task unregistration failed:", e);
  }
}
