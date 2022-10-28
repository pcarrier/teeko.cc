import "preact/debug";

import "./index.less";

import { render } from "preact";
import { App } from "./App";
import { init as fsInit } from "@fullstory/browser";

fsInit({ orgId: "172W30" });

render(<App />, document.body);
