import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GateCore } from "./gateCore.ts";

const RATE = 48000;
const BLOCK = 128;

/**
 * Feed `ms` milliseconds of a signal through the gate, block by block.
 * Returns the concatenated output and the result of the last block.
 */
function run(
  gate: GateCore,
  ms: number,
  amplitude: number,
  startSample = 0,
): { out: Float32Array; last: { levelDb: number; open: boolean } } {
  const blocks = Math.ceil(((ms / 1000) * RATE) / BLOCK);
  const out = new Float32Array(blocks * BLOCK);
  let last = { levelDb: -100, open: false };
  for (let b = 0; b < blocks; b++) {
    const input = new Float32Array(BLOCK);
    for (let i = 0; i < BLOCK; i++) {
      const n = startSample + b * BLOCK + i;
      input[i] = amplitude * Math.sin((2 * Math.PI * 440 * n) / RATE);
    }
    const output = new Float32Array(BLOCK);
    last = gate.process(input, output);
    out.set(output, b * BLOCK);
  }
  return { out, last };
}

/** Peak absolute value of a buffer section */
function peak(buf: Float32Array, from = 0, to = buf.length): number {
  let p = 0;
  for (let i = from; i < to; i++) p = Math.max(p, Math.abs(buf[i]));
  return p;
}

/** RMS of a buffer section */
function rms(buf: Float32Array, from = 0, to = buf.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / (to - from));
}

const samples = (ms: number) => Math.round((ms / 1000) * RATE);

describe("GateCore", () => {
  test("disabled passes audio through unchanged", () => {
    const gate = new GateCore(RATE);
    gate.enabled = false;
    const input = new Float32Array(BLOCK).map((_, i) => 0.1 * Math.sin(i));
    const output = new Float32Array(BLOCK);
    gate.process(input, output);
    assert.deepEqual(output, input);
  });

  test("silence stays closed", () => {
    const gate = new GateCore(RATE);
    gate.enabled = true;
    gate.thresholdDb = -50;
    const { out, last } = run(gate, 1000, 0);
    assert.equal(peak(out), 0);
    assert.equal(last.open, false);
  });

  test("loud signal opens within attack", () => {
    const gate = new GateCore(RATE);
    gate.enabled = true;
    gate.thresholdDb = -50;
    run(gate, 500, 0);
    const { out, last } = run(gate, 100, 0.1);
    assert.equal(last.open, true);
    // after 10 ms the output must match the input level within 1 dB
    const from = samples(10);
    const inRms = 0.1 / Math.SQRT2;
    const outRms = rms(out, from);
    assert.ok(Math.abs(20 * Math.log10(outRms / inRms)) < 1, `rms ${outRms}`);
  });

  test("holds 250 ms then releases within 100 ms", () => {
    const gate = new GateCore(RATE);
    gate.enabled = true;
    gate.thresholdDb = -50;
    run(gate, 200, 0.1);
    // switch to a quiet signal below the threshold (-80 dBFS peak)
    const { out } = run(gate, 500, 0.0001);
    // still open at 200 ms: output equals the quiet input
    assert.ok(peak(out, samples(190), samples(200)) > 0.00009);
    // fully closed after hold + release (+10 ms margin)
    assert.ok(
      peak(out, samples(360)) < 1e-4 * 0.01,
      `peak ${peak(out, samples(360))}`,
    );
  });

  test("level of full-scale sine is about -3 dBFS", () => {
    const gate = new GateCore(RATE);
    const { last } = run(gate, 50, 1);
    assert.ok(last.levelDb >= -3.5 && last.levelDb <= -2.5, `${last.levelDb}`);
  });

  test("transmitAllowed=false closes even when loud", () => {
    const gate = new GateCore(RATE);
    gate.enabled = false;
    run(gate, 100, 0.1);
    gate.transmitAllowed = false;
    const { out, last } = run(gate, 100, 0.1);
    assert.equal(last.open, false);
    assert.ok(peak(out, samples(10)) < 1e-4, `peak ${peak(out, samples(10))}`);
  });

  test("transmitAllowed=true with gate disabled is passthrough", () => {
    const gate = new GateCore(RATE);
    gate.enabled = false;
    gate.transmitAllowed = true;
    const input = new Float32Array(BLOCK).map((_, i) => 0.3 * Math.cos(i));
    const output = new Float32Array(BLOCK);
    gate.process(input, output);
    assert.deepEqual(output, input);
  });
});
