import type { GameClockState } from './gameClock'

/**
 * One stretch of a Player being on-field, scoped to a single half so that a
 * half transition never has to be reasoned about mid-interval (see spec.md:
 * "End Half" force-closes every open interval, "Start Second Half" reopens
 * one for whoever was still on). `outSeconds` is null while the player is
 * still on the field for that half.
 */
export interface FieldInterval {
  half: 1 | 2
  inSeconds: number
  outSeconds: number | null
}

/** Total seconds played across all intervals, projecting the live clock forward for a still-open interval. */
export function secondsPlayed(intervals: FieldInterval[], clock: GameClockState): number {
  return intervals.reduce((total, interval) => {
    if (interval.outSeconds !== null) {
      return total + (interval.outSeconds - interval.inSeconds)
    }
    if (interval.half !== clock.half) return total
    return total + (clock.elapsedInHalf - interval.inSeconds)
  }, 0)
}
