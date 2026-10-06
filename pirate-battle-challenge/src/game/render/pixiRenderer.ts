import { Application, Graphics, Text } from 'pixi.js'
import type { EnemyKind, WorldState } from '../simulation/world'

export interface Renderer {
  render: (world: WorldState) => void
  destroy: () => void
}

const ENEMY_COLORS: Record<EnemyKind, number> = {
  chaser: 0xd94b3d,
  shooter: 0x9b59b6,
}

const drawHealthBar = (
  g: Graphics,
  x: number,
  y: number,
  ratio: number,
): void => {
  const w = 30
  g.rect(x - w / 2, y, w, 4).fill(0x000000)
  g.rect(x - w / 2, y, w * Math.max(0, ratio), 4).fill(ratio > 0.4 ? 0x4cd137 : 0xe84118)
}

/** Apenas lê o estado da simulação e o desenha; nunca o modifica. */
export const createPixiRenderer = async (
  host: HTMLElement,
  world: WorldState,
): Promise<Renderer> => {
  const app = new Application()
  await app.init({
    width: world.width,
    height: world.height,
    background: '#0b4a6f',
    antialias: true,
    autoStart: false,
  })
  host.appendChild(app.canvas)

  const { island } = world
  app.stage.addChild(
    new Graphics()
      .circle(island.position.x, island.position.y, island.radius + 10)
      .fill(0xe8d59a)
      .circle(island.position.x, island.position.y, island.radius)
      .fill(0x4f8a3c),
  )

  const enemyShips = new Map<number, Graphics>()
  const projectilesGfx = new Graphics()
  const player = new Graphics().poly([18, 0, -12, -10, -12, 10]).fill(0xf2e2b6)
  const bars = new Graphics()
  const hud = new Text({
    text: '',
    style: { fill: 0xffffff, fontSize: 20, fontFamily: 'monospace' },
  })
  hud.position.set(12, 8)
  const banner = new Text({
    text: '',
    style: { fill: 0xffffff, fontSize: 48, fontFamily: 'monospace' },
  })
  banner.anchor.set(0.5)
  banner.position.set(world.width / 2, world.height / 2)
  app.stage.addChild(projectilesGfx, player, bars, hud, banner)

  return {
    render: (state) => {
      const { player: ship, enemies, projectiles, match } = state

      player.position.set(ship.position.x, ship.position.y)
      player.rotation = ship.rotation
      player.visible = ship.health > 0

      const seen = new Set<number>()
      for (const enemy of enemies) {
        seen.add(enemy.id)
        let gfx = enemyShips.get(enemy.id)
        if (!gfx) {
          gfx = new Graphics().poly([16, 0, -12, -10, -12, 10]).fill(ENEMY_COLORS[enemy.kind])
          app.stage.addChildAt(gfx, app.stage.getChildIndex(projectilesGfx))
          enemyShips.set(enemy.id, gfx)
        }
        gfx.position.set(enemy.position.x, enemy.position.y)
        gfx.rotation = enemy.rotation
      }
      for (const [id, gfx] of enemyShips) {
        if (seen.has(id)) continue
        gfx.destroy()
        enemyShips.delete(id)
      }

      projectilesGfx.clear()
      for (const p of projectiles) {
        projectilesGfx.circle(p.position.x, p.position.y, p.radius).fill(p.owner === 'player' ? 0x222222 : 0xff7675)
      }

      bars.clear()
      drawHealthBar(bars, ship.position.x, ship.position.y - 26, ship.health / ship.maxHealth)
      for (const enemy of enemies) {
        drawHealthBar(bars, enemy.position.x, enemy.position.y - 24, enemy.health / enemy.maxHealth)
      }

      hud.text = `Score ${match.score}   Time ${Math.ceil(match.timeRemaining)}s`
      banner.text =
        match.status === 'over'
          ? `${match.endReason === 'death' ? 'Ship destroyed' : "Time's up"} - ${match.score} pts`
          : ''

      app.render()
    },
    destroy: () => app.destroy(true, { children: true }),
  }
}
