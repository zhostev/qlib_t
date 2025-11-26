import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Experiments from './pages/Experiments'
import ExperimentDetail from './pages/ExperimentDetail'
import Models from './pages/Models'
import ModelDetail from './pages/ModelDetail'
import Configs from './pages/Configs'
import Profile from './pages/Profile'
import ProfitLoss from './pages/ProfitLoss'
import Navigation from './components/Navigation/Navigation'
import './App.css'

// Main layout component with navigation
const MainLayout: React.FC = () => {
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/experiments/:id" element={<ExperimentDetail />} />
          <Route path="/models" element={<Models />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/configs" element={<Configs />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profit-loss" element={<ProfitLoss />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App
