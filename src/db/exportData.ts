import { db } from './schema'

/** A lossless dump of every table, meant for backup/restore (see spec.md) — not for spreadsheet analysis. */
export async function exportAllData(): Promise<string> {
  const [teams, seasons, players, games, statLines, fieldIntervals] = await Promise.all([
    db.teams.toArray(),
    db.seasons.toArray(),
    db.players.toArray(),
    db.games.toArray(),
    db.statLines.toArray(),
    db.fieldIntervals.toArray(),
  ])
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), version: 1, teams, seasons, players, games, statLines, fieldIntervals },
    null,
    2,
  )
}

export function downloadExport(json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `slammer-stats-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
