'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dbStatus, setDbStatus] = useState<'checking' | 'initializing' | 'ready'>('checking')

  // Form fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Password strength indicators
  const [hasLength, setHasLength] = useState(false)
  const [hasUpper, setHasUpper] = useState(false)
  const [hasLower, setHasLower] = useState(false)
  const [hasNumber, setHasNumber] = useState(false)
  const [hasSpecial, setHasSpecial] = useState(false)

  // Initialize database and check setup status
  useEffect(() => {
    const initAndCheck = async () => {
      try {
        // First, initialize database tables
        setDbStatus('initializing')
        const initRes = await fetch('/api/init-db', { method: 'POST' })
        const initData = await initRes.json()

        if (!initRes.ok && !initData.error?.includes('already exists')) {
          console.log('[SETUP] DB init result:', initData)
        }

        setDbStatus('ready')

        // Check if setup is needed
        const res = await fetch('/api/setup')
        const data = await res.json()

        if (!data.needsSetup) {
          // Already configured, redirect to login
          router.push('/admin')
          return
        }

        setChecking(false)
      } catch (error) {
        console.error('Setup check error:', error)
        setError('Failed to connect to database. Check your DATABASE_URL.')
        setChecking(false)
      }
    }

    initAndCheck()
  }, [router])

  // Password strength check
  useEffect(() => {
    setHasLength(password.length >= 8)
    setHasUpper(/[A-Z]/.test(password))
    setHasLower(/[a-z]/.test(password))
    setHasNumber(/[0-9]/.test(password))
    setHasSpecial(/[!@#$%^&*(),.?":{}|<>]/.test(password))
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setError('Password does not meet all requirements')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/admin')
        }, 2000)
      } else {
        setError(data.error || 'Setup failed')
      }
    } catch (error) {
      console.error('Setup error:', error)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-[#16a34a] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">
            {dbStatus === 'checking' && 'Checking database...'}
            {dbStatus === 'initializing' && 'Initializing database tables...'}
            {dbStatus === 'ready' && 'Loading setup...'}
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[5px] shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-check-line text-3xl text-[#16a34a]"></i>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Setup Complete!</h2>
          <p className="text-sm text-gray-500 mb-4">Your admin account has been created.</p>
          <p className="text-xs text-gray-400">Redirecting to login...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-[5px] shadow-sm border border-gray-100 p-5">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-10 h-10 bg-blue-500 rounded-[5px] flex items-center justify-center mx-auto mb-2">
              <i className="ri-settings-3-line text-lg text-white"></i>
            </div>
            <h1 className="text-base font-semibold text-gray-900">Initial Setup</h1>
            <p className="text-xs text-gray-500 mt-0.5">Create your admin account</p>
          </div>

          {/* Info box */}
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-xs rounded-[5px]">
            <div className="flex items-start gap-2">
              <i className="ri-database-2-line mt-0.5"></i>
              <p>Database tables created! Now create your admin account.</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-[5px] flex items-center gap-1">
              <i className="ri-error-warning-line"></i>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-[5px] outline-none transition-all focus:bg-white focus:border-[#16a34a] disabled:opacity-50 text-sm"
                placeholder="Enter username (min 3 characters)"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-[5px] outline-none transition-all focus:bg-white focus:border-[#16a34a] disabled:opacity-50 pr-12 text-sm"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#16a34a] text-[10px] font-medium hover:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password requirements */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center gap-1.5 text-[10px] ${hasLength ? 'text-green-600' : 'text-gray-400'}`}>
                    <i className={`ri-${hasLength ? 'check' : 'checkbox-blank'}-line`}></i>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${hasUpper ? 'text-green-600' : 'text-gray-400'}`}>
                    <i className={`ri-${hasUpper ? 'check' : 'checkbox-blank'}-line`}></i>
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${hasLower ? 'text-green-600' : 'text-gray-400'}`}>
                    <i className={`ri-${hasLower ? 'check' : 'checkbox-blank'}-line`}></i>
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                    <i className={`ri-${hasNumber ? 'check' : 'checkbox-blank'}-line`}></i>
                    One number
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${hasSpecial ? 'text-green-600' : 'text-gray-400'}`}>
                    <i className={`ri-${hasSpecial ? 'check' : 'checkbox-blank'}-line`}></i>
                    One special character (!@#$%...)
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className={`w-full px-3 py-2.5 text-gray-900 bg-gray-50 border rounded-[5px] outline-none transition-all focus:bg-white disabled:opacity-50 text-sm ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#16a34a]'
                }`}
                placeholder="Confirm your password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#16a34a] text-white text-sm font-medium rounded-[5px] hover:bg-[#15803d] transition-all disabled:opacity-50 shadow-sm hover:shadow"
            >
              {loading ? 'Creating Account...' : 'Create Admin Account'}
            </button>
          </form>
        </div>

        <a href="/" className="block text-center text-xs text-gray-500 hover:text-[#16a34a] mt-3">
          ← Back to shop
        </a>
      </motion.div>
    </div>
  )
}
