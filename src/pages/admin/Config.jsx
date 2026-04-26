import React, { useState, useEffect } from 'react'

export default function Config() {
  const [paychanguConfig, setPaychanguConfig] = useState({
    apiKey: '',
    webhookSecret: '',
    webhookUrl: '',
    sandboxMode: false
  })
  const [accessConfig, setAccessConfig] = useState({
    defaultAccessDuration: 30,
    pendingPaymentExpiry: 2,
    signedUrlExpiry: 600,
    lessonCompletionThreshold: 90,
    renewalReminderDays: 3
  })
  const [featureFlags, setFeatureFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchConfigData()
  }, [])

  const fetchConfigData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch configuration')
      }

      const data = await response.json()
      
      setPaychanguConfig(data.paychangu || {})
      setAccessConfig(data.access || {})
      setFeatureFlags(data.featureFlags || {})

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaychanguSave = async () => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/config/paychangu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paychanguConfig)
      })

      if (!response.ok) {
        throw new Error('Failed to save PayChangu configuration')
      }

      setError('PayChangu configuration saved. Please redeploy Edge Functions to apply changes.')
      setTimeout(() => setError(null), 5000)

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAccessSave = async () => {
    try {
      setActionLoading(true)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/config/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accessConfig)
      })

      if (!response.ok) {
        throw new Error('Failed to save access configuration')
      }

      setError('Access configuration saved successfully')
      setTimeout(() => setError(null), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFeatureToggle = async (key, enabled) => {
    // Special handling for maintenance_mode
    if (key === 'maintenance_mode' && enabled) {
      setShowMaintenanceConfirm(true)
      return
    }

    await updateFeatureFlag(key, enabled)
  }

  const updateFeatureFlag = async (key, enabled) => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/feature-flag', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, enabled })
      })

      if (!response.ok) {
        throw new Error('Failed to update feature flag')
      }

      setFeatureFlags(prev => ({
        ...prev,
        [key]: enabled
      }))

    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 3000)
    }
  }

  const confirmMaintenanceMode = async () => {
    await updateFeatureFlag('maintenance_mode', true)
    setShowMaintenanceConfirm(false)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setError('Copied to clipboard')
    setTimeout(() => setError(null), 2000)
  }

  const maskValue = (value, show) => {
    if (!value) return ''
    if (show) return value
    return '•'.repeat(Math.min(value.length, 20))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-600 rounded w-1/4 mb-8"></div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
                <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-600 rounded w-full"></div>
                  <div className="h-4 bg-gray-600 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">System Configuration</h1>
        <p className="text-gray-400">Manage system settings, feature flags, and integration preferences</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className={`mb-6 p-4 rounded-lg border ${
          error.includes('saved') || error.includes('Copied')
            ? 'bg-green-500/20 border-green-500/30 text-green-400'
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          {error}
        </div>
      )}

      {/* PayChangu Settings */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6">PayChangu Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={maskValue(paychanguConfig.apiKey, showApiKeys)}
                onChange={(e) => setPaychanguConfig({...paychanguConfig, apiKey: e.target.value})}
                className="flex-1 bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56] font-mono"
                placeholder="Enter PayChangu API key"
              />
              <button
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {showApiKeys ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Webhook Secret
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={maskValue(paychanguConfig.webhookSecret, showWebhookSecret)}
                onChange={(e) => setPaychanguConfig({...paychanguConfig, webhookSecret: e.target.value})}
                className="flex-1 bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56] font-mono"
                placeholder="Enter webhook secret"
              />
              <button
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {showWebhookSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Webhook URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={paychanguConfig.webhookUrl || ''}
                readOnly
                className="flex-1 bg-[#1F2D45] border border-[#374151] text-gray-400 px-3 py-2 rounded-lg font-mono text-sm"
                placeholder="https://your-domain.com/api/payment-callback"
              />
              <button
                onClick={() => copyToClipboard(paychanguConfig.webhookUrl)}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={paychanguConfig.sandboxMode}
                onChange={(e) => setPaychanguConfig({...paychanguConfig, sandboxMode: e.target.checked})}
                className="rounded border-gray-600 bg-[#1F2D45] text-[#0F6E56] focus:ring-[#0F6E56]"
              />
              <span className="text-sm font-medium text-gray-300">Sandbox Mode</span>
            </label>
            {paychanguConfig.sandboxMode && (
              <div className="mt-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                <p className="text-amber-400 text-sm">
                  <strong>Warning:</strong> Sandbox mode is enabled. All payments will be processed in test environment.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={handlePaychanguSave}
              disabled={actionLoading}
              className="px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Saving...' : 'Save PayChangu Settings'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Note: You'll need to redeploy Edge Functions after changing API keys
            </p>
          </div>
        </div>
      </div>

      {/* Access & Pricing Rules */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6">Access & Pricing Rules</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Access Duration (days)
            </label>
            <input
              type="number"
              value={accessConfig.defaultAccessDuration}
              onChange={(e) => setAccessConfig({...accessConfig, defaultAccessDuration: Number(e.target.value)})}
              min="1"
              max="365"
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            />
            <p className="text-xs text-gray-500 mt-1">Default enrollment period</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pending Payment Expiry (hours)
            </label>
            <input
              type="number"
              value={accessConfig.pendingPaymentExpiry}
              onChange={(e) => setAccessConfig({...accessConfig, pendingPaymentExpiry: Number(e.target.value)})}
              min="1"
              max="24"
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-cancel pending payments</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Signed URL Expiry (seconds)
            </label>
            <input
              type="number"
              value={accessConfig.signedUrlExpiry}
              onChange={(e) => setAccessConfig({...accessConfig, signedUrlExpiry: Number(e.target.value)})}
              min="60"
              max="3600"
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            />
            <p className="text-xs text-gray-500 mt-1">Video URL expiration time</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Lesson Completion Threshold (%)
            </label>
            <input
              type="number"
              value={accessConfig.lessonCompletionThreshold}
              onChange={(e) => setAccessConfig({...accessConfig, lessonCompletionThreshold: Number(e.target.value)})}
              min="50"
              max="100"
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            />
            <p className="text-xs text-gray-500 mt-1">Percentage to mark lesson complete</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Renewal Reminder (days before expiry)
            </label>
            <input
              type="number"
              value={accessConfig.renewalReminderDays}
              onChange={(e) => setAccessConfig({...accessConfig, renewalReminderDays: Number(e.target.value)})}
              min="1"
              max="30"
              className="w-full bg-[#1F2D45] border border-[#374151] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#0F6E56]"
            />
            <p className="text-xs text-gray-500 mt-1">Send renewal SMS reminders</p>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleAccessSave}
            disabled={actionLoading}
            className="px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0F6E56]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Saving...' : 'Save Access Rules'}
          </button>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-[#111827] border border-[#1F2D45] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Feature Flags</h3>
        
        <div className="space-y-3">
          {[
            { key: 'registrations_open', label: 'User Registrations', description: 'Allow new user registrations' },
            { key: 'free_previews', label: 'Free Preview Lessons', description: 'Show preview lessons without enrollment' },
            { key: 'sms_renewal_reminders', label: 'SMS Renewal Reminders', description: 'Send SMS for expiring enrollments' },
            { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Disable public access (show maintenance page)' },
            { key: 'airtel_money', label: 'Airtel Money', description: 'Enable Airtel Money payments' },
            { key: 'tnm_mpamba', label: 'TNM Mpamba', description: 'Enable TNM Mpamba payments' }
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-[#1F2D45]/30 rounded-lg">
              <div className="flex-1">
                <div className="text-white font-medium">{label}</div>
                <div className="text-sm text-gray-400">{description}</div>
              </div>
              <button
                onClick={() => handleFeatureToggle(key, !featureFlags[key])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  featureFlags[key] ? 'bg-[#0F6E56]' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    featureFlags[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Mode Confirmation */}
      {showMaintenanceConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2D45] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Enable Maintenance Mode</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to enable maintenance mode? This will disable public access to the entire platform and show a maintenance page to all users.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmMaintenanceMode}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Enable Maintenance
              </button>
              <button
                onClick={() => setShowMaintenanceConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
