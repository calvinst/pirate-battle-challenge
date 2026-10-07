import { expect, test } from '@playwright/test'
import { advance, gameUrl, snapshot, startMatch } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(gameUrl())
  await startMatch(page)
})

test('shows the HUD and counts the time down', async ({ page }) => {
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Time: 90s')).toBeVisible()
  await expect(page.getByText('Health: 100/100')).toBeVisible()

  await advance(page, 10)
  // O HUD arredonda para cima; o acumulado de passos fixos pode ficar um ponto de ponto flutuante acima.
  await expect(page.getByText(/Time: (79|80|81)s/)).toBeVisible()
})

test('sails forward and turns', async ({ page }) => {
  const start = await snapshot(page)

  await page.keyboard.down('KeyD')
  await advance(page, 0.5)
  await page.keyboard.up('KeyD')
  const turned = await snapshot(page)
  expect(turned.player.rotation).toBeGreaterThan(start.player.rotation)

  await page.keyboard.down('KeyW')
  await advance(page, 1)
  await page.keyboard.up('KeyW')
  const moved = await snapshot(page)
  expect(Math.hypot(moved.player.x - start.player.x, moved.player.y - start.player.y)).toBeGreaterThan(10)
})

test('stays inside the arena', async ({ page }) => {
  await page.keyboard.down('KeyS')
  await advance(page, 10)
  await page.keyboard.up('KeyS')
  const { player } = await snapshot(page)
  expect(player.x).toBeCloseTo(player.radius, 1)
})

test('cannot cross the island', async ({ page }) => {
  await page.keyboard.down('KeyW')
  await advance(page, 10)
  await page.keyboard.up('KeyW')
  const { player, island } = await snapshot(page)
  const distance = Math.hypot(player.x - island.x, player.y - island.y)
  expect(distance).toBeGreaterThanOrEqual(island.radius + player.radius - 0.01)
  expect(player.x).toBeLessThan(island.x)
})

test('fires forward respecting the cooldown', async ({ page }) => {
  await page.keyboard.down('Space')
  await advance(page, 0.5)
  await page.keyboard.up('Space')
  const { projectiles } = await snapshot(page)
  expect(projectiles.filter((p) => p.owner === 'player')).toHaveLength(2)
  for (const p of projectiles) expect(p.vx).toBeGreaterThan(0)
})

test('fires three parallel projectiles from each side', async ({ page }) => {
  await page.keyboard.down('KeyE')
  await advance(page, 0.5)
  await page.keyboard.up('KeyE')
  const right = (await snapshot(page)).projectiles
  // Recarga de 1 s: a salva da primeira metade segundo não se repete.
  expect(right).toHaveLength(3)
  for (const p of right) {
    expect(Math.abs(p.vx)).toBeLessThan(1)
    expect(p.vy).toBeGreaterThan(0)
  }
  const xs = right.map((p) => p.x).sort((a, b) => a - b)
  expect(xs[1]! - xs[0]!).toBeCloseTo(12, 0)
  expect(xs[2]! - xs[1]!).toBeCloseTo(12, 0)

  await advance(page, 1)
  await page.keyboard.down('KeyQ')
  await advance(page, 0.1)
  await page.keyboard.up('KeyQ')
  const left = (await snapshot(page)).projectiles.filter((p) => p.vy < 0)
  expect(left).toHaveLength(3)
})

test('pauses with the button and resumes only on request', async ({ page }) => {
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
