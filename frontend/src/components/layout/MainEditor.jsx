/**
 * MainEditor
 *
 * Área principal que renderiza únicamente el programa activo.
 * Muestra el formulario o los resultados según el estado del programa.
 */

import { useAppStore } from '../../stores/useAppStore'
import { DynamicForm } from '../form/DynamicForm'

export function MainEditor() {
  const activeProgramId = useAppStore((s) => s.activeProgramId)
  const activeProgram = useAppStore((s) => s.programs.find((p) => p.id === activeProgramId))

  if (!activeProgram) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-[#9F988F] text-sm">Seleccione un programa del panel lateral</p>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full overflow-y-auto">
      <DynamicForm key={activeProgram.id} programId={activeProgram.id} />
    </div>
  )
}
