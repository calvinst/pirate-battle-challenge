import type { InputState } from '../simulation/world'

export interface KeyboardInput {
  state: InputState
  destroy: () => void
}

/** W/S acelera/ré, A/D gira, Espaço tiro frontal, Q/E laterais esquerda/direita. */
export const createKeyboardInput = (): KeyboardInput => {
  const down = new Set<string>()
  const state: InputState = {
    throttle: 0,
    turn: 0,
    fireFront: false,
    fireLeft: false,
    fireRight: false,
  }

  const sync = () => {
    const has = (...codes: string[]) => codes.some((c) => down.has(c))
    state.throttle = (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0)
    state.turn = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0)
    state.fireFront = has('Space')
    state.fireLeft = has('KeyQ')
    state.fireRight = has('KeyE')
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
    down.add(e.code)
    sync()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    down.delete(e.code)
    sync()
  }
  const onBlur = () => {
    down.clear()
    sync()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  return {
    state,
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    },
  }
}
