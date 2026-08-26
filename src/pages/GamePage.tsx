import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { displayText } from '../domain/gameClock'
import {
  addScore,
  clockState,
  endHalf,
  joinGame,
  pauseClock,
  recordCounterStat,
  recordRedCard,
  recordYellowCard,
  startClock,
  startSecondHalf,
  tickClock,
  toggleOnField,
} from '../db/liveGame'
import { listPlayersForSeason } from '../db/repo'
import { db } from '../db/schema'
import type { Player, StatLineRecord } from '../db/types'

const STAT_SUMMARY_FIELDS: Array<[keyof StatLineRecord, string]> = [
  ['goals', 'G'],
  ['assists', 'A'],
  ['shots', 'Sh'],
  ['duelsWon', 'DW'],
  ['duelsLost', 'DL'],
  ['saves', 'Sv'],
  ['dribbles', 'Dr'],
  ['yellowCards', 'YC'],
  ['redCards', 'RC'],
]

/** Compact "3G 1A 1YC" summary so a benched player's Stat Line stays visible without opening their sheet. */
function statSummary(line: StatLineRecord): string {
  const parts = STAT_SUMMARY_FIELDS.filter(([key]) => (line[key] as number) > 0).map(([key, short]) => `${line[key]}${short}`)
  return parts.length ? parts.join(' · ') : 'No stats recorded yet'
}

export default function GamePage() {
  const gameId = Number(useParams().gameId)
  const game = useLiveQuery(() => db.games.get(gameId), [gameId])
  const players = useLiveQuery(
    () => (game ? listPlayersForSeason(game.seasonId) : Promise.resolve<Player[]>([])),
    [game?.seasonId],
  )
  const statLines = useLiveQuery(() => db.statLines.where({ gameId }).toArray(), [gameId])
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null)

  useEffect(() => {
    if (!game?.running) return
    const id = setInterval(() => tickClock(gameId), 1000)
    return () => clearInterval(id)
  }, [game?.running, gameId])

  if (!game || !players || !statLines) {
    return (
      <div className="page">
        <div className="empty-state">Loading…</div>
      </div>
    )
  }

  const clock = clockState(game)
  const lineByPlayer = new Map(statLines.map((l) => [l.playerId, l]))
  const joined = players.filter((p) => lineByPlayer.has(p.id))
  const notJoined = players.filter((p) => !lineByPlayer.has(p.id))
  const onField = joined.filter((p) => lineByPlayer.get(p.id)!.onField)
  const benched = joined.filter((p) => !lineByPlayer.get(p.id)!.onField)
  const sheetPlayer = sheetPlayerId != null ? players.find((p) => p.id === sheetPlayerId) : undefined
  const sheetLine = sheetPlayerId != null ? lineByPlayer.get(sheetPlayerId) : undefined

  return (
    <div className="page">
      <Link to={`/seasons/${game.seasonId}`} className="back-link">
        ‹ Season
      </Link>

      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '2px 6px',
              }}
            >
              H{clock.half}
            </span>
            <span className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>
              {displayText(clock)}
            </span>
            <button
              className="btn secondary"
              style={{ minHeight: 34, padding: '6px 12px' }}
              onClick={() => (game.running ? pauseClock(gameId) : startClock(gameId))}
              disabled={game.halfEnded}
            >
              {game.running ? '⏸' : '▶'}
            </button>
          </div>
          {game.halfEnded ? (
            game.half === 1 ? (
              <button className="btn secondary" onClick={() => startSecondHalf(gameId)}>
                Start 2nd Half ▶
              </button>
            ) : (
              <span className="subtitle">Game over</span>
            )
          ) : (
            <button className="btn secondary" onClick={() => endHalf(gameId)}>
              End Half ⏹
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, background: 'color-mix(in srgb, var(--goal) 16%, var(--surface))', color: 'var(--text)' }}
            onClick={() => addScore(gameId, 'us')}
          >
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>US</span>
            <span className="tabular" style={{ fontSize: 30 }}>
              {game.scoreUs}
            </span>
          </button>
          <button
            className="btn"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, background: 'color-mix(in srgb, var(--danger) 14%, var(--surface))', color: 'var(--text)' }}
            onClick={() => addScore(gameId, 'them')}
          >
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>THEM · {game.opponent}</span>
            <span className="tabular" style={{ fontSize: 30 }}>
              {game.scoreThem}
            </span>
          </button>
        </div>
      </div>

      <div className="section-label">On Field ({onField.length})</div>
      <div className="card-list">
        {onField.length === 0 && <div className="empty-state">No one on field yet — add players from the roster below.</div>}
        {onField.map((p) => (
          <PlayerRow key={p.id} gameId={gameId} name={p.name} number={p.number} line={lineByPlayer.get(p.id)!} onOpenSheet={() => setSheetPlayerId(p.id)} />
        ))}
      </div>

      <div className="section-label">Bench ({benched.length})</div>
      <div className="card-list">
        {benched.map((p) => {
          const line = lineByPlayer.get(p.id)!
          return (
            <div key={p.id} className="card-row">
              <div>
                <div className="title">
                  {line.redCardLockout && '🔒 '}
                  {p.number != null && `#${p.number} `}
                  {p.name}
                </div>
                <div className="subtitle">{statSummary(line)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!line.redCardLockout && (
                  <button className="btn secondary" style={{ minHeight: 36, padding: '6px 10px' }} onClick={() => toggleOnField(gameId, p.id)}>
                    ⬆ In
                  </button>
                )}
                <button className="btn secondary" style={{ minHeight: 36, padding: '6px 10px' }} onClick={() => setSheetPlayerId(p.id)}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-label">Not in this game yet ({notJoined.length})</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {notJoined.map((p) => (
          <button key={p.id} className="btn secondary" onClick={() => joinGame(gameId, p.id)} style={{ minHeight: 40 }}>
            + {p.number != null && `#${p.number} `}
            {p.name}
          </button>
        ))}
      </div>

      {sheetPlayer && sheetLine && (
        <StatSheet
          gameId={gameId}
          playerName={sheetPlayer.name}
          line={sheetLine}
          onClose={() => setSheetPlayerId(null)}
        />
      )}
    </div>
  )
}

function PlayerRow({
  gameId,
  name,
  number,
  line,
  onOpenSheet,
}: {
  gameId: number
  name: string
  number: number | null
  line: StatLineRecord
  onOpenSheet: () => void
}) {
  const tile = (label: string, count: number, color: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        background: 'var(--surface-2)',
        borderRadius: 8,
        padding: '6px 2px',
        minHeight: 44,
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
      <span className="tabular" style={{ fontSize: 13, fontWeight: 700 }}>
        {count}
      </span>
    </button>
  )

  return (
    <div className="card-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <div style={{ fontWeight: 600 }}>
        {number != null && `#${number} `}
        {name}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {tile('Goal', line.goals, 'var(--goal)', () => recordCounterStat(gameId, line.playerId, 'goal'))}
        {tile('Assist', line.assists, 'var(--assist)', () => recordCounterStat(gameId, line.playerId, 'assist'))}
        {tile('Duel W', line.duelsWon, 'var(--duelw)', () => recordCounterStat(gameId, line.playerId, 'duelWon'))}
        {tile('Duel L', line.duelsLost, 'var(--duell)', () => recordCounterStat(gameId, line.playerId, 'duelLost'))}
        <button
          onClick={() => toggleOnField(gameId, line.playerId)}
          style={{ flex: '0 0 auto', background: 'var(--surface-2)', borderRadius: 8, padding: '6px 10px', minHeight: 44, fontWeight: 700, fontSize: 11 }}
        >
          OUT
        </button>
        <button
          onClick={onOpenSheet}
          style={{ flex: '0 0 auto', background: 'var(--surface-2)', borderRadius: 8, padding: '6px 12px', minHeight: 44, fontWeight: 800, fontSize: 16 }}
        >
          +
        </button>
      </div>
    </div>
  )
}

function StatSheet({
  gameId,
  playerName,
  line,
  onClose,
}: {
  gameId: number
  playerName: string
  line: StatLineRecord
  onClose: () => void
}) {
  const [armed, setArmed] = useState<'yellow' | 'red' | null>(null)

  function tapCard(kind: 'yellow' | 'red') {
    if (armed === kind) {
      setArmed(null)
      if (kind === 'yellow') recordYellowCard(gameId, line.playerId)
      else recordRedCard(gameId, line.playerId)
    } else {
      setArmed(kind)
    }
  }

  const rows: Array<{ label: string; count: number; onClick: () => void; confirming?: boolean; color?: string }> = [
    { label: 'Save', count: line.saves, onClick: () => recordCounterStat(gameId, line.playerId, 'save') },
    { label: 'Shot', count: line.shots, onClick: () => recordCounterStat(gameId, line.playerId, 'shot') },
    { label: 'Dribble', count: line.dribbles, onClick: () => recordCounterStat(gameId, line.playerId, 'dribble') },
    {
      label: armed === 'yellow' ? 'Tap again to confirm' : 'Yellow Card',
      count: line.yellowCards,
      onClick: () => tapCard('yellow'),
      confirming: armed === 'yellow',
      color: 'var(--card-y)',
    },
    {
      label: armed === 'red' ? 'Tap again to confirm' : 'Red Card',
      count: line.redCards,
      onClick: () => tapCard('red'),
      confirming: armed === 'red',
      color: 'var(--card-r)',
    },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,10,0.45)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 14, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{playerName} — all stats</div>
          <button onClick={onClose} style={{ color: 'var(--text-dim)', textDecoration: 'underline', fontSize: 13 }}>
            close
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {rows.map((r) => (
            <button
              key={r.label}
              onClick={r.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                background: r.confirming ? 'var(--surface-2)' : 'var(--surface-2)',
                border: r.confirming ? '2px solid var(--danger)' : '1px solid transparent',
                borderRadius: 12,
                padding: 10,
                minHeight: 52,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: r.color, textAlign: 'left' }}>{r.label}</span>
              <span className="tabular" style={{ fontSize: 15, fontWeight: 800 }}>
                {r.count}
              </span>
            </button>
          ))}
        </div>
        {line.redCardLockout && (
          <div className="empty-state" style={{ marginTop: 10 }}>
            🔒 Locked out for the rest of the game after a red card.
          </div>
        )}
      </div>
    </div>
  )
}
