import "./style.css";
import { startCamera, stopCamera } from "./camera.js";
import {
  createHandLandmarker,
  detectHands,
  drawHandLandmarks,
} from "./handTracking.js";
import {
  MAX_GAIN,
  assignHands,
  noteName,
  uToFrequency,
  yToGain,
} from "./mapping.js";
import { drawPalmMarker } from "./overlay.js";
import { createTheremin } from "./theremin.js";

const menu = document.getElementById("menu");
const player = document.getElementById("player");
const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const startButton = document.getElementById("start-button");
const stopButton = document.getElementById("stop-button");
const hintEl = document.getElementById("hint");
const noteEl = document.getElementById("note");
const hzEl = document.getElementById("hz");
const volumeFill = document.getElementById("volume-fill");
const pitchChip = document.getElementById("pitch-chip");
const volumeChip = document.getElementById("volume-chip");

// Hand colors come from the theme in style.css: the pitch hand is orange
// with white details, the volume hand white with orange details.
const theme = getComputedStyle(document.documentElement);
const ORANGE = theme.getPropertyValue("--orange").trim();
const WHITE = theme.getPropertyValue("--paper").trim();
// How long to hold the last value when a hand drops out, before fading.
const HOLD_MS = 150;

let handLandmarker;
let theremin;
let stream;
let rafId;
let lastVideoTime = -1;

const lastSeen = { pitch: -Infinity, volume: -Infinity };
let silent = true;
let frequency = 0;
let gain = 0;

function updateSound(pitchHand, volumeHand, now) {
  if (pitchHand) {
    frequency = uToFrequency(pitchHand.u);
    lastSeen.pitch = now;
  }
  if (volumeHand) {
    gain = yToGain(volumeHand.y);
    lastSeen.volume = now;
  }

  const playing =
    now - lastSeen.pitch <= HOLD_MS && now - lastSeen.volume <= HOLD_MS;
  if (playing) {
    // Jump straight to the note on the first frame after silence.
    theremin.setFrequency(frequency, silent);
    theremin.setGain(gain);
    silent = false;
  } else if (!silent) {
    theremin.fadeOut();
    silent = true;
  }
}

function drawOverlay(pitchHand, volumeHand) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const [hand, color, accent] of [
    [pitchHand, ORANGE, WHITE],
    [volumeHand, WHITE, ORANGE],
  ]) {
    if (!hand) continue;
    drawHandLandmarks(ctx, hand.landmarks, canvas.width, canvas.height, color, accent);
    drawPalmMarker(ctx, hand, canvas.width, canvas.height, color, accent);
  }
}

function updateHud(pitchHand, volumeHand) {
  hintEl.hidden = !silent;
  noteEl.textContent = silent ? "—" : noteName(frequency);
  hzEl.textContent = silent ? "— Hz" : `${Math.round(frequency)} Hz`;
  volumeFill.style.width = `${silent ? 0 : (gain / MAX_GAIN) * 100}%`;
  pitchChip.classList.toggle("on", Boolean(pitchHand));
  volumeChip.classList.toggle("on", Boolean(volumeHand));
}

function trackingLoop() {
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const now = performance.now();
    const result = detectHands(handLandmarker, video, now);
    const { pitchHand, volumeHand } = assignHands(result);
    updateSound(pitchHand, volumeHand, now);
    drawOverlay(pitchHand, volumeHand);
    updateHud(pitchHand, volumeHand);
  }
  rafId = requestAnimationFrame(trackingLoop);
}

function showPlayer(visible) {
  menu.hidden = visible;
  player.hidden = !visible;
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

startButton.addEventListener("click", async () => {
  startButton.disabled = true;

  // Create audio before any await so it starts inside the click's user gesture.
  if (!theremin) theremin = createTheremin();

  try {
    setStatus("Requesting camera access…");
    stream = await startCamera(video);
    if (!handLandmarker) {
      setStatus("Loading hand tracking model…");
      handLandmarker = await createHandLandmarker();
    }
  } catch (error) {
    if (stream) stopCamera(stream);
    stream = null;
    setStatus(`Couldn't start: ${error.message}`, true);
    startButton.disabled = false;
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  player.style.setProperty("--aspect", video.videoWidth / video.videoHeight);

  setStatus("");
  startButton.disabled = false;
  showPlayer(true);
  trackingLoop();
});

stopButton.addEventListener("click", () => {
  cancelAnimationFrame(rafId);
  theremin.fadeOut();
  silent = true;
  lastSeen.pitch = -Infinity;
  lastSeen.volume = -Infinity;
  lastVideoTime = -1;

  stopCamera(stream);
  stream = null;
  video.srcObject = null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateHud(null, null);
  showPlayer(false);
});
