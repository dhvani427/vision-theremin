// The palm center is what the mappings read, so mark it on screen.
export function drawPalmMarker(ctx, hand, width, height, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hand.u * width, hand.y * height, 9, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}
