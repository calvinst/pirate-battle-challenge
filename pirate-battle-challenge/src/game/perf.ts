/** Métricas de frame para o modo de profiling (`?perf`); não é usado em partidas normais. */

export interface Stat {
  mean: number
  p50: number
  p95: number
  p99: number
  max: number
}

export interface PerfReport {
  frames: number
  /** segundos entre o primeiro e o último frame medido */
  seconds: number
  fps: number
  frameTimeMs: Stat
  /** CPU gasta na simulação por frame (soma dos passos fixos) */
  simulationMs: Stat
  /** CPU gasta em `renderer.render` por frame */
  renderMs: Stat
  /** frames mais longos que 20 ms (abaixo de 50 FPS) */
  slowFrames: number
  entities: { enemiesMax: number; projectilesMax: number; totalMax: number; totalMean: number }
}

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, index)] ?? 0
}

const stat = (values: number[]): Stat => {
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  return {
    mean,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? 0,
  }
}

export interface PerfRecorder {
  frame: (intervalMs: number, simulationMs: number, renderMs: number, enemies: number, projectiles: number) => void
  report: () => PerfReport
}

export const createPerfRecorder = (): PerfRecorder => {
  const intervals: number[] = []
  const simulation: number[] = []
  const render: number[] = []
  let enemiesMax = 0
  let projectilesMax = 0
  let totalMax = 0
  let totalSum = 0

  return {
    frame: (intervalMs, simulationMs, renderMs, enemies, projectiles) => {
      intervals.push(intervalMs)
      simulation.push(simulationMs)
      render.push(renderMs)
      // Os navios do jogador e inimigos mais os projéteis em cena.
      const total = 1 + enemies + projectiles
      enemiesMax = Math.max(enemiesMax, enemies)
      projectilesMax = Math.max(projectilesMax, projectiles)
      totalMax = Math.max(totalMax, total)
      totalSum += total
    },
    report: () => {
      const seconds = intervals.reduce((a, b) => a + b, 0) / 1000
      return {
        frames: intervals.length,
        seconds,
        fps: seconds > 0 ? intervals.length / seconds : 0,
        frameTimeMs: stat(intervals),
        simulationMs: stat(simulation),
        renderMs: stat(render),
        slowFrames: intervals.filter((ms) => ms > 20).length,
        entities: {
          enemiesMax,
          projectilesMax,
          totalMax,
          totalMean: intervals.length ? totalSum / intervals.length : 0,
        },
      }
    },
  }
}
