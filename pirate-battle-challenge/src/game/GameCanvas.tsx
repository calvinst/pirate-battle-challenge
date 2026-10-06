import { useEffect, useRef } from 'react'
import { createKeyboardInput } from './input/keyboard'
import { createGameLoop } from './loop/gameLoop'
import { createPixiRenderer, type Renderer } from './render/pixiRenderer'
import { createWorld, stepWorld } from './simulation/world'

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let renderer: Renderer | undefined
    let stopLoop: (() => void) | undefined
    const world = createWorld()
    const keyboard = createKeyboardInput()

    void createPixiRenderer(host, world).then((r) => {
      if (cancelled) {
        r.destroy()
        return
      }
      renderer = r
      const loop = createGameLoop({
        fixedStep: 1 / 60,
        maxFrameTime: 0.25,
        update: (dt) => stepWorld(world, keyboard.state, dt),
        render: () => r.render(world),
      })
      loop.start()
      stopLoop = loop.stop
    })

    return () => {
      cancelled = true
      keyboard.destroy()
      stopLoop?.()
      renderer?.destroy()
    }
  }, [])

  return <div ref={hostRef} className="game-host" />
}
