/**
 * AutocompleteInput
 *
 * Input con dropdown de sugerencias filtrables.
 * Al seleccionar una opción, dispara onSelect con el objeto completo.
 */

import { useState, useRef, useEffect } from 'react'

export function AutocompleteInput({ value, onChange, options, onSelect, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const containerRef = useRef(null)

  // Sincroniza query externo (por si el padre cambia value)
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Cierra al hacer click fuera
  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const filtered = options.filter((opt) =>
    opt.nombre.toLowerCase().includes(query.toLowerCase())
  )

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    setIsOpen(true)
  }

  const handleSelect = (opt) => {
    setQuery(opt.nombre)
    onChange(opt.nombre)
    onSelect?.(opt)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-[rgba(159,152,143,0.3)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#10612E]/30 focus:border-[#10612E] transition-all"
      />

      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[rgba(159,152,143,0.2)] rounded-xl shadow-lg">
          {filtered.map((opt, idx) => (
            <li
              key={idx}
              onMouseDown={(e) => e.preventDefault()} // evita blur antes del click
              onClick={() => handleSelect(opt)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-[rgba(16,97,46,0.06)] border-b border-[rgba(0,0,0,0.03)] last:border-0"
            >
              <span className="font-medium text-[#333]">{opt.nombre}</span>
              <span className="text-xs text-[#9F988F] ml-2">({opt.creditos} créditos)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
