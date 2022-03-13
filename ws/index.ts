import { Message, State } from "../common/src/model.ts";
import { randomRoom } from "../common/src/utils.ts";

const sendMessage: (content: string) => void = (() => {
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
  state: RoomState | null;
  timeout?: number;
};

type Server = {
  waiting: WebSocket | undefined;
  rooms: Map<string, Room>;
};

const serverState: Server = {
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
  };
  serverState.rooms.set(path, created);
  console.log(`Opened room ${path}`);
  return created;
}

function sendPop(room: Room) {
  const pop = room.clients.size;
  room.clients.forEach((sockets) =>
    sockets.forEach((socket) => socket.send(JSON.stringify({ pop })))
  );
}

function sendState(room: Room, socket: WebSocket) {
  socket.send(JSON.stringify({ st: room.state }));
}

function setState(room: Room, state: RoomState, from: WebSocket) {
  room.state = state;
  room.clients.forEach((sockets) => {
    sockets.forEach((socket) => {
      if (socket !== from) sendState(room, socket);
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
  sendState(room, ctx.socket);
}

function roomMessage(ctx: Context, data: string) {
  const room = getRoom(ctx);
  try {
    const msg = JSON.parse(data) as Message;
    if (msg.st) {
      setState(room, msg.st, ctx.socket);
    }
  } catch (e) {
    console.log("roomMessage error", e);
  }
}

function handleError(evt: Event | ErrorEvent) {
  console.log("WS error", evt);
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
    room.timeout = setTimeout(() => closeRoom(room), 60_000);
  else sendPop(room);
}

const roomPrefix = "/room/";

function connectedToLobby(socket: WebSocket) {
  const waiting = serverState.waiting;
  if (waiting === undefined) {
    serverState.waiting = socket;
    sendMessage("Player looking for a match");
  } else {
    const join = randomRoom();
    try {
      waiting.send(JSON.stringify({ join }));
    } catch (e) {
      serverState.waiting = socket;
      return;
    }
    try {
      socket.send(JSON.stringify({ join }));
      waiting.close();
      socket.close();
    } catch (e) {
      console.log();
    }
    sendMessage("Players matched");
  }
}

function closeInLobby(socket: WebSocket) {
  console.log("closeInLobby");
  if (serverState.waiting === socket) {
    serverState.waiting = undefined;
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
          socket.onclose = (e) => closeInRoom(ctx);
          socket.onerror = (e) => handleError(e);

          await evt.respondWith(response);
        } else if (path === "/lobby") {
          const { socket, response } = Deno.upgradeWebSocket(evt.request);

          socket.onopen = () => connectedToLobby(socket);
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
