import type { WorldState } from './simulation/world'

/** Instrumentação de testes E2E; só ativa com `?e2e` na URL. */
export interface GameTestApi {
  /** Avança a simulação em passos fixos, com os inputs reais, e renderiza. */
  advance: (seconds: number) => void
  snapshot: () => GameTestSnapshot
}

export interface GameTestSnapshot {
  time: number
  match: WorldState['match']
  player: { x: number; y: number; rotation: number; radius: number; health: number }
  island: { x: number; y: number; radius: number }
  arena: { width: number; height: number }
  enemies: { id: number; kind: string; x: number; y: number; health: number }[]
  projectiles: { owner: string; x: number; y: number; vx: number; vy: number }[]
}

declare global {
  interface Window {
    __game?: GameTestApi
  }
}

const params = new URLSearchParams(window.location.search)

export const isE2E = params.has('e2e')

/** Semente fixa para partidas reproduzíveis nos testes. */
export const e2eSeed = (): number | undefined => {
  const seed = Number(params.get('seed'))
  return params.has('seed') && Number.isFinite(seed) ? seed : undefined
}

export const createSnapshot = (world: WorldState): GameTestSnapshot => ({
  time: world.time,
  match: { ...world.match },
  player: {
    x: world.player.position.x,
    y: world.player.position.y,
    rotation: world.player.rotation,
    radius: world.player.radius,
    health: world.player.health,
  },
  island: {
    x: world.island.position.x,
    y: world.island.position.y,
    radius: world.island.radius,
  },
  arena: { width: world.width, height: world.height },
  enemies: world.enemies.map((e) => ({
    id: e.id,
    kind: e.kind,
    x: e.position.x,
    y: e.position.y,
    health: e.health,
  })),
  projectiles: world.projectiles.map((p) => ({
    owner: p.owner,
    x: p.position.x,
    y: p.position.y,
    vx: p.velocity.x,
    vy: p.velocity.y,
  })),
})
