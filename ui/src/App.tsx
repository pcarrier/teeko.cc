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
import { wsUrl } from "./env.js";
import Sockette from "sockette";
import { randomID } from "./random";
import translations from "./translations";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faClose } from "@fortawesome/free-solid-svg-icons/faClose";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons/faUserPlus";
import { faClipboardCheck } from "@fortawesome/free-solid-svg-icons/faClipboardCheck";
import { faRobot } from "@fortawesome/free-solid-svg-icons/faRobot";
import { faDiscord } from "@fortawesome/free-brands-svg-icons/faDiscord";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faWikipediaW } from "@fortawesome/free-brands-svg-icons/faWikipediaW";
import { faBook } from "@fortawesome/free-solid-svg-icons/faBook";
import { faHouse } from "@fortawesome/free-solid-svg-icons/faHouse";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { spinner } from "./Spinner";
import { getBotMove, isGameOver, Difficulty, BotPlayer } from "./bot";
import { useVoiceChat } from "./useVoiceChat";

export enum OnlineStatus {
  OFFLINE,
  ONLINE,
}

type Route =
  | { type: "menu" }
  | { type: "rules" }
  | { type: "play" }
  | { type: "bot" }
  | { type: "friends" }
  | { type: "room"; id: string };

function parseRoute(pathname: string): Route {
  const path = pathname.substring(1);
  if (path === "rules") return { type: "rules" };
  if (path === "play") return { type: "play" };
  if (path === "bot") return { type: "bot" };
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

const DifficultySelect: FunctionComponent<{
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}> = ({ value, onChange }) => (
  <select
    aria-label="Difficulty"
    value={value}
    onChange={(e) =>
      onChange((e.target as HTMLSelectElement).value as Difficulty)
    }
  >
    <option value="beginner">
      <Text id="bot.beginner" />
    </option>
    <option value="easy">
      <Text id="bot.easy" />
    </option>
    <option value="medium">
      <Text id="bot.medium" />
    </option>
    <option value="hard">
      <Text id="bot.hard" />
    </option>
    <option value="perfect">
      <Text id="bot.perfect" />
    </option>
  </select>
);

const ExternalLinks: FunctionComponent = () => (
  <nav class="externalLinks" aria-label="External links">
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
    <a
      href="https://github.com/pcarrier/teeko.cc"
      target="_blank"
      rel="noopener"
    >
      <FontAwesomeIcon icon={faGithub} /> <Text id="buttons.source" />
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
  const [botDifficulty, _setBotDifficulty] = useState<Difficulty>(
    () => (localStorage.getItem("botDifficulty") as Difficulty) || "medium"
  );
  const [botPlaysAs, setBotPlaysAs] = useState<BotPlayer>("b");
  const [isBotThinking, setBotThinking] = useState(false);
  const [isMatching, setMatching] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);
  const [voicePeers, setVoicePeers] = useState<string[]>([]);

  const rtcSignalHandlerRef = useRef<((signal: RTCSignal) => void) | null>(
    null
  );
  const onRTCSignal = useCallback((handler: (signal: RTCSignal) => void) => {
    rtcSignalHandlerRef.current = handler;
  }, []);

  const isConnected = onlineStatus === OnlineStatus.ONLINE;
  const voiceChat = useVoiceChat(ws, isConnected, nickname, voicePeers, onRTCSignal);

  const roomPath = route.type === "room" ? route.id : undefined;
  const isBotGame = route.type === "bot";
  const showGame = route.type === "play" || isBotGame || (roomPath && nickname);
  const isBotTurn =
    isBotGame &&
    !isGameOver(board) &&
    (board.m.length % 2 === 0 ? "a" : "b") === botPlaysAs;

  const setBotDifficulty = (d: Difficulty) => {
    localStorage.setItem("botDifficulty", d);
    _setBotDifficulty(d);
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
    if (route.type === "play") setBoard(loadBoard("localBoard"));
    else if (isBotGame) setBoard(emptyBoard());
  }, [route.type, isBotGame]);

  const moveToBoard = (newBoard: Board, propagate = true) => {
    setBoard(newBoard);
    if (newBoard.m.length === 0) setBotPlaysAs("b");
    if (route.type === "play")
      localStorage.setItem("localBoard", JSON.stringify(newBoard));
    if (propagate && ws)
      ws.send(JSON.stringify({ st: { board: newBoard } } as Message));
  };

  useEffect(() => {
    if (!isBotTurn || isBotThinking) return;
    setBotThinking(true);
    const timeout = setTimeout(async () => {
      try {
        const move = await getBotMove(board, botDifficulty);
        if (move) {
          const newBoard =
            board.m.length < 8
              ? computePlace(board, move.to)
              : move.from !== undefined
              ? computeMove(board, move.from, move.to)
              : undefined;
          if (newBoard) moveToBoard(newBoard);
        }
      } catch (e) {
        console.error("Bot move failed:", e);
      } finally {
        setBotThinking(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [isBotTurn, board, botDifficulty]);

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
      },
      onclose: () => {
        setOnlineStatus(OnlineStatus.OFFLINE);
        setPeers([]);
        setVoicePeers([]);
      },
      onmessage: (evt: MessageEvent) => {
        const msg = JSON.parse(evt.data) as RoomMessage & Message;
        if (msg.st === null)
          ws?.send(JSON.stringify({ st: { board } } as Message));
        if (msg.st?.board) moveToBoard(msg.st.board, false);
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
            <li>
              <button onClick={() => navigate("/bot")}>
                <FontAwesomeIcon icon={faRobot} /> <Text id="bot.playVsBot" />
              </button>
            </li>
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
              <ExternalLinks />
            </li>
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
              disabled={isBotGame && (isBotTurn || isBotThinking)}
              isBotGame={isBotGame}
            />
          </section>
        )}

        {isBotGame && (
          <footer class="botControls">
            <DifficultySelect
              value={botDifficulty}
              onChange={setBotDifficulty}
            />
            {board.m.length === 0 && (
              <button onClick={() => setBotPlaysAs("a")}>
                <Text id="bot.letBotStart" />
              </button>
            )}
          </footer>
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
