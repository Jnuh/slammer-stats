/**
 * Pure logic for the Game Clock (see CONTEXT.md): a countdown per half that
 * counts up as stoppage time past 0:00, with a manual end-half / start-second-half
 * transition. No Dexie, no React — trivially testable and reusable for both the
 * live game screen and the offline minutes-played computation in fieldTime.ts.
 */
export interface GameClockState {
  halfLengthSeconds: number
  half: 1 | 2
  elapsedInHalf: number
  running: boolean
  halfEnded: boolean
}

export function freshClock(halfLengthSeconds: number): GameClockState {
  return {
    halfLengthSeconds,
    half: 1,
    elapsedInHalf: 0,
    running: false,
    halfEnded: false,
  }
}

export function start(clock: GameClockState): GameClockState {
  if (clock.halfEnded) return clock
  return { ...clock, running: true }
}

export function pause(clock: GameClockState): GameClockState {
  return { ...clock, running: false }
}

export function tick(clock: GameClockState): GameClockState {
  if (!clock.running) return clock
  return { ...clock, elapsedInHalf: clock.elapsedInHalf + 1 }
}

export function endHalf(clock: GameClockState): GameClockState {
  return { ...clock, running: false, halfEnded: true }
}

export function startSecondHalf(clock: GameClockState): GameClockState {
  return {
    ...clock,
    half: 2,
    elapsedInHalf: 0,
    halfEnded: false,
    running: true,
  }
}

export function remainingSeconds(clock: GameClockState): number {
  return Math.max(0, clock.halfLengthSeconds - clock.elapsedInHalf)
}

export function stoppageSeconds(clock: GameClockState): number {
  return Math.max(0, clock.elapsedInHalf - clock.halfLengthSeconds)
}

function formatMinSec(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function displayText(clock: GameClockState): string {
  const remaining = remainingSeconds(clock)
  return remaining > 0 ? formatMinSec(remaining) : `+${formatMinSec(stoppageSeconds(clock))}`
}
