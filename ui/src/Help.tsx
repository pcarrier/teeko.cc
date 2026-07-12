import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { moveDemo, placeDemo, RuleDemo, winDemo } from "./RuleDemo";

export const Help: FunctionComponent<{ onPlay?: () => void }> = ({
  onPlay,
}) => (
  <div class="help">
    <p class="intro">
      <Text id="help.open" />
    </p>
    <section class="rule">
      <h2>
        <span class="ruleNum">1</span>
        <Text id="help.placeTitle" />
      </h2>
      <p>
        <Text id="help.place" />
      </p>
      <RuleDemo frames={placeDemo} />
    </section>
    <section class="rule">
      <h2>
        <span class="ruleNum">2</span>
        <Text id="help.moveTitle" />
      </h2>
      <p>
        <Text id="help.move" />
      </p>
      <RuleDemo frames={moveDemo} />
    </section>
    <section class="rule">
      <h2>
        <span class="ruleNum">3</span>
        <Text id="help.winTitle" />
      </h2>
      <p>
        <Text id="help.win" />
      </p>
      <RuleDemo frames={winDemo} />
    </section>
    {onPlay && (
      <button class="playCta" onClick={onPlay}>
        <Text id="help.close" />
      </button>
    )}
    <p class="credits">
      <Text id="help.credits" />
    </p>
  </div>
);
