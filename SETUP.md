# What Is My Time Worth? — Setup & Deployment Guide

## Prerequisites

- Node.js ≥ 18 (LTS recommended)
- npm ≥ 9
- Docker + Docker Compose (for containerized deployment)

## Local Development

```bash
git clone https://github.com/thekensman/what-is-my-time-worth.git
cd what-is-my-time-worth/frontend
npm install
npm run dev
```

Opens at http://localhost:3000 with hot-reload.

## Testing

```bash
# Unit tests (Vitest)
npm test

# E2E tests (Playwright — install chromium first)
npx playwright install chromium
npm run test:e2e

# Type checking
npm run lint
```

## Build for Production

```bash
npm run build
```

Static output goes to `frontend/dist/`.

## Deployment Options

### Cloudflare Pages (recommended)

- Build command: `cd frontend && npm install && npm run build`
- Build output directory: `frontend/dist`
- Automatic HTTPS, global CDN, free tier

### Vercel

- Framework: Vite
- Root directory: `frontend`

### Docker (VPS)

```bash
docker compose up -d --build
```

Serves on port 8080. Edit `docker-compose.yml` to change.

### Existing Nginx

1. `cd frontend && npm run build`
2. Copy `frontend/dist/*` to your web root
3. Copy `nginx.conf` to sites-available, update `server_name`
4. `sudo certbot --nginx -d yourdomain.com`

## AdSense Setup

1. Update `frontend/public/ads.txt` with your real publisher ID
2. Add AdSense script to `<head>` in `index.html`
3. Replace ad placeholder divs with real `<ins>` units
4. Rebuild and deploy

## Updating Tax Rates

Edit `frontend/src/engine.ts`:

- `FEDERAL_BRACKETS_SINGLE` / `FEDERAL_BRACKETS_MFJ` — IRS publishes new brackets each fall
- `STANDARD_DEDUCTION_SINGLE` / `STANDARD_DEDUCTION_MFJ` — changes annually
- `SS_WAGE_BASE` — SSA publishes in October
- `STATE_TAX_RATES` — check state revenue department sites

## Project Structure

```
what-is-my-time-worth/
├── frontend/
│   ├── src/
│   │   ├── index.html          # Main page (3 tabs)
│   │   ├── app.ts              # DOM ↔ engine wiring
│   │   ├── engine.ts           # Pure calculation engine
│   │   ├── styles.css          # All styles
│   │   └── __tests__/
│   │       └── engine.test.ts  # Unit tests
│   ├── public/                 # robots.txt, sitemap, ads.txt
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   └── playwright.config.ts
├── e2e/
│   └── app.spec.ts             # Playwright E2E tests
├── nginx.conf
├── Dockerfile
├── docker-compose.yml
├── README.md
├── SETUP.md
└── LICENSE
```
