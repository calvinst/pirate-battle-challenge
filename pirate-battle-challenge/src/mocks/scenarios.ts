export const SCENARIOS = {
  success: 'Success',
  empty: 'Empty lists',
  slow: 'Slow responses (3s)',
  'server-error': 'HTTP 500 on every request',
  'submit-unavailable': 'Match submit unavailable (503)',
  'submit-timeout': 'Match saved, but the response is lost',
} as const

export type Scenario = keyof typeof SCENARIOS

const SCENARIO_KEY = 'pirate-battle:mock-scenario'

export const isScenario = (v: unknown): v is Scenario =>
  typeof v === 'string' && v in SCENARIOS

export const getScenario = (): Scenario => {
  try {
    const v = localStorage.getItem(SCENARIO_KEY)
    return isScenario(v) ? v : 'success'
  } catch {
    return 'success'
  }
}

export const setScenario = (scenario: Scenario): void => {
  try {
    localStorage.setItem(SCENARIO_KEY, scenario)
  } catch {
    // sem persistência: o cenário padrão volta a valer
  }
}
