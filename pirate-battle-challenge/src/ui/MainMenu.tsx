import type { MatchResult } from '../game/matchInfo'
import { icons } from './icons'
import { ScenarioPanel } from './ScenarioPanel'

export type LogTab = 'ranking' | 'history'

interface MainMenuProps {
  lastResult: MatchResult | null
  onPlay: () => void
  onOptions: () => void
  onOpenLog: (tab: LogTab) => void
}

export function MainMenu({ lastResult, onPlay, onOptions, onOpenLog }: MainMenuProps) {
  return (
    <main className="screen">
      <div className="panel">
        <h1 className="title">
          <img className="title-logo" src={icons.titleLogo} alt="Pirate Battle" />
        </h1>
        <p className="tagline">Set sail. Take command.</p>

        <nav className="stack" aria-label="Main menu">
          <button type="button" className="btn" onClick={onPlay} autoFocus>
            Play
          </button>
          <button type="button" className="btn" onClick={onOptions}>
            Options
          </button>
        </nav>

        <p className="hint">Navigate the islands. Survive the battle.</p>

        <div className="row">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              onOpenLog('ranking')
            }}
          >
            Ranking
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              onOpenLog('history')
            }}
          >
            Match History
          </button>
        </div>

        {lastResult && (
          <section aria-labelledby="last-title">
            <h2 id="last-title">Last match</h2>
            <p>
              {lastResult.score} pts in {lastResult.duration.toFixed(1)}s
            </p>
          </section>
        )}

        <section className="controls" aria-labelledby="controls-title">
          <h2 id="controls-title">Controls</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Keyboard</th>
                <th scope="col">Touch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Sail forward / reverse</th>
                <td>
                  <kbd>W</kbd> / <kbd>S</kbd> or <kbd>↑</kbd> / <kbd>↓</kbd>
                </td>
                <td>Up / down buttons, left pad</td>
              </tr>
              <tr>
                <th scope="row">Turn left / right</th>
                <td>
                  <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd>
                </td>
                <td>Arrow buttons, left pad</td>
              </tr>
              <tr>
                <th scope="row">Fire forward</th>
                <td>
                  <kbd>Space</kbd>
                </td>
                <td>Middle cannon button, right pad</td>
              </tr>
              <tr>
                <th scope="row">Broadside left / right</th>
                <td>
                  <kbd>Q</kbd> / <kbd>E</kbd>
                </td>
                <td>Outer cannon buttons, right pad</td>
              </tr>
              <tr>
                <th scope="row">Pause</th>
                <td>
                  <kbd>Esc</kbd> or <kbd>P</kbd>
                </td>
                <td>Pause button, top right</td>
              </tr>
            </tbody>
          </table>
        </section>

        <ScenarioPanel />
      </div>
    </main>
  )
}
