/**
 * ConfirmModal
 *
 * Modal de confirmación reutilizable con estilos propios.
 * Reemplaza window.confirm nativo.
 */

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel, variant = 'danger' }) {
  if (!open) return null

  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-[#10612E] text-white hover:bg-[#0d4f25]'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 transform transition-all scale-100">
        <h3 className="text-lg font-bold text-[#333] mb-2">{title}</h3>
        <p className="text-sm text-[#9F988F] leading-relaxed whitespace-pre-line mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-[rgba(159,152,143,0.35)] text-[#555] text-sm font-medium hover:text-[#10612E] hover:border-[#10612E] transition-all"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
