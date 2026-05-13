/**
 * Helpers puros para formularios.
 *
 * Extraídos de useFormStore para poder usarlos sin depender de React hooks,
 * permitiendo que el estado viva en un store externo (multi-programa).
 */

export const INITIAL_STATE = {
  // Identificación
  n1_facultad: '',
  n2_nombre_programa: '',
  n3_modalidad: '',
  n4_nivel_formacion: '',
  n5_periodicidad: '',

  // Dimensión 1 – Créditos
  n6_creditos_totales: '0',
  n7_creditos_especificos: '0',
  n8_creditos_electivos: '0',
  n10_creditos_prerrequisito: '0',
  n11_creditos_correquisito: '0',

  // Dimensión 2 – Núcleo común
  n12_tiene_nucleo_comun: '',
  n13_creditos_nucleo_facultad: '0',
  n13_1_observacion: '',
  n14_programa_en_nucleo: '',
  n15_creditos_nucleo_programa: '0',
  n16_razones_no_nucleo: '',

  // Dimensión 2 – Homologaciones (sub-registros)
  hom_mismo_nivel_int: [],
  hom_nivel_sup_int: [],
  hom_mismo_nivel_ext: [],
  hom_nivel_sup_ext: [],

  // Dimensión 3
  cursos_trabajo_comunidad: [],

  // Dimensión 4
  cursos_investigacion: [],

  // Modalidades de grado (checkboxes n27)
  n27_inv_grupo_investigacion: false,
  n27_inv_ponencias_semillero: false,
  n27_inv_trabajo_grado: false,
  n27_ps_proyecto_impacto_social: false,
  n27_ps_sistematizacion: false,
  n27_ps_educacion_continua: false,
  n27_ps_cursos_posgrado: false,
  n27_ps_certificaciones: false,
  n27_ps_movilidad_internacional: false,

  // Dimensión 5 (solo Presencial)
  cursos_virtuales: [],
  cursos_hibridos: [],

  // Finales
  n32_convenios_doble_titulacion: '0',
  n33_observacion_general: '',
}

/**
 * Devuelve los valores derivados a partir de un formData dado.
 */
export function computeDerived(formData) {
  const n9_comp1 =
    (parseInt(formData.n6_creditos_totales) || 0) -
    (parseInt(formData.n7_creditos_especificos) || 0) -
    (parseInt(formData.n8_creditos_electivos) || 0)

  const n28_num_modalidades_inv =
    [
      formData.n27_inv_grupo_investigacion,
      formData.n27_inv_ponencias_semillero,
      formData.n27_inv_trabajo_grado,
    ].filter(Boolean).length

  const n29_num_modalidades_ps =
    [
      formData.n27_ps_proyecto_impacto_social,
      formData.n27_ps_sistematizacion,
      formData.n27_ps_educacion_continua,
      formData.n27_ps_cursos_posgrado,
      formData.n27_ps_certificaciones,
      formData.n27_ps_movilidad_internacional,
    ].filter(Boolean).length

  return { n9_comp1, n28_num_modalidades_inv, n29_num_modalidades_ps }
}

/**
 * Convierte un registro crudo de la base de datos al formato de formData
 * que espera el frontend (strings para inputs numéricos, booleans para checkboxes).
 *
 * Nota: la DB almacena números como int, pero el frontend usa strings para
 * mantener compatibilidad con inputs HTML de tipo "text".
 */
export function dbRecordToFormData(dbRecord) {
  const s = (v) => (v != null ? String(v) : '')
  const n = (v) => (v != null ? String(v) : '0')
  const b = (v) => !!v

  // Limpia sub-registros: elimina campo "orden" de la DB y normaliza
  // campos numéricos a string (consistencia con INITIAL_STATE).
  const cleanSubs = (arr) =>
    Array.isArray(arr)
      ? arr.map((item) => {
          const { orden, ...rest } = item
          const normalized = { ...rest }
          // Normaliza campos numéricos conocidos de sub-registros
          const numericFields = [
            'creditos_homologables',
            'creditos',
            'horas_virtuales',
            'horas_sincronicas',
            'horas_presenciales',
          ]
          numericFields.forEach((field) => {
            if (field in normalized && normalized[field] != null) {
              normalized[field] = String(normalized[field])
            }
          })
          return normalized
        })
      : []

  return {
    // Identificación
    n1_facultad: s(dbRecord.n1_facultad),
    n2_nombre_programa: s(dbRecord.n2_nombre_programa),
    n3_modalidad: s(dbRecord.n3_modalidad),
    n4_nivel_formacion: s(dbRecord.n4_nivel_formacion),
    n5_periodicidad: s(dbRecord.n5_periodicidad),

    // Dimensión 1 – Créditos
    n6_creditos_totales: n(dbRecord.n6_creditos_totales),
    n7_creditos_especificos: n(dbRecord.n7_creditos_especificos),
    n8_creditos_electivos: n(dbRecord.n8_creditos_electivos),
    n10_creditos_prerrequisito: n(dbRecord.n10_creditos_prerrequisito),
    n11_creditos_correquisito: n(dbRecord.n11_creditos_correquisito),

    // Dimensión 2 – Núcleo común
    n12_tiene_nucleo_comun: s(dbRecord.n12_tiene_nucleo_comun),
    n13_creditos_nucleo_facultad: n(dbRecord.n13_creditos_nucleo_facultad),
    n13_1_observacion: s(dbRecord.n13_1_observacion),
    n14_programa_en_nucleo: s(dbRecord.n14_programa_en_nucleo),
    n15_creditos_nucleo_programa: n(dbRecord.n15_creditos_nucleo_programa),
    n16_razones_no_nucleo: s(dbRecord.n16_razones_no_nucleo),

    // Dimensión 2 – Homologaciones
    hom_mismo_nivel_int: cleanSubs(dbRecord.hom_mismo_nivel_int),
    hom_nivel_sup_int: cleanSubs(dbRecord.hom_nivel_sup_int),
    hom_mismo_nivel_ext: cleanSubs(dbRecord.hom_mismo_nivel_ext),
    hom_nivel_sup_ext: cleanSubs(dbRecord.hom_nivel_sup_ext),

    // Dimensión 3
    cursos_trabajo_comunidad: cleanSubs(dbRecord.cursos_trabajo_comunidad),

    // Dimensión 4
    cursos_investigacion: cleanSubs(dbRecord.cursos_investigacion),

    // Modalidades de grado (checkboxes n27)
    n27_inv_grupo_investigacion: b(dbRecord.n27_inv_grupo_investigacion),
    n27_inv_ponencias_semillero: b(dbRecord.n27_inv_ponencias_semillero),
    n27_inv_trabajo_grado: b(dbRecord.n27_inv_trabajo_grado),
    n27_ps_proyecto_impacto_social: b(dbRecord.n27_ps_proyecto_impacto_social),
    n27_ps_sistematizacion: b(dbRecord.n27_ps_sistematizacion),
    n27_ps_educacion_continua: b(dbRecord.n27_ps_educacion_continua),
    n27_ps_cursos_posgrado: b(dbRecord.n27_ps_cursos_posgrado),
    n27_ps_certificaciones: b(dbRecord.n27_ps_certificaciones),
    n27_ps_movilidad_internacional: b(dbRecord.n27_ps_movilidad_internacional),

    // Dimensión 5
    cursos_virtuales: cleanSubs(dbRecord.cursos_virtuales),
    cursos_hibridos: cleanSubs(dbRecord.cursos_hibridos),

    // Finales
    n32_convenios_doble_titulacion: n(dbRecord.n32_convenios_doble_titulacion),
    n33_observacion_general: s(dbRecord.n33_observacion_general),
  }
}

/**
 * Serializa formData para enviar al backend.
 * Convierte campos numéricos de string a int.
 */
export function toApiPayload(formData) {
  return {
    ...formData,
    n6_creditos_totales: parseInt(formData.n6_creditos_totales) || 0,
    n7_creditos_especificos: parseInt(formData.n7_creditos_especificos) || 0,
    n8_creditos_electivos: parseInt(formData.n8_creditos_electivos) || 0,
    n10_creditos_prerrequisito: parseInt(formData.n10_creditos_prerrequisito) || 0,
    n11_creditos_correquisito: parseInt(formData.n11_creditos_correquisito) || 0,
    n13_creditos_nucleo_facultad: parseInt(formData.n13_creditos_nucleo_facultad) || 0,
    n15_creditos_nucleo_programa: parseInt(formData.n15_creditos_nucleo_programa) || 0,
    n32_convenios_doble_titulacion: Math.max(
      0,
      parseInt(formData.n32_convenios_doble_titulacion) || 0
    ),
  }
}
