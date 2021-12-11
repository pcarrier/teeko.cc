import { FunctionComponent } from "preact";
import { Board, EmptyBoard } from "./model";
import { Provider } from "@urql/preact";
import { LocalGame } from "./LocalGame";
import { client } from "./index";
import Router from "preact-router";
import { OnlineGame } from "./OnlineGame";
import { registerSW } from "virtual:pwa-register";

export const App: FunctionComponent = () => {
  let initial: Board = { ...EmptyBoard };
  let foundBoardInURL = false;

  if (location.hash.startsWith("#[")) {
    try {
      const [a, b, t, l] = JSON.parse(decodeURI(location.hash.substring(1)));
      initial = { a, b, t, l, p: true };
      initial.a = a;
      initial.b = b;
      initial.t = t;
      initial.l = l;
      foundBoardInURL = true;
    } catch (_) {
      console.log("Invalid URL parameters");
    }
  }

  if (!foundBoardInURL) {
    const stored = localStorage.getItem("board");
    if (stored) {
      initial = JSON.parse(stored);
    }
  }

  registerSW();

  return (
    <Provider value={client}>
      <Router>
        <LocalGame initial={initial} default />
        <OnlineGame path="/join/:room" />
      </Router>
    </Provider>
  );
};
