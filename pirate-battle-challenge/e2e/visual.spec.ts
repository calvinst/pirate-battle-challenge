import { expect, test } from '@playwright/test'
import { advance, gameUrl, playUntilTimeIsUp, startMatch } from './helpers'

test('menu', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  await expect(page).toHaveScreenshot('menu.png', { fullPage: true })
})

test("captain's log", async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ranking', exact: true }).click()
  await expect(page.getByRole('row')).toHaveCount(11)
  await expect(page).toHaveScreenshot('log.png', { fullPage: true })
})

test('arena in a stable state', async ({ page }) => {
  await page.goto(gameUrl())
  await startMatch(page)
  await advance(page, 1)
  await expect(page).toHaveScreenshot('arena.png')
})

test('result screen', async ({ page }) => {
  await playUntilTimeIsUp(page)
  await expect(page.getByText('Match saved to ranking and history.')).toBeVisible()
  await expect(page).toHaveScreenshot('result.png')
})
