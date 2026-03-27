import { Platform } from "react-native";

export type AccidentLevel = "none" | "warning" | "alert" | "emergency";

export type SensorCallback = (gForce: number, rotation: number) => void;

let accelSubscription: { remove: () => void } | null = null;
let gyroSubscription: { remove: () => void } | null = null;
let currentGForce = 1.0;
let currentRotation = 0;

const HISTORY_SIZE = 10;
const gForceHistory: number[] = [];

export function getCurrentGForce() {
  return currentGForce;
}

export function getGForceHistory(): number[] {
  return [...gForceHistory];
}

export async function startSensors(onData: SensorCallback): Promise<void> {
  stopSensors();

  if (Platform.OS === "web") {
    return;
  }

  try {
    const { Accelerometer, Gyroscope } = await import("expo-sensors");

    Accelerometer.setUpdateInterval(250);
    accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
      currentGForce = Math.sqrt(x * x + y * y + z * z);
      gForceHistory.push(currentGForce);
      if (gForceHistory.length > HISTORY_SIZE) gForceHistory.shift();
      onData(currentGForce, currentRotation);
    });

    Gyroscope.setUpdateInterval(250);
    gyroSubscription = Gyroscope.addListener(({ x, y, z }) => {
      currentRotation = Math.sqrt(x * x + y * y + z * z);
    });
  } catch (e) {
    console.warn("Sensors not available:", e);
  }
}

export function stopSensors(): void {
  accelSubscription?.remove();
  gyroSubscription?.remove();
  accelSubscription = null;
  gyroSubscription = null;
  currentGForce = 1.0;
  currentRotation = 0;
  gForceHistory.length = 0;
}

export function classifyGForce(gForce: number): AccidentLevel {
  if (gForce > 6.0) return "emergency";
  if (gForce > 4.5) return "alert";
  if (gForce > 3.0) return "warning";
  return "none";
}
