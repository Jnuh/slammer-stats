import { describe, expect, it } from 'vitest'
import {
  displayText,
  endHalf,
  freshClock,
  pause,
  remainingSeconds,
  start,
  startSecondHalf,
  stoppageSeconds,
  tick,
} from './gameClock'

describe('gameClock', () => {
  it('starts paused in half 1 with the full half length remaining', () => {
    const clock = freshClock(25 * 60)
    expect(clock.half).toBe(1)
    expect(clock.running).toBe(false)
    expect(remainingSeconds(clock)).toBe(25 * 60)
    expect(stoppageSeconds(clock)).toBe(0)
  })

  it('counts down once started, one tick per second', () => {
    let clock = start(freshClock(60))
    clock = tick(clock)
    clock = tick(clock)
    expect(remainingSeconds(clock)).toBe(58)
    expect(clock.running).toBe(true)
  })

  it('does not advance while paused', () => {
    let clock = start(freshClock(60))
    clock = tick(clock)
    clock = pause(clock)
    clock = tick(clock)
    clock = tick(clock)
    expect(remainingSeconds(clock)).toBe(59)
    expect(clock.running).toBe(false)
  })

  it('counts up as stoppage time once it reaches 0:00, instead of going negative', () => {
    let clock = start(freshClock(2))
    clock = tick(clock)
    clock = tick(clock)
    clock = tick(clock)
    clock = tick(clock)
    expect(remainingSeconds(clock)).toBe(0)
    expect(stoppageSeconds(clock)).toBe(2)
  })

  it('formats remaining time as m:ss and stoppage as +m:ss', () => {
    let clock = start(freshClock(65))
    clock = tick(clock)
    expect(displayText(clock)).toBe('1:04')
    for (let i = 0; i < 65; i++) clock = tick(clock)
    expect(displayText(clock)).toBe('+0:01')
  })

  it('endHalf pauses the clock and marks the half ended', () => {
    let clock = start(freshClock(60))
    clock = tick(clock)
    clock = endHalf(clock)
    expect(clock.running).toBe(false)
    expect(clock.halfEnded).toBe(true)
    // ending doesn't discard the stoppage time already accrued
    clock = tick(clock)
    expect(remainingSeconds(clock)).toBe(59)
  })

  it('startSecondHalf resets to a fresh countdown of the same half length and resumes running', () => {
    let clock = start(freshClock(60))
    for (let i = 0; i < 65; i++) clock = tick(clock) // run into stoppage
    clock = endHalf(clock)
    clock = startSecondHalf(clock)
    expect(clock.half).toBe(2)
    expect(clock.halfEnded).toBe(false)
    expect(clock.running).toBe(true)
    expect(remainingSeconds(clock)).toBe(60)
    expect(stoppageSeconds(clock)).toBe(0)
  })
})
