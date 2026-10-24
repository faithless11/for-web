import { createEffect, createRoot, createSignal } from "solid-js";

import { getActiveCustomVoice } from "../voice/CustomVoice";

import workletUrl from "./gate.worklet.ts?worker&url";

/**
 * Contexts the gate worklet module has already been added to
 */
const loadedContexts = new WeakSet<BaseAudioContext>();

/**
 * Whether the push-to-talk key is currently held (set by PushToTalkController)
 */
const [pushToTalkOpen, setPushToTalkOpenSignal] = createSignal(false);

/**
 * Report whether the push-to-talk key is held
 * @param open Whether audio may pass in push-to-talk mode
 */
export function setPushToTalkOpen(open: boolean) {
  setPushToTalkOpenSignal(open);
}

/**
 * Whether audio may be transmitted right now: always with voice activation,
 * only while the key is held in push-to-talk mode. Reactive.
 */
export function transmitAllowed(): boolean {
  const settings = getActiveCustomVoice();
  return !settings || settings.inputMode !== "ptt" || pushToTalkOpen();
}

/**
 * Main-thread handle of a volume gate worklet node
 */
export class GateNode {
  /**
   * Load the gate worklet into an audio context (once per context)
   * @param ctx Audio context
   */
  static async load(ctx: BaseAudioContext): Promise<void> {
    if (loadedContexts.has(ctx)) return;
    await ctx.audioWorklet.addModule(workletUrl);
    loadedContexts.add(ctx);
  }

  readonly node: AudioWorkletNode;
  private enabled = false;
  private thresholdDb = -50;
  private transmit = true;
  private followPushToTalk = true;
  private readonly levelListeners = new Set<
    (levelDb: number, open: boolean) => void
  >();

  /**
   * Create a gate node; GateNode.load must have completed for this context
   * @param ctx Audio context
   */
  constructor(ctx: BaseAudioContext) {
    this.node = new AudioWorkletNode(ctx, "stoat-custom-gate", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: "explicit",
      outputChannelCount: [1],
    });
    this.node.port.onmessage = (
      event: MessageEvent<{ levelDb: number; open: boolean }>,
    ) =>
      this.levelListeners.forEach((cb) =>
        cb(event.data.levelDb, event.data.open),
      );
    this.sync();
  }

  /**
   * Enable or disable level-based gating
   */
  setEnabled(value: boolean) {
    this.enabled = value;
    this.sync();
  }

  /**
   * Set the threshold in dBFS
   */
  setThresholdDb(value: number) {
    this.thresholdDb = value;
    this.sync();
  }

  /**
   * Allow or block transmitting (push-to-talk)
   */
  setTransmitAllowed(value: boolean) {
    this.transmit = this.followPushToTalk ? value : true;
    this.sync();
  }

  /**
   * Let audio pass regardless of push-to-talk (microphone test in settings)
   */
  ignorePushToTalk() {
    this.followPushToTalk = false;
    this.setTransmitAllowed(true);
  }

  /**
   * Subscribe to level reports (about every 50 ms)
   * @returns Unsubscribe function
   */
  onLevel(cb: (levelDb: number, open: boolean) => void): () => void {
    this.levelListeners.add(cb);
    return () => this.levelListeners.delete(cb);
  }

  /**
   * Send the current configuration to the worklet
   */
  sync() {
    this.node.port.postMessage({
      enabled: this.enabled,
      thresholdDb: this.thresholdDb,
      transmitAllowed: this.transmit,
    });
  }

  /**
   * Disconnect and forget this gate
   */
  dispose() {
    this.levelListeners.clear();
    this.node.port.onmessage = null;
    this.node.disconnect();
  }
}

/**
 * Insert a volume gate between two nodes, following the stored gate settings.
 *
 * If the worklet cannot be loaded, the nodes are connected directly, so audio
 * never fails because of the gate.
 * @param ctx Audio context
 * @param from Source node
 * @param to Destination node
 * @returns Gate node, or undefined if the gate could not be created
 */
export async function connectGate(
  ctx: BaseAudioContext,
  from: AudioNode,
  to: AudioNode,
): Promise<GateNode | undefined> {
  try {
    await GateNode.load(ctx);
    const gate = new GateNode(ctx);
    from.connect(gate.node);
    gate.node.connect(to);

    const settings = getActiveCustomVoice();
    if (settings) {
      const disposeRoot = createRoot((dispose) => {
        createEffect(() => {
          gate.setEnabled(settings.gateEnabled);
          gate.setThresholdDb(settings.gateThresholdDb);
          gate.setTransmitAllowed(transmitAllowed());
        });
        return dispose;
      });
      const originalDispose = gate.dispose.bind(gate);
      gate.dispose = () => {
        disposeRoot();
        originalDispose();
      };
    }
    return gate;
  } catch (error) {
    console.warn("[stoat-custom] volume gate unavailable, bypassing", error);
    from.connect(to);
    return undefined;
  }
}
