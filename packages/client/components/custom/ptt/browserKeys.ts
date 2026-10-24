import type { PttBinding } from "../voice/settings";

import { matchesKeyboard, matchesMouse } from "./bindings";

/**
 * Whether an element is a text input where the push-to-talk key must not trigger
 */
function isTextInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * Listen for a push-to-talk binding in this window (foreground only).
 * @param binding Browser binding
 * @param handlers Called on press, release and when the key state is lost
 *   (window blurred or hidden)
 * @returns Function removing all listeners
 */
export function listenBrowserBinding(
  binding: PttBinding,
  handlers: { press: () => void; release: () => void; reset: () => void },
): () => void {
  const keydown = (event: KeyboardEvent) => {
    if (!matchesKeyboard(binding, event) || isTextInput(event.target)) return;
    event.preventDefault();
    handlers.press();
  };
  const keyup = (event: KeyboardEvent) => {
    if (!matchesKeyboard(binding, event)) return;
    // e.g. a lone Alt would otherwise move the focus to the browser menu
    if (!isTextInput(event.target)) event.preventDefault();
    handlers.release();
  };
  const mousedown = (event: MouseEvent) => {
    if (!matchesMouse(binding, event)) return;
    event.preventDefault();
    handlers.press();
  };
  const mouseup = (event: MouseEvent) => {
    if (!matchesMouse(binding, event)) return;
    // side buttons would otherwise navigate back/forward
    event.preventDefault();
    handlers.release();
  };
  const blur = () => handlers.reset();
  const visibility = () => {
    if (document.visibilityState === "hidden") handlers.reset();
  };

  window.addEventListener("keydown", keydown, true);
  window.addEventListener("keyup", keyup, true);
  window.addEventListener("mousedown", mousedown, true);
  window.addEventListener("mouseup", mouseup, true);
  window.addEventListener("blur", blur);
  document.addEventListener("visibilitychange", visibility);

  return () => {
    window.removeEventListener("keydown", keydown, true);
    window.removeEventListener("keyup", keyup, true);
    window.removeEventListener("mousedown", mousedown, true);
    window.removeEventListener("mouseup", mouseup, true);
    window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", visibility);
  };
}
