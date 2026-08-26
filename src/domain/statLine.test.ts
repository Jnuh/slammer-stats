import { describe, expect, it } from 'vitest'
import {
  freshStatLine,
  recordDribble,
  recordDuelLost,
  recordDuelWon,
  recordGoal,
  recordRedCard,
  recordSave,
  recordShot,
  recordYellowCard,
} from './statLine'

describe('statLine', () => {
  it('starts every field at zero and not locked out', () => {
    const line = freshStatLine()
    expect(line.goals).toBe(0)
    expect(line.shots).toBe(0)
    expect(line.redCardLockout).toBe(false)
  })

  it('recording a goal also credits a shot, per CONTEXT.md', () => {
    const line = recordGoal(freshStatLine())
    expect(line.goals).toBe(1)
    expect(line.shots).toBe(1)
  })

  it('a shot that is not a goal only increments shots', () => {
    const line = recordShot(freshStatLine())
    expect(line.shots).toBe(1)
    expect(line.goals).toBe(0)
  })

  it('goal and shot accumulate independently across multiple taps', () => {
    let line = freshStatLine()
    line = recordGoal(line)
    line = recordShot(line)
    line = recordGoal(line)
    expect(line.goals).toBe(2)
    expect(line.shots).toBe(3)
  })

  it('duels won/lost, saves, and dribbles are simple independent counters', () => {
    let line = freshStatLine()
    line = recordDuelWon(line)
    line = recordDuelWon(line)
    line = recordDuelLost(line)
    line = recordSave(line)
    line = recordDribble(line)
    expect(line.duelsWon).toBe(2)
    expect(line.duelsLost).toBe(1)
    expect(line.saves).toBe(1)
    expect(line.dribbles).toBe(1)
  })

  it('a first yellow card just records a yellow', () => {
    const line = recordYellowCard(freshStatLine())
    expect(line.yellowCards).toBe(1)
    expect(line.redCards).toBe(0)
    expect(line.redCardLockout).toBe(false)
  })

  it('a second yellow card converts to a red instead of a second yellow', () => {
    let line = freshStatLine()
    line = recordYellowCard(line)
    line = recordYellowCard(line)
    expect(line.yellowCards).toBe(1)
    expect(line.redCards).toBe(1)
    expect(line.redCardLockout).toBe(true)
  })

  it('a direct red card locks the player out for the rest of the game', () => {
    const line = recordRedCard(freshStatLine())
    expect(line.redCards).toBe(1)
    expect(line.redCardLockout).toBe(true)
  })

  it('recording more cards once already locked out does not un-lock or double count oddly', () => {
    let line = freshStatLine()
    line = recordRedCard(line)
    line = recordYellowCard(line)
    expect(line.redCardLockout).toBe(true)
    expect(line.redCards).toBe(1)
    expect(line.yellowCards).toBe(1)
  })
})
