import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { OnlineStatus } from "./App.jsx";

export const OnlineBar: FunctionComponent<{
  roomPath?: string;
  jump: (path?: string) => void;
  pop: number | undefined;
  onlineStatus: OnlineStatus;
}> = ({ roomPath, jump, pop, onlineStatus }) => {
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
