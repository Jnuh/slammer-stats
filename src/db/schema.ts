import Dexie, { type EntityTable } from 'dexie'
import type { FieldIntervalRecord, Game, Player, Season, StatLineRecord, Team } from './types'

export class SlammerStatsDB extends Dexie {
  teams!: EntityTable<Team, 'id'>
  seasons!: EntityTable<Season, 'id'>
  players!: EntityTable<Player, 'id'>
  games!: EntityTable<Game, 'id'>
  statLines!: EntityTable<StatLineRecord, 'id'>
  fieldIntervals!: EntityTable<FieldIntervalRecord, 'id'>

  constructor() {
    super('slammer-stats')
    this.version(1).stores({
      teams: '++id, name',
      seasons: '++id, teamId',
      players: '++id, seasonId',
      games: '++id, seasonId',
      statLines: '++id, gameId, playerId, [gameId+playerId]',
      fieldIntervals: '++id, gameId, playerId, [gameId+playerId]',
    })
  }
}

export const db = new SlammerStatsDB()
