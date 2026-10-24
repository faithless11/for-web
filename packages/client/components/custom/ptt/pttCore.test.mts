import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { PttCore } from "./pttCore.ts";

/**
 * Manual clock for timers
 */
function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    schedule: (fn: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    cancel: (handle: unknown) => {
      timers.delete(handle as number);
    },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].fn();
      }
      now = target;
    },
  };
}

/**
 * Create a core with a recorded change log
 */
function setup(releaseDelayMs = 200) {
  const clock = fakeClock();
  const changes: boolean[] = [];
  const core = new PttCore({
    releaseDelayMs,
    schedule: clock.schedule,
    cancel: clock.cancel,
    onChange: (open) => changes.push(open),
  });
  return { core, clock, changes };
}

describe("PttCore", () => {
  test("starts closed", () => {
    const { core, changes } = setup();
    assert.equal(core.open, false);
    assert.deepEqual(changes, []);
  });

  test("press opens immediately", () => {
    const { core, changes } = setup();
    core.press();
    assert.equal(core.open, true);
    assert.deepEqual(changes, [true]);
  });

  test("release closes after delay", () => {
    const { core, clock, changes } = setup(200);
    core.press();
    core.release();
    clock.advance(199);
    assert.equal(core.open, true);
    clock.advance(1);
    assert.equal(core.open, false);
    assert.deepEqual(changes, [true, false]);
  });

  test("re-press during delay keeps open without flicker", () => {
    const { core, clock, changes } = setup(200);
    core.press();
    core.release();
    clock.advance(100);
    core.press();
    clock.advance(500);
    assert.equal(core.open, true);
    assert.deepEqual(changes, [true]);
  });

  test("repeated keydown (auto-repeat) is idempotent", () => {
    const { core, changes } = setup();
    for (let i = 0; i < 5; i++) core.press();
    assert.deepEqual(changes, [true]);
  });

  test("release without press does nothing", () => {
    const { core, clock, changes } = setup();
    core.release();
    clock.advance(1000);
    assert.deepEqual(changes, []);
  });

  test("reset closes immediately and cancels timer", () => {
    const { core, clock, changes } = setup(200);
    core.press();
    core.release();
    core.reset();
    assert.equal(core.open, false);
    clock.advance(1000);
    assert.deepEqual(changes, [true, false]);
  });

  test("reset while held closes and a later release does not reopen", () => {
    const { core, clock, changes } = setup(200);
    core.press();
    core.reset();
    core.release();
    clock.advance(1000);
    assert.equal(core.open, false);
    assert.deepEqual(changes, [true, false]);
  });

  test("delay 0 closes synchronously", () => {
    const { core, changes } = setup(0);
    core.press();
    core.release();
    assert.equal(core.open, false);
    assert.deepEqual(changes, [true, false]);
  });

  test("setReleaseDelay applies to the next release", () => {
    const { core, clock } = setup(200);
    core.setReleaseDelay(500);
    core.press();
    core.release();
    clock.advance(499);
    assert.equal(core.open, true);
    clock.advance(1);
    assert.equal(core.open, false);
  });
});
