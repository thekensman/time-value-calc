# What Is My Time Worth?

**Real Hourly Wage Calculator** — Your salary says one thing. The math says another.

Most people have never calculated what an hour of their life is actually worth. Not salary ÷ 2,080, but actual take-home pay minus every hidden cost of working, divided by every hour their job consumes. This calculator does that math honestly.

## What It Does

**Real Hourly Wage** — Enter your salary, taxes, commute costs, work clothing, meals, decompression time, unpaid overtime, and more. See your *real* hourly wage vs. your advertised wage, with a full breakdown of where the gap comes from.

**Is It Worth My Time?** — Input any task with a time cost and a dollar cost. The calculator factors in your real wage and how much you enjoy (or hate) the task to tell you whether to DIY or hire someone. Includes quick-decision presets for common scenarios like mowing the lawn, cleaning the house, or doing your own taxes.

**Compare Two Jobs** — Side-by-side comparison of two jobs using real hourly wage methodology. A $60k remote job can beat a $80k office job when you factor in commute, taxes, and decompression time.

## Privacy

All calculations happen in-browser. No data is sent anywhere. No accounts. No tracking.

## Methodology

Inspired by *Your Money or Your Life* by Vicki Robin & Joe Dominguez. Tax estimates use 2024/2025 US federal brackets and simplified flat-rate state approximations. They are not tax advice — consult a CPA for your specific situation.

## Tech Stack

TypeScript, Vite, Vitest (unit tests), Playwright (E2E tests), vanilla CSS, Nginx/Docker for deployment.

## Development

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run test:e2e   # E2E tests
npm run build      # production build
```

## Deployment

```bash
docker compose up -d --build
```

Or deploy `frontend/dist/` to any static host (Cloudflare Pages, Vercel, Netlify).

## License

MIT — Kenneth Cross
