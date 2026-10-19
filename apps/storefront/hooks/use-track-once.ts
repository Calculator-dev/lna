import { useEffect, useRef } from "react"

/** Runs `send` the first time `ready` is true (e.g. once the stored cart has loaded). */
export function useTrackOnce(ready: boolean, send: () => void) {
  const sent = useRef(false)
  useEffect(() => {
    if (!ready || sent.current) return
    sent.current = true
    send()
  })
}
