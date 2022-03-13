import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { OnlineStatus } from "./App.tsx";
import Sockette from "sockette";
import { Message } from "teeko-cc-common/src/model.ts";
import { randomRoom } from "teeko-cc-common/src/utils.ts";
import { wsUrl } from "./env.ts";

const spinner = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-0.5 -0.5 3 3"
    width="9pt"
    height="9pt"
  >
    <circle r="0.35" fill="#0040ff" cx="0" cy="0">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="0; 1; 2; 2; 2; 1; 0; 0; 0"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="0; 0; 0; 1; 2; 2; 2; 1; 0"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
    <circle r="0.35" fill="#0040ff" cx="1" cy="0">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="1; 2; 2; 2; 1; 0; 0; 0; 1"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="0; 0; 1; 2; 2; 2; 1; 0; 0"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
    <circle r="0.35" fill="#0040ff" cx="2" cy="0">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="2; 2; 2; 1; 0; 0; 0; 1; 2"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="0; 1; 2; 2; 2; 1; 0; 0; 0"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
    <circle r="0.35" fill="#0040ff" cx="2" cy="1">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="2; 2; 1; 0; 0; 0; 1; 2; 2"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="1; 2; 2; 2; 1; 0; 0; 0; 1"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
    <circle r="0.35" fill="#ff0000" cx="2" cy="2">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="2; 1; 0; 0; 0; 1; 2; 2; 2"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="2; 2; 2; 1; 0; 0; 0; 1; 2"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
    <circle r="0.35" fill="#ff0000" cx="1" cy="2">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="1; 0; 0; 0; 1; 2; 2; 2; 1"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="2; 2; 1; 0; 0; 0; 1; 2; 2"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
    <circle r="0.35" fill="#ff0000" cx="0" cy="2">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="0; 0; 0; 1; 2; 2; 2; 1; 0"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="2; 1; 0; 0; 0; 1; 2; 2; 2"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
    <circle r="0.35" fill="#ff0000" cx="0" cy="1">
      <animate
        calcMode="spline"
        attributeName="cx"
        dur="4s"
        repeatCount="indefinite"
        values="0; 0; 1; 2; 2; 2; 1; 0; 0"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
      <animate
        calcMode="spline"
        attributeName="cy"
        dur="4s"
        repeatCount="indefinite"
        values="1; 0; 0; 0; 1; 2; 2; 2; 1"
        keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
        keySplines="0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1; 0.8 0 0.2 1"
      />
    </circle>
  </svg>
);

export const OnlineBar: FunctionComponent<{
  pill: string;
  wsPath?: string;
  jump: (path: string) => void;
  pop: number | undefined;
  onlineStatus: OnlineStatus;
}> = ({ pill, wsPath, jump, pop, onlineStatus }) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [isJoining, setJoining] = useState(false);
  const [isMatching, setMatching] = useState(false);
  const [nextRoom, setNextRoom] = useState();

  useEffect(() => {
    if (hasCopied) setTimeout(() => setHasCopied(false), 1_000);
  }, [hasCopied]);

  useEffect(() => {
    if (isMatching) {
      const url = wsUrl("lobby", pill);
      const sockette = new Sockette(url, {
        onmessage: (evt: MessageEvent) => {
          const msg = JSON.parse(evt.data) as Message;
          if (msg.join) {
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

  function submitJoin() {
    setJoining(false);
    jump(nextRoom || randomRoom());
  }

  function share() {
    if (navigator.share)
      navigator.share({
        title: `teeko.cc (${wsPath})`,
        text: "Teeko?",
        url: `https://teeko.cc/${wsPath}`,
      });
    else {
      navigator.clipboard
        .writeText(`Teeko? https://teeko.cc/${wsPath}`)
        .then(() => setHasCopied(true));
    }
  }

  return (
    <div class="onlineBar">
      {isJoining ? (
        <>
          <button onClick={() => setJoining(false)}>Cancel</button>
          <input
            type="text"
            value={nextRoom}
            placeholder="Board name (optional)"
            onInput={(e: FormEvent<HTMLFormElement>) =>
              setNextRoom(e.target.value)
            }
            onKeyUp={(e) => {
              if (e.keyCode === 13) {
                e.preventDefault();
                submitJoin();
              }
            }}
          />
          <button onClick={() => submitJoin(nextRoom)}>Join</button>
        </>
      ) : wsPath ? (
        <>
          <button onClick={() => jump()}>Leave</button>
          <h1>
            <span class="deemph">
              <span
                style={
                  onlineStatus === OnlineStatus.ONLINE
                    ? "color:#0f0"
                    : "color:#f00"
                }
              >
                ⬤
              </span>{" "}
              Board{" "}
            </span>
            {decodeURI(wsPath)}
          </h1>
          <p className="pop">
            {!pop ? null : pop === 1 ? (
              <span className="alone">alone</span>
            ) : (
              <span>{pop}P</span>
            )}
          </p>
          <button onClick={share}>{hasCopied ? "Copied!" : "Invite"}</button>
        </>
      ) : (
        <>
          <h1 class="offline">
            <span className="deemph">Local game</span>
          </h1>
          {isMatching ? (
            <button onClick={() => setMatching(false)}>
              {spinner} Matching…
            </button>
          ) : (
            <button onClick={() => setMatching(true)}>Random match</button>
          )}
          <button
            onClick={() => {
              setMatching(false);
              setJoining(true);
            }}
          >
            Friends
          </button>
        </>
      )}
    </div>
  );
};
