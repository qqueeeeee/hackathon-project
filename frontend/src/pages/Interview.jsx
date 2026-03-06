import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Sparkles, Lock, Upload } from 'lucide-react'
import { startInterview, interviewTurn, getInterviewSummary } from '../utils/api'

const Interview = () => {
  const navigate = useNavigate()
  const chatRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [summary, setSummary] = useState(null)
  const [isComplete, setIsComplete] = useState(false)

  const hasProfile = !!localStorage.getItem('pf_profile')

  useEffect(() => {
    if (!hasProfile) {
      setLoading(false)
      return
    }

    const initInterview = async () => {
      const profileData = localStorage.getItem('pf_profile')
      const targetRole = localStorage.getItem('pf_target_role')
      const roadmapData = localStorage.getItem('pf_roadmap')

      if (!profileData || !targetRole) {
        setLoading(false)
        return
      }

      try {
        const profile = JSON.parse(profileData)
        const roadmap = roadmapData ? JSON.parse(roadmapData) : { skill_gaps: [] }
        const skillGaps = roadmap.skill_gaps?.map(g => g.skill) || profile.skills?.slice(0, 5) || []

        const response = await startInterview({
          name: profile.name,
          target_role: targetRole,
          skill_gaps: skillGaps,
          skills: profile.skills || []
        })

        setMessages([
          { role: 'ai', type: 'opening', content: response.opening },
          { role: 'ai', type: 'question', content: response.first_question }
        ])
      } catch (err) {
        console.error('Failed to start interview:', err)
      } finally {
        setLoading(false)
      }
    }

    initInterview()
  }, [hasProfile])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isComplete) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const profile = JSON.parse(localStorage.getItem('pf_profile') || '{}')
      const targetRole = localStorage.getItem('pf_target_role')
      const roadmapData = JSON.parse(localStorage.getItem('pf_roadmap') || '{}')
      const skillGaps = roadmapData.skill_gaps?.map(g => g.skill) || profile.skills?.slice(0, 5) || []

      const history = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userMessage })

      const response = await interviewTurn({
        name: profile.name,
        target_role: targetRole,
        skill_gaps: skillGaps,
        history: history,
        user_answer: userMessage
      })

      setMessages(prev => [
        ...prev,
        { role: 'ai', type: 'feedback', content: response.feedback }
      ])

      if (response.is_complete) {
        setIsComplete(true)
        
        const summaryResponse = await getInterviewSummary({
          name: profile.name,
          target_role: targetRole,
          history: [...history, { role: 'assistant', content: response.feedback }]
        })
        
        localStorage.setItem('pf_interview_score', summaryResponse.overall_score)
        setSummary(summaryResponse)
      } else if (response.next_question) {
        setMessages(prev => [
          ...prev,
          { role: 'ai', type: 'question', content: response.next_question }
        ])
      }
    } catch (err) {
      console.error('Interview turn failed:', err)
    }
  }

  const profile = JSON.parse(localStorage.getItem('pf_profile') || '{}')
  const targetRole = localStorage.getItem('pf_target_role')

  const renderMessage = (msg, idx) => {
    if (msg.role === 'user') {
      return (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}
        >
          <div style={{ maxWidth: '80%', padding: '0.75rem 1.25rem', borderRadius: '1rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: 'var(--text-primary)' }}>
            <p style={{ fontSize: '0.875rem' }}>{msg.content}</p>
          </div>
        </motion.div>
      )
    }

    const typeStyles = {
      opening: { border: '1px solid var(--accent)', background: 'var(--accent-subtle)' },
      question: { border: '1px solid var(--accent)', background: 'var(--accent-subtle)' },
      feedback: { border: '1px solid var(--warning)', background: 'rgba(245,158,11,0.05)' }
    }

    const typeLabels = {
      opening: null,
      question: 'QUESTION',
      feedback: 'FEEDBACK'
    }

    const labelColors = {
      opening: 'var(--accent)',
      question: 'var(--accent)',
      feedback: 'var(--warning)'
    }

    return (
      <motion.div 
        key={idx}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}
      >
        <div className="glow-card p-4" style={{ maxWidth: '80%', ...(typeStyles[msg.type] || { border: '1px solid var(--border)' }) }}>
          {typeLabels[msg.type] && (
            <p style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', color: labelColors[msg.type], marginBottom: '0.5rem' }}>{typeLabels[msg.type]}</p>
          )}
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{msg.content}</p>
        </div>
      </motion.div>
    )
  }

  const ScoreCircle = ({ score }) => {
    const circumference = 2 * Math.PI * 45
    const offset = circumference - (score / 100) * circumference
    const color = score >= 70 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)'

    return (
      <div style={{ position: 'relative', width: 128, height: 128 }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="64" cy="64" r="45" stroke="var(--surface-2)" strokeWidth="8" fill="none" />
          <circle 
            cx="64" cy="64" r="45" 
            stroke={color} 
            strokeWidth="8" 
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.875rem', color }}>{score}</span>
        </div>
      </div>
    )
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
            <div style={{ position: 'absolute', inset: 0, borderRadius: '9999px', border: '4px solid transparent', borderTopColor: 'var(--success)' }} />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}
          >
            Connecting with your Future Self...
          </motion.p>
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
              Complete your resume to unlock the mock interview with your future self.
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="pt-20">
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div className="orb w-[500px] h-[500px] var(--accent-subtle) top-0 right-0" />
        <div className="orb w-[400px] h-[400px] var(--accent-subtle) bottom-0 left-0" />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}
        >
          <div>
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Mock Interview</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Practice with your future self</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glow-card p-4 mb-6"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.25rem', color: 'white' }}>
                {profile.name?.charAt(0) || 'Y'}
              </span>
            </div>
            <div>
              <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                Future {profile.name}
              </p>
              <p style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', color: 'var(--text-secondary)' }}>{targetRole}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '9999px', background: 'var(--success)' }} className="pulse-live" />
            <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', fontWeight: 700 }}>LIVE</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          ref={chatRef}
          className="glow-card p-6 mb-6"
          style={{ height: 450, overflowY: 'auto' }}
        >
          <AnimatePresence>
            {messages.map(renderMessage)}
          </AnimatePresence>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glow-card p-4 mb-6"
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your answer..."
            disabled={isComplete}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isComplete}
            style={{ 
              padding: '0.625rem 1.5rem', 
              background: 'var(--accent)', 
              color: 'var(--text-primary)', 
              fontFamily: 'Inter', 
              fontWeight: 600, 
              fontSize: '0.875rem', 
              border: 'none', 
              borderRadius: '0.5rem', 
              cursor: (!input.trim() || isComplete) ? 'not-allowed' : 'pointer',
              opacity: (!input.trim() || isComplete) ? 0.4 : 1
            }}
          >
            <Send style={{ width: 20, height: 20 }} />
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {summary && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glow-card p-8 mb-6"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <MessageCircle style={{ width: 24, height: 24, color: 'var(--accent)' }} />
                  Interview Summary
                </h3>
                <ScoreCircle score={summary.overall_score} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <h4 style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Strengths
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {summary.strengths.map((s, idx) => (
                      <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--success)', marginTop: '2px' }}>✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--warning)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Areas to Improve
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {summary.improvements.map((imp, idx) => (
                      <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--warning)', marginTop: '2px' }}>→</span> {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  "{summary.future_self_closing}"
                </p>
                <p style={{ color: 'var(--accent)', textAlign: 'center', fontFamily: 'Inter', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  — Your Future Self
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-forge"
                  style={{ flex: 1 }}
                >
                  View Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Interview
