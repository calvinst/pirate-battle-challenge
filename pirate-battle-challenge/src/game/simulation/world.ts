import { defaultConfig, type GameConfig, type WeaponConfig } from './config'

export interface Vec2 {
  x: number
  y: number
}

export interface ShipState {
  position: Vec2
  velocity: Vec2
  /** radianos; 0 aponta para a direita */
  rotation: number
  radius: number
  health: number
  maxHealth: number
  /** segundos até poder disparar novamente */
  frontCooldown: number
  sideCooldown: number
}

export type EnemyKind = 'chaser' | 'shooter'

export interface Enemy {
  id: number
  kind: EnemyKind
  position: Vec2
  rotation: number
  radius: number
  health: number
  maxHealth: number
  cooldown: number
}

export interface Island {
  position: Vec2
  radius: number
}

export interface Projectile {
  owner: 'player' | 'enemy'
  position: Vec2
  velocity: Vec2
  radius: number
  damage: number
  /** segundos restantes de vida */
  ttl: number
}

export interface InputState {
  /** -1 (ré) .. 1 (frente) */
  throttle: number
  /** -1 (esquerda) .. 1 (direita) */
  turn: number
  fireFront: boolean
  fireLeft: boolean
  fireRight: boolean
}

export type EndReason = 'time' | 'death'

export interface MatchState {
  status: 'running' | 'over'
  endReason: EndReason | null
  score: number
  /** segundos de jogo ativo restantes */
  timeRemaining: number
  /** segundos de jogo ativo decorridos */
  elapsed: number
}

export interface WorldState {
  readonly width: number
  readonly height: number
  /** snapshot da configuração vigente ao iniciar a partida */
  readonly config: GameConfig
  /** tempo simulado acumulado, em segundos */
  time: number
  player: ShipState
  island: Island
  enemies: Enemy[]
  projectiles: Projectile[]
  match: MatchState
  spawnTimer: number
  nextEntityId: number
  /** eventos recentes para a renderização; o renderer só lê */
  events: SimEvent[]
  nextEventId: number
  random: () => number
}

/** Id usado em `SimEvent.targetId` para o navio do jogador. */
export const PLAYER_TARGET_ID = 0

export interface SimEvent {
  id: number
  /** `world.time` em que ocorreu */
  time: number
  type: 'shot' | 'hit' | 'explosion'
  x: number
  y: number
  /** navio atingido, em `hit` */
  targetId?: number
}

const EVENT_TTL = 2

const emit = (
  world: WorldState,
  type: SimEvent['type'],
  at: Vec2,
  targetId?: number,
): void => {
  world.events.push({ id: world.nextEventId++, time: world.time, type, x: at.x, y: at.y, targetId })
  while (world.events[0] && world.time - world.events[0].time > EVENT_TTL) world.events.shift()
}

export const createInput = (): InputState => ({
  throttle: 0,
  turn: 0,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
})

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const createWorld = (
  config: GameConfig = defaultConfig,
  seed: number = Date.now(),
): WorldState => {
  const snapshot = structuredClone(config)
  const { arena, island, player } = snapshot
  return {
    width: arena.width,
    height: arena.height,
    config: snapshot,
    time: 0,
    player: {
      position: { x: arena.width * 0.2, y: arena.height * 0.5 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      radius: player.radius,
      health: player.maxHealth,
      maxHealth: player.maxHealth,
      frontCooldown: 0,
      sideCooldown: 0,
    },
    island: { position: { x: island.x, y: island.y }, radius: island.radius },
    enemies: [],
    projectiles: [],
    match: {
      status: 'running',
      endReason: null,
      score: 0,
      timeRemaining: snapshot.matchDuration,
      elapsed: 0,
    },
    spawnTimer: snapshot.spawn.interval,
    nextEntityId: 1,
    events: [],
    nextEventId: 1,
    random: mulberry32(seed),
  }
}

const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)

const wrapAngle = (angle: number): number => {
  let a = angle
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

const turnToward = (rotation: number, target: number, maxStep: number): number => {
  const diff = wrapAngle(target - rotation)
  return rotation + Math.max(-maxStep, Math.min(maxStep, diff))
}

const spawnProjectile = (
  world: WorldState,
  owner: Projectile['owner'],
  weapon: WeaponConfig,
  origin: Vec2,
  angle: number,
  inherited: Vec2,
): void => {
  emit(world, 'shot', origin)
  world.projectiles.push({
    owner,
    position: { x: origin.x, y: origin.y },
    velocity: {
      x: Math.cos(angle) * weapon.speed + inherited.x,
      y: Math.sin(angle) * weapon.speed + inherited.y,
    },
    radius: weapon.radius,
    damage: weapon.damage,
    ttl: weapon.ttl,
  })
}

const fireFront = (world: WorldState): void => {
  const { player, config } = world
  const reach = player.radius + 6
  spawnProjectile(
    world,
    'player',
    config.player.frontWeapon,
    {
      x: player.position.x + Math.cos(player.rotation) * reach,
      y: player.position.y + Math.sin(player.rotation) * reach,
    },
    player.rotation,
    player.velocity,
  )
}

/** `side`: -1 = bombordo (esquerda), 1 = boreste (direita). */
const fireBroadside = (world: WorldState, side: -1 | 1): void => {
  const { player, config } = world
  const { sideCannons, sideCannonSpacing, sideWeapon } = config.player
  const fx = Math.cos(player.rotation)
  const fy = Math.sin(player.rotation)
  const angle = player.rotation + (side * Math.PI) / 2
  const nx = Math.cos(angle)
  const ny = Math.sin(angle)
  for (let i = 0; i < sideCannons; i++) {
    const offset = (i - (sideCannons - 1) / 2) * sideCannonSpacing
    spawnProjectile(
      world,
      'player',
      sideWeapon,
      {
        x: player.position.x + fx * offset + nx * player.radius,
        y: player.position.y + fy * offset + ny * player.radius,
      },
      angle,
      player.velocity,
    )
  }
}

const pushOutOfIsland = (world: WorldState, position: Vec2, radius: number): boolean => {
  const { island } = world
  const dx = position.x - island.position.x
  const dy = position.y - island.position.y
  const dist = Math.hypot(dx, dy)
  const minDist = island.radius + radius
  if (dist >= minDist) return false
  const nx = dist > 0 ? dx / dist : 1
  const ny = dist > 0 ? dy / dist : 0
  position.x = island.position.x + nx * minDist
  position.y = island.position.y + ny * minDist
  return true
}

const clampToArena = (world: WorldState, position: Vec2, radius: number): Vec2 => {
  const x = Math.max(radius, Math.min(world.width - radius, position.x))
  const y = Math.max(radius, Math.min(world.height - radius, position.y))
  const hit = { x: x !== position.x, y: y !== position.y }
  position.x = x
  position.y = y
  return { x: hit.x ? 1 : 0, y: hit.y ? 1 : 0 }
}

const stepPlayer = (world: WorldState, input: InputState, dt: number): void => {
  const { player, config } = world
  const cfg = config.player

  player.rotation += input.turn * cfg.turnRate * dt

  const dirX = Math.cos(player.rotation)
  const dirY = Math.sin(player.rotation)
  let speed = player.velocity.x * dirX + player.velocity.y * dirY
  speed += input.throttle * cfg.acceleration * dt
  speed -= speed * cfg.drag * dt
  speed = Math.max(-cfg.reverseSpeed, Math.min(cfg.maxSpeed, speed))
  player.velocity.x = dirX * speed
  player.velocity.y = dirY * speed

  player.position.x += player.velocity.x * dt
  player.position.y += player.velocity.y * dt

  if (pushOutOfIsland(world, player.position, player.radius)) {
    player.velocity.x = 0
    player.velocity.y = 0
  }
  const hitWall = clampToArena(world, player.position, player.radius)
  if (hitWall.x) player.velocity.x = 0
  if (hitWall.y) player.velocity.y = 0

  player.frontCooldown = Math.max(0, player.frontCooldown - dt)
  player.sideCooldown = Math.max(0, player.sideCooldown - dt)

  if (input.fireFront && player.frontCooldown === 0) {
    fireFront(world)
    player.frontCooldown = cfg.frontWeapon.cooldown
  }
  if ((input.fireLeft || input.fireRight) && player.sideCooldown === 0) {
    if (input.fireLeft) fireBroadside(world, -1)
    if (input.fireRight) fireBroadside(world, 1)
    player.sideCooldown = cfg.sideWeapon.cooldown
  }
}

const findSpawnPoint = (world: WorldState, radius: number): Vec2 => {
  const { spawn } = world.config
  const { player, island } = world
  let best: Vec2 | null = null
  let bestDist = -1
  for (let i = 0; i < spawn.maxAttempts; i++) {
    const p = {
      x: radius + world.random() * (world.width - 2 * radius),
      y: radius + world.random() * (world.height - 2 * radius),
    }
    if (distance(p, island.position) - island.radius - radius < spawn.islandMargin) continue
    const dPlayer = distance(p, player.position)
    if (dPlayer >= spawn.minPlayerDistance) return p
    if (dPlayer > bestDist) {
      best = p
      bestDist = dPlayer
    }
  }
  // Sem candidato válido: usa o canto livre mais distante do jogador.
  return (
    best ??
    [
      { x: radius, y: radius },
      { x: world.width - radius, y: radius },
      { x: radius, y: world.height - radius },
      { x: world.width - radius, y: world.height - radius },
    ].reduce((a, b) =>
      distance(a, player.position) >= distance(b, player.position) ? a : b,
    )
  )
}

const spawnEnemy = (world: WorldState): void => {
  const { config } = world
  const kind: EnemyKind = world.random() < config.spawn.chaserChance ? 'chaser' : 'shooter'
  const cfg = config[kind]
  const position = findSpawnPoint(world, cfg.radius)
  world.enemies.push({
    id: world.nextEntityId++,
    kind,
    position,
    rotation: Math.atan2(world.player.position.y - position.y, world.player.position.x - position.x),
    radius: cfg.radius,
    health: cfg.maxHealth,
    maxHealth: cfg.maxHealth,
    cooldown: kind === 'shooter' ? config.shooter.weapon.cooldown : 0,
  })
}

const stepSpawner = (world: WorldState, dt: number): void => {
  world.spawnTimer -= dt
  while (world.spawnTimer <= 0) {
    spawnEnemy(world)
    world.spawnTimer += world.config.spawn.interval
  }
}

const stepEnemies = (world: WorldState, dt: number): void => {
  const { player, config } = world
  const survivors: Enemy[] = []

  for (const enemy of world.enemies) {
    const toPlayer = Math.atan2(
      player.position.y - enemy.position.y,
      player.position.x - enemy.position.x,
    )
    const dist = distance(enemy.position, player.position)
    enemy.cooldown = Math.max(0, enemy.cooldown - dt)

    let speed: number
    if (enemy.kind === 'chaser') {
      const cfg = config.chaser
      enemy.rotation = turnToward(enemy.rotation, toPlayer, cfg.turnRate * dt)
      speed = cfg.speed
    } else {
      const cfg = config.shooter
      enemy.rotation = turnToward(enemy.rotation, toPlayer, cfg.turnRate * dt)
      speed = dist > cfg.preferredDistance ? cfg.speed : 0

      const aimError = Math.abs(wrapAngle(toPlayer - enemy.rotation))
      if (dist <= cfg.attackRange && aimError <= cfg.aimTolerance && enemy.cooldown === 0) {
        const reach = enemy.radius + 6
        spawnProjectile(
          world,
          'enemy',
          cfg.weapon,
          {
            x: enemy.position.x + Math.cos(enemy.rotation) * reach,
            y: enemy.position.y + Math.sin(enemy.rotation) * reach,
          },
          enemy.rotation,
          { x: 0, y: 0 },
        )
        enemy.cooldown = cfg.weapon.cooldown
      }
    }

    enemy.position.x += Math.cos(enemy.rotation) * speed * dt
    enemy.position.y += Math.sin(enemy.rotation) * speed * dt
    pushOutOfIsland(world, enemy.position, enemy.radius)
    clampToArena(world, enemy.position, enemy.radius)

    // Chaser explode no impacto; não pontua.
    if (enemy.kind === 'chaser' && distance(enemy.position, player.position) < enemy.radius + player.radius) {
      player.health -= config.chaser.contactDamage
      emit(world, 'hit', player.position, PLAYER_TARGET_ID)
      emit(world, 'explosion', enemy.position)
      continue
    }
    survivors.push(enemy)
  }

  world.enemies = survivors
}

const stepProjectiles = (world: WorldState, dt: number): void => {
  const { island, player } = world
  const kept: Projectile[] = []

  for (const p of world.projectiles) {
    p.ttl -= dt
    if (p.ttl <= 0) continue
    p.position.x += p.velocity.x * dt
    p.position.y += p.velocity.y * dt

    if (
      p.position.x < 0 ||
      p.position.y < 0 ||
      p.position.x > world.width ||
      p.position.y > world.height
    ) {
      continue
    }
    if (distance(p.position, island.position) < island.radius + p.radius) continue

    if (p.owner === 'player') {
      const target = world.enemies.find(
        (e) => e.health > 0 && distance(p.position, e.position) < e.radius + p.radius,
      )
      if (target) {
        target.health -= p.damage
        emit(world, 'hit', p.position, target.id)
        continue
      }
    } else if (distance(p.position, player.position) < player.radius + p.radius) {
      player.health -= p.damage
      emit(world, 'hit', p.position, PLAYER_TARGET_ID)
      continue
    }
    kept.push(p)
  }

  world.projectiles = kept
}

const scoreDestroyedEnemies = (world: WorldState): void => {
  const alive = world.enemies.filter((e) => e.health > 0)
  for (const e of world.enemies) if (e.health <= 0) emit(world, 'explosion', e.position)
  world.match.score += world.enemies.length - alive.length
  world.enemies = alive
}

const endMatch = (world: WorldState, reason: EndReason): void => {
  world.match.status = 'over'
  world.match.endReason = reason
  world.player.velocity.x = 0
  world.player.velocity.y = 0
}

/** Avança a simulação em `dt` segundos. Não conhece PixiJS nem DOM. */
export const stepWorld = (world: WorldState, input: InputState, dt: number): void => {
  const { match, player } = world
  if (match.status === 'over') return

  world.time += dt
  match.elapsed += dt
  match.timeRemaining = Math.max(0, match.timeRemaining - dt)

  stepPlayer(world, input, dt)
  stepSpawner(world, dt)
  stepEnemies(world, dt)
  stepProjectiles(world, dt)
  scoreDestroyedEnemies(world)

  if (player.health <= 0) {
    player.health = 0
    emit(world, 'explosion', player.position)
    endMatch(world, 'death')
  } else if (match.timeRemaining <= 0) {
    endMatch(world, 'time')
  }
}
