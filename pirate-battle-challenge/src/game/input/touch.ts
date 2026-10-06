import type { InputState } from '../simulation/world'

export type TouchControl =
  | 'forward'
  | 'reverse'
  | 'left'
  | 'right'
  | 'fireFront'
  | 'fireLeft'
  | 'fireRight'

export interface TouchInput {
  state: InputState
  set: (control: TouchControl, pressed: boolean) => void
  reset: () => void
}

export const createTouchInput = (): TouchInput => {
  const held = new Set<TouchControl>()
  const state: InputState = {
    throttle: 0,
    turn: 0,
    fireFront: false,
    fireLeft: false,
    fireRight: false,
  }

  const sync = () => {
    state.throttle = (held.has('forward') ? 1 : 0) - (held.has('reverse') ? 1 : 0)
    state.turn = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0)
    state.fireFront = held.has('fireFront')
    state.fireLeft = held.has('fireLeft')
    state.fireRight = held.has('fireRight')
  }

  return {
    state,
    set: (control, pressed) => {
      if (pressed) held.add(control)
      else held.delete(control)
      sync()
    },
    reset: () => {
      held.clear()
      sync()
    },
  }
}

/** Combina duas fontes de entrada em `out`. */
export const mergeInputs = (a: InputState, b: InputState, out: InputState): void => {
  out.throttle = Math.max(-1, Math.min(1, a.throttle + b.throttle))
  out.turn = Math.max(-1, Math.min(1, a.turn + b.turn))
  out.fireFront = a.fireFront || b.fireFront
  out.fireLeft = a.fireLeft || b.fireLeft
  out.fireRight = a.fireRight || b.fireRight
}
