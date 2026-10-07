import { Application, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js'
import { PLAYER_TARGET_ID, type WorldState } from '../simulation/world'
import type { GameTextures, ShipSkin } from './assets'

export interface Renderer {
  render: (world: WorldState) => void
  destroy: () => void
}

const SHIP_SCALE = 0.55
const HIT_FLASH = 0.12
// Os sprites dos navios apontam para cima; a simulação usa 0 = direita.
const SPRITE_FORWARD_OFFSET = Math.PI / 2

const damageLevel = (ratio: number): number =>
  ratio > 0.75 ? 0 : ratio > 0.5 ? 1 : ratio > 0.25 ? 2 : 3

interface ShipView {
  root: Container
  hull: Sprite
  fire: Sprite
  skin: ShipSkin
  level: number
}

const createShipView = (textures: GameTextures, skin: ShipSkin): ShipView => {
  const hull = new Sprite(textures.ships[skin][0])
  hull.anchor.set(0.5)
  hull.scale.set(SHIP_SCALE)
  const fire = new Sprite(textures.fire[0])
  fire.anchor.set(0.5)
  fire.position.set(0, 6)
  fire.visible = false
  const root = new Container()
  root.addChild(hull, fire)
  return { root, hull, fire, skin, level: 0 }
}

const updateShipView = (
  view: ShipView,
  textures: GameTextures,
  x: number,
  y: number,
  rotation: number,
  ratio: number,
  time: number,
  lastHit: number | undefined,
): void => {
  view.root.position.set(x, y)
  view.root.rotation = rotation + SPRITE_FORWARD_OFFSET

  const level = damageLevel(ratio)
  if (level !== view.level) {
    view.level = level
    view.hull.texture = textures.ships[view.skin][level] ?? view.hull.texture
  }

  view.fire.visible = ratio < 0.5
  if (view.fire.visible) {
    view.fire.texture = textures.fire[Math.floor(time * 12) % textures.fire.length] ?? view.fire.texture
  }
  view.hull.tint = lastHit !== undefined && time - lastHit < HIT_FLASH ? 0xff7a7a : 0xffffff
}

interface Effect {
  sprite: Sprite
  start: number
  duration: number
  frames: Texture[]
  scale: number
}

const drawHealthBar = (g: Graphics, x: number, y: number, ratio: number): void => {
  const w = 34
  g.rect(x - w / 2, y, w, 5).fill(0x000000)
  g.rect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, ratio), 3).fill(
    ratio > 0.4 ? 0x4cd137 : 0xe84118,
  )
}

/** Apenas lê o estado da simulação e o desenha; nunca o modifica. */
export const createPixiRenderer = async (
  host: HTMLElement,
  world: WorldState,
  textures: GameTextures,
  signal: AbortSignal,
): Promise<Renderer | null> => {
  const app = new Application()
  await app.init({
    width: world.width,
    height: world.height,
    background: '#0b4a6f',
    antialias: true,
    autoStart: false,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
  })
  // O efeito pode ter sido desmontado (Strict Mode) durante o init assíncrono.
  if (signal.aborted) {
    app.destroy(true, { children: true })
    return null
  }
  host.appendChild(app.canvas)

  const water = new TilingSprite({
    texture: textures.water,
    width: world.width,
    height: world.height,
  })

  const { island } = world
  const islandSprite = new Sprite(textures.island)
  islandSprite.anchor.set(0.5)
  islandSprite.position.set(island.position.x, island.position.y)
  const islandSize = island.radius * 2 + 24
  islandSprite.width = islandSize
  islandSprite.height = islandSize

  const projectileLayer = new Container()
  const shipLayer = new Container()
  const effectLayer = new Container()
  const bars = new Graphics()
  app.stage.addChild(water, islandSprite, projectileLayer, shipLayer, effectLayer, bars)

  let destroyed = false
  let lastEventId = 0
  const projectileSprites: Sprite[] = []
  const playerView = createShipView(textures, 'player')
  shipLayer.addChild(playerView.root)
  const enemyViews = new Map<number, ShipView>()
  const lastHit = new Map<number, number>()
  const effects: Effect[] = []

  const addEffect = (
    frames: Texture[],
    x: number,
    y: number,
    start: number,
    duration: number,
    scale: number,
  ): void => {
    const first = frames[0]
    if (!first) return
    const sprite = new Sprite(first)
    sprite.anchor.set(0.5)
    sprite.position.set(x, y)
    effectLayer.addChild(sprite)
    effects.push({ sprite, start, duration, frames, scale })
  }

  const processEvents = (state: WorldState): void => {
    const { explosion } = textures
    const small = explosion.slice(0, 1)
    for (const event of state.events) {
      if (event.id <= lastEventId) continue
      lastEventId = event.id
      if (event.type === 'shot') {
        addEffect(small, event.x, event.y, event.time, 0.12, 0.35)
      } else if (event.type === 'hit' || event.type === 'collision') {
        if (event.targetId !== undefined) lastHit.set(event.targetId, event.time)
        addEffect(small, event.x, event.y, event.time, 0.25, 0.7)
      } else if (event.type === 'explosion') {
        addEffect(explosion, event.x, event.y, event.time, 0.6, 1.2)
      }
    }
  }

  const updateEffects = (time: number): void => {
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i]
      if (!effect) continue
      const progress = (time - effect.start) / effect.duration
      if (progress >= 1) {
        effect.sprite.destroy()
        effects.splice(i, 1)
        continue
      }
      const frame = effect.frames[Math.floor(progress * effect.frames.length)]
      if (frame) effect.sprite.texture = frame
      effect.sprite.alpha = 1 - progress * progress
      effect.sprite.scale.set(effect.scale * (0.6 + 0.6 * progress))
    }
  }

  return {
    render: (state) => {
      const { player, enemies, projectiles, time } = state

      water.tilePosition.set(time * 10, time * 5)
      processEvents(state)

      playerView.root.visible = player.health > 0
      updateShipView(
        playerView,
        textures,
        player.position.x,
        player.position.y,
        player.rotation,
        player.health / player.maxHealth,
        time,
        lastHit.get(PLAYER_TARGET_ID),
      )

      const seen = new Set<number>()
      for (const enemy of enemies) {
        seen.add(enemy.id)
        let view = enemyViews.get(enemy.id)
        if (!view) {
          view = createShipView(textures, enemy.kind)
          shipLayer.addChild(view.root)
          enemyViews.set(enemy.id, view)
        }
        updateShipView(
          view,
          textures,
          enemy.position.x,
          enemy.position.y,
          enemy.rotation,
          enemy.health / enemy.maxHealth,
          time,
          lastHit.get(enemy.id),
        )
      }
      for (const [id, view] of enemyViews) {
        if (seen.has(id)) continue
        view.root.destroy({ children: true })
        enemyViews.delete(id)
        lastHit.delete(id)
      }

      projectiles.forEach((p, i) => {
        let sprite = projectileSprites[i]
        if (!sprite) {
          sprite = new Sprite(textures.cannonBall)
          sprite.anchor.set(0.5)
          projectileLayer.addChild(sprite)
          projectileSprites.push(sprite)
        }
        sprite.visible = true
        sprite.position.set(p.position.x, p.position.y)
        sprite.tint = p.owner === 'player' ? 0xffffff : 0xff9a9a
      })
      for (let i = projectiles.length; i < projectileSprites.length; i++) {
        const sprite = projectileSprites[i]
        if (sprite) sprite.visible = false
      }

      updateEffects(time)

      bars.clear()
      if (player.health > 0) {
        drawHealthBar(bars, player.position.x, player.position.y - player.radius - 16, player.health / player.maxHealth)
      }
      for (const enemy of enemies) {
        drawHealthBar(bars, enemy.position.x, enemy.position.y - enemy.radius - 16, enemy.health / enemy.maxHealth)
      }

      app.render()
    },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      enemyViews.clear()
      effects.length = 0
      // As texturas são compartilhadas entre partidas e não pertencem a esta instância.
      app.destroy(true, { children: true })
    },
  }
}
