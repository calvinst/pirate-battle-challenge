import { expect, test } from '@playwright/test'
import { defaultConfig } from '../src/game/simulation/config'
import {
  createInput,
  createWorld,
  stepWorld,
  type Enemy,
  type EnemyKind,
  type WorldState,
} from '../src/game/simulation/world'

const DT = 1 / 60

const makeEnemy = (kind: EnemyKind, x: number, y: number): Enemy => {
  const cfg = defaultConfig[kind]
  return {
    id: 1000,
    kind,
    position: { x, y },
    rotation: 0,
    radius: cfg.radius,
    health: cfg.maxHealth,
    maxHealth: cfg.maxHealth,
    cooldown: kind === 'shooter' ? defaultConfig.shooter.weapon.cooldown : 0,
    detourSide: 0,
  }
}

/** Mundo sem spawn automático, com o jogador parado do outro lado da ilha. */
const worldWithEnemyBehindIsland = (kind: EnemyKind, seed = 1): WorldState => {
  const world = createWorld(defaultConfig, seed)
  world.spawnTimer = Number.POSITIVE_INFINITY
  world.player.position = { x: 1150, y: 360 }
  world.enemies.push(makeEnemy(kind, 130, 360))
  return world
}

test.describe('enemy spawning', () => {
  test('both enemy types appear in every default match', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const world = createWorld(defaultConfig, seed)
      const input = createInput()
      while (world.spawned.chaser + world.spawned.shooter < 2) stepWorld(world, input, DT)
      expect(world.spawned, `seed ${seed}`).toEqual({ chaser: 1, shooter: 1 })
    }
  })

  test('spawn points are clear of the island and far from the player', () => {
    const { island, spawn } = defaultConfig
    for (let seed = 1; seed <= 100; seed++) {
      const world = createWorld(defaultConfig, seed)
      const input = createInput()
      let seen = 0
      while (seen < 3 && world.match.status === 'running') {
        const before = world.spawned.chaser + world.spawned.shooter
        stepWorld(world, input, DT)
        if (world.spawned.chaser + world.spawned.shooter === before) continue
        seen++
        const enemy = world.enemies[world.enemies.length - 1]
        if (!enemy) throw new Error('Spawned enemy not found')
        const toPlayer = Math.hypot(
          enemy.position.x - world.player.position.x,
          enemy.position.y - world.player.position.y,
        )
        const toIsland = Math.hypot(enemy.position.x - island.x, enemy.position.y - island.y)
        // Tolera o deslocamento de um único passo.
        expect(toPlayer, `seed ${seed}`).toBeGreaterThanOrEqual(spawn.minPlayerDistance - 3)
        expect(toIsland - island.radius - enemy.radius, `seed ${seed}`).toBeGreaterThanOrEqual(
          spawn.islandMargin - 3,
        )
      }
    }
  })

  test('falls back to a far, clear point when random sampling keeps failing', () => {
    const config = structuredClone(defaultConfig)
    config.spawn.maxAttempts = 0
    const world = createWorld(config, 3)
    world.spawnTimer = 0
    stepWorld(world, createInput(), DT)
    const enemy = world.enemies[0]
    if (!enemy) throw new Error('No enemy spawned')
    const toPlayer = Math.hypot(
      enemy.position.x - world.player.position.x,
      enemy.position.y - world.player.position.y,
    )
    expect(toPlayer).toBeGreaterThan(config.spawn.minPlayerDistance)
  })
})

test.describe('enemies and the island', () => {
  for (const side of [-1, 1]) {
    test(`a chaser goes around the island (${side < 0 ? 'above' : 'below'} the line)`, () => {
      const world = worldWithEnemyBehindIsland('chaser')
      // Descentra o alvo para escolher o lado do desvio.
      world.player.position.y += side * 12
      const input = createInput()
      for (let i = 0; i < 60 * 30 && world.enemies.length > 0; i++) stepWorld(world, input, DT)
      expect(world.enemies).toHaveLength(0)
      expect(world.player.health).toBeLessThan(world.player.maxHealth)
    })
  }

  test('a chaser lined up exactly behind the island does not get stuck', () => {
    const world = worldWithEnemyBehindIsland('chaser')
    const input = createInput()
    for (let i = 0; i < 60 * 30 && world.enemies.length > 0; i++) stepWorld(world, input, DT)
    expect(world.enemies).toHaveLength(0)
  })

  test('a shooter comes around the island and fires at the player', () => {
    const world = worldWithEnemyBehindIsland('shooter')
    const input = createInput()
    let fired = false
    for (let i = 0; i < 60 * 30 && !fired; i++) {
      stepWorld(world, input, DT)
      fired = world.projectiles.some((p) => p.owner === 'enemy')
    }
    expect(fired).toBe(true)
  })

  test('a shooter does not fire while the island is in the way', () => {
    const world = worldWithEnemyBehindIsland('shooter')
    // Perto o bastante para estar no alcance, mas com a ilha no meio.
    world.player.position = { x: 640 + 110 + 25 + 130, y: 360 }
    world.enemies[0]!.position = { x: 640 - 110 - 25 - 130, y: 360 }
    stepWorld(world, createInput(), DT)
    expect(world.projectiles.filter((p) => p.owner === 'enemy')).toHaveLength(0)
  })
})
