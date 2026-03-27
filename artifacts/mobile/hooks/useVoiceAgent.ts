import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { type Language } from "@/context/AppContext";

export type VoiceStatus = "off" | "listening" | "active" | "speak";
export type NoiseFilter = 1 | 2 | 3;

const STORAGE_KEY = "@motoguard_voice_enabled";

const DEMO_RESPONSES = [
  "All systems nominal. Accident detection armed.",
  "Nearest petrol station is 3.2 km ahead on the right.",
  "Weather ahead: Clear skies, 22°C. Good riding conditions.",
  "Current speed: within zone limit. Keep it safe.",
  "Emergency contacts are configured and ready.",
  "Navigation is available. Say your destination.",
  "Accident detection is monitoring at 10Hz.",
];

function getLangCode(lang: Language): string {
  const map: Record<Language, string> = {
    en: "en-US", hu: "hu-HU", de: "de-DE", es: "es-ES", it: "it-IT", pt: "pt-PT",
  };
  return map[lang] ?? "en-US";
}

function getNoiseThreshold(filter: NoiseFilter): number {
  if (filter === 1) return 12;
  if (filter === 2) return 17;
  return 22;
}

export function useVoiceAgent(currentSpeed: number, language: Language) {
  const [status, setStatus] = useState<VoiceStatus>("off");
  const [noiseFilter, setNoiseFilter] = useState<NoiseFilter>(2);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [autoActivatedMessage, setAutoActivatedMessage] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const ambientLevelRef = useRef<number>(-50);
  const calibrationSamplesRef = useRef<number[]>([]);
  const isCalibrating = useRef(false);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const isEnabled = status !== "off";
  const isWeb = Platform.OS === "web";
  const canToggle = currentSpeed < 10;

  const stopRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (isWeb) {
      setStatus("listening");
      await AsyncStorage.setItem(STORAGE_KEY, "true");
      return;
    }

    if (isSpeakingRef.current) return;

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        {
          android: Audio.RecordingOptionsPresets.LOW_QUALITY.android,
          ios: {
            ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
            meteringEnabled: true,
          },
          web: {},
          isMeteringEnabled: true,
        },
        (status) => {
          if (!status.isRecording) return;
          if (isSpeakingRef.current) return;
          const db = status.metering ?? -60;

          if (isCalibrating.current) {
            calibrationSamplesRef.current.push(db);
            if (calibrationSamplesRef.current.length >= 50) {
              const avg = calibrationSamplesRef.current.reduce((a, b) => a + b, 0) / calibrationSamplesRef.current.length;
              ambientLevelRef.current = avg;
              isCalibrating.current = false;
              calibrationSamplesRef.current = [];
            }
            return;
          }

          const threshold = getNoiseThreshold(noiseFilter);
          if (db > ambientLevelRef.current + threshold) {
            activateVoiceRecognition();
          }
        },
        100
      );

      recordingRef.current = recording;
      isCalibrating.current = true;
      calibrationSamplesRef.current = [];
      setStatus("listening");
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
      console.warn("[VoiceAgent] Failed to start:", e);
      setStatus("listening");
    }
  }, [isWeb, noiseFilter]);

  const speakResponse = useCallback(
    (text: string) => {
      setStatus("speak");
      setLastResponse(text);
      isSpeakingRef.current = true;

      stopRecording();

      Speech.speak(text, {
        language: getLangCode(language),
        rate: 0.95,
        pitch: 1.0,
        onDone: () => {
          isSpeakingRef.current = false;
          setTimeout(() => {
            setStatus("listening");
            startListening();
          }, 500);
        },
        onStopped: () => {
          isSpeakingRef.current = false;
          setTimeout(() => {
            setStatus("listening");
            startListening();
          }, 500);
        },
        onError: () => {
          isSpeakingRef.current = false;
          setStatus("listening");
        },
      });
    },
    [language, stopRecording, startListening]
  );

  const activateVoiceRecognition = useCallback(() => {
    if (status === "active" || status === "speak") return;
    setStatus("active");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (responseTimer.current) clearTimeout(responseTimer.current);
    responseTimer.current = setTimeout(() => {
      const resp = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
      speakResponse(resp);
    }, 1800);
  }, [status, speakResponse]);

  const stopAgent = useCallback(async () => {
    Speech.stop();
    isSpeakingRef.current = false;
    await stopRecording();
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setStatus("off");
    setLastResponse(null);
    autoStartedRef.current = false;
    await AsyncStorage.setItem(STORAGE_KEY, "false");
  }, [stopRecording]);

  const toggleAgent = useCallback(async () => {
    if (status === "off") {
      await startListening();
    } else {
      await stopAgent();
    }
  }, [status, startListening, stopAgent]);

  const clearAutoActivatedMessage = useCallback(() => {
    setAutoActivatedMessage(null);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "true") startListening();
    });
    return () => {
      stopRecording();
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (currentSpeed >= 10) {
      if (!isEnabled && !autoStartedRef.current) {
        autoStartedRef.current = true;
        startListening();
        setAutoActivatedMessage("Voice Agent activated automatically");
      }
    } else {
      autoStartedRef.current = false;
    }
  }, [currentSpeed]);

  return {
    status,
    noiseFilter,
    setNoiseFilter,
    lastResponse,
    toggleAgent,
    stopAgent,
    isEnabled,
    canToggle,
    autoActivatedMessage,
    clearAutoActivatedMessage,
  };
}
