import type { State } from "@revolt/state";
import { AbstractStore } from "@revolt/state/stores";

import {
  CUSTOM_VOICE_DEFAULTS,
  InputMode,
  NativePttBinding,
  PttBinding,
  TypeCustomVoice,
  cleanCustomVoice,
} from "./settings";

/**
 * Per-device settings of the stoat-custom voice features (volume gate,
 * push-to-talk). Not synchronised to the account.
 */
export class CustomVoice extends AbstractStore<"customVoice", TypeCustomVoice> {
  /**
   * Construct store
   * @param state State
   */
  constructor(state: State) {
    super(state, "customVoice");
  }

  /**
   * Hydrate external context
   */
  hydrate(): void {
    /** nothing needs to be done */
  }

  /**
   * Generate default values
   */
  default(): TypeCustomVoice {
    return { ...CUSTOM_VOICE_DEFAULTS };
  }

  /**
   * Validate the given data to see if it is compliant and return a compliant object
   */
  clean(input: Partial<TypeCustomVoice>): TypeCustomVoice {
    return cleanCustomVoice(input);
  }

  /**
   * Whether the volume gate is enabled
   */
  get gateEnabled(): boolean {
    return this.get().gateEnabled;
  }

  /**
   * Enable or disable the volume gate
   */
  set gateEnabled(value: boolean) {
    this.set("gateEnabled", value);
  }

  /**
   * Gate threshold in dBFS
   */
  get gateThresholdDb(): number {
    return this.get().gateThresholdDb;
  }

  /**
   * Set the gate threshold in dBFS (clamped)
   */
  set gateThresholdDb(value: number) {
    this.set(
      "gateThresholdDb",
      cleanCustomVoice({ gateThresholdDb: value }).gateThresholdDb,
    );
  }

  /**
   * Input mode (voice activation or push-to-talk)
   */
  get inputMode(): InputMode {
    return this.get().inputMode;
  }

  /**
   * Set the input mode
   */
  set inputMode(value: InputMode) {
    this.set("inputMode", value);
  }

  /**
   * Push-to-talk binding for the browser
   */
  get pttBinding(): PttBinding | undefined {
    return this.get().pttBinding;
  }

  /**
   * Set or clear the browser push-to-talk binding
   */
  set pttBinding(value: PttBinding | undefined) {
    this.set("pttBinding", value);
  }

  /**
   * Push-to-talk binding for the desktop client's global hook
   */
  get pttNativeBinding(): NativePttBinding | undefined {
    return this.get().pttNativeBinding;
  }

  /**
   * Set or clear the desktop push-to-talk binding
   */
  set pttNativeBinding(value: NativePttBinding | undefined) {
    this.set("pttNativeBinding", value);
  }

  /**
   * Delay in milliseconds before the microphone closes after releasing the key
   */
  get pttReleaseDelayMs(): number {
    return this.get().pttReleaseDelayMs;
  }

  /**
   * Set the release delay (clamped)
   */
  set pttReleaseDelayMs(value: number) {
    this.set(
      "pttReleaseDelayMs",
      cleanCustomVoice({ pttReleaseDelayMs: value }).pttReleaseDelayMs,
    );
  }

  /**
   * Whether to play a sound when push-to-talk opens or closes
   */
  get pttSound(): boolean {
    return this.get().pttSound;
  }

  /**
   * Enable or disable the push-to-talk sound
   */
  set pttSound(value: boolean) {
    this.set("pttSound", value);
  }
}
