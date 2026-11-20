// The palm center is what the mappings read, so mark it on screen.
export function drawPalmMarker(ctx, hand, width, height, color, outlineColor) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(hand.u * width, hand.y * height, 11, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
