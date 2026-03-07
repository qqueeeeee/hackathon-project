import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, BookOpen, Target, Sparkles, Lock, Upload, RefreshCw, ExternalLink } from 'lucide-react'
import { generateRoadmap } from '../utils/api'

const PriorityBadge = ({ priority }) => {
  const classes = {
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low'
  }
  return <span className={`badge ${classes[priority] || 'badge-low'}`}>{priority}</span>
}

const MilestoneColors = [
  { bg: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', border: 'border-[var(--accent)]/30' },
  { bg: 'linear-gradient(135deg, var(--warning), #D97706)', border: 'border-[var(--warning)]/30' },
  { bg: 'linear-gradient(135deg, var(--success), #16A34A)', border: 'border-[var(--success)]/30' },
  { bg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', border: 'border-[#8B5CF6]/30' }
]

const Roadmap = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [roadmap, setRoadmap] = useState(null)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const hasProfile = !!localStorage.getItem('pf_profile')
  const existingRoadmap = localStorage.getItem('pf_roadmap')

  const getErrorMessage = (err) => {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || JSON.stringify(d)).join(', ')
    }
    if (typeof detail === 'object') return detail.msg || JSON.stringify(detail)
    return err.message || 'Something went wrong'
  }

  useEffect(() => {
    if (!hasProfile) {
      setLoading(false)
      return
    }

    if (existingRoadmap) {
      setRoadmap(JSON.parse(existingRoadmap))
      setLoading(false)
      return
    }

    const loadRoadmap = async () => {
      const profileData = localStorage.getItem('pf_profile')
      const targetRole = localStorage.getItem('pf_target_role')
      const duration = localStorage.getItem('pf_duration')

      if (!profileData || !targetRole) {
        setLoading(false)
        return
      }

      try {
        const profile = JSON.parse(profileData)
        const requestData = {
          name: String(profile.name || ''),
          skills: Array.isArray(profile.skills) ? profile.skills : [],
          experience_years: Number(profile.experience_years) || 0,
          target_role: String(targetRole || 'Frontend Developer'),
          duration_months: parseInt(duration) || 12
        }
        const data = await generateRoadmap(requestData)
        setRoadmap(data)
        localStorage.setItem('pf_roadmap', JSON.stringify(data))
      } catch (err) {
        console.error('Roadmap generation error:', err)
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    loadRoadmap()
  }, [hasProfile, existingRoadmap])

  const handleRegenerate = async () => {
    setIsGenerating(true)
    setError('')
    
    try {
      const profileData = localStorage.getItem('pf_profile')
      const targetRole = localStorage.getItem('pf_target_role')
      const duration = localStorage.getItem('pf_duration')
      const profile = JSON.parse(profileData)
      
      const requestData = {
        name: String(profile.name || ''),
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        experience_years: Number(profile.experience_years) || 0,
        target_role: String(targetRole || 'Frontend Developer'),
        duration_months: parseInt(duration) || 12
      }
      
      const data = await generateRoadmap(requestData)
      setRoadmap(data)
      localStorage.setItem('pf_roadmap', JSON.stringify(data))
    } catch (err) {
      console.error('Roadmap regeneration error:', err)
      setError(getErrorMessage(err))
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', position: 'relative' }} className="flex items-center justify-center pt-20">
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <div className="orb w-[600px] h-[600px] var(--accent-subtle) top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 96, height: 96, margin: '0 auto 2rem', position: 'relative' }}
          >
            <div style={{ position: 'absolute', inset: 0, borderRadius: '9999px', border: '4px solid rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '9999px', border: '4px solid transparent', borderTopColor: 'var(--accent)' }} />
            <div style={{ position: 'absolute', inset: 8, borderRadius: '9999px', border: '4px solid transparent', borderTopColor: 'var(--accent-hover)' }} />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}
          >
            Your Future Self is analysing your profile...
          </motion.p>
          <p style={{ color: 'var(--text-secondary)' }}>This will be worth it</p>
        </div>
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="pt-20">
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <div className="orb w-[500px] h-[500px] var(--accent-subtle) top-0 right-0" />
          <div className="orb w-[400px] h-[400px] var(--accent-subtle) bottom-0 left-0" />
        </div>
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 448, margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glow-card p-8"
          >
            <div style={{ width: 80, height: 80, borderRadius: '1rem', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Lock style={{ width: 40, height: 40, color: 'var(--text-secondary)' }} />
            </div>
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Upload Your Resume First
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Complete your resume to unlock this section and get your personalized career roadmap.
            </p>
            <Link to="/resume" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent)', color: 'var(--text-primary)', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.875rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none' }}>
              <Upload style={{ width: 20, height: 20 }} />
              Go to Resume
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }} className="flex items-center justify-center pt-20">
        <div style={{ textAlign: 'center', maxWidth: 448, padding: '2rem' }} className="glow-card">
          <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
          <button onClick={handleRegenerate} className="btn-ghost">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const profile = JSON.parse(localStorage.getItem('pf_profile') || '{}')
  const targetRole = localStorage.getItem('pf_target_role')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="pt-20">
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div className="orb w-[500px] h-[500px] var(--accent-subtle) top-0 right-0" />
        <div className="orb w-[400px] h-[400px] var(--accent-subtle) bottom-0 left-1/3" />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)' }}>Career Roadmap</h1>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                {localStorage.getItem('pf_duration') || 12}-MONTH ROADMAP
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Your personalized path to success</p>
          </div>
          {roadmap && (
            <button onClick={handleRegenerate} disabled={isGenerating} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw style={{ width: 16, height: 16, animation: isGenerating ? 'spin 1s linear infinite' : 'none' }} />
              Regenerate
            </button>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glow-card p-8 mb-8"
          style={{ borderLeft: '4px solid var(--accent)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '1rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 32px rgba(79,110,247,0.25)' }}>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.75rem', color: 'white' }}>
                {profile.name?.charAt(0) || 'Y'}
              </span>
            </div>
            <div>
              <p style={{ color: 'var(--accent)', fontSize: '0.875rem', fontFamily: 'IBM Plex Mono', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles style={{ width: 16, height: 16 }} />
                Future {profile.name} • {targetRole}
              </p>
              <p style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {roadmap.future_self_intro}
              </p>
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'grid', md: { gridTemplateColumns: 'repeat(2, 1fr)' }, gap: '2rem', marginBottom: '3rem' }} className="grid md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target style={{ width: 20, height: 20, color: 'var(--danger)' }} />
              Skill Gaps to Close
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {roadmap.skill_gaps.map((gap, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="glow-card p-5"
                  style={{ transition: 'border-color 0.2s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--accent)', fontSize: '0.875rem' }}>{gap.skill}</span>
                    <PriorityBadge priority={gap.priority} />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{gap.reason}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles style={{ width: 20, height: 20, color: 'var(--success)' }} />
              Your Current Strengths
            </h2>
            <div className="glow-card p-6">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {profile.skills?.slice(0, 8).map((skill, idx) => (
                  <motion.span 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '0.875rem', fontFamily: 'IBM Plex Mono', border: '1px solid var(--accent-subtle)' }}
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '1rem', lineHeight: 1.6 }}>
                "{profile.summary}"
              </p>
            </div>
          </motion.div>
        </div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '2rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
        >
          <Calendar style={{ width: 24, height: 24, color: 'var(--accent)' }} />
          Your Career Timeline
        </motion.h2>
        
        <div style={{ position: 'relative', paddingLeft: '4rem', marginBottom: '3rem' }}>
          <div className="timeline-line" />
          
          {roadmap.milestones.map((milestone, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + idx * 0.15 }}
              style={{ position: 'relative', marginBottom: '2rem' }}
            >
              <div style={{ position: 'absolute', left: 0, width: 48, height: 48, borderRadius: '1rem', background: MilestoneColors[idx].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateX(-8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, color: 'white' }}>{milestone.month}</span>
              </div>
              
              <div className="glow-card p-6 ml-4" style={{ transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                    {milestone.title}
                  </h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'IBM Plex Mono', background: 'var(--surface-2)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem' }}>
                    Month {milestone.month}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>{milestone.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {milestone.skills_to_learn.map((skill, sidx) => (
                    <span key={sidx} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', border: '1px solid var(--accent-subtle)' }}>
                      {skill}
                    </span>
                  ))}
                </div>
                {milestone.resources && milestone.resources.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {milestone.resources.map((resource, ridx) => (
                      <a
                        key={ridx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--accent)',
                          fontFamily: 'Inter',
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <ExternalLink style={{ width: '0.75rem', height: '0.75rem' }} />
                        {resource.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="glow-card p-8 mb-8"
          style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}
        >
          <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', fontSize: '1.125rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '0.75rem' }}>
            "{roadmap.motivational_close}"
          </p>
          <p style={{ color: 'var(--warning)', textAlign: 'center', fontFamily: 'Inter', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            — Your Future Self
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          style={{ display: 'flex', gap: '1rem' }}
        >
          <button onClick={() => navigate('/interview')} className="btn-forge" style={{ flex: 1 }}>
            Practice Interview
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost" style={{ flex: 1 }}>
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default Roadmap
