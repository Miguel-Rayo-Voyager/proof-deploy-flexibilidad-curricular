/**
 * SubrecordList — maneja la UI de campos con múltiples entradas (n17, n19, n21…).
 * Recibe una definición de columnas (fields) y renderiza cada subregistro
 * como una fila con sus inputs y un botón de eliminar.
 */

import { AutocompleteInput } from './AutocompleteInput'

const inputClass = `
  w-full bg-transparent border border-[rgba(159,152,143,0.35)]
  rounded-lg px-3 py-2 text-sm text-[#10612E] placeholder-[#9F988F] outline-none
  focus:border-[rgba(16,97,46,0.5)] focus:shadow-[0_0_0_2px_rgba(16,97,46,0.08)]
  transition-all duration-200
`

/**
 * fields = [{ key: 'nombre_programa', label: 'Nombre del programa', type: 'text' }, ...]
 */
export function SubrecordList({ arrayField, items, fields, emptyItem, onAdd, onUpdate, onRemove, addLabel = 'Agregar', autocompleteSource = null }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex gap-3 items-start bg-[rgba(16,97,46,0.04)] border border-[rgba(159,152,143,0.25)] rounded-xl p-3 transition-colors hover:border-[rgba(16,97,46,0.35)] hover:shadow-sm"
        >
          <span className="mt-2 text-xs font-mono text-[#10612E] opacity-60 w-5 shrink-0">
            {index + 1}
          </span>

          <div className={`flex-1 grid gap-2 ${fields.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <span className="text-xs text-[#9F988F]">{f.label}</span>
                {f.key === 'nombre_curso' && autocompleteSource ? (
                  <AutocompleteInput
                    value={item[f.key] ?? ''}
                    onChange={(val) => onUpdate(arrayField, index, f.key, val)}
                    onSelect={(opt) => {
                      // Si existe campo creditos en esta fila, autocompletarlo
                      if (fields.some((fld) => fld.key === 'creditos')) {
                        onUpdate(arrayField, index, 'creditos', String(opt.creditos))
                      }
                    }}
                    options={autocompleteSource}
                    placeholder={f.placeholder ?? f.label}
                  />
                ) : (
                  <input
                    type={f.type === 'number' ? 'text' : (f.type ?? 'text')}
                    inputMode={f.type === 'number' ? 'numeric' : undefined}
                    pattern={f.type === 'number' ? '[0-9]*' : undefined}
                    min={f.type === 'number' ? 0 : undefined}
                    value={item[f.key] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      if (f.type === 'number') {
                        if (/^\d*$/.test(val)) {
                          onUpdate(arrayField, index, f.key, parseInt(val) || 0)
                        }
                      } else {
                        onUpdate(arrayField, index, f.key, val)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (f.type === 'number' && ['e', 'E', '-', '+', '.'].includes(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    placeholder={f.placeholder ?? f.label}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onRemove(arrayField, index)}
            className="mt-2 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#9F988F] hover:text-red-600 hover:bg-red-600/10 transition-colors"
            title="Eliminar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onAdd(arrayField, { ...emptyItem })}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[rgba(16,97,46,0.3)] text-[#10612E] text-sm hover:bg-[rgba(16,97,46,0.06)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M7 1v12M1 7h12" />
        </svg>
        {addLabel}
      </button>
    </div>
  )
}
