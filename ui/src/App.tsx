import "./index.less";
import { FunctionComponent, h, render } from "preact";
import { EmptyBoard } from "./model";
import { LocalGame } from "./LocalGame";
import { registerSW } from "virtual:pwa-register";

const App: FunctionComponent = () => {
  const initial = { ...EmptyBoard };
  const hash = location.hash;
  if (hash.length > 1) {
    const authPrefix = "#auth:";
    if (hash.startsWith(authPrefix)) {
      localStorage.setItem("pill", hash.substring(authPrefix.length));
      location.hash = "";
    } else {
      try {
        const [a, b, t, l] = JSON.parse(decodeURI(hash.substring(1)));
        initial.a = a;
        initial.b = b;
        initial.t = t;
        initial.l = l;
      } catch (_) {
        console.log("Invalid URL parameters");
      }
    }
  }

  return (
    <>
      <LocalGame initial={initial} />
    </>
  );
};

registerSW();
render(<App />, document.body);
