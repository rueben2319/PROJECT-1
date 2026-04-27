import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const defaultNav = [
  { label: 'Home', to: '/', icon: '🏠' },
  { label: 'Courses', to: '/', icon: '📚' },
  { label: 'Watch', to: '/watch', icon: '▶️' }
]

export default function StudentShell({ title, subtitle, children, topActions, bottomNav = defaultNav }) {
  const location = useLocation()

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background-50 via-white to-accent-50/20"
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <header
        className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
          {topActions && <div className="flex items-center gap-2">{topActions}</div>}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="grid grid-cols-3 gap-1 px-2 py-2">
          {bottomNav.map((item) => {
            const active = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)

            return (
              <li key={`${item.label}-${item.to}`}>
                <Link
                  to={item.to}
                  className={`touch-target flex h-11 min-h-[44px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                    active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-1" aria-hidden>{item.icon}</span>{item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
