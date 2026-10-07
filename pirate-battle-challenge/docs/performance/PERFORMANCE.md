# Performance and profiling

Measurements of the combat loop in the **production build** (`npm run build`, served by `vite preview`). The scripts are in [`perf/profile.spec.ts`](../../perf/profile.spec.ts) and the raw results in this folder. Re-run them with:

```bash
npm run perf                        # uses the GPU (ANGLE / Direct3D 11 flags in playwright.perf.config.ts)
PERF_SOFTWARE_GL=1 npm run perf     # software WebGL (SwiftShader), for comparison (PowerShell: $env:PERF_SOFTWARE_GL=1)
```

The GPU flags are Windows specific (`--use-angle=d3d11`); adjust them in `playwright.perf.config.ts` for other platforms.

## Environment

| Item | Value |
| --- | --- |
| Hardware | Laptop, Intel Core i7-8565U @ 1.80 GHz (8 logical cores), 8 GB RAM |
| GPU | Intel UHD Graphics 620 (WebGL through ANGLE / Direct3D 11) |
| OS | Windows 10.0.26200 |
| Browser | Chromium 153.0.8010.12 driven by Playwright, headless |
| Viewport | 1280 x 720, device pixel ratio 1 |
| Build | Production, with MSW mocks, sound enabled |
| Date | 2026-10-07 |

## Scenario

- **Match:** default configuration, 180 s, an enemy every 3 s, fixed seed 7.
- **Input:** a script holds forward and both broadside keys plus fire, and alternates turning right and left every 1.5 s, so there are always enemies and projectiles on screen.
- **Profiling mode:** the URL flag `?perf` keeps the match in real time but makes the player invulnerable, so the whole 180 s is played. Everything else (simulation, rendering, audio, React HUD updates) is the normal code path.
- **What is measured:** the interval between frames as seen by the render callback, the CPU time of the simulation steps and of `renderer.render` per frame, and the entity count (player ships plus enemies plus projectiles).

## Three-minute match

Raw data: [`frame-metrics.json`](frame-metrics.json).

| Metric | Result |
| --- | --- |
| Frames measured | 10,796 in 179.99 s |
| Average frame rate | **59.98 FPS** (target: 60) |
| Frame time, mean / p50 | 16.67 ms / 16.60 ms |
| Frame time, p95 | **17.80 ms** |
| Frame time, p99 | 18.40 ms |
| Frame time, max | 73.2 ms (single frame) |
| Frames above 20 ms | 5 of 10,796 (0.05 %) |
| Simulation CPU per frame, mean / p95 / max | 0.08 ms / 0.30 ms / 1.6 ms |
| `renderer.render` CPU per frame, mean / p95 / max | 0.26 ms / 0.40 ms / 6.7 ms |
| Entities, mean | 11.9 |
| Entities, peak | 24 (11 enemies, 14 projectiles, plus the player ship) |

The frame rate is locked to the display refresh (60 Hz), and the frame time distribution is tight. The work done by the game itself is a small fraction of the 16.7 ms budget (simulation plus render submission is well under 1 ms on average), so there is a lot of headroom. The five slow frames, with a worst case of 73 ms, were isolated; they are consistent with a garbage-collection pause or an OS scheduling hiccup, but the run did not capture what caused them.

### Comparison: software WebGL

Raw data: [`frame-metrics-software-gl.json`](frame-metrics-software-gl.json).

Headless Chromium falls back to software WebGL (SwiftShader) unless GPU flags are given. In that first run the same scenario averaged **13.07 FPS** (p95 frame time 92.7 ms) even though the JavaScript side stayed cheap (simulation 0.27 ms and render submission 0.41 ms on average). The bottleneck was software rasterization of the 1280 x 720 scene, not the game code, which is why the reported numbers above use the GPU. Anyone running the E2E or profiling scripts on a machine without GPU acceleration should expect much lower frame rates.

## Memory over five cycles

Raw data: [`memory-metrics.json`](memory-metrics.json) (software WebGL run: [`memory-metrics-software-gl.json`](memory-metrics-software-gl.json), with the same conclusions).

One cycle is: click **Play**, play 20 s with the script (enemies and projectiles active), **Pause**, **Main Menu**. Before every sample the garbage collector was forced twice through the DevTools protocol.

| Sample | JS heap | DOM nodes | Event listeners | Canvases |
| --- | --- | --- | --- | --- |
| Menu, before the first match | 2.57 MB | 46 | 148 | 0 |
| After cycle 1 | 6.43 MB | 209 | 183 | 0 |
| After cycle 2 | 6.63 MB | 209 | 183 | 0 |
| After cycle 3 | 6.79 MB | 209 | 183 | 0 |
| After cycle 4 | 6.87 MB | 209 | 183 | 0 |
| After cycle 5 | 7.02 MB | 209 | 183 | 0 |

Findings:

- **No resource leaks in the DOM or listeners:** from cycle 1 to cycle 5 the DOM node count and the listener count do not change, and no Pixi canvas remains after leaving a match.
- **One-time cost on the first match:** the jump from 2.57 MB to 6.43 MB is the first load of textures and decoded audio buffers, which are cached and reused by later matches (it also includes the TanStack Query cache and the mounted menu).
- **Small steady drift:** the JS heap grows about 0.15 MB per cycle (+0.59 MB between cycles 1 and 5). That is below the 10 MB threshold asserted by the test and does not look like a leak of game entities or listeners, but the cause was not investigated. Over a much longer session it would be worth a heap snapshot comparison.
- **GPU memory was not measured.** Textures are shared between matches and only the Pixi application is destroyed, so the GPU side was reasoned about but not profiled.

## Limitations

- One machine, one browser (Chromium on Windows), headless, with a single 1280 x 720 viewport at device pixel ratio 1. Mobile devices and high density screens were not profiled.
- The input is scripted and the player is invulnerable, so the entity counts correspond to the default spawn rate. A faster spawn interval (the option goes down to 0.5 s) would increase them; that was not measured.
- The measured frame interval comes from the render callback (`requestAnimationFrame`); it does not include time the GPU or compositor spent after the frame was submitted.
