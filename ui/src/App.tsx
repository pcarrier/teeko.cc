import { FunctionComponent, h } from "preact";
import { Board, EmptyBoard } from "./model";
import { Game } from "./Game";
import { setHash } from "./index";
import { useRegisterSW } from "virtual:pwa-register/preact";

export const App: FunctionComponent = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      r && setInterval(() => r.update(), 60 * 1000);
    }
  });

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

  const wsPath = location.pathname === "/" ? undefined : location.pathname;

  return (
    <>
      {needRefresh ? (
        <p class="banner">
          New version available.{" "}
          <button
            onClick={async () => {
              await updateServiceWorker(true);
              setNeedRefresh(false);
            }}
          >
            Reload
          </button>
        </p>
      ) : (
        <></>
      )}
      <Game initial={initial} wsPath={wsPath} />
    </>
  );
};
