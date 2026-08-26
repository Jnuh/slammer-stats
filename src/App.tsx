import { Route, Routes } from 'react-router-dom'
import GamePage from './pages/GamePage'
import SeasonPage from './pages/SeasonPage'
import TeamPage from './pages/TeamPage'
import TeamsPage from './pages/TeamsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TeamsPage />} />
      <Route path="/teams/:teamId" element={<TeamPage />} />
      <Route path="/seasons/:seasonId" element={<SeasonPage />} />
      <Route path="/games/:gameId" element={<GamePage />} />
    </Routes>
  )
}
