import { useEffect, useRef } from 'react'
import { createGameAudio, type GameAudio } from './audio/gameAudio'
import { createKeyboardInput, type KeyboardInput } from './input/keyboard'
import { mergeInputs, type TouchInput } from './input/touch'
import { createGameLoop, type GameLoop } from './loop/gameLoop'
import {
  createHudSnapshot,
  createMatchResult,
  type HudSnapshot,
  type MatchResult,
} from './matchInfo'
import { createPerfRecorder } from './perf'
import { createPixiRenderer, type Renderer } from './render/pixiRenderer'
import type { GameTextures } from './render/assets'
import type { GameConfig } from './simulation/config'
import { createInput, createWorld, stepWorld } from './simulation/world'
import { createSnapshot, e2eSeed, isE2E, isPerf } from './testHook'

interface GameCanvasProps {
  /** lida apenas ao montar; mudanças valem para a próxima partida */
  config: GameConfig
  textures: GameTextures
  paused: boolean
  touch: TouchInput
  /** emitido só quando pontos, segundos restantes ou vida mudam */
  onHud: (hud: HudSnapshot) => void
  onFinish: (result: MatchResult) => void
}

export function GameCanvas({ config, textures, paused, touch, onHud, onFinish }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onHud, onFinish })
  const pausedRef = useRef(paused)
  const loopRef = useRef<GameLoop | null>(null)
  const keyboardRef = useRef<KeyboardInput | null>(null)
  const audioRef = useRef<GameAudio | null>(null)

  useEffect(() => {
    callbacks.current = { onHud, onFinish }
  }, [onHud, onFinish])

  // Parar o loop descarta o tempo acumulado: a retomada não repete movimento nem disparos.
  useEffect(() => {
    pausedRef.current = paused
    keyboardRef.current?.setEnabled(!paused)
    audioRef.current?.setPaused(paused)
    if (paused) touch.reset()
    if (paused) loopRef.current?.stop()
    else loopRef.current?.start()
  }, [paused, touch])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const abort = new AbortController()
    let renderer: Renderer | undefined
    const world = createWorld(config, e2eSeed())
    const keyboard = createKeyboardInput()
    keyboard.setEnabled(!pausedRef.current)
    keyboardRef.current = keyboard

    let lastHud = createHudSnapshot(world)
    let finished = false
    const combined = createInput()
    callbacks.current.onHud(lastHud)

    const FIXED_STEP = 1 / 60
    const perf = isPerf ? createPerfRecorder() : null
    if (perf) window.__perf = { report: perf.report }
    let simulationMs = 0
    let lastFrameAt = 0

    const update = (dt: number) => {
      const startedAt = perf ? performance.now() : 0
      mergeInputs(keyboard.state, touch.state, combined)
      // Profiling mede a partida inteira, então o jogador não morre.
      if (perf) world.player.health = world.player.maxHealth
      stepWorld(world, combined, dt)
      audioRef.current?.update(world)

      const hud = createHudSnapshot(world)
      if (
        hud.score !== lastHud.score ||
        hud.timeRemaining !== lastHud.timeRemaining ||
        hud.health !== lastHud.health
      ) {
        lastHud = hud
        callbacks.current.onHud(hud)
      }

      if (world.match.status === 'over' && !finished) {
        finished = true
        if (perf) window.__perfLast = perf.report()
        callbacks.current.onFinish(createMatchResult(world))
      }
      if (perf) simulationMs += performance.now() - startedAt
    }

    createPixiRenderer(host, world, textures, abort.signal)
      .then((r) => {
        if (!r) return
        renderer = r

        if (isE2E) {
          // Modo manual: o tempo da simulação só avança por `advance`.
          r.render(world)
          window.__game = {
            advance: (seconds) => {
              const steps = Math.round(seconds / FIXED_STEP)
              for (let i = 0; i < steps; i++) update(FIXED_STEP)
              r.render(world)
            },
            snapshot: () => createSnapshot(world),
          }
          return
        }

        const loop = createGameLoop({
          fixedStep: FIXED_STEP,
          maxFrameTime: 0.25,
          update,
          render: () => {
            if (!perf) {
              r.render(world)
              return
            }
            const startedAt = performance.now()
            r.render(world)
            const finishedAt = performance.now()
            if (lastFrameAt > 0) {
              perf.frame(
                startedAt - lastFrameAt,
                simulationMs,
                finishedAt - startedAt,
                world.enemies.length,
                world.projectiles.length,
              )
            }
            lastFrameAt = startedAt
            simulationMs = 0
          },
        })
        loopRef.current = loop
        const audio = createGameAudio()
        audioRef.current = audio
        if (pausedRef.current) audio.setPaused(true)
        if (!pausedRef.current) loop.start()
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) console.error('Failed to start renderer', error)
      })

    return () => {
      abort.abort()
      delete window.__game
      keyboard.destroy()
      keyboardRef.current = null
      loopRef.current?.stop()
      loopRef.current = null
      audioRef.current?.destroy()
      audioRef.current = null
      delete window.__perf
      renderer?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a partida usa o snapshot inicial da config
  }, [])

  return <div ref={hostRef} className="game-host" role="img" aria-label="Pirate Battle arena" />
}
