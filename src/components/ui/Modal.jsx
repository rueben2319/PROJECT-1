import React, { useEffect, useId, useRef } from 'react'
import Card from './Card.jsx'
import Button from './Button.jsx'

export default function Modal({ isOpen, onClose, title, children }) {
  const titleId = useId()
  const bodyId = useId()
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const previousActive = document.activeElement
    modalRef.current?.focus()

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      previousActive?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <Card
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={bodyId}
        className="relative w-full max-w-lg"
      >
        <Button variant="ghost" size="sm" className="absolute right-3 top-3" onClick={onClose} aria-label="Close modal">
          ✕
        </Button>
        {title && <h2 id={titleId} className="mb-4 text-2xl font-semibold text-primary">{title}</h2>}
        <div id={bodyId}>{children}</div>
      </Card>
    </div>
  )
}
