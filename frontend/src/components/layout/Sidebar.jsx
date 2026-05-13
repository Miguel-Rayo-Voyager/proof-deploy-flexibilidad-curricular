/**
 * Sidebar
 *
 * Barra lateral tipo IDE para navegación y gestión de programas.
 */

import { useState } from 'react'
import {
  useAppStore,
  addProgram,
  removeProgram,
  setActiveProgram,
  resetAll,
} from '../../stores/useAppStore'
import { exportGlobalExcel } from '../../lib/exportGlobalExcel'
import { ConfirmModal } from '../ui/ConfirmModal'
import { ImportarRegistrosModal } from '../ui/ImportarRegistrosModal'

export function Sidebar() {
  const programs = useAppStore((s) => s.programs)
  const activeProgramId = useAppStore((s) => s.activeProgramId)

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showMinProgramModal, setShowMinProgramModal] = useState(false)

  return (
    <>
      <aside className="w-[280px] h-full bg-white border-r border-[rgba(159,152,143,0.2)] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(159,152,143,0.15)] flex-shrink-0 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9F988F]">
            Programas
          </h2>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="text-xs font-bold text-[#10612E] hover:text-[#0d4f25] hover:bg-[rgba(16,97,46,0.08)] transition-colors cursor-pointer rounded-md px-2 py-1 flex items-center gap-1"
            title="Importar programa desde base de datos"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Importar
          </button>
        </div>

        {/* Lista de programas */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {programs.map((program) => {
            const isActive = program.id === activeProgramId
            const isCalculated = program.preview !== null
            const name = program.formData.n2_nombre_programa || 'Nuevo Programa'
            const faculty = program.formData.n1_facultad
            const modality = program.formData.n3_modalidad

            return (
              <div
                key={program.id}
                onClick={() => setActiveProgram(program.id)}
                className={`group relative rounded-xl px-3 py-3 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[rgba(16,97,46,0.08)] border border-[rgba(16,97,46,0.2)]'
                    : 'hover:bg-[rgba(16,97,46,0.04)] border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isCalculated ? 'bg-[#10612E]' : 'bg-[#9F988F]'
                        }`}
                        title={isCalculated ? 'Calculado' : 'Borrador'}
                      />
                      <p className="text-sm font-semibold text-[#333] truncate">
                        {name}
                      </p>
                    </div>
                    <p className="text-xs text-[#9F988F] mt-0.5 truncate">
                      {faculty} {modality && `· ${modality}`}
                    </p>
                    {isCalculated && (
                      <p className="text-xs font-mono font-bold text-[#10612E] mt-1">
                        I(f) = {program.preview.indice_flexibilidad.toFixed(3)}
                      </p>
                    )}
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const removed = removeProgram(program.id)
                      if (!removed) setShowMinProgramModal(true)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-100 text-[#9F988F] hover:text-red-600"
                    title="Eliminar programa"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Botones inferiores — siempre visibles */}
        <div className="px-3 py-4 border-t border-[rgba(159,152,143,0.15)] space-y-2 flex-shrink-0 bg-white">
          <button
            onClick={addProgram}
            className="w-full px-4 py-2.5 rounded-xl bg-[#10612E] text-white text-sm font-bold hover:bg-[#0d4f25] transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar otro programa
          </button>

          <button
            onClick={() => exportGlobalExcel(programs)}
            className="w-full px-4 py-2.5 rounded-xl border border-[rgba(159,152,143,0.35)] text-[#555] text-sm font-medium hover:text-[#10612E] hover:border-[#10612E] transition-all flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar todo (Excel)
          </button>

          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-all flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Eliminar todo
          </button>
        </div>
      </aside>

      <ConfirmModal
        open={showDeleteAllModal}
        title="Eliminar todo"
        message="¿Está seguro de eliminar TODOS los programas y comenzar desde cero? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar todo"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          resetAll()
          setShowDeleteAllModal(false)
        }}
        onCancel={() => setShowDeleteAllModal(false)}
      />

      <ImportarRegistrosModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      <ConfirmModal
        open={showMinProgramModal}
        title="No se puede eliminar"
        message='Debe conservar al menos un programa. Use "Eliminar todo" si desea comenzar de cero.'
        confirmLabel="Aceptar"
        variant="primary"
        onConfirm={() => setShowMinProgramModal(false)}
      />
    </>
  )
}
