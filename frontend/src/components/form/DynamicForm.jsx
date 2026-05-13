/**
 * DynamicForm
 *
 * Formulario paginado de 9 secciones con navegación estática,
 * visibilidad condicional, subregistros dinámicos y preview del I(f) en tiempo real.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  useAppStore,
  setFormField,
  addSubrecord,
  updateSubrecord,
  removeSubrecord,
  resetProgram,
  setPreview as setProgramPreview,
  setSavedId as setProgramSavedId,
  setShowResults,
  setSection as setProgramSection,
  markPlanEstudiosApplied,
} from '../../stores/useAppStore'
import { computeDerived, toApiPayload } from '../../lib/formHelpers'
import { TiltCard } from '../ui/TiltCard'
import { FormField, CheckboxField } from '../ui/FormField'
import { SubrecordList } from '../ui/SubrecordList'
import { ResultsPanel } from '../results/ResultsPanel'
import { PlanEstudiosModal } from '../ui/PlanEstudiosModal'
import { ConfirmModal } from '../ui/ConfirmModal'
import { calcularPreview, guardarRegistro, actualizarRegistro } from '../../services/api'

// ─── Config de secciones ──────────────────────────────────────────────────────
const SECTIONS = [
  { id: 0, title: 'Identificación del Programa', icon: '🏛' },
  { id: 1, title: 'Créditos Académicos',          icon: '📚' },
  { id: 2, title: 'Núcleo Común',                 icon: '🔗' },
  { id: 3, title: 'Rutas de Homologación',         icon: '↔' },
  { id: 4, title: 'Proyección Social',             icon: '🌍' },
  { id: 5, title: 'Investigación',                 icon: '🔬' },
  { id: 6, title: 'Modalidades de Grado',          icon: '🎓' },
  { id: 7, title: 'Inclusión Tecnológica',         icon: '💻' },
  { id: 8, title: 'Datos Finales',                 icon: '✅' },
]

// ─── Componente principal ─────────────────────────────────────────────────────
export function DynamicForm({ programId }) {
  const program = useAppStore((s) => s.programs.find((p) => p.id === programId))
  const isActive = useAppStore((s) => s.activeProgramId === programId)

  const { formData: state, preview, savedId, showResults, currentSection: section, planEstudios, planEstudiosApplied } = program
  const derived = computeDerived(state)

  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const debounceRef = useRef(null)

  // Autocompletar créditos de la sección 1 una sola vez cuando se carga el plan de estudios
  useEffect(() => {
    if (planEstudios.length > 0 && !planEstudiosApplied) {
      const total = planEstudios.reduce((s, c) => s + c.creditos, 0)
      const electivos = planEstudios
        .filter((c) => c.nombre.trim().toUpperCase().includes('ELECTIV'))
        .reduce((s, c) => s + c.creditos, 0)
      const especificos = total - electivos
      setFormField(programId, 'n6_creditos_totales', String(total))
      setFormField(programId, 'n7_creditos_especificos', String(especificos))
      setFormField(programId, 'n8_creditos_electivos', String(electivos))
      markPlanEstudiosApplied(programId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planEstudios, planEstudiosApplied, programId])

  const navigate = useCallback((to) => {
    setDirection(to > section ? 1 : -1)
    setProgramSection(programId, to)
  }, [section, programId])

  // Recalculo en tiempo real con debounce de 600ms.
  // Solo envía cuando todos los campos requeridos por Pydantic están presentes
  // para evitar 422s innecesarios en el log del servidor.
  useEffect(() => {
    if (!isActive) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const payload = toApiPayload(state)
        const camposRequeridos = [
          payload.n1_facultad,
          payload.n2_nombre_programa,
          payload.n3_modalidad,
          payload.n4_nivel_formacion,
          payload.n5_periodicidad,
          payload.n12_tiene_nucleo_comun,
          payload.n14_programa_en_nucleo,
        ]
        if (camposRequeridos.some(v => !v) || payload.n6_creditos_totales <= 0) return
        // Filtra subregistros con nombre vacío para no disparar 422 mientras el usuario escribe
        const previewPayload = {
          ...payload,
          hom_mismo_nivel_int:      payload.hom_mismo_nivel_int.filter(h => h.nombre_programa),
          hom_nivel_sup_int:        payload.hom_nivel_sup_int.filter(h => h.nombre_programa),
          hom_mismo_nivel_ext:      payload.hom_mismo_nivel_ext.filter(h => h.nombre_programa),
          hom_nivel_sup_ext:        payload.hom_nivel_sup_ext.filter(h => h.nombre_programa),
          cursos_trabajo_comunidad: payload.cursos_trabajo_comunidad.filter(c => c.nombre_curso),
          cursos_investigacion:     payload.cursos_investigacion.filter(c => c.nombre_curso),
          cursos_virtuales:         payload.cursos_virtuales.filter(c => c.nombre_curso),
          cursos_hibridos:          payload.cursos_hibridos.filter(c => c.nombre_curso),
        }
        const result = await calcularPreview(previewPayload)
        setProgramPreview(programId, result)
      } catch {
        // silencia errores de validación parcial durante la edición
      }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [state, programId, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Función de envío desacoplada del evento form (evita submit accidental
  // cuando el botón "Siguiente" → "Guardar" aparece en el mismo DOM slot).
  const submitForm = async () => {
    setSaving(true)
    try {
      const result = savedId
        ? await actualizarRegistro(savedId, toApiPayload(state))
        : await guardarRegistro(toApiPayload(state))
      setProgramSavedId(programId, result.id)
      setProgramPreview(programId, result)
      setShowResults(programId, true)
    } catch (err) {
      setSaveError(err.message || '')
    } finally {
      setSaving(false)
    }
  }

  const handleSetField = useCallback((field, value) => {
    setFormField(programId, field, value)
  }, [programId])

  const handleAddSubrecord = useCallback((arrayField, item) => {
    addSubrecord(programId, arrayField, item)
  }, [programId])

  const handleUpdateSubrecord = useCallback((arrayField, index, key, value) => {
    updateSubrecord(programId, arrayField, index, key, value)
  }, [programId])

  const handleRemoveSubrecord = useCallback((arrayField, index) => {
    removeSubrecord(programId, arrayField, index)
  }, [programId])

  const handleReset = useCallback(() => {
    resetProgram(programId)
    setShowResults(programId, false)
    setProgramSection(programId, 0)
    setProgramPreview(programId, null)
    setProgramSavedId(programId, null)
  }, [programId])

  if (showResults && preview) {
    return (
      <ResultsPanel
        result={preview}
        formData={state}
        onBack={() => setShowResults(programId, false)}
        onReset={handleReset}
      />
    )
  }

  return (
    <form className="flex flex-col gap-6 max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-[2.25rem] sm:text-[2.75rem] font-black text-[#10612E] tracking-tight font-serif leading-tight">
          Índice de Flexibilidad Curricular
        </h1>
        <p className="text-[#9F988F] text-sm">Complete el formulario para calcular el I(f) de su programa</p>
      </div>

      {/* Barra de progreso */}
      <div className="flex gap-1.5 items-center">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate(s.id)}
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              s.id < section ? 'bg-[#10612E]'
              : s.id === section ? 'bg-[#10612E] opacity-60'
              : 'bg-[rgba(16,97,46,0.15)]'
            }`}
            title={s.title}
          />
        ))}
      </div>
      <p className="text-center text-xs text-[#9F988F]">
        {section + 1} / {SECTIONS.length} — {SECTIONS[section].title}
      </p>

      {/* Navegación */}
      <div className="flex justify-between items-center">
        {section === 0 ? (
          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="px-4 py-2 rounded-xl border border-[rgba(16,97,46,0.3)] text-[#10612E] text-sm font-medium hover:bg-[rgba(16,97,46,0.06)] transition-all"
          >
            Diligenciamiento asistido
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(section - 1)}
            className="w-10 h-10 rounded-full border border-[rgba(159,152,143,0.35)] text-[#9F988F] hover:text-[#10612E] hover:border-[#10612E] transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            title="Anterior"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {section < SECTIONS.length - 1 ? (
          <button
            type="button"
            onClick={() => navigate(section + 1)}
            className="w-10 h-10 rounded-full bg-[#10612E] text-white hover:bg-[#0d4f25] transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-md"
            title="Siguiente"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!preview}
              onClick={() => setShowResults(programId, true)}
              className="px-5 py-3 rounded-xl border-2 border-[#10612E] text-[#10612E] font-bold hover:bg-[#10612E] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              Ver Resultados
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submitForm}
              className="px-6 py-3 rounded-xl bg-[#10612E] text-white font-bold hover:bg-[#0d4f25] green-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving ? 'Guardando…' : savedId ? 'Actualizar I(f)' : 'Guardar I(f)'}
            </button>
          </div>
        )}
      </div>

      {/* Panel */}
      <div className="relative z-20 min-h-[420px] py-6">
        <div key={section} className="w-full">
          <TiltCard className="p-6 sm:p-8">
            <SectionContent
              sectionId={section}
              state={state}
              setField={handleSetField}
              derived={derived}
              addSubrecord={handleAddSubrecord}
              updateSubrecord={handleUpdateSubrecord}
              removeSubrecord={handleRemoveSubrecord}
              planEstudios={planEstudios}
            />
          </TiltCard>
        </div>
      </div>

      {/* Preview en tiempo real */}
      {preview && (
        <div className="glass rounded-2xl px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-[#9F988F]">I(f) en tiempo real</span>
          <span className="text-2xl font-bold text-[#10612E]">
            {preview.indice_flexibilidad.toFixed(4)}
          </span>
        </div>
      )}

      <PlanEstudiosModal
        programId={programId}
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
      />

      <ConfirmModal
        open={!!saveError}
        title="No se pudo guardar el registro"
        message={saveError || ''}
        confirmLabel="Aceptar"
        variant="danger"
        onConfirm={() => setSaveError(null)}
      />
    </form>
  )
}

// ─── Contenido de cada sección ────────────────────────────────────────────────
function SectionContent({ sectionId, state, setField, derived, addSubrecord, updateSubrecord, removeSubrecord, planEstudios }) {
  const s = state
  const sf = setField

  switch (sectionId) {
    // ── Sección 0: Identificación ─────────────────────────────────────────
    case 0:
      return (
        <div className="space-y-5">
          <SectionTitle>Identificación del Programa</SectionTitle>
          <FormField label="Facultad" name="n1_facultad" type="select" value={s.n1_facultad} onChange={sf} required
            options={['FCC','FCE','FCHS','FEBIPE','FEDU','FING']} />
          <FormField label="Nombre del programa" name="n2_nombre_programa" value={s.n2_nombre_programa} onChange={sf} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Modalidad" name="n3_modalidad" type="select" value={s.n3_modalidad} onChange={sf} required
              options={['Presencial','Distancia']} />
            <FormField label="Nivel de formación" name="n4_nivel_formacion" type="select" value={s.n4_nivel_formacion} onChange={sf} required
              options={['Técnico','Tecnológico','Profesional','Especialización','Maestría']} />
          </div>
          <FormField label="Periodicidad" name="n5_periodicidad" type="select" value={s.n5_periodicidad} onChange={sf} required
            options={['Semestral','Cuatrimestral']} />
        </div>
      )

    // ── Sección 1: Créditos Académicos ────────────────────────────────────
    case 1:
      return (
        <div className="space-y-5">
          <SectionTitle>Créditos Académicos</SectionTitle>
          <FormField label="Créditos totales del programa" name="n6_creditos_totales" type="number" value={s.n6_creditos_totales} onChange={sf} required hint="Debe ser mayor que cero" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Créditos específicos obligatorios" name="n7_creditos_especificos" type="number" value={s.n7_creditos_especificos} onChange={sf} required />
            <FormField label="Créditos electivos" name="n8_creditos_electivos" type="number" value={s.n8_creditos_electivos} onChange={sf} required />
          </div>
          <div className="glass rounded-xl px-4 py-3 flex justify-between text-sm">
            <span className="text-[#9F988F]">Complemento (n9 = Totales − Obligatorios − Electivos)</span>
            <span className={`font-mono font-bold ${derived.n9_comp1 < 0 ? 'text-red-600' : 'text-[#10612E]'}`}>
              {derived.n9_comp1}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Créditos con prerrequisito" name="n10_creditos_prerrequisito" type="number" value={s.n10_creditos_prerrequisito} onChange={sf} required />
            <FormField label="Créditos con correquisitos" name="n11_creditos_correquisito" type="number" value={s.n11_creditos_correquisito} onChange={sf} required />
          </div>
        </div>
      )

    // ── Sección 2: Núcleo Común ───────────────────────────────────────────
    case 2:
      return (
        <div className="space-y-5">
          <SectionTitle>Núcleo Común</SectionTitle>
          <FormField label="¿La Facultad tiene núcleo común aprobado?" name="n12_tiene_nucleo_comun" type="select" value={s.n12_tiene_nucleo_comun} onChange={sf} required
            options={[{ value: 'SI', label: 'Sí' }, { value: 'NO', label: 'No' }]} />

          {s.n12_tiene_nucleo_comun === 'SI' && (
            <div className="space-y-4 overflow-hidden">
              <FormField label="Créditos del núcleo común de la Facultad" name="n13_creditos_nucleo_facultad" type="number" value={s.n13_creditos_nucleo_facultad} onChange={sf} />
              <FormField label="Observación" name="n13_1_observacion" type="textarea" value={s.n13_1_observacion} onChange={sf} />
            </div>
          )}

          <FormField label="¿El programa forma parte del núcleo común?" name="n14_programa_en_nucleo" type="select" value={s.n14_programa_en_nucleo} onChange={sf}
            required options={[{ value: 'SI', label: 'Sí' }, { value: 'NO', label: 'No' }]} />

          {s.n14_programa_en_nucleo === 'SI' && (
            <div className="overflow-hidden">
              <FormField label="Créditos del núcleo común que implementa el programa" name="n15_creditos_nucleo_programa" type="number" value={s.n15_creditos_nucleo_programa} onChange={sf} />
            </div>
          )}
          {s.n14_programa_en_nucleo === 'NO' && (
            <div className="overflow-hidden">
              <FormField label="Razones para no implementar el núcleo común" name="n16_razones_no_nucleo" type="textarea" value={s.n16_razones_no_nucleo} onChange={sf} />
            </div>
          )}
        </div>
      )

    // ── Sección 3: Homologaciones ─────────────────────────────────────────
    case 3:
      return (
        <div className="space-y-8">
          <SectionTitle>Rutas de Homologación</SectionTitle>
          {[
            { field: 'hom_mismo_nivel_int', label: 'Programas — mismo nivel, institución propia' },
            { field: 'hom_nivel_sup_int',   label: 'Programas — nivel superior, institución propia' },
            { field: 'hom_mismo_nivel_ext', label: 'Programas — mismo nivel, instituciones en convenio' },
            { field: 'hom_nivel_sup_ext',   label: 'Programas — nivel superior, instituciones en convenio' },
          ].map(({ field, label }) => (
            <div key={field} className="space-y-3">
              <h4 className="text-sm font-semibold text-[#10612E]">{label}</h4>
              <SubrecordList
                arrayField={field}
                items={state[field]}
                fields={[
                  { key: 'nombre_programa',       label: 'Nombre del programa', placeholder: 'Ej: Ingeniería de Sistemas' },
                  { key: 'creditos_homologables', label: 'Créditos homologables', type: 'number' },
                ]}
                emptyItem={{ nombre_programa: '', creditos_homologables: '0' }}
                onAdd={addSubrecord}
                onUpdate={updateSubrecord}
                onRemove={removeSubrecord}
                addLabel="Agregar programa"
              />
            </div>
          ))}
        </div>
      )

    // ── Sección 4: Proyección Social ──────────────────────────────────────
    case 4:
      return (
        <div className="space-y-5">
          <SectionTitle>Proyección Social</SectionTitle>
          <h4 className="text-sm font-semibold text-[#10612E]">Cursos con trabajo en comunidad</h4>
          <SubrecordList
            arrayField="cursos_trabajo_comunidad"
            items={state.cursos_trabajo_comunidad}
            fields={[
              { key: 'nombre_curso', label: 'Nombre del curso' },
              { key: 'creditos',     label: 'Créditos', type: 'number' },
            ]}
            emptyItem={{ nombre_curso: '', creditos: '0' }}
            onAdd={addSubrecord} onUpdate={updateSubrecord} onRemove={removeSubrecord}
            addLabel="Agregar curso"
            autocompleteSource={planEstudios}
          />
        </div>
      )

    // ── Sección 5: Investigación ──────────────────────────────────────────
    case 5:
      return (
        <div className="space-y-5">
          <SectionTitle>Ruta de Formación en Investigación</SectionTitle>
          <h4 className="text-sm font-semibold text-[#10612E]">Cursos de la ruta de investigación</h4>
          <SubrecordList
            arrayField="cursos_investigacion"
            items={state.cursos_investigacion}
            fields={[
              { key: 'nombre_curso', label: 'Nombre del curso' },
              { key: 'creditos',     label: 'Créditos', type: 'number' },
            ]}
            emptyItem={{ nombre_curso: '', creditos: '0' }}
            onAdd={addSubrecord} onUpdate={updateSubrecord} onRemove={removeSubrecord}
            addLabel="Agregar curso"
            autocompleteSource={planEstudios}
          />
        </div>
      )

    // ── Sección 6: Modalidades de Grado (n27) ────────────────────────────
    case 6:
      return (
        <div className="space-y-6">
          <SectionTitle>Modalidades de Grado</SectionTitle>
          <p className="text-sm text-[#9F988F]">Seleccione todas las opciones que oferta el programa:</p>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#10612E] opacity-70">Investigación</h4>
            {[
              { name: 'n27_inv_grupo_investigacion', label: 'Hacer parte de un grupo de investigación' },
              { name: 'n27_inv_ponencias_semillero',  label: 'Presentar ponencias desde un semillero' },
              { name: 'n27_inv_trabajo_grado',        label: 'Trabajo de grado' },
            ].map((opt) => (
              <CheckboxField key={opt.name} name={opt.name} label={opt.label} checked={s[opt.name]} onChange={sf} />
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#10612E] opacity-70">Proyección Social</h4>
            {[
              { name: 'n27_ps_proyecto_impacto_social', label: 'Proyecto de impacto social' },
              { name: 'n27_ps_sistematizacion',          label: 'Sistematización de aprendizajes de la práctica' },
              { name: 'n27_ps_educacion_continua',       label: 'Educación continua' },
              { name: 'n27_ps_cursos_posgrado',          label: 'Cursos de posgrado' },
              { name: 'n27_ps_certificaciones',          label: 'Certificaciones' },
              { name: 'n27_ps_movilidad_internacional',  label: 'Movilidad internacional (corta duración)' },
            ].map((opt) => (
              <CheckboxField key={opt.name} name={opt.name} label={opt.label} checked={s[opt.name]} onChange={sf} />
            ))}
          </div>

          <div className="glass rounded-xl px-4 py-3 flex justify-between text-sm">
            <span className="text-[#9F988F]">(Investigación) / (Proyección Social)</span>
            <span className="font-mono font-bold text-[#10612E]">
              {derived.n28_num_modalidades_inv} / {derived.n29_num_modalidades_ps}
            </span>
          </div>
        </div>
      )

    // ── Sección 7: Inclusión Tecnológica ──────────────────────────────────
    case 7:
      return (
        <div className="space-y-8">
          <SectionTitle>Inclusión Tecnológica</SectionTitle>

          {s.n3_modalidad === 'Distancia' && (
            <div className="border border-[rgba(16,97,46,0.2)] bg-[rgba(16,97,46,0.05)] rounded-xl px-4 py-3 text-sm text-[#10612E]">
              Esta dimensión no aplica para programas a Distancia.
            </div>
          )}

          <div className={s.n3_modalidad === 'Distancia' ? 'opacity-40 pointer-events-none' : ''}>
            <div className="space-y-5">
              <h4 className="text-sm font-semibold text-[#10612E]">Cursos ofertados en modalidad virtual</h4>
              <SubrecordList
                arrayField="cursos_virtuales"
                items={state.cursos_virtuales}
                fields={[
                  { key: 'nombre_curso',   label: 'Nombre del curso' },
                  { key: 'creditos',       label: 'Créditos', type: 'number' },
                  { key: 'horas_virtuales', label: 'Horas virtuales', type: 'number' },
                ]}
                emptyItem={{ nombre_curso: '', creditos: '0', horas_virtuales: '0' }}
                onAdd={addSubrecord} onUpdate={updateSubrecord} onRemove={removeSubrecord}
                addLabel="Agregar curso virtual"
                autocompleteSource={planEstudios}
              />
            </div>

            <div className="space-y-5 mt-8">
              <h4 className="text-sm font-semibold text-[#10612E]">Cursos ofertados en modalidad híbrida</h4>
              <SubrecordList
                arrayField="cursos_hibridos"
                items={state.cursos_hibridos}
                fields={[
                  { key: 'nombre_curso',       label: 'Nombre del curso' },
                  { key: 'creditos',           label: 'Créditos', type: 'number' },
                  { key: 'horas_sincronicas',  label: 'Horas sincrónicas', type: 'number' },
                  { key: 'horas_presenciales', label: 'Horas presenciales', type: 'number' },
                ]}
                emptyItem={{ nombre_curso: '', creditos: '0', horas_sincronicas: '0', horas_presenciales: '0' }}
                onAdd={addSubrecord} onUpdate={updateSubrecord} onRemove={removeSubrecord}
                addLabel="Agregar curso híbrido"
                autocompleteSource={planEstudios}
              />
            </div>
          </div>
        </div>
      )

    // ── Sección 8: Datos Finales ──────────────────────────────────────────
    case 8:
      return (
        <div className="space-y-5">
          <SectionTitle>Datos Finales</SectionTitle>
          <FormField
            label="Convenios para doble titulación activos"
            name="n32_convenios_doble_titulacion"
            type="number"
            min={0}
            value={s.n32_convenios_doble_titulacion}
            onChange={sf}
          />
          <FormField
            label="Observación general"
            name="n33_observacion_general"
            type="textarea"
            value={s.n33_observacion_general}
            onChange={sf}
          />
        </div>
      )

    default:
      return null
  }
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-[1.3rem] font-bold text-[#10612E] border-b border-[rgba(16,97,46,0.15)] pb-3 mb-4 font-serif">
      {children}
    </h2>
  )
}
