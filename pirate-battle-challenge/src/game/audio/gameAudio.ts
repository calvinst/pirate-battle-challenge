import type { WorldState } from '../simulation/world'
import { playSound, startLoop, type SoundName } from './audioEngine'

export interface GameAudio {
  /** Toca os sons dos eventos novos da simulação; só lê o mundo. */
  update: (world: WorldState) => void
  setPaused: (paused: boolean) => void
  destroy: () => void
}

const FIRE: SoundName[] = ['cannon_fire_1', 'cannon_fire_2', 'cannon_fire_3']
const HIT: SoundName[] = ['ship_wood_hit_1', 'ship_wood_hit_2']
const EXPLOSION: SoundName[] = ['ship_explosion_1', 'ship_explosion_2']
const SPLASH: SoundName[] = ['cannonball_water_hit_1', 'cannonball_water_hit_2']

const OCEAN_VOLUME = 0.25
const SAILING_VOLUME = 0.5
const LOW_HEALTH_RATIO = 0.25
const TIME_WARNING_SECONDS = 10

const pick = (names: SoundName[]): SoundName =>
  names[Math.floor(Math.random() * names.length)] ?? names[0] ?? 'ui_click'

export const createGameAudio = (): GameAudio => {
  playSound('game_start', 0.8)
  const ocean = startLoop('ocean_ambience_loop', OCEAN_VOLUME)
  const sailing = startLoop('ship_sailing_loop', 0)

  let lastEventId = 0
  let lastBroadsideTime = -1
  let lastScore = 0
  let lowHealthPlayed = false
  let timeWarned = false
  let endPlayed = false
  let paused = false

  return {
    update: (world) => {
      for (const event of world.events) {
        if (event.id <= lastEventId) continue
        lastEventId = event.id
        switch (event.type) {
          case 'shot':
            if (event.weapon === 'broadside') {
              // Uma salva gera um evento por canhão; o som é um só.
              if (event.time !== lastBroadsideTime) {
                lastBroadsideTime = event.time
                playSound('cannon_broadside', 0.7)
              }
            } else {
              playSound(pick(FIRE), event.weapon === 'enemy' ? 0.35 : 0.6)
            }
            break
          case 'hit':
            playSound(pick(HIT), 0.7)
            break
          case 'collision':
            playSound('ship_collision', 0.9)
            break
          case 'splash':
            playSound(pick(SPLASH), 0.45)
            break
          case 'explosion':
            playSound(pick(EXPLOSION), 0.8)
            break
        }
      }

      const { match, player, config } = world
      if (match.score > lastScore) {
        lastScore = match.score
        playSound('score_point', 0.7)
      }
      if (!lowHealthPlayed && player.health > 0 && player.health / player.maxHealth <= LOW_HEALTH_RATIO) {
        lowHealthPlayed = true
        playSound('health_low', 0.8)
      }
      if (!timeWarned && match.status === 'running' && match.timeRemaining <= TIME_WARNING_SECONDS) {
        timeWarned = true
        playSound('time_warning', 0.7)
      }

      if (!paused) {
        const speed = Math.hypot(player.velocity.x, player.velocity.y) / config.player.maxSpeed
        sailing.setVolume(SAILING_VOLUME * Math.min(1, speed))
      }

      if (match.status === 'over' && !endPlayed) {
        endPlayed = true
        if (match.endReason === 'death') {
          playSound('ship_sinking', 0.9)
          playSound('game_over', 0.8)
        } else {
          playSound('game_complete', 0.8)
        }
      }
    },

    setPaused: (next) => {
      if (next === paused) return
      paused = next
      playSound(next ? 'game_pause' : 'game_resume', 0.7)
      ocean.setVolume(next ? 0 : OCEAN_VOLUME)
      if (next) sailing.setVolume(0)
    },

    destroy: () => {
      ocean.stop()
      sailing.stop()
    },
  }
}
