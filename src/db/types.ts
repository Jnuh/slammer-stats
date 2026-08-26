import type { StatLine } from '../domain/statLine'

export interface Team {
  id: number
  name: string
}

export interface Season {
  id: number
  teamId: number
  label: string
}

/** A Roster entry: a Player belongs to exactly one Season (see CONTEXT.md — Rosters are season-scoped). */
export interface Player {
  id: number
  seasonId: number
  name: string
  number: number | null
}

export interface Game {
  id: number
  seasonId: number
  opponent: string
  date: string // ISO date, e.g. "2026-08-25"
  halfLengthSeconds: number
  scoreUs: number
  scoreThem: number
  half: 1 | 2
  elapsedInHalf: number
  running: boolean
  halfEnded: boolean
}

/** A Player's Stat Line for one Game. `onField` plus FieldIntervals track live participation; the Stat Line itself is the tallies. */
export interface StatLineRecord extends StatLine {
  id: number
  gameId: number
  playerId: number
  onField: boolean
}

/** See src/domain/fieldTime.ts — one closed (or currently open) stretch of on-field time, scoped to a single half. */
export interface FieldIntervalRecord {
  id: number
  gameId: number
  playerId: number
  half: 1 | 2
  inSeconds: number
  outSeconds: number | null
}
