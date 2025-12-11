import { FunctionComponent } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { IntlProvider, Localizer, Text } from "preact-i18n";
import { useEvent } from "./useEvent.js";
import {
  Board,
  emptyBoard,
  Message,
  RoomMessage,
  RTCSignal,
  computePlace,
  computeMove,
} from "teeko-cc-common/src/model.js";
import { Game } from "./Game";
import { Help } from "./Help.jsx";
import { TitleBar } from "./TitleBar";
import { BotControls } from "./BotControls";
import { wsUrl } from "./env.js";
import Sockette from "sockette";
import { randomID } from "./random";
import translations from "./translations";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faClose } from "@fortawesome/free-solid-svg-icons/faClose";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons/faUserPlus";
import { faClipboardCheck } from "@fortawesome/free-solid-svg-icons/faClipboardCheck";
import { faDiscord } from "@fortawesome/free-brands-svg-icons/faDiscord";
import { faWikipediaW } from "@fortawesome/free-brands-svg-icons/faWikipediaW";
import { faBook } from "@fortawesome/free-solid-svg-icons/faBook";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faHouse } from "@fortawesome/free-solid-svg-icons/faHouse";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { spinner } from "./Spinner";
import {
  getBotMove,
  isGameOver,
  Difficulty,
  onDbProgress,
} from "./bot";
import { useVoiceChat } from "./useVoiceChat";

export enum OnlineStatus {
  OFFLINE,
  ONLINE,
}

type Route =
  | { type: "menu" }
  | { type: "rules" }
  | { type: "play" }
  | { type: "friends" }
  | { type: "room"; id: string };

function parseRoute(pathname: string): Route {
  const path = pathname.substring(1);
  if (path === "rules") return { type: "rules" };
  if (path === "play") return { type: "play" };
  if (path === "friends") return { type: "friends" };
  if (path.startsWith("room/")) return { type: "room", id: path.substring(5) };
  return { type: "menu" };
}

function loadBoard(key: string): Board {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.m) return parsed;
    }
  } catch {}
  return emptyBoard();
}

const FooterLinks: FunctionComponent<{ onInstall?: () => void }> = ({
  onInstall,
}) => (
  <nav class="footerLinks" aria-label="Footer links">
    {onInstall && (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onInstall();
        }}
      >
        <FontAwesomeIcon icon={faDownload} /> <Text id="menu.install" />
      </a>
    )}
    <a href="https://discord.gg/KEj9brTRS6" target="_blank" rel="noopener">
      <FontAwesomeIcon icon={faDiscord} /> <Text id="buttons.discord" />
    </a>
    <a
      href="https://en.wikipedia.org/wiki/Teeko"
      target="_blank"
      rel="noopener"
    >
      <FontAwesomeIcon icon={faWikipediaW} /> <Text id="buttons.wikipedia" />
    </a>
  </nav>
);

export const App: FunctionComponent = () => {
  const audio = useMemo(() => new Audio("/bell.opus"), []);
  const startLang = useMemo(() => {
    const saved = localStorage.getItem("lang");
    if (saved) return saved;
    const preferred = navigator.languages.map((l) => l.split("-")[0]);
    return preferred.find((l) => l in translations) || "en";
  }, []);
  const [isOffline, setIsOffline] = useState(() => {
    window.addEventListener("online", () => setIsOffline(false));
    window.addEventListener("offline", () => setIsOffline(true));
    return !navigator.onLine;
  });
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    if (isStandalone) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  const [lang, setLang] = useState(startLang);
  const [nickname, setNickname] = useState(
    () => localStorage.getItem("nickname") || ""
  );
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname)
  );
  const [hasCopied, setHasCopied] = useState(false);
  const [nextRoom, setNextRoom] = useState("");
  const [ws, setWs] = useState<Sockette>();
  const [onlineStatus, setOnlineStatus] = useState(OnlineStatus.OFFLINE);
  const [board, setBoard] = useState<Board>(() => loadBoard("localBoard"));
  const [botAEnabled, _setBotAEnabled] = useState<boolean>(
    () => localStorage.getItem("botAEnabled") === "true"
  );
  const [botBEnabled, _setBotBEnabled] = useState<boolean>(
    () => localStorage.getItem("botBEnabled") === "true"
  );
  const [botADifficulty, _setBotADifficulty] = useState<Difficulty>(
    () => (localStorage.getItem("botADifficulty") as Difficulty) || "medium"
  );
  const [botBDifficulty, _setBotBDifficulty] = useState<Difficulty>(
    () => (localStorage.getItem("botBDifficulty") as Difficulty) || "medium"
  );
  const [botDelay, _setBotDelay] = useState<number>(
    () => parseInt(localStorage.getItem("botDelay") || "0", 10)
  );
  const botDelayRef = useRef(botDelay);
  botDelayRef.current = botDelay;
  const [botSelection, setBotSelection] = useState<number | undefined>(undefined);
  const [dbProgress, setDbProgress] = useState(0);
  const [isMatching, setMatching] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);
  const [voicePeers, setVoicePeers] = useState<string[]>([]);
  const [analysisUsed, setAnalysisUsed] = useState(false);

  const rtcSignalHandlerRef = useRef<((signal: RTCSignal) => void) | null>(
    null
  );
  const onRTCSignal = useCallback((handler: (signal: RTCSignal) => void) => {
    rtcSignalHandlerRef.current = handler;
  }, []);

  const isConnected = onlineStatus === OnlineStatus.ONLINE;
  const voiceChat = useVoiceChat(
    ws,
    isConnected,
    nickname,
    voicePeers,
    onRTCSignal
  );

  const roomPath = route.type === "room" ? route.id : undefined;
  const isLocalGame = route.type === "play";
  const showGame = isLocalGame || (roomPath && nickname);
  const currentPlayer = board.m.length % 2 === 0 ? "a" : "b";
  const isBotTurn =
    isLocalGame &&
    !isGameOver(board) &&
    ((currentPlayer === "a" && botAEnabled) ||
      (currentPlayer === "b" && botBEnabled));
  const currentBotDifficulty =
    currentPlayer === "a" ? botADifficulty : botBDifficulty;

  const setBotAEnabled = (enabled: boolean) => {
    localStorage.setItem("botAEnabled", String(enabled));
    _setBotAEnabled(enabled);
  };

  const setBotBEnabled = (enabled: boolean) => {
    localStorage.setItem("botBEnabled", String(enabled));
    _setBotBEnabled(enabled);
  };

  const setBotADifficulty = (d: Difficulty) => {
    localStorage.setItem("botADifficulty", d);
    _setBotADifficulty(d);
  };

  const setBotBDifficulty = (d: Difficulty) => {
    localStorage.setItem("botBDifficulty", d);
    _setBotBDifficulty(d);
  };

  const setBotDelay = (ms: number) => {
    localStorage.setItem("botDelay", String(ms));
    _setBotDelay(ms);
  };

  const navigate = (path: string) => {
    history.pushState({}, "", path);
    setRoute(parseRoute(path));
  };

  const joinRoom = (roomId: string) => navigate(`/room/${roomId}`);

  const setNicknameAndSave = (value: string) => {
    setNickname(value);
    localStorage.setItem("nickname", value);
  };

  useEvent("popstate", () => setRoute(parseRoute(window.location.pathname)));

  useEffect(() => {
    if (isLocalGame) setBoard(loadBoard("localBoard"));
  }, [isLocalGame]);

  useEffect(() => {
    if (!botAEnabled && !botBEnabled) return;
    return onDbProgress(setDbProgress);
  }, [botAEnabled, botBEnabled]);

  const analysisUsedRef = useRef(analysisUsed);
  analysisUsedRef.current = analysisUsed;

  const moveToBoard = (newBoard: Board, propagate = true) => {
    setBoard(newBoard);
    if (newBoard.a === 0) setAnalysisUsed(false);
    if (route.type === "play")
      localStorage.setItem("localBoard", JSON.stringify(newBoard));
    if (propagate && ws)
      ws.send(JSON.stringify({ st: { board: newBoard, analyzed: analysisUsedRef.current } } as Message));
  };

  const wsRef = useRef(ws);
  wsRef.current = ws;

  const handleAnalysisUsed = useCallback(() => {
    if (analysisUsedRef.current) return;
    setAnalysisUsed(true);
    wsRef.current?.send(JSON.stringify({ st: { analyzed: true } } as Message));
  }, []);

  useEffect(() => {
    if (!isBotTurn) {
      setBotSelection(undefined);
      return;
    }
    let cancelled = false;
    let timeout1: ReturnType<typeof setTimeout>;
    let timeout2: ReturnType<typeof setTimeout>;
    let timeout3: ReturnType<typeof setTimeout>;
    getBotMove(board, currentBotDifficulty).then((move) => {
      if (cancelled || !move) return;
      const isPlacement = board.m.length < 8;
      const delay = botDelayRef.current;
      const execute = () => {
        if (cancelled) return;
        setBotSelection(undefined);
        const newBoard = isPlacement
          ? computePlace(board, move.to)
          : move.from !== undefined
          ? computeMove(board, move.from, move.to)
          : undefined;
        if (newBoard) moveToBoard(newBoard);
      };
      if (delay > 0) {
        if (!isPlacement && move.from !== undefined) {
          // Three-phase: delay, select piece, delay, move
          timeout1 = setTimeout(() => {
            if (cancelled) return;
            setBotSelection(move.from);
            timeout2 = setTimeout(() => {
              if (cancelled) return;
              execute();
            }, delay);
          }, delay);
        } else {
          // Placement: just delay then place
          timeout3 = setTimeout(execute, delay);
        }
      } else {
        execute();
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      setBotSelection(undefined);
    };
  }, [isBotTurn, board, currentBotDifficulty]);

  const displayBoard = !board.p && !roomPath ? { ...board, p: true } : board;

  useEffect(() => {
    if (!isMatching || !nickname) return;
    const sockette = new Sockette(wsUrl("lobby", nickname), {
      onmessage: (evt: MessageEvent) => {
        const msg = JSON.parse(evt.data) as Message;
        if (msg.join) {
          setMatching(false);
          moveToBoard(emptyBoard());
          audio.play();
          joinRoom(msg.join);
        }
      },
    });
    return () => {
      sockette.close();
      setMatching(false);
    };
  }, [isMatching]);

  useEffect(() => {
    if (!roomPath || !nickname) return;
    const sockette = new Sockette(wsUrl(`room/${roomPath}`, nickname), {
      onopen: () => setOnlineStatus(OnlineStatus.ONLINE),
      onreconnect: () => {
        setOnlineStatus(OnlineStatus.OFFLINE);
        setPeers([]);
        setVoicePeers([]);
        setAnalysisUsed(false); // Server will resend current state
      },
      onclose: () => {
        setOnlineStatus(OnlineStatus.OFFLINE);
        setPeers([]);
        setVoicePeers([]);
      },
      onmessage: (evt: MessageEvent) => {
        const msg = JSON.parse(evt.data) as RoomMessage & Message;
        if (msg.st === null)
          ws?.send(JSON.stringify({ st: { board, analyzed: analysisUsedRef.current } } as Message));
        if (msg.st?.board) moveToBoard(msg.st.board, false);
        if (msg.st?.analyzed) setAnalysisUsed(true);
        if (msg.peers !== undefined) setPeers(msg.peers);
        if (msg.voicePeers !== undefined) setVoicePeers(msg.voicePeers);
        if (msg.rtc && rtcSignalHandlerRef.current)
          rtcSignalHandlerRef.current(msg.rtc);
      },
    });
    setWs(sockette);
    return () => {
      sockette.close();
      setWs(undefined);
      setPeers([]);
      setVoicePeers([]);
      voiceChat.stopVoiceChat();
    };
  }, [roomPath, nickname]);

  useEffect(() => {
    if (hasCopied) setTimeout(() => setHasCopied(false), 1000);
  }, [hasCopied]);

  const share = () => {
    const url = `https://teeko.cc/room/${roomPath}`;
    if (navigator.share) {
      navigator.share({ title: `teeko.cc (${roomPath})`, text: "Teeko?", url });
    } else {
      navigator.clipboard
        .writeText(`Teeko? ${url}`)
        .then(() => setHasCopied(true));
    }
  };

  return (
    <IntlProvider definition={translations[lang]}>
      <article class="top">
        <header>
          <button
            class={`icon ${route.type === "menu" ? "invisible" : ""}`}
            onClick={() => navigate("/")}
            aria-label={route.type === "rules" ? "Close" : "Menu"}
          >
            <FontAwesomeIcon icon={route.type === "rules" ? faClose : faBars} />
          </button>
          <button
            class={`icon ${route.type !== "room" ? "invisible" : ""}`}
            onClick={share}
            aria-label="Invite"
          >
            <FontAwesomeIcon icon={hasCopied ? faClipboardCheck : faUserPlus} />
          </button>
          <h1>Teeko.cc</h1>
          <select
            aria-label="Language"
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              localStorage.setItem("lang", v);
              setLang(v);
            }}
          >
            {Object.keys(translations).map((l) => (
              <option value={l} selected={l === lang}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </header>

        {route.type === "menu" && (
          <menu>
            <li>
              <button onClick={() => navigate("/rules")}>
                <FontAwesomeIcon icon={faBook} /> <Text id="menu.rules" />
              </button>
            </li>
            <li>
              <button onClick={() => navigate("/play")}>
                <FontAwesomeIcon icon={faHouse} />{" "}
                <Text id="menu.playLocally" />
              </button>
            </li>
            {isOffline && (
              <li class="offlineNotice">
                <Text id="menu.offline" />
              </li>
            )}
            {!isOffline && (
              <>
                <li>
                  <Localizer>
                    <input
                      type="text"
                      value={nickname}
                      placeholder={<Text id="titleBar.nicknamePlaceholder" />}
                      maxLength={256}
                      onInput={(e: Event) =>
                        setNicknameAndSave((e.target as HTMLInputElement).value)
                      }
                    />
                  </Localizer>
                </li>
                <li class="row">
                  <button
                    disabled={!nickname.trim() || isMatching}
                    onClick={() => setMatching(true)}
                  >
                    <FontAwesomeIcon icon={faSearch} />{" "}
                    <Text id="menu.findPlayer" />
                  </button>
                  <button
                    disabled={!nickname.trim()}
                    onClick={() => navigate("/friends")}
                  >
                    <FontAwesomeIcon icon={faUsers} />{" "}
                    <Text id="menu.playWithFriends" />
                  </button>
                </li>
                <li>
                  <FooterLinks
                    onInstall={
                      installPrompt && !isStandalone ? handleInstall : undefined
                    }
                  />
                </li>
              </>
            )}
          </menu>
        )}

        {route.type === "friends" && (
          <section class="friends">
            <h2>
              <Text id="titleBar.friends" />
            </h2>
            <form
              class="joinForm"
              onSubmit={(e) => {
                e.preventDefault();
                if (nickname.trim()) joinRoom(nextRoom || randomID());
              }}
            >
              <Localizer>
                <input
                  type="text"
                  value={nextRoom}
                  placeholder={<Text id="titleBar.boardNameInput" />}
                  maxLength={256}
                  onInput={(e: Event) =>
                    setNextRoom((e.target as HTMLInputElement).value)
                  }
                />
              </Localizer>
              <button type="submit" disabled={!nickname.trim()}>
                <Text id="titleBar.join" />
              </button>
            </form>
          </section>
        )}

        {route.type === "rules" && <Help />}

        {roomPath && !nickname && (
          <section class="gameSection">
            <form
              class="nicknamePrompt"
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).elements.namedItem(
                  "nickname"
                ) as HTMLInputElement;
                if (input.value.trim()) setNicknameAndSave(input.value.trim());
              }}
            >
              <Localizer>
                <input
                  type="text"
                  name="nickname"
                  placeholder={<Text id="titleBar.nicknamePlaceholder" />}
                  maxLength={256}
                  autoFocus
                />
              </Localizer>
              <button type="submit">
                <Text id="titleBar.join" />
              </button>
            </form>
          </section>
        )}

        {showGame && (
          <section class="gameSection">
            <TitleBar
              roomPath={roomPath}
              peers={peers}
              onlineStatus={onlineStatus}
              voiceChat={voiceChat}
              voicePeers={new Set(voicePeers)}
            />
            <Game
              board={displayBoard}
              roomPath={roomPath}
              moveToBoard={moveToBoard}
              disabled={isBotTurn}
              singleBotMode={isLocalGame && (botAEnabled !== botBEnabled)}
              botSelection={botSelection}
              analysisUsed={analysisUsed}
              onAnalysisUsed={handleAnalysisUsed}
            />
          </section>
        )}

        {isLocalGame && (
          <BotControls
            bot={{
              botAEnabled,
              botBEnabled,
              botADifficulty,
              botBDifficulty,
              botDelay,
              botSelection,
              dbProgress,
              isBotTurn,
              singleBotMode: botAEnabled !== botBEnabled,
              setBotAEnabled,
              setBotBEnabled,
              setBotADifficulty,
              setBotBDifficulty,
              setBotDelay,
            }}
          />
        )}

        {isMatching && (
          <aside class="matchingOverlay" role="status">
            <p>
              {spinner} <Text id="titleBar.matching" />
            </p>
            <button onClick={() => setMatching(false)}>
              <Text id="titleBar.cancel" />
            </button>
          </aside>
        )}
      </article>
    </IntlProvider>
  );
};
