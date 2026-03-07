import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload as UploadIcon, FileText, Check, ChevronRight, ChevronLeft, X, Plus, Trash2, Download, RotateCcw } from 'lucide-react'
import { parseResume, parseResumeFromBuilder } from '../utils/api'

const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Cloud Architect',
  'Mobile Developer',
  'Product Manager',
  'UI/UX Designer',
  'Data Engineer',
  'Security Engineer',
  'Custom'
]

const TEMPLATES = [
  { id: 'minimal', name: 'Minimal', description: 'Clean single column, lots of whitespace, black and white' },
  { id: 'modern', name: 'Modern', description: 'Two-column layout with accent sidebar' },
  { id: 'bold', name: 'Bold', description: 'Full-width with thick colored header' }
]

const Resume = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('upload')
  const [file, setFile] = useState(null)
  const [selectedRole, setSelectedRole] = useState('Frontend Developer')
  const [customRole, setCustomRole] = useState('')
  const [roadmapDuration, setRoadmapDuration] = useState(() => {
    const saved = localStorage.getItem('pf_duration')
    return saved ? parseInt(saved) : 12
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const [builderStep, setBuilderStep] = useState(1)
  const [builderData, setBuilderData] = useState({
    name: '', email: '', phone: '', linkedin: '', github: '', location: '',
    education: [{ degree: '', institution: '', year: '', cgpa: '' }],
    experience: [{ title: '', company: '', start_date: '', end_date: '', is_present: false, description: '' }],
    projects: [{ name: '', tech_stack: '', description: '' }],
    skills: []
  })
  const [skillInput, setSkillInput] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('minimal')
  const [parsedResult, setParsedResult] = useState(null)

  const [errors, setErrors] = useState({})
  const [eduErrors, setEduErrors] = useState([{}])
  const [expErrors, setExpErrors] = useState([{}])
  const [projErrors, setProjErrors] = useState([{}])
  const [skillError, setSkillError] = useState('')

  const getErrorMessage = (err) => {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join(', ')
    if (typeof detail === 'object') return detail.msg || JSON.stringify(detail)
    return err.message || 'Something went wrong'
  }

  useEffect(() => {
    const profile = localStorage.getItem('pf_profile')
    if (profile) setParsedResult(JSON.parse(profile))
  }, [])

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      if (selected.type !== 'application/pdf') { setError('Please upload a PDF file'); return }
      setFile(selected); setError('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    const selected = e.dataTransfer.files[0]
    if (selected && selected.type === 'application/pdf') { setFile(selected); setError('') }
  }

  const validateUpload = () => {
    const newErrors = {}
    if (selectedRole === 'Custom' && customRole.length < 2) {
      newErrors.customRole = 'Please enter a valid role name'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleParseResume = async () => {
    if (!file) { setError('Please upload a PDF file'); return }
    if (!selectedRole) { setError('Please select a target role'); return }
    if (!validateUpload()) return
    setLoading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const profile = await parseResume(formData)
      if (!profile.name || !profile.skills) throw new Error('Invalid response from server')
      localStorage.setItem('pf_profile', JSON.stringify(profile))
      localStorage.setItem('pf_target_role', selectedRole === 'Custom' ? customRole : selectedRole)
      setParsedResult(profile)
    } catch (err) {
      console.error('Resume parse error:', err)
      setError(getErrorMessage(err) || 'Failed to parse resume')
    } finally { setLoading(false) }
  }

  const validateStep1 = () => {
    const newErrors = {}
    if (!builderData.name || builderData.name.length < 2) newErrors.name = 'Name must be at least 2 characters'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!builderData.email) newErrors.email = 'Email is required'
    else if (!emailRegex.test(builderData.email)) newErrors.email = 'Please enter a valid email address'
    if (builderData.phone && !/^[+\d\s\-()]{7,15}$/.test(builderData.phone)) newErrors.phone = 'Please enter a valid phone number'
    if (builderData.linkedin && !builderData.linkedin.startsWith('https://linkedin.com') && !builderData.linkedin.startsWith('https://www.linkedin.com')) newErrors.linkedin = 'Must be a valid LinkedIn URL'
    if (builderData.github && !builderData.github.startsWith('https://github.com')) newErrors.github = 'Must be a valid GitHub URL'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = builderData.education.map(edu => {
      const err = {}
      if (!edu.degree?.trim()) err.degree = 'Degree is required'
      if (!edu.institution?.trim()) err.institution = 'Institution is required'
      if (!edu.year) err.year = 'Year is required'
      else { const y = parseInt(edu.year); if (isNaN(y) || y < 1950 || y > 2035) err.year = 'Please enter a valid graduation year' }
      if (edu.cgpa) { const c = parseFloat(edu.cgpa); if (isNaN(c) || c < 0 || c > 10) err.cgpa = 'CGPA must be between 0 and 10' }
      return err
    })
    setEduErrors(newErrors)
    return newErrors.every(e => Object.keys(e).length === 0)
  }

  const validateStep3 = () => {
    const newErrors = builderData.experience.map(exp => {
      const err = {}
      if (!exp.title?.trim()) err.title = 'Job title is required'
      if (!exp.company?.trim()) err.company = 'Company name is required'
      if (!exp.start_date?.trim()) err.start_date = 'Start date is required'
      if (!exp.is_present && !exp.end_date?.trim()) err.end_date = 'End date is required'
      if (exp.description && exp.description.length < 20) err.description = 'Description should be more detailed (min 20 characters)'
      return err
    })
    setExpErrors(newErrors)
    return newErrors.every(e => Object.keys(e).length === 0)
  }

  const validateStep4 = () => {
    const newErrors = builderData.projects.map(proj => {
      const err = {}
      if (!proj.name?.trim()) err.name = 'Project name is required'
      if (proj.tech_stack && proj.tech_stack.length < 2) err.tech_stack = 'Tech stack should be at least 2 characters'
      if (proj.description && proj.description.length < 20) err.description = 'Description should be more detailed (min 20 characters)'
      return err
    })
    setProjErrors(newErrors)
    return newErrors.every(e => Object.keys(e).length === 0)
  }

  const canProceed = () => {
    switch (builderStep) {
      case 1: return validateStep1()
      case 2: return validateStep2()
      case 3: return validateStep3()
      case 4: return validateStep4()
      case 5: return true
      case 6: 
        if (selectedRole === 'Custom' && (!customRole || customRole.length < 2)) {
          setErrors(prev => ({...prev, customRole: 'Please enter a valid role name'}))
          return false
        }
        return true
      default: return true
    }
  }

  const handleBuilderSubmit = async () => {
    setLoading(true); setError('')
    if (!builderData.name?.trim()) { setError('Please enter your full name'); setLoading(false); return }
    if (!builderData.email?.trim()) { setError('Please enter your email address'); setLoading(false); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(builderData.email)) { setError('Please enter a valid email address'); setLoading(false); return }
    const validEducation = builderData.education.filter(e => e.degree?.trim() && e.institution?.trim() && e.year)
    if (validEducation.length === 0) { setError('Please add at least one education entry'); setLoading(false); return }

    const cleanedData = {
      name: builderData.name.trim(), email: builderData.email.trim(),
      phone: builderData.phone?.trim() || '', linkedin: builderData.linkedin?.trim() || '',
      github: builderData.github?.trim() || '', location: builderData.location?.trim() || '',
      education: validEducation.map(e => ({ degree: e.degree.trim(), institution: e.institution.trim(), year: parseInt(e.year) || new Date().getFullYear(), cgpa: e.cgpa?.trim() || undefined })),
      experience: builderData.experience.filter(e => e.title?.trim() && e.company?.trim()).map(e => ({ title: e.title.trim(), company: e.company.trim(), start_date: e.start_date?.trim() || 'N/A', end_date: e.is_present ? undefined : (e.end_date?.trim() || undefined), is_present: e.is_present || false, description: e.description?.trim() || '' })),
      projects: builderData.projects.filter(p => p.name?.trim()).map(p => ({ name: p.name.trim(), tech_stack: p.tech_stack?.trim() || '', description: p.description?.trim() || '' })),
      skills: builderData.skills.filter(s => s.trim())
    }

    try {
      const profile = await parseResumeFromBuilder(cleanedData)
      localStorage.setItem('pf_profile', JSON.stringify(profile))
      localStorage.setItem('pf_target_role', selectedRole === 'Custom' ? customRole : selectedRole || 'Frontend Developer')
      setParsedResult(profile)
      generateHtmlResume(builderData, selectedTemplate)
    } catch (err) {
      console.error('Resume generation error:', err)
      setError(getErrorMessage(err) || 'Failed to generate resume')
    } finally { setLoading(false) }
  }

  const generateHtmlResume = (data, template) => {
    let html = ''
    if (template === 'minimal') {
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.name}</title>
  <style>
    body {
      font-family: Helvetica Neue, Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #111;
      line-height: 1.6;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 16px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin-top: 24px;
    }
    .item {
      margin-bottom: 16px;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill {
      background: #f5f5f5;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>${data.name}</h1>
  <p style="color:#666;font-size:14px">
    ${data.email}${data.phone ? ' | ' + data.phone : ''}${data.location ? ' | ' + data.location : ''}
  </p>
  
  <h2>Education</h2>
  ${data.education.map(e => `
    <div class="item">
      <strong>${e.degree}</strong> - ${e.institution}, ${e.year}
    </div>
  `).join('')}
  
  <h2>Experience</h2>
  ${data.experience.map(e => `
    <div class="item">
      <strong>${e.title}</strong> at ${e.company} (${e.start_date}${e.is_present ? ' - Present' : ' - ' + e.end_date})
      <p>${e.description}</p>
    </div>
  `).join('')}
  
  <h2>Projects</h2>
  ${data.projects.map(p => `
    <div class="item">
      <strong>${p.name}</strong>
      <p>${p.tech_stack}</p>
      <p>${p.description}</p>
    </div>
  `).join('')}
  
  <h2>Skills</h2>
  <div class="skills">
    ${data.skills.map(s => `<span class="skill">${s}</span>`).join('')}
  </div>
</body>
</html>`
    } else if (template === 'modern') {
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.name}</title>
  <style>
    body {
      font-family: Segoe UI, Arial, sans-serif;
      margin: 0;
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 280px;
      background: #0891b2;
      color: white;
      padding: 30px;
    }
    .main {
      flex: 1;
      padding: 30px;
    }
    h1 {
      font-size: 32px;
      margin: 0 0 8px;
    }
    h2 {
      color: #0891b2;
      border-bottom: 2px solid #0891b2;
      padding-bottom: 8px;
      margin-top: 24px;
    }
    .sidebar h2 {
      color: white;
      border-color: rgba(255,255,255,0.3);
    }
    .skill {
      background: #f1f5f9;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      color: #0891b2;
      display: inline-block;
      margin: 4px;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <h2>Contact</h2>
    <p>${data.email}</p>
    <p>${data.phone}</p>
    <p>${data.location}</p>
    
    <h2>Skills</h2>
    ${data.skills.map(s => `<span class="skill">${s}</span>`).join('')}
  </div>
  
  <div class="main">
    <h1>${data.name}</h1>
    
    <h2>Education</h2>
    ${data.education.map(e => `
      <div style="margin-bottom:16px">
        <strong>${e.degree}</strong> - ${e.institution}, ${e.year}
      </div>
    `).join('')}
    
    <h2>Experience</h2>
    ${data.experience.map(e => `
      <div style="margin-bottom:16px">
        <strong>${e.title}</strong> at ${e.company}
        <p>${e.description}</p>
      </div>
    `).join('')}
    
    <h2>Projects</h2>
    ${data.projects.map(p => `
      <div style="margin-bottom:16px">
        <strong>${p.name}</strong>
        <p>${p.tech_stack}</p>
        <p>${p.description}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>`
    } else {
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
    }
    .header {
      background: linear-gradient(135deg, #0891b2, #4f46e5);
      color: white;
      padding: 40px;
    }
    .header h1 {
      margin: 0;
      font-size: 36px;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
      max-width: 900px;
      margin: 0 auto;
    }
    h2 {
      color: #0891b2;
      border-bottom: 2px solid #0891b2;
      padding-bottom: 8px;
      margin-top: 32px;
    }
    .skill {
      background: #e0f2fe;
      color: #0891b2;
      padding: 4px 12px;
      border-radius: 4px;
      margin: 4px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.name}</h1>
    <p>${data.email}${data.phone ? ' | ' + data.phone : ''}${data.location ? ' | ' + data.location : ''}</p>
  </div>
  
  <div class="content">
    <h2>Skills</h2>
    ${data.skills.map(s => `<span class="skill">${s}</span>`).join('')}
    
    <h2>Education</h2>
    ${data.education.map(e => `
      <div style="margin-bottom:16px">
        <strong>${e.degree}</strong> - ${e.institution}, ${e.year}
      </div>
    `).join('')}
    
    <h2>Experience</h2>
    ${data.experience.map(e => `
      <div style="margin-bottom:16px">
        <strong>${e.title}</strong> at ${e.company}
        <p>${e.description}</p>
      </div>
    `).join('')}
    
    <h2>Projects</h2>
    ${data.projects.map(p => `
      <div style="margin-bottom:16px">
        <strong>${p.name}</strong>
        <p>${p.tech_stack}</p>
        <p>${p.description}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>`
    }
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'resume.html'; a.click()
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes) => bytes < 1024 ? bytes + ' B' : bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  const removeFile = (e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }

  const addSkill = () => {
    if (!skillInput.trim()) return
    if (builderData.skills.some(s => s.toLowerCase() === skillInput.trim().toLowerCase())) {
      setSkillError('This skill is already added'); return
    }
    setSkillError('')
    setBuilderData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }))
    setSkillInput('')
  }

  const removeSkill = (idx) => setBuilderData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== idx) }))
  const addEducation = () => { setBuilderData(prev => ({ ...prev, education: [...prev.education, { degree: '', institution: '', year: '', cgpa: '' }] })); setEduErrors(prev => [...prev, {}]) }
  const updateEducation = (idx, field, value) => { setBuilderData(prev => ({ ...prev, education: prev.education.map((e, i) => i === idx ? { ...e, [field]: value } : e) })); setEduErrors(prev => prev.map((e, i) => i === idx ? { ...e, [field]: '' } : e)) }
  const removeEducation = (idx) => { setBuilderData(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== idx) })); setEduErrors(prev => prev.filter((_, i) => i !== idx)) }
  const addExperience = () => { setBuilderData(prev => ({ ...prev, experience: [...prev.experience, { title: '', company: '', start_date: '', end_date: '', is_present: false, description: '' }] })); setExpErrors(prev => [...prev, {}]) }
  const updateExperience = (idx, field, value) => { setBuilderData(prev => ({ ...prev, experience: prev.experience.map((e, i) => i === idx ? { ...e, [field]: value } : e) })); setExpErrors(prev => prev.map((e, i) => i === idx ? { ...e, [field]: '' } : e)) }
  const removeExperience = (idx) => { setBuilderData(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== idx) })); setExpErrors(prev => prev.filter((_, i) => i !== idx)) }
  const addProject = () => { setBuilderData(prev => ({ ...prev, projects: [...prev.projects, { name: '', tech_stack: '', description: '' }] })); setProjErrors(prev => [...prev, {}]) }
  const updateProject = (idx, field, value) => { setBuilderData(prev => ({ ...prev, projects: prev.projects.map((p, i) => i === idx ? { ...p, [field]: value } : p) })); setProjErrors(prev => prev.map((e, i) => i === idx ? { ...e, [field]: '' } : e)) }
  const removeProject = (idx) => { setBuilderData(prev => ({ ...prev, projects: prev.projects.filter((_, i) => i !== idx) })); setProjErrors(prev => prev.filter((_, i) => i !== idx)) }

  const renderError = (msg) => msg ? <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'Inter', marginTop: '0.25rem', marginLeft: '0.25rem' }}>{msg}</p> : null
  const inputStyle = (hasError) => ({ width: '100%', border: hasError ? '1px solid var(--danger)' : '1px solid var(--border)' })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', paddingTop: '5rem' }}>
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '48rem', margin: '0 auto', padding: '2rem 1.5rem' }}>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            {parsedResult ? 'Resume Updated!' : 'Your Resume'}
          </h1>
          <p style={{ fontFamily: 'Inter', color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            {parsedResult ? 'Your profile has been saved.' : 'Upload an existing resume or build one from scratch'}
          </p>
        </motion.div>

        {!parsedResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            {[['upload', 'I have a resume'], ['build', 'Build my resume']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '0.75rem 1.5rem', borderRadius: '9999px', fontFamily: 'Inter', fontSize: '0.875rem', fontWeight: 500, background: mode === m ? 'var(--surface-2)' : 'transparent', color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)', border: mode === m ? '1px solid var(--border)' : '1px solid transparent', cursor: 'pointer' }}>{label}</button>
            ))}
          </motion.div>
        )}

        {parsedResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glow-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '4rem', height: '4rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.5rem', color: 'white' }}>{parsedResult.name?.charAt(0) || 'U'}</span>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{parsedResult.name}</h3>
                <p style={{ fontFamily: 'Inter', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{parsedResult.experience_years} years experience</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {parsedResult.skills?.slice(0, 6).map((skill, idx) => (
                <span key={idx} style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '0.875rem', fontFamily: 'IBM Plex Mono' }}>{skill}</span>
              ))}
            </div>
            {parsedResult.parsing_notes && (
              <p style={{
                fontFamily: 'IBM Plex Mono',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--surface-2)',
                borderRadius: '0.5rem',
                borderLeft: '3px solid var(--accent)'
              }}>
                {parsedResult.parsing_notes}
              </p>
            )}
            <button onClick={() => { localStorage.removeItem('pf_profile'); localStorage.removeItem('pf_target_role'); localStorage.removeItem('pf_roadmap'); localStorage.removeItem('pf_interview_score'); setParsedResult(null) }} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontFamily: 'Inter', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <RotateCcw style={{ width: 14, height: 14 }} />
              Start Over
            </button>
          </motion.div>
        )}

        {!parsedResult && mode === 'upload' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glow-card"
              style={{ padding: '2rem', marginBottom: '1.5rem', cursor: 'pointer', border: isDragging ? '1px solid var(--accent)' : '1px solid var(--border)' }}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '4rem', height: '4rem', borderRadius: '0.75rem', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent)' }}>
                    <FileText style={{ width: '2rem', height: '2rem', color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.25rem' }}>{file.name}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatFileSize(file.size)}</p>
                  </div>
                  <button onClick={removeFile} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <div style={{ width: '5rem', height: '5rem', borderRadius: '1rem', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '1px solid var(--border)' }}>
                    <UploadIcon style={{ width: '2.5rem', height: '2.5rem', color: 'var(--accent)' }} />
                  </div>
                  <p style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Drop your PDF resume here</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>or click to browse</p>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glow-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Target Role</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {ROLES.map((role) => (
                  <button key={role} onClick={() => { setSelectedRole(role); if (role !== 'Custom') { setCustomRole(''); setErrors(prev => ({ ...prev, customRole: '' })) } }} style={{ padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 500, fontFamily: 'Inter', background: selectedRole === role ? 'var(--accent-subtle)' : 'var(--surface)', color: selectedRole === role ? 'var(--text-primary)' : 'var(--text-secondary)', border: selectedRole === role ? '1px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}>{role}</button>
                ))}
              </div>
              {selectedRole === 'Custom' && (
                <div style={{ marginTop: '1rem' }}>
                  <input type="text" value={customRole} onChange={(e) => { setCustomRole(e.target.value); if (errors.customRole) setErrors(prev => ({ ...prev, customRole: '' })) }} placeholder="Enter your target role..." className="input-glass" style={inputStyle(errors.customRole)} />
                  {renderError(errors.customRole)}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glow-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Roadmap Duration</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[3, 6, 12, 18, 24].map((months) => (
                  <button
                    key={months}
                    onClick={() => { setRoadmapDuration(months); localStorage.setItem('pf_duration', months.toString()) }}
                    style={{
                      padding: '0.625rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      fontFamily: 'IBM Plex Mono',
                      background: roadmapDuration === months ? 'var(--accent)' : 'var(--surface)',
                      color: roadmapDuration === months ? 'white' : 'var(--text-secondary)',
                      border: roadmapDuration === months ? '1px solid var(--accent)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {months} months
                  </button>
                ))}
              </div>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>
              </motion.div>
            )}

            <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} onClick={handleParseResume} disabled={!file || loading} className="btn-forge" style={{ width: '100%' }}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}><svg className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeLinecap="round" /></svg>Analysing with AI...</span>
                : 'Parse Resume'
              }
            </motion.button>
          </>
        )}

        {!parsedResult && mode === 'build' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Step {builderStep} of 6</span>
                <span style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>{Math.round((builderStep / 6) * 100)}%</span>
              </div>
              <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
                <motion.div style={{ height: '100%', background: 'var(--accent)' }} initial={{ width: 0 }} animate={{ width: `${(builderStep / 6) * 100}%` }} />
              </div>
            </motion.div>

            <motion.div key={builderStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glow-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              {builderStep === 1 && (
                <div>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Personal Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div>
                      <input type="text" placeholder="Full Name *" value={builderData.name} onChange={(e) => { setBuilderData({ ...builderData, name: e.target.value }); if (errors.name) setErrors(prev => ({ ...prev, name: '' })) }} className="input-glass" style={inputStyle(errors.name)} />
                      {renderError(errors.name)}
                    </div>
                    <div>
                      <input type="email" placeholder="Email *" value={builderData.email} onChange={(e) => { setBuilderData({ ...builderData, email: e.target.value }); if (errors.email) setErrors(prev => ({ ...prev, email: '' })) }} className="input-glass" style={inputStyle(errors.email)} />
                      {renderError(errors.email)}
                    </div>
                    <div>
                      <input type="tel" placeholder="Phone" value={builderData.phone} onChange={(e) => { setBuilderData({ ...builderData, phone: e.target.value }); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })) }} className="input-glass" style={inputStyle(errors.phone)} />
                      {renderError(errors.phone)}
                    </div>
                    <input type="text" placeholder="City/Location" value={builderData.location} onChange={(e) => setBuilderData({ ...builderData, location: e.target.value })} className="input-glass" style={{ width: '100%' }} />
                    <div>
                      <input type="url" placeholder="LinkedIn URL" value={builderData.linkedin} onChange={(e) => { setBuilderData({ ...builderData, linkedin: e.target.value }); if (errors.linkedin) setErrors(prev => ({ ...prev, linkedin: '' })) }} className="input-glass" style={inputStyle(errors.linkedin)} />
                      {renderError(errors.linkedin)}
                    </div>
                    <div>
                      <input type="url" placeholder="GitHub URL" value={builderData.github} onChange={(e) => { setBuilderData({ ...builderData, github: e.target.value }); if (errors.github) setErrors(prev => ({ ...prev, github: '' })) }} className="input-glass" style={inputStyle(errors.github)} />
                      {renderError(errors.github)}
                    </div>
                  </div>
                </div>
              )}

              {builderStep === 2 && (
                <div>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Education</h3>
                  {builderData.education.map((edu, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <input type="text" placeholder="Degree *" value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} className="input-glass" style={inputStyle(eduErrors[idx]?.degree)} />
                          {renderError(eduErrors[idx]?.degree)}
                        </div>
                        <div>
                          <input type="text" placeholder="Institution *" value={edu.institution} onChange={(e) => updateEducation(idx, 'institution', e.target.value)} className="input-glass" style={inputStyle(eduErrors[idx]?.institution)} />
                          {renderError(eduErrors[idx]?.institution)}
                        </div>
                        <div>
                          <input type="number" placeholder="Year *" value={edu.year} onChange={(e) => updateEducation(idx, 'year', e.target.value)} className="input-glass" style={inputStyle(eduErrors[idx]?.year)} />
                          {renderError(eduErrors[idx]?.year)}
                        </div>
                        <div>
                          <input type="text" placeholder="CGPA (optional)" value={edu.cgpa} onChange={(e) => updateEducation(idx, 'cgpa', e.target.value)} className="input-glass" style={inputStyle(eduErrors[idx]?.cgpa)} />
                          {renderError(eduErrors[idx]?.cgpa)}
                        </div>
                      </div>
                      {builderData.education.length > 1 && (
                        <button onClick={() => removeEducation(idx)} style={{ color: 'var(--danger)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 style={{ width: '1rem', height: '1rem' }} />Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addEducation} className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Plus style={{ width: '1rem', height: '1rem' }} />Add Education
                  </button>
                </div>
              )}

              {builderStep === 3 && (
                <div>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Experience</h3>
                  {builderData.experience.map((exp, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <input type="text" placeholder="Job Title *" value={exp.title} onChange={(e) => updateExperience(idx, 'title', e.target.value)} className="input-glass" style={inputStyle(expErrors[idx]?.title)} />
                          {renderError(expErrors[idx]?.title)}
                        </div>
                        <div>
                          <input type="text" placeholder="Company *" value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} className="input-glass" style={inputStyle(expErrors[idx]?.company)} />
                          {renderError(expErrors[idx]?.company)}
                        </div>
                        <div>
                          <input type="text" placeholder="Start Date" value={exp.start_date} onChange={(e) => updateExperience(idx, 'start_date', e.target.value)} className="input-glass" style={inputStyle(expErrors[idx]?.start_date)} />
                          {renderError(expErrors[idx]?.start_date)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="End Date" value={exp.end_date} onChange={(e) => updateExperience(idx, 'end_date', e.target.value)} disabled={exp.is_present} className="input-glass" style={{ flex: 1, border: expErrors[idx]?.end_date ? '1px solid var(--danger)' : '1px solid var(--border)' }} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', background: 'var(--surface-2)', borderRadius: '0.5rem', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                              <input type="checkbox" checked={exp.is_present} onChange={(e) => { updateExperience(idx, 'is_present', e.target.checked); if (e.target.checked) setExpErrors(prev => prev.map((err, i) => i === idx ? { ...err, end_date: '' } : err)) }} style={{ accentColor: 'var(--accent)' }} />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Present</span>
                            </label>
                          </div>
                          {renderError(expErrors[idx]?.end_date)}
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <textarea placeholder="Description" value={exp.description} onChange={(e) => updateExperience(idx, 'description', e.target.value)} className="input-glass" style={{ width: '100%', height: '6rem', resize: 'none', border: expErrors[idx]?.description ? '1px solid var(--danger)' : '1px solid var(--border)' }} />
                          {renderError(expErrors[idx]?.description)}
                        </div>
                      </div>
                      {builderData.experience.length > 1 && (
                        <button onClick={() => removeExperience(idx)} style={{ color: 'var(--danger)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 style={{ width: '1rem', height: '1rem' }} />Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addExperience} className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Plus style={{ width: '1rem', height: '1rem' }} />Add Experience
                  </button>
                </div>
              )}

              {builderStep === 4 && (
                <div>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Projects</h3>
                  {builderData.projects.map((proj, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.75rem', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <input type="text" placeholder="Project Name *" value={proj.name} onChange={(e) => updateProject(idx, 'name', e.target.value)} className="input-glass" style={inputStyle(projErrors[idx]?.name)} />
                          {renderError(projErrors[idx]?.name)}
                        </div>
                        <div>
                          <input type="text" placeholder="Tech Stack" value={proj.tech_stack} onChange={(e) => updateProject(idx, 'tech_stack', e.target.value)} className="input-glass" style={inputStyle(projErrors[idx]?.tech_stack)} />
                          {renderError(projErrors[idx]?.tech_stack)}
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <textarea placeholder="Description" value={proj.description} onChange={(e) => updateProject(idx, 'description', e.target.value)} className="input-glass" style={{ width: '100%', height: '6rem', resize: 'none', border: projErrors[idx]?.description ? '1px solid var(--danger)' : '1px solid var(--border)' }} />
                          {renderError(projErrors[idx]?.description)}
                        </div>
                      </div>
                      {builderData.projects.length > 1 && (
                        <button onClick={() => removeProject(idx)} style={{ color: 'var(--danger)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 style={{ width: '1rem', height: '1rem' }} />Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addProject} className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Plus style={{ width: '1rem', height: '1rem' }} />Add Project
                  </button>
                </div>
              )}

              {builderStep === 5 && (
                <div>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Skills</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" placeholder="Type a skill and press Enter" value={skillInput} onChange={(e) => { setSkillInput(e.target.value); setSkillError('') }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill() } }} className="input-glass" style={{ flex: 1 }} />
                    <button onClick={addSkill} className="btn-forge">Add</button>
                  </div>
                  {skillError && renderError(skillError)}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                    {builderData.skills.map((skill, idx) => (
                      <span key={idx} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '0.875rem', fontFamily: 'IBM Plex Mono', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {skill}
                        <button onClick={() => removeSkill(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}>
                          <X style={{ width: '1rem', height: '1rem' }} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {builderData.skills.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No skills added yet. Type above to add skills.</p>}
                </div>
              )}

              {builderStep === 6 && (
                <div>
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Choose Template</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {TEMPLATES.map((template) => (
                      <div key={template.id} onClick={() => setSelectedTemplate(template.id)} style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '0.75rem', border: selectedTemplate === template.id ? '2px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', position: 'relative' }}>
                        {selectedTemplate === template.id && (
                          <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check style={{ width: '0.75rem', height: '0.75rem', color: 'white' }} />
                          </div>
                        )}
                        <div style={{ height: '5rem', background: 'var(--surface-2)', borderRadius: '0.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--text-secondary)' }}>{template.id === 'minimal' ? '1' : template.id === 'modern' ? '2' : '3'}</span>
                        </div>
                        <p style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', fontSize: '0.875rem' }}>{template.name}</p>
                        <p style={{ fontFamily: 'Inter', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.75rem', marginTop: '0.25rem' }}>{template.description}</p>
                      </div>
                    ))}
                  </div>
                  
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Target Role</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                    {ROLES.slice(0, 12).map((role) => (
                      <button key={role} onClick={() => { setSelectedRole(role); if (role !== 'Custom') { setCustomRole(''); setErrors(prev => ({...prev, customRole: ''})) } }} style={{ padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 500, fontFamily: 'Inter', background: selectedRole === role ? 'var(--accent-subtle)' : 'var(--surface)', color: selectedRole === role ? 'var(--text-primary)' : 'var(--text-secondary)', border: selectedRole === role ? '1px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}>{role}</button>
                    ))}
                  </div>
                  <button key="Custom" onClick={() => { setSelectedRole('Custom'); setCustomRole(''); setErrors(prev => ({...prev, customRole: ''})) }} style={{ padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 500, fontFamily: 'Inter', background: selectedRole === 'Custom' ? 'var(--accent-subtle)' : 'var(--surface)', color: selectedRole === 'Custom' ? 'var(--text-primary)' : 'var(--text-secondary)', border: selectedRole === 'Custom' ? '1px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', width: '100%', marginBottom: selectedRole === 'Custom' ? '0.75rem' : '0' }}>Custom</button>
                  {selectedRole === 'Custom' && (
                    <>
                      <input 
                        type="text" 
                        value={customRole} 
                        onChange={(e) => { setCustomRole(e.target.value); if (errors.customRole) setErrors(prev => ({...prev, customRole: ''})) }} 
                        placeholder="Enter your target role..." 
                        className="input-glass" 
                        style={{ width: '100%', border: errors.customRole ? '1px solid var(--danger)' : '1px solid var(--border)' }} 
                      />
                      {renderError(errors.customRole)}
                    </>
                  )}
                </div>
              )}
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>
              </motion.div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {builderStep > 1 && (
                <button onClick={() => setBuilderStep(builderStep - 1)} className="btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <ChevronLeft style={{ width: '1.25rem', height: '1.25rem' }} />Back
                </button>
              )}
              {builderStep < 6
                ? (
                  <button onClick={() => { if (canProceed()) setBuilderStep(builderStep + 1) }} className="btn-forge" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Next<ChevronRight style={{ width: '1.25rem', height: '1.25rem' }} />
                  </button>
                ) : (
                  <button onClick={handleBuilderSubmit} disabled={loading || !builderData.name || !builderData.email} className="btn-forge" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {loading
                      ? <><svg className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeLinecap="round" /></svg>Generating...</>
                      : <><Download style={{ width: '1.25rem', height: '1.25rem' }} />Generate and Download</>
                    }
                  </button>
                )
              }
            </div>
          </>
        )}

        {parsedResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => navigate('/roadmap')} className="btn-forge" style={{ flex: 1 }}>Generate Roadmap</button>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost" style={{ flex: 1 }}>Go to Dashboard</button>
          </motion.div>
        )}

      </div>
    </div>
  )
}

export default Resume
