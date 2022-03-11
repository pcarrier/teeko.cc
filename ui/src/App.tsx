import { FunctionComponent, h } from "preact";
import { useRegisterSW } from "virtual:pwa-register/preact";
import { useEffect, useState } from "preact/hooks";

import { historyPush, setHash } from "./utils.ts";
import { useEvent } from "./useEvent.ts";
import { emptyBoard } from "teeko-cc-common/src/model";
import { Game } from "./Game";
import { Help } from "./Help.tsx";
import { OnlineBar } from "./OnlineBar.tsx";

export enum OnlineStatus {
  OFFLINE,
  ONLINE
}

export const App: FunctionComponent = () => {
  const {
    needRefresh: [needsRefresh, setNeedsRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      r && setInterval(() => r.update(), 10_000);
    },
  });

  useEffect(async () => {
    if (needsRefresh) {
      setNeedsRefresh(false);
      await updateServiceWorker(true);
    }
  });

  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [wsPath, setWsPath] = useState<string | undefined>(undefined);
  const [pop, setPop] = useState<number | undefined>(undefined);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>(OnlineStatus.OFFLINE);

  let initial = emptyBoard();

  const stored = localStorage.getItem("board");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.m) {
      initial = parsed;
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
      <OnlineBar wsPath={wsPath} pop={pop} jump={jump} onlineStatus={onlineStatus} />
      <Game
        initial={initial}
        roomPath={wsPath}
        showHelp={() => setShowHelp(true)}
        setPop={setPop}
        setOnlineStatus={setOnlineStatus}
      />
    </>
  );
};
