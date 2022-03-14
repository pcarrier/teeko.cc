import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Localizer, Text } from "preact-i18n";
import { OnlineStatus } from "./App.jsx";
import { randomRoom } from "teeko-cc-common/src/utils.js";

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
          <button onClick={() => setJoining(false)}>
            <Text id="onlineBar.cancel" />
          </button>
          <Localizer>
            <input
              type="text"
              value={nextRoom}
              // @ts-ignore
              placeholder={<Text id="onlineBar.boardNameInput" />}
              onInput={(e: Event) => setNextRoom((e.target as any).value)}
              onKeyUp={(e) => {
                if (e.keyCode === 13) {
                  e.preventDefault();
                  jump(nextRoom || randomRoom());
                }
              }}
            />
          </Localizer>
          <button onClick={() => jump(nextRoom || randomRoom())}>
            <Text id="onlineBar.join" />
          </button>
        </>
      ) : roomPath ? (
        <>
          <button onClick={() => jump()}>
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
          <button onClick={share}>
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
            <button onClick={() => setMatching(false)}>
              {spinner} <Text id="onlineBar.matching" />
            </button>
          ) : (
            <button onClick={() => setMatching(true)}>
              <Text id="onlineBar.matched" />
            </button>
          )}
          <button
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
