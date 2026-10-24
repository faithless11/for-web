import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  bindingFromKeyboard,
  bindingFromMouse,
  matchesKeyboard,
  matchesMouse,
} from "./bindings.ts";

describe("bindingFromKeyboard", () => {
  test("letter key", () => {
    assert.deepEqual(bindingFromKeyboard({ code: "KeyV", key: "v" }), {
      kind: "key",
      code: "KeyV",
      label: "V",
    });
  });

  test("digit key", () => {
    assert.equal(bindingFromKeyboard({ code: "Digit4", key: "4" })?.label, "4");
  });

  test("other keys keep their code as label", () => {
    assert.equal(
      bindingFromKeyboard({ code: "CapsLock", key: "CapsLock" })?.label,
      "CapsLock",
    );
    assert.equal(
      bindingFromKeyboard({ code: "F13", key: "F13" })?.label,
      "F13",
    );
  });

  test("Escape is rejected (cancels)", () => {
    assert.equal(bindingFromKeyboard({ code: "Escape", key: "Escape" }), null);
  });

  test("empty code is rejected", () => {
    assert.equal(bindingFromKeyboard({ code: "", key: "Unidentified" }), null);
  });
});

describe("bindingFromMouse", () => {
  test("left and right click are rejected", () => {
    assert.equal(bindingFromMouse({ button: 0 }, "en"), null);
    assert.equal(bindingFromMouse({ button: 2 }, "en"), null);
  });

  test("middle button", () => {
    assert.deepEqual(bindingFromMouse({ button: 1 }, "en"), {
      kind: "mouse",
      button: 1,
      label: "Middle mouse",
    });
    assert.equal(
      bindingFromMouse({ button: 1 }, "de")?.label,
      "Mittlere Maustaste",
    );
  });

  test("side buttons", () => {
    assert.equal(bindingFromMouse({ button: 3 }, "en")?.label, "Mouse 4");
    assert.equal(bindingFromMouse({ button: 4 }, "en")?.label, "Mouse 5");
    assert.equal(bindingFromMouse({ button: 3 }, "de")?.label, "Maus 4");
  });
});

describe("matching", () => {
  const key = { kind: "key", code: "KeyV", label: "V" } as const;
  const mouse = { kind: "mouse", button: 3, label: "Mouse 4" } as const;

  test("keyboard matches by code only", () => {
    assert.equal(matchesKeyboard(key, { code: "KeyV" }), true);
    assert.equal(matchesKeyboard(key, { code: "KeyB" }), false);
    assert.equal(matchesKeyboard(mouse, { code: "KeyV" }), false);
  });

  test("mouse matches by button", () => {
    assert.equal(matchesMouse(mouse, { button: 3 }), true);
    assert.equal(matchesMouse(mouse, { button: 4 }), false);
    assert.equal(matchesMouse(key, { button: 3 }), false);
  });
});
