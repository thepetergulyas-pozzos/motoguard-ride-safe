import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language = "en" | "hu" | "de" | "es" | "it" | "pt";

export type SubscriptionTier = "free" | "basic" | "pro" | "pro_drone" | "lifetime";

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
};

export type RideLog = {
  id: string;
  date: string;
  duration: number;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
  route: string;
};

export type ColorSchemePreference = "system" | "dark" | "light";

export type AppSettings = {
  language: Language;
  subscription: SubscriptionTier;
  emergencyContacts: EmergencyContact[];
  accidentDetectionEnabled: boolean;
  voiceAgentEnabled: boolean;
  countdownSeconds: number;
  rideLogs: RideLog[];
  onboardingComplete: boolean;
  colorScheme: ColorSchemePreference;
};

const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  subscription: "free",
  emergencyContacts: [],
  accidentDetectionEnabled: true,
  voiceAgentEnabled: false,
  countdownSeconds: 30,
  rideLogs: [],
  onboardingComplete: false,
  colorScheme: "system",
};

type AppContextType = {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addContact: (contact: Omit<EmergencyContact, "id">) => void;
  removeContact: (id: string) => void;
  addRideLog: (log: Omit<RideLog, "id">) => void;
  clearRideLogs: () => void;
  isLoaded: boolean;
  accidentActive: boolean;
  setAccidentActive: (active: boolean) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "@motoguard_settings";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [accidentActive, setAccidentActive] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          // ignore
        }
      }
      setIsLoaded(true);
    });
  }, []);

  const save = useCallback((newSettings: AppSettings) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings)).catch(
      () => {}
    );
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates };
        save(next);
        return next;
      });
    },
    [save]
  );

  const addContact = useCallback(
    (contact: Omit<EmergencyContact, "id">) => {
      setSettings((prev) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2);
        const next = {
          ...prev,
          emergencyContacts: [...prev.emergencyContacts, { ...contact, id }],
        };
        save(next);
        return next;
      });
    },
    [save]
  );

  const removeContact = useCallback(
    (id: string) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id),
        };
        save(next);
        return next;
      });
    },
    [save]
  );

  const addRideLog = useCallback(
    (log: Omit<RideLog, "id">) => {
      setSettings((prev) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2);
        const next = {
          ...prev,
          rideLogs: [{ ...log, id }, ...prev.rideLogs].slice(0, 50),
        };
        save(next);
        return next;
      });
    },
    [save]
  );

  const clearRideLogs = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, rideLogs: [] };
      save(next);
      return next;
    });
  }, [save]);

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        addContact,
        removeContact,
        addRideLog,
        clearRideLogs,
        isLoaded,
        accidentActive,
        setAccidentActive,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const TIER_FEATURES = {
  free: {
    label: "Free",
    price: null,
    contactLimit: 1,
    logLimit: 5,
    emergencyCall: false,
    voiceAgent: false,
    export: false,
    drone: false,
    multilang: false,
    mapNav: false,
    prioritySupport: false,
    allFuture: false,
  },
  basic: {
    label: "Basic",
    price: "$2.99/mo",
    contactLimit: 2,
    logLimit: 30,
    emergencyCall: true,
    voiceAgent: false,
    export: false,
    drone: false,
    multilang: true,
    mapNav: true,
    prioritySupport: false,
    allFuture: false,
  },
  pro: {
    label: "Pro",
    price: "$5.99/mo",
    contactLimit: Infinity,
    logLimit: Infinity,
    emergencyCall: true,
    voiceAgent: true,
    export: true,
    drone: false,
    multilang: true,
    mapNav: true,
    prioritySupport: false,
    allFuture: false,
  },
  pro_drone: {
    label: "Pro+Drone",
    price: "$9.99/mo",
    contactLimit: Infinity,
    logLimit: Infinity,
    emergencyCall: true,
    voiceAgent: true,
    export: true,
    drone: true,
    multilang: true,
    mapNav: true,
    prioritySupport: true,
    allFuture: false,
  },
  lifetime: {
    label: "Lifetime",
    price: "$39.99",
    contactLimit: Infinity,
    logLimit: Infinity,
    emergencyCall: true,
    voiceAgent: true,
    export: true,
    drone: true,
    multilang: true,
    mapNav: true,
    prioritySupport: true,
    allFuture: true,
  },
};

export const STRINGS: Record<Language, Record<string, string>> = {
  en: {
    // tabs
    dashboard: "Dashboard", emergency: "Emergency", map: "Map", rides: "Rides", profile: "Profile",
    // accident
    accidentDetection: "Accident Detection", active: "ACTIVE", inactive: "INACTIVE",
    // contacts
    emergencyContacts: "Emergency Contacts", addContact: "Add Contact",
    // features
    voiceAgent: "Voice Agent", droneControl: "Drone Control",
    // ride
    rideHistory: "Ride History", settings: "Settings", subscription: "Subscription",
    language: "Language", upgrade: "Upgrade", premiumFeature: "Premium Feature",
    upgradeDesc: "Upgrade your plan to unlock this feature",
    // sos
    sos: "SOS", cancel: "Cancel", calling112: "Calling 112", countdown: "Countdown",
    confirmCall: "Confirm Emergency Call",
    // rides
    noRides: "No rides recorded yet", startRiding: "Start riding to see your history",
    duration: "Duration", distance: "Distance", maxSpeed: "Max Speed", avgSpeed: "Avg Speed",
    // dashboard
    greeting: "Good riding,", startRide: "Start Ride", stopRide: "Stop Ride",
    ridePaused: "Ride paused – stationary 3+ min",
    statDist: "Dist", statTime: "Time", statMax: "Max",
    labelSensor: "Sensor", labelContacts: "Contacts",
    sectionProtection: "PROTECTION", sectionVoiceAI: "VOICE AI", sectionDrone: "DRONE",
    gpsLost: "GPS signal lost – last known position shown",
    gpsEstimated: "GPS accuracy reduced – position is estimated",
    // emergency screen
    addContactTitle: "Add Emergency Contact",
    contactInfoSub: "This person will receive an SMS if an accident is detected",
    emergencyInfoText: "Emergency SMS sent automatically. 112 call requires {n}s voice confirmation.",
    labelName: "NAME", phFullName: "Full name", labelPhone: "PHONE",
    removeContactTitle: "Remove Contact",
    removeContactMsg: "This contact will no longer be notified in emergencies.",
    remove: "Remove", noContacts: "No contacts added yet",
    noContactsSub: "Add someone who should be notified if you crash",
    missingInfo: "Missing info", missingInfoMsg: "Please enter name and phone number.",
    // rides screen
    recordingRide: "Recording...", simulateRide: "Simulate Ride",
    clear: "Clear", totalRides: "Total Rides", totalDistance: "Total Distance",
    exportUnlock: "Unlock GPX/CSV Export",
    ridesLoggedText: "{n} RIDES LOGGED", ridesMax: "MAX",
    clearAllTitle: "Clear All Rides?", clearAllMsg: "This action cannot be undone.",
    // profile
    sectionAppearance: "APPEARANCE", displayMode: "Display Mode",
    displayModeDesc: "Light, Dark, or follow system",
    sectionFeatures: "FEATURES", sectionPreferences: "PREFERENCES", sectionAbout: "ABOUT",
    exportLabel: "GPX/CSV Export", emergencyCallLabel: "112 Emergency Call",
    enabled: "Enabled", locked: "Locked", onLabel: "On", offLabel: "Off",
    comingSoon: "Coming Soon", activeTier: "Active",
    versionLabel: "Version", privacyLabel: "Privacy Policy", supportLabel: "Support",
    appearanceLight: "Light", appearanceAuto: "Auto", appearanceDark: "Dark",
    // map
    whereTo: "Where are you going?", startNav: "Start Navigation",
    navLocked: "Navigation requires Basic plan or higher",
    quickHome: "Home", quickWork: "Work", quickFuel: "Fuel Station",
    arrived: "You have arrived!", endNav: "End",
    // accident overlay
    alertWarningTitle: "Are you OK?",
    alertWarningSub: "High G-force detected. Tap OK to dismiss.",
    alertWarningBtn: "I'm OK",
    alertAlertTitle: "Accident Detected!",
    alertAlertSub: "Cancel within countdown or contacts will be notified.",
    alertEmergencyTitle: "Emergency Mode",
    alertEmergencySub: "Notifying emergency contacts...",
    alertSmsCount: "SMS sent to {n} contact(s)",
    noContactsConfig: "No emergency contacts configured",
    call112: "Call 112",
    // voice agent
    voiceOff: "Voice Agent Off", voiceListening: "Listening for 'Hey MotoGuard'",
    voiceDetecting: "Detecting voice...", voiceResponding: "Responding...",
    voiceAutoManaged: "Auto-managed above 10 km/h",
    voiceUpgradePro: "Upgrade to Pro to enable",
    voiceHandsFree: "Wake word · Hands-free",
    noiseFilter: "Noise filter:", noiseFilterLow: "Low", noiseFilterMed: "Med", noiseFilterHigh: "High",
    volumeHint: "Press volume buttons to cancel",
    droneTitle: "DJI FPV Drone Integration",
    droneDesc: "Connect your DJI FPV drone for aerial ride footage, FOLLOW mode, ARC mode, and automatic GPS recovery.",
    droneFeature1: "Aerial ride footage",
    droneFeature2: "FOLLOW & ARC mode",
    droneFeature3: "Automatic GPS recovery",
    droneFeature4: "Accident scene documentation",
    droneEarlyAccess: "You'll get early access when it launches",
  },
  hu: {
    dashboard: "Irányítópult", emergency: "Vészhelyzet", map: "Térkép",
    rides: "Menetek", profile: "Profil",
    accidentDetection: "Balesetérzékelés", active: "AKTÍV", inactive: "INAKTÍV",
    emergencyContacts: "Sürgősségi kapcsolatok", addContact: "Kapcsolat hozzáadása",
    voiceAgent: "Hangügynök", droneControl: "Drón vezérlés",
    rideHistory: "Menetnapló", settings: "Beállítások", subscription: "Előfizetés",
    language: "Nyelv", upgrade: "Frissítés", premiumFeature: "Prémium funkció",
    upgradeDesc: "Frissítsd az előfizetésed a funkció eléréséhez",
    sos: "SOS", cancel: "Mégse", calling112: "Hívás: 112", countdown: "Visszaszámlálás",
    confirmCall: "Sürgősségi hívás megerősítése",
    noRides: "Még nincs rögzített menet",
    startRiding: "Kezdj el motorozni az előzmények megtekintéséhez",
    duration: "Időtartam", distance: "Távolság", maxSpeed: "Max sebesség", avgSpeed: "Átl. seb.",
    greeting: "Jó utat,", startRide: "Indulás", stopRide: "Megállás",
    ridePaused: "Menet szünetel – 3+ perc áll",
    statDist: "Táv", statTime: "Idő", statMax: "Max",
    labelSensor: "Szenzor", labelContacts: "Kontakt",
    sectionProtection: "VÉDELEM", sectionVoiceAI: "HANG AI", sectionDrone: "DRÓN",
    gpsLost: "GPS elveszett – utolsó ismert pozíció",
    gpsEstimated: "GPS pontosság csökkent – becsült pozíció",
    addContactTitle: "Sürgősségi kapcsolat hozzáadása",
    contactInfoSub: "Ez a személy SMS-t kap balesetérzékelés esetén",
    emergencyInfoText: "SOS SMS automatikusan elküldve. 112-es hívás {n}mp visszaszámlálást igényel.",
    labelName: "NÉV", phFullName: "Teljes név", labelPhone: "TELEFON",
    removeContactTitle: "Kapcsolat törlése",
    removeContactMsg: "Ez a személy nem kap értesítést vészhelyzet esetén.",
    remove: "Törlés", noContacts: "Nincs kapcsolat hozzáadva",
    noContactsSub: "Adj hozzá valakit, akit baleset esetén értesíteni kell",
    missingInfo: "Hiányzó adatok", missingInfoMsg: "Add meg a nevet és a telefonszámot.",
    recordingRide: "Rögzítés...", simulateRide: "Teszt menet",
    clear: "Törlés", totalRides: "Összes menet", totalDistance: "Összes táv",
    exportUnlock: "GPX/CSV export feloldása",
    ridesLoggedText: "{n} MENET RÖGZÍTVE", ridesMax: "MAX",
    clearAllTitle: "Összes menet törlése?", clearAllMsg: "Ez a művelet nem vonható vissza.",
    sectionAppearance: "MEGJELENÉS", displayMode: "Megjelenési mód",
    displayModeDesc: "Világos, Sötét vagy rendszer",
    sectionFeatures: "FUNKCIÓK", sectionPreferences: "BEÁLLÍTÁSOK", sectionAbout: "NÉVJEGY",
    exportLabel: "GPX/CSV export", emergencyCallLabel: "112 segélyhívás",
    enabled: "Aktív", locked: "Zárolt", onLabel: "Be", offLabel: "Ki",
    comingSoon: "Hamarosan", activeTier: "Aktív",
    versionLabel: "Verzió", privacyLabel: "Adatvédelem", supportLabel: "Támogatás",
    appearanceLight: "Világos", appearanceAuto: "Auto", appearanceDark: "Sötét",
    whereTo: "Hová mész?", startNav: "Navigáció indítása",
    navLocked: "Navigáció Basic csomag szükséges",
    quickHome: "Otthon", quickWork: "Munka", quickFuel: "Benzinkút",
    arrived: "Megérkeztél!", endNav: "Vége",
    alertWarningTitle: "Jól vagy?",
    alertWarningSub: "Nagy G-erő érzékelve. Nyomj OK-t a törléshez.",
    alertWarningBtn: "Jól vagyok",
    alertAlertTitle: "Baleset érzékelve!",
    alertAlertSub: "Visszaszámlálás előtt töröld, vagy értesítjük a kapcsolatokat.",
    alertEmergencyTitle: "Vészhelyzeti mód",
    alertEmergencySub: "Értesítjük a sürgősségi kapcsolatokat...",
    alertSmsCount: "SMS elküldve {n} kapcsolatnak",
    noContactsConfig: "Nincs beállítva sürgősségi kapcsolat",
    call112: "112 hívása",
    voiceOff: "Hangügynök kikapcsolva", voiceListening: "Figyel: 'Hey MotoGuard'",
    voiceDetecting: "Hang érzékelése...", voiceResponding: "Válaszol...",
    voiceAutoManaged: "Auto-kezelt 10 km/h felett",
    voiceUpgradePro: "Pro csomag szükséges",
    voiceHandsFree: "Ébresztőszó · Kézszabad",
    noiseFilter: "Zajszűrő:", noiseFilterLow: "Alacsony", noiseFilterMed: "Közepes", noiseFilterHigh: "Magas",
    volumeHint: "Hangerőgombokkal is megszakítható",
    droneTitle: "DJI FPV drón integráció",
    droneDesc: "Csatlakoztasd a DJI FPV drónod légi felvételekhez, FOLLOW módhoz, ARC módhoz és automatikus GPS helyreállításhoz.",
    droneFeature1: "Légi felvételek",
    droneFeature2: "FOLLOW & ARC mód",
    droneFeature3: "Automatikus GPS helyreállítás",
    droneFeature4: "Balesethelyszín dokumentálása",
    droneEarlyAccess: "Korai hozzáférést kapsz az induláskor",
  },
  de: {
    dashboard: "Dashboard", emergency: "Notfall", map: "Karte",
    rides: "Fahrten", profile: "Profil",
    accidentDetection: "Unfallerkennung", active: "AKTIV", inactive: "INAKTIV",
    emergencyContacts: "Notfallkontakte", addContact: "Kontakt hinzufügen",
    voiceAgent: "Sprachassistent", droneControl: "Drohnensteuerung",
    rideHistory: "Fahrtenverlauf", settings: "Einstellungen", subscription: "Abonnement",
    language: "Sprache", upgrade: "Upgrade", premiumFeature: "Premium-Funktion",
    upgradeDesc: "Upgraden Sie Ihren Plan, um diese Funktion zu nutzen",
    sos: "SOS", cancel: "Abbrechen", calling112: "Ruft 112 an", countdown: "Countdown",
    confirmCall: "Notruf bestätigen",
    noRides: "Noch keine Fahrten aufgezeichnet",
    startRiding: "Beginnen Sie zu fahren, um Ihren Verlauf zu sehen",
    duration: "Dauer", distance: "Distanz", maxSpeed: "Max. Geschw.", avgSpeed: "Ø Geschw.",
    greeting: "Gute Fahrt,", startRide: "Starten", stopRide: "Stoppen",
    ridePaused: "Fahrt pausiert – 3+ Min. still",
    statDist: "Dist", statTime: "Zeit", statMax: "Max",
    labelSensor: "Sensor", labelContacts: "Kontakte",
    sectionProtection: "SCHUTZ", sectionVoiceAI: "SPRACH KI", sectionDrone: "DROHNE",
    gpsLost: "GPS-Signal verloren – letzte Position",
    gpsEstimated: "GPS-Genauigkeit reduziert – Position geschätzt",
    addContactTitle: "Notfallkontakt hinzufügen",
    contactInfoSub: "Diese Person erhält eine SMS bei erkanntem Unfall",
    emergencyInfoText: "Notfall-SMS automatisch gesendet. 112-Anruf erfordert {n}s Countdown.",
    labelName: "NAME", phFullName: "Vollständiger Name", labelPhone: "TELEFON",
    removeContactTitle: "Kontakt entfernen",
    removeContactMsg: "Diese Person wird bei Notfällen nicht mehr benachrichtigt.",
    remove: "Entfernen", noContacts: "Keine Kontakte hinzugefügt",
    noContactsSub: "Füge jemanden hinzu, der bei einem Unfall benachrichtigt wird",
    missingInfo: "Fehlende Angaben", missingInfoMsg: "Bitte Name und Telefonnummer eingeben.",
    recordingRide: "Aufnahme...", simulateRide: "Fahrt simulieren",
    clear: "Löschen", totalRides: "Fahrten gesamt", totalDistance: "Gesamtdistanz",
    exportUnlock: "GPX/CSV Export freischalten",
    ridesLoggedText: "{n} FAHRTEN", ridesMax: "MAX",
    clearAllTitle: "Alle Fahrten löschen?", clearAllMsg: "Diese Aktion kann nicht rückgängig gemacht werden.",
    sectionAppearance: "DESIGN", displayMode: "Anzeigemodus",
    displayModeDesc: "Hell, Dunkel oder System",
    sectionFeatures: "FUNKTIONEN", sectionPreferences: "EINSTELLUNGEN", sectionAbout: "ÜBER",
    exportLabel: "GPX/CSV Export", emergencyCallLabel: "112 Notruf",
    enabled: "Aktiviert", locked: "Gesperrt", onLabel: "An", offLabel: "Aus",
    comingSoon: "Demnächst", activeTier: "Aktiv",
    versionLabel: "Version", privacyLabel: "Datenschutz", supportLabel: "Support",
    appearanceLight: "Hell", appearanceAuto: "Auto", appearanceDark: "Dunkel",
    whereTo: "Wohin?", startNav: "Navigation starten",
    navLocked: "Navigation ab Basic-Plan verfügbar",
    quickHome: "Zuhause", quickWork: "Arbeit", quickFuel: "Tankstelle",
    arrived: "Sie haben das Ziel erreicht!", endNav: "Ende",
    alertWarningTitle: "Alles OK?",
    alertWarningSub: "Hohe G-Kraft erkannt. OK drücken zum Schließen.",
    alertWarningBtn: "Alles OK",
    alertAlertTitle: "Unfall erkannt!",
    alertAlertSub: "Abbrechen vor dem Countdown oder Kontakte werden benachrichtigt.",
    alertEmergencyTitle: "Notfallmodus",
    alertEmergencySub: "Notfallkontakte werden benachrichtigt...",
    alertSmsCount: "SMS an {n} Kontakt(e) gesendet",
    noContactsConfig: "Keine Notfallkontakte konfiguriert",
    call112: "112 anrufen",
    voiceOff: "Sprachassistent aus", voiceListening: "Höre auf 'Hey MotoGuard'",
    voiceDetecting: "Spracherkennung...", voiceResponding: "Antwortet...",
    voiceAutoManaged: "Automatisch über 10 km/h",
    voiceUpgradePro: "Pro-Plan erforderlich",
    voiceHandsFree: "Aktivierungswort · Freihändig",
    noiseFilter: "Rauschfilter:", noiseFilterLow: "Niedrig", noiseFilterMed: "Mittel", noiseFilterHigh: "Hoch",
    volumeHint: "Lautstärketasten zum Abbrechen",
    droneTitle: "DJI FPV Drohnen-Integration",
    droneDesc: "Verbinden Sie Ihre DJI FPV Drohne für Luftaufnahmen, FOLLOW-Modus, ARC-Modus und automatische GPS-Wiederherstellung.",
    droneFeature1: "Luftaufnahmen",
    droneFeature2: "FOLLOW & ARC-Modus",
    droneFeature3: "Automatische GPS-Wiederherstellung",
    droneFeature4: "Unfallstellen-Dokumentation",
    droneEarlyAccess: "Du erhältst frühen Zugang beim Launch",
  },
  es: {
    dashboard: "Panel", emergency: "Emergencia", map: "Mapa",
    rides: "Viajes", profile: "Perfil",
    accidentDetection: "Detección de accidentes", active: "ACTIVO", inactive: "INACTIVO",
    emergencyContacts: "Contactos de emergencia", addContact: "Agregar contacto",
    voiceAgent: "Agente de voz", droneControl: "Control de dron",
    rideHistory: "Historial de viajes", settings: "Configuración", subscription: "Suscripción",
    language: "Idioma", upgrade: "Mejorar", premiumFeature: "Función premium",
    upgradeDesc: "Mejora tu plan para desbloquear esta función",
    sos: "SOS", cancel: "Cancelar", calling112: "Llamando al 112", countdown: "Cuenta atrás",
    confirmCall: "Confirmar llamada de emergencia",
    noRides: "No hay viajes registrados aún",
    startRiding: "Empieza a montar para ver tu historial",
    duration: "Duración", distance: "Distancia", maxSpeed: "Vel. máx.", avgSpeed: "Vel. prom.",
    greeting: "Buen viaje,", startRide: "Iniciar", stopRide: "Parar",
    ridePaused: "Viaje pausado – inmóvil 3+ min",
    statDist: "Dist", statTime: "Tpo", statMax: "Máx",
    labelSensor: "Sensor", labelContacts: "Contactos",
    sectionProtection: "PROTECCIÓN", sectionVoiceAI: "VOZ IA", sectionDrone: "DRON",
    gpsLost: "Señal GPS perdida – última posición",
    gpsEstimated: "Precisión GPS reducida – posición estimada",
    addContactTitle: "Agregar contacto de emergencia",
    contactInfoSub: "Esta persona recibirá un SMS si se detecta un accidente",
    emergencyInfoText: "SMS de emergencia enviado automáticamente. La llamada al 112 requiere {n}s de cuenta atrás.",
    labelName: "NOMBRE", phFullName: "Nombre completo", labelPhone: "TELÉFONO",
    removeContactTitle: "Eliminar contacto",
    removeContactMsg: "Esta persona no recibirá avisos en emergencias.",
    remove: "Eliminar", noContacts: "Sin contactos añadidos",
    noContactsSub: "Añade a alguien que deba ser notificado si tienes un accidente",
    missingInfo: "Datos incompletos", missingInfoMsg: "Por favor ingresa nombre y teléfono.",
    recordingRide: "Grabando...", simulateRide: "Simular viaje",
    clear: "Borrar", totalRides: "Total viajes", totalDistance: "Dist. total",
    exportUnlock: "Desbloquear Export GPX/CSV",
    ridesLoggedText: "{n} VIAJES", ridesMax: "MÁX",
    clearAllTitle: "¿Borrar todos los viajes?", clearAllMsg: "Esta acción no se puede deshacer.",
    sectionAppearance: "APARIENCIA", displayMode: "Modo de pantalla",
    displayModeDesc: "Claro, Oscuro o sistema",
    sectionFeatures: "FUNCIONES", sectionPreferences: "PREFERENCIAS", sectionAbout: "ACERCA DE",
    exportLabel: "Export GPX/CSV", emergencyCallLabel: "Llamada 112",
    enabled: "Activado", locked: "Bloqueado", onLabel: "Sí", offLabel: "No",
    comingSoon: "Próximamente", activeTier: "Activo",
    versionLabel: "Versión", privacyLabel: "Privacidad", supportLabel: "Soporte",
    appearanceLight: "Claro", appearanceAuto: "Auto", appearanceDark: "Oscuro",
    whereTo: "¿A dónde vas?", startNav: "Iniciar navegación",
    navLocked: "Navegación requiere plan Basic",
    quickHome: "Casa", quickWork: "Trabajo", quickFuel: "Gasolinera",
    arrived: "¡Has llegado!", endNav: "Fin",
    alertWarningTitle: "¿Estás bien?",
    alertWarningSub: "Alta fuerza G detectada. Toca OK para descartar.",
    alertWarningBtn: "Estoy bien",
    alertAlertTitle: "¡Accidente detectado!",
    alertAlertSub: "Cancela antes del conteo o se notificará a tus contactos.",
    alertEmergencyTitle: "Modo de emergencia",
    alertEmergencySub: "Notificando a los contactos de emergencia...",
    alertSmsCount: "SMS enviado a {n} contacto(s)",
    noContactsConfig: "Sin contactos de emergencia configurados",
    call112: "Llamar al 112",
    voiceOff: "Agente de voz apagado", voiceListening: "Escucha 'Hey MotoGuard'",
    voiceDetecting: "Detectando voz...", voiceResponding: "Respondiendo...",
    voiceAutoManaged: "Auto-gestionado sobre 10 km/h",
    voiceUpgradePro: "Se requiere plan Pro",
    voiceHandsFree: "Palabra de activación · Manos libres",
    noiseFilter: "Filtro de ruido:", noiseFilterLow: "Bajo", noiseFilterMed: "Med", noiseFilterHigh: "Alto",
    volumeHint: "Botones de volumen para cancelar",
    droneTitle: "Integración DJI FPV Dron",
    droneDesc: "Conecta tu dron DJI FPV para imágenes aéreas, modo FOLLOW, modo ARC y recuperación GPS automática.",
    droneFeature1: "Imágenes aéreas",
    droneFeature2: "Modo FOLLOW & ARC",
    droneFeature3: "Recuperación GPS automática",
    droneFeature4: "Documentación del lugar del accidente",
    droneEarlyAccess: "Obtendrás acceso anticipado cuando se lance",
  },
  it: {
    dashboard: "Cruscotto", emergency: "Emergenza", map: "Mappa",
    rides: "Viaggi", profile: "Profilo",
    accidentDetection: "Rilevamento incidenti", active: "ATTIVO", inactive: "INATTIVO",
    emergencyContacts: "Contatti di emergenza", addContact: "Aggiungi contatto",
    voiceAgent: "Assistente vocale", droneControl: "Controllo drone",
    rideHistory: "Cronologia viaggi", settings: "Impostazioni", subscription: "Abbonamento",
    language: "Lingua", upgrade: "Aggiorna", premiumFeature: "Funzione premium",
    upgradeDesc: "Aggiorna il tuo piano per sbloccare questa funzione",
    sos: "SOS", cancel: "Annulla", calling112: "Chiamata al 112", countdown: "Conto alla rovescia",
    confirmCall: "Conferma chiamata di emergenza",
    noRides: "Nessun viaggio registrato",
    startRiding: "Inizia a guidare per vedere la cronologia",
    duration: "Durata", distance: "Distanza", maxSpeed: "Vel. max", avgSpeed: "Vel. media",
    greeting: "Buona guida,", startRide: "Inizia", stopRide: "Ferma",
    ridePaused: "Viaggio in pausa – fermo 3+ min",
    statDist: "Dist", statTime: "Tpo", statMax: "Máx",
    labelSensor: "Sensore", labelContacts: "Contatti",
    sectionProtection: "PROTEZIONE", sectionVoiceAI: "VOCE IA", sectionDrone: "DRONE",
    gpsLost: "Segnale GPS perso – ultima posizione",
    gpsEstimated: "Precisione GPS ridotta – posizione stimata",
    addContactTitle: "Aggiungi contatto d'emergenza",
    contactInfoSub: "Questa persona riceverà un SMS se viene rilevato un incidente",
    emergencyInfoText: "SMS di emergenza inviato automaticamente. La chiamata al 112 richiede {n}s di conto alla rovescia.",
    labelName: "NOME", phFullName: "Nome completo", labelPhone: "TELEFONO",
    removeContactTitle: "Rimuovi contatto",
    removeContactMsg: "Questa persona non verrà notificata nelle emergenze.",
    remove: "Rimuovi", noContacts: "Nessun contatto aggiunto",
    noContactsSub: "Aggiungi qualcuno da notificare in caso di incidente",
    missingInfo: "Dati mancanti", missingInfoMsg: "Inserisci nome e numero di telefono.",
    recordingRide: "Registrazione...", simulateRide: "Simula viaggio",
    clear: "Cancella", totalRides: "Viaggi totali", totalDistance: "Dist. tot.",
    exportUnlock: "Sblocca Export GPX/CSV",
    ridesLoggedText: "{n} VIAGGI", ridesMax: "MAX",
    clearAllTitle: "Cancellare tutti i viaggi?", clearAllMsg: "Quest'azione non può essere annullata.",
    sectionAppearance: "ASPETTO", displayMode: "Modalità display",
    displayModeDesc: "Chiaro, Scuro o sistema",
    sectionFeatures: "FUNZIONI", sectionPreferences: "PREFERENZE", sectionAbout: "INFO",
    exportLabel: "Export GPX/CSV", emergencyCallLabel: "Chiamata 112",
    enabled: "Attivo", locked: "Bloccato", onLabel: "Sì", offLabel: "No",
    comingSoon: "Prossimamente", activeTier: "Attivo",
    versionLabel: "Versione", privacyLabel: "Informativa privacy", supportLabel: "Supporto",
    appearanceLight: "Chiaro", appearanceAuto: "Auto", appearanceDark: "Scuro",
    whereTo: "Dove vuoi andare?", startNav: "Avvia navigazione",
    navLocked: "Navigazione richiede piano Basic",
    quickHome: "Casa", quickWork: "Lavoro", quickFuel: "Benzinaio",
    arrived: "Sei arrivato!", endNav: "Fine",
    alertWarningTitle: "Stai bene?",
    alertWarningSub: "G-force elevata rilevata. Tocca OK per ignorare.",
    alertWarningBtn: "Sto bene",
    alertAlertTitle: "Incidente rilevato!",
    alertAlertSub: "Annulla entro il conto alla rovescia o i contatti saranno avvisati.",
    alertEmergencyTitle: "Modalità emergenza",
    alertEmergencySub: "Notifica dei contatti di emergenza...",
    alertSmsCount: "SMS inviato a {n} contatto/i",
    noContactsConfig: "Nessun contatto di emergenza configurato",
    call112: "Chiama il 112",
    voiceOff: "Assistente vocale spento", voiceListening: "In ascolto: 'Hey MotoGuard'",
    voiceDetecting: "Rilevamento voce...", voiceResponding: "Risposta...",
    voiceAutoManaged: "Auto-gestito oltre 10 km/h",
    voiceUpgradePro: "Piano Pro richiesto",
    voiceHandsFree: "Parola di attivazione · Vivavoce",
    noiseFilter: "Filtro rumore:", noiseFilterLow: "Basso", noiseFilterMed: "Med", noiseFilterHigh: "Alto",
    volumeHint: "Tasti volume per annullare",
    droneTitle: "Integrazione DJI FPV Drone",
    droneDesc: "Connetti il tuo drone DJI FPV per riprese aeree, modalità FOLLOW, modalità ARC e recupero GPS automatico.",
    droneFeature1: "Riprese aeree",
    droneFeature2: "Modalità FOLLOW & ARC",
    droneFeature3: "Recupero GPS automatico",
    droneFeature4: "Documentazione della scena dell'incidente",
    droneEarlyAccess: "Avrai accesso anticipato al lancio",
  },
  pt: {
    dashboard: "Painel", emergency: "Emergência", map: "Mapa",
    rides: "Viagens", profile: "Perfil",
    accidentDetection: "Detecção de acidentes", active: "ATIVO", inactive: "INATIVO",
    emergencyContacts: "Contactos de emergência", addContact: "Adicionar contacto",
    voiceAgent: "Agente de voz", droneControl: "Controlo de drone",
    rideHistory: "Histórico de viagens", settings: "Configurações", subscription: "Subscrição",
    language: "Idioma", upgrade: "Atualizar", premiumFeature: "Funcionalidade premium",
    upgradeDesc: "Atualize o seu plano para desbloquear esta funcionalidade",
    sos: "SOS", cancel: "Cancelar", calling112: "A ligar 112", countdown: "Contagem regressiva",
    confirmCall: "Confirmar chamada de emergência",
    noRides: "Ainda não há viagens registadas",
    startRiding: "Comece a andar para ver o seu historial",
    duration: "Duração", distance: "Distância", maxSpeed: "Vel. máx.", avgSpeed: "Vel. média",
    greeting: "Boa viagem,", startRide: "Iniciar", stopRide: "Parar",
    ridePaused: "Viagem pausada – parado 3+ min",
    statDist: "Dist", statTime: "Tpo", statMax: "Máx",
    labelSensor: "Sensor", labelContacts: "Contactos",
    sectionProtection: "PROTEÇÃO", sectionVoiceAI: "VOZ IA", sectionDrone: "DRONE",
    gpsLost: "Sinal GPS perdido – última posição",
    gpsEstimated: "Precisão GPS reduzida – posição estimada",
    addContactTitle: "Adicionar contacto de emergência",
    contactInfoSub: "Esta pessoa receberá um SMS se for detetado um acidente",
    emergencyInfoText: "SMS de emergência enviado automaticamente. A chamada 112 requer {n}s de contagem.",
    labelName: "NOME", phFullName: "Nome completo", labelPhone: "TELEFONE",
    removeContactTitle: "Remover contacto",
    removeContactMsg: "Esta pessoa não será notificada em emergências.",
    remove: "Remover", noContacts: "Nenhum contacto adicionado",
    noContactsSub: "Adiciona alguém a notificar em caso de acidente",
    missingInfo: "Dados em falta", missingInfoMsg: "Introduza o nome e o número de telefone.",
    recordingRide: "A gravar...", simulateRide: "Simular viagem",
    clear: "Limpar", totalRides: "Viagens totais", totalDistance: "Dist. total",
    exportUnlock: "Desbloquear Export GPX/CSV",
    ridesLoggedText: "{n} VIAGENS", ridesMax: "MÁX",
    clearAllTitle: "Limpar todas as viagens?", clearAllMsg: "Esta ação não pode ser desfeita.",
    sectionAppearance: "APARÊNCIA", displayMode: "Modo de ecrã",
    displayModeDesc: "Claro, Escuro ou sistema",
    sectionFeatures: "FUNÇÕES", sectionPreferences: "PREFERÊNCIAS", sectionAbout: "SOBRE",
    exportLabel: "Export GPX/CSV", emergencyCallLabel: "Chamada 112",
    enabled: "Ativo", locked: "Bloqueado", onLabel: "Sim", offLabel: "Não",
    comingSoon: "Em breve", activeTier: "Ativo",
    versionLabel: "Versão", privacyLabel: "Política de privacidade", supportLabel: "Suporte",
    appearanceLight: "Claro", appearanceAuto: "Auto", appearanceDark: "Escuro",
    whereTo: "Para onde vai?", startNav: "Iniciar navegação",
    navLocked: "Navegação requer plano Basic",
    quickHome: "Casa", quickWork: "Trabalho", quickFuel: "Posto comb.",
    arrived: "Chegou ao destino!", endNav: "Fim",
    alertWarningTitle: "Estás bem?",
    alertWarningSub: "Força G elevada detetada. Toca OK para ignorar.",
    alertWarningBtn: "Estou bem",
    alertAlertTitle: "Acidente detetado!",
    alertAlertSub: "Cancela antes da contagem ou os contactos serão notificados.",
    alertEmergencyTitle: "Modo de emergência",
    alertEmergencySub: "A notificar contactos de emergência...",
    alertSmsCount: "SMS enviado a {n} contacto(s)",
    noContactsConfig: "Nenhum contacto de emergência configurado",
    call112: "Ligar 112",
    voiceOff: "Agente de voz desligado", voiceListening: "A ouvir 'Hey MotoGuard'",
    voiceDetecting: "A detetar voz...", voiceResponding: "A responder...",
    voiceAutoManaged: "Auto-gerido acima de 10 km/h",
    voiceUpgradePro: "Requer plano Pro",
    voiceHandsFree: "Palavra de ativação · Mãos livres",
    noiseFilter: "Filtro de ruído:", noiseFilterLow: "Baixo", noiseFilterMed: "Med", noiseFilterHigh: "Alto",
    volumeHint: "Botões de volume para cancelar",
    droneTitle: "Integração DJI FPV Drone",
    droneDesc: "Liga o teu drone DJI FPV para filmagens aéreas, modo FOLLOW, modo ARC e recuperação GPS automática.",
    droneFeature1: "Filmagens aéreas",
    droneFeature2: "Modo FOLLOW & ARC",
    droneFeature3: "Recuperação GPS automática",
    droneFeature4: "Documentação do local do acidente",
    droneEarlyAccess: "Terás acesso antecipado no lançamento",
  },
};
