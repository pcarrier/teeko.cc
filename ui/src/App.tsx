import { FunctionComponent, h } from "preact";
import { useRegisterSW } from "virtual:pwa-register/preact";
import { useState } from "preact/hooks";

import { historyPush, setHash } from "./utils.ts";
import { useEvent } from "./useEvent.ts";
import { emptyBoard } from "./model";
import { Game } from "./Game";
import { Help } from "./Help.tsx";
import { OnlineBar } from "./OnlineBar.tsx";

export const App: FunctionComponent = () => {
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [wsPath, setWsPath] = useState<string | undefined>(undefined);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      r && setInterval(() => r.update(), 60 * 1000);
    },
  });

  let initial = emptyBoard();

  let foundBoardInURL = false;

  if (window.location.hash.startsWith("#%5B")) {
    try {
      const [a, b, m] = JSON.parse(
        decodeURI(window.location.hash.substring(1))
      );
      initial = { a, b, m, p: true };
      foundBoardInURL = true;
    } catch (_) {
      console.log("Invalid URL parameters");
    }
  }

  if (!foundBoardInURL) {
    const stored = localStorage.getItem("board");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.m) {
        initial = parsed;
        setHash(initial);
      }
    }
  }

  function updateWsPath() {
    setWsPath(
      window.location.pathname.length < 2
        ? undefined
        : window.location.pathname.substring(1)
    );
  }

  updateWsPath();

  useEvent("popstate", updateWsPath);

  function jump(location: string | undefined) {
    historyPush(location ? `/${location}` : "/");
    updateWsPath();
  }

  if (showHelp) return <Help close={() => setShowHelp(false)} />;

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
      <Game
        initial={initial}
        roomPath={wsPath}
        showHelp={() => setShowHelp(true)}
      />
    </>
  );
};
