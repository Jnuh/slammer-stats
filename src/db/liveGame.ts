import * as clock from '../domain/gameClock'
import type { GameClockState } from '../domain/gameClock'
import * as statLine from '../domain/statLine'
import { db } from './schema'
import type { Game } from './types'

/** The Game record's clock fields, in the shape src/domain/gameClock.ts operates on. Shared with pages that need to read (not just mutate) the clock. */
export function clockState(game: Game): GameClockState {
  return {
    halfLengthSeconds: game.halfLengthSeconds,
    half: game.half,
    elapsedInHalf: game.elapsedInHalf,
    running: game.running,
    halfEnded: game.halfEnded,
  }
}

async function applyClock(gameId: number, transform: (c: GameClockState) => GameClockState) {
  const game = await db.games.get(gameId)
  if (!game) return
  const next = transform(clockState(game))
  await db.games.update(gameId, next)
}

export const startClock = (gameId: number) => applyClock(gameId, clock.start)
export const pauseClock = (gameId: number) => applyClock(gameId, clock.pause)
export const tickClock = (gameId: number) => applyClock(gameId, clock.tick)

export async function addScore(gameId: number, team: 'us' | 'them') {
  const game = await db.games.get(gameId)
  if (!game) return
  const field = team === 'us' ? 'scoreUs' : 'scoreThem'
  await db.games.update(gameId, { [field]: game[field] + 1 })
}

/** Brings a Roster player into the Game for the first time: creates their Stat Line and opens a field interval. Implicit attendance, per CONTEXT.md. */
export async function joinGame(gameId: number, playerId: number) {
  await db.transaction('rw', db.games, db.statLines, db.fieldIntervals, async () => {
    const game = await db.games.get(gameId)
    if (!game) return
    const existing = await db.statLines.where({ gameId, playerId }).first()
    if (existing) return
    await db.statLines.add({ ...statLine.freshStatLine(), gameId, playerId, onField: true })
    await db.fieldIntervals.add({ gameId, playerId, half: game.half, inSeconds: game.elapsedInHalf, outSeconds: null })
  })
}

async function closeOpenInterval(gameId: number, playerId: number, half: 1 | 2, atSeconds: number) {
  const open = await db.fieldIntervals.where({ gameId, playerId }).filter((iv) => iv.half === half && iv.outSeconds === null).first()
  if (open) await db.fieldIntervals.update(open.id, { outSeconds: atSeconds })
}

/** Toggles a player on/off field. Refuses to bring a red-card-locked-out player back on. */
export async function toggleOnField(gameId: number, playerId: number) {
  await db.transaction('rw', db.games, db.statLines, db.fieldIntervals, async () => {
    const game = await db.games.get(gameId)
    const line = await db.statLines.where({ gameId, playerId }).first()
    if (!game || !line) return

    if (line.onField) {
      await closeOpenInterval(gameId, playerId, game.half, game.elapsedInHalf)
      await db.statLines.update(line.id, { onField: false })
      return
    }

    if (line.redCardLockout) return // can't come back on for the rest of the game
    await db.fieldIntervals.add({ gameId, playerId, half: game.half, inSeconds: game.elapsedInHalf, outSeconds: null })
    await db.statLines.update(line.id, { onField: true })
  })
}

type CounterStat = 'goal' | 'shot' | 'assist' | 'duelWon' | 'duelLost' | 'save' | 'dribble'

const counterAppliers: Record<CounterStat, (l: statLine.StatLine) => statLine.StatLine> = {
  goal: statLine.recordGoal,
  shot: statLine.recordShot,
  assist: statLine.recordAssist,
  duelWon: statLine.recordDuelWon,
  duelLost: statLine.recordDuelLost,
  save: statLine.recordSave,
  dribble: statLine.recordDribble,
}

export async function recordCounterStat(gameId: number, playerId: number, stat: CounterStat) {
  const line = await db.statLines.where({ gameId, playerId }).first()
  if (!line) return
  await db.statLines.update(line.id, counterAppliers[stat](line))
}

async function recordCardAndMaybeBench(gameId: number, playerId: number, apply: (l: statLine.StatLine) => statLine.StatLine) {
  await db.transaction('rw', db.games, db.statLines, db.fieldIntervals, async () => {
    const game = await db.games.get(gameId)
    const line = await db.statLines.where({ gameId, playerId }).first()
    if (!game || !line) return

    const next = apply(line)
    await db.statLines.update(line.id, next)

    const justLockedOut = next.redCardLockout && !line.redCardLockout
    if (justLockedOut && line.onField) {
      await closeOpenInterval(gameId, playerId, game.half, game.elapsedInHalf)
      await db.statLines.update(line.id, { onField: false })
    }
  })
}

export const recordYellowCard = (gameId: number, playerId: number) => recordCardAndMaybeBench(gameId, playerId, statLine.recordYellowCard)
export const recordRedCard = (gameId: number, playerId: number) => recordCardAndMaybeBench(gameId, playerId, statLine.recordRedCard)

/** Pauses the clock, marks the half ended, and force-closes every still-open interval for this half. */
export async function endHalf(gameId: number) {
  await db.transaction('rw', db.games, db.fieldIntervals, async () => {
    const game = await db.games.get(gameId)
    if (!game) return
    const next = clock.endHalf(clockState(game))
    await db.games.update(gameId, next)

    const open = await db.fieldIntervals.where({ gameId }).filter((iv) => iv.half === game.half && iv.outSeconds === null).toArray()
    await Promise.all(open.map((iv) => db.fieldIntervals.update(iv.id, { outSeconds: game.elapsedInHalf })))
  })
}

/** Resets the clock for half 2 and opens a fresh interval for every player still marked on-field. */
export async function startSecondHalf(gameId: number) {
  await db.transaction('rw', db.games, db.statLines, db.fieldIntervals, async () => {
    const game = await db.games.get(gameId)
    if (!game) return
    const next = clock.startSecondHalf(clockState(game))
    await db.games.update(gameId, next)

    const onFieldLines = await db.statLines.where({ gameId }).filter((l) => l.onField).toArray()
    await Promise.all(
      onFieldLines.map((line) =>
        db.fieldIntervals.add({ gameId, playerId: line.playerId, half: 2, inSeconds: 0, outSeconds: null }),
      ),
    )
  })
}
