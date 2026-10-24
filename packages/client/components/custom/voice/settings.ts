/**
 * Settings for the stoat-custom voice features (volume gate, push-to-talk).
 *
 * Pure module without imports so it can be unit tested with `node --test`.
 */

/**
 * How the microphone is opened: by voice (optionally gated) or push-to-talk
 */
export type InputMode = "voice" | "ptt";

/**
 * Push-to-talk binding captured in the browser
 */
export type PttBinding =
  | { kind: "key"; code: string; label: string }
  | { kind: "mouse"; button: number; label: string };

/**
 * Push-to-talk binding captured by the desktop client's global hook (uiohook codes)
 */
export type NativePttBinding =
  | { kind: "key"; keycode: number; label: string }
  | { kind: "mouse"; button: number; label: string };

/**
 * Stored settings
 */
export interface TypeCustomVoice {
  gateEnabled: boolean;
  gateThresholdDb: number;
  inputMode: InputMode;
  pttBinding?: PttBinding;
  pttNativeBinding?: NativePttBinding;
  pttReleaseDelayMs: number;
  pttSound: boolean;
}

/**
 * Lowest and highest selectable gate threshold in dBFS
 */
export const GATE_THRESHOLD_MIN = -80;
export const GATE_THRESHOLD_MAX = 0;

/**
 * Highest selectable push-to-talk release delay in milliseconds
 */
export const PTT_RELEASE_DELAY_MAX = 1000;

/**
 * Browser mouse buttons that can never be used (left, right click)
 */
const REJECTED_DOM_BUTTONS = [0, 2];

/**
 * uiohook mouse buttons that can never be used (left, right click)
 */
const REJECTED_NATIVE_BUTTONS = [1, 2];

/**
 * uiohook keycode of Escape (reserved for cancelling)
 */
export const NATIVE_ESCAPE_KEYCODE = 1;

/**
 * Default settings
 */
export const CUSTOM_VOICE_DEFAULTS: TypeCustomVoice = Object.freeze({
  gateEnabled: false,
  gateThresholdDb: -50,
  inputMode: "voice",
  pttReleaseDelayMs: 200,
  pttSound: false,
}) as TypeCustomVoice;

/**
 * Clamp a number into a range, falling back for non-numbers
 */
function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Whether a value is an object with a non-empty string label
 */
function hasLabel(value: unknown): value is { kind: unknown; label: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { label?: unknown }).label === "string" &&
    (value as { label: string }).label.length > 0
  );
}

/**
 * Validate a browser binding, returning undefined if it is unusable
 */
export function cleanPttBinding(value: unknown): PttBinding | undefined {
  if (!hasLabel(value)) return undefined;
  const v = value as Record<string, unknown>;
  if (v.kind === "key") {
    if (typeof v.code !== "string" || !v.code || v.code === "Escape")
      return undefined;
    return { kind: "key", code: v.code, label: value.label };
  }
  if (v.kind === "mouse") {
    if (typeof v.button !== "number" || REJECTED_DOM_BUTTONS.includes(v.button))
      return undefined;
    return { kind: "mouse", button: v.button, label: value.label };
  }
  return undefined;
}

/**
 * Validate a desktop binding, returning undefined if it is unusable
 */
export function cleanNativePttBinding(
  value: unknown,
): NativePttBinding | undefined {
  if (!hasLabel(value)) return undefined;
  const v = value as Record<string, unknown>;
  if (v.kind === "key") {
    if (typeof v.keycode !== "number" || v.keycode === NATIVE_ESCAPE_KEYCODE)
      return undefined;
    return { kind: "key", keycode: v.keycode, label: value.label };
  }
  if (v.kind === "mouse") {
    if (
      typeof v.button !== "number" ||
      REJECTED_NATIVE_BUTTONS.includes(v.button)
    )
      return undefined;
    return { kind: "mouse", button: v.button, label: value.label };
  }
  return undefined;
}

/**
 * Validate stored settings and return a compliant object
 * @param input Anything read from storage
 */
export function cleanCustomVoice(input: unknown): TypeCustomVoice {
  const data: TypeCustomVoice = { ...CUSTOM_VOICE_DEFAULTS };
  if (typeof input !== "object" || input === null) return data;
  const v = input as Record<string, unknown>;

  if (typeof v.gateEnabled === "boolean") data.gateEnabled = v.gateEnabled;
  data.gateThresholdDb = clampNumber(
    v.gateThresholdDb,
    GATE_THRESHOLD_MIN,
    GATE_THRESHOLD_MAX,
    CUSTOM_VOICE_DEFAULTS.gateThresholdDb,
  );
  if (v.inputMode === "voice" || v.inputMode === "ptt")
    data.inputMode = v.inputMode;

  const binding = cleanPttBinding(v.pttBinding);
  if (binding) data.pttBinding = binding;
  const nativeBinding = cleanNativePttBinding(v.pttNativeBinding);
  if (nativeBinding) data.pttNativeBinding = nativeBinding;

  data.pttReleaseDelayMs = clampNumber(
    v.pttReleaseDelayMs,
    0,
    PTT_RELEASE_DELAY_MAX,
    CUSTOM_VOICE_DEFAULTS.pttReleaseDelayMs,
  );
  if (typeof v.pttSound === "boolean") data.pttSound = v.pttSound;

  return data;
}
