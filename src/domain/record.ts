export interface GameScore {
  scoreUs: number
  scoreThem: number
}

export interface TeamRecord {
  wins: number
  losses: number
  draws: number
}

export function teamRecord(games: GameScore[]): TeamRecord {
  const record: TeamRecord = { wins: 0, losses: 0, draws: 0 }
  for (const { scoreUs, scoreThem } of games) {
    if (scoreUs > scoreThem) record.wins++
    else if (scoreUs < scoreThem) record.losses++
    else record.draws++
  }
  return record
}
