import { FunctionComponent, h } from "preact";
import { useRegisterSW } from "virtual:pwa-register/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { IntlProvider } from "preact-localization";
import { useEvent } from "./useEvent.ts";
import { emptyBoard } from "teeko-cc-common/src/model";
import { Game } from "./Game";
import { Help } from "./Help.tsx";
import { OnlineBar } from "./OnlineBar.tsx";
import { nanoid } from "nanoid";
import dictionaries from "./translations.json";

export enum OnlineStatus {
  OFFLINE,
  ONLINE,
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

  const langs = navigator.languages.map((l) => l.split("-")[0]) || "en";
  const lang = langs.find((l) => l in dictionaries);
  const dictionary = dictionaries[lang];

  function getPillOrHelp() {
    const oldPill = localStorage.getItem("pill");
    if (oldPill) return [oldPill, false];
    const newPill = nanoid();
    localStorage.setItem("pill", newPill);
    return [newPill, true];
  }

  const [pill, startWithHelp] = getPillOrHelp();

  const [showHelp, setShowHelp] = useState<boolean>(startWithHelp);
  const [wsPath, setWsPath] = useState<string | undefined>(undefined);
  const [pop, setPop] = useState<number | undefined>(undefined);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>(
    OnlineStatus.OFFLINE
  );
  const resetBoard = useRef<() => void | undefined>(undefined);

  let initial = emptyBoard();

  const stored = localStorage.getItem("board");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.m) {
      initial = parsed;
    }
  }

  if (!initial.p && !wsPath) initial.p = true;

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
    history.pushState({}, null, location ? `/${location}` : "/");
    updateWsPath();
  }

  return (
    <IntlProvider dictionary={dictionary}>
      {showHelp ? (
        <Help close={() => setShowHelp(false)} />
      ) : (
        <>
          <OnlineBar
            pill={pill}
            wsPath={wsPath}
            pop={pop}
            jump={jump}
            onlineStatus={onlineStatus}
            resetBoard={resetBoard}
          />
          <Game
            initial={initial}
            pill={pill}
            roomPath={wsPath}
            showHelp={() => setShowHelp(true)}
            setPop={setPop}
            setOnlineStatus={setOnlineStatus}
            resetBoard={resetBoard}
          />
        </>
      )}
    </IntlProvider>
  );
};
