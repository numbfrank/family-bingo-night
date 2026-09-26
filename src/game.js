export const TOTAL_NUMBERS = 90;
export const GAME_STATE_VERSION = 1;

function allNumbers() {
  return Array.from({ length: TOTAL_NUMBERS }, (_, index) => index + 1);
}

export function shuffleNumbers(random = Math.random) {
  const numbers = allNumbers();

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const randomValue = random();
    const safeRandom = Number.isFinite(randomValue)
      ? Math.min(Math.max(randomValue, 0), 0.9999999999999999)
      : 0;
    const swapIndex = Math.floor(safeRandom * (index + 1));
    [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
  }

  return numbers;
}

export function createGameState(random = Math.random) {
  return {
    version: GAME_STATE_VERSION,
    remaining: shuffleNumbers(random),
    called: []
  };
}

export function drawNextNumber(state) {
  if (!isValidGameState(state) || state.remaining.length === 0) {
    return { state, number: null };
  }

  const remaining = state.remaining.slice();
  const number = remaining.pop();

  return {
    number,
    state: {
      version: GAME_STATE_VERSION,
      remaining,
      called: [...state.called, number]
    }
  };
}

export function isValidGameState(value) {
  if (
    !value ||
    value.version !== GAME_STATE_VERSION ||
    !Array.isArray(value.remaining) ||
    !Array.isArray(value.called) ||
    value.remaining.length + value.called.length !== TOTAL_NUMBERS
  ) {
    return false;
  }

  const combined = [...value.remaining, ...value.called];
  const unique = new Set(combined);

  return (
    unique.size === TOTAL_NUMBERS &&
    combined.every(
      (number) => Number.isInteger(number) && number >= 1 && number <= TOTAL_NUMBERS
    )
  );
}

export function restoreGameState(serializedState) {
  try {
    const state = JSON.parse(serializedState);
    return isValidGameState(state) ? state : null;
  } catch {
    return null;
  }
}
