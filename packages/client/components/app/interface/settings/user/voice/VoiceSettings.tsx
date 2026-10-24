import { Show } from "solid-js";

import { useInstance } from "@revolt/instance";
import { Column } from "@revolt/ui";

import { ScreenShareOptions } from "./ScreenShareOptions";
import { VoiceInputOptions } from "./VoiceInputOptions";
import { VoiceProcessingOptions } from "./VoiceProcessingOptions";

// stoat-custom: volume gate / push-to-talk settings
import { CustomVoiceOptions } from "../../../../../custom/CustomVoiceOptions";

/**
 * Configure voice options
 */
export function VoiceSettings() {
  const { limits } = useInstance();

  return (
    <Column gap="lg">
      <VoiceInputOptions />
      <VoiceProcessingOptions />
      {/* stoat-custom: volume gate / push-to-talk settings */}
      <CustomVoiceOptions />
      <Show when={limits().video}>
        <ScreenShareOptions />
      </Show>
    </Column>
  );
}
