import { createSignal } from "solid-js";

import { i18n } from "@lingui/core";

/**
 * Texts for the stoat-custom features.
 *
 * Kept out of the Lingui catalogs on purpose: those are changed upstream all
 * the time and would conflict on every update. Every key needs both languages.
 */
const STRINGS = {
  voiceActivationTitle: { en: "Voice activation", de: "Sprachaktivierung" },
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
 * Get a custom text in the active app language (German or English)
 * @param key Text key
 */
export function t(key: CustomStringKey): string {
  const entry = STRINGS[key];
  return locale().startsWith("de") ? entry.de : entry.en;
}
