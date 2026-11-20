// Turns tracked hands into theremin controls. Positions here are in mirrored
// space, u = 1 - landmark.x, so u grows toward the user's own right.

// MediaPipe's label for the user's right hand. The 1.2.3 typings say labels
// match the subject's real hands when frames aren't mirrored (ours aren't).
// If the pitch color lands on the left hand, flip this to "Left".
export const PITCH_LABEL = "Right";

// Pitch spans C3 to C6 across the right part of the frame.
export const LOW_MIDI = 48;
export const OCTAVES = 3;
const PITCH_U_MIN = 0.3;
const PITCH_U_MAX = 0.95;

// Volume hand low in the frame is silent, high is loud.
const VOLUME_Y_SILENT = 0.85;
const VOLUME_Y_LOUD = 0.2;
export const MAX_GAIN = 0.3;

// Wrist plus the four knuckles; steadier than any fingertip.
const PALM_INDICES = [0, 5, 9, 13, 17];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function clamp01(t) {
  return Math.min(1, Math.max(0, t));
}

export function palmCenter(landmarks) {
  let x = 0;
  let y = 0;
  for (const i of PALM_INDICES) {
    x += landmarks[i].x;
    y += landmarks[i].y;
  }
  return { u: 1 - x / PALM_INDICES.length, y: y / PALM_INDICES.length };
}

export function assignHands(result) {
  const hands = result.landmarks.map((landmarks, i) => ({
    landmarks,
    label: result.handedness[i][0].categoryName,
    ...palmCenter(landmarks),
  }));

  let pitchHand = null;
  let volumeHand = null;
  if (hands.length === 2 && hands[0].label === hands[1].label) {
    // Both hands got the same label, so fall back to position:
    // the hand further to the user's right plays pitch.
    [volumeHand, pitchHand] = [...hands].sort((a, b) => a.u - b.u);
  } else {
    for (const hand of hands) {
      if (hand.label === PITCH_LABEL) pitchHand = hand;
      else volumeHand = hand;
    }
  }
  return { pitchHand, volumeHand };
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function frequencyToMidi(hz) {
  return 12 * Math.log2(hz / 440) + 69;
}

// Exponential, so equal hand movements give equal musical intervals.
export function uToFrequency(u) {
  const t = clamp01((u - PITCH_U_MIN) / (PITCH_U_MAX - PITCH_U_MIN));
  return midiToFrequency(LOW_MIDI + 12 * OCTAVES * t);
}

// Squared because perceived loudness isn't linear in gain.
export function yToGain(y) {
  const t = clamp01((VOLUME_Y_SILENT - y) / (VOLUME_Y_SILENT - VOLUME_Y_LOUD));
  return MAX_GAIN * t * t;
}

export function noteName(hz) {
  const midi = Math.round(frequencyToMidi(hz));
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}
