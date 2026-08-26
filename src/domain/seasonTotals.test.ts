import { describe, expect, it } from 'vitest'
import { freshClock } from './gameClock'
import { computeSeasonTotals } from './seasonTotals'
import { freshStatLine } from './statLine'
import type { FieldInterval } from './fieldTime'

describe('computeSeasonTotals', () => {
  it('sums a player\'s stats across multiple games and includes derived minutes', () => {
    const players = [{ playerId: 1, name: 'Sam' }]
    const games = [
      { gameId: 10, clock: freshClock(600) },
      { gameId: 11, clock: freshClock(600) },
    ]
    const statLines = [
      { playerId: 1, gameId: 10, line: { ...freshStatLine(), goals: 2 } },
      { playerId: 1, gameId: 11, line: { ...freshStatLine(), goals: 1, assists: 1 } },
    ]
    const fieldIntervals: Array<{ playerId: number; gameId: number; interval: FieldInterval }> = [
      { playerId: 1, gameId: 10, interval: { half: 1, inSeconds: 0, outSeconds: 300 } },
      { playerId: 1, gameId: 11, interval: { half: 1, inSeconds: 0, outSeconds: 600 } },
    ]

    const [totals] = computeSeasonTotals(players, games, statLines, fieldIntervals)
    expect(totals.goals).toBe(3)
    expect(totals.assists).toBe(1)
    expect(totals.secondsPlayed).toBe(900)
  })

  it('includes a roster player with no stat lines yet as all zeros', () => {
    const players = [{ playerId: 2, name: 'Ruby' }]
    const [totals] = computeSeasonTotals(players, [], [], [])
    expect(totals.goals).toBe(0)
    expect(totals.secondsPlayed).toBe(0)
    expect(totals.name).toBe('Ruby')
  })
})
