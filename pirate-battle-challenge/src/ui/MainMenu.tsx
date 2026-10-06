import type { MatchResult } from '../game/matchInfo'
import type { GameOptions } from '../game/simulation/config'
import { LeaderboardTabs } from './LeaderboardTabs'
import { ScenarioPanel } from './ScenarioPanel'

interface MainMenuProps {
  options: GameOptions
  lastResult: MatchResult | null
  onPlay: () => void
  onOptions: () => void
}

export function MainMenu({ options, lastResult, onPlay, onOptions }: MainMenuProps) {
  return (
    <main className="screen">
      <h1>Pirate Battle</h1>
      <nav className="actions" aria-label="Main menu">
        <button type="button" onClick={onPlay} autoFocus>
          Play
        </button>
        <button type="button" onClick={onOptions}>
          Options
        </button>
      </nav>

      <section aria-labelledby="controls-title">
        <h2 id="controls-title">Controls</h2>
        <ul>
          <li>W / S or Up / Down: sail forward / reverse</li>
          <li>A / D or Left / Right: turn</li>
          <li>Space: fire forward</li>
          <li>Q / E: fire broadside (left / right)</li>
          <li>Esc or P: pause</li>
        </ul>
      </section>

      {lastResult && (
        <section aria-labelledby="last-title">
          <h2 id="last-title">Last match</h2>
          <p>
            {lastResult.score} pts in {lastResult.duration.toFixed(1)}s
          </p>
        </section>
      )}

      <LeaderboardTabs options={options} />
      <ScenarioPanel />
    </main>
  )
}
