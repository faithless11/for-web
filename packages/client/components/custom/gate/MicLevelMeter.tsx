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
      // the test shows the gate, independent of push-to-talk
      processor.gate?.ignorePushToTalk();
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

  /**
   * Current state shown next to the button
   */
  const status = () =>
    !state.customVoice.gateEnabled ? "off" : open() ? "open" : "closed";

  return (
    <Column>
      <Row align>
        <Button variant="tonal" onPress={() => (test() ? stop() : start())}>
          {test() ? t("micTestStop") : t("micTestStart")}
        </Button>
        <Show when={test()}>
          <Status data-status={status()}>
            {status() === "off"
              ? t("gateOff")
              : status() === "open"
                ? t("gateOpen")
                : t("gateClosed")}
          </Status>
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
        data-gate={state.customVoice.gateEnabled ? "" : undefined}
      >
        <MutedZone
          style={{ width: `${toPercent(state.customVoice.gateThresholdDb)}%` }}
        />
        <Level
          data-open={test() && open() ? "" : undefined}
          style={{ width: `${toPercent(levelDb())}%` }}
        />
        <Threshold
          style={{ left: `${toPercent(state.customVoice.gateThresholdDb)}%` }}
        />
      </Meter>
      <Text class="label">
        {test() ? `${t("levelLabel")} ${Math.round(levelDb())} dB · ` : ""}
        {`${t("gateThreshold")} ${state.customVoice.gateThresholdDb} dB`}
        {state.customVoice.gateEnabled ? "" : ` (${t("gateOffShort")})`}
      </Text>
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
 * Gate state indicator next to the test button
 */
const Status = styled("span", {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
    fontWeight: 600,
    color: "var(--md-sys-color-on-surface-variant)",
    "&::before": {
      content: "''",
      width: "10px",
      height: "10px",
      borderRadius: "var(--borderRadius-full)",
      background: "var(--md-sys-color-outline)",
    },
    "&[data-status=open]": {
      color: "var(--brand-presence-online)",
    },
    "&[data-status=open]::before": {
      background: "var(--brand-presence-online)",
    },
    "&[data-status=closed]": {
      color: "var(--md-sys-color-error)",
    },
    "&[data-status=closed]::before": {
      background: "var(--md-sys-color-error)",
    },
  },
});

/**
 * Meter track; the part above the threshold is the "transmitting" zone
 */
const Meter = styled("div", {
  base: {
    position: "relative",
    height: "20px",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-container-highest)",
    overflow: "hidden",
  },
});

/**
 * Zone below the threshold, where the gate mutes
 */
const MutedZone = styled("div", {
  base: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    background: "var(--md-sys-color-error)",
    opacity: 0,
    "[data-gate] > &": {
      opacity: 0.18,
    },
  },
});

/**
 * Current level bar
 */
const Level = styled("div", {
  base: {
    position: "absolute",
    top: "5px",
    bottom: "5px",
    left: 0,
    borderRadius: "var(--borderRadius-sm)",
    background: "var(--md-sys-color-outline)",
    transition: "width 50ms linear",
    "&[data-open]": {
      background: "var(--brand-presence-online)",
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
    width: "4px",
    marginLeft: "-2px",
    borderRadius: "var(--borderRadius-sm)",
    background: "var(--md-sys-color-on-surface)",
    opacity: 0.35,
    "[data-gate] > &": {
      opacity: 1,
    },
  },
});
