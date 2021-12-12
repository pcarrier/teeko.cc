import "./index.less";

import { render } from "preact";
import { v4 } from "uuid";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { Board } from "./model";

const authPrefix = "#auth:";
if (location.hash.startsWith(authPrefix)) {
  localStorage.setItem("pill", location.hash.substring(authPrefix.length));
  location.hash = "";
} else {
  if (!localStorage.getItem("pill")) {
    localStorage.setItem("pill", v4());
  }
}

export function setHash(board: Board) {
  location.replace(
    `#${encodeURI(JSON.stringify([board.a, board.b, board.t, board.l]))}`
  );
}

render(<App />, document.body);
registerSW();
