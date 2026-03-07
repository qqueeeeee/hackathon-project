import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Sparkles, Lock, Upload, ListChecks, Users, Code2, Check, ArrowLeft, Volume2, VolumeX, MessageSquare } from 'lucide-react'
import { startInterview, interviewTurn, getInterviewSummary } from '../utils/api'

const ROUND_TYPES = [
  { id: 'mcq', name: 'MCQ Round', icon: ListChecks, badge: 'BEGINNER FRIENDLY', description: 'Multiple choice questions testing core concepts' },
  { id: 'hr', name: 'HR Round', icon: Users, badge: 'ALL LEVELS', description: 'Behavioural questions on teamwork, communication, and culture fit' },
  { id: 'technical', name: 'Technical Round', icon: Code2, badge: 'ADVANCED', description: 'Deep-dive technical questions, system design, and problem solving' },
  { id: 'gd', name: 'GD Round', icon: MessageSquare, badge: 'GROUP DISC', description: 'Practice group discussion with AI participants' }
]

const SUGGESTED_TOPICS = [
  "AI will replace software engineers",
  "Remote work is more productive than office work",
  "Social media does more harm than good",
  "Should coding be taught in schools from age 6?",
  "Is a college degree still worth it in 2025?",
  "Startups vs corporates — which is better for freshers?"
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
  
  // GD-specific state
  const [gdSetup, setGdSetup] = useState(false)
  const [gdTopic, setGdTopic] = useState('')
  const [gdParticipants, setGdParticipants] = useState(4)
  const [gdDuration, setGdDuration] = useState(10)
  const [gdSession, setGdSession] = useState(null)
  const [gdTimeLeft, setGdTimeLeft] = useState(0)
  const [gdTurnNumber, setGdTurnNumber] = useState(0)

  const synth = window.speechSynthesis
  const [speakingId, setSpeakingId] = useState(null)

  const speak = (text, id) => {
    synth.cancel()
    if (speakingId === id) { setSpeakingId(null); return }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.05
    utterance.lang = 'en-IN'
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)
    setSpeakingId(id)
    synth.speak(utterance)
  }

  useEffect(() => { return () => synth.cancel() }, [])
  
  // GD timer
  useEffect(() => {
    if (roundType !== 'gd' || !gdSession || gdTimeLeft <= 0 || isComplete) return
    const timer = setInterval(() => {
      setGdTimeLeft(prev => {
        if (prev <= 1) {
          handleConcludeGD()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [roundType, gdSession, isComplete])

  const hasProfile = !!localStorage.getItem('pf_profile')

  const handleStartInterview = async () => {
    console.log('Starting interview...', { roundType })
    
    if (!roundType) {
      console.log('No round type selected')
      return
    }
    
    // Handle GD with setup flow
    if (roundType === 'gd') {
      if (!gdSetup) {
        setGdSetup(true)
        return
      }
      if (!gdTopic.trim()) return
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
      
      const apiParams = {
        name: profile.name,
        target_role: targetRole,
        skill_gaps: skillGaps,
        skills: profile.skills || [],
        round_type: roundType
      }
      
      // Add GD-specific params
      if (roundType === 'gd') {
        apiParams.topic = gdTopic.trim()
        apiParams.participant_count = gdParticipants
        apiParams.duration_minutes = gdDuration
      }
      
      const response = await startInterview(apiParams)

      console.log('API response:', response)
      
      setInterviewStarted(true)
      
      if (roundType === 'gd') {
        // Handle GD response
        setGdSession({
          session_id: response.session_id,
          topic: response.topic,
          participants: response.participants
        })
        setGdTimeLeft(gdDuration * 60)
        setGdTurnNumber(0)
        
        // Build GD messages
        const newMessages = [
          { 
            id: Date.now(), 
            role: 'ai', 
            type: 'moderator', 
            participant_name: 'Moderator', 
            participant_color: '#6B7280',
            content: response.opening 
          }
        ]
        
        // Add first participant message(s)
        if (response.messages && response.messages.length > 0) {
          response.messages.forEach((msg, idx) => {
            newMessages.push({
              id: Date.now() + 1 + idx,
              role: 'ai',
              type: 'gd',
              participant_name: msg.participant_name,
              participant_color: msg.participant_color,
              content: msg.content,
              addresses_user: msg.addresses_user
            })
          })
        }
        
        setMessages(newMessages)
      } else {
        // Regular interview
        setMessages([
          { id: Date.now(), role: 'ai', type: 'opening', content: response.opening },
          { id: Date.now() + 1, role: 'ai', type: 'question', content: response.first_question }
        ])
      }
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
    setGdSetup(false)
    setGdTopic('')
    setGdSession(null)
    setGdTimeLeft(0)
    synth.cancel()
    setSpeakingId(null)
  }

  const handleBackToGdSetup = () => {
    setGdSetup(false)
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
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMessage }])

    try {
      const profile = JSON.parse(localStorage.getItem('pf_profile') || '{}')
      const targetRole = localStorage.getItem('pf_target_role')
      const roadmapData = JSON.parse(localStorage.getItem('pf_roadmap') || '{}')
      const skillGaps = roadmapData.skill_gaps?.map(g => g.skill) || profile.skills?.slice(0, 5) || []

      const history = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userMessage })

      const apiParams = {
        name: profile.name,
        target_role: targetRole,
        skill_gaps: skillGaps,
        history: history,
        user_answer: userMessage,
        round_type: roundType
      }
      
      // Add GD-specific params
      if (roundType === 'gd' && gdSession) {
        apiParams.session_id = gdSession.session_id
        apiParams.topic = gdSession.topic
        apiParams.participants = gdSession.participants
        apiParams.turn_number = gdTurnNumber + 1
      }
      
      const response = await interviewTurn(apiParams)

      // Handle GD response
      if (roundType === 'gd' && response.messages) {
        setGdTurnNumber(prev => prev + 1)
        
        const newMessages = response.messages.map((msg, idx) => ({
          id: Date.now() + 1 + idx,
          role: 'ai',
          type: 'gd',
          participant_name: msg.participant_name,
          participant_color: msg.participant_color,
          content: msg.content,
          addresses_user: msg.addresses_user
        }))
        
        setMessages(prev => [...prev, ...newMessages])
        
        if (response.is_complete) {
          setIsComplete(true)
          await concludeInterview(history, userMessage, profile, targetRole)
        }
      } else {
        // Regular interview response
        setMessages(prev => [
          ...prev,
          { id: Date.now(), role: 'ai', type: 'feedback', content: response.feedback }
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
            { id: Date.now(), role: 'ai', type: 'question', content: response.next_question }
          ])
        }
      }
    } catch (err) {
      console.error('Interview turn failed:', err)
    }
  }

  const concludeInterview = async (history, lastUserMessage, profile, targetRole) => {
    const fullHistory = [...history, { role: 'user', content: lastUserMessage }]
    
    const summaryParams = {
      name: profile.name,
      target_role: targetRole,
      history: fullHistory,
      round_type: roundType
    }
    
    if (roundType === 'gd' && gdSession) {
      summaryParams.topic = gdSession.topic
      summaryParams.participants = gdSession.participants
    }
    
    const summaryResponse = await getInterviewSummary(summaryParams)
    localStorage.setItem('pf_interview_score', summaryResponse.overall_score)
    setSummary(summaryResponse)
  }

  const handleConcludeGD = async () => {
    setIsComplete(true)
    const profile = JSON.parse(localStorage.getItem('pf_profile') || '{}')
    const targetRole = localStorage.getItem('pf_target_role')
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    await concludeInterview(history, '', profile, targetRole)
  }

  const profile = JSON.parse(localStorage.getItem('pf_profile') || '{}')
  const targetRole = localStorage.getItem('pf_target_role')

  const renderMessage = (msg, idx) => {
    // Handle GD messages
    if (roundType === 'gd' && (msg.type === 'gd' || msg.type === 'moderator')) {
      const isUser = msg.role === 'user'
      
      return (
        <motion.div 
          key={msg.id || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            {!isUser && (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: msg.participant_color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.625rem' }}>{msg.participant_name?.[0] || 'M'}</span>
              </div>
            )}
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: isUser ? 'var(--accent)' : msg.participant_color }}>
              {msg.participant_name || 'You'}
            </span>
          </div>
          <div style={{ 
            position: 'relative',
            maxWidth: '70%', 
            padding: '0.75rem 1rem', 
            borderRadius: '1rem',
            background: isUser ? 'var(--accent)' : 'var(--surface)',
            color: isUser ? 'white' : 'var(--text-primary)',
            border: isUser ? 'none' : '1px solid var(--border)',
            borderLeft: isUser ? 'none' : '3px solid ' + msg.participant_color
          }}>
            {!isUser && (
              <button
                onClick={() => speak(msg.content, msg.id)}
                style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: speakingId === msg.id ? 'var(--accent)' : 'var(--text-muted)',
                  padding: '0.125rem'
                }}
              >
                {speakingId === msg.id
                  ? <VolumeX style={{ width: '0.75rem', height: '0.75rem' }} />
                  : <Volume2 style={{ width: '0.75rem', height: '0.75rem' }} />
                }
              </button>
            )}
            <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{msg.content}</p>
          </div>
          {msg.addresses_user && !isUser && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>↩ your turn</span>
          )}
        </motion.div>
      )
    }
    
    // Regular interview messages
    if (msg.role === 'user') {
      return (
        <motion.div 
          key={msg.id || idx}
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
        key={msg.id || idx}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}
      >
        <div className="glow-card p-4" style={{ maxWidth: '80%', position: 'relative', ...(typeStyles[msg.type] || { border: '1px solid var(--border)' }) }}>
          <button
            onClick={() => speak(msg.content, msg.id)}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: speakingId === msg.id ? 'var(--accent)' : 'var(--text-muted)',
              padding: '0.25rem'
            }}
          >
            {speakingId === msg.id
              ? <VolumeX style={{ width: '0.875rem', height: '0.875rem' }} />
              : <Volume2 style={{ width: '0.875rem', height: '0.875rem' }} />
            }
          </button>
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

  const ScoreCircleSmall = ({ score, label, color }) => {
    const circumference = 2 * Math.PI * 22
    const offset = circumference - (score / 100) * circumference

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 60, height: 60 }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="30" cy="30" r="22" stroke="var(--surface-2)" strokeWidth="4" fill="none" />
            <circle 
              cx="30" cy="30" r="22" 
              stroke={color} 
              strokeWidth="4" 
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{score}</span>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{label}</p>
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
    // Show GD setup screen if GD selected and setup not done
    if (roundType === 'gd' && gdSetup) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="pt-20">
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
            <div className="orb w-[500px] h-[500px] var(--accent-subtle) top-0 right-0" />
            <div className="orb w-[400px] h-[400px] var(--accent-subtle) bottom-0 left-0" />
          </div>
          <div style={{ position: 'relative', zIndex: 10, maxWidth: 600, margin: '0 auto', padding: '3rem 1.5rem' }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: '2rem' }}
            >
              <button
                onClick={handleBackToGdSetup}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1rem' }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} />
                Back
              </button>
              <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Group Discussion Setup</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Configure your GD session</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glow-card"
              style={{ padding: '2rem' }}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontFamily: 'Inter', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Discussion Topic</label>
                <input
                  type="text"
                  value={gdTopic}
                  onChange={(e) => setGdTopic(e.target.value)}
                  placeholder="Enter a GD topic e.g. AI will replace software engineers"
                  className="input-glass"
                  style={{ width: '100%', fontSize: '1rem' }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Suggested Topics</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {SUGGESTED_TOPICS.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => setGdTopic(t)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: gdTopic === t ? 'var(--accent-subtle)' : 'var(--surface)',
                        color: gdTopic === t ? 'var(--accent)' : 'var(--text-secondary)',
                        border: gdTopic === t ? '1px solid var(--accent)' : '1px solid var(--border)',
                        fontSize: '0.75rem',
                        fontFamily: 'Inter',
                        cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Participants</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setGdParticipants(n)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        background: gdParticipants === n ? 'var(--accent)' : 'var(--surface)',
                        color: gdParticipants === n ? 'white' : 'var(--text-secondary)',
                        border: gdParticipants === n ? '1px solid var(--accent)' : '1px solid var(--border)',
                        fontFamily: 'IBM Plex Mono',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Duration</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[5, 10, 15].map(n => (
                    <button
                      key={n}
                      onClick={() => setGdDuration(n)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        background: gdDuration === n ? 'var(--accent)' : 'var(--surface)',
                        color: gdDuration === n ? 'white' : 'var(--text-secondary)',
                        border: gdDuration === n ? '1px solid var(--accent)' : '1px solid var(--border)',
                        fontFamily: 'IBM Plex Mono',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {n} min
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleStartInterview}
                disabled={!gdTopic.trim() || loading}
                className="btn-forge"
                style={{ width: '100%', opacity: !gdTopic.trim() || loading ? 0.5 : 1 }}
              >
                {loading ? 'Starting...' : 'Start Discussion'}
              </button>
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
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', marginBottom: '2rem' }}
          >
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Mock Interview</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Select your interview round type</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {ROUND_TYPES.map((round) => (
              <motion.div
                key={round.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { setRoundType(round.id); if (round.id !== 'gd') setGdSetup(false) }}
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
              <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {roundType === 'gd' ? 'Group Discussion' : 'Mock Interview'}
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {roundType === 'gd' ? gdSession?.topic : 'Practice with your future self'}
              </p>
            </div>
          </div>
          
          {roundType === 'gd' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ 
                fontFamily: 'IBM Plex Mono', 
                fontSize: '1rem', 
                color: gdTimeLeft <= 10 ? 'var(--danger)' : gdTimeLeft <= 60 ? 'var(--warning)' : 'var(--accent)'
              }}>
                {Math.floor(gdTimeLeft / 60)}:{(gdTimeLeft % 60).toString().padStart(2, '0')}
              </span>
              <button onClick={handleConcludeGD} className="btn-ghost" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                End
              </button>
            </div>
          )}
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
              {roundType === 'gd' ? (
                // GD Results
                <>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Discussion Complete</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>{gdSession?.topic}</p>
                  </div>
                  
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <p style={{ fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Overall Score</p>
                    <ScoreCircle score={summary.overall_score} />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <ScoreCircleSmall score={summary.communication_score} label="Communication" color="var(--success)" />
                    <ScoreCircleSmall score={summary.content_score} label="Content" color="var(--warning)" />
                    <ScoreCircleSmall score={summary.leadership_score} label="Leadership" color="var(--accent)" />
                    <ScoreCircleSmall score={summary.listening_score} label="Listening" color="#A855F7" />
                  </div>
                  
                  {summary.standout_moment && (
                    <div className="glow-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--success)' }}>
                      <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem' }}>Standout Moment</p>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.6 }}>"{summary.standout_moment}"</p>
                    </div>
                  )}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="glow-card" style={{ padding: '1.5rem', borderLeft: '3px solid var(--success)' }}>
                      <h4 style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem' }}>Strengths</h4>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {summary.strengths?.map((s, idx) => (
                          <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--success)' }}>✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="glow-card" style={{ padding: '1.5rem', borderLeft: '3px solid var(--warning)' }}>
                      <h4 style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.75rem' }}>Areas to Improve</h4>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {summary.improvements?.map((imp, idx) => (
                          <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--warning)' }}>→</span> {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="glow-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}>
                    <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.6 }}>"{summary.future_self_closing}"</p>
                  </div>
                </>
              ) : (
                // Regular Interview Results
                <>
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
                </>
              )}
              
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
