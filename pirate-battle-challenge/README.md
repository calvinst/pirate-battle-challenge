# Pirate Battle

Top-down 2D naval shooter built with React, TypeScript (strict) and PixiJS. Sail around an island, sink Chaser and Shooter ships and score points until the timer runs out or your ship is destroyed.

- **Live demo:** https://pirate-battle-challenge-eight.vercel.app/
- **Architecture notes:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Original challenge statement:** kept below, after the [divider](#original-readme-and-challenge-statement).

## Stack

| Responsibility | Technology |
| --- | --- |
| UI and menus | React 19 |
| Language | TypeScript, strict mode |
| Game rendering | PixiJS 8 |
| Ranking / history state | TanStack Query |
| HTTP client | Axios |
| API mocking | MSW (also active in the published build) |
| E2E and visual regression | Playwright (Chromium, desktop and mobile) |
| Build | Vite |

## Setup

```bash
npm install
npx playwright install chromium   # only needed to run the E2E tests
```

Requires Node.js 20 or newer.

### Environment variables

None. The app needs no `.env` file and no private service: the ranking and match history APIs are served by MSW inside the browser.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with HMR |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` (app, tooling and E2E projects) |
| `npm run test:e2e` | Playwright suite (builds and serves the app on its own) |
| `npm run test:e2e:update` | Same, regenerating the visual baselines |
| `npm run perf` | Long profiling run (3-minute match and five-cycle memory check), writes `docs/performance/*.json` |

The HTML report is written to `playwright-report/` and traces of failed tests to `test-results/`. Open the report with `npx playwright show-report`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Sail forward / reverse | `W` / `S` or `Up` / `Down` | Up / down arrows (left pad) |
| Turn left / right | `A` / `D` or `Left` / `Right` | Left / right arrows (left pad) |
| Fire forward (1 projectile) | `Space` | `●` button |
| Broadside left (3 projectiles) | `Q` | `L` button |
| Broadside right (3 projectiles) | `E` | `R` button |
| Pause / resume | `Esc` or `P`, or the Pause button | Pause button |

Movement and firing can be combined. Touch controls only appear on devices with a coarse pointer. Both orientations are supported on mobile: landscape is recommended (the pads float over the arena), and in portrait the HUD sits above the arena and the pads below it. The match pauses automatically when the window loses focus or the tab is hidden, and resuming requires pressing **Resume** (or `Esc` / `P`); nothing accumulates while paused.

## Game rules

- The match lasts 60 to 180 seconds of active play (default 90).
- Each enemy destroyed by your shots is worth 1 point. A Chaser that blows up against your ship does not score.
- The match ends when time runs out or your health reaches zero. Movement, shooting, damage, spawns and scoring stop immediately.
- **Chaser:** chases you, damages you on contact and explodes.
- **Shooter:** approaches until it is at its preferred distance and fires when you are in range and in its sights. It does not fire while the island is in the way.
- Enemies spawn every spawn interval at a point that is clear of the island and other ships and far from you. The second enemy of a match is always the type that has not appeared yet, so both types show up. Enemies steer around the island instead of getting stuck on it.
- Ships cannot cross the island or leave the arena. Projectiles are removed when they hit a target, the island, leave the arena or expire, and each one deals damage only once.
- Feedback: muzzle flashes, hit flashes, explosions, and ship sprites that get more damaged (with fire below 50 % health) as health drops.
- Sound: cannon fire (front, broadside, enemy), hits, collisions, cannonballs splashing on the island, explosions, score, low-health and last-10-seconds warnings, pause and resume cues, start and end jingles, an ocean ambience loop and a sailing loop that follows your speed. UI buttons click. The **Sound** button in the match HUD mutes everything and the choice is remembered. Browsers only allow audio after the first click or key press, so sound starts once you interact with the page. Sound is optional: if a file fails to load the game still starts.

## Gameplay configuration

All balance parameters live in one typed object, [`src/game/simulation/config.ts`](src/game/simulation/config.ts) (`GameConfig` / `defaultConfig`): match duration, arena and island, spawn interval and distribution (`chaserChance`, minimum distance from the player, island margin), health, speeds, turn rates, damage, projectile speed / lifetime / radius, cooldowns and the Shooter's range. Systems read values from the config, so rebalancing does not require changing game logic.

Each match runs on a **snapshot** of the configuration taken when it starts; changing the options later only affects new matches.

### Options screen

| Option | Limits | Default |
| --- | --- | --- |
| Game session time | 60 to 180 seconds | 90 |
| Enemy spawn time | 0.5 to 30 seconds | 3 |

Values are validated on save and persisted in `localStorage`. The limits are exported as `MIN_MATCH_DURATION`, `MAX_MATCH_DURATION`, `MIN_SPAWN_INTERVAL` and `MAX_SPAWN_INTERVAL`.

## Ranking and match history (MSW)

The main menu has **Ranking** and **Match History** buttons that open the **Captain's Log** (two tabs, navigable with the arrow keys), backed by a mocked REST API (MSW service worker in `public/mockServiceWorker.js`, started before the app renders, in development and in the published build):

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/ranking` | Paginated; only matches with the same options (`matchDuration`, `spawnInterval`) are compared |
| `GET` | `/api/history` | Paginated history of the current player |
| `POST` | `/api/matches` | Idempotent by match `id`: `201` when created, `200` with the existing record when repeated |

Ranking order: higher score, then shorter duration, then older match, then `id`. Other players are deterministic fixtures. Confirmed matches are stored in `localStorage` so they survive a refresh.

A finished match is saved locally as **pending** and sent in the background. If the request fails it stays pending, can be retried from the result screen, and is resent automatically the next time the app opens. You can start another match while one is pending.

### Network scenarios

Open **Network scenarios** at the bottom of the main menu and pick a scenario in **Mock API scenario**:

| Scenario | Behavior |
| --- | --- |
| Success | Normal responses (250 ms latency) |
| Empty lists | Ranking and history return no items |
| Slow responses | 3 s latency on every request |
| HTTP 500 on every request | All three endpoints fail with `500` |
| Match submit unavailable | Only `POST /api/matches` fails with `503` |
| Match saved, response lost | The match is stored, but the response is a network error; the retry recovers the existing record without duplicating it |

**Reset mock data** restores the initial scenario and removes the confirmed matches. The selection is stored in `localStorage` under `pirate-battle:mock-scenario`, so it also persists after a refresh.

To reproduce a failure end to end:

1. Choose **Match submit unavailable**, play a match and let it finish. The result screen reports that the match was not saved.
2. Choose **Success** (or reload after switching), then open **Ranking** or **Match History** from the main menu: the pending match is sent on the next load and shows up in both tabs.

## Local storage keys

| Key | Content |
| --- | --- |
| `pirate-battle:options` | Saved options |
| `pirate-battle:last-result` | Last finished match |
| `pirate-battle:pending-matches` | Matches not yet confirmed by the API |
| `pirate-battle:player` | Local player identity |
| `pirate-battle:muted` | Sound muted (`true`) or on |
| `pirate-battle:mock-matches` | Matches confirmed by the mock API |
| `pirate-battle:mock-scenario` | Selected network scenario |

## Accessibility

- Menus are fully keyboard operable with a visible focus ring; the Captain's Log tabs follow the arrow-key tab pattern (`Left`, `Right`, `Home`, `End`).
- The pause dialog traps focus and returns it when closed.
- Form errors are announced (`role="alert"`) and linked to their fields.
- The HUD exposes score, time and health as text for screen readers and is not announced every second; only pausing and critical health are announced through a polite live region.
- Game keys are captured only while a match is on screen.
- Colors were chosen for light text on dark backgrounds; contrast ratios have not been measured with a tool.

## Assets

Sprites (ships, effects, tiles, UI) and sound effects come from the `src/assets/` package supplied with the challenge. No license file was shipped with those files, so check their original source and license before redistributing them. No fonts are bundled; the UI uses system fonts.

## End-to-end tests

The Playwright suite (every test runs on both the desktop and the mobile project, 76 runs in total; the few that only apply to one of them are skipped on the other) covers:

- options validation and persistence;
- match start, HUD, movement, rotation, arena limits and island collision;
- forward and broadside firing with cooldowns;
- ending by time and by death, the simulation freezing afterwards, and a clean restart;
- ranking and match history: pagination, loading, empty and error states, scenario selector, registration in both tabs, recovery from a lost response without duplicates, and a pending match registered after a refresh;
- keyboard navigation, focus trap in the pause dialog, and touch controls on the mobile profile;
- node-level simulation tests for spawning (both enemy types, safe spawn points, fallback) and for enemies steering around the island;
- visual regression of the menu, the Captain's Log, the arena and the result screen.

The suite runs in Chromium on desktop and on a mobile device profile.

For reproducible tests the app exposes a small hook when the URL contains `?e2e`:

- `?e2e=1&seed=N` fixes the random seed and switches the match to manual stepping.
- `window.__game.advance(seconds)` steps the real simulation with the real inputs, and `window.__game.snapshot()` reads its state.

Each test starts from an isolated browser context. Visual baselines are versioned in `e2e/visual.spec.ts-snapshots/` and were generated on Windows with Chromium; regenerate them with `npm run test:e2e:update` if you run on another platform.

## Project structure

```text
src/
  game/
    simulation/   # rules, collisions, config (no PixiJS or DOM)
    loop/         # fixed-step game loop with delta time
    render/       # PixiJS renderer and asset loading
    input/        # keyboard and touch input
  api/            # contracts, Axios client, queries, match sync
  mocks/          # MSW handlers, fixtures, scenarios
  ui/             # React screens and components
  storage.ts      # localStorage persistence
e2e/              # Playwright tests (browser flows and node-level simulation tests)
```

## Performance

Profiled on the production build (Chromium, Intel UHD 620 GPU, 1280 x 720): a 3-minute match averaged **59.98 FPS** with a **p95 frame time of 17.8 ms** and at most 24 entities on screen, and five start-play-quit cycles showed no growth in DOM nodes or listeners (JS heap +0.59 MB between cycles 1 and 5). Hardware, method, raw data, a software-WebGL comparison (13 FPS, rasterization bound) and limitations are in [docs/performance/PERFORMANCE.md](docs/performance/PERFORMANCE.md). Reproduce with `npm run perf`.

## Known limitations

- Profiling covers one machine and browser (desktop Chromium on Windows); mobile devices were not profiled, and GPU memory was not measured.
- Only part of the network failures from the challenge are simulated (see [Network scenarios](#network-scenarios)). Variable latency, out-of-order responses, 4xx responses and per-endpoint failures are not implemented.
- Ship sprites use the 1x assets.
- Enemies use a tangent detour around the island, not full path-finding.
- Visual baselines were generated on Windows and are platform specific.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.