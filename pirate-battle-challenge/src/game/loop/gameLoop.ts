export interface GameLoopOptions {
  /** passo fixo da simulação, em segundos */
  fixedStep: number
  /** limite de tempo por frame para evitar a espiral da morte, em segundos */
  maxFrameTime: number
  update: (dt: number) => void
  /** `alpha` (0..1) é a fração do próximo passo já acumulada, para interpolação */
  render: (alpha: number, frameDt: number) => void
}

export interface GameLoop {
  start: () => void
  stop: () => void
}

/** Loop com delta time: simulação em passo fixo, renderização a cada frame. */
export const createGameLoop = ({
  fixedStep,
  maxFrameTime,
  update,
  render,
}: GameLoopOptions): GameLoop => {
  let rafId = 0
  let last = 0
  let accumulator = 0

  const frame = (now: number) => {
    const frameDt = Math.min((now - last) / 1000, maxFrameTime)
    last = now
    accumulator += frameDt

    while (accumulator >= fixedStep) {
      update(fixedStep)
      accumulator -= fixedStep
    }

    render(accumulator / fixedStep, frameDt)
    rafId = requestAnimationFrame(frame)
  }

  return {
    start: () => {
      if (rafId) return
      last = performance.now()
      accumulator = 0
      rafId = requestAnimationFrame(frame)
    },
    stop: () => {
      cancelAnimationFrame(rafId)
      rafId = 0
    },
  }
}
