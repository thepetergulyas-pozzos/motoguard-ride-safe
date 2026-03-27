import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AccidentLevel,
  classifyGForce,
  getGForceHistory,
  startSensors,
  stopSensors,
} from "@/services/SensorService";
import { useApp } from "@/context/AppContext";

export type AlertState = {
  level: AccidentLevel;
  gForce: number;
  countdown: number;
};

const COUNTDOWN_WARNING = 15;
const COUNTDOWN_ALERT = 30;
const STATIONARY_THRESHOLD_MS = 5000;
const STATIONARY_SPEED_KMH = 2;

function isPhoneDrop(gForce: number, speed: number, recentSpeedDelta: number): boolean {
  return gForce > 3.0 && speed > 10 && recentSpeedDelta < 5;
}

function isSpeedBump(currentSpeed: number, prevSpeed: number): boolean {
  const history = getGForceHistory();
  const spikeSamples = history.filter((g) => g > 2.0).length;
  return spikeSamples <= 3 && currentSpeed > prevSpeed * 0.8;
}

export function useAccidentDetection(currentSpeed: number = 0) {
  const { settings } = useApp();
  const enabled = settings.accidentDetectionEnabled;

  const [alert, setAlert] = useState<AlertState | null>(null);
  const alertRef = useRef<AlertState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suppressedUntil = useRef<number>(0);

  const speedRef = useRef(currentSpeed);
  const speedHistoryRef = useRef<number[]>([]);
  const stationaryStartRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = speedRef.current;
    speedRef.current = currentSpeed;

    speedHistoryRef.current.push(currentSpeed);
    if (speedHistoryRef.current.length > 20) speedHistoryRef.current.shift();

    if (currentSpeed < STATIONARY_SPEED_KMH) {
      if (!stationaryStartRef.current) stationaryStartRef.current = Date.now();
    } else {
      stationaryStartRef.current = null;
    }
  }, [currentSpeed]);

  const clearAlert = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    alertRef.current = null;
    setAlert(null);
  }, []);

  const escalate = useCallback(
    (gForce: number, toLevel: AccidentLevel) => {
      if (timerRef.current) clearInterval(timerRef.current);

      const countdown =
        toLevel === "warning" ? COUNTDOWN_WARNING : COUNTDOWN_ALERT;
      const state: AlertState = { level: toLevel, gForce, countdown };
      alertRef.current = state;
      setAlert({ ...state });

      if (toLevel === "warning") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      let remaining = countdown;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setAlert((prev) => (prev ? { ...prev, countdown: remaining } : null));
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          if (toLevel === "warning") {
            escalate(gForce, "alert");
          } else if (toLevel === "alert") {
            escalate(gForce, "emergency");
          }
        }
      }, 1000);
    },
    [clearAlert]
  );

  const dismiss = useCallback(() => {
    suppressedUntil.current = Date.now() + 60_000;
    clearAlert();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [clearAlert]);

  useEffect(() => {
    if (!enabled) {
      stopSensors();
      clearAlert();
      return;
    }

    startSensors((gForce) => {
      if (Date.now() < suppressedUntil.current) return;
      if (alertRef.current && alertRef.current.level !== "none") return;

      const speed = speedRef.current;
      const history = speedHistoryRef.current;
      const prevSpeed = history.length > 1 ? history[history.length - 2] : speed;

      // B: Parked bike – ignore if stationary > 5s
      const stationaryMs = stationaryStartRef.current
        ? Date.now() - stationaryStartRef.current
        : 0;
      if (speed < STATIONARY_SPEED_KMH && stationaryMs > STATIONARY_THRESHOLD_MS) return;

      // J: Speed bump – short spike while speed continues
      if (isSpeedBump(speed, prevSpeed)) return;

      // A: Phone drop – high G but GPS speed unchanged while moving
      const recentSpeeds = history.slice(-5);
      const speedDelta =
        recentSpeeds.length > 1
          ? Math.abs(recentSpeeds[recentSpeeds.length - 1] - recentSpeeds[0])
          : 99;
      if (isPhoneDrop(gForce, speed, speedDelta)) return;

      const level = classifyGForce(gForce);
      if (level !== "none") {
        escalate(gForce, level);
      }
    });

    return () => {
      stopSensors();
    };
  }, [enabled, escalate, clearAlert]);

  return { alert, dismiss };
}
