import { FunctionComponent, h } from "preact";

import { BoardView } from "./BoardView";
import { EmptyBoard, Player } from "./model";

export const Help: FunctionComponent<{ close: () => void }> = ({ close }) => (
  <div class="help">
    <p>Each player has 4 pieces.</p>
    <p>
      They first place one at a time on empty slots;
      <br />
      once all are placed, they move one at a time to an empty neighbor:
    </p>
    <BoardView
      board={{ ...EmptyBoard, a: 143424, b: 329856, p: false, t: 0 }}
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
      board={{ ...EmptyBoard, a: 143424, b: 329856, p: false, t: 1 }}
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
        { from: 18, to: 19, player: Player.B },
        { from: 18, to: 22, player: Player.B },
        { from: 18, to: 23, player: Player.B },
        { from: 18, to: 24, player: Player.B },
      ]}
    />
    <p>Win by forming a straight line of 4 or a unit square:</p>
    <BoardView board={{ ...EmptyBoard, a: 2236928, p: false }} klass="half" />
    <BoardView board={{ ...EmptyBoard, b: 6336, p: false }} klass="half" />
    <p>
      <a href="https://en.wikipedia.org/wiki/Teeko">Wikipedia</a>,{" "}
      <a href="https://github.com/pcarrier/teeko.cc">code</a>,{" "}
      <a href="https://pcarrier.com/teeko">archives</a>
    </p>
    <p>
      <button onClick={close}>Play</button>
    </p>
  </div>
);
