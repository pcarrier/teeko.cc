import { useEffect } from "preact/hooks";

export function historyPush(path) {
  history.pushState({}, null, path)
}

export function useEvent(event, handler, passive = false) {
  useEffect(() => {
    // initiate the event handler
    window.addEventListener(event, handler, passive)

    // this will clean up the event every time the component is re-rendered
    return function cleanup() {
      window.removeEventListener(event, handler)
    }
  })
}
