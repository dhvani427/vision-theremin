import {
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

// model weights for the pretrained hand landmarker.
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
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

export function drawHandLandmarks(ctx, result, width, height) {
  ctx.clearRect(0, 0, width, height);

  // result.landmarks has one entry per detected hand
  for (const landmarks of result.landmarks) {
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    for (const [startIdx, endIdx] of CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      // Landmark coords are normalized to [0,1]
      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }

    ctx.fillStyle = "#ff4081";
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
