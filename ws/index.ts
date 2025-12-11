import { RoomMessage, RTCSignal, State } from "../common/src/model.ts";
import type { ServerWebSocket } from "bun";

const discordWebhook = Bun.env.DISCORD_WEBHOOK;
const port = parseInt(Bun.env.PORT || "8081");

const notifyDiscord = discordWebhook
  ? async (content: string) => {
      try {
        await fetch(discordWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (e) {
        console.log("Discord error", e);
      }
    }
  : (content: string) => console.log("Discord (mock):", content);

type Client = {
  socket: ServerWebSocket<RoomData>;
  sessionId: string;
  pill: string | undefined;
};

type Room = {
  path: string;
  clients: Map<string, Client>;
  voicePeers: Set<string>;
  p1: string | undefined;
  p2: string | undefined;
  state: State | null;
  analyzed: boolean;
  timeout?: Timer;
};

const rooms = new Map<string, Room>();
let waiting: [string, ServerWebSocket<LobbyData>[]] | undefined;

type RoomData = {
  pill: string | undefined;
  roomPath: string;
  sessionId: string;
};
type LobbyData = { pill: string | undefined };

function getRoom(path: string): Room {
  let room = rooms.get(path);
  if (!room) {
    room = {
      path,
      clients: new Map(),
      voicePeers: new Set(),
      state: null,
      analyzed: false,
      p1: undefined,
      p2: undefined,
    };
    rooms.set(path, room);
    console.log(`Opened room ${path}`);
  }
  return room;
}

function getPeers(room: Room, excludeSessionId?: string): string[] {
  const pills = new Set<string>();
  room.clients.forEach((client) => {
    if (client.pill && client.sessionId !== excludeSessionId) {
      pills.add(client.pill);
    }
  });
  return Array.from(pills);
}

function sendPop(room: Room) {
  const voicePeers = Array.from(room.voicePeers);
  room.clients.forEach((client) => {
    const peers = getPeers(room, client.sessionId);
    const msg = JSON.stringify({
      peers,
      voicePeers: voicePeers.filter((p) => p !== client.pill),
    });
    client.socket.send(msg);
  });
}

function broadcastVoicePeers(room: Room) {
  const voicePeers = Array.from(room.voicePeers);
  room.clients.forEach((client) => {
    const msg = JSON.stringify({
      voicePeers: voicePeers.filter((p) => p !== client.pill),
    });
    client.socket.send(msg);
  });
}

function canPlay(room: Room, pill: string | undefined): boolean {
  if (!room.state || room.p1 === undefined) return true;
  if (room.p2 === undefined) return room.p1 !== pill;
  const isP1Turn = room.state.board.m.length % 2 === 0;
  return isP1Turn ? room.p1 === pill : room.p2 === pill;
}

function stateForPlayer(room: Room, pill: string | undefined): State | null {
  if (!room.state) return room.analyzed ? { analyzed: true } : null;
  return {
    board: { ...room.state.board, p: canPlay(room, pill) },
    analyzed: room.analyzed || undefined,
  };
}

function sendState(room: Room, client: Client) {
  client.socket.send(JSON.stringify({ st: stateForPlayer(room, client.pill) }));
}

function broadcastAnalyzed(room: Room) {
  const msg = JSON.stringify({ st: { analyzed: true } });
  room.clients.forEach((client) => client.socket.send(msg));
}

function attemptAction(room: Room, state: State, fromClient: Client) {
  // Handle analysis notification (no board required)
  if (state.analyzed && !room.analyzed) {
    room.analyzed = true;
    broadcastAnalyzed(room);
    if (!state.board) return; // Analysis-only message
  }

  if (!state.board) return; // No board action to process

  const pill = fromClient.pill;
  const abort = () => sendState(room, fromClient);

  const actions = state.board.m.length;
  if (
    actions !== 0 &&
    room.state !== null &&
    room.state.board &&
    actions !== room.state.board.m.length + 1 &&
    actions !== room.state.board.m.length - 1
  ) {
    console.log(
      `Dropped moving from ${JSON.stringify(room.state)} to ${actions} actions`
    );
    return abort();
  }

  if (actions === 0) {
    room.p1 = undefined;
    room.p2 = undefined;
    room.analyzed = false; // Reset on game restart
  } else {
    const p1Playing = actions % 2 === 1;
    const currentPlayer = p1Playing ? room.p1 : room.p2;
    if (currentPlayer === undefined) {
      if (p1Playing) {
        if (room.p2 === pill) {
          console.log(`${pill} already took P2`);
          return abort();
        }
        room.p1 = pill;
      } else {
        if (room.p1 === pill) {
          console.log(`${pill} already took P1`);
          return abort();
        }
        room.p2 = pill;
      }
    } else if (
      (room.state === null || !room.state.board || actions !== room.state.board.m.length - 1) &&
      pill !== currentPlayer
    ) {
      console.log(
        `Blocking action from ${pill}, not current player ${currentPlayer}`
      );
      return abort();
    }
  }

  room.state = { board: state.board };
  room.clients.forEach((client) => {
    const st = stateForPlayer(room, client.pill);
    if (client.socket !== fromClient.socket) {
      client.socket.send(JSON.stringify({ st }));
    }
  });
}

function closeRoom(room: Room) {
  rooms.delete(room.path);
  console.log(`Closed room ${room.path}`);
}

function connectedToRoom(
  pill: string | undefined,
  socket: ServerWebSocket<RoomData>,
  roomPath: string,
  sessionId: string
) {
  console.log(`${pill} (${sessionId}) connected to ${roomPath}`);
  const room = getRoom(roomPath);

  if (room.timeout) {
    clearTimeout(room.timeout);
    room.timeout = undefined;
  }

  const client: Client = { socket, sessionId, pill };
  room.clients.set(sessionId, client);

  // Send initial peers and voicePeers list
  const peers = getPeers(room, sessionId);
  const voicePeers = Array.from(room.voicePeers).filter((p) => p !== pill);
  socket.send(JSON.stringify({ peers, voicePeers }));

  sendPop(room);
  sendState(room, client);
}

function relayRTC(room: Room, signal: RTCSignal) {
  const msg = JSON.stringify({ rtc: signal });
  room.clients.forEach((client) => {
    if (client.pill === signal.to) {
      client.socket.send(msg);
    }
  });
}

function roomMessage(sessionId: string, roomPath: string, data: string) {
  const room = getRoom(roomPath);
  const client = room.clients.get(sessionId);
  if (!client) return;

  try {
    const msg = JSON.parse(data) as RoomMessage;
    if (msg.st) attemptAction(room, msg.st, client);
    if (msg.rtc && client.pill)
      relayRTC(room, { ...msg.rtc, from: client.pill });
    if (msg.voice !== undefined && client.pill) {
      if (msg.voice) {
        room.voicePeers.add(client.pill);
      } else {
        room.voicePeers.delete(client.pill);
      }
      broadcastVoicePeers(room);
    }
  } catch (e) {
    console.log("roomMessage error", (e as Error).message);
  }
}

function closeInRoom(sessionId: string, roomPath: string) {
  const room = getRoom(roomPath);
  const client = room.clients.get(sessionId);
  if (!client) return;

  console.log(`${client.pill} (${sessionId}) left ${roomPath}`);
  room.clients.delete(sessionId);

  // Check if this pill has any other sessions still connected
  const pillStillConnected = Array.from(room.clients.values()).some(
    (c) => c.pill === client.pill
  );
  if (!pillStillConnected && client.pill) {
    room.voicePeers.delete(client.pill);
  }

  if (room.clients.size === 0) {
    room.timeout = setTimeout(() => closeRoom(room), 3600_000);
  } else {
    sendPop(room);
  }
}

function connectedToLobby(
  pill: string | undefined,
  socket: ServerWebSocket<LobbyData>
) {
  if (!pill) {
    console.log("Lobby connection failed, no pill");
    return;
  }

  if (!waiting) {
    waiting = [pill, [socket]];
    notifyDiscord(`\`${pill}\` waiting for a match.`);
    return;
  }

  const [otherPill, otherSockets] = waiting;
  if (otherPill === pill) {
    waiting[1].push(socket);
    return;
  }

  const [a, b] = pill < otherPill ? [pill, otherPill] : [otherPill, pill];
  const join = `${a}—${b}`;

  try {
    otherSockets.forEach((s) => s.send(JSON.stringify({ join })));
  } catch (e) {
    console.log(
      `Failure matching ${pill} with ${otherPill}`,
      (e as Error).message
    );
    waiting = [pill, [socket]];
    return;
  }

  try {
    socket.send(JSON.stringify({ join }));
    otherSockets.forEach((s) => s.close());
    socket.close();
  } catch (e) {
    console.log(`Failure closing ${pill}`, (e as Error).message);
  }

  waiting = undefined;
  notifyDiscord(`\`${pill}\` and \`${otherPill}\` matched!`);
}

function closeInLobby(
  pill: string | undefined,
  socket: ServerWebSocket<LobbyData>
) {
  if (!waiting || !waiting[1].includes(socket)) return;
  waiting[1] = waiting[1].filter((s) => s !== socket);
  if (waiting[1].length === 0) {
    notifyDiscord(`\`${pill}\` no longer waiting.`);
    waiting = undefined;
  }
}

let sessionCounter = 0;
function generateSessionId(): string {
  return `s${Date.now()}-${++sessionCounter}`;
}

Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    const pill = url.searchParams.get("pill") || undefined;
    const path = url.pathname;

    if (path.startsWith("/room/")) {
      const sessionId = generateSessionId();
      const upgraded = server.upgrade<RoomData>(req, {
        data: { pill, roomPath: path.substring(6), sessionId },
      });
      return upgraded ? undefined : new Response(null, { status: 500 });
    }

    if (path === "/lobby") {
      const upgraded = server.upgrade<LobbyData>(req, { data: { pill } });
      return upgraded ? undefined : new Response(null, { status: 500 });
    }

    return new Response(null, { status: 404 });
  },
  websocket: {
    open(ws) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        connectedToRoom(
          data.pill,
          ws as ServerWebSocket<RoomData>,
          data.roomPath,
          data.sessionId
        );
      } else {
        connectedToLobby(data.pill, ws as ServerWebSocket<LobbyData>);
      }
    },
    message(ws, message) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        roomMessage(data.sessionId, data.roomPath, message as string);
      }
    },
    close(ws) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        closeInRoom(data.sessionId, data.roomPath);
      } else {
        closeInLobby(data.pill, ws as ServerWebSocket<LobbyData>);
      }
    },
    error(_, error) {
      console.log("WS error", error.message);
    },
  },
});

console.log(`WebSocket server running on port ${port}`);
