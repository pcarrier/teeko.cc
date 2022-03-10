import { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";

function randomRoom() {
  return Math.floor(Math.random() * 100000).toString();
}

export const OnlineBar: FunctionComponent<{
  wsPath?: string;
  jump: (path: string) => void;
}> = ({ wsPath, jump }) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [isJoining, setJoining] = useState(false);
  const [nextRoom, setNextRoom] = useState();

  useEffect(() => {
    if (hasCopied) setTimeout(() => setHasCopied(false), 1_000);
  }, [hasCopied]);

  const title = wsPath ? (
    <>
      <span class="board">Board </span>
      {decodeURI(wsPath)}
    </>
  ) : (
    <span class="board">Offline board</span>
  );

  function submitJoin() {
    setJoining(false);
    jump(nextRoom || randomRoom());
  }

  if (hasCopied)
    return (
      <div class="onlineBar">
        <div class="buttonish">Copied to clipboard.</div>
      </div>
    );

  return (
    <div class="onlineBar">
      {isJoining ? <></> : <h1>{title}</h1>}
      <div class="buttons">
        {isJoining ? (
          <>
            <button onClick={() => setJoining(false)}>Cancel</button>
            <input
              type="text"
              width="100%"
              value={nextRoom}
              placeholder="Board name (optional)"
              onInput={(e: FormEvent<HTMLFormElement>) =>
                setNextRoom(e.target.value)
              }
              onkeyup={(e) => {
                if (e.keyCode === 13) {
                  e.preventDefault();
                  submitJoin();
                }
              }}
            />
            <button onclick={() => submitJoin(nextRoom)}>Join</button>
          </>
        ) : wsPath ? (
          <>
            <button onClick={() => jump()}>Leave</button>
            <button
              onClick={() => {
                if (navigator.share)
                  navigator.share({
                    title: `teeko.cc (${wsPath})`,
                    text: "Play Teeko with me!",
                    url: `https://teeko.cc/${wsPath}`,
                  });
                else {
                  navigator.clipboard
                    .writeText(`Play Teeko with me! https://teeko.cc/${wsPath}`)
                    .then(() => setHasCopied(true));
                }
              }}
            >
              Invite
            </button>
          </>
        ) : (
          <button onclick={() => setJoining(true)}>Online</button>
        )}
      </div>
    </div>
  );
};
