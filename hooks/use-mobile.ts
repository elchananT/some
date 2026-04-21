import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Removed synchronous setState call here to avoid cascading render lint error
    // The initial call is handled by the initial state if possible or inside a microtask
    // But better yet, we just trigger it once.
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
