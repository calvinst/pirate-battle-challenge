import type { MatchRecord } from './api/contracts'
import type { MatchResult } from './game/matchInfo'
import { defaultOptions, validateOptions, type GameOptions } from './game/simulation/config'

const OPTIONS_KEY = 'pirate-battle:options'
const LAST_RESULT_KEY = 'pirate-battle:last-result'
const PENDING_KEY = 'pirate-battle:pending-matches'

const readJson = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Armazenamento indisponível ou cheio: o jogo segue sem persistência.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const asOptions = (v: unknown): GameOptions | null => {
  if (!isRecord(v)) return null
  const { matchDuration, spawnInterval } = v
  if (typeof matchDuration !== 'number' || typeof spawnInterval !== 'number') return null
  const options = { matchDuration, spawnInterval }
  return Object.keys(validateOptions(options)).length === 0 ? options : null
}

export const loadOptions = (): GameOptions =>
  asOptions(readJson(OPTIONS_KEY)) ?? defaultOptions

export const saveOptions = (options: GameOptions): void => {
  writeJson(OPTIONS_KEY, options)
}

export const loadLastResult = (): MatchResult | null => {
  const v = readJson(LAST_RESULT_KEY)
  if (!isRecord(v)) return null
  const options = asOptions(v.options)
  if (
    !options ||
    typeof v.id !== 'string' ||
    typeof v.score !== 'number' ||
    typeof v.duration !== 'number' ||
    (v.reason !== 'time' && v.reason !== 'death') ||
    typeof v.playedAt !== 'string'
  ) {
    return null
  }
  return {
    id: v.id,
    score: v.score,
    duration: v.duration,
    reason: v.reason,
    playedAt: v.playedAt,
    options,
  }
}

export const saveLastResult = (result: MatchResult): void => {
  writeJson(LAST_RESULT_KEY, result)
}

export const asMatchRecord = (v: unknown): MatchRecord | null => {
  if (!isRecord(v)) return null
  const options = asOptions(v.options)
  if (
    !options ||
    typeof v.id !== 'string' ||
    typeof v.playerId !== 'string' ||
    typeof v.playerName !== 'string' ||
    typeof v.playedAt !== 'string' ||
    typeof v.score !== 'number' ||
    typeof v.duration !== 'number' ||
    (v.reason !== 'time' && v.reason !== 'death')
  ) {
    return null
  }
  return {
    id: v.id,
    playerId: v.playerId,
    playerName: v.playerName,
    playedAt: v.playedAt,
    score: v.score,
    duration: v.duration,
    reason: v.reason,
    options,
  }
}

export const asMatchRecords = (v: unknown): MatchRecord[] =>
  Array.isArray(v)
    ? v.flatMap((item) => {
        const record = asMatchRecord(item)
        return record ? [record] : []
      })
    : []

/** Partidas concluídas ainda não confirmadas pela API. */
export const loadPending = (): MatchRecord[] => asMatchRecords(readJson(PENDING_KEY))

export const savePending = (records: MatchRecord[]): void => {
  writeJson(PENDING_KEY, records)
}
