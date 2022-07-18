const live = window.location.hostname === "kayu.teeko.cc";

export function wsUrl(path: string, pill: string) {
  return live
    ? `wss://kayu-ws.teeko.cc/${path}?pill=${pill}`
    : `ws://${window.location.hostname}:8081/${path}?pill=${pill}`;
}
