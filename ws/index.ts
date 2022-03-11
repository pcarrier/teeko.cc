import { Message } from "../common/src/model.ts";

type RoomState = unknown;

interface Room {
  path: string;
  clients: WebSocket[];
  state: RoomState;
  timeout?: number;
}

interface Server {
  rooms: Map<string, Room>;
}

const serverState: Server = {
  rooms: new Map(),
};

interface Context {
  socket: WebSocket;
  roomPath: string;
}

function getRoom(ctx: Context): Room {
  const path = ctx.roomPath;
  const existing = serverState.rooms.get(path);
  if (existing) {
    existing.clients.push(ctx.socket);
    return existing;
  }
  const created: Room = {
    path,
    clients: [ctx.socket],
    state: null,
  };
  serverState.rooms.set(path, created);
  console.log(`Opened room ${path}`);
  return created;
}

function sendState(room: Room, socket: WebSocket) {
  socket.send(JSON.stringify({ st: room.state }));
}

function setState(room: Room, state: RoomState, from: WebSocket) {
  room.state = state;
  room.clients.forEach((c) => {
    if (c !== from) sendState(room, c);
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
  room.clients = room.clients.filter((c) => c !== ctx.socket);
  if (room.clients.length === 0)
    room.timeout = setTimeout(() => closeRoom(room), 600_000);
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
        const path = url.pathname;

        if (path.startsWith(roomPrefix)) {
          const { socket, response } = Deno.upgradeWebSocket(evt.request);

          const ctx: Context = {
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
