import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile.jsx'

export default function AdminShell({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [currentTime, setCurrentTime] = useState('')
  const [systemStatus, setSystemStatus] = useState('healthy')
  const [pendingCount, setPendingCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }))
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch admin stats for badges
  useEffect(() => {
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.pending_payments || 0)
        setAlertCount(data.security_alerts || 0)
        setSystemStatus(data.system_status || 'healthy')
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
    }
  }

  const navigation = [
    {
      section: 'Overview',
      items: [
        { name: 'Dashboard', href: '/admin', icon: '📊' }
      ]
    },
    {
      section: 'Operations',
      items: [
        { 
          name: 'Payments', 
          href: '/admin/payments', 
          icon: '💳',
          badge: pendingCount > 0 ? pendingCount : null,
          badgeColor: pendingCount > 0 ? 'amber' : 'teal'
        },
        { name: 'Students', href: '/admin/users', icon: '👥' },
        { name: 'Content', href: '/admin/content', icon: '📚' },
        { name: 'Analytics', href: '/admin/analytics', icon: '📊' }
      ]
    },
    {
      section: 'System',
      items: [
        { name: 'Configuration', href: '/admin/config', icon: '⚙️' },
        { 
          name: 'Security', 
          href: '/admin/security', 
          icon: '🔒',
          badge: alertCount > 0 ? alertCount : null,
          badgeColor: alertCount > 0 ? 'red' : 'teal'
        },
        { name: 'Audit Log', href: '/admin/audit', icon: '📋' }
      ]
    }
  ]

  const isActive = (href) => {
    if (href === '/admin') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  const getSystemStatusColor = () => {
    switch (systemStatus) {
      case 'healthy': return 'bg-green-500'
      case 'warning': return 'bg-amber-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#111827] border-r border-[#1F2D45] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#1F2D45]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#0F6E56] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">MSCE Learn</h1>
              <p className="text-gray-400 text-xs">Command Centre</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6">
          {navigation.map((section) => (
            <div key={section.section}>
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-[#0F6E56]/20 border-l-2 border-[#0F6E56] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#1F2D45]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.badgeColor === 'amber' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : item.badgeColor === 'red'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1F2D45]">
          <div className="text-sm">
            <div className="text-white font-medium">
              {profile?.full_name || 'Admin User'}
            </div>
            <div className="text-gray-400 text-xs">
              {profile?.email || 'admin@msce-learn.com'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-[#111827] border-b border-[#1F2D45] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-white font-semibold text-lg">
                {navigation
                  .flatMap(section => section.items)
                  .find(item => isActive(item.href))?.name || 'Admin'
                }
              </h2>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* System Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getSystemStatusColor()} ${
                  systemStatus === 'healthy' ? 'animate-pulse' : ''
                }`}></div>
                <span className="text-gray-400 text-sm capitalize">
                  {systemStatus}
                </span>
              </div>

              {/* Admin Badge */}
              <div className="px-3 py-1 bg-[#0F6E56]/20 border border-[#0F6E56]/30 rounded-full">
                <span className="text-[#0F6E56] text-xs font-semibold">ADMIN</span>
              </div>

              {/* Live Clock */}
              <div className="font-mono text-[#0F6E56] text-sm">
                {currentTime}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <button className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <div className="w-8 h-8 bg-[#0F6E56] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {(profile?.full_name || 'Admin')[0].toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
