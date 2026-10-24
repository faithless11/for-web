import { Show, createSignal, onCleanup } from "solid-js";

import { Track } from "livekit-client";
import { styled } from "styled-system/jsx";

import { VoiceProcessor } from "@revolt/rtc/VoiceProcessor";
import { useState } from "@revolt/state";
import { Button, Row, Text } from "@revolt/ui";

import { t } from "../i18n";
import { GATE_THRESHOLD_MAX, GATE_THRESHOLD_MIN } from "../voice/settings";

/**
 * Convert a dBFS value into a percentage of the meter width
 */
function toPercent(db: number): number {
  const range = GATE_THRESHOLD_MAX - GATE_THRESHOLD_MIN;
  const clamped = Math.min(
    GATE_THRESHOLD_MAX,
    Math.max(GATE_THRESHOLD_MIN, db),
  );
  return ((clamped - GATE_THRESHOLD_MIN) / range) * 100;
}

/**
 * Running microphone test
 */
type MicTest = {
  stop: () => void;
};

/**
 * Microphone level meter with the gate threshold marker.
 *
 * Runs the microphone through the same pipeline as a call (noise suppression,
 * input volume, gate), so the level shown is what would be transmitted.
 */
export function MicLevelMeter() {
  const state = useState();
  const [test, setTest] = createSignal<MicTest>();
  const [levelDb, setLevelDb] = createSignal(GATE_THRESHOLD_MIN);
  const [open, setOpen] = createSignal(false);
  const [error, setError] = createSignal(false);

  /**
   * Start capturing the microphone
   */
  async function start() {
    setError(false);
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let processor: VoiceProcessor | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: state.voice.preferredAudioInputDevice
            ? { ideal: state.voice.preferredAudioInputDevice }
            : undefined,
          echoCancellation: state.voice.echoCancellation,
          autoGainControl: state.voice.autoGainControl,
          noiseSuppression: state.voice.noiseSupression === "browser",
        },
      });
      context = new AudioContext();
      processor = new VoiceProcessor(state.voice);
      await processor.init({
        kind: Track.Kind.Audio,
        track: stream.getAudioTracks()[0],
        audioContext: context,
      });
      const unsubscribe = processor.gate?.onLevel((db, isOpen) => {
        setLevelDb(db);
        setOpen(isOpen);
      });

      const captured = { stream, context, processor };
      setTest({
        stop() {
          unsubscribe?.();
          captured.processor.destroy();
          captured.stream.getTracks().forEach((track) => track.stop());
          captured.context.close();
        },
      });
    } catch (e) {
      console.warn("[stoat-custom] microphone test failed", e);
      processor?.destroy();
      stream?.getTracks().forEach((track) => track.stop());
      context?.close();
      setError(true);
    }
  }

  /**
   * Stop capturing the microphone
   */
  function stop() {
    test()?.stop();
    setTest(undefined);
    setLevelDb(GATE_THRESHOLD_MIN);
    setOpen(false);
  }

  onCleanup(stop);

  return (
    <Column>
      <Row align>
        <Button variant="tonal" onPress={() => (test() ? stop() : start())}>
          {test() ? t("micTestStop") : t("micTestStart")}
        </Button>
        <Show when={test()}>
          <Text class="label">{open() ? t("gateOpen") : t("gateClosed")}</Text>
        </Show>
        <Show when={error()}>
          <Text class="label">{t("micTestError")}</Text>
        </Show>
      </Row>
      <Meter
        role="meter"
        aria-label={t("micLevel")}
        aria-valuemin={GATE_THRESHOLD_MIN}
        aria-valuemax={GATE_THRESHOLD_MAX}
        aria-valuenow={Math.round(levelDb())}
      >
        <Level
          data-open={open() ? "" : undefined}
          style={{ width: `${toPercent(levelDb())}%` }}
        />
        <Show when={state.customVoice.gateEnabled}>
          <Threshold
            style={{ left: `${toPercent(state.customVoice.gateThresholdDb)}%` }}
          />
        </Show>
      </Meter>
    </Column>
  );
}

/**
 * Vertical layout of the meter
 */
const Column = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-md)",
  },
});

/**
 * Meter track
 */
const Meter = styled("div", {
  base: {
    position: "relative",
    height: "12px",
    borderRadius: "var(--borderRadius-full)",
    background: "var(--md-sys-color-surface-container-highest)",
    overflow: "hidden",
  },
});

/**
 * Current level bar
 */
const Level = styled("div", {
  base: {
    height: "100%",
    background: "var(--md-sys-color-outline)",
    transition: "width 50ms linear",
    "&[data-open]": {
      background: "var(--md-sys-color-primary)",
    },
  },
});

/**
 * Threshold marker
 */
const Threshold = styled("div", {
  base: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "2px",
    background: "var(--md-sys-color-on-surface)",
  },
});
