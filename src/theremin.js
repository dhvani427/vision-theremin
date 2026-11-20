// Seconds for each parameter to settle most of the way to a new value.
// Short glides avoid the clicks of stepping values once per video frame.
const PITCH_TIME_CONSTANT = 0.02;
const GAIN_TIME_CONSTANT = 0.03;
const FADE_TIME_CONSTANT = 0.05;

// Call this synchronously inside a click handler, before any await,
// or the browser may keep the AudioContext suspended.
export function createTheremin() {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();

  oscillator.type = "sine";
  volume.gain.value = 0;
  oscillator.connect(volume).connect(audioContext.destination);
  oscillator.start();
  audioContext.resume();

  return {
    // jump skips the glide, for the first note after silence
    setFrequency(hz, jump = false) {
      const now = audioContext.currentTime;
      if (jump) {
        oscillator.frequency.cancelScheduledValues(now);
        oscillator.frequency.setValueAtTime(hz, now);
      } else {
        oscillator.frequency.setTargetAtTime(hz, now, PITCH_TIME_CONSTANT);
      }
    },
    setGain(gain) {
      volume.gain.setTargetAtTime(gain, audioContext.currentTime, GAIN_TIME_CONSTANT);
    },
    fadeOut() {
      volume.gain.setTargetAtTime(0, audioContext.currentTime, FADE_TIME_CONSTANT);
    },
  };
}
