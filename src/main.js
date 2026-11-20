import { startCamera } from "./camera.js";
import {
  createHandLandmarker,
  detectHands,
  drawHandLandmarks,
} from "./handTracking.js";

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const startButton = document.getElementById("start-camera");

let handLandmarker;
let lastVideoTime = -1;

function trackingLoop() {
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = detectHands(handLandmarker, video, performance.now());
    drawHandLandmarks(ctx, result, canvas.width, canvas.height);
  }
  requestAnimationFrame(trackingLoop);
}

startButton.addEventListener("click", async () => {
  startButton.disabled = true;

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
