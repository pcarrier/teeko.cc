import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Localizer, Text } from "preact-i18n";
import { OnlineStatus } from "./App.jsx";
import { spinner } from "./Spinner";
import { randomID } from "./random";

export const OnlineBar: FunctionComponent<{
  roomPath?: string;
  jump: (path?: string) => void;
  pop: number | undefined;
  onlineStatus: OnlineStatus;
  isJoining: boolean;
  setJoining: (joining: boolean) => void;
  isMatching: boolean;
  setMatching: (matching: boolean) => void;
}> = ({
  roomPath,
  jump,
  pop,
  onlineStatus,
  isJoining,
  setJoining,
  isMatching,
  setMatching,
}) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [nextRoom, setNextRoom] = useState();

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

  return (
    <div class="onlineBar">
      {isJoining ? (
        <>
          <button id="cancelJoin" onClick={() => setJoining(false)}>
            <Text id="onlineBar.cancel" />
          </button>
          <Localizer>
            <input
              type="text"
              value={nextRoom}
              placeholder={<Text id="onlineBar.boardNameInput" />}
              onInput={(e: Event) => setNextRoom((e.target as any).value)}
              onKeyUp={(e) => {
                if (e.keyCode === 13) {
                  e.preventDefault();
                  jump(nextRoom || randomID());
                }
              }}
            />
          </Localizer>
          <button id="join" onClick={() => jump(nextRoom || randomID())}>
            <Text id="onlineBar.join" />
          </button>
        </>
      ) : roomPath ? (
        <>
          <button id="leave" onClick={() => jump()}>
            <Text id="onlineBar.leave" />
          </button>
          <h1>
            <span
              style={
                onlineStatus === OnlineStatus.ONLINE
                  ? "color:#0f0"
                  : "color:#f00"
              }
            >
              ⬤{" "}
            </span>
            {decodeURI(roomPath)}
          </h1>
          <div class="pop">
            {!pop ? null : pop === 1 ? (
              <span className="alone">
                <Text id="onlineBar.alone" />
              </span>
            ) : (
              <span>
                <Text id="onlineBar.pop" fields={{ pop }} />
              </span>
            )}
          </div>
          <button id="share" onClick={share}>
            {hasCopied ? (
              <Text id="onlineBar.copied" />
            ) : (
              <Text id="onlineBar.invite" />
            )}
          </button>
        </>
      ) : (
        <>
          <h1 class="offline">
            <Text id="onlineBar.local" />
          </h1>
          {isMatching ? (
            <button id="cancelMatch" onClick={() => setMatching(false)}>
              {spinner} <Text id="onlineBar.matching" />
            </button>
          ) : (
            <button id="match" onClick={() => setMatching(true)}>
              <Text id="onlineBar.matched" />
            </button>
          )}
          <button
            id="friends"
            onClick={() => {
              setMatching(false);
              setJoining(true);
            }}
          >
            <Text id="onlineBar.friends" />
          </button>
        </>
      )}
    </div>
  );
};
