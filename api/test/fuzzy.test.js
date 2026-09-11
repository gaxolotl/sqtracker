import assert from "node:assert/strict";
import test from "node:test";
import { fuzzyScore } from "../src/utils/fuzzy.js";

test("fuzzy scores substrings, tokens and subsequences", () => {
  const text = "Spider-Man Into the Spider-Verse yes";

  assert.ok(fuzzyScore(text, "spider") > 0);
  assert.ok(fuzzyScore(text, "into spider") > 0);
  assert.ok(fuzzyScore(text, "spiderverse") > 0);
  assert.ok(fuzzyScore(text, "yes") > 0);
  assert.equal(fuzzyScore(text, "batman"), 0);
  assert.equal(fuzzyScore(text, "   "), 0);

  assert.ok(fuzzyScore(text, "spider") > fuzzyScore(text, "spd"));
});
