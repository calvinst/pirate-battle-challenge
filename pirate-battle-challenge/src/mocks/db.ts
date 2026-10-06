import type { MatchRecord } from '../api/contracts'
import { asMatchRecords } from '../storage'

const DB_KEY = 'pirate-battle:mock-matches'

const NAMES = [
  'Anne Bonny',
  'Blackbeard',
  'Calico Jack',
  'Grace O’Malley',
  'Henry Morgan',
  'Mary Read',
  'Bartholomew Roberts',
  'Ching Shih',
  'Edward Low',
]

/** Determinístico: os mesmos jogadores e pontuações em toda carga. */
const createFixtures = (): MatchRecord[] =>
  Array.from({ length: 36 }, (_, i) => {
    const shortMatch = i % 4 === 3
    const matchDuration = shortMatch ? 60 : 90
    const byDeath = i % 3 === 0
    return {
      id: `fixture-${String(i).padStart(2, '0')}`,
      playerId: `fixture-player-${i % NAMES.length}`,
      playerName: NAMES[i % NAMES.length] ?? 'Unknown',
      playedAt: new Date(Date.UTC(2026, 0, 1 + i, 12)).toISOString(),
      score: (i * 7 + 3) % 23,
      duration: byDeath ? matchDuration - ((i * 5) % 40) - 5 : matchDuration,
      reason: byDeath ? 'death' : 'time',
      options: { matchDuration, spawnInterval: 3 },
    }
  })

const FIXTURES = createFixtures()

const loadConfirmed = (): MatchRecord[] => {
  try {
    const raw = localStorage.getItem(DB_KEY)
    return raw ? asMatchRecords(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export const allRecords = (): MatchRecord[] => [...FIXTURES, ...loadConfirmed()]

export const findRecord = (id: string): MatchRecord | undefined =>
  allRecords().find((r) => r.id === id)

export const insertRecord = (record: MatchRecord): void => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify([...loadConfirmed(), record]))
  } catch {
    // sem persistência: o registro vale só até recarregar
  }
}

export const resetDb = (): void => {
  try {
    localStorage.removeItem(DB_KEY)
  } catch {
    // nada a restaurar
  }
}
