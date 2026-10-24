/**
 * Push-to-talk state machine (pure, timers injected for testing).
 *
 * Pressing opens immediately; releasing closes after the release delay so the
 * end of a sentence is not cut off. Pressing again during the delay keeps the
 * microphone open without closing in between.
 */
export class PttCore {
  private isOpen = false;
  private held = false;
  private timer: unknown = undefined;
  private releaseDelayMs: number;
  private readonly schedule: (fn: () => void, ms: number) => unknown;
  private readonly cancel: (handle: unknown) => void;
  private readonly onChange: (open: boolean) => void;

  /**
   * Create a push-to-talk state machine
   * @param opts Release delay, timer functions and change callback
   */
  constructor(opts: {
    releaseDelayMs: number;
    schedule: (fn: () => void, ms: number) => unknown;
    cancel: (handle: unknown) => void;
    onChange: (open: boolean) => void;
  }) {
    this.releaseDelayMs = opts.releaseDelayMs;
    this.schedule = opts.schedule;
    this.cancel = opts.cancel;
    this.onChange = opts.onChange;
  }

  /**
   * Whether the microphone is currently open
   */
  get open(): boolean {
    return this.isOpen;
  }

  /**
   * Key pressed (repeated presses are ignored)
   */
  press() {
    this.held = true;
    this.clearTimer();
    this.setOpen(true);
  }

  /**
   * Key released; closes after the release delay
   */
  release() {
    if (!this.held) return;
    this.held = false;
    this.clearTimer();
    if (this.releaseDelayMs <= 0) {
      this.setOpen(false);
      return;
    }
    this.timer = this.schedule(() => {
      this.timer = undefined;
      this.setOpen(false);
    }, this.releaseDelayMs);
  }

  /**
   * Close immediately and forget a held key (focus lost, call left, mode changed)
   */
  reset() {
    this.held = false;
    this.clearTimer();
    this.setOpen(false);
  }

  /**
   * Change the release delay for following releases
   * @param ms Delay in milliseconds
   */
  setReleaseDelay(ms: number) {
    this.releaseDelayMs = ms;
  }

  private clearTimer() {
    if (this.timer !== undefined) {
      this.cancel(this.timer);
      this.timer = undefined;
    }
  }

  private setOpen(open: boolean) {
    if (this.isOpen === open) return;
    this.isOpen = open;
    this.onChange(open);
  }
}
