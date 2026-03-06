import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RotateCcw, FileText, Map, Mic, Trophy, Target, Sparkles, Upload, RefreshCw, ArrowRight, Search, Check, X, AlertCircle } from 'lucide-react'

const calculateResumeScore = (profile) => {
  if (!profile) return 0
  let score = 0
  
  if (profile.name) score += 10
  
  const skills = profile.skills || []
  if (skills.length > 0) {
    score += Math.min(25, skills.length * 2.5)
  }
  
  const experience = profile.experience || []
  if (experience.length > 0) {
    score += Math.min(30, experience.length * 10)
  }
  
  const education = profile.education || []
  if (education.length > 0) {
    score += Math.min(15, education.length * 7.5)
  }
  
  if (profile.summary) score += 10
  
  const years = profile.experience_years || 0
  score += Math.min(10, years * 2)
  
  return Math.min(100, score)
}

const COMMON_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'express',
  'django', 'flask', 'spring', 'rails', 'laravel', 'sql', 'mysql', 'postgresql', 'mongodb',
  'redis', 'graphql', 'rest', 'api', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'devops',
  'ci/cd', 'jenkins', 'git', 'github', 'gitlab', 'linux', 'unix', 'bash', 'shell',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'nlp', 'computer vision',
  'data science', 'data analysis', 'pandas', 'numpy', 'scikit-learn', 'tableau', 'power bi',
  'excel', 'statistics', 'agile', 'scrum', 'jira', 'html', 'css', 'sass', 'less',
  'bootstrap', 'tailwind', 'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
  'ui/ux', 'design', 'figma', 'prototyping', 'wireframing', 'usability testing',
  'product management', 'project management', 'leadership', 'communication', 'teamwork',
  'problem solving', 'critical thinking', 'analysis', 'testing', 'selenium', 'cypress',
  'jest', 'mocha', 'pytest', 'junit', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
  'c++', 'c#', '.net', 'asp.net', 'objective-c', 'ios', 'android', 'react native',
  'flutter', 'graphql', 'apollo', 'webpack', 'vite', 'babel', 'eslint', 'prettier'
]

const extractSkillsFromJD = (jd) => {
  const jdLower = jd.toLowerCase()
  const foundSkills = new Set()
  
  for (const skill of COMMON_SKILLS) {
    if (jdLower.includes(skill.toLowerCase())) {
      foundSkills.add(skill)
    }
  }
  
  return Array.from(foundSkills)
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [jobDescription, setJobDescription] = useState('')
  const [jdAnalysis, setJdAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  
  const profile = JSON.parse(localStorage.getItem('pf_profile') || 'null')
  const targetRole = localStorage.getItem('pf_target_role') || 'Unknown'
  const roadmap = JSON.parse(localStorage.getItem('pf_roadmap') || '{}')
  const interviewScore = parseInt(localStorage.getItem('pf_interview_score') || '0')
  const hasProfile = !!profile

  const handleStartOver = () => {
    localStorage.clear()
    window.location.href = '/'
  }

  const analyzeJobDescription = () => {
    if (!jobDescription.trim() || !profile) return
    
    setAnalyzing(true)
    
    setTimeout(() => {
      const requiredSkills = extractSkillsFromJD(jobDescription)
      const userSkills = (profile.skills || []).map(s => s.toLowerCase())
      
      const matchedSkills = requiredSkills.filter(skill => 
        userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      )
      
      const missingSkills = requiredSkills.filter(skill => 
        !matchedSkills.includes(skill)
      )
      
      const matchScore = requiredSkills.length > 0 
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0
      
      setJdAnalysis({
        matchScore,
        requiredSkills,
        matchedSkills,
        missingSkills,
        totalRequired: requiredSkills.length,
        totalMatched: matchedSkills.length
      })
      
      setAnalyzing(false)
    }, 500)
  }

  const resetAnalysis = () => {
    setJobDescription('')
    setJdAnalysis(null)
  }

  const StatCard = ({ icon: Icon, label, value, gradient, color, delay }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glow-card p-6" style={{ transition: 'transform 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          <Icon style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
      </div>
      <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2.25rem', color }}>{value}</p>
    </motion.div>
  )

  const ActionCard = ({ icon: Icon, title, description, to, locked }) => (
    <Link to={to} className="glow-card p-6" style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? 'none' : 'auto', transition: 'border-color 0.2s' }}>
      <div style={{ width: 56, height: 56, borderRadius: '1rem', background: locked ? 'var(--border)' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
        <Icon style={{ width: 28, height: 28, color: 'white' }} />
      </div>
      <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{description}</p>
      {!locked && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 500, opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
          Get Started <ArrowRight style={{ width: 16, height: 16 }} />
        </div>
      )}
    </Link>
  )

  if (!hasProfile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', padding: '2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
            <div style={{ width: 96, height: 96, borderRadius: '1.5rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 32px rgba(79,110,247,0.3)' }}>
              <Sparkles style={{ width: 48, height: 48, color: 'white' }} />
            </div>
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Welcome to PathForge AI</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: 400, margin: '0 auto' }}>Your career dashboard is empty. Start by uploading or building your resume.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
            <ActionCard icon={Upload} title="Upload / Build Resume" description="Upload your existing resume or build one from scratch" to="/resume" />
            <ActionCard icon={Map} title="Generate Career Roadmap" description="Get a personalized path to your dream role" to="/roadmap" locked={!hasProfile} />
            <ActionCard icon={Mic} title="Start Mock Interview" description="Practice with your future self" to="/interview" locked={!hasProfile} />
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', marginBottom: '2rem' }} className="md:flex-row md:items-center md:justify-between">
          <div style={{ marginBottom: '1rem' }} className="md:mb-0">
            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Welcome back, <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile?.name || 'Future Champion'}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target style={{ width: 16, height: 16, color: 'var(--accent)' }} />
              Target: <span style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono' }}>{targetRole}</span>
            </p>
          </div>
          <button onClick={handleStartOver} style={{ background: 'transparent', border: '2px solid var(--accent)', color: 'var(--accent)', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontFamily: 'Inter', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', alignSelf: 'flex-start' }}>
            <RotateCcw style={{ width: 16, height: 16, display: 'inline', marginRight: '0.5rem' }} />Start Over
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glow-card p-6 mb-8">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '1rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.25rem', color: 'white' }}>{profile?.name?.charAt(0) || 'U'}</span>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{profile?.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{profile?.skills?.length || 0} skills • {profile?.experience_years || 0} years exp</p>
              </div>
            </div>
            <button onClick={() => navigate('/resume')} style={{ background: 'transparent', border: '2px solid var(--accent)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '0.75rem', fontFamily: 'Inter', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}>Re-upload</button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <button onClick={() => navigate('/roadmap')} style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: 'var(--text-primary)', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontFamily: 'Inter', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none', boxShadow: '0 4px 16px rgba(79,110,247,0.3)' }}>
            <RefreshCw style={{ width: 16, height: 16, display: 'inline', marginRight: '0.5rem' }} />Regenerate Roadmap
          </button>
          <button onClick={() => navigate('/interview')} style={{ background: 'transparent', border: '2px solid var(--accent)', color: 'var(--accent)', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontFamily: 'Inter', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            <Mic style={{ width: 16, height: 16, display: 'inline', marginRight: '0.5rem' }} />Redo Interview
          </button>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <StatCard icon={FileText} label="Resume Score" value={profile ? Math.round(calculateResumeScore(profile)) : '—'} gradient="linear-gradient(135deg, var(--accent), var(--accent-hover))" color="var(--accent)" delay={0.2} />
          <StatCard icon={Mic} label="Interview Score" value={interviewScore || '—'} gradient={interviewScore >= 70 ? 'linear-gradient(135deg, var(--success), #16A34A)' : interviewScore >= 50 ? 'linear-gradient(135deg, var(--warning), #D97706)' : 'linear-gradient(135deg, var(--danger), #DC2626)'} color={interviewScore >= 70 ? 'var(--success)' : interviewScore >= 50 ? 'var(--warning)' : 'var(--danger)'} delay={0.3} />
          <StatCard icon={Map} label="Roadmap Milestones" value={roadmap.milestones?.length || 0} gradient="linear-gradient(135deg, var(--warning), #D97706)" color="var(--warning)" delay={0.4} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glow-card p-6 mb-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Search style={{ width: 24, height: 24, color: 'var(--accent)' }} />
            <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Job Description Match</h2>
          </div>
          
          {!jdAnalysis ? (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Paste a job description to see how well your skills match the requirements.</p>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste job description here..."
                className="input-glass"
                style={{ width: '100%', height: '150px', resize: 'vertical', marginBottom: '1rem' }}
              />
              <button
                onClick={analyzeJobDescription}
                disabled={!jobDescription.trim() || analyzing}
                className="btn-forge"
                style={{ width: '100%' }}
              >
                {analyzing ? 'Analyzing...' : 'Analyze Match'}
              </button>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Match Score</p>
                  <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2.5rem', color: jdAnalysis.matchScore >= 70 ? 'var(--success)' : jdAnalysis.matchScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                    {jdAnalysis.matchScore}%
                  </p>
                </div>
                <button onClick={resetAnalysis} className="btn-ghost" style={{ padding: '0.5rem 1rem' }}>
                  Try Another
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.75rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Skills You Have</p>
                  <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--success)' }}>{jdAnalysis.totalMatched}/{jdAnalysis.totalRequired}</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.75rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Skills Missing</p>
                  <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'var(--danger)' }}>{jdAnalysis.missingSkills.length}</p>
                </div>
              </div>
              
              {jdAnalysis.matchedSkills.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check style={{ width: 16, height: 16 }} /> Skills You Have
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {jdAnalysis.matchedSkills.map((skill, idx) => (
                      <span key={idx} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {jdAnalysis.missingSkills.length > 0 && (
                <div>
                  <p style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle style={{ width: 16, height: 16 }} /> Skills You Need
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {jdAnalysis.missingSkills.map((skill, idx) => (
                      <span key={idx} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', border: '1px solid rgba(239,68,68,0.2)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
