import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db/schema'
import { createSeason, deleteTeam, listSeasonsForTeam } from '../db/repo'

export default function TeamPage() {
  const teamId = Number(useParams().teamId)
  const navigate = useNavigate()
  const team = useLiveQuery(() => db.teams.get(teamId), [teamId])
  const seasons = useLiveQuery(() => listSeasonsForTeam(teamId), [teamId])
  const [label, setLabel] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return
    await createSeason(teamId, trimmed)
    setLabel('')
  }

  async function handleDeleteTeam() {
    if (!team) return
    const confirmed = window.confirm(
      `Delete "${team.name}"? This permanently removes every season, roster, game, and stat recorded under it. This cannot be undone.`,
    )
    if (!confirmed) return
    await deleteTeam(teamId)
    navigate('/')
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ‹ All Teams
      </Link>
      <h1 className="page-title">{team?.name ?? '…'}</h1>

      <div className="section-label">Seasons</div>
      <div className="card-list">
        {seasons?.length === 0 && <div className="empty-state">No seasons yet — add one below.</div>}
        {seasons?.map((season) => (
          <Link key={season.id} to={`/seasons/${season.id}`} className="card-row">
            <span className="title">{season.label}</span>
          </Link>
        ))}
      </div>

      <form className="section-label" style={{ marginTop: 20 }} onSubmit={handleCreate}>
        <div className="form-row">
          <label htmlFor="season-label">New season label</label>
          <input id="season-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Fall 2026" />
        </div>
        <button type="submit" className="btn">
          Add Season
        </button>
      </form>

      <div className="section-label" style={{ marginTop: 32 }}>
        Danger Zone
      </div>
      <button className="btn danger" onClick={handleDeleteTeam}>
        Delete Team
      </button>
    </div>
  )
}
