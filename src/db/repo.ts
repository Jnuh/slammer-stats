import { freshClock } from '../domain/gameClock'
import { db } from './schema'

export const createTeam = (name: string) => db.teams.add({ name })
export const listTeams = () => db.teams.toArray()

export const createSeason = (teamId: number, label: string) => db.seasons.add({ teamId, label })
export const listSeasonsForTeam = (teamId: number) => db.seasons.where({ teamId }).toArray()

export const createPlayer = (seasonId: number, name: string, number: number | null) =>
  db.players.add({ seasonId, name, number })
export const listPlayersForSeason = (seasonId: number) => db.players.where({ seasonId }).toArray()

/** Deletes a Player and every Stat Line / field interval recorded for them, across all Games. */
export async function deletePlayer(id: number) {
  await db.transaction('rw', db.players, db.statLines, db.fieldIntervals, async () => {
    await db.statLines.where({ playerId: id }).delete()
    await db.fieldIntervals.where({ playerId: id }).delete()
    await db.players.delete(id)
  })
}

/** Deletes a Season and everything scoped to it: its Roster, its Games, and every Stat Line / field interval recorded in those Games. */
export async function deleteSeason(id: number) {
  await db.transaction('rw', db.seasons, db.players, db.games, db.statLines, db.fieldIntervals, async () => {
    const gameIds = (await db.games.where({ seasonId: id }).primaryKeys()) as number[]
    if (gameIds.length) {
      await db.statLines.where('gameId').anyOf(gameIds).delete()
      await db.fieldIntervals.where('gameId').anyOf(gameIds).delete()
    }
    await db.games.where({ seasonId: id }).delete()
    await db.players.where({ seasonId: id }).delete()
    await db.seasons.delete(id)
  })
}

/** Deletes a Team and every Season under it (which cascades further via deleteSeason). */
export async function deleteTeam(id: number) {
  await db.transaction('rw', [db.teams, db.seasons, db.players, db.games, db.statLines, db.fieldIntervals], async () => {
    const seasonIds = (await db.seasons.where({ teamId: id }).primaryKeys()) as number[]
    for (const seasonId of seasonIds) await deleteSeason(seasonId)
    await db.teams.delete(id)
  })
}

export function createGame(seasonId: number, opponent: string, date: string, halfLengthSeconds: number) {
  return db.games.add({
    seasonId,
    opponent,
    date,
    scoreUs: 0,
    scoreThem: 0,
    ...freshClock(halfLengthSeconds),
  })
}
export const listGamesForSeason = async (seasonId: number) =>
  (await db.games.where({ seasonId }).sortBy('date')).reverse()
