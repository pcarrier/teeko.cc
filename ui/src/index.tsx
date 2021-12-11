import "./index.less";

import { render } from "preact";
import { createClient } from "@urql/preact";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";

declare global {
  interface Crypto {
    randomUUID: () => string;
  }
}

const authPrefix = "#auth:";
if (location.hash.startsWith(authPrefix)) {
  localStorage.setItem("pill", location.hash.substring(authPrefix.length));
  location.hash = "";
} else {
  if (!localStorage.getItem("pill")) {
    localStorage.setItem("pill", crypto.randomUUID());
  }
}

export const client = createClient({
  url: "https://api.teeko.cc/graphql",
  fetchOptions: () => {
    const pill = localStorage.getItem("pill");
    return {
      headers: pill ? { authorization: `Bearer ${pill}` } : undefined,
    };
  },
});

render(<App />, document.body);
registerSW();
