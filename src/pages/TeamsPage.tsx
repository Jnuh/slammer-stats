import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { downloadExport, exportAllData } from '../db/exportData'
import { createTeam, listTeams } from '../db/repo'

export default function TeamsPage() {
  const teams = useLiveQuery(listTeams, [])
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await createTeam(trimmed)
    setName('')
  }

  return (
    <div className="page">
      <h1 className="page-title">Slammer Stats</h1>

      <div className="section-label">Teams</div>
      <div className="card-list">
        {teams?.length === 0 && <div className="empty-state">No teams yet — add one below.</div>}
        {teams?.map((team) => (
          <Link key={team.id} to={`/teams/${team.id}`} className="card-row">
            <span className="title">{team.name}</span>
          </Link>
        ))}
      </div>

      <form className="section-label" style={{ marginTop: 20 }} onSubmit={handleCreate}>
        <div className="form-row">
          <label htmlFor="team-name">New team name</label>
          <input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lightning FC" />
        </div>
        <button type="submit" className="btn">
          Add Team
        </button>
      </form>

      <div style={{ marginTop: 32 }}>
        <button
          className="btn secondary"
          onClick={async () => downloadExport(await exportAllData())}
        >
          Export all data (JSON backup)
        </button>
      </div>
    </div>
  )
}
