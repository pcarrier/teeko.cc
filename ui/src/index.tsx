import "preact/debug";

import "./index.less";

import { render } from "preact";
import { App } from "./App";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "reload") location.reload();
  });
}

render(<App />, document.body);
