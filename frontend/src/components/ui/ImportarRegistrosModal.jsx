/**
 * ImportarRegistrosModal
 *
 * Modal para importar programas previamente guardados en la base de datos.
 * Muestra una tabla paginada con búsqueda por nombre de programa.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { listarRegistros, obtenerRegistro } from '../../services/api'
import { dbRecordToFormData } from '../../lib/formHelpers'
import { importProgram } from '../../stores/useAppStore'

const PER_PAGE = 10

export function ImportarRegistrosModal({ open, onClose }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [importingId, setImportingId] = useState(null)

  const searchDebounceRef = useRef(null)
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const fetchRegistros = useCallback(async (p, s) => {
    setLoading(true)
    setError('')
    try {
      const res = await listarRegistros({ page: p, perPage: PER_PAGE, search: s })
      setRegistros(res.data || [])
      setTotal(res.total || 0)
      if (p > Math.ceil((res.total || 0) / PER_PAGE) && (res.total || 0) > 0) {
        setPage(1)
      }
    } catch (err) {
      setError(err.message || 'Error al cargar los registros.')
      setRegistros([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial al abrir el modal
  useEffect(() => {
    if (!open) return
    fetchRegistros(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Cuando cambia page (navegación de paginación)
  useEffect(() => {
    if (!open) return
    fetchRegistros(page, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Búsqueda con debounce (solo cuando cambia search, no al abrir)
  useEffect(() => {
    if (!open) return
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setPage(1)
      fetchRegistros(1, search)
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleImport = async (id) => {
    setImportingId(id)
    setError('')
    try {
      const dbRecord = await obtenerRegistro(id)
      const formData = dbRecordToFormData(dbRecord)
      importProgram(formData)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al importar el registro.')
    } finally {
      setImportingId(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[rgba(159,152,143,0.15)] flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#333]">Importar programa</h3>
              <p className="text-sm text-[#9F988F] mt-0.5">
                Seleccione un registro guardado en la base de datos para traerlo a la sesión actual.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgba(0,0,0,0.05)] text-[#9F988F] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Búsqueda */}
          <div className="mt-4 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de programa..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(159,152,143,0.3)] text-sm focus:outline-none focus:ring-2 focus:ring-[#10612E]/30 focus:border-[#10612E]"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9F988F]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading && registros.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#10612E] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && registros.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-sm text-[#9F988F]">
                {search.trim() ? 'No se encontraron registros con ese nombre.' : 'No hay registros guardados en la base de datos.'}
              </p>
            </div>
          )}

          {registros.length > 0 && (
            <div className="border border-[rgba(159,152,143,0.15)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[rgba(16,97,46,0.04)] sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-[#10612E]">Programa</th>
                    <th className="text-left px-4 py-3 font-bold text-[#10612E]">Facultad</th>
                    <th className="text-left px-4 py-3 font-bold text-[#10612E]">Modalidad</th>
                    <th className="text-right px-4 py-3 font-bold text-[#10612E]">Créditos</th>
                    <th className="text-left px-4 py-3 font-bold text-[#10612E]">Nivel</th>
                    <th className="text-right px-4 py-3 font-bold text-[#10612E]">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[rgba(16,97,46,0.02)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#333] max-w-[200px] truncate" title={r.n2_nombre_programa}>
                        {r.n2_nombre_programa}
                      </td>
                      <td className="px-4 py-3 text-[#555]">{r.n1_facultad}</td>
                      <td className="px-4 py-3 text-[#555]">{r.n3_modalidad}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#555]">{r.n6_creditos_totales}</td>
                      <td className="px-4 py-3 text-[#555]">{r.n4_nivel_formacion}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleImport(r.id)}
                          disabled={importingId === r.id}
                          className="px-3 py-1.5 rounded-lg bg-[#10612E] text-white text-xs font-bold hover:bg-[#0d4f25] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ml-auto"
                        >
                          {importingId === r.id ? (
                            <>
                              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              Importando...
                            </>
                          ) : (
                            'Traer a la sesión'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer — Paginación */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-[rgba(159,152,143,0.15)] flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-[#9F988F]">
              Mostrando {registros.length} de {total} registros
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-[rgba(159,152,143,0.3)] text-xs font-medium text-[#555] hover:text-[#10612E] hover:border-[#10612E] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-xs text-[#9F988F] font-medium px-2">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg border border-[rgba(159,152,143,0.3)] text-xs font-medium text-[#555] hover:text-[#10612E] hover:border-[#10612E] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
