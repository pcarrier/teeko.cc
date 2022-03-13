const live = window.location.hostname === "teeko.cc";

export function wsUrl(path: string, pill: string) {
  return live
    ? `wss://ws.teeko.cc/${path}?pill=${pill}`
    : `ws://${window.location.hostname}:8081/${path}?pill=${pill}`;
}
