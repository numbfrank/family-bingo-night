import test from "node:test";
import assert from "node:assert/strict";

import { BINGO_CALLS, getBingoCall } from "../src/calls.js";
import {
  TOTAL_NUMBERS,
  createGameState,
  drawNextNumber,
  isValidGameState,
  restoreGameState,
  shuffleNumbers
} from "../src/game.js";

function seededRandom(seed = 123456789) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

test("the caller has a phrase for every number from 1 to 90", () => {
  assert.equal(Object.keys(BINGO_CALLS).length, TOTAL_NUMBERS);

  for (let number = 1; number <= TOTAL_NUMBERS; number += 1) {
    assert.equal(typeof getBingoCall(number), "string");
    assert.ok(getBingoCall(number).length > 0);
  }

  assert.equal(getBingoCall(22), "Two Little Ducks");
  assert.equal(getBingoCall(66), "Clickety Click");
  assert.equal(getBingoCall(90), "Top of the Shop");
  assert.equal(getBingoCall(91), "");
});

test("shuffle returns every bingo number exactly once", () => {
  const shuffled = shuffleNumbers(seededRandom());

  assert.equal(shuffled.length, TOTAL_NUMBERS);
  assert.equal(new Set(shuffled).size, TOTAL_NUMBERS);
  assert.deepEqual(
    [...shuffled].sort((left, right) => left - right),
    Array.from({ length: TOTAL_NUMBERS }, (_, index) => index + 1)
  );
});

test("drawing all balls never repeats a number", () => {
  let state = createGameState(seededRandom());
  const draws = [];

  for (let count = 0; count < TOTAL_NUMBERS; count += 1) {
    const result = drawNextNumber(state);
    state = result.state;
    draws.push(result.number);
  }

  assert.equal(draws.length, TOTAL_NUMBERS);
  assert.equal(new Set(draws).size, TOTAL_NUMBERS);
  assert.equal(state.remaining.length, 0);
  assert.deepEqual(state.called, draws);
  assert.ok(isValidGameState(state));
});

test("a 91st draw is a no-op", () => {
  let state = createGameState(seededRandom());

  for (let count = 0; count < TOTAL_NUMBERS; count += 1) {
    state = drawNextNumber(state).state;
  }

  const result = drawNextNumber(state);
  assert.equal(result.number, null);
  assert.equal(result.state, state);
});

test("a draw returns a new state without mutating the old state", () => {
  const original = createGameState(seededRandom());
  const originalRemaining = [...original.remaining];
  const result = drawNextNumber(original);

  assert.deepEqual(original.remaining, originalRemaining);
  assert.deepEqual(original.called, []);
  assert.notEqual(result.state, original);
  assert.equal(result.state.called.length, 1);
});

test("saved games restore only when all state invariants hold", () => {
  const valid = createGameState(seededRandom());
  const restored = restoreGameState(JSON.stringify(valid));

  assert.deepEqual(restored, valid);
  assert.equal(restoreGameState("not json"), null);
  assert.equal(
    restoreGameState(JSON.stringify({ ...valid, remaining: valid.remaining.slice(1) })),
    null
  );
  assert.equal(
    restoreGameState(JSON.stringify({
      ...valid,
      remaining: valid.remaining.slice(1),
      called: [valid.remaining[1]]
    })),
    null
  );
});
