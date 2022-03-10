import { FunctionComponent, h } from "preact";

import { BoardView } from "./BoardView";
import { emptyBoard, Player } from "teeko-cc-common/src/model";

export const Help: FunctionComponent<{ close: () => void }> = ({ close }) => (
  <div class="help">
    <p>Each player has 4 pieces. Blue opens.</p>
    <p>
      First place all pieces down one by one in turn,
      <br />
      then move one to an empty neighbor each turn.
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
    <p>Win by forming a straight line of 4 or a unit square:</p>
    <BoardView board={{ ...emptyBoard(), a: 2236928, p: false }} klass="half" />
    <BoardView board={{ ...emptyBoard(), b: 6336, p: false }} klass="half" />
    <button onClick={close}>Close</button>
    <p>
      <a href="https://github.com/pcarrier/teeko.cc">code</a>,{" "}
      <a href="https://en.wikipedia.org/wiki/Teeko">Wikipedia</a>,{" "}
      <a href="https://pcarrier.com/teeko">archives</a>
    </p>
  </div>
);
