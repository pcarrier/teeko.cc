import "preact/debug";

import "./index.less";

import { render } from "preact";
import { App } from "./App";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

render(<App />, document.body);
