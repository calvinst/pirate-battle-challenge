import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameCanvas } from '../game/GameCanvas'
import type { HudSnapshot, MatchResult } from '../game/matchInfo'
import type { GameTextures } from '../game/render/assets'
import { createConfig, type GameOptions } from '../game/simulation/config'
import { createTouchInput } from '../game/input/touch'
import { TouchControls } from './TouchControls'
import { useGameTextures } from './useGameTextures'

interface MatchScreenProps {
  options: GameOptions
  onFinish: (result: MatchResult) => void
  onQuit: () => void
}

/** Carrega os assets; a partida (e o cronômetro) só começam depois. */
export function MatchScreen(props: MatchScreenProps) {
  const { state, retry } = useGameTextures()

  if (state.status === 'ready') return <ActiveMatch {...props} textures={state.textures} />

  return (
    <main className="screen">
      <h1>Pirate Battle</h1>
      {state.status === 'loading' ? (
        <>
          <label htmlFor="asset-progress">Loading game assets…</label>
          <progress id="asset-progress" max={1} value={state.progress} />
        </>
      ) : (
        <div role="alert">
          <p>Could not load the game assets.</p>
          <div className="actions">
            <button type="button" onClick={retry} autoFocus>
              Try again
            </button>
            <button type="button" onClick={props.onQuit}>
              Main Menu
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function ActiveMatch({
  options,
  textures,
  onFinish,
  onQuit,
}: MatchScreenProps & { textures: GameTextures }) {
  // Snapshot da configuração no início da partida.
  const config = useMemo(() => createConfig(options), [options])
  const [paused, setPaused] = useState(false)
  const [touch] = useState(createTouchInput)
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const resumeRef = useRef<HTMLButtonElement>(null)

  const pause = useCallback(() => {
    setPaused(true)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pause()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' && e.code !== 'KeyP') return
      setPaused((p) => !p)
    }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('keydown', onKey)
    }
  }, [pause])

  useEffect(() => {
    if (paused) resumeRef.current?.focus()
  }, [paused])

  return (
    <div className="match">
      <GameCanvas
        config={config}
        textures={textures}
        paused={paused}
        touch={touch}
        onHud={setHud}
        onFinish={onFinish}
      />
      <TouchControls input={touch} />

      {hud && (
        <div className="hud" role="group" aria-label="Match status">
          <span>Score: {hud.score}</span>
          <span>Time: {hud.timeRemaining}s</span>
          <span>
            Health: {hud.health}/{hud.maxHealth}
          </span>
          <button type="button" onClick={pause}>
            Pause
          </button>
        </div>
      )}

      {paused && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <h2 id="pause-title">Paused</h2>
          <button
            type="button"
            ref={resumeRef}
            onClick={() => {
              setPaused(false)
            }}
          >
            Resume
          </button>
          <button type="button" onClick={onQuit}>
            Main Menu
          </button>
        </div>
      )}
    </div>
  )
}
