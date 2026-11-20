import { startCamera } from "./camera.js";
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

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const readoutEl = document.getElementById("readout");
const startButton = document.getElementById("start-camera");

const PITCH_COLOR = "#00e5ff";
const VOLUME_COLOR = "#ff4081";
// How long to hold the last value when a hand drops out, before fading.
const HOLD_MS = 150;

let handLandmarker;
let theremin;
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

function draw(pitchHand, volumeHand) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const [hand, color] of [
    [pitchHand, PITCH_COLOR],
    [volumeHand, VOLUME_COLOR],
  ]) {
    if (!hand) continue;
    drawHandLandmarks(ctx, hand.landmarks, canvas.width, canvas.height, color);
    drawPalmMarker(ctx, hand, canvas.width, canvas.height, color);
  }

  readoutEl.textContent = silent
    ? "Show both hands to play: right hand for pitch, left hand for volume."
    : `${noteName(frequency)} · ${Math.round(frequency)} Hz · vol ${Math.round((gain / MAX_GAIN) * 100)}%`;
}

function trackingLoop() {
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const now = performance.now();
    const result = detectHands(handLandmarker, video, now);
    const { pitchHand, volumeHand } = assignHands(result);
    updateSound(pitchHand, volumeHand, now);
    draw(pitchHand, volumeHand);
  }
  requestAnimationFrame(trackingLoop);
}

startButton.addEventListener("click", async () => {
  startButton.disabled = true;

  // Create audio before any await so it starts inside the click's user gesture.
  if (!theremin) theremin = createTheremin();

  statusEl.textContent = "Requesting camera access...";
  try {
    await startCamera(video);
  } catch (error) {
    statusEl.textContent = `Camera error: ${error.message}`;
    startButton.disabled = false;
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  statusEl.textContent = "Loading hand tracking model...";
  handLandmarker = await createHandLandmarker();

  statusEl.textContent = "Tracking hands.";
  trackingLoop();
});
