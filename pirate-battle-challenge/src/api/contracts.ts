import type { GameOptions } from '../game/simulation/config'
import type { EndReason } from '../game/simulation/world'
import type { MatchResult } from '../game/matchInfo'

export const PAGE_SIZE = 10

export interface Player {
  id: string
  name: string
}

export interface MatchRecord {
  /** identifica a partida; é a chave de idempotência do registro */
  id: string
  playerId: string
  playerName: string
  playedAt: string
  score: number
  /** segundos de jogo ativo */
  duration: number
  reason: EndReason
  options: GameOptions
}

export interface RankingEntry extends MatchRecord {
  rank: number
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const toMatchRecord = (result: MatchResult, player: Player): MatchRecord => ({
  id: result.id,
  playerId: player.id,
  playerName: player.name,
  playedAt: result.playedAt,
  score: result.score,
  duration: result.duration,
  reason: result.reason,
  options: result.options,
})
