import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons/faRobot";
import { faRotate } from "@fortawesome/free-solid-svg-icons/faRotate";
import { spinner } from "./Spinner";
import { Difficulty } from "./bot";

export interface BotState {
  botAEnabled: boolean;
  botBEnabled: boolean;
  botADifficulty: Difficulty;
  botBDifficulty: Difficulty;
  botDelay: number;
  botSelection?: number;
  dbProgress: number;
  isBotTurn: boolean;
  singleBotMode: boolean;
  autoRestart: boolean;
  setBotAEnabled: (enabled: boolean) => void;
  setBotBEnabled: (enabled: boolean) => void;
  setBotADifficulty: (d: Difficulty) => void;
  setBotBDifficulty: (d: Difficulty) => void;
  setBotDelay: (ms: number) => void;
  setAutoRestart: (enabled: boolean) => void;
}

const DifficultySelect: FunctionComponent<{
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}> = ({ value, onChange }) => (
  <select
    aria-label="Difficulty"
    value={value}
    onChange={(e) =>
      onChange((e.target as HTMLSelectElement).value as Difficulty)
    }
  >
    <option value="beginner">
      <Text id="bot.beginner" />
    </option>
    <option value="easy">
      <Text id="bot.easy" />
    </option>
    <option value="medium">
      <Text id="bot.medium" />
    </option>
    <option value="hard">
      <Text id="bot.hard" />
    </option>
    <option value="perfect">
      <Text id="bot.perfect" />
    </option>
  </select>
);

const DelayInput: FunctionComponent<{
  value: number;
  onChange: (ms: number) => void;
}> = ({ value, onChange }) => (
  <div class="delayInput">
    <label>
      <Text id="bot.delay" />
      <input
        type="number"
        min="0"
        max="10000"
        step="100"
        value={value}
        onInput={(e) =>
          onChange(parseInt((e.target as HTMLInputElement).value, 10) || 0)
        }
      />
    </label>
  </div>
);

export const BotControls: FunctionComponent<{
  bot: BotState;
}> = ({ bot }) => (
  <footer class="botControls">
    <div class="botGroup blue">
      <button
        onClick={() => bot.setBotAEnabled(!bot.botAEnabled)}
        class={bot.botAEnabled ? "selected" : undefined}
      >
        <FontAwesomeIcon icon={faRobot} />
      </button>
      <DifficultySelect
        value={bot.botADifficulty}
        onChange={bot.setBotADifficulty}
      />
    </div>
    <div class="botGroup red">
      <button
        onClick={() => bot.setBotBEnabled(!bot.botBEnabled)}
        class={bot.botBEnabled ? "selected" : undefined}
      >
        <FontAwesomeIcon icon={faRobot} />
      </button>
      <DifficultySelect
        value={bot.botBDifficulty}
        onChange={bot.setBotBDifficulty}
      />
    </div>
    {(bot.botAEnabled || bot.botBEnabled) && (
      <>
        <DelayInput value={bot.botDelay} onChange={bot.setBotDelay} />
        <button
          onClick={() => bot.setAutoRestart(!bot.autoRestart)}
          class={bot.autoRestart ? "selected" : undefined}
        >
          <FontAwesomeIcon icon={faRotate} /> <Text id="bot.autoRestart" />
        </button>
      </>
    )}
    {(bot.botAEnabled || bot.botBEnabled) && bot.dbProgress < 1 && (
      <p class="dbProgress">
        {spinner}{" "}
        <Text
          id="bot.loading"
          fields={{ progress: Math.round(bot.dbProgress * 100) }}
        />
      </p>
    )}
  </footer>
);
