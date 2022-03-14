import { FunctionComponent } from "preact";
import { useRegisterSW } from "virtual:pwa-register/preact";
import { useEffect, useState } from "preact/hooks";
import { IntlProvider } from "preact-i18n";
import { useEvent } from "./useEvent.js";
import { Board, emptyBoard, Message } from "teeko-cc-common/src/model.js";
import { Game } from "./Game";
import { Help } from "./Help.jsx";
import { OnlineBar } from "./OnlineBar.jsx";
import { nanoid } from "nanoid";
import { wsUrl } from "./env.js";
import Sockette from "sockette";

import definitions from "./translations.json";

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

  useEffect(() => {
    (async () => {
      if (needsRefresh) {
        await updateServiceWorker(true);
        setNeedsRefresh(false);
      }
    })();
  });

  const langs = navigator.languages.map((l) => l.split("-")[0]) || "en";
  const lang = langs.find((l) => l in definitions) as string;
  const definition = (definitions as any)[lang];

  const [pill, startWithHelp] = (() => {
    const oldPill = localStorage.getItem("pill");
    if (oldPill) return [oldPill, false];
    const newPill = nanoid();
    localStorage.setItem("pill", newPill);
    return [newPill, true];
  })();

  const [showHelp, setShowHelp] = useState<boolean>(startWithHelp);

  const [roomPath, setRoomPath] = useState<string | undefined>(undefined);
  const [ws, setWs] = useState<Sockette | undefined>(undefined);
  const [pop, setPop] = useState<number | undefined>(undefined);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>(
    OnlineStatus.OFFLINE
  );

  const [isJoining, setJoining] = useState(false);
  const [isMatching, setMatching] = useState(false);

  let initial = emptyBoard();

  const storedBoard = localStorage.getItem("board");
  if (storedBoard) {
    const parsed = JSON.parse(storedBoard);
    if (parsed.m) {
      initial = parsed;
    }
  }

  const [board, setBoard] = useState<Board>(initial);

  if (!board.p && !roomPath) board.p = true;

  function updateWsPath() {
    setRoomPath(
      window.location.pathname.length < 2
        ? undefined
        : window.location.pathname.substring(1)
    );
  }

  updateWsPath();
  useEvent("popstate", updateWsPath);

  useEffect(() => {
    if (isMatching) {
      const url = wsUrl("lobby", pill);
      const sockette = new Sockette(url, {
        onmessage: (evt: MessageEvent) => {
          const msg = JSON.parse(evt.data) as Message;
          if (msg.join) {
            moveToBoard(emptyBoard());
            jump(msg.join);
          }
        },
        onclose: () => {
          setMatching(false);
        },
      });
      return () => {
        sockette.close();
        setMatching(false);
      };
    }
  }, [isMatching]);

  function offline() {
    setOnlineStatus(OnlineStatus.OFFLINE);
    setPop(undefined);
  }

  useEffect(() => {
    if (roomPath) {
      const url = wsUrl(`room/${roomPath}`, pill);
      const sockette = new Sockette(url, {
        onopen: () => setOnlineStatus(OnlineStatus.ONLINE),
        onreconnect: offline,
        onclose: offline,
        onmessage: (evt: MessageEvent) => {
          const msg = JSON.parse(evt.data) as Message;
          if (msg.st === null) {
            ws?.send(JSON.stringify({ st: { board } } as Message));
          }
          if (msg.st?.board) {
            moveToBoard(msg.st.board, false);
          }
          if (msg.pop !== undefined) {
            setPop(msg.pop);
          }
        },
      });
      setWs(sockette);
      return () => {
        sockette.close();
        setWs(undefined);
      };
    }
  }, [roomPath]);

  function jump(location: string | undefined) {
    setJoining(false);
    history.pushState({}, "", location ? `/${location}` : "/");
    updateWsPath();
  }

  function moveToBoard(board: Board, propagate = true) {
    setBoard(board);
    localStorage.setItem("board", JSON.stringify(board));
    if (propagate && ws) {
      ws.send(JSON.stringify({ st: { board } } as Message));
    }
  }

  return (
    <IntlProvider definition={definition}>
      {showHelp ? (
        <Help close={() => setShowHelp(false)} />
      ) : (
        <>
          <OnlineBar
            roomPath={roomPath}
            jump={jump}
            pop={pop}
            onlineStatus={onlineStatus}
            isJoining={isJoining}
            setJoining={setJoining}
            isMatching={isMatching}
            setMatching={setMatching}
          />
          <Game
            board={board}
            roomPath={roomPath}
            showHelp={() => setShowHelp(true)}
            moveToBoard={moveToBoard}
          />
        </>
      )}
    </IntlProvider>
  );
};
