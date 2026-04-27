import React from 'react'
import { cn } from '../../lib/cn.js'

export function AdminSectionHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  )
}

export function AdminStatCard({ icon, label, value, helper, trend, tone = 'default' }) {
  const toneMap = {
    default: 'bg-[#111827] border-[#1F2D45]',
    success: 'bg-[#111827] border-emerald-500/30',
    warning: 'bg-[#111827] border-amber-500/30',
    danger: 'bg-[#111827] border-red-500/30'
  }

  return (
    <div className={cn('rounded-lg border p-5', toneMap[tone] || toneMap.default)}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {trend ? <span className="text-xs text-gray-400">{trend}</span> : null}
      </div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  )
}

export function AdminPanel({ title, subtitle, children, className = '' }) {
  return (
    <section className={cn('rounded-lg border border-[#1F2D45] bg-[#111827] p-5', className)}>
      {(title || subtitle) && (
        <div className="mb-4 flex items-end justify-between gap-2">
          <div>
            {title ? <h3 className="text-lg font-semibold text-white">{title}</h3> : null}
            {subtitle ? <p className="text-sm text-gray-400">{subtitle}</p> : null}
          </div>
        </div>
      )}
      {children}
    </section>
  )
}

export function FilterBar({ children }) {
  return <div className="mb-6 rounded-lg border border-[#1F2D45] bg-[#111827] p-4">{children}</div>
}

export function ActionBar({ children }) {
  return <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-[#1F2D45] bg-[#111827] p-4">{children}</div>
}

export function DesktopTable({ headers = [], children }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-[#1F2D45] text-left text-gray-400">
            {headers.map((header) => (
              <th key={header} className="pb-3">{header}</th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  )
}

export function MobileCardList({ children }) {
  return <div className="space-y-3 md:hidden">{children}</div>
}

export function CompactChartContainer({ title, children, hint = 'Scroll horizontally on mobile' }) {
  return (
    <div>
      {title ? <h4 className="mb-3 text-sm font-medium text-gray-300">{title}</h4> : null}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[480px] rounded-lg border border-[#1F2D45] bg-[#0A0E1A] p-3">{children}</div>
      </div>
      <p className="mt-2 text-xs text-gray-500 md:hidden">{hint}</p>
    </div>
  )
}

export function ConfirmActionModal({ isOpen, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, loading = false, tone = 'danger' }) {
  if (!isOpen) return null

  const buttonTone = tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0F6E56] hover:bg-[#0F6E56]/80'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[#1F2D45] bg-[#111827] p-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-400">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn('flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50', buttonTone)}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
          <button onClick={onCancel} className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function StatusToast({ toast, onClose }) {
  if (!toast?.message) return null
  const toneClass = toast.tone === 'success'
    ? 'border-green-500/30 bg-green-500/20 text-green-300'
    : toast.tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/20 text-amber-300'
      : 'border-red-500/30 bg-red-500/20 text-red-300'

  return (
    <div className={cn('fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-xl', toneClass)}>
      <div className="flex items-start gap-3">
        <p className="flex-1">{toast.message}</p>
        <button onClick={onClose} className="text-xs text-gray-200">✕</button>
      </div>
    </div>
  )
}
