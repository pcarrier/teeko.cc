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

type Room = {
  path: string;
  clients: Map<string | undefined, ServerWebSocket<RoomData>[]>;
  voicePeers: Set<string>;
  p1: string | undefined;
  p2: string | undefined;
  state: State | null;
  timeout?: Timer;
};

const rooms = new Map<string, Room>();
let waiting: [string, ServerWebSocket<LobbyData>[]] | undefined;

type RoomData = { pill: string | undefined; roomPath: string };
type LobbyData = { pill: string | undefined };

function getRoom(path: string): Room {
  let room = rooms.get(path);
  if (!room) {
    room = {
      path,
      clients: new Map(),
      voicePeers: new Set(),
      state: null,
      p1: undefined,
      p2: undefined,
    };
    rooms.set(path, room);
    console.log(`Opened room ${path}`);
  }
  return room;
}

function getPeers(room: Room): string[] {
  return Array.from(room.clients.keys()).filter((p): p is string => !!p);
}

function sendPop(room: Room) {
  const peers = getPeers(room);
  const voicePeers = Array.from(room.voicePeers);
  room.clients.forEach((sockets, pill) => {
    const msg = JSON.stringify({
      peers: peers.filter((p) => p !== pill),
      voicePeers: voicePeers.filter((p) => p !== pill),
    });
    sockets.forEach((s) => s.send(msg));
  });
}

function broadcastVoicePeers(room: Room) {
  const voicePeers = Array.from(room.voicePeers);
  room.clients.forEach((sockets, pill) => {
    const msg = JSON.stringify({
      voicePeers: voicePeers.filter((p) => p !== pill),
    });
    sockets.forEach((s) => s.send(msg));
  });
}

function canPlay(room: Room, pill: string | undefined): boolean {
  if (!room.state || room.p1 === undefined) return true;
  if (room.p2 === undefined) return room.p1 !== pill;
  const isP1Turn = room.state.board.m.length % 2 === 0;
  return isP1Turn ? room.p1 === pill : room.p2 === pill;
}

function stateForPlayer(room: Room, pill: string | undefined): State | null {
  if (!room.state) return null;
  return { board: { ...room.state.board, p: canPlay(room, pill) } };
}

function sendState(
  room: Room,
  pill: string | undefined,
  socket: ServerWebSocket<RoomData>
) {
  socket.send(JSON.stringify({ st: stateForPlayer(room, pill) }));
}

function attemptAction(
  room: Room,
  state: State,
  from: ServerWebSocket<RoomData>,
  pill: string | undefined
) {
  const abort = () => sendState(room, pill, from);

  const actions = state.board.m.length;
  if (
    actions !== 0 &&
    room.state !== null &&
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
      (room.state === null || actions !== room.state.board.m.length - 1) &&
      pill !== currentPlayer
    ) {
      console.log(
        `Blocking action from ${pill}, not current player ${currentPlayer}`
      );
      return abort();
    }
  }

  room.state = state;
  room.clients.forEach((sockets, clientPill) => {
    const st = stateForPlayer(room, clientPill);
    sockets.forEach((s) => {
      if (s !== from) s.send(JSON.stringify({ st }));
    });
  });
}

function closeRoom(room: Room) {
  rooms.delete(room.path);
  console.log(`Closed room ${room.path}`);
}

function connectedToRoom(
  pill: string | undefined,
  socket: ServerWebSocket<RoomData>,
  roomPath: string
) {
  console.log(`${pill} connected to ${roomPath}`);
  const room = getRoom(roomPath);

  if (room.timeout) {
    clearTimeout(room.timeout);
    room.timeout = undefined;
  }

  let sockets = room.clients.get(pill);
  const isNewPeer = !sockets;
  if (!sockets) {
    sockets = [];
    room.clients.set(pill, sockets);
  }
  sockets.push(socket);

  // Send initial peers and voicePeers list
  const peers = getPeers(room).filter((p) => p !== pill);
  const voicePeers = Array.from(room.voicePeers).filter((p) => p !== pill);
  socket.send(JSON.stringify({ peers, voicePeers }));

  if (isNewPeer) sendPop(room);
  sendState(room, pill, socket);
}

function relayRTC(room: Room, signal: RTCSignal) {
  const sockets = room.clients.get(signal.to);
  if (sockets) {
    const msg = JSON.stringify({ rtc: signal });
    sockets.forEach((s) => s.send(msg));
  }
}

function roomMessage(
  pill: string | undefined,
  socket: ServerWebSocket<RoomData>,
  roomPath: string,
  data: string
) {
  const room = getRoom(roomPath);
  try {
    const msg = JSON.parse(data) as RoomMessage;
    if (msg.st) attemptAction(room, msg.st, socket, pill);
    if (msg.rtc && pill) relayRTC(room, { ...msg.rtc, from: pill });
    if (msg.voice !== undefined && pill) {
      if (msg.voice) {
        room.voicePeers.add(pill);
      } else {
        room.voicePeers.delete(pill);
      }
      broadcastVoicePeers(room);
    }
  } catch (e) {
    console.log("roomMessage error", (e as Error).message);
  }
}

function closeInRoom(
  pill: string | undefined,
  socket: ServerWebSocket<RoomData>,
  roomPath: string
) {
  console.log(`${pill} left ${roomPath}`);
  const room = getRoom(roomPath);
  const forPill = room.clients.get(pill);
  if (!forPill) return;

  const remaining = forPill.filter((c) => c !== socket);
  if (remaining.length > 0) {
    room.clients.set(pill, remaining);
  } else {
    room.clients.delete(pill);
    if (pill) room.voicePeers.delete(pill);
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

Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    const pill = url.searchParams.get("pill") || undefined;
    const path = url.pathname;

    if (path.startsWith("/room/")) {
      const upgraded = server.upgrade<RoomData>(req, {
        data: { pill, roomPath: path.substring(6) },
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
          data.roomPath
        );
      } else {
        connectedToLobby(data.pill, ws as ServerWebSocket<LobbyData>);
      }
    },
    message(ws, message) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        roomMessage(
          data.pill,
          ws as ServerWebSocket<RoomData>,
          data.roomPath,
          message as string
        );
      }
    },
    close(ws) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        closeInRoom(data.pill, ws as ServerWebSocket<RoomData>, data.roomPath);
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
