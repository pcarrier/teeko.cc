import { Board } from "teeko-cc-common/src/model";

export function historyPush(path) {
  history.pushState({}, null, path);
}

export function setHash(board: Board) {
  location.replace(
    `#${encodeURI(JSON.stringify([board.a, board.b, board.m]))}`
  );
}
