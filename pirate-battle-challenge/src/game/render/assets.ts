import { Assets, Rectangle, Texture } from 'pixi.js'

export type ShipSkin = 'player' | 'chaser' | 'shooter'

export interface GameTextures {
  /** por skin; o índice é o nível de dano (0 = intacto .. 3 = destruído) */
  ships: Record<ShipSkin, Texture[]>
  explosion: Texture[]
  fire: Texture[]
  cannonBall: Texture
  water: Texture
  /** ilha 256x256 recortada do tilesheet */
  island: Texture
}

const shipUrls = import.meta.glob<string>('../../assets/png/default/ships/ship_*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})
const effectUrls = import.meta.glob<string>('../../assets/png/default/effects/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})
const tileUrls = import.meta.glob<string>('../../assets/png/default/tiles/tile_73.png', {
  eager: true,
  query: '?url',
  import: 'default',
})
const partUrls = import.meta.glob<string>('../../assets/png/default/ship_parts/cannon_ball.png', {
  eager: true,
  query: '?url',
  import: 'default',
})
const sheetUrls = import.meta.glob<string>('../../assets/tilesheet/tiles_sheet.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

const urlOf = (urls: Record<string, string>, file: string): string => {
  const entry = Object.entries(urls).find(([path]) => path.endsWith(`/${file}`))
  if (!entry) throw new Error(`Missing asset: ${file}`)
  return entry[1]
}

// Os navios seguem a ordem do atlas: 6 cores por nível de dano (1-6, 7-12, 13-18, 19-24).
const SKIN_COLOR: Record<ShipSkin, number> = { player: 1, shooter: 2, chaser: 3 }
const DAMAGE_LEVELS = 4
const COLORS_PER_LEVEL = 6

const loadTextures = async (onProgress: (progress: number) => void): Promise<GameTextures> => {
  const shipFile = (skin: ShipSkin, level: number) =>
    `ship_${level * COLORS_PER_LEVEL + SKIN_COLOR[skin]}.png`

  const skins = Object.keys(SKIN_COLOR) as ShipSkin[]
  const shipFiles = skins.flatMap((skin) =>
    Array.from({ length: DAMAGE_LEVELS }, (_, level) => shipFile(skin, level)),
  )
  const explosionFiles = ['explosion_3.png', 'explosion_2.png', 'explosion_1.png']
  const fireFiles = ['fire_1.png', 'fire_2.png']

  const urls = {
    ships: shipFiles.map((f) => urlOf(shipUrls, f)),
    explosion: explosionFiles.map((f) => urlOf(effectUrls, f)),
    fire: fireFiles.map((f) => urlOf(effectUrls, f)),
    cannonBall: urlOf(partUrls, 'cannon_ball.png'),
    water: urlOf(tileUrls, 'tile_73.png'),
    sheet: urlOf(sheetUrls, 'tiles_sheet.png'),
  }
  const all = [
    ...new Set([
      ...urls.ships,
      ...urls.explosion,
      ...urls.fire,
      urls.cannonBall,
      urls.water,
      urls.sheet,
    ]),
  ]

  const loaded = await Assets.load<Texture>(all, onProgress)

  const ships = {} as Record<ShipSkin, Texture[]>
  skins.forEach((skin, s) => {
    ships[skin] = Array.from({ length: DAMAGE_LEVELS }, (_, level) => {
      const texture = loaded[urls.ships[s * DAMAGE_LEVELS + level] ?? '']
      if (!texture) throw new Error(`Failed to load ${shipFile(skin, level)}`)
      return texture
    })
  })

  const pick = (url: string): Texture => {
    const texture = loaded[url]
    if (!texture) throw new Error(`Failed to load ${url}`)
    return texture
  }

  return {
    ships,
    explosion: urls.explosion.map(pick),
    fire: urls.fire.map(pick),
    cannonBall: pick(urls.cannonBall),
    water: pick(urls.water),
    island: new Texture({ source: pick(urls.sheet).source, frame: new Rectangle(320, 0, 256, 256) }),
  }
}

let pending: Promise<GameTextures> | null = null

/** Carrega uma vez e reutiliza entre partidas; falhas não ficam em cache. */
export const loadGameTextures = (
  onProgress: (progress: number) => void,
): Promise<GameTextures> => {
  pending ??= loadTextures(onProgress).catch((error: unknown) => {
    pending = null
    throw error
  })
  return pending
}
