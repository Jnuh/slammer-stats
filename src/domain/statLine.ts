/**
 * Pure mutation logic for a Player's Stat Line within one Game (see CONTEXT.md).
 * The card-confirmation *interaction* (arm/confirm before it counts) is a UI
 * concern, not a domain one — these functions are what runs once a tap is
 * already confirmed.
 */
export interface StatLine {
  goals: number
  assists: number
  shots: number
  duelsWon: number
  duelsLost: number
  saves: number
  dribbles: number
  yellowCards: number
  redCards: number
  redCardLockout: boolean
}

export function freshStatLine(): StatLine {
  return {
    goals: 0,
    assists: 0,
    shots: 0,
    duelsWon: 0,
    duelsLost: 0,
    saves: 0,
    dribbles: 0,
    yellowCards: 0,
    redCards: 0,
    redCardLockout: false,
  }
}

/** A goal always also counts as a shot. */
export function recordGoal(line: StatLine): StatLine {
  return { ...line, goals: line.goals + 1, shots: line.shots + 1 }
}

export function recordShot(line: StatLine): StatLine {
  return { ...line, shots: line.shots + 1 }
}

export function recordAssist(line: StatLine): StatLine {
  return { ...line, assists: line.assists + 1 }
}

export function recordDuelWon(line: StatLine): StatLine {
  return { ...line, duelsWon: line.duelsWon + 1 }
}

export function recordDuelLost(line: StatLine): StatLine {
  return { ...line, duelsLost: line.duelsLost + 1 }
}

export function recordSave(line: StatLine): StatLine {
  return { ...line, saves: line.saves + 1 }
}

export function recordDribble(line: StatLine): StatLine {
  return { ...line, dribbles: line.dribbles + 1 }
}

/** A second yellow in the same game converts to a red rather than stacking a second yellow. */
export function recordYellowCard(line: StatLine): StatLine {
  if (line.yellowCards >= 1) {
    return recordRedCard(line)
  }
  return { ...line, yellowCards: line.yellowCards + 1 }
}

/** Direct red, or the result of a second yellow — either way, locks the player out for the rest of the game. */
export function recordRedCard(line: StatLine): StatLine {
  return { ...line, redCards: line.redCards + 1, redCardLockout: true }
}
