import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type Sockette from "sockette";
import type { RoomMessage, RTCSignal } from "teeko-cc-common/src/model";

export type VoiceChatState = "off" | "connecting" | "connected" | "error";

type PeerConnection = {
  pc: RTCPeerConnection;
  remoteStream: MediaStream | null;
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:ident.me" },
    { urls: "stun:tnedi.me" },
    { urls: "turn:turn.teeko.cc:3478" },
  ],
};

function hasVoiceHash(): boolean {
  return window.location.hash === "#voice";
}

function setVoiceHash(enabled: boolean) {
  if (enabled && !hasVoiceHash()) {
    history.replaceState(null, "", window.location.pathname + "#voice");
  } else if (!enabled && hasVoiceHash()) {
    history.replaceState(null, "", window.location.pathname);
  }
}

export function useVoiceChat(
  ws: Sockette | undefined,
  nickname: string,
  peers: string[],
  onRTCSignal: (handler: (signal: RTCSignal) => void) => void
) {
  const [state, setState] = useState<VoiceChatState>("off");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );
  const hasAutoStarted = useRef(false);

  const sendSignal = useCallback(
    (signal: Omit<RTCSignal, "from">) => {
      if (ws) {
        const msg: RoomMessage = {
          rtc: { ...signal, from: nickname } as RTCSignal,
        };
        ws.send(JSON.stringify(msg));
      }
    },
    [ws, nickname]
  );

  const createPeerConnection = useCallback(
    (peerId: string, isInitiator: boolean): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            to: peerId,
            payload: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const existing = connectionsRef.current.get(peerId);
        if (existing) {
          existing.remoteStream = event.streams[0];
        }
        // Create audio element for remote stream
        let audioEl = audioElementsRef.current.get(peerId);
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          audioElementsRef.current.set(peerId, audioEl);
        }
        audioEl.srcObject = event.streams[0];
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectedPeers((prev) => new Set([...prev, peerId]));
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          setConnectedPeers((prev) => {
            const next = new Set(prev);
            next.delete(peerId);
            return next;
          });
          // Clean up this connection
          const conn = connectionsRef.current.get(peerId);
          if (conn) {
            conn.pc.close();
            connectionsRef.current.delete(peerId);
          }
          const audioEl = audioElementsRef.current.get(peerId);
          if (audioEl) {
            audioEl.srcObject = null;
            audioElementsRef.current.delete(peerId);
          }
        }
      };

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      connectionsRef.current.set(peerId, { pc, remoteStream: null });

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            sendSignal({
              type: "offer",
              to: peerId,
              payload: pc.localDescription?.toJSON(),
            });
          });
      }

      return pc;
    },
    [sendSignal, state]
  );

  const handleSignal = useCallback(
    async (signal: RTCSignal) => {
      if (state === "off") return;

      const { type, from, payload } = signal;

      if (type === "offer") {
        // Create connection if it doesn't exist
        let conn = connectionsRef.current.get(from);
        if (!conn) {
          createPeerConnection(from, false);
          conn = connectionsRef.current.get(from);
        }
        if (!conn) return;

        await conn.pc.setRemoteDescription(
          new RTCSessionDescription(payload as RTCSessionDescriptionInit)
        );

        // Apply any pending ICE candidates
        const pending = pendingCandidatesRef.current.get(from) || [];
        for (const candidate of pending) {
          await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current.delete(from);

        const answer = await conn.pc.createAnswer();
        await conn.pc.setLocalDescription(answer);
        sendSignal({
          type: "answer",
          to: from,
          payload: conn.pc.localDescription?.toJSON(),
        });
      } else if (type === "answer") {
        const conn = connectionsRef.current.get(from);
        if (conn) {
          await conn.pc.setRemoteDescription(
            new RTCSessionDescription(payload as RTCSessionDescriptionInit)
          );
          // Apply any pending ICE candidates
          const pending = pendingCandidatesRef.current.get(from) || [];
          for (const candidate of pending) {
            await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current.delete(from);
        }
      } else if (type === "ice-candidate") {
        const conn = connectionsRef.current.get(from);
        if (conn && conn.pc.remoteDescription) {
          await conn.pc.addIceCandidate(
            new RTCIceCandidate(payload as RTCIceCandidateInit)
          );
        } else {
          // Queue the candidate for later
          const pending = pendingCandidatesRef.current.get(from) || [];
          pending.push(payload as RTCIceCandidateInit);
          pendingCandidatesRef.current.set(from, pending);
        }
      }
    },
    [state, createPeerConnection, sendSignal]
  );

  // Register signal handler
  useEffect(() => {
    onRTCSignal(handleSignal);
  }, [handleSignal, onRTCSignal]);

  const startVoiceChat = useCallback(async () => {
    try {
      setState("connecting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setState("connected");
      setVoiceHash(true);

      // Announce voice chat to server
      if (ws) {
        ws.send(JSON.stringify({ voice: true }));
      }

      // Initiate connections to all peers (we initiate if our nickname is "smaller")
      for (const peer of peers) {
        if (nickname < peer) {
          createPeerConnection(peer, true);
        }
      }
    } catch (e) {
      console.error("Failed to get microphone:", e);
      setState("error");
      setVoiceHash(false);
    }
  }, [ws, peers, nickname, createPeerConnection]);

  const stopVoiceChat = useCallback(() => {
    // Announce leaving voice chat to server
    if (ws) {
      ws.send(JSON.stringify({ voice: false }));
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    connectionsRef.current.forEach((conn) => conn.pc.close());
    connectionsRef.current.clear();

    // Clean up audio elements
    audioElementsRef.current.forEach((el) => {
      el.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Clear pending candidates
    pendingCandidatesRef.current.clear();

    setState("off");
    setIsMicMuted(false);
    setConnectedPeers(new Set());
    setVoiceHash(false);
  }, [ws]);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMuted = !isMicMuted;
      audioTracks.forEach((track) => {
        track.enabled = !newMuted;
      });
      setIsMicMuted(newMuted);
    }
  }, [isMicMuted]);

  // When new peers join, initiate connections if we're already in voice chat
  useEffect(() => {
    if (state !== "off" && localStreamRef.current) {
      for (const peer of peers) {
        if (!connectionsRef.current.has(peer) && nickname < peer) {
          createPeerConnection(peer, true);
        }
      }
    }
  }, [peers, state, nickname, createPeerConnection]);

  // Auto-start voice chat if #voice hash is present
  useEffect(() => {
    if (hasVoiceHash() && state === "off" && !hasAutoStarted.current && ws) {
      hasAutoStarted.current = true;
      startVoiceChat();
    }
  }, [ws, state, startVoiceChat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, []);

  // Check if there are peers with voice chat enabled that we're not connected to yet
  const isConnecting =
    state === "connecting" ||
    (state === "connected" &&
      peers.some(
        (p) => !connectedPeers.has(p) && connectionsRef.current.has(p)
      ));

  return {
    state,
    isConnecting,
    isMicMuted,
    connectedPeers,
    startVoiceChat,
    stopVoiceChat,
    toggleMic,
    handleSignal,
  };
}
