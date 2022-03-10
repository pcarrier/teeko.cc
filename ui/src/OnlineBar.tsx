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

  function share() {
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
            <span class="board">Board </span>
            {decodeURI(wsPath)}
          </h1>
          <button onClick={share}>{hasCopied ? "Copied!" : "Invite"}</button>
        </>
      ) : (
        <>
          <h1 style="margin-left: 1.5em;">
            <span className="board">Offline board</span>
          </h1>
          <button onClick={() => setJoining(true)}>Online</button>
        </>
      )}
    </div>
  );
};
