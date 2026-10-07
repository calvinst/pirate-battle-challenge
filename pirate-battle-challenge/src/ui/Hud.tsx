import { useState } from 'react'
import { isMuted, setMuted } from '../game/audio/audioEngine'
import type { HudSnapshot } from '../game/matchInfo'
import { icons } from './icons'

interface HudProps {
  hud: HudSnapshot
  onPause: () => void
}

/** Os prefixos `sr-only` fazem leitores de tela lerem "Score: 3", "Time: 80s", "Health: 90/100". */
export function Hud({ hud, onPause }: HudProps) {
  const ratio = Math.max(0, Math.min(1, hud.health / hud.maxHealth))
  const [muted, setMutedState] = useState(isMuted)
  return (
    <div className="hud" role="group" aria-label="Match status">
      <span className="counter">
        <img src={icons.score} alt="" />
        <span className="sr-only">Score: </span>
        <span>{hud.score}</span>
      </span>
      <span className="counter">
        <img src={icons.time} alt="" />
        <span className="sr-only">Time: </span>
        <span>{hud.timeRemaining}s</span>
      </span>
      <span className="health">
        <img src={icons.heart} alt="" />
        <span className="sr-only">Health: </span>
        <span>
          {hud.health}/{hud.maxHealth}
        </span>
        <span className={`health-bar${ratio <= 0.25 ? ' is-low' : ''}`} aria-hidden="true">
          <span style={{ width: `${ratio * 100}%` }} />
        </span>
      </span>
      <div className="hud-actions">
        <button
          type="button"
          className={`btn-round sound-toggle${muted ? ' is-muted' : ''}`}
          aria-label="Sound"
          aria-pressed={!muted}
          onClick={() => {
            setMuted(!muted)
            setMutedState(!muted)
          }}
        >
          <span aria-hidden="true">♪</span>
        </button>
        <button type="button" className="btn-round" aria-label="Pause" onClick={onPause}>
          <img src={icons.pause} alt="" />
        </button>
      </div>
    </div>
  )
}
