import type { Registration } from '../api/useMatchSync'
import type { MatchResult } from '../game/matchInfo'
import { icons } from './icons'

interface ResultScreenProps {
  result: MatchResult
  registration: Registration
  onRetry: () => void
  onPlayAgain: () => void
  onMainMenu: () => void
}

const REGISTRATION_TEXT: Record<Registration, string> = {
  saving: 'Saving your match…',
  saved: 'Match saved to ranking and history.',
  failed: 'Match not saved yet. It is kept and will be retried.',
}

const REASONS = {
  time: "Time's up",
  death: 'Your ship was destroyed',
} as const

export function ResultScreen({
  result,
  registration,
  onRetry,
  onPlayAgain,
  onMainMenu,
}: ResultScreenProps) {
  return (
    <main className="screen">
      <div className="panel">
        <h1>Match over</h1>
        <dl className="stats">
          <dt>
            <img src={icons.score} alt="" />
            Score
          </dt>
          <dd>{result.score}</dd>
          <dt>
            <img src={icons.time} alt="" />
            Time played
          </dt>
          <dd>{result.duration.toFixed(1)}s</dd>
          <dt>Reason</dt>
          <dd>{REASONS[result.reason]}</dd>
        </dl>

        <p role="status">{REGISTRATION_TEXT[registration]}</p>
        {registration === 'failed' && (
          <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
            Retry
          </button>
        )}

        <div className="stack">
          <button type="button" className="btn" onClick={onPlayAgain} autoFocus>
            Play Again
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </main>
  )
}
