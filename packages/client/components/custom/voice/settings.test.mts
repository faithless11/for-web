import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CUSTOM_VOICE_DEFAULTS, cleanCustomVoice } from "./settings.ts";

describe("cleanCustomVoice", () => {
  test("undefined input yields defaults", () => {
    assert.deepEqual(cleanCustomVoice(undefined), CUSTOM_VOICE_DEFAULTS);
    assert.deepEqual(CUSTOM_VOICE_DEFAULTS, {
      gateEnabled: false,
      gateThresholdDb: -50,
      inputMode: "voice",
      pttReleaseDelayMs: 200,
      pttSound: false,
    });
  });

  test("keeps valid values", () => {
    const input = {
      gateEnabled: true,
      gateThresholdDb: -42,
      inputMode: "ptt",
      pttBinding: { kind: "key", code: "KeyV", label: "V" },
      pttNativeBinding: { kind: "mouse", button: 4, label: "Mouse 4" },
      pttReleaseDelayMs: 350,
      pttSound: true,
    };
    assert.deepEqual(cleanCustomVoice(input), input);
  });

  test("clamps threshold", () => {
    assert.equal(
      cleanCustomVoice({ gateThresholdDb: -200 }).gateThresholdDb,
      -80,
    );
    assert.equal(cleanCustomVoice({ gateThresholdDb: 12 }).gateThresholdDb, 0);
    assert.equal(
      cleanCustomVoice({ gateThresholdDb: "-30" }).gateThresholdDb,
      -50,
    );
    assert.equal(
      cleanCustomVoice({ gateThresholdDb: NaN }).gateThresholdDb,
      -50,
    );
  });

  test("unknown mode falls back", () => {
    assert.equal(cleanCustomVoice({ inputMode: "shout" }).inputMode, "voice");
  });

  test("release delay clamped", () => {
    assert.equal(
      cleanCustomVoice({ pttReleaseDelayMs: -5 }).pttReleaseDelayMs,
      0,
    );
    assert.equal(
      cleanCustomVoice({ pttReleaseDelayMs: 5000 }).pttReleaseDelayMs,
      1000,
    );
  });

  test("invalid web bindings dropped", () => {
    const b = (pttBinding: unknown) =>
      cleanCustomVoice({ pttBinding }).pttBinding;
    assert.equal(b({ kind: "key" }), undefined);
    assert.equal(b({ kind: "mouse", button: 0, label: "x" }), undefined);
    assert.equal(b({ kind: "mouse", button: 2, label: "x" }), undefined);
    assert.equal(b({ kind: "key", code: "Escape", label: "Esc" }), undefined);
    assert.equal(b("KeyV"), undefined);
    assert.deepEqual(b({ kind: "mouse", button: 3, label: "Maus 4" }), {
      kind: "mouse",
      button: 3,
      label: "Maus 4",
    });
  });

  test("invalid native bindings dropped", () => {
    const b = (pttNativeBinding: unknown) =>
      cleanCustomVoice({ pttNativeBinding }).pttNativeBinding;
    assert.equal(b({ kind: "mouse", button: 1, label: "x" }), undefined);
    assert.equal(b({ kind: "mouse", button: 2, label: "x" }), undefined);
    assert.equal(b({ kind: "key", keycode: 1, label: "Esc" }), undefined);
    assert.equal(b({ kind: "key", keycode: "47", label: "V" }), undefined);
    assert.deepEqual(b({ kind: "key", keycode: 47, label: "V" }), {
      kind: "key",
      keycode: 47,
      label: "V",
    });
  });
});
