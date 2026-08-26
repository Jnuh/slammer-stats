import { describe, expect, it } from 'vitest'
import { teamRecord } from './record'

describe('teamRecord', () => {
  it('tallies wins, losses, and draws from a list of game scores', () => {
    const record = teamRecord([
      { scoreUs: 3, scoreThem: 1 }, // win
      { scoreUs: 0, scoreThem: 2 }, // loss
      { scoreUs: 2, scoreThem: 2 }, // draw
      { scoreUs: 1, scoreThem: 0 }, // win
    ])
    expect(record).toEqual({ wins: 2, losses: 1, draws: 1 })
  })

  it('returns all zeros for no games', () => {
    expect(teamRecord([])).toEqual({ wins: 0, losses: 0, draws: 0 })
  })
})
