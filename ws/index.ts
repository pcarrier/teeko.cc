import { customAlphabet } from "nanoid";
import { Message, State } from "../common/src/model.ts";
import type { ServerWebSocket } from "bun";

export const randomID = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  8
);

const url = Bun.env.DISCORD_WEBHOOK;
const port = parseInt(Bun.env.PORT || "8081");

const notifyChannel = !url
  ? (content: string) => console.log("fake Discord", content)
  : async (content: string) => {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (e) {
        console.log("Discord error", e);
      }
    };

type RoomState = State;

type Room = {
  path: string;
  clients: Map<string | undefined, ServerWebSocket<RoomData>[]>;
  p1: string | undefined;
  p2: string | undefined;
  state: RoomState | null;
  timeout?: number;
};

type ServerState = {
  waiting: [string, ServerWebSocket<LobbyData>[]] | undefined;
  rooms: Map<string, Room>;
};

const serverState: ServerState = {
  waiting: undefined,
  rooms: new Map(),
};

type RoomData = {
  pill: string | undefined;
  roomPath: string;
};

type LobbyData = {
  pill: string | undefined;
};

type Context = {
  pill: string | undefined;
  socket: ServerWebSocket<RoomData>;
  roomPath: string;
};

function getRoom(ctx: Context): Room {
  const path = ctx.roomPath;
  const existing = serverState.rooms.get(path);
  if (existing) {
    return existing;
  }
  const created: Room = {
    path,
    clients: new Map(),
    state: null,
    p1: undefined,
    p2: undefined,
  };
  serverState.rooms.set(path, created);
  console.log(`Opened room ${path}`);
  return created;
}

function sendPop(room: Room) {
  const pop = room.clients.size;
  room.clients.forEach((sockets) =>
    sockets.forEach((s) => s.send(JSON.stringify({ pop })))
  );
}

function sendState(state: RoomState | null, socket: ServerWebSocket<RoomData>) {
  socket.send(JSON.stringify({ st: state }));
}

function canPlay(room: Room, pill: string | undefined): boolean {
  if (room.state === null) return true;
  if (room.p1 === undefined) return true;
  if (room.p2 === undefined) return room.p1 !== pill;
  return room.state.board.m.length % 2 === 0
    ? room.p1 === undefined || room.p1 === pill
    : room.p2 === undefined || room.p2 === pill;
}

function customize(room: Room, pill: string | undefined): RoomState | null {
  const state = room.state;
  if (state === null) return state;
  const p = canPlay(room, pill);
  return { board: { ...state.board, p } };
}

function attemptAction(
  room: Room,
  state: RoomState,
  from: ServerWebSocket<RoomData>,
  pill: string | undefined
) {
  function abort() {
    sendState(customize(room, pill), from);
  }

  const board = state.board;
  const actions = board.m.length;
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
  room.clients.forEach((sockets, pill) => {
    const state = customize(room, pill);
    sockets.forEach((s) => {
      if (s !== from) sendState(state, s);
    });
  });
}

function closeRoom(room: Room) {
  serverState.rooms.delete(room.path);
  console.log(`Closed room ${room.path}`);
}

function connectedToRoom(ctx: Context) {
  console.log(`${ctx.pill} connected to ${ctx.roomPath}`);
  const room = getRoom(ctx);
  if (room.timeout) {
    clearTimeout(room.timeout);
    room.timeout = undefined;
  }
  let sockets = room.clients.get(ctx.pill);
  if (!sockets) {
    sockets = [];
    room.clients.set(ctx.pill, sockets);
  }
  sockets.push(ctx.socket);
  sendPop(room);
  sendState(customize(room, ctx.pill), ctx.socket);
}

function roomMessage(ctx: Context, data: string) {
  const room = getRoom(ctx);
  try {
    const msg = JSON.parse(data) as Message;
    if (msg.st) {
      attemptAction(room, msg.st, ctx.socket, ctx.pill);
    }
  } catch (e) {
    console.log("roomMessage error", e.message);
  }
}

function handleError(error: Error) {
  console.log("WS error", error.message);
}

function closeInRoom(ctx: Context) {
  console.log(`${ctx.pill} left ${ctx.roomPath}`);
  const room = getRoom(ctx);
  const forPill = room.clients.get(ctx.pill);
  if (!forPill) return;
  const remaining = forPill.filter((c) => c !== ctx.socket);
  if (remaining.length > 0) {
    room.clients.set(ctx.pill, remaining);
  } else {
    room.clients.delete(ctx.pill);
  }
  if (room.clients.size === 0)
    room.timeout = setTimeout(() => closeRoom(room), 3600_000);
  else sendPop(room);
}

const roomPrefix = "/room/";

function connectedToLobby(pill: string | undefined, socket: ServerWebSocket<LobbyData>) {
  if (!pill) {
    console.log("Lobby connection failed, no pill");
    return;
  }
  if (serverState.waiting === undefined) {
    serverState.waiting = [pill, [socket]];
    notifyChannel(`\`${pill}\` waiting for a match.`);
  } else {
    const [otherPill, otherSockets] = serverState.waiting;
    if (otherPill === pill) {
      serverState.waiting[1].push(socket);
      return;
    }

    const [a, b] = pill < otherPill ? [pill, otherPill] : [otherPill, pill];
    const join = `${a}—${b}`;
    try {
      otherSockets.forEach((s) => s.send(JSON.stringify({ join })));
    } catch (e) {
      console.log(
        `Failure matching ${pill} with ${otherPill}`,
        e.message || e.type || e
      );
      serverState.waiting = [pill, [socket]];
      return;
    }
    try {
      socket.send(JSON.stringify({ join }));
      otherSockets.forEach((s) => s.close());
      socket.close();
    } catch (e) {
      console.log(`Failure closing ${pill}`, e.message || e.type || e);
    }
    notifyChannel(`\`${pill}\` and \`${otherPill}\` matched!`);
  }
}

function closeInLobby(pill: string | undefined, socket: ServerWebSocket<LobbyData>) {
  if (!serverState.waiting) return;
  if (serverState.waiting[1].includes(socket)) {
    serverState.waiting[1] = serverState.waiting[1].filter((s) => s !== socket);
    if (serverState.waiting[1].length === 0) {
      notifyChannel(`\`${pill}\` no longer waiting.`);
      serverState.waiting = undefined;
    }
  }
}

Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    const pill = url.searchParams.get("pill") || undefined;
    const path = url.pathname;

    if (path.startsWith(roomPrefix)) {
      const upgraded = server.upgrade<RoomData>(req, {
        data: {
          pill,
          roomPath: path.substring(roomPrefix.length),
        },
      });
      if (upgraded) return undefined;
      return new Response(null, { status: 500 });
    } else if (path === "/lobby") {
      const upgraded = server.upgrade<LobbyData>(req, {
        data: { pill },
      });
      if (upgraded) return undefined;
      return new Response(null, { status: 500 });
    }

    return new Response(null, { status: 404 });
  },
  websocket: {
    open(ws) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        const ctx: Context = {
          pill: data.pill,
          socket: ws as ServerWebSocket<RoomData>,
          roomPath: data.roomPath,
        };
        connectedToRoom(ctx);
      } else {
        connectedToLobby(data.pill, ws as ServerWebSocket<LobbyData>);
      }
    },
    message(ws, message) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        const ctx: Context = {
          pill: data.pill,
          socket: ws as ServerWebSocket<RoomData>,
          roomPath: data.roomPath,
        };
        roomMessage(ctx, message as string);
      }
    },
    close(ws) {
      const data = ws.data as RoomData | LobbyData;
      if ("roomPath" in data) {
        const ctx: Context = {
          pill: data.pill,
          socket: ws as ServerWebSocket<RoomData>,
          roomPath: data.roomPath,
        };
        closeInRoom(ctx);
      } else {
        closeInLobby(data.pill, ws as ServerWebSocket<LobbyData>);
      }
    },
    error(ws, error) {
      handleError(error as Error);
    },
  },
});

console.log(`WebSocket server running on port ${port}`);
