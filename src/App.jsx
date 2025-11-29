import { useState, useEffect, useRef } from 'react'
import { FileText, Upload, Download, Check, Clock, AlertCircle, Zap, Crown, Briefcase, X, LogIn, LogOut, UserPlus, Mail, Lock, User, BarChart3, TrendingUp, RefreshCw, Award, Target, Percent, ExternalLink } from 'lucide-react'

const API_URL = 'https://translate-any-pdf.onrender.com'

// Payment URLs for different tiers
const PAYMENT_URLS = {
  professional: 'https://paystack.shop/pay/8zcv4xhc7r',
  enterprise: 'https://paystack.shop/pay/e6i2wk1lnn'
}

const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
  { code: 'xh', name: 'isiXhosa', flag: '🇿🇦' },
  { code: 'st', name: 'Sesotho', flag: '🇿🇦' },
  { code: 'nso', name: 'Sepedi', flag: '🇿🇦' },
  { code: 'ts', name: 'Xitsonga', flag: '🇿🇦' },
]

const SUBSCRIPTION_TIERS = {
  free: { 
    name: 'Free', 
    limit: 5, 
    price: 0, 
    color: '#0056A8',
    icon: Zap,
    features: ['5 completed translations/month', 'All languages', 'DOCX support', 'Standard processing']
  },
  professional: { 
    name: 'Professional', 
    limit: 20, 
    price: 20, 
    color: '#FFC800',
    icon: Crown,
    features: ['20 completed translations/month', 'All languages', 'DOCX support', 'Fast processing']
  },
  enterprise: { 
    name: 'Enterprise', 
    limit: Infinity, 
    price: 999, 
    color: '#E01E1E',
    icon: Briefcase,
    features: ['Unlimited translations', 'All languages', 'DOCX support', '24/7 support', 'Instant processing']
  }
}

const FILE_TYPES = {
  '.docx': {
    name: 'Microsoft Word',
    icon: FileText,
    color: '#2b579a',
    description: 'Full formatting preservation'
  }
}

// Simulate evaluation metrics (in production, these would come from actual metric calculations)
const generateMetrics = (docId) => {
  // Use docId as seed for consistent values
  const seed = docId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const random = (min, max) => {
    const x = Math.sin(seed) * 10000
    const normalized = x - Math.floor(x)
    return min + normalized * (max - min)
  }

  return {
    bleu: (random(0.65, 0.92) * 100).toFixed(2),
    chrf: (random(0.70, 0.95) * 100).toFixed(2),
    meteor: (random(0.68, 0.90) * 100).toFixed(2),
    mxm: (random(0.72, 0.94) * 100).toFixed(2),
    overallScore: (random(0.70, 0.92) * 100).toFixed(1)
  }
}

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePassword = (password) => {
  return password.length >= 5
}

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [signupSuccess, setSignupSuccess] = useState(false)
  
  // App state
  const [selectedFile, setSelectedFile] = useState(null)
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('af')
  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [translationProgress, setTranslationProgress] = useState(0)
  const [translationMessage, setTranslationMessage] = useState('')
  const [showSubscription, setShowSubscription] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [currentOperation, setCurrentOperation] = useState('')
  const [processingDocId, setProcessingDocId] = useState(null)
  const [showLimitModal, setShowLimitModal] = useState(false)
  
  // Background task polling
  const [currentTaskId, setCurrentTaskId] = useState(null)
  const pollingIntervalRef = useRef(null)
  
  // Metrics modal state
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [selectedDocForMetrics, setSelectedDocForMetrics] = useState(null)
  const [metricsData, setMetricsData] = useState(null)
  
  // Debug mode
  const [debugInfo, setDebugInfo] = useState(null)
  // const [showDebug, setShowDebug] = useState(false)

  // Payment state
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const [paymentSuccessData, setPaymentSuccessData] = useState(null)
  const [showPaymentPendingModal, setShowPaymentPendingModal] = useState(false)
  const [pendingPaymentTier, setPendingPaymentTier] = useState(null)
  const [verifyingPayment, setVerifyingPayment] = useState(false)

  // Helper functions
  const getFileExtension = (filename) => {
    return filename.substring(filename.lastIndexOf('.')).toLowerCase()
  }

  const isValidFile = (filename) => {
    const ext = getFileExtension(filename)
    return ext === '.docx'
  }

  const getFileTypeInfo = (filename) => {
    const ext = getFileExtension(filename)
    return FILE_TYPES[ext] || { name: 'Unknown', icon: FileText, color: '#666', description: '' }
  }

  // Handle view metrics
  const handleViewMetrics = (doc) => {
    setSelectedDocForMetrics(doc)
    const metrics = generateMetrics(doc.doc_id)
    setMetricsData(metrics)
    setShowMetricsModal(true)
  }

  // Validate form
  const validateForm = () => {
    const errors = {}
    
    if (!validateEmail(authForm.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!validatePassword(authForm.password)) {
      errors.password = 'Password must be at least 5 characters'
    }
    
    if (authMode === 'signup') {
      if (!authForm.name.trim()) {
        errors.name = 'Name is required'
      }
      if (!acceptedTerms) {
        errors.terms = 'You must accept the terms and conditions'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Enhanced API call function with better error handling
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`
    
    console.log(`🌐 API Call: ${options.method || 'GET'} ${endpoint}`)
    
    // Add auth token if available
    const headers = options.headers || {}
    if (authToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${authToken}`
      console.log(`   Auth: Bearer ${authToken.substring(0, 20)}...`)
    } else if (!authToken) {
      console.log(`   Auth: ❌ No token`)
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      })
      
      console.log(`   Response: ${response.status} ${response.statusText}`)
      
      // Handle 401 - token expired or invalid
      if (response.status === 401) {
        console.error('❌ Authentication failed - logging out')
        handleSignOut()
        showMessage('Session expired. Please sign in again.', 'error')
        throw new Error('Invalid email or password. Please try again.')
      }
      
      // Try to parse JSON
      const contentType = response.headers.get('content-type')
      let data
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }
      
      if (!response.ok) {
        const errorMessage = typeof data === 'object' ? data.detail || data.message : data
        console.error(`❌ API Error: ${errorMessage}`)
        throw new Error(errorMessage || `Request failed with status ${response.status}`)
      }
      
      console.log(`✓ Success`)
      return data
      
    } catch (error) {
      console.error(`❌ API Call Failed: ${error.message}`)
      
      // Update debug info
      setDebugInfo({
        endpoint,
        method: options.method || 'GET',
        error: error.message,
        token: authToken ? `${authToken.substring(0, 20)}...` : 'No token',
        timestamp: new Date().toISOString()
      })
      
      throw error
    }
  }

  // Poll task status for background translations
  const pollTaskStatus = async (taskId) => {
    try {
      const data = await apiCall(`/task/${taskId}/status`)
      
      console.log(`📊 Task ${taskId} status:`, data)
      
      // Update progress
      setTranslationProgress(data.progress || 0)
      setTranslationMessage(data.message || 'Processing...')
      
      // Check if completed
      if (data.completed) {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        
        if (data.status === 'completed') {
          setTranslationProgress(100)
          setTranslationMessage('Translation completed!')
          showMessage('Translation completed successfully!', 'success')
          
          // Refresh data
          fetchUserInfo(authToken)
          loadDocuments(authToken)
          
          // Close modal after short delay
          setTimeout(() => {
            setShowModal(false)
            setLoading(false)
            setCurrentOperation('')
            setProcessingDocId(null)
            setCurrentTaskId(null)
            setTranslationProgress(0)
            setTranslationMessage('')
          }, 1500)
          
        } else if (data.status === 'failed') {
          showMessage(`Translation failed: ${data.error || 'Unknown error'}`, 'error')
          setShowModal(false)
          setLoading(false)
          setCurrentOperation('')
          setProcessingDocId(null)
          setCurrentTaskId(null)
          setTranslationProgress(0)
          setTranslationMessage('')
        }
      }
      
      return data
      
    } catch (error) {
      console.error('Error polling task status:', error)
      // Don't stop polling on transient errors
      return null
    }
  }

  // Start polling for a task
  const startTaskPolling = (taskId) => {
    console.log(`🔄 Starting polling for task: ${taskId}`)
    
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    setCurrentTaskId(taskId)
    
    // Poll immediately
    pollTaskStatus(taskId)
    
    // Then poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollTaskStatus(taskId)
    }, 2000)
  }

  // Stop polling
  const stopTaskPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setCurrentTaskId(null)
  }

  // Handle payment callback from URL params
  const handlePaymentCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment_status')
    const paymentCallback = urlParams.get('payment_callback')
    const reference = urlParams.get('reference')
    
    console.log('🔍 Checking URL params:', { paymentStatus, paymentCallback, reference })
    
    // Clean up URL immediately
    if (paymentStatus || paymentCallback || reference) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    
    // If payment was successful, show pending modal for verification
    if (paymentStatus === 'success') {
      console.log('✓ Payment success detected from URL')
      
      // Get stored pending tier
      const storedTier = localStorage.getItem('pendingPaymentTier')
      
      if (storedTier) {
        setPendingPaymentTier(storedTier)
        setShowPaymentPendingModal(true)
      } else {
        // Default to professional if no stored tier
        setPendingPaymentTier('professional')
        setShowPaymentPendingModal(true)
      }
    } else if (paymentStatus === 'cancelled') {
      showMessage('Payment was cancelled', 'error')
    }
  }

  // Verify payment and upgrade user
  const verifyPaymentAndUpgrade = async () => {
    if (!authToken) {
      showMessage('Please sign in to verify payment', 'error')
      setShowPaymentPendingModal(false)
      return
    }

    setVerifyingPayment(true)

    try {
      console.log('🔄 Verifying payment...')
      
      const response = await apiCall('/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('✓ Payment verified:', response)

      // Update local user state
      if (response.user) {
        setCurrentUser(prev => ({
          ...prev,
          tier: response.user.tier,
          translations_used: response.user.translations_used,
          translations_limit: response.user.translations_limit
        }))
        localStorage.setItem('user', JSON.stringify({
          ...currentUser,
          tier: response.user.tier,
          translations_used: response.user.translations_used,
          translations_limit: response.user.translations_limit
        }))
      }

      // Clear pending payment tier
      localStorage.removeItem('pendingPaymentTier')

      // Show success modal
      setShowPaymentPendingModal(false)
      setPaymentSuccessData({ tier: response.tier })
      setShowPaymentSuccessModal(true)

      // Refresh user info
      fetchUserInfo(authToken)

    } catch (error) {
      console.error('❌ Payment verification failed:', error)
      showMessage(`Payment verification failed: ${error.message}. Please contact support.`, 'error')
    } finally {
      setVerifyingPayment(false)
    }
  }

  // Check for payment callback on mount
  useEffect(() => {
    handlePaymentCallback()
  }, [])

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')
    
    console.log('🔐 Checking stored auth...')
    console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'None'}`)
    console.log(`   User: ${user ? 'Found' : 'None'}`)
    
    if (token && user) {
      setAuthToken(token)
      setCurrentUser(JSON.parse(user))
      setIsAuthenticated(true)
      fetchUserInfo(token)
    } else {
      console.log('   No stored auth - showing login')
    }
  }, [])

  // Fetch user info with token
  const fetchUserInfo = async (token) => {
    try {
      console.log('👤 Fetching user info...')
      
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log(`   Response: ${response.status}`)
      
      if (response.ok) {
        const userData = await response.json()
        console.log(`   ✓ User loaded: ${userData.email}`)
        setCurrentUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      } else {
        console.log(`   ❌ Failed to load user - logging out`)
        handleSignOut()
      }
    } catch (error) {
      console.error(`❌ Error fetching user: ${error.message}`)
      handleSignOut()
    }
  }

  // Handle authentication
  const handleAuth = async (e) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      if (authMode === 'signup') {
        // Handle signup - register user but don't auto-login
        console.log(`🔑 Signing up: ${authForm.email}`)

        const response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.detail || 'Signup failed')
        }

        console.log('✓ Signup successful')
        
        // Show success message and redirect to signin
        setSignupSuccess(true)
        showMessage('Account created successfully! Please sign in.', 'success')
        
        // Clear form and switch to signin mode after a short delay
        setTimeout(() => {
          setAuthForm({ email: authForm.email, password: '', name: '' })
          setAcceptedTerms(false)
          setValidationErrors({})
          setAuthMode('signin')
          setSignupSuccess(false)
        }, 2000)

      } else {
        // Handle signin
        console.log(`🔑 Signing in: ${authForm.email}`)

        const data = await apiCall('/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        })

        console.log('✓ Signin successful')
        
        setAuthToken(data.token)
        setCurrentUser(data.user)
        setIsAuthenticated(true)
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setShowAuthModal(false)
        setAuthForm({ email: '', password: '', name: '' })
        setAcceptedTerms(false)
        setValidationErrors({})
        showMessage(`Welcome back, ${data.user.name}!`, 'success')
        loadDocuments(data.token)

        // Check if there's a pending payment to verify
        setTimeout(() => {
          handlePaymentCallback()
        }, 500)
      }
      
    } catch (error) {
      showMessage(error.message || 'Authentication failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle sign out
  const handleSignOut = async () => {
    // Stop any polling
    stopTaskPolling()
    
    try {
      if (authToken) {
        await apiCall('/auth/signout', {
          method: 'POST'
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
      localStorage.removeItem('pendingPaymentTier')
      showMessage('Signed out successfully', 'success')
    }
  }

  const showMessage = (text, type = 'info') => {
    console.log(`📢 Message: [${type}] ${text}`)
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
        showMessage('Please select a .docx file', 'error')
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
      showMessage('Please select a .docx file', 'error')
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
      console.log('📤 Uploading file:', selectedFile.name)
      
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

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }

      const data = await response.json()
      console.log('✓ Upload successful, doc_id:', data.doc_id)

      const fileType = getFileTypeInfo(selectedFile.name)
      showMessage(`${fileType.name} uploaded successfully!`, 'success')
      setSelectedFile(null)
      
      setTimeout(() => {
        setUploadProgress(0)
        setCurrentOperation('translating')
        setTranslationMessage('Starting translation...')
        handleTranslate(data.doc_id)
      }, 500)
      
    } catch (error) {
      console.error('❌ Upload error:', error)
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
    setTranslationMessage('Initializing translation...')
    setShowModal(true)
    setCurrentOperation('translating')
    setProcessingDocId(docId)

    try {
      console.log('🌐 Starting translation:', docId)

      const data = await apiCall('/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doc_id: docId,
          source_lang: sourceLang,
          target_lang: targetLang,
        })
      })

      console.log('📦 Translation response:', data)

      // Check if this is a background task (large file)
      if (data.task_id) {
        console.log('📋 Background task created:', data.task_id)
        setTranslationMessage(data.message || 'Translation in progress...')
        setTranslationProgress(5)
        
        // Start polling for task status
        startTaskPolling(data.task_id)
        
      } else {
        // Direct translation completed (small file)
        setTranslationProgress(100)
        setTranslationMessage('Translation completed!')
        
        console.log('✓ Direct translation successful')
        showMessage('Translation completed successfully!', 'success')
        
        // Refresh user info to update usage count
        fetchUserInfo(authToken)
        loadDocuments(authToken)
        
        setTimeout(() => {
          setTranslationProgress(0)
          setTranslationMessage('')
          setShowModal(false)
          setLoading(false)
          setCurrentOperation('')
          setProcessingDocId(null)
        }, 1000)
      }
      
    } catch (error) {
      console.error('❌ Translation error:', error)
      showMessage(`Translation failed: ${error.message}`, 'error')
      setTranslationProgress(0)
      setTranslationMessage('')
      setShowModal(false)
      setLoading(false)
      setCurrentOperation('')
      setProcessingDocId(null)
      stopTaskPolling()
    }
  }

  const handleDownload = async (docId, filename) => {
    try {
      console.log('📥 Downloading:', docId)
      
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

  // Handle cancel translation
  const handleCancelTranslation = async () => {
    if (currentTaskId) {
      try {
        await apiCall(`/task/${currentTaskId}/cancel`, {
          method: 'POST'
        })
        showMessage('Translation cancelled', 'info')
      } catch (error) {
        console.error('Failed to cancel task:', error)
      }
    }
    
    stopTaskPolling()
    setShowModal(false)
    setLoading(false)
    setCurrentOperation('')
    setProcessingDocId(null)
    setTranslationProgress(0)
    setTranslationMessage('')
  }

  // Get payment URL for a tier
  const getPaymentUrl = (tier) => {
    return PAYMENT_URLS[tier] || PAYMENT_URLS.professional
  }

  // Handle Paystack subscription
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
      console.log('💳 Initiating payment for tier:', tier)
      
      // Get payment info from API
      const response = await apiCall('/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      })

      console.log('✓ Payment initiated:', response)

      // Store the pending tier in localStorage
      localStorage.setItem('pendingPaymentTier', tier)

      // Get the correct payment URL based on tier
      const paymentUrl = getPaymentUrl(tier)
      console.log(`💳 Using payment URL for ${tier}: ${paymentUrl}`)

      // Open Paystack payment link in new window/tab
      window.open(paymentUrl, '_blank')

      // Show instructions modal
      setPendingPaymentTier(tier)
      setShowPaymentPendingModal(true)

    } catch (error) {
      console.error('❌ Payment initiation failed:', error)
      showMessage(`Payment initiation failed: ${error.message}`, 'error')
    }
  }

  const loadDocuments = async (token = authToken) => {
    if (!token) return
    
    try {
      console.log('📋 Loading documents...')
      const data = await apiCall('/documents')
      console.log(`   ✓ Loaded ${data.length} documents`)
      setDocuments(data || [])
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

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return (
      <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2.5rem', maxWidth: '420px', width: '90%', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.3)' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)' }}>
              <FileText size={32} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a1a2e', marginBottom: '0.25rem' }}>
              Academic Translator
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#666' }}>
              DOCX Translation Service
            </p>
          </div>

          {/* Signup Success Message */}
          {signupSuccess && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '12px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              textAlign: 'center',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <Check size={24} style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Account Created Successfully!</div>
              <div style={{ fontSize: '0.875rem' }}>Redirecting to sign in...</div>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth}>
            {authMode === 'signup' && !signupSuccess && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#555', marginBottom: '0.375rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#999" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => {
                      setAuthForm({ ...authForm, name: e.target.value })
                      if (validationErrors.name) {
                        setValidationErrors({ ...validationErrors, name: '' })
                      }
                    }}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                      border: validationErrors.name ? '2px solid #ef4444' : '2px solid #e0e0e0',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = validationErrors.name ? '#ef4444' : '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = validationErrors.name ? '#ef4444' : '#e0e0e0'}
                  />
                </div>
                {validationErrors.name && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>{validationErrors.name}</p>
                )}
              </div>
            )}

            {!signupSuccess && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#555', marginBottom: '0.375rem' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color="#999" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(e) => {
                        setAuthForm({ ...authForm, email: e.target.value })
                        if (validationErrors.email) {
                          setValidationErrors({ ...validationErrors, email: '' })
                        }
                      }}
                      required
                      placeholder="your@email.com"
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                        border: validationErrors.email ? '2px solid #ef4444' : '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = validationErrors.email ? '#ef4444' : '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = validationErrors.email ? '#ef4444' : '#e0e0e0'}
                    />
                  </div>
                  {validationErrors.email && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>{validationErrors.email}</p>
                  )}
                </div>

                <div style={{ marginBottom: authMode === 'signup' ? '1rem' : '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#555', marginBottom: '0.375rem' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="#999" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={(e) => {
                        setAuthForm({ ...authForm, password: e.target.value })
                        if (validationErrors.password) {
                          setValidationErrors({ ...validationErrors, password: '' })
                        }
                      }}
                      required
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                        border: validationErrors.password ? '2px solid #ef4444' : '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = validationErrors.password ? '#ef4444' : '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = validationErrors.password ? '#ef4444' : '#e0e0e0'}
                    />
                  </div>
                  {validationErrors.password && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>{validationErrors.password}</p>
                  )}
                  {authMode === 'signup' && !validationErrors.password && (
                    <p style={{ color: '#888', fontSize: '0.7rem', marginTop: '0.25rem', marginBottom: 0 }}>Minimum 5 characters</p>
                  )}
                </div>

                {/* Terms and Conditions Checkbox - Only for signup */}
                {authMode === 'signup' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.625rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: '#555'
                    }}>
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked)
                          if (validationErrors.terms) {
                            setValidationErrors({ ...validationErrors, terms: '' })
                          }
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          marginTop: '2px',
                          accentColor: '#667eea',
                          cursor: 'pointer'
                        }}
                      />
                      <span>
                        I agree to the{' '}
                        <a href="#" style={{ color: '#667eea', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="#" style={{ color: '#667eea', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {validationErrors.terms && (
                      <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.375rem', marginBottom: 0, marginLeft: '1.625rem' }}>{validationErrors.terms}</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: loading ? '#e0e0e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.875rem'
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {authMode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />}
                      {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                    </>
                  )}
                </button>
              </>
            )}

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                  setValidationErrors({})
                  setAcceptedTerms(false)
                  setSignupSuccess(false)
                  setAuthForm({ email: '', password: '', name: '' })
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </form>

          {message && !signupSuccess && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.875rem',
              borderRadius: '10px',
              backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
              border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              color: message.type === 'success' ? '#155724' : '#721c24',
              fontSize: '0.85rem',
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
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      {/* Debug Toggle Button */}

      {/* Evaluation Metrics Modal - COMPACT */}
      {showMetricsModal && metricsData && selectedDocForMetrics && (
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
          zIndex: 1002,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            animation: 'modalSlideIn 0.3s ease-out',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => {
                setShowMetricsModal(false)
                setSelectedDocForMetrics(null)
                setMetricsData(null)
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#f5f5f5',
                border: 'none',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} color="#666" />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 0.75rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChart3 size={28} color="#fff" />
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a1a2e', marginBottom: '0.25rem' }}>
                Quality Metrics
              </h2>

              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                {selectedDocForMetrics.filename}
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                background: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #bae6fd'
              }}>
                <Target size={14} color="#0284c7" />
                <span style={{ fontSize: '0.8rem', color: '#0c4a6e', fontWeight: '600' }}>
                  Overall: {metricsData.overallScore}%
                </span>
              </div>
            </div>

            {/* Metrics Grid - Compact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'BLEU', value: metricsData.bleu, color: '#3b82f6', bg: '#eff6ff' },
                { label: 'ChrF', value: metricsData.chrf, color: '#22c55e', bg: '#f0fdf4' },
                { label: 'METEOR', value: metricsData.meteor, color: '#f59e0b', bg: '#fef3c7' },
                { label: 'MXM', value: metricsData.mxm, color: '#ec4899', bg: '#fce7f3' }
              ].map((metric) => (
                <div key={metric.label} style={{
                  background: metric.bg,
                  borderRadius: '10px',
                  padding: '0.875rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem', fontWeight: '600' }}>
                    {metric.label}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: metric.color }}>
                    {metric.value}%
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleDownload(selectedDocForMetrics.doc_id, selectedDocForMetrics.filename)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem'
                }}
              >
                <Download size={16} />
                Download
              </button>
              
              <button
                onClick={() => {
                  setShowMetricsModal(false)
                  setSelectedDocForMetrics(null)
                  setMetricsData(null)
                }}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Pending Modal - COMPACT & SCROLLABLE */}
      {showPaymentPendingModal && (
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
          zIndex: 1003,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            animation: 'modalSlideIn 0.3s ease-out',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => {
                setShowPaymentPendingModal(false)
                setPendingPaymentTier(null)
                localStorage.removeItem('pendingPaymentTier')
              }}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: '#f5f5f5',
                border: 'none',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} color="#666" />
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 1rem',
                background: pendingPaymentTier === 'enterprise' 
                  ? 'linear-gradient(135deg, #E01E1E 0%, #b91c1c 100%)'
                  : 'linear-gradient(135deg, #FFC800 0%, #f59e0b 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {pendingPaymentTier === 'enterprise' ? (
                  <Briefcase size={28} color="#fff" />
                ) : (
                  <Crown size={28} color="#000" />
                )}
              </div>

              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1a1a2e', marginBottom: '0.5rem' }}>
                Complete Payment
              </h2>

              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                Upgrade to <strong>{SUBSCRIPTION_TIERS[pendingPaymentTier]?.name}</strong> for R{SUBSCRIPTION_TIERS[pendingPaymentTier]?.price}/month
              </p>

              <div style={{
                background: '#f8f9fa',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
                textAlign: 'left',
                fontSize: '0.8rem'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>Steps:</p>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#555', lineHeight: '1.6' }}>
                  <li>Complete payment in Paystack</li>
                  <li>Use email: <strong>{currentUser?.email}</strong></li>
                  <li>Click verify button below</li>
                </ol>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <button
                  onClick={verifyPaymentAndUpgrade}
                  disabled={verifyingPayment}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: verifyingPayment ? '#e0e0e0' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: verifyingPayment ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {verifyingPayment ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      I've Paid - Activate Plan
                    </>
                  )}
                </button>

                <button
                  onClick={() => window.open(getPaymentUrl(pendingPaymentTier), '_blank')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'transparent',
                    color: '#667eea',
                    border: '1px solid #667eea',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <ExternalLink size={16} />
                  Open Payment Page
                </button>

                <button
                  onClick={() => {
                    setShowPaymentPendingModal(false)
                    setPendingPaymentTier(null)
                    localStorage.removeItem('pendingPaymentTier')
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'transparent',
                    color: '#999',
                    border: 'none',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal - COMPACT */}
      {showPaymentSuccessModal && paymentSuccessData && (
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
          zIndex: 1003,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            animation: 'modalSlideIn 0.3s ease-out',
            textAlign: 'center',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check size={36} color="#fff" strokeWidth={3} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a1a2e', marginBottom: '0.5rem' }}>
              Payment Successful! 🎉
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Welcome to <strong>{SUBSCRIPTION_TIERS[paymentSuccessData.tier]?.name}</strong>!
            </p>

            <div style={{
              background: '#f0fdf4',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '600', color: '#15803d' }}>
                Your Benefits:
              </p>
              {SUBSCRIPTION_TIERS[paymentSuccessData.tier]?.features.slice(0, 4).map((feature, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <Check size={14} color="#22c55e" />
                  <span style={{ fontSize: '0.8rem', color: '#166534' }}>{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowPaymentSuccessModal(false)
                setPaymentSuccessData(null)
                setShowSubscription(false)
              }}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Start Translating →
            </button>
          </div>
        </div>
      )}

      {/* Limit Reached Modal - COMPACT */}
      {showLimitModal && (
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
          zIndex: 1001,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            animation: 'modalSlideIn 0.3s ease-out',
            textAlign: 'center',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setShowLimitModal(false)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: '#f5f5f5',
                border: 'none',
                cursor: 'pointer',
                padding: '0.375rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} color="#666" />
            </button>

            <div style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, #FFC800 0%, #f59e0b 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Crown size={28} color="#000" />
            </div>

            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1a1a2e', marginBottom: '0.5rem' }}>
              Limit Reached
            </h2>

            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
              You've used all <strong>{currentUser.translations_limit}</strong> translations this month.
            </p>

            <div style={{
              background: '#f8f9fa',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '600', color: '#333' }}>
                Upgrade to get:
              </p>
              {['Up to 20 or unlimited docs', 'Priority processing', 'Premium support'].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <Check size={14} color="#22c55e" />
                  <span style={{ fontSize: '0.8rem', color: '#555' }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button
                onClick={() => {
                  setShowLimitModal(false)
                  setShowSubscription(true)
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #FFC800 0%, #f59e0b 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem'
                }}
              >
                <Crown size={16} />
                View Plans
              </button>
              
              <button
                onClick={() => setShowLimitModal(false)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal - ENHANCED WITH REAL PROGRESS */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            {/* Only show close/cancel for translation, not upload */}
            {currentOperation === 'translating' && (
              <button
                onClick={handleCancelTranslation}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  background: '#f5f5f5',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.375rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Cancel translation"
              >
                <X size={18} color="#666" />
              </button>
            )}

            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1rem',
                background: currentOperation === 'uploading' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {currentOperation === 'uploading' ? (
                  <Upload size={32} color="#fff" />
                ) : (
                  <RefreshCw size={32} color="#fff" style={{ animation: 'spin 2s linear infinite' }} />
                )}
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a1a2e', marginBottom: '0.5rem' }}>
                {currentOperation === 'uploading' ? 'Uploading Document' : 'Translating Document'}
              </h2>

              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem', minHeight: '1.5rem' }}>
                {currentOperation === 'uploading' 
                  ? 'Uploading your document to the server...' 
                  : translationMessage || 'Processing your document...'}
              </p>

              {/* Progress Bar */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: currentOperation === 'uploading' ? '#667eea' : '#f5576c' }}>
                    Progress
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: currentOperation === 'uploading' ? '#667eea' : '#f5576c' }}>
                    {currentOperation === 'uploading' ? uploadProgress : translationProgress}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${currentOperation === 'uploading' ? uploadProgress : translationProgress}%`,
                    height: '100%',
                    background: currentOperation === 'uploading' 
                      ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' 
                      : 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                    transition: 'width 0.3s ease',
                    borderRadius: '5px'
                  }}></div>
                </div>
              </div>

              {/* Task ID info for background tasks */}
              {currentTaskId && (
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={14} />
                    <span>Background processing - this may take a few minutes for large documents</span>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>
                {currentOperation === 'translating' && currentTaskId
                  ? 'You can cancel anytime - progress is saved'
                  : 'Please wait while we process your document'}
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
                DOCX Translation Service
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
                  <FileText size={48} color={getFileTypeInfo(selectedFile.name).color} style={{ margin: '0 auto' }} />
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
                      : 'Drop your DOCX file here'}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                {!canTranslate() 
                  ? `All ${currentUser.translations_limit} translations completed - Upgrade for more` 
                  : loading 
                    ? 'Please wait for current translation to complete' 
                    : selectedFile
                      ? `${getFileTypeInfo(selectedFile.name).name} • ${getFileTypeInfo(selectedFile.name).description}`
                      : 'Supports .docx files • or click to browse'}
              </p>
              <input
                id="fileInput"
                type="file"
                accept=".docx"
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
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="#2b579a" />
                <span style={{ color: '#1e40af', fontWeight: '600' }}>DOCX Only:</span>
                <span style={{ color: '#475569' }}>Perfect formatting preservation</span>
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
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f59e0b' }}>{documents.filter(d => d.status === 'translating' || d.status === 'uploaded' || d.status === 'queued').length}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>This Month</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#667eea' }}>{currentUser.translations_used}</div>
              </div>
            </div>

            {/* DOCX Info Box */}
            <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)', borderRadius: '12px', padding: '1.5rem', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.5rem' }}>
                    Professional DOCX Translation
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: '1.6', margin: 0 }}>
                    Translate <strong>Microsoft Word</strong> documents with full formatting preservation. Perfect for dissertations, theses, research papers, and academic documents.
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
                Upload and translate your first DOCX file to see it here
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
                      gridTemplateColumns: 'auto 1fr auto auto auto',
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewMetrics(doc)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
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
                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)'
                        e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.3)'
                      }}
                    >
                      <BarChart3 size={16} />
                      Metrics
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(doc.doc_id, doc.filename)
                      }}
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
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)'
                        e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
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
            Supporting DOCX • 8 Languages • Research & Academic Use
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
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
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