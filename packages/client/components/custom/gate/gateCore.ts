/**
 * Volume gate algorithm (pure, no Web Audio dependencies).
 *
 * The gate measures the RMS level of each block in dBFS. While the level is at
 * or above the threshold, the gate is open; after the level drops below the
 * threshold it stays open for the hold time and then fades out over the
 * release time. Opening fades in over the attack time.
 *
 * `transmitAllowed` is a hard override used by push-to-talk: when false, the
 * gate closes after the attack time regardless of level or hold.
 *
 * Shared by the AudioWorklet (gate.worklet.ts) and the unit tests, so it may
 * only use erasable TypeScript syntax and must not import anything.
 */
export class GateCore {
  /**
   * Whether level-based gating is active. When false, audio passes through
   * (unless transmitAllowed is false).
   */
  enabled = false;

  /**
   * Open threshold in dBFS
   */
  thresholdDb = -50;

  /**
   * Push-to-talk override; false forces the gate closed
   */
  transmitAllowed = true;

  private gain = 1;
  private holdRemaining = 0;
  private readonly attackStep: number;
  private readonly releaseStep: number;
  private readonly holdSamples: number;

  /**
   * Create a gate
   * @param sampleRate Sample rate of the processed audio
   * @param opts Time constants in milliseconds
   */
  constructor(
    sampleRate: number,
    opts: { attackMs?: number; holdMs?: number; releaseMs?: number } = {},
  ) {
    const attack = ((opts.attackMs ?? 5) / 1000) * sampleRate;
    const release = ((opts.releaseMs ?? 100) / 1000) * sampleRate;
    this.attackStep = 1 / Math.max(1, attack);
    this.releaseStep = 1 / Math.max(1, release);
    this.holdSamples = Math.round(((opts.holdMs ?? 250) / 1000) * sampleRate);
  }

  /**
   * Process one block of samples
   * @param input Input samples
   * @param output Output buffer of the same length
   * @returns Measured level of the input block and whether the gate is open
   */
  process(
    input: Float32Array,
    output: Float32Array,
  ): { levelDb: number; open: boolean } {
    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
    const rms = input.length ? Math.sqrt(sum / input.length) : 0;
    const levelDb = rms > 0 ? Math.max(-100, 20 * Math.log10(rms)) : -100;

    let target: number;
    let step: number;
    if (!this.transmitAllowed) {
      // push-to-talk released: close quickly, ignore hold
      this.holdRemaining = 0;
      target = 0;
      step = this.attackStep;
    } else if (!this.enabled || levelDb >= this.thresholdDb) {
      this.holdRemaining = this.holdSamples;
      target = 1;
      step = this.attackStep;
    } else if (this.holdRemaining > 0) {
      this.holdRemaining = Math.max(0, this.holdRemaining - input.length);
      target = 1;
      step = this.attackStep;
    } else {
      target = 0;
      step = this.releaseStep;
    }

    // passthrough shortcut keeps samples bit-identical when fully open
    if (target === 1 && this.gain === 1) {
      output.set(input);
    } else {
      for (let i = 0; i < input.length; i++) {
        if (this.gain < target) this.gain = Math.min(target, this.gain + step);
        else if (this.gain > target)
          this.gain = Math.max(target, this.gain - step);
        output[i] = input[i] * this.gain;
      }
    }

    return { levelDb, open: target === 1 };
  }
}
