import { expect, test } from '@playwright/test'

test('validates, saves and persists the options', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Options' }).click()

  const duration = page.getByLabel('Game session time (s)')
  const spawn = page.getByLabel('Enemy spawn time (s)')

  await duration.fill('59')
  await spawn.fill('31')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Must be between 60 and 180 seconds.')).toBeVisible()
  await expect(page.getByText('Must be between 0.5 and 30 seconds.')).toBeVisible()
  await expect(page.getByText('Options saved.')).toHaveCount(0)

  await duration.fill('120')
  await spawn.fill('2.5')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Options saved.')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByLabel('Game session time (s)')).toHaveValue('120')
  await expect(page.getByLabel('Enemy spawn time (s)')).toHaveValue('2.5')
})

test('a new match uses the saved options', async ({ page }) => {
  await page.goto('/?e2e=1&seed=7')
  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByLabel('Game session time (s)').fill('120')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Back' }).click()

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByText('Time: 120s')).toBeVisible()
})
