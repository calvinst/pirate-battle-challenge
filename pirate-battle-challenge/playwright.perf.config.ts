import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

/** Profiling de longa duração; fica fora da suíte padrão (`npm run perf`). */
export default defineConfig({
  testDir: 'perf',
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
    // Sem isso o Chromium headless cai no WebGL por software (SwiftShader), que mede a CPU e não a GPU.
    launchOptions: {
      args: process.env.PERF_SOFTWARE_GL
        ? []
        : ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
    },
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
