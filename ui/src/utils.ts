import { Board } from "teeko-cc-common/src/model";

export function historyPush(path) {
  history.pushState({}, null, path);
}
