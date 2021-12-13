import { FunctionComponent, h } from "preact";
import { Board, EmptyBoard } from "./model";
import { LocalGame } from "./LocalGame";
import Router from "preact-router";
import { OnlineGame } from "./OnlineGame";
import { setHash } from "./index";
import { useRegisterSW } from "virtual:pwa-register/preact";

export const App: FunctionComponent = () => {
  const { needRefresh, updateServiceWorker } = useRegisterSW();

  let initial: Board = { ...EmptyBoard };
  let foundBoardInURL = false;

  if (location.hash.startsWith("#%5B")) {
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
      setHash(initial);
    }
  }

  return (
    <>
      {needRefresh ? (
        <p>
          New version available;{" "}
          <a onClick={() => updateServiceWorker(true)}>reload</a>.
        </p>
      ) : (
        <></>
      )}
      <Router>
        <OnlineGame path="/join/:room" />
        <LocalGame initial={initial} testing={true} path="/test" />
        <LocalGame initial={initial} default />
      </Router>
    </>
  );
};
