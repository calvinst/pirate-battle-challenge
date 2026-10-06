import type { Player } from './contracts'

const PLAYER_KEY = 'pirate-battle:player'

let cached: Player | null = null

/** Identidade local e estável do jogador. */
export const getPlayer = (): Player => {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(PLAYER_KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<Player>
      if (typeof v.id === 'string' && typeof v.name === 'string') {
        cached = { id: v.id, name: v.name }
        return cached
      }
    }
  } catch {
    // identidade corrompida: gera outra
  }
  cached = { id: crypto.randomUUID(), name: 'You' }
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(cached))
  } catch {
    // sem persistência: vale só nesta sessão
  }
  return cached
}
