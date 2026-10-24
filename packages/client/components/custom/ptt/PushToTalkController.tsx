import { createEffect, createSignal, onCleanup } from "solid-js";

import { useSound } from "@revolt/client";
import { useState } from "@revolt/state";

import { setPushToTalkOpen } from "../gate/GateNode";

import { matchesKeyboard, matchesMouse } from "./bindings";
import { getNativePtt } from "./native";
import { PttCore } from "./pttCore";

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
 * Drives push-to-talk while connected to a voice channel.
 *
 * In the stoat-custom desktop client the global hook reports the key (works
 * while a game is focused); in the browser the key is only seen while this
 * window is focused. Mounted inside the room audio manager, so it only lives
 * while connected; leaving the call closes the microphone.
 */
export function PushToTalkController() {
  const state = useState();
  const sound = useSound();
  const native = getNativePtt();
  const [nativeAvailable, setNativeAvailable] = createSignal(false);

  const core = new PttCore({
    releaseDelayMs: state.customVoice.pttReleaseDelayMs,
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    onChange: (open) => {
      setPushToTalkOpen(open);
      if (state.customVoice.pttSound) {
        sound.playSound(open ? "unmute" : "mute", true);
      }
    },
  });

  native
    ?.available()
    .then(setNativeAvailable)
    .catch(() => setNativeAvailable(false));

  createEffect(() => core.setReleaseDelay(state.customVoice.pttReleaseDelayMs));

  createEffect(() => {
    // any change of mode, binding or input source starts from "released"
    core.reset();
    if (state.customVoice.inputMode !== "ptt") return;

    if (native && nativeAvailable()) {
      native.listen(state.customVoice.pttNativeBinding ?? null);
      const unsubscribe = native.onState((pressed) =>
        pressed ? core.press() : core.release(),
      );
      onCleanup(() => {
        unsubscribe();
        native.listen(null);
        core.reset();
      });
      return;
    }

    const binding = state.customVoice.pttBinding;
    if (!binding) return;

    const keydown = (event: KeyboardEvent) => {
      if (!matchesKeyboard(binding, event) || isTextInput(event.target)) return;
      event.preventDefault();
      core.press();
    };
    const keyup = (event: KeyboardEvent) => {
      if (matchesKeyboard(binding, event)) core.release();
    };
    const mousedown = (event: MouseEvent) => {
      if (!matchesMouse(binding, event)) return;
      event.preventDefault();
      core.press();
    };
    const mouseup = (event: MouseEvent) => {
      if (!matchesMouse(binding, event)) return;
      // side buttons would otherwise navigate back/forward
      event.preventDefault();
      core.release();
    };
    const reset = () => core.reset();
    const visibility = () => {
      if (document.visibilityState === "hidden") core.reset();
    };

    window.addEventListener("keydown", keydown, true);
    window.addEventListener("keyup", keyup, true);
    window.addEventListener("mousedown", mousedown, true);
    window.addEventListener("mouseup", mouseup, true);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", visibility);
    onCleanup(() => {
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("keyup", keyup, true);
      window.removeEventListener("mousedown", mousedown, true);
      window.removeEventListener("mouseup", mouseup, true);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", visibility);
      core.reset();
    });
  });

  onCleanup(() => {
    core.reset();
    native?.listen(null);
  });

  return null;
}
