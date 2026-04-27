import React from 'react'
import Card from './Card.jsx'
import Button from './Button.jsx'

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="relative w-full max-w-lg">
        <Button variant="ghost" size="sm" className="absolute right-3 top-3" onClick={onClose} aria-label="Close modal">
          ✕
        </Button>
        {title && <h2 className="mb-4 text-2xl font-semibold text-primary">{title}</h2>}
        {children}
      </Card>
    </div>
  )
}
