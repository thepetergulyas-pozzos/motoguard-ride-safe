import * as Speech from "expo-speech";
import { useCallback, useRef, useState } from "react";
import { type Language } from "@/context/AppContext";

export type NavStep = {
  instruction: string;
  distance: string;
  distanceMeters: number;
  direction: "straight" | "left" | "right" | "slight-left" | "slight-right" | "u-turn" | "arrive";
  streetName: string;
};

export type NavRoute = {
  coordinates: { latitude: number; longitude: number }[];
  steps: NavStep[];
  totalDistanceKm: string;
  estimatedMinutes: number;
};

export type NavStatus = "idle" | "searching" | "navigating" | "arrived";

const DIRECTION_ICONS: Record<NavStep["direction"], string> = {
  straight: "arrow-up",
  left: "arrow-back",
  right: "arrow-forward",
  "slight-left": "arrow-up-circle",
  "slight-right": "arrow-up-circle",
  "u-turn": "refresh",
  arrive: "flag",
};

export { DIRECTION_ICONS };

export function useMapNavigation(language: Language) {
  const [status, setStatus] = useState<NavStatus>("idle");
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const announcedSteps = useRef<Set<number>>(new Set());

  const announce = useCallback((text: string) => {
    const langMap: Record<Language, string> = {
      en: "en-US", hu: "hu-HU", de: "de-DE", es: "es-ES", it: "it-IT", pt: "pt-PT",
    };
    Speech.speak(text, { language: langMap[language] ?? "en-US", rate: 0.9, pitch: 1.0 });
  }, [language]);

  const startNavigation = useCallback(async (from: { latitude: number; longitude: number }, dest: string) => {
    if (!dest.trim()) return;
    setStatus("searching");
    setErrorMsg(null);
    announcedSteps.current.clear();

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "GOOGLE_MAPS_API_KEY_PLACEHOLDER";

    if (!apiKey || apiKey === "GOOGLE_MAPS_API_KEY_PLACEHOLDER") {
      const simRoute = buildSimulatedRoute(from, dest);
      setRoute(simRoute);
      setCurrentStep(0);
      setStatus("navigating");
      announce(`Navigation started to ${dest}. ${simRoute.steps[0]?.instruction ?? ""}`);
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.latitude},${from.longitude}&destination=${encodeURIComponent(dest)}&mode=driving&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK" || !data.routes?.length) {
        setErrorMsg("Route not found. Please try a different destination.");
        setStatus("idle");
        return;
      }

      const leg = data.routes[0].legs[0];
      const steps: NavStep[] = leg.steps.map((s: any) => ({
        instruction: stripHtml(s.html_instructions),
        distance: s.distance.text,
        distanceMeters: s.distance.value,
        direction: parseManeuver(s.maneuver),
        streetName: s.end_location?.name ?? "",
      }));

      const coords: { latitude: number; longitude: number }[] = [];
      data.routes[0].legs[0].steps.forEach((s: any) => {
        coords.push({ latitude: s.start_location.lat, longitude: s.start_location.lng });
      });
      const last = leg.steps[leg.steps.length - 1];
      coords.push({ latitude: last.end_location.lat, longitude: last.end_location.lng });

      const navRoute: NavRoute = {
        coordinates: coords,
        steps,
        totalDistanceKm: leg.distance.text,
        estimatedMinutes: Math.round(leg.duration.value / 60),
      };

      setRoute(navRoute);
      setCurrentStep(0);
      setStatus("navigating");
      announce(`Navigation started. ${steps[0]?.instruction ?? ""}`);
    } catch {
      setErrorMsg("Navigation unavailable. Check your connection.");
      setStatus("idle");
    }
  }, [announce]);

  const stopNavigation = useCallback(() => {
    setStatus("idle");
    setRoute(null);
    setCurrentStep(0);
    announcedSteps.current.clear();
    Speech.stop();
  }, []);

  const updateProgress = useCallback((userLat: number, userLon: number) => {
    if (!route || status !== "navigating") return;
    const step = route.steps[currentStep];
    if (!step) return;

    if (!announcedSteps.current.has(currentStep)) {
      announcedSteps.current.add(currentStep);
      announce(step.instruction);
    }

    if (currentStep + 1 < route.steps.length) {
      setCurrentStep((prev) => {
        const next = prev + 1;
        return next;
      });
    } else {
      setStatus("arrived");
      announce("You have arrived at your destination.");
    }
  }, [route, status, currentStep, announce]);

  return {
    status, route, currentStep, destination, errorMsg,
    setDestination, startNavigation, stopNavigation, updateProgress,
    currentNavStep: route?.steps[currentStep] ?? null,
    DIRECTION_ICONS,
  };
}

function buildSimulatedRoute(
  from: { latitude: number; longitude: number },
  dest: string
): NavRoute {
  const offsetLat = (Math.random() - 0.5) * 0.05;
  const offsetLon = (Math.random() - 0.5) * 0.05;
  const toLat = from.latitude + offsetLat;
  const toLon = from.longitude + offsetLon;

  const mid1 = { latitude: from.latitude + offsetLat * 0.33, longitude: from.longitude + offsetLon * 0.1 };
  const mid2 = { latitude: from.latitude + offsetLat * 0.66, longitude: from.longitude + offsetLon * 0.66 };

  return {
    coordinates: [
      { latitude: from.latitude, longitude: from.longitude },
      mid1,
      mid2,
      { latitude: toLat, longitude: toLon },
    ],
    steps: [
      { instruction: `Head north toward ${dest}`, distance: "200 m", distanceMeters: 200, direction: "straight", streetName: "Current Street" },
      { instruction: `Turn right onto Main Road`, distance: "1.2 km", distanceMeters: 1200, direction: "right", streetName: "Main Road" },
      { instruction: `Turn left onto Ring Avenue`, distance: "800 m", distanceMeters: 800, direction: "left", streetName: "Ring Avenue" },
      { instruction: `You have arrived at ${dest}`, distance: "0 m", distanceMeters: 0, direction: "arrive", streetName: dest },
    ],
    totalDistanceKm: "2.2 km",
    estimatedMinutes: 8,
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function parseManeuver(maneuver?: string): NavStep["direction"] {
  if (!maneuver) return "straight";
  if (maneuver.includes("turn-left")) return "left";
  if (maneuver.includes("turn-right")) return "right";
  if (maneuver.includes("slight-left")) return "slight-left";
  if (maneuver.includes("slight-right")) return "slight-right";
  if (maneuver.includes("uturn")) return "u-turn";
  if (maneuver.includes("arrive")) return "arrive";
  return "straight";
}
