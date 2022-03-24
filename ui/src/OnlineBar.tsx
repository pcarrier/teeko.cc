import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Text } from "preact-i18n";
import { OnlineStatus } from "./App.jsx";

export const OnlineBar: FunctionComponent<{
  roomPath?: string;
  jump: (path?: string) => void;
  pop: number | undefined;
  onlineStatus: OnlineStatus;
}> = ({ roomPath, jump, pop, onlineStatus }) => {
  const [hasCopied, setHasCopied] = useState(false);

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
      {roomPath ? (
        <>
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
              <div className="alone">
                <Text id="onlineBar.alone" />
              </div>
            ) : (
              <div>
                <Text id="onlineBar.pop" fields={{ pop }} />
              </div>
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
        </>
      )}
    </div>
  );
};
