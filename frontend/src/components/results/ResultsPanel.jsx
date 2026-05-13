/**
 * ResultsPanel
 *
 * Panel final de resultados con:
 *   - Tabla de dimensiones e indicadores (varía según modalidad)
 *   - Promedio por dimensión
 *   - Índice de Flexibilidad Curricular I(f) resaltado
 */

import { useState } from 'react'
import { TiltCard } from '../ui/TiltCard'
import { ConfirmModal } from '../ui/ConfirmModal'
import * as XLSX from 'xlsx'

// Estructura de la tabla según modalidad
// Fuente: Mapeo del formulario - FLEXIBILIDAD CURRICULAR.docx
const TABLA_PRESENCIAL = [
  {
    dimension: 'CRÉDITOS ACADÉMICOS',
    peso: 0.30,
    subdimensiones: [
      { nombre: 'ESPECÍFICOS',    indicadores: [{ clave: '1.1.1_especificos',   label: 'Créditos específicos / Total' }] },
      { nombre: 'ELECTIVOS',      indicadores: [{ clave: '1.2.1_electivos',     label: 'Créditos electivos / Total' }] },
      { nombre: 'PRERREQUISITO',  indicadores: [{ clave: '1.3.1_prerrequisito', label: 'Créditos con prerrequisito / Total' }] },
      { nombre: 'CORREQUISITOS',  indicadores: [{ clave: '1.4.1_correquisito',  label: 'Créditos con correquisito / Total' }] },
    ],
  },
  {
    dimension: 'TRANSVERSALIDAD',
    peso: 0.15,
    subdimensiones: [
      { nombre: 'NÚCLEO COMÚN',   indicadores: [{ clave: '2.1.1_nucleo_comun', label: 'Créditos núcleo común / Total' }] },
      { nombre: 'RUTAS DE HOMOLOGACIÓN',
        indicadores: [
          { clave: '2.2.1_hom_mismo_nivel_int', label: 'Mismo nivel — institución propia' },
          { clave: '2.2.2_hom_nivel_sup_int',   label: 'Nivel superior — institución propia' },
        ],
      },
      { nombre: 'RUTAS EN CONVENIO',
        indicadores: [
          { clave: '2.3.1_hom_mismo_nivel_ext', label: 'Mismo nivel — en convenio' },
          { clave: '2.3.2_hom_nivel_sup_ext',   label: 'Nivel superior — en convenio' },
        ],
      },
    ],
  },
  {
    dimension: 'PROYECCIÓN SOCIAL',
    peso: 0.15,
    subdimensiones: [
      { nombre: 'TRABAJO EN COMUNIDAD', indicadores: [{ clave: '3.1.1_trabajo_comunidad', label: 'Créditos comunidad / Total' }] },
      { nombre: 'MODALIDADES DE GRADO', indicadores: [{ clave: '3.2.1_modalidades_ps',    label: 'Modalidades PS / 6' }] },
    ],
  },
  {
    dimension: 'INVESTIGACIÓN',
    peso: 0.15,
    subdimensiones: [
      { nombre: 'RUTA DE INVESTIGACIÓN', indicadores: [{ clave: '4.1.1_ruta_investigacion', label: 'Créditos investigación / Total' }] },
      { nombre: 'MODALIDADES DE GRADO',  indicadores: [{ clave: '4.2.1_modalidades_inv',     label: 'Modalidades INV / 3' }] },
    ],
  },
  {
    dimension: 'INCLUSIÓN TECNOLÓGICA',
    peso: 0.25,
    subdimensiones: [
      { nombre: 'HÍBRIDOS',  indicadores: [{ clave: '5.1.1_hibridos',  label: 'Créditos híbridos / Total' }] },
      { nombre: 'VIRTUALES', indicadores: [{ clave: '5.2.1_virtuales', label: 'Créditos virtuales / Total' }] },
    ],
  },
]

const TABLA_DISTANCIA = TABLA_PRESENCIAL.slice(0, 4).map((d, i) => ({
  ...d,
  peso: [0.35, 0.25, 0.20, 0.20][i],
}))

function pct(val) {
  return `${(val * 100).toFixed(2)}%`
}

function colorPorValor(val) {
  if (val >= 0.7) return 'text-[#10612E]'
  if (val >= 0.4) return 'text-[#0891b2]'
  return 'text-red-600'
}

export function ResultsPanel({ result, formData, onBack, onReset }) {
  const [showResetModal, setShowResetModal] = useState(false)
  const tabla = result.modalidad === 'Presencial' ? TABLA_PRESENCIAL : TABLA_DISTANCIA

  // Aplanar todos los indicadores de la respuesta del backend en un mapa plano
  const indMap = {}
  result.dimensiones.forEach((dim) => {
    Object.entries(dim.indicadores).forEach(([k, v]) => {
      indMap[k] = v
    })
  })

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()

    // ── Hoja 1: Resultados detallados ───────────────────────────────────────
    const rows = [
      ['Dimensión', 'Peso', 'Sub-Dimensión', 'Indicador', 'Valor', 'Promedio']
    ]

    tabla.forEach((dim, di) => {
      const promedio = result.dimensiones[di]?.promedio ?? 0
      let firstDimRow = true
      dim.subdimensiones.forEach((sub) => {
        let firstSubRow = true
        sub.indicadores.forEach((ind) => {
          const val = indMap[ind.clave] ?? 0
          rows.push([
            firstDimRow ? dim.dimension : '',
            firstDimRow ? `${(dim.peso * 100).toFixed(0)}%` : '',
            firstSubRow ? sub.nombre : '',
            ind.label,
            pct(val),
            firstDimRow ? pct(promedio) : '',
          ])
          firstDimRow = false
          firstSubRow = false
        })
      })
    })

    // Fila final: I(f) debajo de la tabla (igual que en la UI)
    rows.push([])
    rows.push([
      'ÍNDICE DE FLEXIBILIDAD CURRICULAR',
      '',
      '',
      'I(f)',
      result.indice_flexibilidad.toFixed(4),
      '',
    ])
    rows.push([
      '',
      '',
      '',
      'Fórmula',
      result.modalidad === 'Presencial'
        ? '0.30·D1 + 0.15·D2 + 0.15·D3 + 0.15·D4 + 0.25·D5'
        : '0.35·D1 + 0.25·D2 + 0.20·D3 + 0.20·D4',
      '',
    ])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 24 }, { wch: 8 }, { wch: 30 }, { wch: 38 }, { wch: 10 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados')

    // ── Hoja 2: Resumen I(f) ────────────────────────────────────────────────
    const resumen = [
      ['Índice de Flexibilidad Curricular'],
      [],
      ['Programa', formData.n2_nombre_programa],
      ['Facultad', formData.n1_facultad],
      ['Modalidad', result.modalidad],
      ['Nivel de formación', formData.n4_nivel_formacion],
      [],
      ['I(f)', result.indice_flexibilidad.toFixed(4)],
      ['Fórmula aplicada',
        result.modalidad === 'Presencial'
          ? 'I(f) = 0.30·D1 + 0.15·D2 + 0.15·D3 + 0.15·D4 + 0.25·D5'
          : 'I(f) = 0.35·D1 + 0.25·D2 + 0.20·D3 + 0.20·D4',
      ],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(resumen)
    ws2['!cols'] = [{ wch: 22 }, { wch: 65 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen I(f)')

    // ── Descarga ────────────────────────────────────────────────────────────
    const safeName = (formData.n2_nombre_programa || 'Programa')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
      .replace(/\s+/g, '_')
    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Indice_Flexibilidad_${safeName}_${dateStr}.xlsx`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#10612E] font-serif">
            Resultados: {formData.n2_nombre_programa}
          </h1>
          <p className="text-sm text-[#9F988F] mt-1">
            {formData.n1_facultad} · {result.modalidad} · {formData.n4_nivel_formacion}
          </p>
          {result.id && (
            <p className="text-xs text-[#9F988F] mt-1 font-mono">
              ID: {result.id}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 rounded-xl bg-[#10612E] text-white text-sm font-medium transition-colors hover:bg-[#0d4f25] hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar Excel
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-[rgba(159,152,143,0.35)] text-[#555] hover:text-[#10612E] text-sm transition-colors hover:scale-[1.02] active:scale-[0.98]"
          >
            Volver al formulario
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium transition-colors hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98]"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Constructo */}
      <TiltCard className="p-1 overflow-hidden">
        <div className="text-center py-3 px-4 border-b border-[rgba(159,152,143,0.2)]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9F988F]">Constructo</p>
          <p className="text-sm font-semibold text-[#10612E] mt-1 font-serif">
            FLEXIBILIDAD CURRICULAR como forma de organización de los currículos
          </p>
        </div>

        {/* Tabla de dimensiones */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(159,152,143,0.15)]">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#9F988F] w-36">Dimensión</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#9F988F]">Sub-Dimensión</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#9F988F]">Indicador</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#9F988F] w-24">Valor</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#10612E] w-28">PROMEDIO</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((dim, di) => {
                const totalRows = dim.subdimensiones.reduce((acc, s) => acc + s.indicadores.length, 0)
                const promedio = result.dimensiones[di]?.promedio ?? 0
                let rowCount = 0

                return dim.subdimensiones.map((sub, si) =>
                  sub.indicadores.map((ind, ii) => {
                    const isFirstOfDim = rowCount === 0
                    const isLastOfDim  = rowCount === totalRows - 1
                    rowCount++
                    const val = indMap[ind.clave] ?? 0

                    return (
                      <tr
                        key={`${di}-${si}-${ii}`}
                        className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[rgba(16,97,46,0.03)] transition-colors"
                      >
                        {isFirstOfDim && (
                          <td rowSpan={totalRows} className="px-4 py-3 align-middle border-r border-[rgba(159,152,143,0.15)]">
                            <div className="space-y-0.5">
                              <p className="font-bold text-[#10612E] text-xs uppercase leading-tight">{dim.dimension}</p>
                              <p className="text-xs text-[#9F988F]">Peso: {(dim.peso * 100).toFixed(0)}%</p>
                            </div>
                          </td>
                        )}
                        {ii === 0 && (
                          <td rowSpan={sub.indicadores.length} className="px-4 py-3 align-middle border-r border-[rgba(159,152,143,0.1)]">
                            <span className="text-xs font-semibold text-[#555]">{sub.nombre}</span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-[#9F988F] text-xs">{ind.label}</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold text-sm ${colorPorValor(val)}`}>
                          {pct(val)}
                        </td>
                        {isFirstOfDim && (
                          <td rowSpan={totalRows} className="px-4 py-3 align-middle text-right border-l border-[rgba(159,152,143,0.2)] bg-[rgba(16,97,46,0.03)]">
                            <span className={`font-mono font-bold text-base ${colorPorValor(promedio)}`}>
                              {pct(promedio)}
                            </span>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )
              })}
            </tbody>
          </table>
        </div>
      </TiltCard>

      {/* Índice Final */}
      <div>
        <TiltCard className="p-8 green-glow text-center space-y-3 gradient-accent">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">
            Índice de Flexibilidad Curricular
          </p>
          <div className="flex items-baseline justify-center gap-3">
            <span className="text-white/80 text-lg font-mono">I</span>
            <span className="text-white/80 text-sm font-mono">(f)</span>
            <span className="text-white/80 text-2xl">=</span>
            <span className="text-6xl font-black text-white tabular-nums">
              {result.indice_flexibilidad.toFixed(4)}
            </span>
          </div>

          <p className="text-xs text-white/70 max-w-sm mx-auto">
            {result.modalidad === 'Presencial'
              ? 'I(f) = 0.30·D1 + 0.15·D2 + 0.15·D3 + 0.15·D4 + 0.25·D5'
              : 'I(f) = 0.35·D1 + 0.25·D2 + 0.20·D3 + 0.20·D4'}
          </p>
        </TiltCard>
      </div>

      <ConfirmModal
        open={showResetModal}
        title="Limpiar formulario"
        message={`¿Está seguro de que desea limpiar todos los datos del programa "${formData.n2_nombre_programa || 'Nuevo Programa'}"? Esta acción borrará el formulario y los resultados calculados.`}
        confirmLabel="Sí, limpiar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          onReset()
          setShowResetModal(false)
        }}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  )
}
