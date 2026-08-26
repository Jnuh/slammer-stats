import { describe, expect, it } from 'vitest'
import { freshClock, start, tick } from './gameClock'
import { secondsPlayed, type FieldInterval } from './fieldTime'

describe('fieldTime', () => {
  it('sums closed intervals within a half', () => {
    const intervals: FieldInterval[] = [
      { half: 1, inSeconds: 0, outSeconds: 600 },
      { half: 1, inSeconds: 900, outSeconds: 1500 },
    ]
    const clock = freshClock(25 * 60)
    expect(secondsPlayed(intervals, clock)).toBe(600 + 600)
  })

  it('sums intervals across both halves', () => {
    const intervals: FieldInterval[] = [
      { half: 1, inSeconds: 0, outSeconds: 1500 },
      { half: 2, inSeconds: 0, outSeconds: 1500 },
    ]
    const clock = freshClock(25 * 60)
    expect(secondsPlayed(intervals, clock)).toBe(3000)
  })

  it('counts an open interval in the current half up to "now" using the live clock', () => {
    let clock = start(freshClock(25 * 60))
    for (let i = 0; i < 300; i++) clock = tick(clock) // 5 live minutes elapsed
    const intervals: FieldInterval[] = [{ half: 1, inSeconds: 0, outSeconds: null }]
    expect(secondsPlayed(intervals, clock)).toBe(300)
  })

  it('does not project an open interval from a half that is not the clock\'s current half', () => {
    const clock = freshClock(25 * 60) // clock is in half 1
    const intervals: FieldInterval[] = [{ half: 2, inSeconds: 0, outSeconds: null }]
    // this shouldn't happen in practice (an interval can't be open in a half that
    // hasn't started), but the function must not silently invent playing time
    expect(secondsPlayed(intervals, clock)).toBe(0)
  })

  it('includes stoppage time toward an open interval', () => {
    let clock = start(freshClock(2))
    for (let i = 0; i < 5; i++) clock = tick(clock) // 2s regulation + 3s stoppage
    const intervals: FieldInterval[] = [{ half: 1, inSeconds: 0, outSeconds: null }]
    expect(secondsPlayed(intervals, clock)).toBe(5)
  })
})
