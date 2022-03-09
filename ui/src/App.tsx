import { FunctionComponent, h } from "preact";
import { Board, EmptyBoard } from "./model";
import { Game } from "./Game";
import { useRegisterSW } from "virtual:pwa-register/preact";
import { useState } from "preact/hooks";
import { historyPush, setHash } from "./utils.ts";
import { OnlineBar } from "./OnlineBar.tsx";
import { useEvent } from "./useEvent.ts";

export const App: FunctionComponent = () => {
  const [wsPath, setWsPath] = useState(undefined);

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

  if (window.location.hash.startsWith("#%5B")) {
    try {
      const [a, b, t, l] = JSON.parse(decodeURI(window.location.hash.substring(1)));
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

  function updateWsPath() {
    setWsPath(window.location.pathname.length < 2 ? undefined : window.location.pathname.substring(1));
  }

  updateWsPath();

  useEvent("popstate", updateWsPath);

  function jump(location: string | undefined) {
    historyPush(location ? `/${location}` : "/");
    updateWsPath();
  }

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
        <OnlineBar wsPath={wsPath} jump={jump} />
      )}
      <Game initial={initial} wsPath={wsPath} />
    </>
  );
};
