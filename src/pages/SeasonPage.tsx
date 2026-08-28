import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { teamRecord } from '../domain/record'
import { computeSeasonTotals } from '../domain/seasonTotals'
import { clockState } from '../db/liveGame'
import { createGame, createPlayer, deleteSeason, listGamesForSeason, listPlayersForSeason } from '../db/repo'
import { db } from '../db/schema'

async function loadSeasonStats(seasonId: number) {
  const [players, games] = await Promise.all([listPlayersForSeason(seasonId), listGamesForSeason(seasonId)])
  const gameIds = games.map((g) => g.id)
  const [statLines, fieldIntervals] = await Promise.all([
    gameIds.length ? db.statLines.where('gameId').anyOf(gameIds).toArray() : Promise.resolve([]),
    gameIds.length ? db.fieldIntervals.where('gameId').anyOf(gameIds).toArray() : Promise.resolve([]),
  ])
  return { players, games, statLines, fieldIntervals }
}

export default function SeasonPage() {
  const seasonId = Number(useParams().seasonId)
  const navigate = useNavigate()
  const season = useLiveQuery(() => db.seasons.get(seasonId), [seasonId])
  const team = useLiveQuery(() => (season ? db.teams.get(season.teamId) : undefined), [season])
  const data = useLiveQuery(() => loadSeasonStats(seasonId), [seasonId])

  const [playerName, setPlayerName] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [halfMinutes, setHalfMinutes] = useState('25')

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = playerName.trim()
    if (!trimmed) return
    await createPlayer(seasonId, trimmed, playerNumber.trim() ? Number(playerNumber) : null)
    setPlayerName('')
    setPlayerNumber('')
  }

  async function handleCreateGame(e: React.FormEvent) {
    e.preventDefault()
    const trimmedOpponent = opponent.trim()
    const minutes = Number(halfMinutes)
    if (!trimmedOpponent || !minutes) return
    const gameId = await createGame(seasonId, trimmedOpponent, date, minutes * 60)
    navigate(`/games/${gameId}`)
  }

  const totals = data ? computeSeasonTotals(
    data.players.map((p) => ({ playerId: p.id, name: p.name })),
    data.games.map((g) => ({ gameId: g.id, clock: clockState(g) })),
    data.statLines.map((s) => ({ playerId: s.playerId, gameId: s.gameId, line: s })),
    data.fieldIntervals.map((f) => ({ playerId: f.playerId, gameId: f.gameId, interval: f })),
  ) : []

  const record = data ? teamRecord(data.games.map((g) => ({ scoreUs: g.scoreUs, scoreThem: g.scoreThem }))) : { wins: 0, losses: 0, draws: 0 }

  async function handleDeleteSeason() {
    if (!season) return
    const confirmed = window.confirm(
      `Delete "${season.label}"? This permanently removes its roster, all games, and every stat recorded in them. This cannot be undone.`,
    )
    if (!confirmed) return
    await deleteSeason(seasonId)
    navigate(team ? `/teams/${team.id}` : '/')
  }

  return (
    <div className="page">
      {team && (
        <Link to={`/teams/${team.id}`} className="back-link">
          ‹ {team.name}
        </Link>
      )}
      <h1 className="page-title">{season?.label ?? '…'}</h1>

      <div className="section-label">Team Record</div>
      <div className="card-row" style={{ justifyContent: 'center', gap: 16 }}>
        <span>
          <b>{record.wins}</b> W
        </span>
        <span>
          <b>{record.losses}</b> L
        </span>
        <span>
          <b>{record.draws}</b> D
        </span>
      </div>

      <div className="section-label">Games</div>
      <div className="card-list">
        {data?.games.length === 0 && <div className="empty-state">No games yet — schedule one below.</div>}
        {data?.games.map((g) => (
          <Link key={g.id} to={`/games/${g.id}`} className="card-row">
            <span className="title">vs {g.opponent}</span>
            <span className="subtitle tabular">
              {g.date} · {g.scoreUs}–{g.scoreThem}
            </span>
          </Link>
        ))}
      </div>
      <form onSubmit={handleCreateGame} style={{ marginTop: 10 }}>
        <div className="form-row">
          <label htmlFor="opponent">Opponent</label>
          <input id="opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. Rivertown" />
        </div>
        <div className="form-row">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-row">
          <label htmlFor="half-length">Half length (minutes)</label>
          <input id="half-length" type="number" min={1} value={halfMinutes} onChange={(e) => setHalfMinutes(e.target.value)} />
        </div>
        <button type="submit" className="btn">
          Start Game
        </button>
      </form>

      <div className="section-label">Season Totals</div>
      {totals.length === 0 ? (
        <div className="empty-state">No players on the roster yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="totals">
            <thead>
              <tr>
                <th>Player</th>
                <th>Min</th>
                <th>G</th>
                <th>A</th>
                <th>Sh</th>
                <th>DW</th>
                <th>DL</th>
                <th>Sv</th>
                <th>Dr</th>
                <th>YC</th>
                <th>RC</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t) => (
                <tr key={t.playerId}>
                  <td>{t.name}</td>
                  <td>{Math.round(t.secondsPlayed / 60)}</td>
                  <td>{t.goals}</td>
                  <td>{t.assists}</td>
                  <td>{t.shots}</td>
                  <td>{t.duelsWon}</td>
                  <td>{t.duelsLost}</td>
                  <td>{t.saves}</td>
                  <td>{t.dribbles}</td>
                  <td>{t.yellowCards}</td>
                  <td>{t.redCards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-label">Roster</div>
      <div className="card-list">
        {data?.players.length === 0 && <div className="empty-state">No players yet — add one below.</div>}
        {data?.players.map((p) => (
          <div key={p.id} className="card-row">
            <span className="title">
              {p.number != null && `#${p.number} `}
              {p.name}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddPlayer} style={{ marginTop: 10 }}>
        <div className="form-row">
          <label htmlFor="player-name">Player name</label>
          <input id="player-name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Sam" />
        </div>
        <div className="form-row">
          <label htmlFor="player-number">Number (optional)</label>
          <input id="player-number" type="number" value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)} />
        </div>
        <button type="submit" className="btn">
          Add Player
        </button>
      </form>

      <div className="section-label" style={{ marginTop: 32 }}>
        Danger Zone
      </div>
      <button className="btn danger" onClick={handleDeleteSeason}>
        Delete Season
      </button>
    </div>
  )
}

