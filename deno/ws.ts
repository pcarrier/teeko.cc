const listener = Deno.listen({ port: 3030 });
let newPlayerID = 0;

for await (const connection of listener) {
  const http = Deno.serveHttp(connection);
  for await (const { request, respondWith } of http) {
    if (request.headers.get("upgrade") != "websocket") {
      respondWith(new Response(null, { status: 501 }));
      break;
    }
    const { socket, response } = Deno.upgradeWebSocket(request);
    socket.onopen = () => socket.send(JSON.stringify({ id: newPlayerID++ }));
    socket.onmessage = (msg) => console.log(msg);
    socket.onerror = (err) => console.error("oops", socket, err);
    respondWith(response);
  }
}
