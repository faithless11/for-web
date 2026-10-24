import type { NativePttBinding } from "../voice/settings";

/**
 * Global push-to-talk bridge provided by the stoat-custom desktop client
 * (exposed as `window.nativePtt` by its preload script).
 */
export interface NativePtt {
  version: 1;

  /**
   * Whether the global keyboard/mouse hook could be started
   */
  available(): Promise<boolean>;

  /**
   * Capture the next key or mouse button press (Escape or 10 s timeout → null)
   * @param lang Language of the label
   */
  record(lang?: "en" | "de"): Promise<NativePttBinding | null>;

  /**
   * Start listening for the binding, or stop the hook with null
   */
  listen(binding: NativePttBinding | null): void;

  /**
   * Subscribe to press/release of the bound key
   * @returns Unsubscribe function
   */
  onState(cb: (pressed: boolean) => void): () => void;
}

declare global {
  interface Window {
    nativePtt?: NativePtt;
  }
}

/**
 * Get the desktop client's push-to-talk bridge, if running in it
 */
export function getNativePtt(): NativePtt | undefined {
  return window.nativePtt?.version === 1 ? window.nativePtt : undefined;
}
