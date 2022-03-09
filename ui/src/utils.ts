export function historyPush(path) {
  history.pushState({}, null, path)
}
