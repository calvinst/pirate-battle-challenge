import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import type { PerfReport } from '../src/game/perf'

const OUTPUT_DIR = 'docs/performance'
const PROFILE_URL = '/?perf=1&seed=7'

const save = (name: string, data: unknown) => {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(`${OUTPUT_DIR}/${name}.json`, `${JSON.stringify(data, null, 2)}\n`)
}

const environment = async (page: Page, browserVersion: string) => ({
  measuredAt: new Date().toISOString(),
  cpu: os.cpus()[0]?.model.trim() ?? 'unknown',
  logicalCores: os.cpus().length,
  memoryGB: Math.round(os.totalmem() / 1024 ** 3),
  os: `${os.type()} ${os.release()}`,
  browser: `Chromium ${browserVersion} (headless, Playwright)`,
  viewport: page.viewportSize(),
  devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
  webglRenderer: await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unavailable'
  }),
})

test('three-minute match: frame rate, frame time and entities', async ({ page, browser }) => {
  test.setTimeout(6 * 60_000)

  await page.addInitScript(() => {
    localStorage.setItem(
      'pirate-battle:options',
      JSON.stringify({ matchDuration: 180, spawnInterval: 3 }),
    )
  })
  await page.goto(PROFILE_URL)
  await page.getByRole('button', { name: 'Play' }).click()
  await page.locator('canvas').waitFor()

  // O "jogador" navega, vira e dispara sem parar para manter inimigos e projéteis em cena.
  for (const key of ['KeyW', 'Space', 'KeyQ', 'KeyE']) await page.keyboard.down(key)
  const deadline = Date.now() + 200_000
  let right = true
  while (Date.now() < deadline && !(await page.getByRole('heading', { name: 'Match over' }).isVisible())) {
    const turn = right ? 'KeyD' : 'KeyA'
    await page.keyboard.down(turn)
    await page.waitForTimeout(1500)
    await page.keyboard.up(turn)
    right = !right
  }
  await expect(page.getByRole('heading', { name: 'Match over' })).toBeVisible()

  const report: PerfReport | undefined = await page.evaluate(() => window.__perfLast)
  if (!report) throw new Error('No performance report was recorded')
  save('frame-metrics', {
    scenario: {
      match: 'default config, 180 s, enemy spawn every 3 s, seed 7',
      input: 'scripted: forward, alternating turns every 1.5 s, forward and both broadsides held',
      mode: 'real time, player invulnerable so the match runs the full duration',
    },
    environment: await environment(page, browser.version()),
    report,
  })

  expect(report.seconds).toBeGreaterThan(170)
  expect(report.frames).toBeGreaterThan(1000)
})

test('memory after five start, play and quit cycles', async ({ page, browser }) => {
  test.setTimeout(6 * 60_000)

  await page.goto(PROFILE_URL)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')

  const sample = async (label: string) => {
    await cdp.send('HeapProfiler.collectGarbage')
    await cdp.send('HeapProfiler.collectGarbage')
    const { metrics } = await cdp.send('Performance.getMetrics')
    const heap = metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0
    const dom = await cdp.send('Memory.getDOMCounters')
    return {
      label,
      jsHeapMB: Number((heap / 1024 ** 2).toFixed(2)),
      domNodes: dom.nodes,
      eventListeners: dom.jsEventListeners,
      canvases: await page.locator('canvas').count(),
    }
  }

  const samples = [await sample('menu, before the first match')]
  for (let cycle = 1; cycle <= 5; cycle++) {
    await page.getByRole('button', { name: 'Play' }).click()
    await page.locator('canvas').waitFor()
    for (const key of ['KeyW', 'Space', 'KeyE']) await page.keyboard.down(key)
    await page.keyboard.down('KeyD')
    await page.waitForTimeout(20_000)
    for (const key of ['KeyW', 'Space', 'KeyE', 'KeyD']) await page.keyboard.up(key)

    await page.getByRole('button', { name: 'Pause' }).click()
    await page.getByRole('dialog', { name: 'Paused' }).getByRole('button', { name: 'Main Menu' }).click()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
    samples.push(await sample(`menu, after cycle ${cycle}`))
  }

  const first = samples[1]
  const last = samples[samples.length - 1]
  if (!first || !last) throw new Error('Missing samples')
  save('memory-metrics', {
    scenario: 'five cycles of: Play, 20 s of scripted play with enemies, Pause, Main Menu; forced GC before each sample',
    environment: await environment(page, browser.version()),
    samples,
    growthFromCycle1ToCycle5: {
      jsHeapMB: Number((last.jsHeapMB - first.jsHeapMB).toFixed(2)),
      domNodes: last.domNodes - first.domNodes,
      eventListeners: last.eventListeners - first.eventListeners,
    },
  })

  expect(last.canvases).toBe(0)
  expect(last.eventListeners - first.eventListeners).toBeLessThanOrEqual(5)
  expect(last.jsHeapMB - first.jsHeapMB).toBeLessThan(10)
})
