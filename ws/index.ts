import { Message, State } from "../common/src/model.ts";
import { randomRoom } from "../common/src/utils.ts";

const notifyChannel: (content: string) => void = (() => {
  const url = Deno.env.get("DISCORD_WEBHOOK");
  if (!url) return (content) => console.log("fake Discord", content);
  return async function sendToDiscord(content: string) {
    try {
      await fetch(url, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
    } catch (e) {
      console.log("Discord error", e);
    }
  };
})();

type RoomState = State;

type Room = {
  path: string;
  clients: Map<string | undefined, WebSocket[]>;
  p1: string | undefined;
  p2: string | undefined;
  state: RoomState | null;
  timeout?: number;
};

type ServerState = {
  waiting: [string, WebSocket[]] | undefined;
  rooms: Map<string, Room>;
};

const serverState: ServerState = {
  waiting: undefined,
  rooms: new Map(),
};

type Context = {
  pill: string | undefined;
  socket: WebSocket;
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

function sendState(state: RoomState | null, socket: WebSocket) {
  socket.send(JSON.stringify({ st: state }));
}

function canPlay(room: Room, pill: string | undefined): boolean {
  if (room.state === null) return true;
  if (room.p1 === undefined) return true;
  if (room.p2 === undefined) return room.p1 !== pill;
  return room.state.board.m.length % 2 === 0
    ? room.p2 === undefined || room.p2 === pill
    : room.p1 === undefined || room.p1 === pill;
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
  from: WebSocket,
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
    } else if (pill !== currentPlayer) {
      console.log(`Blocking action from ${pill}, not current player`);
      return abort();
    }
  }
  room.state = state;
  room.clients.forEach((sockets, pill) => {
    const state = customize(room, pill);
    sockets.forEach((s) => {
      sendState(state, s);
    });
  });
}

function closeRoom(room: Room) {
  serverState.rooms.delete(room.path);
  console.log(`Closed room ${room.path}`);
}

function connectedToRoom(ctx: Context) {
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

function handleError(e: Event | ErrorEvent) {
  console.log("WS error", e instanceof ErrorEvent ? e.message : e.type);
}

function closeInRoom(ctx: Context) {
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

function connectedToLobby(pill: string | undefined, socket: WebSocket) {
  if (!pill) {
    console.log("Lobby connection failed, no pill");
    return;
  }
  if (serverState.waiting === undefined) {
    serverState.waiting = [pill, [socket]];
    notifyChannel("Player waiting for a match.");
  } else {
    const [otherPill, otherSockets] = serverState.waiting;
    if (otherPill === pill) {
      serverState.waiting[1].push(socket);
      return;
    }

    let join: string;
    do {
      join = randomRoom();
    } while (serverState.rooms.has(join));
    try {
      otherSockets.forEach((s) => s.send(JSON.stringify({ join })));
    } catch (e) {
      console.log("Failure matching", e.message || e.type || e);
      serverState.waiting = [pill, [socket]];
      return;
    }
    try {
      socket.send(JSON.stringify({ join }));
      otherSockets.forEach((s) => s.close());
      socket.close();
    } catch (e) {
      console.log("Failure closing", e.message || e.type || e);
    }
    notifyChannel("Players matched!");
  }
}

function closeInLobby(socket: WebSocket) {
  if (!serverState.waiting) return;
  if (serverState.waiting[1].includes(socket)) {
    serverState.waiting[1] = serverState.waiting[1].filter((s) => s !== socket);
    if (serverState.waiting[1].length === 0) {
      notifyChannel("Player no longer waiting.");
      serverState.waiting = undefined;
    }
  }
}

async function main() {
  for await (const conn of Deno.listen({ port: 8081 })) {
    const httpConn = Deno.serveHttp(conn);
    for await (const evt of httpConn) {
      if (evt.request.headers.get("upgrade") != "websocket") {
        await evt.respondWith(new Response(null, { status: 501 }));
      } else {
        const url = new URL(evt.request.url);
        const pill = url.searchParams.get("pill") || undefined;
        const path = url.pathname;

        if (path.startsWith(roomPrefix)) {
          const { socket, response } = Deno.upgradeWebSocket(evt.request);

          const ctx: Context = {
            pill,
            socket,
            roomPath: path.substring(roomPrefix.length),
          };
          socket.onopen = () => connectedToRoom(ctx);
          socket.onmessage = (m) => roomMessage(ctx, m.data);
          socket.onclose = () => closeInRoom(ctx);
          socket.onerror = (e) => handleError(e);

          await evt.respondWith(response);
        } else if (path === "/lobby") {
          const { socket, response } = Deno.upgradeWebSocket(evt.request);

          socket.onopen = () => connectedToLobby(pill, socket);
          socket.onclose = () => closeInLobby(socket);
          socket.onerror = (e) => handleError(e);

          await evt.respondWith(response);
        } else {
          await evt.respondWith(new Response(null, { status: 404 }));
        }
      }
    }
  }
}

main().catch((e) => {
  console.log(e);
  Deno.exit(1);
});
