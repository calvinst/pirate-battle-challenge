import { expect, type Page } from '@playwright/test'
import type { GameTestSnapshot } from '../src/game/testHook'

export const OPTIONS_KEY = 'pirate-battle:options'
export const SCENARIO_KEY = 'pirate-battle:mock-scenario'

/** Seed cujo primeiro inimigo é um Chaser; com spawn de 30 s o jogador sobrevive a 60 s. */
export const SAFE_SEED = 7

export const gameUrl = (seed = SAFE_SEED) => `/?e2e=1&seed=${seed}`

/** Define valores do localStorage apenas se ainda não existirem (sobrevive a reload). */
export const seedStorage = async (page: Page, entries: Record<string, unknown>) => {
  await page.addInitScript((items: [string, string][]) => {
    for (const [key, value] of items) {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value)
    }
  }, Object.entries(entries).map(([k, v]): [string, string] => [k, typeof v === 'string' ? v : JSON.stringify(v)]))
}

export const startMatch = async (page: Page) => {
  await page.getByRole('button', { name: 'Play' }).click()
  await page.waitForFunction(() => window.__game !== undefined)
}

export const advance = (page: Page, seconds: number) =>
  page.evaluate((s) => {
    if (!window.__game) throw new Error('Test hook is not available')
    window.__game.advance(s)
  }, seconds)

export const snapshot = (page: Page): Promise<GameTestSnapshot> =>
  page.evaluate(() => {
    if (!window.__game) throw new Error('Test hook is not available')
    return window.__game.snapshot()
  })

/** Joga uma partida curta até o fim por tempo, sem sofrer dano. */
export const playUntilTimeIsUp = async (page: Page) => {
  await seedStorage(page, { [OPTIONS_KEY]: { matchDuration: 60, spawnInterval: 30 } })
  await page.goto(gameUrl())
  await startMatch(page)
  await advance(page, 61)
  await expect(page.getByRole('heading', { name: 'Match over' })).toBeVisible()
}
