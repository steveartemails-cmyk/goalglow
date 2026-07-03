# GoalGlow ✨

A bright, playful allowance-budgeting web app for ages 10–16. Kids set a savings
goal with a photo — and that photo **glows when they stay on track and fades when
they overspend**. Two modes: a fun **Kid Mode** and a calmer, PIN-locked **Parent Mode**.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

No login, no backend, no real money — everything is stored locally on the device
(`localStorage`, key `goalglow.state.v1`).

## Tech
- React 18 + Vite
- Tailwind CSS v4
- Recharts (weekly + category charts)

## How it's organised
| File | Purpose |
| --- | --- |
| `src/storage.js` | localStorage persistence + the data model (`defaultState`) |
| `src/health.js` | **All health-score & projection math, implemented exactly to spec** |
| `src/content.js` | Categories, tips, badges |
| `src/App.jsx` | State container, day catch-up, badges, routing (onboarding / kid / parent) |
| `src/components/Onboarding.jsx` | Parent-first setup wizard (PIN → name → allowance → split → goal+photo → handover) |
| `src/components/KidApp.jsx` | Kid home: hero daily limit, tracker, tips, streaks, bottom nav |
| `src/components/FadingPhoto.jsx` | The signature fading-photo mechanic |
| `src/components/KidDashboard.jsx` | Progress bar, days-to-goal, charts, badges |
| `src/components/ParentApp.jsx` | PIN gate + parent dashboard & controls |

## Health-score model (per spec)
- Starts at **100**, clamped **0–100**, one evaluation per closed day.
- `dailyLimit = (allowance × spendPercent) ÷ daysInPeriod` (weekly 7 / fortnightly 14 / monthly 30).
- Under/at limit `+5`, no-spend day `+3`, over limit `−(10 + overspendRatio×20)` capped at `−40`.
- Today stays "live" — overspend shows a **projected** hit + amber warning but isn't
  committed until the day closes, so kids can course-correct.
- Score → photo filters: 85–100 bright + sparkle · 60–84 bright · 40–59 light fade ·
  20–39 more fade · 0–19 strongest "needs help" + gentle messaging.
- Likelihood uses the rolling **7-day average**; recovery is always possible.

The numbers live in `src/health.js` and follow the supplied spec exactly — change the
spec before changing them.
