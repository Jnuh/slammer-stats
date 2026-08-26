import { freshClock } from '../domain/gameClock'
import { db } from './schema'

export const createTeam = (name: string) => db.teams.add({ name })
export const listTeams = () => db.teams.toArray()
export const deleteTeam = (id: number) => db.teams.delete(id)

export const createSeason = (teamId: number, label: string) => db.seasons.add({ teamId, label })
export const listSeasonsForTeam = (teamId: number) => db.seasons.where({ teamId }).toArray()
export const deleteSeason = (id: number) => db.seasons.delete(id)

export const createPlayer = (seasonId: number, name: string, number: number | null) =>
  db.players.add({ seasonId, name, number })
export const listPlayersForSeason = (seasonId: number) => db.players.where({ seasonId }).toArray()
export const deletePlayer = (id: number) => db.players.delete(id)

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
