import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { BoardView } from "./BoardView";
import { emptyBoard, Player } from "teeko-cc-common/src/model.js";
import Slider from "react-slick";

export const Help: FunctionComponent<{
  close: () => void;
}> = ({ close }) => (
  <div class="help">
    <Slider dots={true} arrows={true} infinite={true} speed={200}>
      <div>
        <p>
          <Text id="help.open" />
        </p>
        <BoardView board={{ ...emptyBoard(), p: false }} klass="half" />
      </div>
      <div>
        <p>
          <Text id="help.place" />
        </p>
        <p>
          <Text id="help.move" />
        </p>
        <BoardView
          board={{ ...emptyBoard(), a: 143424, b: 329856, p: false }}
          klass="half"
          arrows={[
            { from: 6, to: 0, player: Player.A },
            { from: 6, to: 1, player: Player.A },
            { from: 6, to: 5, player: Player.A },
            { from: 12, to: 8, player: Player.A },
            { from: 13, to: 8, player: Player.A },
            { from: 13, to: 9, player: Player.A },
            { from: 13, to: 14, player: Player.A },
            { from: 13, to: 19, player: Player.A },
            { from: 17, to: 21, player: Player.A },
            { from: 17, to: 22, player: Player.A },
            { from: 17, to: 23, player: Player.A },
          ]}
        />
        <BoardView
          board={{ ...emptyBoard(), a: 143424, b: 329856, p: false }}
          klass="half"
          arrows={[
            { from: 7, to: 1, player: Player.B },
            { from: 7, to: 2, player: Player.B },
            { from: 7, to: 3, player: Player.B },
            { from: 7, to: 8, player: Player.B },
            { from: 11, to: 5, player: Player.B },
            { from: 11, to: 10, player: Player.B },
            { from: 11, to: 15, player: Player.B },
            { from: 16, to: 10, player: Player.B },
            { from: 16, to: 15, player: Player.B },
            { from: 16, to: 20, player: Player.B },
            { from: 16, to: 21, player: Player.B },
            { from: 16, to: 22, player: Player.B },
            { from: 18, to: 14, player: Player.B },
            { from: 18, to: 19, player: Player.B },
            { from: 18, to: 22, player: Player.B },
            { from: 18, to: 23, player: Player.B },
            { from: 18, to: 24, player: Player.B },
          ]}
        />
      </div>
      <div>
        <p>
          <Text id="help.win" />
        </p>
        <BoardView
          board={{ ...emptyBoard(), a: 2236928, p: false }}
          klass="half"
        />
        <BoardView
          board={{ ...emptyBoard(), b: 6336, p: false }}
          klass="half"
        />
      </div>
    </Slider>
    <p style="margin-top: 4em">
      <Text id="help.credits" />
    </p>
    <button onClick={close}>
      <Text id="help.close" />
    </button>
  </div>
);
