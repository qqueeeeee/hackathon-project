import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Resume from './pages/Resume'
import Roadmap from './pages/Roadmap'
import Interview from './pages/Interview'
import Dashboard from './pages/Dashboard'
import Navbar from './components/Navbar'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

console.log('PathForge AI starting...')

const savedTheme = localStorage.getItem('pf_theme') || 'light'
document.documentElement.setAttribute('data-theme', savedTheme)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/welcome" element={<Landing />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
