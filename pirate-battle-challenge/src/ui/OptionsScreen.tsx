import { useState, type FormEvent } from 'react'
import {
  MAX_MATCH_DURATION,
  MAX_SPAWN_INTERVAL,
  MIN_MATCH_DURATION,
  MIN_SPAWN_INTERVAL,
  validateOptions,
  type GameOptions,
  type OptionErrors,
} from '../game/simulation/config'

interface OptionsScreenProps {
  options: GameOptions
  onSave: (options: GameOptions) => void
  onBack: () => void
}

export function OptionsScreen({ options, onSave, onBack }: OptionsScreenProps) {
  const [duration, setDuration] = useState(String(options.matchDuration))
  const [interval, setInterval] = useState(String(options.spawnInterval))
  const [errors, setErrors] = useState<OptionErrors>({})
  const [saved, setSaved] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: GameOptions = {
      matchDuration: duration.trim() === '' ? NaN : Number(duration),
      spawnInterval: interval.trim() === '' ? NaN : Number(interval),
    }
    const found = validateOptions(next)
    setErrors(found)
    setSaved(false)
    if (Object.keys(found).length > 0) return
    onSave(next)
    setSaved(true)
  }

  return (
    <main className="screen">
      <div className="panel">
        <h1>Options</h1>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="duration">Game session time (s)</label>
            <input
              id="duration"
              className="input"
              type="number"
              inputMode="decimal"
              min={MIN_MATCH_DURATION}
              max={MAX_MATCH_DURATION}
              value={duration}
              aria-invalid={errors.matchDuration ? true : undefined}
              aria-describedby="duration-help"
              onChange={(e) => {
                setDuration(e.target.value)
              }}
            />
            <small id="duration-help" role={errors.matchDuration ? 'alert' : undefined}>
              {errors.matchDuration ?? `${MIN_MATCH_DURATION} to ${MAX_MATCH_DURATION} seconds.`}
            </small>
          </div>

          <div className="field">
            <label htmlFor="spawn">Enemy spawn time (s)</label>
            <input
              id="spawn"
              className="input"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={MIN_SPAWN_INTERVAL}
              max={MAX_SPAWN_INTERVAL}
              value={interval}
              aria-invalid={errors.spawnInterval ? true : undefined}
              aria-describedby="spawn-help"
              onChange={(e) => {
                setInterval(e.target.value)
              }}
            />
            <small id="spawn-help" role={errors.spawnInterval ? 'alert' : undefined}>
              {errors.spawnInterval ?? `${MIN_SPAWN_INTERVAL} to ${MAX_SPAWN_INTERVAL} seconds.`}
            </small>
          </div>

          <div className="row">
            <button type="submit" className="btn btn-sm">
              Save
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={onBack}>
              Back
            </button>
          </div>
          <p role="status">{saved ? 'Options saved.' : ''}</p>
        </form>
      </div>
    </main>
  )
}
