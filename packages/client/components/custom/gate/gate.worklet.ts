/**
 * AudioWorklet running the volume gate on the audio thread.
 *
 * Runs independently of the page's main thread, so the gate keeps working
 * while the window is in the background (timers there are throttled).
 */
import { GateCore } from "./gateCore";

declare const sampleRate: number;
declare function registerProcessor(name: string, processor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

/**
 * Configuration message sent from the main thread
 */
type GateConfig = {
  enabled: boolean;
  thresholdDb: number;
  transmitAllowed: boolean;
};

/**
 * Report the level at most every 50 ms
 */
const REPORT_INTERVAL = Math.round(sampleRate * 0.05);

/**
 * Gate processor: mono in, mono out
 */
class GateProcessor extends AudioWorkletProcessor {
  private readonly core = new GateCore(sampleRate);
  private sinceReport = 0;
  private maxLevelDb = -100;
  private wasOpen = false;

  /**
   * Create processor and listen for configuration
   */
  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<GateConfig>) => {
      this.core.enabled = event.data.enabled;
      this.core.thresholdDb = event.data.thresholdDb;
      this.core.transmitAllowed = event.data.transmitAllowed;
    };
  }

  /**
   * Process one render quantum
   */
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!output) return true;
    if (!input) {
      output.fill(0);
      return true;
    }

    const result = this.core.process(input, output);
    this.maxLevelDb = Math.max(this.maxLevelDb, result.levelDb);
    this.wasOpen = this.wasOpen || result.open;
    this.sinceReport += input.length;
    if (this.sinceReport >= REPORT_INTERVAL) {
      this.port.postMessage({ levelDb: this.maxLevelDb, open: this.wasOpen });
      this.sinceReport = 0;
      this.maxLevelDb = -100;
      this.wasOpen = false;
    }
    return true;
  }
}

registerProcessor("stoat-custom-gate", GateProcessor);
