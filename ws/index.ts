import { Message, State } from "../common/src/model.ts";

type RoomState = State;

interface Room {
  path: string;
  clients: Map<string | undefined, WebSocket[]>;
  state: RoomState | null;
  timeout?: number;
}

interface Server {
  rooms: Map<string, Room>;
}

const serverState: Server = {
  rooms: new Map(),
};

interface Context {
  pill: string | undefined;
  socket: WebSocket;
  roomPath: string;
}

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

function handleConnected(ctx: Context) {
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

function handleMessage(ctx: Context, data: string) {
  const room = getRoom(ctx);
  try {
    const msg = JSON.parse(data) as Message;
    if (msg.st) {
      setState(room, msg.st, ctx.socket);
    }
  } catch (e) {
    console.log(`handleMessage error ${e}`);
  }
}

function handleError(ctx: Context, evt: Event | ErrorEvent) {
  console.log(`WS error ${evt instanceof ErrorEvent ? evt.message : evt.type}`);
}

function handleClose(ctx: Context, evt: CloseEvent) {
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
          socket.onopen = () => handleConnected(ctx);
          socket.onmessage = (m) => handleMessage(ctx, m.data);
          socket.onclose = (e) => handleClose(ctx, e);
          socket.onerror = (e) => handleError(ctx, e);

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
