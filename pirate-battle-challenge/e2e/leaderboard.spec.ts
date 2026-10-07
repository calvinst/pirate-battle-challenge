import { expect, test, type Page } from '@playwright/test'
import { SCENARIO_KEY, playUntilTimeIsUp, seedStorage } from './helpers'

const rows = (page: Page) => page.getByRole('row')

const openScenarios = async (page: Page) => {
  await page.getByText('Network scenarios').click()
  return page.getByLabel('Mock API scenario')
}

test.describe('ranking', () => {
  test('paginates the results', async ({ page }) => {
    await page.goto('/')
    await expect(rows(page)).toHaveCount(11)
    await expect(page.getByText('Page 1 of 3')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Page 2 of 3')).toBeVisible()
    await expect(rows(page).nth(1).getByRole('cell').first()).toHaveText('11')

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Page 3 of 3')).toBeVisible()
    await expect(rows(page)).toHaveCount(8)
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  test('shows the empty state', async ({ page }) => {
    await seedStorage(page, { [SCENARIO_KEY]: 'empty' })
    await page.goto('/')
    await expect(page.getByText('No ranked matches yet for these options.')).toBeVisible()
  })

  test('shows the error state and recovers', async ({ page }) => {
    await seedStorage(page, { [SCENARIO_KEY]: 'server-error' })
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('Could not load the data.')

    await page.evaluate((key) => {
      localStorage.setItem(key, 'success')
    }, SCENARIO_KEY)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(rows(page)).toHaveCount(11)
  })

  test('switches scenarios from the selector', async ({ page }) => {
    await page.goto('/')
    await expect(rows(page)).toHaveCount(11)

    const selector = await openScenarios(page)
    await selector.selectOption('server-error')
    await expect(page.getByRole('alert')).toContainText('Could not refresh the data.')

    await selector.selectOption('success')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(rows(page)).toHaveCount(11)
  })
})

test.describe('match history', () => {
  test('is empty before the first match', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(page.getByText('You have not finished any matches yet.')).toBeVisible()
  })

  test('registers a finished match in both tabs', async ({ page }) => {
    await playUntilTimeIsUp(page)
    await expect(page.getByText('Match saved to ranking and history.')).toBeVisible()

    await page.getByRole('button', { name: 'Main Menu' }).click()
    await expect(rows(page)).toHaveCount(2)
    await expect(rows(page).nth(1)).toContainText('You')

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(rows(page)).toHaveCount(2)
    await expect(rows(page).nth(1)).toContainText('Time')
  })

  test('recovers from a lost response without duplicating', async ({ page }) => {
    await seedStorage(page, { [SCENARIO_KEY]: 'submit-timeout' })
    await playUntilTimeIsUp(page)
    await expect(page.getByText('Match saved to ranking and history.')).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('button', { name: 'Main Menu' }).click()
    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(rows(page)).toHaveCount(2)
  })

  test('keeps an unsaved match and registers it after a refresh', async ({ page }) => {
    await seedStorage(page, { [SCENARIO_KEY]: 'submit-unavailable' })
    await playUntilTimeIsUp(page)
    await expect(page.getByText(/Match not saved yet/)).toBeVisible({ timeout: 15_000 })

    await page.evaluate((key) => {
      localStorage.setItem(key, 'success')
    }, SCENARIO_KEY)
    await page.reload()

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(rows(page)).toHaveCount(2, { timeout: 15_000 })
  })
})
