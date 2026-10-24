import { createSignal } from "solid-js";

import { i18n } from "@lingui/core";

/**
 * Texts for the stoat-custom features.
 *
 * Kept out of the Lingui catalogs on purpose: those are changed upstream all
 * the time and would conflict on every update. Every key needs both languages.
 */
const STRINGS = {
  voiceActivationTitle: { en: "Microphone input", de: "Mikrofon-Eingabe" },
  gateEnable: { en: "Volume gate", de: "Volume Gate" },
  gateEnableDescription: {
    en: "Only transmit while your voice is louder than the threshold",
    de: "Nur senden, solange deine Stimme lauter als die Schwelle ist",
  },
  gateThreshold: { en: "Gate threshold", de: "Schwelle" },
  micTestStart: { en: "Test microphone", de: "Mikrofon testen" },
  micTestStop: { en: "Stop test", de: "Test beenden" },
  micLevel: { en: "Microphone level", de: "Mikrofonpegel" },
  gateOpen: { en: "Transmitting", de: "Wird gesendet" },
  gateClosed: { en: "Muted by gate", de: "Vom Gate stumm" },
  gateOff: {
    en: "Gate off – everything is transmitted",
    de: "Gate aus – alles wird gesendet",
  },
  gateOffShort: { en: "gate off", de: "Gate aus" },
  levelLabel: { en: "Level", de: "Pegel" },
  inputMode: { en: "Input mode", de: "Eingabemodus" },
  inputModeVoice: { en: "Voice activation", de: "Sprachaktivierung" },
  inputModePtt: { en: "Push-to-talk", de: "Push-to-Talk" },
  pttKey: { en: "Push-to-talk key", de: "Push-to-Talk-Taste" },
  pttKeyNone: {
    en: "No key set yet – microphone stays closed",
    de: "Noch keine Taste festgelegt – Mikro bleibt zu",
  },
  pttRecord: { en: "Set key", de: "Taste festlegen" },
  pttRecording: {
    en: "Press a key or mouse button … (Esc cancels)",
    de: "Taste oder Maustaste drücken … (Esc bricht ab)",
  },
  pttRejected: {
    en: "This key cannot be used",
    de: "Diese Taste geht nicht",
  },
  pttClear: { en: "Remove", de: "Entfernen" },
  pttReleaseDelay: { en: "Release delay", de: "Loslass-Verzögerung" },
  pttSound: {
    en: "Sound on press and release",
    de: "Ton beim Drücken und Loslassen",
  },
  pttBrowserHint: {
    en: "Only works while this window is focused. Use the desktop client for push-to-talk in games.",
    de: "Funktioniert nur, solange dieses Fenster im Vordergrund ist. Für Push-to-Talk im Spiel den Desktop-Client nutzen.",
  },
  pttDesktopHint: {
    en: "Also works while another program is focused. Games running as administrator or with anti-cheat may block the key.",
    de: "Funktioniert auch, wenn ein anderes Programm im Vordergrund ist. Spiele mit Adminrechten oder Anti-Cheat können die Taste blockieren.",
  },
  pttNativeUnavailable: {
    en: "Global keys are not available – push-to-talk only works while this window is focused.",
    de: "Globale Tasten nicht verfügbar – Push-to-Talk nur, solange dieses Fenster im Vordergrund ist.",
  },
  micTestError: {
    en: "Could not access the microphone",
    de: "Kein Zugriff auf das Mikrofon",
  },
} satisfies Record<string, { en: string; de: string }>;

/**
 * Key of a custom text
 */
export type CustomStringKey = keyof typeof STRINGS;

const [locale, setLocale] = createSignal(i18n.locale ?? "en");
i18n.on("change", () => setLocale(i18n.locale));

/**
 * Active app language for labels created in pure modules
 */
export function currentLanguage(): "de" | "en" {
  return locale().startsWith("de") ? "de" : "en";
}

/**
 * Get a custom text in the active app language (German or English)
 * @param key Text key
 */
export function t(key: CustomStringKey): string {
  const entry = STRINGS[key];
  return locale().startsWith("de") ? entry.de : entry.en;
}
