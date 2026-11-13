import { Component, useMemo, type ReactNode } from 'react'

let cached: boolean | null = null
/** True when this browser can draw WebGL (false in tests and on very old devices). */
export function hasWebGL(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    cached = Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')))
  } catch {
    cached = false
  }
  return cached
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/** Shows a 3D scene when the device can draw one, otherwise a plain 2D fallback. */
export function Scene3D({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const ok = useMemo(hasWebGL, [])
  if (!ok) return <>{fallback}</>
  return <Boundary fallback={fallback}>{children}</Boundary>
}
