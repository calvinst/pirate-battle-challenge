import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameCanvas } from '../game/GameCanvas'
import type { HudSnapshot, MatchResult } from '../game/matchInfo'
import type { GameTextures } from '../game/render/assets'
import { createConfig, type GameOptions } from '../game/simulation/config'
import { createTouchInput } from '../game/input/touch'
import { Hud } from './Hud'
import { TouchControls } from './TouchControls'
import { useFocusTrap } from './useFocusTrap'
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
      <div className="panel">
        <h1>Pirate Battle</h1>
        {state.status === 'loading' ? (
          <>
            <label htmlFor="asset-progress">Loading game assets…</label>
            <progress id="asset-progress" max={1} value={state.progress} />
          </>
        ) : (
          <div role="alert">
            <p>Could not load the game assets.</p>
            <div className="stack">
              <button type="button" className="btn btn-sm" onClick={retry} autoFocus>
                Try again
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={props.onQuit}>
                Main Menu
              </button>
            </div>
          </div>
        )}
      </div>
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
  const dialogRef = useRef<HTMLDivElement>(null)

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

  useFocusTrap(dialogRef, paused)

  // Só mudanças relevantes são anunciadas, nunca o tempo a cada segundo.
  const lowHealth = hud !== null && hud.health / hud.maxHealth <= 0.25
  const announcement = paused ? 'Game paused' : lowHealth ? 'Health critical' : ''

  return (
    <div className="match">
      {hud && <Hud hud={hud} onPause={pause} />}
      <GameCanvas
        config={config}
        textures={textures}
        paused={paused}
        touch={touch}
        onHud={setHud}
        onFinish={onFinish}
      />
      <TouchControls input={touch} />

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {paused && (
        <div className="overlay">
          <div
            ref={dialogRef}
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
          >
            <h2 id="pause-title">Paused</h2>
            <div className="stack">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setPaused(false)
                }}
              >
                Resume
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={onQuit}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
