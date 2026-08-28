# Spec: Slammer Stats MVP

Status: ready-for-agent

## What this is

A personal PWA for tracking one youth soccer team's stats, single user, recorded live from the sideline. No backend, no accounts — everything is stored on-device.

Domain vocabulary (Team, Season, Roster, Player, Game, Stat Line, Score, Game Clock, Duel, Dribble, Shot, Yellow Card, Red Card) is defined in [`CONTEXT.md`](../../CONTEXT.md) — not repeated here.

## Architecture

- Vite + React + TypeScript
- Dexie (IndexedDB) for local persistence — no backend, no network calls
- `vite-plugin-pwa` for installability and offline support
- Deployed as static files (free static hosting); all logic and data stay on-device

## Data model (Dexie tables)

- `teams`: id, name
- `seasons`: id, teamId, label
- `players`: id, seasonId, name, number (roster entry — scoped to one season, per CONTEXT.md)
- `games`: id, seasonId, opponent, date, halfLengthSeconds, scoreUs, scoreThem, half (1|2), elapsedInHalf, running (bool), halfEnded (bool)
- `statLines`: id, gameId, playerId, onField (bool), goals, assists, shots, duelsWon, duelsLost, saves, dribbles, yellowCards, redCards, redCardLockout (bool)

**Implementation note**: as built, the Game Clock is stored as one monotonic `elapsedInHalf` counter (seconds since the current half started) rather than separately-tracked remaining/stoppage values — `remainingSeconds`/`stoppageSeconds`/display text are derived from `elapsedInHalf` and `halfLengthSeconds` in `src/domain/gameClock.ts`. Behaviorally identical to what's described above; one stored number is simpler than keeping two in sync.

Minutes played is **not** stored directly — it's derived from a `fieldIntervals` log (gameId, playerId, half (1|2), inSeconds, outSeconds — scoped to a single half so a half transition never has to be reasoned about mid-interval; see `src/domain/fieldTime.ts`) recorded by the in/out toggle, summed per player when a Game's totals/history are viewed. (Simpler than reverse-engineering minutes from clock snapshots later, and matches "computed automatically from the Game Clock and the Player's in/out toggles" in CONTEXT.md.)

## Feature scope (MVP)

1. **Team / Season / Roster management** — basic CRUD. Create a Team, create a Season under a Team with a Roster (list of Players). Not deeply specified — build the obvious thing.
2. **Record a Game live** (the core workflow — see "Live game screen" below).
3. **View stats**:
   - Season totals per player (sum of Stat Line fields + derived minutes across all that season's Games)
   - Game-by-game history for a Season, drill into a Game to see its Stat Lines
   - Team record (win/loss/draw) derived from Game scores across a Season
4. **JSON export** — one button, dumps all Dexie tables to a downloadable `.json` file. No import yet.

## Live game screen (the fiddly part — get this right)

Reference: `prototypes/live-game-ui.prototype.html` for the validated shell (sticky clock/score topbar, bench chips, bottom-sheet pattern) — it's throwaway code with placeholder stats, not to be copied wholesale, but the layout/interaction shell it validated (Option C: minimal row + tap-to-open-sheet) is real design input.

**Game Clock**:
- Half length typed in fresh at the start of each Game (applies to both halves)
- Start/pause control; counts down to 0:00, then counts *up* as stoppage time
- Manual "End Half" button (available once running or paused, any time) and "Start Second Half" button (replaces "End Half" once a half has ended) which resets the countdown to the same half length

**Score**:
- Two tap targets, "+1" for us / for them, directly on the Game — increments immediately, no confirmation
- Crediting a player's Goal (below) also increments the "us" score by one, in the same action — this is the common path and keeps the two in sync automatically
- The direct tap targets stay available as an override for cases the player-goal path can't cover: an opponent's goal, or a goal you don't want to attribute to a specific player yet. Using them does not touch any Stat Line, so score and goal credit can still drift apart in those cases — don't try to force-reconcile them

**Roster / on-field management**:
- A picker (from the Season's Roster) to bring a player into the Game for the first time — this is what creates their Stat Line (implicit attendance, per CONTEXT.md)
- Once added, a player is either on-field or benched; toggle between them
- **Exception**: a player with `redCardLockout = true` cannot be toggled back on-field for the rest of the Game — the toggle must refuse/hide this action for that player

**Per-player row** (on-field players only): a 6-tile grid —
- Goal (increments `goals`, and also increments `shots` per the auto-increment rule below)
- Assist (increments `assists`)
- Duel Won (increments `duelsWon`)
- Duel Lost (increments `duelsLost`)
- OUT (benches the player — subject to the red-card lockout exception above)
- **+** (opens a bottom sheet for that player)

**Bottom sheet** (opened via the row's **+** tile): a flat list (cards not visually separated from routine counters) of the remaining fields —
- Save (increments `saves`)
- Shot (increments `shots` — independently tappable for attempts that don't score)
- Dribble (increments `dribbles`)
- Yellow Card — **requires a confirmation step** before recording (e.g. tap once to arm, tap again to confirm, or a confirm dialog — implementer's choice, just don't let a single mis-tap record it). Recording a second Yellow Card for the same player in the same Game auto-converts to a Red Card instead (increment `redCards`, not a second `yellowCards`) and triggers the Red Card consequence below.
- Red Card — **requires the same confirmation step**. Recording one (directly, or via the two-Yellows conversion) immediately subs the player off-field and sets `redCardLockout = true` for that Stat Line.

**Explicitly out of scope for this screen**: no live undo/correction of any tap (fix mistakes later in a not-yet-built edit view), no position tracking, no goalkeeper flag — every stat field is available on every player uniformly.

## Not building yet (deferred, don't scope-creep into these)

- Sharing / multi-user / any backend
- CSV export, JSON import/restore
- Editing a Game's Stat Lines after the fact
- Charts, trends, cross-season comparisons
