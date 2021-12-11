import { FunctionComponent, h } from "preact";
import { BoardView } from "./BoardView";
import { EmptyBoard } from "./model";

export const Help: FunctionComponent<{ close: () => void }> = ({ close }) => (
  <div class="help">
    <p>Each player has 4 pieces.</p>
    <p>
      They first place one at a time on empty slots;
      <br />
      once all are placed, they move one at a time to an empty neighbor.
    </p>
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
