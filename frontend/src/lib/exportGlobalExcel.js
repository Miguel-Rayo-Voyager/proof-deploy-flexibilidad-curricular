/**
 * exportGlobalExcel
 *
 * Genera un archivo Excel consolidado con los resultados de todos los programas
 * calculados. Incluye las columnas exactas solicitadas por el cliente.
 */

import * as XLSX from 'xlsx'

function pct(val) {
  if (val === undefined || val === null || Number.isNaN(val)) return ''
  return `${(val * 100).toFixed(2)}%`
}

export function exportGlobalExcel(programs) {
  const calculados = programs.filter((p) => p.preview !== null)

  if (calculados.length === 0) {
    alert('No hay programas calculados para exportar.')
    return
  }

  const rows = [
    [
      'FACULTAD',
      'PROGRAMA',
      'ESPECIFICOS',
      'ELECTIVOS',
      'PRERREQUISITO',
      'CORREQUISITOS',
      'PROMEDIO CREDITOS ACADEMICOS',
      'NUCLEO COMUN',
      'RUTAS DE HOMOLOGACION 1',
      'RUTAS DE HOMOLOGACION 2',
      'RUTAS EN CONVENIO 1',
      'RUTAS EN CONVENIO 2',
      'PROMEDIO TRANSVERSALIDAD',
      'TRABAJO EN COMUNIDAD',
      'MODALIDADES DE GRADO PS',
      'PROMEDIO PROYECCION SOCIAL',
      'RUTA DE INVESTIGACION',
      'MODALIDADES DE GRADO INV',
      'PROMEDIO INVESTIGACION',
      'HIBRIDOS',
      'VIRTUALES',
      'PROMEDIO INCLUSION TECNOLOGICA',
      'INDICE DE FLEXIBILIDAD CURRICULAR',
    ],
  ]

  calculados.forEach((program) => {
    const fd = program.formData
    const res = program.preview
    const dims = res.dimensiones

    const d0 = dims[0]?.indicadores || {}
    const d1 = dims[1]?.indicadores || {}
    const d2 = dims[2]?.indicadores || {}
    const d3 = dims[3]?.indicadores || {}
    const d4 = dims[4]?.indicadores || {}

    rows.push([
      fd.n1_facultad,
      fd.n2_nombre_programa,
      pct(d0['1.1.1_especificos']),
      pct(d0['1.2.1_electivos']),
      pct(d0['1.3.1_prerrequisito']),
      pct(d0['1.4.1_correquisito']),
      dims[0]?.promedio?.toFixed(4) ?? '',
      pct(d1['2.1.1_nucleo_comun']),
      pct(d1['2.2.1_hom_mismo_nivel_int']),
      pct(d1['2.2.2_hom_nivel_sup_int']),
      pct(d1['2.3.1_hom_mismo_nivel_ext']),
      pct(d1['2.3.2_hom_nivel_sup_ext']),
      dims[1]?.promedio?.toFixed(4) ?? '',
      pct(d2['3.1.1_trabajo_comunidad']),
      pct(d2['3.2.1_modalidades_ps']),
      dims[2]?.promedio?.toFixed(4) ?? '',
      pct(d3['4.1.1_ruta_investigacion']),
      pct(d3['4.2.1_modalidades_inv']),
      dims[3]?.promedio?.toFixed(4) ?? '',
      pct(d4['5.1.1_hibridos']),
      pct(d4['5.2.1_virtuales']),
      dims[4]?.promedio?.toFixed(4) ?? '',
      res.indice_flexibilidad.toFixed(4),
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = rows[0].map(() => ({ wch: 24 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')

  const dateStr = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Indice_Flexibilidad_Consolidado_${dateStr}.xlsx`)
}
