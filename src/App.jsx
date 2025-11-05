import { useState, useEffect } from 'react'
import { FileText, Upload, Download, Check, Clock, AlertCircle, Zap, Crown, Briefcase, X, LogIn, LogOut, UserPlus, Mail, Lock, User, File, BarChart3, TrendingUp } from 'lucide-react'

const API_URL = 'https://translate-any-pdf.onrender.com'

const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
  { code: 'xh', name: 'isiXhosa', flag: '🇿🇦' },
  { code: 'st', name: 'Sesotho', flag: '🇿🇦' },
  { code: 'tn', name: 'Setswana', flag: '🇿🇦' },
  { code: 'ss', name: 'siSwati', flag: '🇿🇦' },
  { code: 'ts', name: 'Xitsonga', flag: '🇿🇦' },
  { code: 've', name: 'Tshivenda', flag: '🇿🇦' },
  { code: 'nr', name: 'isiNdebele', flag: '🇿🇦' },
  { code: 'nso', name: 'Sepedi', flag: '🇿🇦' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
]

const SUBSCRIPTION_TIERS = {
  free: { 
    name: 'Free', 
    limit: 5, 
    price: 0, 
    color: '#0056A8',
    icon: Zap,
    features: ['5 completed translations/month', 'All languages', 'DOCX & PDF support', 'Basic support', 'Standard processing']
  },
  professional: { 
    name: 'Professional', 
    limit: 20, 
    price: 299, 
    color: '#FFC800',
    icon: Crown,
    features: ['20 completed translations/month', 'All languages', 'DOCX & PDF support', 'Priority support', 'Fast processing', 'Email notifications']
  },
  enterprise: { 
    name: 'Enterprise', 
    limit: Infinity, 
    price: 999, 
    color: '#E01E1E',
    icon: Briefcase,
    features: ['Unlimited translations', 'All languages', 'DOCX & PDF support', '24/7 support', 'Instant processing', 'Dedicated manager', 'API access']
  }
}

// File type configuration
const FILE_TYPES = {
  '.docx': {
    name: 'Microsoft Word',
    icon: FileText,
    color: '#2b579a',
    description: 'Full formatting preservation'
  },
  '.pdf': {
    name: 'PDF Document',
    icon: File,
    color: '#dc2626',
    description: 'Text extraction & translation'
  }
}

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  
  // App state
  const [selectedFile, setSelectedFile] = useState(null)
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('af')
  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [translationProgress, setTranslationProgress] = useState(0)
  const [showSubscription, setShowSubscription] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [currentOperation, setCurrentOperation] = useState('')
  const [processingDocId, setProcessingDocId] = useState(null)
  const [showLimitModal, setShowLimitModal] = useState(false)
  
  // Metrics state
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [metricsData, setMetricsData] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [currentMetricsDoc, setCurrentMetricsDoc] = useState(null)

  // Helper functions
  const getFileExtension = (filename) => {
    return filename.substring(filename.lastIndexOf('.')).toLowerCase()
  }

  const isValidFile = (filename) => {
    const ext = getFileExtension(filename)
    return ext === '.docx' || ext === '.pdf'
  }

  const getFileTypeInfo = (filename) => {
    const ext = getFileExtension(filename)
    return FILE_TYPES[ext] || { name: 'Unknown', icon: File, color: '#666', description: '' }
  }

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')
    
    if (token && user) {
      setAuthToken(token)
      setCurrentUser(JSON.parse(user))
      setIsAuthenticated(true)
      fetchUserInfo(token)
    }
  }, [])

  // API calls with authentication
  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setCurrentUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      } else {
        // Token invalid, log out
        handleSignOut()
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint = authMode === 'signin' ? '/auth/signin' : '/auth/signup'
      const body = authMode === 'signin' 
        ? { email: authForm.email, password: authForm.password }
        : authForm

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        setAuthToken(data.token)
        setCurrentUser(data.user)
        setIsAuthenticated(true)
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setShowAuthModal(false)
        setAuthForm({ email: '', password: '', name: '' })
        showMessage(`Welcome ${data.user.name}!`, 'success')
        loadDocuments(data.token)
      } else {
        showMessage(data.detail || 'Authentication failed', 'error')
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      if (authToken) {
        await fetch(`${API_URL}/auth/signout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      }
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setAuthToken(null)
      setCurrentUser(null)
      setIsAuthenticated(false)
      setDocuments([])
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      showMessage('Signed out successfully', 'success')
    }
  }

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const canTranslate = () => {
    if (!currentUser) return false
    return currentUser.translations_used < currentUser.translations_limit
  }

  const getRemainingUses = () => {
    if (!currentUser) return 0
    if (currentUser.translations_limit === Infinity) return '∞'
    return Math.max(0, currentUser.translations_limit - currentUser.translations_used)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (!isAuthenticated) {
      showMessage('Please sign in to upload documents', 'error')
      setShowAuthModal(true)
      return
    }
    
    if (!canTranslate()) {
      showMessage(`Monthly limit reached. Please upgrade.`, 'error')
      setShowLimitModal(true)
      setShowSubscription(true)
      return
    }
    
    if (loading) {
      showMessage('Please wait for the current document to finish processing', 'error')
      return
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (isValidFile(file.name)) {
        setSelectedFile(file)
        const fileType = getFileTypeInfo(file.name)
        showMessage(`Selected: ${file.name} (${fileType.name})`, 'success')
      } else {
        showMessage('Please select a .docx or .pdf file', 'error')
      }
    }
  }

  const handleFileSelect = (e) => {
    if (!isAuthenticated) {
      showMessage('Please sign in to upload documents', 'error')
      setShowAuthModal(true)
      e.target.value = ''
      return
    }

    if (!canTranslate()) {
      showMessage(`Monthly limit reached. Please upgrade.`, 'error')
      setShowLimitModal(true)
      setShowSubscription(true)
      e.target.value = ''
      return
    }

    if (loading) {
      showMessage('Please wait for the current document to finish processing', 'error')
      e.target.value = ''
      return
    }
    
    const file = e.target.files[0]
    if (file && isValidFile(file.name)) {
      setSelectedFile(file)
      const fileType = getFileTypeInfo(file.name)
      showMessage(`Selected: ${file.name} (${fileType.name})`, 'success')
    } else {
      showMessage('Please select a .docx or .pdf file', 'error')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      showMessage('Please select a file first', 'error')
      return
    }

    if (!isAuthenticated) {
      showMessage('Please sign in first', 'error')
      setShowAuthModal(true)
      return
    }

    if (loading) {
      showMessage('Please wait for the current document to finish processing', 'error')
      return
    }

    if (!canTranslate()) {
      setShowLimitModal(true)
      setShowSubscription(true)
      showMessage(`Monthly limit reached.`, 'error')
      return
    }

    setLoading(true)
    setUploadProgress(0)
    setShowModal(true)
    setCurrentOperation('uploading')
    
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (response.ok) {
        const fileType = getFileTypeInfo(selectedFile.name)
        showMessage(`${fileType.name} uploaded successfully!`, 'success')
        setSelectedFile(null)
        
        setTimeout(() => {
          setUploadProgress(0)
          setCurrentOperation('translating')
          handleTranslate(data.doc_id)
        }, 500)
      } else {
        showMessage(`Upload failed: ${data.detail}`, 'error')
        setUploadProgress(0)
        setShowModal(false)
        setLoading(false)
        setCurrentOperation('')
      }
    } catch (error) {
      showMessage(`Upload error: ${error.message}`, 'error')
      setUploadProgress(0)
      setShowModal(false)
      setLoading(false)
      setCurrentOperation('')
    }
  }

  const handleTranslate = async (docId) => {
    setLoading(true)
    setTranslationProgress(0)
    setShowModal(true)
    setCurrentOperation('translating')
    setProcessingDocId(docId)

    try {
      const progressInterval = setInterval(() => {
        setTranslationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 15
        })
      }, 300)

      const response = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          doc_id: docId,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      })

      clearInterval(progressInterval)
      setTranslationProgress(100)

      const data = await response.json()

      if (response.ok) {
        showMessage('Translation completed successfully!', 'success')
        // Refresh user info to update usage count
        fetchUserInfo(authToken)
        loadDocuments(authToken)
        setTimeout(() => {
          setTranslationProgress(0)
          setShowModal(false)
          setLoading(false)
          setCurrentOperation('')
          setProcessingDocId(null)
        }, 1000)
      } else {
        showMessage(`Translation failed: ${data.detail}`, 'error')
        setTranslationProgress(0)
        setShowModal(false)
        setLoading(false)
        setCurrentOperation('')
        setProcessingDocId(null)
      }
    } catch (error) {
      showMessage(`Translation error: ${error.message}`, 'error')
      setTranslationProgress(0)
      setShowModal(false)
      setLoading(false)
      setCurrentOperation('')
      setProcessingDocId(null)
    }
  }

  const handleDownload = async (docId, filename) => {
    try {
      const response = await fetch(`${API_URL}/download/${docId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'translated_document'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showMessage('Download started!', 'success')
      } else {
        showMessage('Download failed', 'error')
      }
    } catch (error) {
      showMessage(`Download error: ${error.message}`, 'error')
    }
  }

  const handleViewMetrics = async (docId, filename) => {
    setCurrentMetricsDoc({ id: docId, filename })
    setShowMetricsModal(true)
    setMetricsLoading(true)
    setMetricsData(null)

    try {
      const response = await fetch(`${API_URL}/metrics/${docId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMetricsData(data)
      } else {
        const error = await response.json()
        showMessage(error.detail || 'Failed to load metrics', 'error')
        setShowMetricsModal(false)
      }
    } catch (error) {
      showMessage(`Metrics error: ${error.message}`, 'error')
      setShowMetricsModal(false)
    } finally {
      setMetricsLoading(false)
    }
  }

  const handleSubscribe = async (tier) => {
    if (tier === 'free') {
      showMessage('Cannot downgrade to free tier', 'error')
      return
    }

    if (!isAuthenticated) {
      showMessage('Please sign in to upgrade', 'error')
      setShowAuthModal(true)
      return
    }

    try {
      const response = await fetch(`${API_URL}/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ tier })
      })

      const data = await response.json()

      if (response.ok) {
        // Create and submit payment form
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = data.payment_url
        
        Object.entries(data.payment_data).forEach(([key, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = value
          form.appendChild(input)
        })

        document.body.appendChild(form)
        form.submit()
      } else {
        showMessage(`Payment initiation failed: ${data.detail}`, 'error')
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error')
    }
  }

  const loadDocuments = async (token = authToken) => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDocuments(data || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated && authToken) {
      loadDocuments()
      const interval = setInterval(() => loadDocuments(), 5000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, authToken])

  const TierIcon = currentUser ? SUBSCRIPTION_TIERS[currentUser.tier].icon : Zap

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#f59e0b'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  const getScoreGrade = (score) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return (
      <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '3rem', maxWidth: '450px', width: '90%', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.3)' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)' }}>
              <FileText size={40} color="#fff" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#1a1a2e', marginBottom: '0.5rem' }}>
              Academic Translator
            </h1>
            <p style={{ fontSize: '1rem', color: '#666' }}>
              DOCX & PDF Translation
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={20} color="#999" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    required={authMode === 'signup'}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} color="#999" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 3rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} color="#999" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 3rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#e0e0e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  Processing...
                </>
              ) : (
                <>
                  {authMode === 'signin' ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </>
              )}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </form>

          {message && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '12px',
              backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
              border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              color: message.type === 'success' ? '#155724' : '#721c24',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {message.text}
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      {/* Metrics Modal */}
      {showMetricsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '3rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4)',
            position: 'relative',
            animation: 'modalSlideIn 0.4s ease-out'
          }}>
            <button
              onClick={() => {
                setShowMetricsModal(false)
                setMetricsData(null)
                setCurrentMetricsDoc(null)
              }}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <X size={24} color="#666" />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '100px',
                height: '100px',
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 40px rgba(59, 130, 246, 0.4)'
              }}>
                <BarChart3 size={50} color="#fff" />
              </div>

              <h2 style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: '#1a1a2e',
                marginBottom: '0.5rem',
                lineHeight: '1.2'
              }}>
                Translation Quality Metrics
              </h2>

              <p style={{
                fontSize: '1rem',
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                {currentMetricsDoc?.filename}
              </p>
            </div>

            {metricsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid #e0e0e0',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1.5rem'
                }}></div>
                <p style={{ fontSize: '1rem', color: '#666' }}>
                  Analyzing translation quality...
                </p>
              </div>
            ) : metricsData ? (
              <div>
                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  {/* BLEU Score */}
                  <div style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '2px solid #bfdbfe'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: getScoreColor(metricsData.bleu_score),
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <TrendingUp size={20} color="#fff" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: '700', margin: 0 }}>
                          BLEU Score
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                          Precision-based
                        </p>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: '900',
                      color: getScoreColor(metricsData.bleu_score),
                      marginBottom: '0.5rem'
                    }}>
                      {metricsData.bleu_score}
                      <span style={{ fontSize: '1rem', fontWeight: '400', opacity: 0.7 }}>/100</span>
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: getScoreColor(metricsData.bleu_score)
                    }}>
                      {getScoreGrade(metricsData.bleu_score)}
                    </div>
                  </div>

                  {/* ChrF Score */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '2px solid #bbf7d0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: getScoreColor(metricsData.chrf_score),
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <TrendingUp size={20} color="#fff" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: '700', margin: 0 }}>
                          ChrF Score
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                          Character F-score
                        </p>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: '900',
                      color: getScoreColor(metricsData.chrf_score),
                      marginBottom: '0.5rem'
                    }}>
                      {metricsData.chrf_score}
                      <span style={{ fontSize: '1rem', fontWeight: '400', opacity: 0.7 }}>/100</span>
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: getScoreColor(metricsData.chrf_score)
                    }}>
                      {getScoreGrade(metricsData.chrf_score)}
                    </div>
                  </div>

                  {/* METEOR Score */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '2px solid #fde68a',
                    gridColumn: 'span 2'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: getScoreColor(metricsData.meteor_score),
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <TrendingUp size={20} color="#fff" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '700', margin: 0 }}>
                          METEOR Score
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                          Semantic alignment
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                      <div style={{
                        fontSize: '2.5rem',
                        fontWeight: '900',
                        color: getScoreColor(metricsData.meteor_score)
                      }}>
                        {metricsData.meteor_score}
                        <span style={{ fontSize: '1rem', fontWeight: '400', opacity: 0.7 }}>/100</span>
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: getScoreColor(metricsData.meteor_score)
                      }}>
                        {getScoreGrade(metricsData.meteor_score)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '1rem'
                  }}>
                    📊 Understanding These Metrics
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.7' }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}>
                      <strong>BLEU:</strong> Measures precision of word matches (higher = better word-level accuracy)
                    </p>
                    <p style={{ margin: '0 0 0.75rem 0' }}>
                      <strong>ChrF:</strong> Character-level F-score (better for morphologically rich languages)
                    </p>
                    <p style={{ margin: '0' }}>
                      <strong>METEOR:</strong> Considers synonyms and paraphrases (higher = better semantic meaning)
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  color: '#666'
                }}>
                  <span>Segments compared: <strong>{metricsData.segments_compared}</strong></span>
                  <span>Calculated: <strong>{new Date(metricsData.calculated_at).toLocaleString()}</strong></span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <AlertCircle size={60} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1rem', color: '#666' }}>
                  Failed to load metrics data
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Limit Reached Modal */}
      {showLimitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '3rem',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4)',
            position: 'relative',
            animation: 'modalSlideIn 0.4s ease-out',
            textAlign: 'center'
          }}>
            <button
              onClick={() => setShowLimitModal(false)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <X size={24} color="#666" />
            </button>

            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 2rem',
              background: 'linear-gradient(135deg, #FFC800 0%, #f59e0b 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 40px rgba(255, 200, 0, 0.4)',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <Crown size={50} color="#000" />
            </div>

            <h2 style={{
              fontSize: '2rem',
              fontWeight: '900',
              color: '#1a1a2e',
              marginBottom: '1rem',
              lineHeight: '1.2'
            }}>
              Translation Limit Reached!
            </h2>

            <p style={{
              fontSize: '1.1rem',
              color: '#666',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              You've completed all <strong>{currentUser.translations_limit}</strong> translations in your {SUBSCRIPTION_TIERS[currentUser.tier].name} plan this month.
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '2px solid #bae6fd'
            }}>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#0c4a6e',
                marginBottom: '1rem'
              }}>
                Upgrade to continue translating
              </h3>
              <div style={{ textAlign: 'left', display: 'inline-block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#fff" />
                  </div>
                  <span style={{ fontSize: '0.95rem', color: '#0c4a6e', fontWeight: '500' }}>Translate up to 20 or unlimited documents</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#fff" />
                  </div>
                  <span style={{ fontSize: '0.95rem', color: '#0c4a6e', fontWeight: '500' }}>Priority processing & support</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#fff" />
                  </div>
                  <span style={{ fontSize: '0.95rem', color: '#0c4a6e', fontWeight: '500' }}>DOCX & PDF support</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowLimitModal(false)
                  setShowSubscription(true)
                }}
                style={{
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #FFC800 0%, #f59e0b 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 8px 24px rgba(255, 200, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Crown size={20} />
                View Premium Plans
              </button>
              
              <button
                onClick={() => setShowLimitModal(false)}
                style={{
                  padding: '1rem 2rem',
                  background: 'transparent',
                  color: '#666',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Maybe Later
              </button>
            </div>

            <p style={{
              fontSize: '0.85rem',
              color: '#999',
              marginTop: '1.5rem',
              fontStyle: 'italic'
            }}>
              Your limit will reset next month
            </p>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '3rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={24} color="#666" />
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                background: currentOperation === 'uploading' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
              }}>
                {currentOperation === 'uploading' ? (
                  <Upload size={40} color="#fff" />
                ) : (
                  <FileText size={40} color="#fff" />
                )}
              </div>

              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                color: '#1a1a2e',
                marginBottom: '1rem'
              }}>
                {currentOperation === 'uploading' ? 'Uploading Document' : 'Translating Document'}
              </h2>

              <p style={{
                fontSize: '1rem',
                color: '#666',
                marginBottom: '2rem'
              }}>
                {currentOperation === 'uploading' 
                  ? 'Please wait while we upload your document...' 
                  : 'Your document is being translated. This may take a moment...'}
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentOperation === 'uploading' ? '#667eea' : '#f5576c'
                  }}>
                    {currentOperation === 'uploading' ? 'Upload Progress' : 'Translation Progress'}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: currentOperation === 'uploading' ? '#667eea' : '#f5576c'
                  }}>
                    {currentOperation === 'uploading' ? uploadProgress : translationProgress}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '12px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${currentOperation === 'uploading' ? uploadProgress : translationProgress}%`,
                    height: '100%',
                    background: currentOperation === 'uploading' 
                      ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' 
                      : 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                    transition: 'width 0.3s ease',
                    borderRadius: '6px'
                  }}></div>
                </div>
              </div>

              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e0e0e0',
                borderTopColor: currentOperation === 'uploading' ? '#667eea' : '#f5576c',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>

              <p style={{
                fontSize: '0.875rem',
                color: '#999',
                marginTop: '1.5rem',
                fontStyle: 'italic'
              }}>
                You can close this modal. The process will continue in the background.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)' }}>
              <FileText size={28} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>
                Academic Translator
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                DOCX & PDF Translation Service
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Current Plan</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TierIcon size={18} />
                {SUBSCRIPTION_TIERS[currentUser.tier].name}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '2rem' }}>
        {/* Alert Message */}
        {message && (
          <div style={{ 
            padding: '1rem 1.5rem', 
            marginBottom: '1.5rem', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            backgroundColor: message.type === 'success' ? '#d4edda' : message.type === 'error' ? '#f8d7da' : '#d1ecf1',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : message.type === 'error' ? '#f5c6cb' : '#bee5eb'}`,
            color: message.type === 'success' ? '#155724' : message.type === 'error' ? '#721c24' : '#0c5460',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {message.type === 'success' && <Check size={20} />}
            {message.type === 'error' && <AlertCircle size={20} />}
            <span style={{ fontWeight: '500' }}>{message.text}</span>
          </div>
        )}

        {/* Usage Banner */}
        <div style={{ 
          background: !canTranslate() 
            ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
            : currentUser.translations_used >= currentUser.translations_limit - 1 && currentUser.translations_limit !== Infinity
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          borderRadius: '16px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: !canTranslate() 
            ? '0 8px 32px rgba(220, 38, 38, 0.3)'
            : currentUser.translations_used >= currentUser.translations_limit - 1 && currentUser.translations_limit !== Infinity
              ? '0 8px 32px rgba(245, 158, 11, 0.3)'
              : '0 8px 32px rgba(102, 126, 234, 0.3)',
          color: '#ffffff',
          border: !canTranslate() ? '2px solid rgba(255,255,255,0.3)' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!canTranslate() && <AlertCircle size={18} />}
                Completed Translations This Month
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                {currentUser.translations_used} <span style={{ fontSize: '1.25rem', fontWeight: '400', opacity: 0.8 }}>
                  / {currentUser.translations_limit === Infinity ? '∞' : currentUser.translations_limit}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>
                {!canTranslate() 
                  ? '❌ Limit reached - Upgrade to continue'
                  : getRemainingUses() === '∞' 
                    ? 'Unlimited translations available' 
                    : getRemainingUses() === 1
                      ? '⚠️ Only 1 translation remaining!'
                      : `${getRemainingUses()} remaining`}
              </div>
            </div>
            <button
              onClick={() => setShowSubscription(!showSubscription)}
              style={{ 
                padding: '1rem 2rem', 
                background: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {showSubscription ? 'Hide Plans' : 'Upgrade Plan →'}
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        {showSubscription && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
              const Icon = tier.icon
              const isCurrentPlan = currentUser.tier === key
              return (
                <div 
                  key={key} 
                  style={{ 
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: isCurrentPlan ? `0 8px 32px ${tier.color}40` : '0 4px 12px rgba(0,0,0,0.1)',
                    border: isCurrentPlan ? `2px solid ${tier.color}` : '1px solid #e0e0e0',
                    transition: 'all 0.3s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isCurrentPlan && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '1rem', 
                      right: '1rem', 
                      background: tier.color, 
                      color: key === 'professional' ? '#000' : '#fff',
                      padding: '0.5rem 1rem', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: '700' 
                    }}>
                      CURRENT
                    </div>
                  )}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      background: `${tier.color}20`, 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <Icon size={32} color={tier.color} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', color: '#1a1a2e' }}>
                      {tier.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '3rem', fontWeight: '800', color: tier.color }}>
                        R{tier.price}
                      </span>
                      <span style={{ fontSize: '1rem', color: '#666' }}>/month</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '2rem' }}>
                    {tier.features.map((feature, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          background: `${tier.color}20`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Check size={14} color={tier.color} />
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#555' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={isCurrentPlan || key === 'free'}
                    style={{ 
                      width: '100%',
                      padding: '1rem',
                      background: (isCurrentPlan || key === 'free') ? '#e0e0e0' : tier.color,
                      color: (isCurrentPlan || key === 'free') ? '#999' : (key === 'professional' ? '#000' : '#fff'),
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: (isCurrentPlan || key === 'free') ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: (isCurrentPlan || key === 'free') ? 0.6 : 1
                    }}
                  >
                    {isCurrentPlan ? 'Current Plan' : key === 'free' ? 'Free Tier' : 'Subscribe Now'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Upload Section */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Upload size={24} color="#667eea" />
              Upload Document
            </h2>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={canTranslate() && !loading ? handleDrag : undefined}
              onDragLeave={canTranslate() && !loading ? handleDrag : undefined}
              onDragOver={canTranslate() && !loading ? handleDrag : undefined}
              onDrop={canTranslate() && !loading ? handleDrop : undefined}
              style={{
                border: !canTranslate() ? '2px dashed #ffc107' : dragActive ? '2px dashed #667eea' : '2px dashed #e0e0e0',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                background: !canTranslate() ? '#fff9e6' : loading ? '#f5f5f5' : dragActive ? '#f0f4ff' : '#f8f9fa',
                transition: 'all 0.2s',
                cursor: !canTranslate() || loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
              onClick={() => {
                if (!canTranslate()) {
                  setShowLimitModal(true)
                  setShowSubscription(true)
                } else if (!loading) {
                  document.getElementById('fileInput').click()
                }
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                {!canTranslate() ? (
                  <Crown size={48} color="#ffc107" style={{ margin: '0 auto' }} />
                ) : selectedFile ? (
                  (() => {
                    const FileIcon = getFileTypeInfo(selectedFile.name).icon
                    return <FileIcon size={48} color={getFileTypeInfo(selectedFile.name).color} style={{ margin: '0 auto' }} />
                  })()
                ) : (
                  <FileText size={48} color={loading ? '#ccc' : dragActive ? '#667eea' : '#999'} style={{ margin: '0 auto' }} />
                )}
              </div>
              <p style={{ fontSize: '1rem', fontWeight: '600', color: !canTranslate() ? '#856404' : loading ? '#999' : '#333', marginBottom: '0.5rem' }}>
                {!canTranslate() 
                  ? '🔒 Monthly Limit Reached' 
                  : loading 
                    ? 'Processing document...' 
                    : selectedFile 
                      ? selectedFile.name 
                      : 'Drop your DOCX or PDF file here'}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                {!canTranslate() 
                  ? `All ${currentUser.translations_limit} translations completed - Upgrade for more` 
                  : loading 
                    ? 'Please wait for current translation to complete' 
                    : selectedFile
                      ? `${getFileTypeInfo(selectedFile.name).name} • ${getFileTypeInfo(selectedFile.name).description}`
                      : 'Supports .docx and .pdf files • or click to browse'}
              </p>
              <input
                id="fileInput"
                type="file"
                accept=".docx,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={loading || !canTranslate()}
              />
            </div>

            {/* Format Info Box */}
            <div style={{ 
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} color="#2b579a" />
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>DOCX:</span>
                  <span style={{ color: '#475569' }}>Perfect formatting</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <File size={16} color="#dc2626" />
                  <span style={{ color: '#991b1b', fontWeight: '600' }}>PDF:</span>
                  <span style={{ color: '#475569' }}>Text translation</span>
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>
                  Source Language
                </label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: loading ? '#f5f5f5' : '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>
                  Target Language
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: loading ? '#f5f5f5' : '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {LANGUAGES.filter(l => l.code !== 'auto').map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || loading || !canTranslate()}
              style={{
                width: '100%',
                padding: '1rem',
                background: (!selectedFile || loading || !canTranslate()) ? '#e0e0e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: (!selectedFile || loading || !canTranslate()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: (!selectedFile || loading || !canTranslate()) ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload & Translate
                </>
              )}
            </button>

            {!canTranslate() && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1.25rem', 
                background: 'linear-gradient(135deg, #fff3cd 0%, #ffe4a3 100%)', 
                border: '2px solid #ffc107', 
                borderRadius: '12px', 
                fontSize: '0.95rem', 
                color: '#856404',
                boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <AlertCircle size={20} />
                  <strong>Monthly Translation Limit Reached</strong>
                </div>
                <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.875rem' }}>
                  You've completed all {currentUser.translations_limit} translations in your {SUBSCRIPTION_TIERS[currentUser.tier].name} plan this month. Upgrade to translate more documents.
                </p>
                <button
                  onClick={() => {
                    setShowLimitModal(true)
                    setShowSubscription(true)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Crown size={18} />
                  View Premium Plans
                </button>
              </div>
            )}
          </div>

          {/* Statistics Section */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={24} color="#667eea" />
              Statistics
            </h2>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Total Documents</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#667eea' }}>{documents.length}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #4ade8020 0%, #22c55e20 100%)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Completed</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#22c55e' }}>{documents.filter(d => d.status === 'completed').length}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #fbbf2420 0%, #f59e0b20 100%)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Processing</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f59e0b' }}>{documents.filter(d => d.status === 'translating' || d.status === 'uploaded').length}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>This Month</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#667eea' }}>{currentUser.translations_used}</div>
              </div>
            </div>

            {/* Multi-Format Info Box */}
            <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)', borderRadius: '12px', padding: '1.5rem', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.5rem' }}>
                    Multi-Format Support
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: '1.6', margin: 0 }}>
                    Translate both <strong>DOCX</strong> (with full formatting) and <strong>PDF</strong> files. Perfect for dissertations, theses, research papers, and academic documents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={24} color="#667eea" />
            Translated Documents
          </h2>

          {documents.filter(d => d.status === 'completed').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <FileText size={64} color="#e0e0e0" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#999', marginBottom: '0.5rem' }}>
                No translated documents yet
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#bbb' }}>
                Upload and translate your first DOCX or PDF file to see it here
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {documents.filter(doc => doc.status === 'completed').map((doc) => {
                const statusConfig = {
                  completed: { color: '#22c55e', bg: '#22c55e15', icon: Check },
                  translating: { color: '#f59e0b', bg: '#f59e0b15', icon: Clock },
                  uploaded: { color: '#667eea', bg: '#667eea15', icon: Upload },
                  failed: { color: '#ef4444', bg: '#ef444415', icon: AlertCircle }
                }
                const config = statusConfig[doc.status] || statusConfig.uploaded
                const StatusIcon = config.icon
                const fileTypeInfo = getFileTypeInfo(doc.filename)
                const FileTypeIcon = fileTypeInfo.icon

                return (
                  <div
                    key={doc.doc_id}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto auto auto',
                      gap: '1.5rem',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: config.bg, 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <FileTypeIcon size={24} color={fileTypeInfo.color} />
                    </div>

                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1a1a2e', marginBottom: '0.25rem' }}>
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {new Date(doc.upload_time).toLocaleString('en-ZA', { 
                          dateStyle: 'medium', 
                          timeStyle: 'short' 
                        })}
                      </div>
                    </div>

                    <div style={{
                      padding: '0.4rem 0.75rem',
                      background: `${fileTypeInfo.color}15`,
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: fileTypeInfo.color
                    }}>
                      {fileTypeInfo.name}
                    </div>

                    <div style={{
                      padding: '0.5rem 1rem',
                      background: config.bg,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <StatusIcon size={16} color={config.color} />
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: config.color, textTransform: 'capitalize' }}>
                        {doc.status}
                      </span>
                    </div>

                    <button
                      onClick={() => handleViewMetrics(doc.doc_id, doc.filename)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      <BarChart3 size={16} />
                      Metrics
                    </button>

                    <button
                      onClick={() => handleDownload(doc.doc_id, doc.filename)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                      }}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#ffffff', padding: '2rem', marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Academic Document Translator
          </div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
            Supporting DOCX & PDF • 11 South African Languages • Research & Academic Use
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            Preserving academic integrity through professional translation • 2025
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 12px 40px rgba(255, 200, 0, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 16px 50px rgba(255, 200, 0, 0.6);
          }
        }
        * {
          box-sizing: border-box;
        }
        select:focus,
        button:focus,
        input:focus {
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }
        @media (max-width: 768px) {
          main > div:first-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

export default App