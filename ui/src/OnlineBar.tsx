import { FunctionComponent } from "preact";
import { useState } from "preact/hooks";

export const OnlineBar: FunctionComponent<{
  wsPath?: string;
  jump: (path: string) => void;
}> = ({ wsPath, jump }) => {
  const [isJoining, setJoining] = useState(false);
  const [nextRoom, setNextRoom] = useState(undefined);
  const title = wsPath ? (
    <>
      Room <tt>{decodeURI(wsPath)}</tt>
    </>
  ) : (
    <>Local game</>
  );

  function submitJoin() {
    setJoining(false);
    jump(nextRoom);
  }

  return (
    <div class="onlineBar">
      {isJoining ? <></> : <h1>{title}</h1>}
      <div class="buttons">
        {isJoining ? (
          <>
            <input
              type="text"
              width="8"
              value={nextRoom}
              placeholder="Room name"
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
                    .then(() => window.alert("Invite in clipboard."));
                }
              }}
            >
              Invite
            </button>
            <button onClick={() => jump()}>Leave</button>
          </>
        ) : (
          <button onclick={() => setJoining(true)}>Online</button>
        )}
      </div>
    </div>
  );
};
