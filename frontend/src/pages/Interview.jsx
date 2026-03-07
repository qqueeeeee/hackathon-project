import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Sparkles, Lock, Upload, ListChecks, Users, Code2, Check, ArrowLeft } from 'lucide-react'
import { startInterview, interviewTurn, getInterviewSummary } from '../utils/api'

const ROUND_TYPES = [
  { id: 'mcq', name: 'MCQ Round', icon: ListChecks, badge: 'BEGINNER FRIENDLY', description: 'Multiple choice questions testing core concepts' },
  { id: 'hr', name: 'HR Round', icon: Users, badge: 'ALL LEVELS', description: 'Behavioural questions on teamwork, communication, and culture fit' },
  { id: 'technical', name: 'Technical Round', icon: Code2, badge: 'ADVANCED', description: 'Deep-dive technical questions, system design, and problem solving' }
]

const Interview = () => {
  const navigate = useNavigate()
  const chatRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [summary, setSummary] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [roundType, setRoundType] = useState(null)

  const hasProfile = !!localStorage.getItem('pf_profile')

  const handleStartInterview = async () => {
    console.log('Starting interview...', { roundType })
    
    if (!roundType) {
      console.log('No round type selected')
      return
    }
    
    setLoading(true)
    
    const profileData = localStorage.getItem('pf_profile')
    const targetRole = localStorage.getItem('pf_target_role')
    const roadmapData = localStorage.getItem('pf_roadmap')

    console.log('Profile data:', profileData)
    console.log('Target role:', targetRole)

    try {
      const profile = JSON.parse(profileData)
      const roadmap = roadmapData ? JSON.parse(roadmapData) : { skill_gaps: [] }
      const skillGaps = roadmap.skill_gaps?.map(g => g.skill) || profile.skills?.slice(0, 5) || []

      console.log('Calling API...')
      
      const response = await startInterview({
        name: profile.name,
        target_role: targetRole,
        skill_gaps: skillGaps,
        skills: profile.skills || [],
        round_type: roundType
      })

      console.log('API response:', response)
      
      setInterviewStarted(true)
      setMessages([
        { role: 'ai', type: 'opening', content: response.opening },
        { role: 'ai', type: 'question', content: response.first_question }
      ])
    } catch (err) {
      console.error('Failed to start interview:', err)
      alert('Failed to start interview: ' + (err.message || err))
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const handleBackToSelection = () => {
    setInterviewStarted(false)
    setMessages([])
    setIsComplete(false)
    setRoundType(null)
  }

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
        user_answer: userMessage,
        round_type: roundType
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
          history: [...history, { role: 'assistant', content: response.feedback }],
          round_type: roundType
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

  if (!interviewStarted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="pt-20">
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <div className="orb w-[500px] h-[500px] var(--accent-subtle) top-0 right-0" />
          <div className="orb w-[400px] h-[400px] var(--accent-subtle) bottom-0 left-0" />
        </div>
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', marginBottom: '2rem' }}
          >
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Mock Interview</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Select your interview round type</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {ROUND_TYPES.map((round) => (
              <motion.div
                key={round.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setRoundType(round.id)}
                className="glow-card"
                style={{ 
                  padding: '1.5rem', 
                  cursor: 'pointer',
                  border: roundType === round.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
              >
                {roundType === round.id && (
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check style={{ width: '1rem', height: '1rem', color: 'white' }} />
                  </div>
                )}
                <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <round.icon style={{ width: 24, height: 24, color: 'var(--accent)' }} />
                </div>
                <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{round.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{round.description}</p>
                <span style={{ fontSize: '0.6875rem', fontFamily: 'IBM Plex Mono', color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{round.badge}</span>
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => { console.log('BUTTON CLICKED'); handleStartInterview() }}
            disabled={!roundType || loading}
            className="btn-forge"
            style={{ width: '100%', maxWidth: 400, margin: '0 auto', display: 'block', opacity: roundType ? 1 : 0.5 }}
          >
            {loading ? 'Starting...' : 'Start Interview'}
          </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleBackToSelection}
              style={{
                width: 40,
                height: 40,
                borderRadius: '0.5rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </button>
            <div>
              <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Mock Interview</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Practice with your future self</p>
            </div>
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
            <span style={{ fontSize: '0.6875rem', fontFamily: 'IBM Plex Mono', background: 'var(--accent-subtle)', color: 'var(--accent)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', marginLeft: '0.5rem' }}>
              {roundType === 'mcq' ? 'MCQ' : roundType === 'hr' ? 'HR' : 'TECHNICAL'}
            </span>
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
