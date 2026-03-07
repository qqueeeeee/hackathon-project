import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Users, Clock, Volume2, VolumeX, MessageSquare, Sparkles, ArrowRight, Mic, MicOff } from 'lucide-react'
import { startGD, gdTurn, concludeGD } from '../utils/api'

const SUGGESTED_TOPICS = [
  "AI will replace software engineers",
  "Remote work is more productive than office work",
  "Social media does more harm than good",
  "Should coding be taught in schools from age 6?",
  "Is a college degree still worth it in 2025?",
  "Startups vs corporates — which is better for freshers?"
]

const GD = () => {
  const navigate = useNavigate()
  const chatRef = useRef(null)
  
  const [screen, setScreen] = useState('setup')
  const [topic, setTopic] = useState('')
  const [participantCount, setParticipantCount] = useState(4)
  const [duration, setDuration] = useState(10)
  const [loading, setLoading] = useState(false)
  
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [turnNumber, setTurnNumber] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [results, setResults] = useState(null)
  const [isListening, setIsListening] = useState(false)
  
  const synth = window.speechSynthesis
  const [speakingId, setSpeakingId] = useState(null)

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input is not supported in your browser')
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-IN'
    
    setIsListening(true)
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
      setInput(prev => prev + transcript)
    }
    
    recognition.onerror = () => {
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognition.start()
  }

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
  
  useEffect(() => {
    if (screen !== 'discussion' || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleConclude()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [screen, timeLeft])
  
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleStart = async () => {
    if (!topic.trim()) return
    setLoading(true)
    
    try {
      const response = await startGD({
        topic: topic.trim(),
        participant_count: participantCount,
        duration_minutes: duration
      })
      
      setSession(response)
      setTimeLeft(duration * 60)
      setTurnNumber(0)
      
      const initialMessages = [
        { 
          id: Date.now(), 
          type: 'moderator', 
          content: response.opening_statement,
          participant_name: 'Moderator',
          participant_color: '#6B7280'
        },
        {
          id: Date.now() + 1,
          type: 'ai',
          ...response.first_message,
          addresses_user: response.first_message.addresses_user
        }
      ]
      setMessages(initialMessages)
      setScreen('discussion')
    } catch (err) {
      console.error('Failed to start GD:', err)
      alert('Failed to start discussion. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    
    const userMsg = input.trim()
    setInput('')
    setLoading(true)
    
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMsg,
      participant_name: 'You',
      participant_color: '#4F6EF7'
    }
    setMessages(prev => [...prev, newUserMessage])
    
    try {
      const history = messages.map(m => ({
        participant_name: m.participant_name,
        content: m.content,
        role: m.type === 'user' ? 'user' : 'ai'
      }))
      history.push({ participant_name: 'You', content: userMsg, role: 'user' })
      
      const response = await gdTurn({
        session_id: session.session_id,
        user_message: userMsg,
        topic: session.topic,
        participants: session.participants,
        history: history,
        turn_number: turnNumber + 1
      })
      
      setTurnNumber(prev => prev + 1)
      
      const newMessages = response.messages.map((msg, idx) => ({
        id: Date.now() + 100 + idx,
        type: 'ai',
        ...msg
      }))
      
      setMessages(prev => [...prev, ...newMessages])
      
      if (response.should_conclude) {
        handleConclude()
      }
    } catch (err) {
      console.error('GD turn failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConclude = async () => {
    try {
      const history = messages.map(m => ({
        participant_name: m.participant_name,
        content: m.content,
        role: m.type === 'user' ? 'user' : 'ai'
      }))
      
      const response = await concludeGD({
        topic: session.topic,
        participants: session.participants,
        history: history
      })
      
      setResults(response)
      setScreen('results')
    } catch (err) {
      console.error('Failed to conclude GD:', err)
    }
  }

  const handleTryAnother = () => {
    setScreen('setup')
    setTopic('')
    setMessages([])
    setSession(null)
    setResults(null)
    setTurnNumber(0)
    setTimeLeft(0)
    synth.cancel()
    setSpeakingId(null)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const ScoreCircle = ({ score, label, size = 60, color }) => {
    const circumference = 2 * Math.PI * 22
    const offset = circumference - (score / 100) * circumference
    
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={22} stroke="var(--surface-2)" strokeWidth="4" fill="none" />
            <circle 
              cx={size/2} cy={size/2} r={22} 
              stroke={color} 
              strokeWidth="4" 
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: size * 0.28, color: 'var(--text-primary)' }}>{score}</span>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{label}</p>
      </div>
    )
  }

  if (screen === 'setup') {
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
            style={{ textAlign: 'center', marginBottom: '2rem' }}
          >
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Group Discussion</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Practice with AI participants</p>
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
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
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
                    onClick={() => setTopic(t)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: topic === t ? 'var(--accent-subtle)' : 'var(--surface)',
                      color: topic === t ? 'var(--accent)' : 'var(--text-secondary)',
                      border: topic === t ? '1px solid var(--accent)' : '1px solid var(--border)',
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
                    onClick={() => setParticipantCount(n)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      background: participantCount === n ? 'var(--accent)' : 'var(--surface)',
                      color: participantCount === n ? 'white' : 'var(--text-secondary)',
                      border: participantCount === n ? '1px solid var(--accent)' : '1px solid var(--border)',
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
                    onClick={() => setDuration(n)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      background: duration === n ? 'var(--accent)' : 'var(--surface)',
                      color: duration === n ? 'white' : 'var(--text-secondary)',
                      border: duration === n ? '1px solid var(--accent)' : '1px solid var(--border)',
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
              onClick={handleStart}
              disabled={!topic.trim() || loading}
              className="btn-forge"
              style={{ width: '100%', opacity: !topic.trim() || loading ? 0.5 : 1 }}
            >
              {loading ? 'Starting...' : 'Start Discussion'}
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  if (screen === 'results' && results) {
    const perf = results.user_performance
    
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
            style={{ textAlign: 'center', marginBottom: '2rem' }}
          >
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Discussion Complete</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{session.topic}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glow-card"
            style={{ padding: '2rem', marginBottom: '1.5rem' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <p style={{ fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Overall Score</p>
              <ScoreCircle score={perf.overall_score} size={120} color="var(--accent)" />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
              <ScoreCircle score={perf.communication_score} label="Communication" color="var(--success)" />
              <ScoreCircle score={perf.content_score} label="Content" color="var(--warning)" />
              <ScoreCircle score={perf.leadership_score} label="Leadership" color="var(--accent)" />
              <ScoreCircle score={perf.listening_score} label="Listening" color="#A855F7" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glow-card"
            style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--success)' }}
          >
            <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem' }}>Standout Moment</p>
            <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.6 }}>"{perf.standout_moment}"</p>
          </motion.div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glow-card"
              style={{ padding: '1.5rem', borderLeft: '3px solid var(--success)' }}
            >
              <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem' }}>Strengths</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {perf.strengths.map((s, idx) => (
                  <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--success)' }}>✓</span> {s}
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glow-card"
              style={{ padding: '1.5rem', borderLeft: '3px solid var(--warning)' }}
            >
              <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.75rem' }}>Areas to Improve</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {perf.improvements.map((imp, idx) => (
                  <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--warning)' }}>→</span> {imp}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glow-card"
            style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}
          >
            <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.6, textAlign: 'center' }}>"{perf.closing_message}"</p>
          </motion.div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleTryAnother} className="btn-forge" style={{ flex: 1 }}>
              Try Another Topic
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost" style={{ flex: 1 }}>
              Go to Dashboard
            </button>
          </div>
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
      
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', height: 'calc(100vh - 5rem)' }}>
        <div style={{ width: 200, padding: '1rem', borderRight: '1px solid var(--border)', display: 'none' }} className="md:block">
          <p style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>PARTICIPANTS</p>
          {session?.participants.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>{p.avatar}</span>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono' }}>{p.name}</p>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{p.style}</p>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4F6EF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>Y</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono' }}>You</p>
            </div>
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{session?.topic}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ 
                fontFamily: 'IBM Plex Mono', 
                fontSize: '1rem', 
                color: timeLeft <= 10 ? 'var(--danger)' : timeLeft <= 60 ? 'var(--warning)' : 'var(--accent)'
              }}>
                {formatTime(timeLeft)}
              </span>
              <button onClick={handleConclude} className="btn-ghost" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                End Discussion
              </button>
            </div>
          </div>
          
          <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  {msg.type !== 'user' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: msg.participant_color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: '0.625rem' }}>{msg.participant_name[0]}</span>
                    </div>
                  )}
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: msg.type === 'user' ? 'var(--accent)' : msg.participant_color }}>
                    {msg.participant_name}
                  </span>
                </div>
                <div style={{ 
                  position: 'relative',
                  maxWidth: '70%', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '1rem',
                  background: msg.type === 'user' ? 'var(--accent)' : 'var(--surface)',
                  color: msg.type === 'user' ? 'white' : 'var(--text-primary)',
                  border: msg.type !== 'user' ? '1px solid var(--border)' : 'none',
                  borderLeft: msg.type !== 'user' ? '3px solid ' + msg.participant_color : 'none'
                }}>
                  {msg.type !== 'user' && (
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
              </motion.div>
            ))}
            {loading && messages.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} className="animate-bounce" />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Participants responding...</span>
              </div>
            )}
          </div>
          
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={startVoiceInput}
                disabled={loading}
                style={{ 
                  padding: '0.625rem', 
                  background: isListening ? 'var(--danger)' : 'var(--surface-2)', 
                  color: isListening ? 'white' : 'var(--text-secondary)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '0.5rem', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isListening ? <MicOff style={{ width: 20, height: 20 }} /> : <Mic style={{ width: 20, height: 20 }} />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Share your thoughts..."
                disabled={loading}
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                style={{ 
                  padding: '0.625rem 1.5rem', 
                  background: 'var(--accent)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                  opacity: (!input.trim() || loading) ? 0.5 : 1
                }}
              >
                <Send style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GD
