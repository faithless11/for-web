/**
 * Browser push-to-talk bindings: create them from input events and match
 * events against them. Pure module, unit tested with `node --test`.
 */
import type { PttBinding } from "../voice/settings.ts";

/**
 * Language used for labels
 */
export type LabelLanguage = "en" | "de";

/**
 * Mouse buttons that can never be bound (left, right click)
 */
const REJECTED_BUTTONS = [0, 2];

/**
 * Human readable name of a mouse button
 * @param button MouseEvent.button
 * @param lang Label language
 */
export function mouseButtonLabel(button: number, lang: LabelLanguage): string {
  if (button === 1)
    return lang === "de" ? "Mittlere Maustaste" : "Middle mouse";
  return `${lang === "de" ? "Maus" : "Mouse"} ${button + 1}`;
}

/**
 * Human readable name of a key from its KeyboardEvent.code
 * @param code KeyboardEvent.code
 */
export function keyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return code;
}

/**
 * Create a binding from a key press
 * @returns Binding, or null if the key cannot be bound (Escape cancels)
 */
export function bindingFromKeyboard(
  event: Pick<KeyboardEvent, "code" | "key">,
): PttBinding | null {
  if (!event.code || event.code === "Escape") return null;
  return { kind: "key", code: event.code, label: keyLabel(event.code) };
}

/**
 * Create a binding from a mouse button press
 * @returns Binding, or null if the button cannot be bound (left/right click)
 */
export function bindingFromMouse(
  event: Pick<MouseEvent, "button">,
  lang: LabelLanguage,
): PttBinding | null {
  if (REJECTED_BUTTONS.includes(event.button)) return null;
  return {
    kind: "mouse",
    button: event.button,
    label: mouseButtonLabel(event.button, lang),
  };
}

/**
 * Whether a keyboard event belongs to the binding
 */
export function matchesKeyboard(
  binding: PttBinding,
  event: Pick<KeyboardEvent, "code">,
): boolean {
  return binding.kind === "key" && binding.code === event.code;
}

/**
 * Whether a mouse event belongs to the binding
 */
export function matchesMouse(
  binding: PttBinding,
  event: Pick<MouseEvent, "button">,
): boolean {
  return binding.kind === "mouse" && binding.button === event.button;
}
