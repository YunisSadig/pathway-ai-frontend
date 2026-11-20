# Pathway AI — Frontend

**Live website: https://pathway-ai-frontend-roan.vercel.app**

Pathway AI is a global study-abroad platform that helps international students plan their studies using **official, sourced information**. It never invents admission chances and never converts grades. Early release.

- **Who can register:** for now, students from Azerbaijan, Kazakhstan, Georgia, Uzbekistan and Kyrgyzstan. More countries will follow.
- **Where students can study:** the catalogue is built to cover universities worldwide (the EU, the USA, Canada, Japan and more). Today it holds programs from Finland (7 universities, 72 programs) and Poland (8 universities, 14 programs imported on 2026-11-20 from POL-on; no tuition or deadlines yet). A country is listed only once its data has been imported and verified.

- Backend repository: https://github.com/YunisSadig/pathway-ai-backend (hosted on Render; database on Neon)
- Status of the data: the real university catalogue is a **protected beta** (reuse terms of the official data are being confirmed), so it is open only to invited accounts.

## What works today

| Area                                                                                                                                                                                                                                                                                    | Status                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Public site: home, About, How it works, Privacy, Terms, Contact                                                                                                                                                                                                                         | Working                                                                                |
| Accounts: sign up, log in, log out, change password, delete account, data export                                                                                                                                                                                                        | Working (email verification and reset need an email provider: **not switched on yet**) |
| Guided profile (six steps, autosave, resume, review): citizenship/residence, education (school, bachelor's, master's, graduated), grades on the scale printed on your transcript, skills, internships, volunteering, IELTS / TOEFL / SAT, destinations, tuition budget in 13 currencies | Working                                                                                |
| Profile picture (crop, replace, remove)                                                                                                                                                                                                                                                 | Working                                                                                |
| English and Russian, theme (System / Light / Dark) in Settings                                                                                                                                                                                                                          | Working (legal pages and the catalogue screens are English only)                       |
| University and program discovery, saved items                                                                                                                                                                                                                                           | Protected beta (invited accounts)                                                      |
| Scholarships, personalised matching / AI advice                                                                                                                                                                                                                                         | **Not built yet** (clearly labelled "coming soon")                                     |

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS, Radix UI, Vitest + Testing Library, Playwright + axe. Deployed on **Vercel**.

The browser only talks to this site's own `/api/v1/*` route (`src/app/api/v1/[...path]/route.ts`), which forwards to the backend. The backend address and the staging key stay on the server; the student session is an HttpOnly cookie, never in `localStorage`.

## Develop

```bash
npm install
npx playwright install chromium     # once
npm run dev                         # http://localhost:3000
```

Create `.env.local` from `.env.example`. For a local backend set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` (see the backend README); on Vercel it is `same-origin` plus the server-only `API_UPSTREAM_URL` and `API_STAGING_KEY`.

## Test

| Command                                               | Purpose                                                                                                                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                       | Prettier, ESLint, TypeScript, unit tests                                                                                                                             |
| `npm run test:e2e`                                    | Playwright on desktop and mobile with accessibility checks (the API is mocked in the browser; no backend needed). Stop anything already listening on port 3100 first |
| `npm run test:live`                                   | Smoke test of the deployed site and the hosted API (creates and deletes a disposable account): `LIVE_SITE_URL=https://... npm run test:live`                         |
| `npm run verify:deployment -- <site-url> same-origin` | Read-only deployment check (public pages, private-page redirects, closed catalogue)                                                                                  |

## Deployment

Pull requests run CI (format, lint, types, unit, build, e2e). Merging to `main` deploys to Vercel through its Git integration; the workflow `verify-deployment` then waits for the merged commit (`/api/version`) and runs the deployment check and the live smoke test. Details: `docs/deployment.md`. The free backend sleeps when idle and can need up to about two minutes to wake: the interface shows progress and waits up to 140 s. An UptimeRobot check pings the backend's `/actuator/info` every 5 minutes.

## Principles

- Facts shown with their source; unknown stays unknown; no admission probabilities.
- A grade is stored exactly as entered on its named scale; nothing is converted.
- All visible text goes through `src/lib/i18n` (English source, Russian parity enforced by tests).

## Contributing

See `CONTRIBUTING.md` and `CLAUDE.md` (project rules). Use feature branches and pull requests; Conventional Commits; never commit secrets.
