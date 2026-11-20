import {
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

// model weights for the pretrained hand landmarker.
// Keep the WASM version in sync with the npm package in package.json.
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

export function detectHands(handLandmarker, videoElement, timestampMs) {
  return handLandmarker.detectForVideo(videoElement, timestampMs);
}

// Hand is mapped out in a specific way for this PAI
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// Draws one hand. The video is CSS-mirrored but the canvas isn't,
// so x is flipped here to line up with the mirrored video.
export function drawHandLandmarks(ctx, landmarks, width, height, color, jointColor) {
  ctx.save();

  // All bones go in one path and one stroke call.
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [startIdx, endIdx] of CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    // Landmark coords are normalized to [0,1]
    ctx.moveTo((1 - start.x) * width, start.y * height);
    ctx.lineTo((1 - end.x) * width, end.y * height);
  }
  ctx.stroke();

  ctx.fillStyle = jointColor;
  ctx.beginPath();
  for (const point of landmarks) {
    const x = (1 - point.x) * width;
    const y = point.y * height;
    ctx.moveTo(x + 3.5, y);
    ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
  }
  ctx.fill();

  ctx.restore();
}
