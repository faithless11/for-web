import { createEffect, createSignal, onCleanup } from "solid-js";

import { useSound } from "@revolt/client";
import { useState } from "@revolt/state";

import { setPushToTalkOpen } from "../gate/GateNode";

import { listenBrowserBinding } from "./browserKeys";
import { getNativePtt } from "./native";
import { PttCore } from "./pttCore";

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

    const stop = listenBrowserBinding(binding, {
      press: () => core.press(),
      release: () => core.release(),
      reset: () => core.reset(),
    });
    onCleanup(() => {
      stop();
      core.reset();
    });
  });

  onCleanup(() => {
    core.reset();
    native?.listen(null);
  });

  return null;
}
