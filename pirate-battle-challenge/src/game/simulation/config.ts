export interface WeaponConfig {
  damage: number
  /** px/s */
  speed: number
  /** segundos de vida do projétil */
  ttl: number
  radius: number
  /** segundos entre disparos */
  cooldown: number
}

export interface GameConfig {
  /** segundos de jogo ativo (60..180) */
  matchDuration: number
  arena: { width: number; height: number }
  island: { x: number; y: number; radius: number }
  spawn: {
    /** segundos entre spawns (MIN_SPAWN_INTERVAL..MAX_SPAWN_INTERVAL) */
    interval: number
    /** probabilidade 0..1 de o inimigo ser um Chaser */
    chaserChance: number
    minPlayerDistance: number
    islandMargin: number
    maxAttempts: number
  }
  player: {
    maxHealth: number
    radius: number
    maxSpeed: number
    reverseSpeed: number
    acceleration: number
    drag: number
    turnRate: number
    frontWeapon: WeaponConfig
    sideWeapon: WeaponConfig
    sideCannons: number
    sideCannonSpacing: number
  }
  chaser: {
    maxHealth: number
    radius: number
    speed: number
    turnRate: number
    contactDamage: number
  }
  shooter: {
    maxHealth: number
    radius: number
    speed: number
    turnRate: number
    /** distância em que para de se aproximar */
    preferredDistance: number
    attackRange: number
    /** erro angular máximo (rad) para disparar */
    aimTolerance: number
    weapon: WeaponConfig
  }
}

export const MIN_MATCH_DURATION = 60
export const MAX_MATCH_DURATION = 180
export const MIN_SPAWN_INTERVAL = 0.5
export const MAX_SPAWN_INTERVAL = 30

export const defaultConfig: GameConfig = {
  matchDuration: 90,
  arena: { width: 1280, height: 720 },
  island: { x: 640, y: 360, radius: 110 },
  spawn: {
    interval: 3,
    chaserChance: 0.5,
    minPlayerDistance: 300,
    islandMargin: 20,
    maxAttempts: 20,
  },
  player: {
    maxHealth: 100,
    radius: 14,
    maxSpeed: 180,
    reverseSpeed: 60,
    acceleration: 120,
    drag: 0.8,
    turnRate: 2,
    frontWeapon: { damage: 10, speed: 420, ttl: 1.5, radius: 4, cooldown: 0.4 },
    sideWeapon: { damage: 8, speed: 420, ttl: 1.5, radius: 4, cooldown: 1 },
    sideCannons: 3,
    sideCannonSpacing: 12,
  },
  chaser: {
    maxHealth: 20,
    radius: 12,
    speed: 110,
    turnRate: 1.6,
    contactDamage: 25,
  },
  shooter: {
    maxHealth: 40,
    radius: 14,
    speed: 70,
    turnRate: 1.2,
    preferredDistance: 260,
    attackRange: 380,
    aimTolerance: 0.3,
    weapon: { damage: 10, speed: 300, ttl: 1.8, radius: 4, cooldown: 1.8 },
  },
}
