import { useState, useEffect } from 'react'
import { FileText, Upload, Download, Check, Clock, AlertCircle, Zap, Crown, Briefcase } from 'lucide-react'

const API_URL = 'http://localhost:8000'

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
    features: ['5 translations/month', 'All languages', 'Basic support', 'Standard processing']
  },
  professional: { 
    name: 'Professional', 
    limit: 20, 
    price: 299, 
    color: '#FFC800',
    icon: Crown,
    features: ['20 translations/month', 'All languages', 'Priority support', 'Fast processing', 'Email notifications']
  },
  enterprise: { 
    name: 'Enterprise', 
    limit: Infinity, 
    price: 999, 
    color: '#E01E1E',
    icon: Briefcase,
    features: ['Unlimited translations', 'All languages', '24/7 support', 'Instant processing', 'Dedicated manager', 'API access']
  }
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('af')
  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [translationProgress, setTranslationProgress] = useState(0)
  const [currentTier, setCurrentTier] = useState('free')
  const [usageCount, setUsageCount] = useState(0)
  const [showSubscription, setShowSubscription] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const canTranslate = () => {
    const tier = SUBSCRIPTION_TIERS[currentTier]
    return usageCount < tier.limit
  }

  const getRemainingUses = () => {
    const tier = SUBSCRIPTION_TIERS[currentTier]
    if (tier.limit === Infinity) return '∞'
    return tier.limit - usageCount
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith('.docx')) {
        setSelectedFile(file)
        showMessage(`Selected: ${file.name}`, 'success')
      } else {
        showMessage('Please select a .docx file', 'error')
      }
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.name.endsWith('.docx')) {
      setSelectedFile(file)
      showMessage(`Selected: ${file.name}`, 'success')
    } else {
      showMessage('Please select a .docx file', 'error')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      showMessage('Please select a file first', 'error')
      return
    }

    if (!canTranslate()) {
      showMessage('Translation limit reached. Please upgrade your subscription.', 'error')
      setShowSubscription(true)
      return
    }

    setLoading(true)
    setUploadProgress(0)
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
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (response.ok) {
        showMessage('Document uploaded successfully!', 'success')
        setSelectedFile(null)
        loadDocuments()
        
        setTimeout(() => {
          setUploadProgress(0)
          handleTranslate(data.doc_id)
        }, 500)
      } else {
        showMessage(`Upload failed: ${data.detail}`, 'error')
        setUploadProgress(0)
      }
    } catch (error) {
      showMessage(`Upload error: ${error.message}`, 'error')
      setUploadProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const handleTranslate = async (docId) => {
    setLoading(true)
    setTranslationProgress(0)

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
        setUsageCount(prev => prev + 1)
        loadDocuments()
        setTimeout(() => setTranslationProgress(0), 1000)
      } else {
        showMessage(`Translation failed: ${data.detail}`, 'error')
        setTranslationProgress(0)
      }
    } catch (error) {
      showMessage(`Translation error: ${error.message}`, 'error')
      setTranslationProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (docId, filename) => {
    try {
      const response = await fetch(`${API_URL}/download/${docId}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'translated.docx'
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

  const handleSubscribe = (tier) => {
    if (tier === 'free') {
      setCurrentTier('free')
      setUsageCount(0)
      setShowSubscription(false)
      showMessage('Switched to Free tier', 'success')
      return
    }

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = 'https://www.payfast.co.za/eng/process'
    
    const params = {
      merchant_id: '10000100',
      merchant_key: '46f0cd694581a',
      return_url: `${window.location.origin}/success`,
      cancel_url: `${window.location.origin}/cancel`,
      notify_url: `${API_URL}/payment/notify`,
      amount: SUBSCRIPTION_TIERS[tier].price.toFixed(2),
      item_name: `${SUBSCRIPTION_TIERS[tier].name} Subscription - Academic Document Translator`,
      item_description: `${SUBSCRIPTION_TIERS[tier].name} plan with ${SUBSCRIPTION_TIERS[tier].limit === Infinity ? 'unlimited' : SUBSCRIPTION_TIERS[tier].limit} translations`,
      custom_str1: tier,
      email_address: 'user@example.com',
    }

    Object.entries(params).forEach(([key, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
  }

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  useEffect(() => {
    loadDocuments()
    const interval = setInterval(loadDocuments, 3000)
    return () => clearInterval(interval)
  }, [])

  const TierIcon = SUBSCRIPTION_TIERS[currentTier].icon

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      {/* Modern Header */}
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
                Professional Document Translation
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Current Plan</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TierIcon size={18} />
                {SUBSCRIPTION_TIERS[currentTier].name}
              </div>
            </div>
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          borderRadius: '16px', 
          padding: '2rem', 
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Translation Usage</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                {getRemainingUses()} <span style={{ fontSize: '1.25rem', fontWeight: '400', opacity: 0.8 }}>
                  / {SUBSCRIPTION_TIERS[currentTier].limit === Infinity ? '∞' : SUBSCRIPTION_TIERS[currentTier].limit}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>translations remaining this month</div>
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
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
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
              const isCurrentPlan = currentTier === key
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
                    disabled={isCurrentPlan}
                    style={{ 
                      width: '100%',
                      padding: '1rem',
                      background: isCurrentPlan ? '#e0e0e0' : tier.color,
                      color: isCurrentPlan ? '#999' : (key === 'professional' ? '#000' : '#fff'),
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: isCurrentPlan ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: isCurrentPlan ? 0.6 : 1
                    }}
                  >
                    {isCurrentPlan ? 'Current Plan' : key === 'free' ? 'Downgrade' : 'Subscribe Now'}
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
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                border: dragActive ? '2px dashed #667eea' : '2px dashed #e0e0e0',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                background: dragActive ? '#f0f4ff' : '#f8f9fa',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <div style={{ marginBottom: '1rem' }}>
                <FileText size={48} color={dragActive ? '#667eea' : '#999'} style={{ margin: '0 auto' }} />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: '600', color: '#333', marginBottom: '0.5rem' }}>
                {selectedFile ? selectedFile.name : 'Drop your .docx file here'}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                or click to browse
              </p>
              <input
                id="fileInput"
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
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
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
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
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
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

            {/* Progress Bars */}
            {uploadProgress > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#667eea' }}>Uploading</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#667eea' }}>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', transition: 'width 0.3s' }}></div>
                </div>
              </div>
            )}

            {translationProgress > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#667eea' }}>Translating</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#667eea' }}>{translationProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${translationProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)', transition: 'width 0.3s' }}></div>
                </div>
              </div>
            )}

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
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', fontSize: '0.875rem', color: '#856404', textAlign: 'center' }}>
                Translation limit reached. Please upgrade your plan.
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
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#667eea' }}>{usageCount}</div>
              </div>
            </div>

            {/* Academic Info Box */}
            <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)', borderRadius: '12px', padding: '1.5rem', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.5rem' }}>
                    Academic Translation
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: '1.6', margin: 0 }}>
                    Specialized for dissertations, theses, and research papers. Preserves academic formatting, citations, references, and document structure.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: '1.5rem' }}>
              <button
                onClick={loadDocuments}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#555',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e9ecef'
                  e.target.style.borderColor = '#667eea'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8f9fa'
                  e.target.style.borderColor = '#e0e0e0'
                }}
              >
                🔄 Refresh Documents
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={24} color="#667eea" />
            Recent Documents
          </h2>

          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <FileText size={64} color="#e0e0e0" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#999', marginBottom: '0.5rem' }}>
                No documents yet
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#bbb' }}>
                Upload your first .docx file to get started
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {documents.map((doc) => {
                const statusConfig = {
                  completed: { color: '#22c55e', bg: '#22c55e15', icon: Check },
                  translating: { color: '#f59e0b', bg: '#f59e0b15', icon: Clock },
                  uploaded: { color: '#667eea', bg: '#667eea15', icon: Upload },
                  failed: { color: '#ef4444', bg: '#ef444415', icon: AlertCircle }
                }
                const config = statusConfig[doc.status] || statusConfig.uploaded
                const StatusIcon = config.icon

                return (
                  <div
                    key={doc.doc_id}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto',
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
                      <FileText size={24} color={config.color} />
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
            Supporting 11 South African Languages • Research & Academic Use
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            Preserving academic integrity through professional translation • 2025
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <div style={{ width: '40px', height: '4px', background: '#667eea', borderRadius: '2px' }}></div>
            <div style={{ width: '40px', height: '4px', background: '#f59e0b', borderRadius: '2px' }}></div>
            <div style={{ width: '40px', height: '4px', background: '#22c55e', borderRadius: '2px' }}></div>
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
        * {
          box-sizing: border-box;
        }
        select:focus,
        button:focus {
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