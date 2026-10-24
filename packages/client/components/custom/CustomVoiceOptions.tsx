import { useState } from "@revolt/state";
import { CategoryButton, Checkbox, Column, Slider, Text } from "@revolt/ui";

import { MicLevelMeter } from "./gate/MicLevelMeter";
import { t } from "./i18n";
import { PushToTalkOptions } from "./ptt/PushToTalkOptions";
import { GATE_THRESHOLD_MAX, GATE_THRESHOLD_MIN } from "./voice/settings";

/**
 * Settings of the stoat-custom voice features
 */
export function CustomVoiceOptions() {
  const state = useState();

  return (
    <Column>
      <Text class="title">{t("voiceActivationTitle")}</Text>
      <PushToTalkOptions />
      <CategoryButton.Group>
        <CategoryButton
          icon="blank"
          action={<Checkbox checked={state.customVoice.gateEnabled} />}
          onClick={() =>
            (state.customVoice.gateEnabled = !state.customVoice.gateEnabled)
          }
          description={t("gateEnableDescription")}
        >
          {t("gateEnable")}
        </CategoryButton>
      </CategoryButton.Group>
      <Text class="label">{t("gateThreshold")}</Text>
      <Slider
        min={GATE_THRESHOLD_MIN}
        max={GATE_THRESHOLD_MAX}
        step={1}
        value={state.customVoice.gateThresholdDb}
        onInput={(event) =>
          (state.customVoice.gateThresholdDb = event.currentTarget.value)
        }
        labelFormatter={(value) => `${value} dB`}
      />
      <MicLevelMeter />
    </Column>
  );
}
