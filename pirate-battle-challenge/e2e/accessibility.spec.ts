import { expect, test } from '@playwright/test'
import { advance, gameUrl, snapshot, startMatch } from './helpers'

test('pause dialog keeps the focus inside', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard focus is a desktop concern')
  await page.goto(gameUrl())
  await startMatch(page)

  await page.getByRole('button', { name: 'Pause' }).click()
  const dialog = page.getByRole('dialog', { name: 'Paused' })
  await expect(dialog.getByRole('button', { name: 'Resume' })).toBeFocused()

  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)
  }
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.locator(':focus')).toHaveCount(1)
})

test('menus are reachable by keyboard with a visible focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation is a desktop concern')
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Play' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Options' })).toBeFocused()
  const outline = await page
    .getByRole('button', { name: 'Options' })
    .evaluate((el) => getComputedStyle(el).outlineStyle)
  expect(outline).not.toBe('none')
})

test.describe('touch controls', () => {
  test('are hidden with a fine pointer', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only')
    await page.goto(gameUrl())
    await startMatch(page)
    await expect(page.getByRole('button', { name: 'Fire forward' })).toBeHidden()
  })

  test('are visible and drive the ship on touch devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only')
    await page.goto(gameUrl())
    await startMatch(page)

    for (const name of [
      'Sail forward',
      'Reverse',
      'Turn left',
      'Turn right',
      'Fire forward',
      'Fire left broadside',
      'Fire right broadside',
    ]) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }

    const before = await snapshot(page)
    const forward = page.getByRole('button', { name: 'Sail forward' })
    const fire = page.getByRole('button', { name: 'Fire forward' })
    await forward.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' })
    await fire.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch' })
    await advance(page, 0.5)
    await forward.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' })
    await fire.dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch' })

    const after = await snapshot(page)
    expect(after.player.x).toBeGreaterThan(before.player.x)
    expect(after.projectiles.filter((p) => p.owner === 'player').length).toBeGreaterThan(0)
  })

  test('the arena and the controls fit the screen', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only')
    await page.goto(gameUrl())
    await startMatch(page)
    const viewport = page.viewportSize()
    const canvas = await page.locator('canvas').boundingBox()
    const controls = await page.getByRole('button', { name: 'Fire forward' }).boundingBox()
    if (!viewport || !canvas || !controls) throw new Error('Missing layout boxes')
    expect(canvas.x).toBeGreaterThanOrEqual(0)
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width + 1)
    expect(controls.y + controls.height).toBeLessThanOrEqual(viewport.height + 1)
    expect(controls.x + controls.width).toBeLessThanOrEqual(viewport.width + 1)
  })
})
