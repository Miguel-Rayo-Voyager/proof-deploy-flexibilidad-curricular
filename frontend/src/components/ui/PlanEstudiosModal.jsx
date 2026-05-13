/**
 * PlanEstudiosModal
 *
 * Modal que permite al usuario pegar el plan de estudios copiado desde Excel.
 * Formato esperado (tabulado):
 *   CODIGO   NOMBRE   PERIODO   CREDITOS
 */

import { useState } from 'react'
import { setPlanEstudios } from '../../stores/useAppStore'

/**
 * Normaliza espacios en blanco de forma agresiva.
 * Elimina espacios estándar, tabs, newlines, non-breaking spaces (U+00A0),
 * BOM (U+FEFF) y todos los espacios Unicode de ancho variable (U+2000-U+200A).
 */
function normalizeWhitespace(str) {
  return str.replace(/^[\s\uFEFF\xA0\u2000-\u200A]+|[\s\uFEFF\xA0\u2000-\u200A]+$/g, '')
}

function parsePlan(raw) {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean)
  const courses = []

  for (const line of lines) {
    // Primero intenta tabulación (Excel nativo)
    let cols = line.split('\t')
    // Si no hay tabs, intenta 2+ espacios consecutivos
    if (cols.length < 4) {
      cols = line.split(/\s{2,}/)
    }
    if (cols.length < 4) continue

    const codigo = normalizeWhitespace(cols[0])
    const nombre = normalizeWhitespace(cols[1])
    const periodo = normalizeWhitespace(cols[2])
    const creditos = parseInt(normalizeWhitespace(cols[3]), 10)

    if (!codigo || !nombre || Number.isNaN(creditos) || creditos <= 0) continue

    courses.push({ codigo, nombre, periodo, creditos })
  }

  return courses
}

export function PlanEstudiosModal({ programId, open, onClose }) {
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState([])
  const [error, setError] = useState('')

  if (!open) return null

  const handleParse = () => {
    const parsed = parsePlan(raw)
    if (parsed.length === 0) {
      setError('No se pudieron reconocer filas válidas. Asegúrese de copiar las 4 columnas desde Excel.')
      setPreview([])
      return
    }
    setError('')
    setPreview(parsed)
  }

  const handleConfirm = () => {
    if (preview.length === 0) return
    setPlanEstudios(programId, preview)
    onClose()
    setRaw('')
    setPreview([])
    setError('')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 flex flex-col max-h-[85vh]">
        <h3 className="text-lg font-bold text-[#333] mb-1">Diligenciamiento asistido</h3>
        <p className="text-sm text-[#9F988F] mb-4">
          Copie y pegue el plan de estudios desde Excel. El formato esperado es:
          <span className="font-mono text-[#10612E] bg-[rgba(16,97,46,0.06)] px-1.5 py-0.5 rounded text-xs ml-1">CÓDIGO  NOMBRE  PERIODO  CRÉDITOS</span>
        </p>

        <textarea
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setError(''); setPreview([]) }}
          placeholder={`Ejemplo:\nLENG1010\tCOMUNICACIÓN ESCRITA\tI\t2\nINFO1010\tGESTIÓN DE LA INFORMACIÓN\tI\t3`}
          className="w-full h-40 p-4 rounded-xl border border-[rgba(159,152,143,0.3)] text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#10612E]/30 focus:border-[#10612E]"
        />

        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}

        {preview.length > 0 && (
          <div className="mt-4 flex-1 overflow-auto border border-[rgba(159,152,143,0.15)] rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-[rgba(16,97,46,0.04)] sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-[#10612E]">Código</th>
                  <th className="text-left px-3 py-2 font-bold text-[#10612E]">Nombre</th>
                  <th className="text-left px-3 py-2 font-bold text-[#10612E]">Periodo</th>
                  <th className="text-right px-3 py-2 font-bold text-[#10612E]">Créditos</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((c, i) => (
                  <tr key={i} className="border-b border-[rgba(0,0,0,0.04)]">
                    <td className="px-3 py-2 font-mono">{c.codigo}</td>
                    <td className="px-3 py-2">{c.nombre}</td>
                    <td className="px-3 py-2">{c.periodo}</td>
                    <td className="px-3 py-2 text-right font-mono">{c.creditos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-[rgba(159,152,143,0.15)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[rgba(159,152,143,0.35)] text-[#555] text-sm font-medium hover:text-[#10612E] hover:border-[#10612E] transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleParse}
            disabled={!raw.trim()}
            className="px-4 py-2 rounded-xl border-2 border-[#10612E] text-[#10612E] text-sm font-bold hover:bg-[#10612E] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previsualizar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={preview.length === 0}
            className="px-4 py-2 rounded-xl bg-[#10612E] text-white text-sm font-bold hover:bg-[#0d4f25] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar ({preview.length})
          </button>
        </div>
      </div>
    </div>
  )
}
