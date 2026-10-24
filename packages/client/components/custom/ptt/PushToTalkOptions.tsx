import { Match, Show, Switch, createSignal, onCleanup } from "solid-js";

import { useState } from "@revolt/state";
import {
  Button,
  CategoryButton,
  Checkbox,
  Column,
  Row,
  Slider,
  Text,
} from "@revolt/ui";

import { currentLanguage, t } from "../i18n";
import { PTT_RELEASE_DELAY_MAX } from "../voice/settings";

import { bindingFromKeyboard, bindingFromMouse } from "./bindings";
import { getNativePtt } from "./native";

/**
 * State of the "set key" capture
 */
type CaptureState = "idle" | "recording" | "rejected";

/**
 * Push-to-talk settings: mode, key, release delay, sound
 */
export function PushToTalkOptions() {
  const state = useState();
  const native = getNativePtt();
  const [nativeAvailable, setNativeAvailable] = createSignal<boolean>();
  const [capture, setCapture] = createSignal<CaptureState>("idle");

  native
    ?.available()
    .then(setNativeAvailable)
    .catch(() => setNativeAvailable(false));

  /**
   * Whether the desktop client's global hook is used for the key
   */
  const useNative = () => !!native && nativeAvailable() === true;

  /**
   * Label of the binding used in this environment
   */
  const bindingLabel = () =>
    useNative()
      ? state.customVoice.pttNativeBinding?.label
      : state.customVoice.pttBinding?.label;

  let stopBrowserCapture: (() => void) | undefined;
  onCleanup(() => stopBrowserCapture?.());

  /**
   * Capture the next key or mouse button in the browser
   */
  function captureInBrowser() {
    stopBrowserCapture?.();
    const finish = (result: ReturnType<typeof bindingFromKeyboard>) => {
      stopBrowserCapture?.();
      if (result) {
        state.customVoice.pttBinding = result;
        setCapture("idle");
      } else {
        setCapture("rejected");
      }
    };
    const keydown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        stopBrowserCapture?.();
        setCapture("idle");
        return;
      }
      finish(bindingFromKeyboard(event));
    };
    const mousedown = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      finish(bindingFromMouse(event, currentLanguage()));
    };
    // attach a little later: the button fires on press, so the rest of the
    // click that opened the capture must not be captured itself
    const timer = setTimeout(() => {
      window.addEventListener("keydown", keydown, true);
      window.addEventListener("mousedown", mousedown, true);
    }, 250);
    stopBrowserCapture = () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("mousedown", mousedown, true);
      stopBrowserCapture = undefined;
    };
  }

  /**
   * Start capturing a new key
   */
  function startCapture() {
    setCapture("recording");
    if (useNative()) {
      native!
        .record()
        .then((binding) => {
          if (binding) state.customVoice.pttNativeBinding = binding;
          setCapture("idle");
        })
        .catch(() => setCapture("rejected"));
    } else {
      captureInBrowser();
    }
  }

  /**
   * Remove the binding of this environment
   */
  function clearBinding() {
    if (useNative()) state.customVoice.pttNativeBinding = undefined;
    else state.customVoice.pttBinding = undefined;
  }

  return (
    <Column>
      <CategoryButton.Group>
        <CategoryButton.Select
          icon="blank"
          title={t("inputMode")}
          options={{
            voice: { title: t("inputModeVoice") },
            ptt: { title: t("inputModePtt") },
          }}
          value={state.customVoice.inputMode}
          onUpdate={(mode) => (state.customVoice.inputMode = mode)}
        />
      </CategoryButton.Group>
      <Show when={state.customVoice.inputMode === "ptt"}>
        <Text class="label">{t("pttKey")}</Text>
        <Row align>
          <Button variant="tonal" onPress={startCapture}>
            {t("pttRecord")}
          </Button>
          <Switch>
            <Match when={capture() === "recording"}>
              <Text class="label">{t("pttRecording")}</Text>
            </Match>
            <Match when={capture() === "rejected"}>
              <Text class="label">{t("pttRejected")}</Text>
            </Match>
            <Match when={bindingLabel()}>
              <Text class="title" size="small">
                {bindingLabel()}
              </Text>
              <Button variant="text" onPress={clearBinding}>
                {t("pttClear")}
              </Button>
            </Match>
            <Match when={true}>
              <Text class="label">{t("pttKeyNone")}</Text>
            </Match>
          </Switch>
        </Row>
        <Text class="label">
          {!native
            ? t("pttBrowserHint")
            : nativeAvailable() === false
              ? t("pttNativeUnavailable")
              : t("pttDesktopHint")}
        </Text>
        <Text class="label">{`${t("pttReleaseDelay")} ${state.customVoice.pttReleaseDelayMs} ms`}</Text>
        <Slider
          min={0}
          max={PTT_RELEASE_DELAY_MAX}
          step={50}
          value={state.customVoice.pttReleaseDelayMs}
          onInput={(event) =>
            (state.customVoice.pttReleaseDelayMs = event.currentTarget.value)
          }
          labelFormatter={(value) => `${value} ms`}
        />
        <CategoryButton.Group>
          <CategoryButton
            icon="blank"
            action={<Checkbox checked={state.customVoice.pttSound} />}
            onClick={() =>
              (state.customVoice.pttSound = !state.customVoice.pttSound)
            }
          >
            {t("pttSound")}
          </CategoryButton>
        </CategoryButton.Group>
      </Show>
    </Column>
  );
}
