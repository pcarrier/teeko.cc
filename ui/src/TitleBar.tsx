import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { OnlineStatus } from "./App";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons/faMicrophone";
import { faMicrophoneSlash } from "@fortawesome/free-solid-svg-icons/faMicrophoneSlash";
import { faVolumeHigh } from "@fortawesome/free-solid-svg-icons/faVolumeHigh";
import { faVolumeXmark } from "@fortawesome/free-solid-svg-icons/faVolumeXmark";
import { faPhone } from "@fortawesome/free-solid-svg-icons/faPhone";
import { faPhoneSlash } from "@fortawesome/free-solid-svg-icons/faPhoneSlash";
import type { VoiceChatState } from "./useVoiceChat";

type VoiceChatControls = {
  state: VoiceChatState;
  isConnecting: boolean;
  isMicMuted: boolean;
  isDeafened: boolean;
  startVoiceChat: () => void;
  stopVoiceChat: () => void;
  toggleMic: () => void;
  toggleDeafen: () => void;
};

export const TitleBar: FunctionComponent<{
  roomPath?: string;
  peers: string[];
  onlineStatus: OnlineStatus;
  voiceChat?: VoiceChatControls;
}> = ({ onlineStatus, roomPath, peers, voiceChat }) => {
  return (
    <div class="titleBar">
      {roomPath && (
        <>
          <h1>{decodeURI(roomPath)}</h1>
          <div class="peers">
            {peers.length === 0 ? (
              <span class="alone">
                <Text id="titleBar.alone" />
              </span>
            ) : (
              peers.map((p) => <span class="peer" key={p}>{p}</span>)
            )}
          </div>
          {voiceChat && (
            <div class="voiceChat">
              {voiceChat.state === "off" ? (
                <button
                  class="icon"
                  onClick={voiceChat.startVoiceChat}
                  aria-label="Start voice chat"
                  title="Start voice chat"
                >
                  <FontAwesomeIcon icon={faPhone} />
                </button>
              ) : (
                <>
                  <button
                    class={`icon ${voiceChat.isMicMuted ? "muted" : ""}`}
                    onClick={voiceChat.toggleMic}
                    aria-label={voiceChat.isMicMuted ? "Unmute mic" : "Mute mic"}
                    title={voiceChat.isMicMuted ? "Unmute mic" : "Mute mic"}
                  >
                    <FontAwesomeIcon
                      icon={voiceChat.isMicMuted ? faMicrophoneSlash : faMicrophone}
                    />
                  </button>
                  <button
                    class={`icon ${voiceChat.isDeafened ? "muted" : ""}`}
                    onClick={voiceChat.toggleDeafen}
                    aria-label={voiceChat.isDeafened ? "Undeafen" : "Deafen"}
                    title={voiceChat.isDeafened ? "Undeafen" : "Deafen"}
                  >
                    <FontAwesomeIcon
                      icon={voiceChat.isDeafened ? faVolumeXmark : faVolumeHigh}
                    />
                  </button>
                  <button
                    class="icon hangup"
                    onClick={voiceChat.stopVoiceChat}
                    aria-label="End voice chat"
                    title="End voice chat"
                  >
                    <FontAwesomeIcon icon={faPhoneSlash} />
                  </button>
                  {voiceChat.isConnecting && (
                    <span class="voiceStatus">
                      <Text id="voice.connecting" />
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          <div
            class="onlineStatus"
            style={
              onlineStatus === OnlineStatus.ONLINE ? "color:#0f0" : "color:#f00"
            }
          >
            ⬤{" "}
          </div>
        </>
      )}
    </div>
  );
};
