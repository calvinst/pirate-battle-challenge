import { expect, test } from '@playwright/test'
import {
  OPTIONS_KEY,
  advance,
  gameUrl,
  playUntilTimeIsUp,
  seedStorage,
  startMatch,
} from './helpers'

test('ends by time, shows the result and keeps it after a refresh', async ({ page }) => {
  await playUntilTimeIsUp(page)

  await expect(page.getByText("Time's up")).toBeVisible()
  await expect(page.getByText('Score').locator('xpath=following-sibling::dd[1]')).toHaveText('0')
  await expect(page.getByText(/^60\.\ds$/)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Last match' })).toBeVisible()
  await expect(page.getByText(/0 pts in 60\.\ds/)).toBeVisible()
})

test('ends by death and freezes the simulation', async ({ page }) => {
  await seedStorage(page, { [OPTIONS_KEY]: { matchDuration: 180, spawnInterval: 0.5 } })
  await page.goto(gameUrl(1))
  await startMatch(page)

  const frozen = await page.evaluate(() => {
    const game = window.__game
    if (!game) throw new Error('Test hook is not available')
    for (let i = 0; i < 170 && game.snapshot().match.status !== 'over'; i++) game.advance(1)
    const before = game.snapshot()
    game.advance(5)
    return { before, after: game.snapshot() }
  })

  expect(frozen.before.match.status).toBe('over')
  expect(frozen.before.match.endReason).toBe('death')
  expect(frozen.before.player.health).toBe(0)
  expect(frozen.after.time).toBe(frozen.before.time)
  expect(frozen.after.match).toEqual(frozen.before.match)
  expect(frozen.after.enemies).toEqual(frozen.before.enemies)

  await expect(page.getByText('Your ship was destroyed')).toBeVisible()
})

test('Play Again starts a clean match', async ({ page }) => {
  await seedStorage(page, { [OPTIONS_KEY]: { matchDuration: 60, spawnInterval: 30 } })
  await page.goto(gameUrl())
  await startMatch(page)
  await advance(page, 61)
  await expect(page.getByRole('heading', { name: 'Match over' })).toBeVisible()

  await page.getByRole('button', { name: 'Play Again' }).click()
  await page.waitForFunction(() => window.__game !== undefined)
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Time: 60s')).toBeVisible()
  await expect(page.getByText('Health: 100/100')).toBeVisible()
})
