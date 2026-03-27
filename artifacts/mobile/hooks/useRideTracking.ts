import { useCallback, useEffect, useRef, useState } from "react";
import {
  startLocationTracking,
  stopLocationTracking,
  type LocationData,
} from "@/services/LocationService";
import {
  activateKeepAwake,
  deactivateKeepAwake,
  registerBackgroundTask,
  unregisterBackgroundTask,
} from "@/services/BackgroundService";
import { useApp } from "@/context/AppContext";

export type RideStatus = "active" | "paused";

export type RideState = {
  active: boolean;
  rideStatus: RideStatus;
  elapsed: number;
  distanceKm: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  currentSpeedKmh: number;
  location: LocationData | null;
  idleSeconds: number;
};

const IDLE_THRESHOLD_MS = 3 * 60 * 1000;
const IDLE_SPEED_KMH = 2;

const INITIAL_STATE: RideState = {
  active: false,
  rideStatus: "active",
  elapsed: 0,
  distanceKm: 0,
  maxSpeedKmh: 0,
  avgSpeedKmh: 0,
  currentSpeedKmh: 0,
  location: null,
  idleSeconds: 0,
};

export function useRideTracking() {
  const { addRideLog } = useApp();
  const [ride, setRide] = useState<RideState>(INITIAL_STATE);
  const [trackPoints, setTrackPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedSamplesRef = useRef<number[]>([]);
  const prevLocationRef = useRef<LocationData | null>(null);
  const elapsedRef = useRef(0);
  const rideStatusRef = useRef<RideStatus>("active");
  const idleSecondsRef = useRef(0);

  const calcDistance = (a: LocationData, b: LocationData): number => {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const sin1 = Math.sin(dLat / 2);
    const sin2 = Math.sin(dLon / 2);
    const aa =
      sin1 * sin1 +
      Math.cos((a.latitude * Math.PI) / 180) *
        Math.cos((b.latitude * Math.PI) / 180) *
        sin2 *
        sin2;
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  };

  const pauseRide = useCallback(() => {
    rideStatusRef.current = "paused";
    if (timerRef.current) clearInterval(timerRef.current);
    setRide((prev) => ({ ...prev, rideStatus: "paused" }));
  }, []);

  const resumeRide = useCallback(() => {
    rideStatusRef.current = "active";
    idleSecondsRef.current = 0;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setRide((prev) => ({ ...prev, elapsed: elapsedRef.current, rideStatus: "active", idleSeconds: 0 }));
    }, 1000);
    setRide((prev) => ({ ...prev, rideStatus: "active", idleSeconds: 0 }));
  }, []);

  const startRide = useCallback(async () => {
    await activateKeepAwake();
    await registerBackgroundTask();

    speedSamplesRef.current = [];
    prevLocationRef.current = null;
    elapsedRef.current = 0;
    rideStatusRef.current = "active";
    idleSecondsRef.current = 0;
    setTrackPoints([]);

    setRide({ ...INITIAL_STATE, active: true });

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      idleSecondsRef.current += 1;
      setRide((prev) => ({ ...prev, elapsed: elapsedRef.current }));
    }, 1000);

    await startLocationTracking((loc) => {
      speedSamplesRef.current.push(loc.speedKmh);
      setTrackPoints((prev) => [...prev, { latitude: loc.latitude, longitude: loc.longitude }]);

      setRide((prev) => {
        if (!prev.active) return prev;

        const distAdd = prevLocationRef.current
          ? calcDistance(prevLocationRef.current, loc)
          : 0;
        const newDist = prev.distanceKm + distAdd;
        const allSpeeds = speedSamplesRef.current;
        const avgSpeed = allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length;

        prevLocationRef.current = loc;

        // H: Idle detection
        if (loc.speedKmh < IDLE_SPEED_KMH) {
          if (!idleTimerRef.current) {
            idleTimerRef.current = setTimeout(() => {
              if (rideStatusRef.current === "active") {
                pauseRide();
              }
            }, IDLE_THRESHOLD_MS);
          }
        } else {
          if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
          }
          if (rideStatusRef.current === "paused") {
            resumeRide();
          }
        }

        return {
          ...prev,
          currentSpeedKmh: loc.speedKmh,
          maxSpeedKmh: Math.max(prev.maxSpeedKmh, loc.speedKmh),
          avgSpeedKmh: Math.round(avgSpeed),
          distanceKm: newDist,
          location: loc,
          rideStatus: rideStatusRef.current,
        };
      });
    });
  }, [pauseRide, resumeRide]);

  const stopRide = useCallback(() => {
    stopLocationTracking();
    deactivateKeepAwake();
    unregisterBackgroundTask();
    if (timerRef.current) clearInterval(timerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;

    setRide((prev) => {
      if (prev.active && prev.elapsed > 30) {
        addRideLog({
          date: new Date().toISOString(),
          duration: prev.elapsed,
          distance: Math.round(prev.distanceKm * 10) / 10,
          maxSpeed: Math.round(prev.maxSpeedKmh),
          avgSpeed: Math.round(prev.avgSpeedKmh),
          route: "GPS Route",
        });
      }
      return INITIAL_STATE;
    });
  }, [addRideLog]);

  useEffect(() => {
    return () => {
      stopLocationTracking();
      if (timerRef.current) clearInterval(timerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return {
    ride,
    startRide,
    stopRide,
    trackPoints,
    speed: ride.currentSpeedKmh,
    isTracking: ride.active,
  };
}
