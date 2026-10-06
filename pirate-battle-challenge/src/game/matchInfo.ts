import type { GameOptions } from './simulation/config'
import type { EndReason, WorldState } from './simulation/world'

/** Dados do HUD; só é emitido quando algum valor muda. */
export interface HudSnapshot {
  score: number
  /** segundos restantes, arredondado para cima */
  timeRemaining: number
  health: number
  maxHealth: number
}

export interface MatchResult {
  /** identifica a partida; chave de idempotência do registro */
  id: string
  score: number
  /** segundos de jogo ativo */
  duration: number
  reason: EndReason
  playedAt: string
  options: GameOptions
}

export const createHudSnapshot = ({ match, player }: WorldState): HudSnapshot => ({
  score: match.score,
  timeRemaining: Math.ceil(match.timeRemaining),
  health: Math.ceil(player.health),
  maxHealth: player.maxHealth,
})

export const createMatchResult = (world: WorldState): MatchResult => ({
  id: crypto.randomUUID(),
  score: world.match.score,
  duration: world.match.elapsed,
  reason: world.match.endReason ?? 'time',
  playedAt: new Date().toISOString(),
  options: {
    matchDuration: world.config.matchDuration,
    spawnInterval: world.config.spawn.interval,
  },
})
