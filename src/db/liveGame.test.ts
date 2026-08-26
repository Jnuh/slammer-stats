import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  addScore,
  endHalf,
  joinGame,
  recordRedCard,
  recordYellowCard,
  startSecondHalf,
  toggleOnField,
} from './liveGame'

async function setupGame() {
  const teamId = await db.teams.add({ name: 'Lightning FC' })
  const seasonId = await db.seasons.add({ teamId, label: '2026' })
  const playerId = await db.players.add({ seasonId, name: 'Sam', number: 9 })
  const gameId = await db.games.add({
    seasonId,
    opponent: 'Rivertown',
    date: '2026-08-25',
    halfLengthSeconds: 60,
    scoreUs: 0,
    scoreThem: 0,
    half: 1,
    elapsedInHalf: 0,
    running: false,
    halfEnded: false,
  })
  return { gameId, playerId }
}

beforeEach(async () => {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((t) => t.clear())))
})

describe('liveGame repo', () => {
  it('joining a game creates a fresh, on-field stat line and opens a field interval', async () => {
    const { gameId, playerId } = await setupGame()
    await joinGame(gameId, playerId)

    const line = await db.statLines.where({ gameId, playerId }).first()
    expect(line?.onField).toBe(true)
    expect(line?.goals).toBe(0)

    const intervals = await db.fieldIntervals.where({ gameId, playerId }).toArray()
    expect(intervals).toHaveLength(1)
    expect(intervals[0].outSeconds).toBeNull()
  })

  it('score increments are independent of any player stat line', async () => {
    const { gameId } = await setupGame()
    await addScore(gameId, 'us')
    await addScore(gameId, 'us')
    await addScore(gameId, 'them')
    const game = await db.games.get(gameId)
    expect(game?.scoreUs).toBe(2)
    expect(game?.scoreThem).toBe(1)
  })

  it('a red card immediately benches the player and closes their open interval', async () => {
    const { gameId, playerId } = await setupGame()
    await joinGame(gameId, playerId)
    await db.games.update(gameId, { elapsedInHalf: 30 })

    await recordRedCard(gameId, playerId)

    const line = await db.statLines.where({ gameId, playerId }).first()
    expect(line?.onField).toBe(false)
    expect(line?.redCardLockout).toBe(true)

    const [interval] = await db.fieldIntervals.where({ gameId, playerId }).toArray()
    expect(interval.outSeconds).toBe(30)
  })

  it('a red-card-locked-out player cannot be toggled back on field', async () => {
    const { gameId, playerId } = await setupGame()
    await joinGame(gameId, playerId)
    await recordRedCard(gameId, playerId)

    await toggleOnField(gameId, playerId)

    const line = await db.statLines.where({ gameId, playerId }).first()
    expect(line?.onField).toBe(false)
  })

  it('two yellow cards convert to a red and trigger the same lockout/bench behavior', async () => {
    const { gameId, playerId } = await setupGame()
    await joinGame(gameId, playerId)

    await recordYellowCard(gameId, playerId)
    let line = await db.statLines.where({ gameId, playerId }).first()
    expect(line?.onField).toBe(true)

    await recordYellowCard(gameId, playerId)
    line = await db.statLines.where({ gameId, playerId }).first()
    expect(line?.redCardLockout).toBe(true)
    expect(line?.onField).toBe(false)
  })

  it('ending the half closes every open interval at the current elapsed time', async () => {
    const { gameId, playerId } = await setupGame()
    await joinGame(gameId, playerId)
    await db.games.update(gameId, { elapsedInHalf: 45, running: true })

    await endHalf(gameId)

    const [interval] = await db.fieldIntervals.where({ gameId, playerId }).toArray()
    expect(interval.outSeconds).toBe(45)
    const game = await db.games.get(gameId)
    expect(game?.halfEnded).toBe(true)
    expect(game?.running).toBe(false)
  })

  it('starting the second half reopens a fresh interval only for players still on field', async () => {
    const { gameId, playerId } = await setupGame()
    await joinGame(gameId, playerId)
    await db.games.update(gameId, { elapsedInHalf: 60 })
    await endHalf(gameId)

    await startSecondHalf(gameId)

    const intervals = await db.fieldIntervals.where({ gameId, playerId }).toArray()
    expect(intervals).toHaveLength(2)
    const openInterval = intervals.find((i) => i.outSeconds === null)
    expect(openInterval?.half).toBe(2)
    expect(openInterval?.inSeconds).toBe(0)
    const game = await db.games.get(gameId)
    expect(game?.half).toBe(2)
    expect(game?.running).toBe(true)
  })

  it('starting the second half does not reopen an interval for a benched player', async () => {
    const { gameId, playerId } = await setupGame()
    await joinGame(gameId, playerId)
    await toggleOnField(gameId, playerId) // bench them before half ends
    await endHalf(gameId)

    await startSecondHalf(gameId)

    const intervals = await db.fieldIntervals.where({ gameId, playerId }).toArray()
    expect(intervals).toHaveLength(1) // just the original half-1 interval, already closed
    expect(intervals[0].outSeconds).not.toBeNull()
  })
})
