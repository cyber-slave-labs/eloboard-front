# eloboard-front

Unofficial read-only viewer for [eloboard.com/women](https://eloboard.com/women)
(StarCraft: Brood War women's ladder) with a rebuilt frontend.

- `scraper/` — Node scraper. Polite by design: sequential, 2s delay, backoff on
  the origin's shared-host errors. Reconstructs per-month ELO from per-match
  deltas (base 1000), since the origin only serves current ELO.
- `data/` — committed JSON snapshots (players, per-player match records with
  maps, derived monthly tables, map/matchup stats).
- `web/` — Vite + React + Tailwind static SPA (rankings, player profiles with
  ELO trends, head-to-head, map balance).

```sh
npm install && npm test          # scraper parser self-check (offline fixtures)
node scraper/scrape.mjs daily    # incremental update (needs Korean IP)
cd web && npm install && npm run dev
```

Match registration/corrections belong on the origin site; this is a viewer.
