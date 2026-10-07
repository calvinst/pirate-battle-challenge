import { loadMuted, saveMuted } from '../../storage'

const urls = import.meta.glob<string>('../../assets/sounds/*.wav', {
  eager: true,
  query: '?url',
  import: 'default',
})

export type SoundName =
  | 'cannon_broadside'
  | 'cannon_fire_1'
  | 'cannon_fire_2'
  | 'cannon_fire_3'
  | 'cannonball_water_hit_1'
  | 'cannonball_water_hit_2'
  | 'game_complete'
  | 'game_over'
  | 'game_pause'
  | 'game_resume'
  | 'game_start'
  | 'health_low'
  | 'ocean_ambience_loop'
  | 'score_point'
  | 'ship_collision'
  | 'ship_explosion_1'
  | 'ship_explosion_2'
  | 'ship_sailing_loop'
  | 'ship_sinking'
  | 'ship_wood_hit_1'
  | 'ship_wood_hit_2'
  | 'time_warning'
  | 'ui_click'

export interface LoopHandle {
  setVolume: (volume: number) => void
  stop: () => void
}

const NO_LOOP: LoopHandle = { setVolume: () => undefined, stop: () => undefined }

let context: AudioContext | null = null
let master: GainNode | null = null
let muted = loadMuted()
const buffers = new Map<SoundName, AudioBuffer>()
const loading = new Map<SoundName, Promise<void>>()

/** Só deve ser chamado depois de um gesto do usuário, para o navegador liberar o áudio. */
const ensureContext = (): AudioContext | null => {
  if (context) return context
  try {
    context = new AudioContext()
    master = context.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(context.destination)
  } catch {
    context = null
    master = null
  }
  return context
}

const urlOf = (name: SoundName): string => {
  const entry = Object.entries(urls).find(([path]) => path.endsWith(`/${name}.wav`))
  if (!entry) throw new Error(`Missing sound: ${name}`)
  return entry[1]
}

const loadOne = (ctx: AudioContext, name: SoundName): Promise<void> => {
  if (buffers.has(name)) return Promise.resolve()
  let pending = loading.get(name)
  if (!pending) {
    pending = fetch(urlOf(name))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.arrayBuffer()
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        buffers.set(name, buffer)
      })
      .finally(() => {
        loading.delete(name)
      })
    loading.set(name, pending)
  }
  return pending
}

/** O som é opcional: falhas de carregamento são registradas e nunca bloqueiam o jogo. */
export const loadSounds = async (
  names: readonly SoundName[],
  onProgress?: (progress: number) => void,
): Promise<void> => {
  const ctx = ensureContext()
  if (!ctx) {
    onProgress?.(1)
    return
  }
  let done = 0
  await Promise.all(
    names.map(async (name) => {
      try {
        await loadOne(ctx, name)
      } catch (error: unknown) {
        console.warn(`Could not load sound ${name}`, error)
      } finally {
        done++
        onProgress?.(done / names.length)
      }
    }),
  )
}

export const playSound = (name: SoundName, volume = 1, rate = 1): void => {
  const buffer = buffers.get(name)
  if (!context || !master || !buffer || muted) return
  if (context.state === 'suspended') void context.resume()
  const source = context.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = rate
  const gain = context.createGain()
  gain.gain.value = volume
  source.connect(gain).connect(master)
  source.start()
}

export const startLoop = (name: SoundName, volume: number): LoopHandle => {
  const buffer = buffers.get(name)
  if (!context || !master || !buffer) return NO_LOOP
  if (context.state === 'suspended') void context.resume()
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = context.createGain()
  gain.gain.value = volume
  source.connect(gain).connect(master)
  source.start()
  return {
    setVolume: (next) => {
      gain.gain.value = next
    },
    stop: () => {
      try {
        source.stop()
      } catch {
        // já parado
      }
      source.disconnect()
    },
  }
}

export const isMuted = (): boolean => muted

export const setMuted = (value: boolean): void => {
  muted = value
  saveMuted(value)
  if (master) master.gain.value = value ? 0 : 1
}

/** Cliques de interface: o áudio é criado no primeiro gesto e o som de clique é carregado sob demanda. */
export const installUiSounds = (): (() => void) => {
  const unlock = () => {
    void loadSounds(['ui_click'])
  }
  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (target instanceof Element && target.closest('button:not(.touch-btn):not(:disabled)')) {
      playSound('ui_click', 0.6)
    }
  }
  document.addEventListener('pointerdown', unlock, { once: true })
  document.addEventListener('keydown', unlock, { once: true })
  document.addEventListener('click', onClick)
  return () => {
    document.removeEventListener('pointerdown', unlock)
    document.removeEventListener('keydown', unlock)
    document.removeEventListener('click', onClick)
  }
}

export const GAME_SOUNDS: readonly SoundName[] = [
  'cannon_broadside',
  'cannon_fire_1',
  'cannon_fire_2',
  'cannon_fire_3',
  'cannonball_water_hit_1',
  'cannonball_water_hit_2',
  'game_complete',
  'game_over',
  'game_pause',
  'game_resume',
  'game_start',
  'health_low',
  'ocean_ambience_loop',
  'score_point',
  'ship_collision',
  'ship_explosion_1',
  'ship_explosion_2',
  'ship_sailing_loop',
  'ship_sinking',
  'ship_wood_hit_1',
  'ship_wood_hit_2',
  'time_warning',
]
