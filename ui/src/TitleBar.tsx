import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { OnlineStatus } from "./App";

export const TitleBar: FunctionComponent<{
  roomPath?: string;
  pop: number | undefined;
  onlineStatus: OnlineStatus;
}> = ({ onlineStatus, roomPath, pop }) => {
  return (
    <div class="titleBar">
      {roomPath ? (
        <>
          <h1>{decodeURI(roomPath)}</h1>
          <div class="pop">
            {!pop ? null : pop === 1 ? (
              <div className="alone">
                <Text id="titleBar.alone" />
              </div>
            ) : (
              <div>
                <Text id="titleBar.pop" fields={{ pop }} />
              </div>
            )}
          </div>
          <div
            class="onlineStatus"
            style={
              onlineStatus === OnlineStatus.ONLINE ? "color:#0f0" : "color:#f00"
            }
          >
            ⬤{" "}
          </div>
        </>
      ) : (
        <>
          <h1 class="offline">
            <Text id="titleBar.local" />
          </h1>
        </>
      )}
    </div>
  );
};
