/**
 * FormField — campo de formulario estático.
 * Soporta: text, number, select, textarea.
 */

import { useState, useRef, useEffect } from 'react'

const baseInput = `
  w-full bg-transparent border border-[rgba(159,152,143,0.4)]
  rounded-xl px-4 py-3 text-[#10612E] placeholder-[#9F988F]
  transition-all duration-200 outline-none
  focus:border-[rgba(16,97,46,0.6)]
  focus:shadow-[0_0_0_3px_rgba(16,97,46,0.08)]
`

function NumberInput({ name, value, onChange, error, disabled, min }) {
  const handleChange = (e) => {
    const raw = e.target.value
    if (/^\d*$/.test(raw)) {
      onChange(name, raw)
    }
  }

  const handleKeyDown = (e) => {
    if (['e', 'E', '-', '+', '.'].includes(e.key)) {
      e.preventDefault()
    }
  }

  const step = (delta) => {
    const current = parseInt(value || 0, 10)
    const minimum = parseInt(min ?? 0, 10)
    const next = Math.max(minimum, current + delta)
    onChange(name, next.toString())
  }

  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={baseInput + (error ? ' border-red-500/60' : '') + ' pr-10'}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-px pointer-events-none">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => step(1)}
          className="w-5 h-4 flex items-center justify-center rounded-t text-[#9F988F] hover:text-[#10612E] hover:bg-[rgba(16,97,46,0.08)] transition-colors border border-[rgba(159,152,143,0.25)] border-b-0 pointer-events-auto"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => step(-1)}
          className="w-5 h-4 flex items-center justify-center rounded-b text-[#9F988F] hover:text-[#10612E] hover:bg-[rgba(16,97,46,0.08)] transition-colors border border-[rgba(159,152,143,0.25)] pointer-events-auto"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function CustomSelect({ name, value, onChange, options, error, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selectedLabel =
    options?.find((opt) => (opt.value ?? opt) === value)?.label ?? value ?? 'Seleccionar…'

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          ${baseInput}
          ${error ? 'border-red-500/60' : ''}
          flex items-center justify-between text-left cursor-pointer
          hover:bg-[rgba(16,97,46,0.02)]
        `}
      >
        <span className={value ? 'text-[#10612E]' : 'text-[#9F988F]'}>
          {selectedLabel}
        </span>
        <svg
          className={`w-4 h-4 text-[#10612E] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <ul
          className="absolute z-50 w-full mt-2 py-2 rounded-xl border border-[rgba(159,152,143,0.25)] bg-white/90 backdrop-blur-lg shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          <li>
            <button
              type="button"
              onClick={() => {
                onChange(name, '')
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                !value ? 'bg-[rgba(16,97,46,0.08)] text-[#0d4f25] font-medium' : 'text-[#555] hover:bg-[rgba(16,97,46,0.04)]'
              }`}
            >
              Seleccionar…
            </button>
          </li>
          {options?.map((opt) => {
            const optValue = opt.value ?? opt
            const optLabel = opt.label ?? opt
            const isActive = value === optValue
            return (
              <li key={optValue}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(name, optValue)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-[rgba(16,97,46,0.08)] text-[#0d4f25] font-medium'
                      : 'text-[#555] hover:bg-[rgba(16,97,46,0.04)]'
                  }`}
                >
                  {optLabel}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function FormField({ label, name, type = 'text', value, onChange, options, required, error, hint, disabled, min }) {
  const commonProps = {
    id: name,
    name,
    value: value ?? '',
    onChange: (e) => onChange(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
    disabled,
    className: baseInput + (error ? ' border-red-500/60' : ''),
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-[#555] flex items-center gap-1">
          {label}
          {required && <span className="text-[#10612E]">*</span>}
        </label>
      )}

      {type === 'select' ? (
        <CustomSelect
          name={name}
          value={value}
          onChange={onChange}
          options={options}
          error={error}
          disabled={disabled}
        />
      ) : type === 'number' ? (
        <NumberInput
          name={name}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          min={min}
        />
      ) : type === 'textarea' ? (
        <textarea {...commonProps} rows={3} className={baseInput + (error ? ' border-red-500/60' : '') + ' resize-none'} />
      ) : (
        <input {...commonProps} type={type} />
      )}

      {hint && !error && (
        <p className="text-xs text-[#9F988F]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

export function CheckboxField({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(name, e.target.checked)}
        className="sr-only"
      />
      <div className={`
        w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
        ${checked
          ? 'bg-[#10612E] border-[#10612E]'
          : 'border-[rgba(16,97,46,0.3)] bg-transparent group-hover:border-[rgba(16,97,46,0.6)]'
        }
      `}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>
      <span className="text-sm text-[#555] group-hover:text-[#10612E] transition-colors">{label}</span>
    </label>
  )
}
