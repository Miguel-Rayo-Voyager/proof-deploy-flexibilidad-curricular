/**
 * TiltCard — Tarjeta con blobs de fondo y elevación al hover (vanilla).
 */

import { useRef } from 'react'

export function TiltCard({ children, className = '', onClick }) {
  const ref = useRef(null)

  function handleMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ref.current.style.setProperty('--blob-x', `${x}px`)
    ref.current.style.setProperty('--blob-y', `${y}px`)
  }

  function handleMouseLeave() {
    if (!ref.current) return
    ref.current.style.removeProperty('--blob-x')
    ref.current.style.removeProperty('--blob-y')
  }

  return (
    <div
      ref={ref}
      className={`glass blob-card rounded-2xl ${className}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
