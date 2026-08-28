import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { createGame, createPlayer, createSeason, createTeam, deletePlayer, deleteSeason, deleteTeam } from './repo'
import { joinGame, recordCounterStat } from './liveGame'

beforeEach(async () => {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((t) => t.clear())))
})

async function seedTeamWithGameData() {
  const teamId = await createTeam('Lightning FC')
  const seasonId = await createSeason(teamId, 'Fall 2026')
  const playerId = await createPlayer(seasonId, 'Sam', 9)
  const gameId = await createGame(seasonId, 'Rivertown', '2026-08-25', 1500)
  await joinGame(gameId, playerId)
  await recordCounterStat(gameId, playerId, 'goal')
  return { teamId, seasonId, playerId, gameId }
}

describe('deletePlayer', () => {
  it('removes the player and their stat lines / field intervals, leaving other players untouched', async () => {
    const { seasonId, playerId, gameId } = await seedTeamWithGameData()
    const otherPlayerId = await createPlayer(seasonId, 'Ruby', 4)
    await joinGame(gameId, otherPlayerId)

    await deletePlayer(playerId)

    expect(await db.players.get(playerId)).toBeUndefined()
    expect(await db.statLines.where({ playerId }).count()).toBe(0)
    expect(await db.fieldIntervals.where({ playerId }).count()).toBe(0)
    expect(await db.players.get(otherPlayerId)).toBeDefined()
    expect(await db.statLines.where({ playerId: otherPlayerId }).count()).toBe(1)
  })
})

describe('deleteSeason', () => {
  it('removes the season, its roster, its games, and every stat line / field interval in those games', async () => {
    const { teamId, seasonId, playerId, gameId } = await seedTeamWithGameData()

    await deleteSeason(seasonId)

    expect(await db.seasons.get(seasonId)).toBeUndefined()
    expect(await db.players.get(playerId)).toBeUndefined()
    expect(await db.games.get(gameId)).toBeUndefined()
    expect(await db.statLines.where({ gameId }).count()).toBe(0)
    expect(await db.fieldIntervals.where({ gameId }).count()).toBe(0)
    expect(await db.teams.get(teamId)).toBeDefined() // the team itself is untouched
  })

  it('leaves a sibling season under the same team untouched', async () => {
    const { teamId, seasonId } = await seedTeamWithGameData()
    const otherSeasonId = await createSeason(teamId, 'Spring 2027')
    await createPlayer(otherSeasonId, 'Ivy', 7)

    await deleteSeason(seasonId)

    expect(await db.seasons.get(otherSeasonId)).toBeDefined()
    expect(await db.players.where({ seasonId: otherSeasonId }).count()).toBe(1)
  })
})

describe('deleteTeam', () => {
  it('cascades through every season, its games, and its stat lines', async () => {
    const { teamId, seasonId, playerId, gameId } = await seedTeamWithGameData()
    const secondSeasonId = await createSeason(teamId, 'Spring 2027')
    const secondPlayerId = await createPlayer(secondSeasonId, 'Ivy', 7)

    await deleteTeam(teamId)

    expect(await db.teams.get(teamId)).toBeUndefined()
    expect(await db.seasons.get(seasonId)).toBeUndefined()
    expect(await db.seasons.get(secondSeasonId)).toBeUndefined()
    expect(await db.players.get(playerId)).toBeUndefined()
    expect(await db.players.get(secondPlayerId)).toBeUndefined()
    expect(await db.games.get(gameId)).toBeUndefined()
    expect(await db.statLines.count()).toBe(0)
    expect(await db.fieldIntervals.count()).toBe(0)
  })

  it('leaves an unrelated team untouched', async () => {
    const { teamId } = await seedTeamWithGameData()
    const otherTeamId = await createTeam('Rivertown United')

    await deleteTeam(teamId)

    expect(await db.teams.get(otherTeamId)).toBeDefined()
  })
})
