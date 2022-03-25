import { FunctionComponent } from "preact";
import { useRegisterSW } from "virtual:pwa-register/preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { IntlProvider, Localizer, Text } from "preact-i18n";
import { useEvent } from "./useEvent.js";
import { Board, emptyBoard, Message } from "teeko-cc-common/src/model.js";
import { Game } from "./Game";
import { Help } from "./Help.jsx";
import { TitleBar } from "./TitleBar.tsx";
import { wsUrl } from "./env.js";
import Sockette from "sockette";
import { setUserVars } from "@fullstory/browser";
import { randomID } from "./random";
import translations from "./translations";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons/faGlobe";
import { faQuestion } from "@fortawesome/free-solid-svg-icons/faQuestion";
import { faClose } from "@fortawesome/free-solid-svg-icons/faClose";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons/faUserPlus";
import { faClipboardCheck } from "@fortawesome/free-solid-svg-icons/faClipboardCheck";
import { faDiscord } from "@fortawesome/free-brands-svg-icons/faDiscord";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faWikipediaW } from "@fortawesome/free-brands-svg-icons/faWikipediaW";
import { spinner } from "./Spinner";

export enum OnlineStatus {
  OFFLINE,
  ONLINE,
}

export const App: FunctionComponent = () => {
  useRegisterSW({
    onRegistered(r) {
      r && setInterval(() => r.update(), 10 * 1000);
    },
  });

  const audio = useMemo(() => new Audio("/bell.opus"), undefined);

  const startLang = useMemo(() => {
    const oldLang = localStorage.getItem("lang");
    if (oldLang) return oldLang;
    const preferred = navigator.languages.map((l) => l.split("-")[0]);
    return preferred.find((l) => l in translations) || "en";
  }, undefined);
  const [lang, setLang] = useState(startLang);

  function moveToLang(lang: string) {
    localStorage.setItem("lang", lang);
    setLang(lang);
  }

  const translation = translations[lang];

  const [pill, startWithHelp] = useMemo(() => {
    const oldPill = localStorage.getItem("pill");
    if (oldPill !== null) {
      setUserVars({
        displayName: oldPill,
      });
      return [oldPill, false];
    }
    const newPill = randomID();
    localStorage.setItem("pill", newPill);
    setUserVars({
      displayName: newPill,
    });
    return [newPill, true];
  }, undefined);

  const [showHelp, setShowHelp] = useState<boolean>(startWithHelp);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [roomPath, setRoomPath] = useState<string | undefined>(undefined);
  const [nextRoom, setNextRoom] = useState();
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

  function moveToBoard(board: Board, propagate = true) {
    setBoard(board);
    localStorage.setItem("board", JSON.stringify(board));
    if (propagate && ws) {
      ws.send(JSON.stringify({ st: { board } } as Message));
    }
  }

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
            setMatching(false);
            moveToBoard(emptyBoard());
            audio.play();
            jump(msg.join);
          }
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
    setShowMenu(false);
    setShowHelp(false);
    history.pushState({}, "", location ? `/${location}` : "/");
    updateWsPath();
  }

  useEffect(() => {
    if (hasCopied) setTimeout(() => setHasCopied(false), 1_000);
  }, [hasCopied]);

  function share() {
    if (navigator.share)
      navigator.share({
        title: `teeko.cc (${roomPath})`,
        text: "Teeko?",
        url: `https://teeko.cc/${roomPath}`,
      });
    else {
      navigator.clipboard
        .writeText(`Teeko? https://teeko.cc/${roomPath}`)
        .then(() => setHasCopied(true));
    }
  }

  function openUrl(url: string) {
    setShowMenu(false);
    window.open(url, "_blank");
  }

  return (
    <IntlProvider definition={translation}>
      <div class="top">
        <div class="nav">
          {showMenu && (
            <div className="menu">
              {isJoining ? (
                <>
                  <h1>
                    <Text id="titleBar.friends" />
                  </h1>
                  <div className="joinBar">
                    <Localizer>
                      <input
                        type="text"
                        value={nextRoom}
                        placeholder={<Text id="titleBar.boardNameInput" />}
                        maxLength="256"
                        onInput={(e: Event) =>
                          setNextRoom((e.target as any).value)
                        }
                        onKeyUp={(e) => {
                          if (e.keyCode === 13) {
                            e.preventDefault();
                            jump(nextRoom || randomID());
                          }
                        }}
                      />
                    </Localizer>
                    <button
                      id="join"
                      onClick={() => jump(nextRoom || randomID())}
                    >
                      <Text id="titleBar.join" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1>
                    <Text id="titleBar.online" />
                  </h1>
                  {isMatching ? (
                    <button id="cancelMatch" onClick={() => setMatching(false)}>
                      {spinner} <Text id="titleBar.matching" />
                    </button>
                  ) : (
                    <button
                      id="match"
                      onClick={() => {
                        setShowMenu(false);
                        setMatching(true);
                      }}
                    >
                      <Text id="titleBar.matched" />
                    </button>
                  )}
                  <button
                    id="friends"
                    onClick={() => {
                      setMatching(false);
                      setJoining(true);
                    }}
                  >
                    <Text id="titleBar.friends" />
                  </button>
                  <div class="iconBar">
                    <button
                      onClick={() => openUrl("https://discord.gg/KEj9brTRS6")}
                    >
                      <FontAwesomeIcon icon={faDiscord} />
                    </button>
                    <button
                      onClick={() =>
                        openUrl("https://en.wikipedia.org/wiki/Teeko")
                      }
                    >
                      <FontAwesomeIcon icon={faWikipediaW} />
                    </button>
                    <button
                      onClick={() =>
                        openUrl("https://github.com/pcarrier/teeko.cc")
                      }
                    >
                      <FontAwesomeIcon icon={faGithub} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onclick={() => {
              if (roomPath) jump(undefined);
              else if (isJoining) setJoining(false);
              else setShowMenu(!showMenu);
            }}
          >
            <FontAwesomeIcon
              icon={showMenu || roomPath !== undefined ? faClose : faGlobe}
            />
          </button>
          {roomPath !== undefined && (
            <button id="share" onClick={share}>
              {hasCopied ? (
                <FontAwesomeIcon icon={faClipboardCheck} />
              ) : (
                <FontAwesomeIcon icon={faUserPlus} />
              )}
            </button>
          )}
          {isMatching && !showMenu && spinner}
          <h1>Teeko.cc</h1>
          <select
            className="langSelector"
            onChange={(e) => moveToLang(e.target.value)}
          >
            {Object.keys(translations).map((l) => (
              <option value={l} selected={l === lang}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setShowHelp(!showHelp);
            }}
          >
            <FontAwesomeIcon icon={showHelp ? faClose : faQuestion} />
          </button>
        </div>
        <div class="main">
          {showHelp ? (
            <Help close={() => setShowHelp(false)} />
          ) : (
            <>
              <TitleBar
                roomPath={roomPath}
                pop={pop}
                onlineStatus={onlineStatus}
              />
              <Game
                board={board}
                roomPath={roomPath}
                showHelp={() => setShowHelp(true)}
                moveToBoard={moveToBoard}
              />
            </>
          )}
        </div>
      </div>
    </IntlProvider>
  );
};
