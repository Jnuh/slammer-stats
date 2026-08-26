import type { FieldInterval } from './fieldTime'
import { secondsPlayed } from './fieldTime'
import type { GameClockState } from './gameClock'
import { freshStatLine, type StatLine } from './statLine'

export interface RosterPlayerRef {
  playerId: number
  name: string
}

export interface GameClockRef {
  gameId: number
  clock: GameClockState
}

export interface StatLineRef {
  playerId: number
  gameId: number
  line: StatLine
}

export interface FieldIntervalRef {
  playerId: number
  gameId: number
  interval: FieldInterval
}

export interface PlayerSeasonTotals extends StatLine {
  playerId: number
  name: string
  secondsPlayed: number
}

/** Aggregates a Season's Stat Lines and field time into one row per Roster player, across every Game in the Season. */
export function computeSeasonTotals(
  players: RosterPlayerRef[],
  games: GameClockRef[],
  statLines: StatLineRef[],
  fieldIntervals: FieldIntervalRef[],
): PlayerSeasonTotals[] {
  const clockByGame = new Map(games.map((g) => [g.gameId, g.clock]))

  return players.map(({ playerId, name }) => {
    const totals: StatLine = freshStatLine()
    let seconds = 0

    for (const { line } of statLines.filter((s) => s.playerId === playerId)) {
      totals.goals += line.goals
      totals.assists += line.assists
      totals.shots += line.shots
      totals.duelsWon += line.duelsWon
      totals.duelsLost += line.duelsLost
      totals.saves += line.saves
      totals.dribbles += line.dribbles
      totals.yellowCards += line.yellowCards
      totals.redCards += line.redCards
    }

    const byGame = new Map<number, FieldInterval[]>()
    for (const fi of fieldIntervals.filter((f) => f.playerId === playerId)) {
      const list = byGame.get(fi.gameId) ?? []
      list.push(fi.interval)
      byGame.set(fi.gameId, list)
    }
    for (const [gameId, intervals] of byGame) {
      const clock = clockByGame.get(gameId)
      if (clock) seconds += secondsPlayed(intervals, clock)
    }

    return { playerId, name, ...totals, secondsPlayed: seconds }
  })
}
