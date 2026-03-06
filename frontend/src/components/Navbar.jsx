import { NavLink, useLocation } from 'react-router-dom'
import { Sparkles, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const Navbar = () => {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  
  const hasProfile = !!localStorage.getItem('pf_profile')
  const hasRoadmap = !!localStorage.getItem('pf_roadmap')
  const hasInterview = !!localStorage.getItem('pf_interview_score')
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/resume', label: 'Resume' },
    { path: '/roadmap', label: 'Roadmap' },
    { path: '/interview', label: 'Interview' }
  ]
  
  const completionStatus = {
    '/dashboard': hasProfile,
    '/resume': hasProfile,
    '/roadmap': hasProfile && hasRoadmap,
    '/interview': hasProfile && hasInterview
  }

  const isWelcome = location.pathname === '/' || location.pathname === '/welcome'

  if (isWelcome) return null

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0.75rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)' }}>PathForge</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--accent)' }}>AI</span>
          </NavLink>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const isComplete = completionStatus[item.path]
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    fontFamily: 'Inter',
                    transition: 'all 0.2s',
                    background: 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    position: 'relative',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent'
                  }}
                >
                  {item.label}
                  {isComplete && (
                    <span style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', backgroundColor: 'var(--success)', borderRadius: '50%' }} />
                  )}
                </NavLink>
              )
            })}
            
            <button
              onClick={toggleTheme}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                marginLeft: '0.5rem',
                transition: 'background 0.2s, color 0.2s'
              }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
