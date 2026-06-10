# THE DROWNED LEDGER

> An eldritch-corporate clicker. Choose your city. File your tribute. The Ledger hungers.

Static, no-backend **PWA proof of concept** — plain HTML/CSS/JS, installable,
works offline, designed mobile-first (portrait). Multiplayer is **simulated**
in this phase; the architecture leaves a clean seam for the real thing.

## Play loop

1. **Choose your city** — your toil feeds your city's "branch" on a spinning
   globe (canvas, drag to spin).
2. **TOIL** — tap the eye to file tribute.
3. **RITES** — spend tribute on producers (Unpaid Acolyte → Subsidiary Moon)
   and the Ink-Blessed Stylus click upgrade.
4. **LEDGER** — global city leaderboard (simulated drift + your real
   contribution, clearly labeled).
5. **ALMS** — monetisation storefront stub (see below).

## Theme

Merged two of the candidate themes — **eldritch cults × economy**. You work an
office job for a drowned god: tribute instead of gold, acolytes instead of
cursors, "the audit" instead of bosses. Copy, palette (abyss black / ledger
gold / drowned teal) and type (Metamorphous + IBM Plex Mono) all follow from
that one joke taken seriously.

## Engagement systems (implemented)

- **Veil Hour** — a sigil appears at random over the globe; tapping it grants
  ×7 tribute for 30 s (frenzy).
- **Visions** — opt-in 8-second "gaze" granting ×2 for 10 min, 3/day. This is
  the rewarded-ad slot, fully playable without ads.
- **Daily blessing** with streak multiplier.
- **Offline progress** — 50% efficiency, capped at 8 h ("while you slept…").
- **The Wire** — ambient fake news ticker of other branches' activity.
- Haptics (`navigator.vibrate`), synthesized WebAudio SFX (no assets), float
  numbers, tribute arcs flying to your city on the globe.

## Monetisation plan (stubs in ALMS tab)

- **No power sold.** Cosmetics only: globe skins, click sigils, city banners.
- **Fiscal Quarter Pass** — 13-week cosmetic season pass ($3.99).
- **Visions** — rewarded-ad boost (already playable as a free stub).

## Multiplayer — phase 2 seam

All "other player" surfaces are isolated and labeled simulated:
`initSim/tickSim/renderBoard` (leaderboard) and `tickWire` (feed). Phase 2
replaces them with a tiny backend (e.g. one WebSocket fan-out or periodic
fetch of per-city aggregate counters); the client already aggregates per-city,
so the protocol is just `{city: score}` snapshots plus event lines.

## Run locally

```sh
python3 -m http.server 8765
# open http://localhost:8765
```

(Any static server works; service workers need http(s), not file://.)

## Deploy to GitHub Pages

1. Push this directory to a GitHub repo.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Done — all asset paths are relative, so it works under
   `https://<user>.github.io/<repo>/`. Visit on a phone → "Add to Home
   Screen" installs it as an app.

After changing any shell file, bump `VERSION` in `sw.js` so installed clients
pick up the update.

## Files

| file | role |
|---|---|
| `index.html` | app shell: header, ticker, globe, panels, tab bar |
| `styles.css` | theme, layout, animations |
| `app.js` | game state, globe renderer, sim, audio, PWA registration |
| `sw.js` | cache-first shell + stale-while-revalidate fonts |
| `manifest.webmanifest` | install metadata |
| `tools/make_icons.py` | dependency-free PNG icon generator |

Save data lives in `localStorage` under `drowned-ledger-v1`.
