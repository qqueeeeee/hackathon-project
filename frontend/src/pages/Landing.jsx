import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Map, Mic, ArrowRight } from 'lucide-react'

const Landing = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: Zap,
      title: 'Resume Intelligence',
      description: 'AI-powered analysis of your resume to uncover your true potential and target roles.',
    },
    {
      icon: Map,
      title: 'Career Roadmap',
      description: 'Your Future Self maps out the exact path with milestones and resources.',
    },
    {
      icon: Mic,
      title: 'Future Self Interview',
      description: 'Practice with your future self. Get real feedback on your answers.',
    }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, var(--accent-subtle) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)' }}>PathForge</span>
            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent)' }}>AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontFamily: 'Inter', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Agentic Career Intelligence Platform</span>
          </div>
        </motion.nav>

        <div className="text-center mb-24 relative">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '4rem', marginBottom: '1.5rem', lineHeight: 1.1 }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Talk to </span>
            <span style={{ color: 'var(--accent)' }}>Your Future Self</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '32rem', margin: '0 auto 3rem', lineHeight: 1.6 }}
          >
            Don't just plan your career —{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>meet the version of yourself</span> who already made it.
          </motion.p>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            onClick={() => navigate('/resume')}
            className="btn-forge"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
          >
            Meet Your Future Self
            <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
          </motion.button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '6rem' }}
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 + idx * 0.1 }}
              className="glow-card"
              style={{ padding: '2rem' }}
            >
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <feature.icon style={{ width: '1.75rem', height: '1.75rem', color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{feature.title}</h3>
              <p style={{ fontFamily: 'Inter', fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{ textAlign: 'center', paddingBottom: '2rem' }}
        >
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Powered by Groq LLM • Built for Career Excellence
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Landing
