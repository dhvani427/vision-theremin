export async function startCamera(videoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    },
    audio: false,
  });

  videoElement.srcObject = stream;
  await videoElement.play();

  return stream;
}

export function stopCamera(stream) {
  stream.getTracks().forEach((track) => track.stop());
}
