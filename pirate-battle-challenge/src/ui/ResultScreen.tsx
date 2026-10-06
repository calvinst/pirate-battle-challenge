import type { Registration } from '../api/useMatchSync'
import type { MatchResult } from '../game/matchInfo'

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
      <h1>Match over</h1>
      <dl>
        <dt>Score</dt>
        <dd>{result.score}</dd>
        <dt>Time played</dt>
        <dd>{result.duration.toFixed(1)}s</dd>
        <dt>Reason</dt>
        <dd>{REASONS[result.reason]}</dd>
      </dl>
      <p role="status">{REGISTRATION_TEXT[registration]}</p>
      {registration === 'failed' && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
      <div className="actions">
        <button type="button" onClick={onPlayAgain} autoFocus>
          Play Again
        </button>
        <button type="button" onClick={onMainMenu}>
          Main Menu
        </button>
      </div>
    </main>
  )
}
