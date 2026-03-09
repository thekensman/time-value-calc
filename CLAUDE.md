# CLAUDE.md — AI Assistant Guide for `what-is-my-time-worth`

> **What is this project?** A zero-dependency, fully in-browser financial calculator that computes a user's *real hourly wage* after taxes, work-related costs, and time costs. Deployed at https://whatismytimeworth.app.

---

## Table of Contents

1. [Repository Layout](#repository-layout)
2. [Architecture Overview](#architecture-overview)
3. [Key Files](#key-files)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Code Conventions](#code-conventions)
7. [Calculation Logic](#calculation-logic)
8. [CSS & Styling](#css--styling)
9. [Deployment](#deployment)
10. [Common Tasks](#common-tasks)
11. [Gotchas & Constraints](#gotchas--constraints)

---

## Repository Layout

```
time-value-calc/
├── frontend/                  # All application source code
│   ├── src/
│   │   ├── index.html         # Single-page app shell (3 tabs, SEO meta, JSON-LD)
│   │   ├── app.ts             # DOM wiring layer — connects inputs to engine
│   │   ├── engine.ts          # Pure calculation engine — zero side effects
│   │   ├── styles.css         # All styling (CSS variables, BEM-like classes)
│   │   └── __tests__/
│   │       └── engine.test.ts # Vitest unit tests for engine.ts
│   ├── public/
│   │   ├── robots.txt
│   │   ├── ads.txt            # AdSense publisher ID placeholder
│   │   └── sitemap.xml
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts         # Dev server on port 3000, root = src/
│   ├── vitest.config.ts       # JSDOM environment, src/__tests__/**
│   └── playwright.config.ts   # E2E, Chromium only, base URL localhost:3000
├── e2e/
│   └── app.spec.ts            # Playwright end-to-end tests
├── Dockerfile                 # Multi-stage: Node build → Nginx serve
├── docker-compose.yml         # Port 8080→80, container: what-is-my-time-worth
├── nginx.conf                 # HTTPS, gzip, 30d asset cache, SPA fallback
├── README.md
├── SETUP.md                   # Developer setup & deployment guide
├── run_tests.ts               # Standalone CLI test runner (bypasses Vitest)
└── CLAUDE.md                  # This file
```

---

## Architecture Overview

```
HTML Inputs (index.html)
        │
        │  data-calc="wage|decision|compare" attribute
        ▼
    app.ts  ──── strVal(id) / numVal(id) ──── reads raw DOM values
        │
        │  calls calculateRealWage() / calculateDecision() / compareJobs()
        ▼
    engine.ts  ──── pure functions, no DOM access
        │
        │  returns typed result objects
        ▼
    app.ts  ──── setText(id, value) / updates classList ──── writes to DOM
```

**Critical constraint:** `engine.ts` must remain pure. It has **no DOM imports**, no `document` access, and no side effects. All I/O lives in `app.ts`.

---

## Key Files

### `frontend/src/engine.ts` — Business Logic

The heart of the application. Contains:

| Export | Purpose |
|--------|---------|
| `calculateRealWage(inputs: WageInputs): WageResult` | Main Tab 1 calculation |
| `calculateDecision(inputs: DecisionInputs): DecisionResult` | Tab 2 DIY vs Hire |
| `compareJobs(jobA: JobInputs, jobB: JobInputs): JobComparisonResult` | Tab 3 comparison |
| `calcFederalIncomeTax(income, filingStatus)` | 2024/2025 IRS brackets |
| `calcStateTax(income, stateRate)` | Flat-rate state approximation |
| `calcFICA(income)` | Social Security + Medicare |
| `STATE_TAX_RATES` | Array of 51 `{state, rate}` entries |
| `DECISION_PRESETS` | 6 `DecisionPreset` tiles |
| `fmtCurrency(n)` | `$1,234.56` formatting |
| `fmtPercent(n)` | `12.3%` formatting |
| `fmtHoursMinutes(h)` | `2h 30m` formatting |
| `fmtNumber(n)` | Locale-aware number |

**TypeScript interfaces (all in engine.ts):**
- `WageInputs` — 14 numeric/string parameters
- `WageResult` — 28 output fields
- `DecisionInputs` — task hours, cost, enjoyment level, wage
- `DecisionResult` — verdict, savings, explanation
- `JobInputs` — salary + same tax/cost fields as WageInputs
- `JobComparisonResult` — two `WageResult` objects + winner metadata
- `DecisionPreset` — id, label, icon, default hours/cost/enjoyment

---

### `frontend/src/app.ts` — DOM Wiring

| Function | Purpose |
|----------|---------|
| `init()` | Bootstrap — runs on `DOMContentLoaded` |
| `populateStates()` | Fill `<select>` dropdowns with `STATE_TAX_RATES` |
| `initTabs()` | Tab switching + `data-tab` attribute logic |
| `renderPresets()` | Render decision preset tiles, bind click handlers |
| `updateWage()` | Read Tab 1 inputs → call engine → write results |
| `updateDecision()` | Read Tab 2 inputs → call engine → write results |
| `updateCompare()` | Read Tab 3 inputs → call engine → write results |
| `recalculate(tab)` | Dispatcher: routes to the right `update*` function |
| `initInputListeners()` | Binds `input`/`change` on all `[data-calc]` elements |

**Cross-tab state (module-level variables):**
- `calculatedRealWage` — set by Tab 1, auto-populates Tab 2's wage field
- `decisionWageManuallyEdited` — flag; prevents auto-fill from overwriting user edits

---

### `frontend/src/index.html` — UI Shell

- Three-tab SPA: `#tab-wage`, `#tab-decision`, `#tab-compare`
- All inputs use `id` attributes prefixed by tab:
  - Wage tab: `w-salary`, `w-filing-status`, `w-state-tax`, `w-commute-days`, etc.
  - Decision tab: `d-task-hours`, `d-task-cost`, `d-enjoyment`, `d-wage`
  - Job compare: `ja-salary`, `ja-state`, `jb-salary`, `jb-state`, etc.
- Result elements also use matching `id`s; `app.ts` writes via `setText(id, value)`
- Contains SEO: canonical tag, OG meta, Schema.org JSON-LD (WebApplication + FAQPage)

---

## Development Workflow

### Prerequisites
- Node.js 18+ and npm 9+

### Setup
```bash
cd frontend
npm install
```

### Local Development
```bash
npm run dev          # Dev server at http://localhost:3000 (HMR enabled)
```

### Type Checking (no emit)
```bash
npm run lint         # tsc --noEmit — strict mode, fails on unused vars
```

### Production Build
```bash
npm run build        # Outputs to frontend/../dist (parent of src/)
npm run preview      # Serve the dist/ build locally
```

### Running All Tests
```bash
# Unit tests (fast, no browser)
npm test

# Unit tests in watch mode
npm run test:watch

# E2E tests (requires dev server running or auto-starts it)
npm run test:e2e
```

---

## Testing

### Unit Tests — Vitest + JSDOM

**File:** `frontend/src/__tests__/engine.test.ts`

- Tests cover: federal tax brackets, FICA, state taxes, `calculateRealWage`, `calculateDecision`, `compareJobs`, all formatters, and edge cases
- Run with: `npm test` from `frontend/`
- Config: `vitest.config.ts` — JSDOM environment, glob `src/__tests__/**/*.test.ts`

**Adding tests:** Place in `frontend/src/__tests__/`. Test only `engine.ts` functions — do not test DOM behavior in unit tests (that's for E2E).

### End-to-End Tests — Playwright

**File:** `e2e/app.spec.ts`

- Chromium only (Desktop Chrome viewport)
- Auto-starts `npm run dev` if not already running
- Base URL: `http://localhost:3000`
- Covers: all three tab flows, preset tile clicks, cross-tab wage auto-fill

**Run locally:**
```bash
npm run test:e2e      # from frontend/
```

### Standalone Test Runner

**File:** `run_tests.ts` (project root)

```bash
npx tsx run_tests.ts  # from project root
```

Direct import of engine functions, custom assertion framework, useful for quick sanity checks without the full test suite.

---

## Code Conventions

### TypeScript

- **Strict mode** is on. No `any`, no unused variables/parameters.
- All data flowing between functions must have explicit interfaces defined in `engine.ts`.
- Use `parseFloat(str) || 0` for safe numeric parsing from DOM strings.
- Functions never throw on bad input — they return 0 or safe defaults.

### Naming

| Category | Convention | Example |
|----------|-----------|---------|
| Types/Interfaces | PascalCase | `WageInputs`, `DecisionResult` |
| Functions | camelCase | `calculateRealWage`, `fmtCurrency` |
| Constants | UPPER_SNAKE_CASE | `FEDERAL_BRACKETS_SINGLE`, `STATE_TAX_RATES` |
| HTML `id`s | kebab-case with tab prefix | `w-salary`, `d-enjoyment`, `ja-state` |
| CSS classes | BEM-like | `.card`, `.card__title`, `.card--active` |

### File Responsibilities

- **engine.ts only:** Pure calculations, type definitions, data constants, formatters.
- **app.ts only:** DOM reads/writes, event listeners, tab logic, preset rendering.
- **Never** import from `app.ts` into `engine.ts`.
- **Never** access `document` or `window` inside `engine.ts`.

### Error Handling

- Division by zero → return `0` (not throw)
- Negative income inputs → clamp to `0`
- `Infinity` in results → display as `"—"` in the UI (handled in `app.ts`)
- No try/catch blocks needed — inputs are always numbers after `parseFloat() || 0`

---

## Calculation Logic

### Real Hourly Wage (Tab 1)

```
real_wage = (annual_takehome - annual_work_costs) / total_annual_work_hours

annual_takehome = gross_salary - federal_tax - state_tax - fica - health_insurance - retirement_401k

annual_work_costs = commute_cost + work_meals + work_clothing + childcare + other_work_costs

total_annual_work_hours = (scheduled_hours + unpaid_overtime + commute_time + getting_ready_time + decompression_time) × workdays_per_year
```

**Federal Tax (2024/2025 brackets):**
- Single filer: standard deduction $14,600; 7 brackets 10%–37%
- Married Filing Jointly: standard deduction $29,200; wider brackets
- FICA: Social Security 6.2% up to $176,100; Medicare 1.45% + 0.9% above $200,000

**State Tax:**
- Flat-rate approximations for all 50 states + DC
- "No state tax" option (0%) for states like TX, FL, WA

### DIY vs Hire Decision (Tab 2)

```
adjusted_diy_cost = hours × real_wage × enjoyment_multiplier

enjoyment_multipliers:
  hate    = 1.5
  dislike = 1.2
  neutral = 1.0
  like    = 0.7
  love    = 0.3

verdict = "hire" if hire_cost < adjusted_diy_cost, else "diy"
close_call = true if |hire_cost - adjusted_diy_cost| / max(both) < 0.15
```

### Job Comparison (Tab 3)

- Runs `calculateRealWage()` independently for Job A and Job B
- Winner = higher `realWage`
- Tie threshold: wage difference < $0.50/hr

---

## CSS & Styling

**File:** `frontend/src/styles.css`

### CSS Variables (root)
```css
--bg: #0b0d12          /* deep charcoal background */
--surface: #13161e     /* card surface */
--accent: #d4a44e      /* warm amber accent */
--text: #e8e6e1        /* off-white text */
--muted: #6b7280       /* muted/secondary text */
```

### Fonts
- Body/headings: **Lora** (serif) — loaded via Google Fonts
- Numbers/code: **IBM Plex Mono** — monospace for result values

### Responsive Design
- Mobile-first with `clamp()` for font sizes
- Flexbox for all layouts; no CSS Grid
- Breakpoints handled via `clamp()` rather than `@media` blocks where possible
- Tab panels show/hide via `.hidden` class toggling

### Class Conventions
- `.card` — base surface container
- `.card__title`, `.card__body` — BEM elements
- `.card--active` — BEM modifier (e.g., active tab)
- `.hidden` — `display: none`
- `.result-value` — large monospace result numbers
- `.insight-card` — contextual callout cards in results area

---

## Deployment

### Recommended: Cloudflare Pages

1. Connect GitHub repo
2. Build command: `cd frontend && npm install && npm run build`
3. Output directory: `dist`

### Docker

```bash
docker compose up --build   # Serves on http://localhost:8080
```

Multi-stage Dockerfile: Node 20-alpine builds → Nginx-alpine serves.

### Nginx (self-hosted)

See `nginx.conf` — configured for:
- HTTPS with Let's Encrypt (paths: `/etc/letsencrypt/live/...`)
- `www.` → apex redirect
- Gzip compression for text assets
- 30-day cache headers for static assets
- SPA fallback: `try_files $uri $uri/ /index.html`
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options

### Vercel

Use `vercel.json` with rewrites for SPA routing if needed (not included — add if deploying to Vercel).

---

## Common Tasks

### Update Tax Brackets (Annual IRS Changes)

Edit `frontend/src/engine.ts`:
- `FEDERAL_BRACKETS_SINGLE` — update thresholds and rates
- `FEDERAL_BRACKETS_MFJ` — married filing jointly brackets
- `STANDARD_DEDUCTION_SINGLE` / `STANDARD_DEDUCTION_MFJ` — deduction amounts
- `SS_WAGE_BASE` — Social Security wage cap (changes annually)
- `calcFICA()` — update Medicare surtax threshold if changed

### Add a New Decision Preset

In `frontend/src/engine.ts`, add to `DECISION_PRESETS`:
```typescript
{
  id: "unique-id",
  label: "Task Name",
  icon: "🔧",           // single emoji
  defaultHours: 1,
  defaultCost: 50,
  defaultEnjoyment: "neutral"  // "hate"|"dislike"|"neutral"|"like"|"love"
}
```

The preset tile renders automatically in `app.ts` via `renderPresets()`.

### Add a New State Tax Rate

In `frontend/src/engine.ts`, add to `STATE_TAX_RATES` array:
```typescript
{ state: "State Name", rate: 0.05 }  // 5% flat rate
```

Array is sorted alphabetically in the UI — insert in alphabetical order.

### Add a New Input Field

1. Add `<input id="w-new-field" ...>` to `index.html` with `data-calc="wage"` attribute
2. Add the field to the `WageInputs` interface in `engine.ts`
3. Read it in `updateWage()` in `app.ts`: `const newField = numVal('w-new-field')`
4. Pass it to `calculateRealWage()` and use it in the engine calculation
5. Add a corresponding `WageResult` output field if needed
6. Add unit tests in `engine.test.ts`

### Add a New Result Display

1. Add `<span id="w-new-result">—</span>` in `index.html`
2. In `app.ts`'s `updateWage()`, add: `setText('w-new-result', fmtCurrency(result.newField))`

---

## Gotchas & Constraints

1. **Zero runtime dependencies** — Do not add `npm` runtime packages. All code runs in the browser as-is. DevDependencies for build/test are fine.

2. **Engine purity** — Never add DOM access, `console.log`, or side effects to `engine.ts`. If you need to debug, do it in `app.ts` or tests.

3. **State tax is flat-rate** — `calcStateTax()` uses flat approximations, not progressive brackets. This is a known simplification. When updating, keep it as flat rates unless the entire architecture changes.

4. **Filing status string** — `WageInputs.filingStatus` is `"single" | "mfj"`. Check this type when adding new functionality.

5. **Vite root is `src/`** — `vite.config.ts` sets `root: 'src'`. The `index.html` lives inside `src/`, not at the project root. Build output goes to `../dist` (i.e., `frontend/dist`).

6. **Input prefixes are load-bearing** — The `w-`, `d-`, `ja-`, `jb-` prefixes on HTML `id`s are used by `[data-calc]` listeners. If you rename an `id`, update both the HTML and the `numVal()`/`strVal()` calls in `app.ts`.

7. **Cross-tab wage sync** — When Tab 1 recalculates, `calculatedRealWage` updates and auto-fills `d-wage` in Tab 2 — but only if `decisionWageManuallyEdited` is `false`. If adding logic around Tab 2's wage field, respect this flag.

8. **Playwright tests need the dev server** — E2E tests auto-start `npm run dev`. If port 3000 is in use, tests will fail with connection errors.

9. **TypeScript strict mode** — `noUnusedLocals` and `noUnusedParameters` are enabled. Unused variables will fail `npm run lint` and the build. Remove or use all declared variables.

10. **No backend** — Everything is static HTML/JS. There is no API, no database, no server-side logic. All calculations happen client-side.
