import { Board } from "./model.tsx";

export function historyPush(path) {
  history.pushState({}, null, path);
}

export function setHash(board: Board) {
  location.replace(
    `#${encodeURI(JSON.stringify([board.a, board.b, board.m]))}`
  );
}
