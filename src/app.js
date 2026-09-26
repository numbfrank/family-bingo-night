import { getBingoCall } from "./calls.js";
import {
  TOTAL_NUMBERS,
  createGameState,
  drawNextNumber,
  restoreGameState
} from "./game.js";

const STORAGE_KEY = "family-bingo-night-state";

const elements = {
  board: document.querySelector("#numberBoard"),
  callAnnouncement: document.querySelector("#callAnnouncement"),
  callButton: document.querySelector("#callButton"),
  callButtonLabel: document.querySelector("#callButtonLabel"),
  callHelper: document.querySelector("#callHelper"),
  currentCall: document.querySelector("#currentCall"),
  currentLabel: document.querySelector("#currentLabel"),
  currentNumber: document.querySelector("#currentNumber"),
  emptyHistory: document.querySelector("#emptyHistory"),
  gameProgress: document.querySelector("#gameProgress"),
  headerCalledCount: document.querySelector("#headerCalledCount"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  numberBall: document.querySelector("#numberBall"),
  progressLabel: document.querySelector("#progressLabel"),
  resetButton: document.querySelector("#resetButton"),
  resetDescription: document.querySelector("#resetDescription"),
  resetDialog: document.querySelector("#resetDialog"),
  saveStatus: document.querySelector("#saveStatus"),
};

let storageAvailable = canWriteToStorage();
let state = loadGame();
let isDrawing = false;
let unlockTimerId = null;
let animationFrameIds = [];
const boardTiles = new Map();

function secureRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const randomValue = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomValue);
    return randomValue[0] / 2 ** 32;
  }

  return Math.random();
}

function canWriteToStorage() {
  const probeKey = `${STORAGE_KEY}-probe`;

  try {
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved && restoreGameState(saved)) || createGameState(secureRandom);
  } catch {
    storageAvailable = false;
    return createGameState(secureRandom);
  }
}

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    storageAvailable = false;
  }
}

function buildNumberBoard() {
  const fragment = document.createDocumentFragment();

  for (let number = 1; number <= TOTAL_NUMBERS; number += 1) {
    const tile = document.createElement("span");
    tile.className = "board-number";
    tile.setAttribute("role", "listitem");

    const visibleNumber = document.createElement("span");
    visibleNumber.setAttribute("aria-hidden", "true");
    visibleNumber.textContent = number;

    const accessibleStatus = document.createElement("span");
    accessibleStatus.className = "sr-only";
    accessibleStatus.textContent = `Number ${number}, waiting`;

    tile.append(visibleNumber, accessibleStatus);
    boardTiles.set(number, { tile, accessibleStatus });
    fragment.append(tile);
  }

  elements.board.append(fragment);
}

function renderHistory() {
  elements.historyList.replaceChildren();
  elements.emptyHistory.hidden = state.called.length > 0;
  elements.historyList.hidden = state.called.length === 0;

  const fragment = document.createDocumentFragment();
  const newestFirst = state.called.map((number, index) => ({
    number,
    sequence: index + 1
  })).reverse();

  newestFirst.forEach(({ number, sequence }, index) => {
    const item = document.createElement("li");
    item.className = `history-item${index === 0 ? " is-latest" : ""}`;
    item.setAttribute(
      "aria-label",
      `Call ${sequence}: number ${number}, ${getBingoCall(number)}${index === 0 ? ", latest call" : ""}`
    );

    const sequenceLabel = document.createElement("span");
    sequenceLabel.className = "history-sequence";
    sequenceLabel.textContent = `#${sequence}`;

    const numberBadge = document.createElement("strong");
    numberBadge.className = "history-number";
    numberBadge.textContent = number;

    const callCopy = document.createElement("span");
    callCopy.className = "history-call";
    callCopy.textContent = getBingoCall(number);

    item.append(sequenceLabel, numberBadge, callCopy);

    if (index === 0) {
      const latest = document.createElement("span");
      latest.className = "latest-badge";
      latest.textContent = "Latest";
      item.append(latest);
    }

    fragment.append(item);
  });

  elements.historyList.append(fragment);
}

function renderBoard() {
  const callOrder = new Map(
    state.called.map((number, index) => [number, index + 1])
  );
  const latestNumber = state.called.at(-1);

  boardTiles.forEach(({ tile, accessibleStatus }, number) => {
    const sequence = callOrder.get(number);
    const isCalled = sequence !== undefined;
    tile.classList.toggle("is-called", isCalled);
    tile.classList.toggle("is-latest", number === latestNumber);
    accessibleStatus.textContent = isCalled
      ? `Number ${number}, called ${sequence}${number === latestNumber ? ", latest" : ""}`
      : `Number ${number}, waiting`;

    if (number === latestNumber) {
      tile.setAttribute("aria-current", "true");
    } else {
      tile.removeAttribute("aria-current");
    }
  });
}

function renderGame() {
  const calledCount = state.called.length;
  const latestNumber = state.called.at(-1);
  const isComplete = calledCount === TOTAL_NUMBERS;

  elements.headerCalledCount.textContent = calledCount;
  elements.historyCount.textContent = calledCount;
  elements.progressLabel.textContent = `${calledCount} / ${TOTAL_NUMBERS}`;
  elements.gameProgress.value = calledCount;
  elements.gameProgress.textContent = `${calledCount} of ${TOTAL_NUMBERS}`;
  elements.saveStatus.textContent = storageAvailable
    ? "Your game is saved automatically on this device"
    : "Keep this page open to preserve your current game";

  elements.numberBall.classList.toggle("is-ready", latestNumber === undefined);

  if (latestNumber === undefined) {
    elements.currentLabel.textContent = "The caller is ready";
    elements.currentNumber.textContent = "?";
    elements.currentCall.textContent = "Ready to play?";
    elements.callHelper.textContent = "Press the button and let the bingo begin.";
    elements.callButtonLabel.textContent = "Call first number";
  } else {
    elements.currentLabel.textContent = isComplete ? "That’s all 90!" : "Latest number";
    elements.currentNumber.textContent = latestNumber;
    elements.currentCall.textContent = getBingoCall(latestNumber);
    elements.callHelper.textContent = isComplete
      ? "Full house! Every number has been called."
      : `${TOTAL_NUMBERS - calledCount} ${TOTAL_NUMBERS - calledCount === 1 ? "number" : "numbers"} still in the bag.`;
    elements.callButtonLabel.textContent = isComplete ? "Full house!" : "Call next number";
  }

  elements.callButton.disabled = isDrawing || isComplete;
  renderHistory();
  renderBoard();
}

function animateNewCall() {
  elements.numberBall.classList.remove("has-popped");
  const firstFrame = requestAnimationFrame(() => {
    const secondFrame = requestAnimationFrame(() => {
      elements.numberBall.classList.add("has-popped");
      animationFrameIds = [];
    });
    animationFrameIds.push(secondFrame);
  });
  animationFrameIds.push(firstFrame);
}

function clearDrawEffects() {
  if (unlockTimerId !== null) {
    window.clearTimeout(unlockTimerId);
    unlockTimerId = null;
  }

  animationFrameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
  animationFrameIds = [];
  elements.numberBall.classList.remove("has-popped");
}

function callNextNumber() {
  if (isDrawing || state.remaining.length === 0) {
    return;
  }

  isDrawing = true;
  elements.callButton.disabled = true;

  const result = drawNextNumber(state);
  state = result.state;
  saveGame();
  renderGame();
  elements.historyList.scrollTop = 0;
  animateNewCall();

  elements.callAnnouncement.textContent = `Number ${result.number}. ${getBingoCall(result.number)}.`;

  unlockTimerId = window.setTimeout(() => {
    unlockTimerId = null;
    isDrawing = false;
    elements.numberBall.classList.remove("has-popped");
    renderGame();
  }, 320);
}

function resetGame() {
  clearDrawEffects();
  state = createGameState(secureRandom);
  isDrawing = false;
  saveGame();
  renderGame();
  elements.callAnnouncement.textContent = "New game ready. All 90 numbers are back in the bag.";
  elements.callButton.focus();
}

function showResetConfirmation() {
  const calledCount = state.called.length;
  elements.resetDescription.textContent = calledCount === 0
    ? "This will reshuffle all 90 numbers for a fresh game."
    : `This will clear ${calledCount} called ${calledCount === 1 ? "number" : "numbers"} and reshuffle all 90.`;

  if (typeof elements.resetDialog.showModal === "function") {
    elements.resetDialog.returnValue = "cancel";
    elements.resetDialog.showModal();
    return;
  }

  if (window.confirm("Start a new game? This clears the call history and reshuffles all 90 numbers.")) {
    resetGame();
  }
}

buildNumberBoard();
renderGame();

elements.callButton.addEventListener("click", callNextNumber);
elements.resetButton.addEventListener("click", showResetConfirmation);
elements.resetDialog.addEventListener("close", () => {
  if (elements.resetDialog.returnValue === "confirm") {
    resetGame();
  } else {
    elements.resetButton.focus();
  }
});
