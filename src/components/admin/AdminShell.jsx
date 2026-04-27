import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile.jsx'

export default function AdminShell({ children }) {
  const location = useLocation()
  const { profile } = useProfile()
  const [currentTime, setCurrentTime] = useState('')
  const [systemStatus, setSystemStatus] = useState('healthy')
  const [pendingCount, setPendingCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { fetchAdminStats() }, [])

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
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
    { section: 'Overview', items: [{ name: 'Dashboard', href: '/admin', icon: '📊' }] },
    { section: 'Operations', items: [
      { name: 'Payments', href: '/admin/payments', icon: '💳', badge: pendingCount > 0 ? pendingCount : null, badgeColor: pendingCount > 0 ? 'amber' : 'teal' },
      { name: 'Students', href: '/admin/users', icon: '👥' },
      { name: 'Content', href: '/admin/content', icon: '📚' },
      { name: 'Analytics', href: '/admin/analytics', icon: '📊' }
    ]},
    { section: 'System', items: [
      { name: 'Configuration', href: '/admin/config', icon: '⚙️' },
      { name: 'Security', href: '/admin/security', icon: '🔒', badge: alertCount > 0 ? alertCount : null, badgeColor: alertCount > 0 ? 'red' : 'teal' },
      { name: 'Audit Log', href: '/admin/audit', icon: '📋' }
    ]}
  ]

  const isActive = (href) => (href === '/admin' ? location.pathname === href : location.pathname.startsWith(href))
  const getSystemStatusColor = () => ({ healthy: 'bg-green-500', warning: 'bg-amber-500', error: 'bg-red-500' }[systemStatus] || 'bg-gray-500')

  const SidebarContent = (
    <>
      <div className="p-6 border-b border-[#1F2D45]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#0F6E56] rounded-xl flex items-center justify-center"><span className="text-white font-bold text-lg">M</span></div>
          <div><h1 className="text-white font-bold text-lg">MSCE Learn</h1><p className="text-gray-400 text-xs">Command Centre</p></div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.section}>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">{section.section}</h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`touch-target min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive(item.href) ? 'bg-[#0F6E56]/20 border-l-2 border-[#0F6E56] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1F2D45]'
                  }`}
                >
                  <div className="flex items-center space-x-3"><span className="text-lg">{item.icon}</span><span className="font-medium">{item.name}</span></div>
                  {item.badge && <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.badgeColor === 'amber' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'}`}>{item.badge}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1F2D45]"><div className="text-sm"><div className="text-white font-medium">{profile?.full_name || 'Admin User'}</div><div className="text-gray-400 text-xs">{profile?.email || 'admin@msce-learn.com'}</div></div></div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex">
      <aside className="hidden md:flex md:w-64 bg-[#111827] border-r border-[#1F2D45] flex-col">{SidebarContent}</aside>

      {mobileOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#111827] border-r border-[#1F2D45] transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">{SidebarContent}</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#111827] border-b border-[#1F2D45] px-4 sm:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden touch-target min-h-[44px] min-w-[44px] rounded-lg border border-[#1F2D45] text-gray-200">☰</button>
              <h2 className="text-white font-semibold text-lg">{navigation.flatMap((section) => section.items).find((item) => isActive(item.href))?.name || 'Admin'}</h2>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-6">
              <div className="hidden sm:flex items-center space-x-2"><div className={`w-2 h-2 rounded-full ${getSystemStatusColor()} ${systemStatus === 'healthy' ? 'animate-pulse' : ''}`}></div><span className="text-gray-400 text-sm capitalize">{systemStatus}</span></div>
              <div className="hidden lg:block px-3 py-1 bg-[#0F6E56]/20 border border-[#0F6E56]/30 rounded-full"><span className="text-[#0F6E56] text-xs font-semibold">ADMIN</span></div>
              <div className="hidden xl:block font-mono text-[#0F6E56] text-sm">{currentTime}</div>
              <div className="flex items-center space-x-3">
                <button className="touch-target min-h-[44px] min-w-[44px] text-gray-400 hover:text-white transition-colors">🔔</button>
                <div className="w-9 h-9 bg-[#0F6E56] rounded-full flex items-center justify-center"><span className="text-white text-sm font-bold">{(profile?.full_name || 'Admin')[0].toUpperCase()}</span></div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
