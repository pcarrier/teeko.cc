import "./index.less";

import { FunctionComponent, render } from "preact";
import { createClient, Provider } from "@urql/preact";
import { registerSW } from "virtual:pwa-register";

import { Board, EmptyBoard } from "./model";
import { LocalGame } from "./LocalGame";

const client = createClient({
  url: "https://api.teeko.cc/graphql",
  fetchOptions: () => {
    const pill = localStorage.getItem("pill");
    return {
      headers: pill ? { authorization: `Bearer ${pill}` } : undefined,
    };
  },
});

const App: FunctionComponent = () => {
  let initial: Board = { ...EmptyBoard };
  let found = false;

  const hash = location.hash;
  if (hash.length > 1) {
    const authPrefix = "#auth:";
    if (hash.startsWith(authPrefix)) {
      localStorage.setItem("pill", hash.substring(authPrefix.length));
      location.hash = "";
    } else {
      try {
        const [a, b, t, l] = JSON.parse(decodeURI(hash.substring(1)));
        initial = { a, b, t, l, p: true };
        initial.a = a;
        initial.b = b;
        initial.t = t;
        initial.l = l;
        found = true;
      } catch (_) {
        console.log("Invalid URL parameters");
      }
    }
  }

  if (!found) {
    const stored = localStorage.getItem("board");
    if (stored) {
      initial = JSON.parse(stored);
    }
  }

  return (
    <Provider value={client}>
      <LocalGame initial={initial} />
    </Provider>
  );
};

registerSW();
render(<App />, document.body);
