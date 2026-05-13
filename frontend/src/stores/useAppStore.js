/**
 * Store externo inmutable para gestión multi-programa.
 *
 * Utiliza useSyncExternalStore (API nativa de React) para suscripción
 * sin necesidad de Context Providers ni dependencias de terceros.
 */

import { useSyncExternalStore, useCallback } from 'react'
import { INITIAL_STATE } from '../lib/formHelpers'

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function createProgram() {
  return {
    id: createId(),
    formData: { ...INITIAL_STATE },
    preview: null,
    savedId: null,
    showResults: false,
    currentSection: 0,
    planEstudios: [],           // [{ codigo, nombre, periodo, creditos }]
    planEstudiosApplied: false, // true cuando ya se autocompletaron los créditos
  }
}

// ── Estado interno (vive fuera de React) ────────────────────────────────────

let appState = {
  programs: [createProgram()],
  activeProgramId: null,
}

// El primer programa se activa automáticamente
appState.activeProgramId = appState.programs[0].id

const listeners = new Set()

function emit() {
  listeners.forEach((fn) => fn())
}

function setState(updater) {
  appState = updater(appState)
  emit()
}

// ── Acciones públicas ───────────────────────────────────────────────────────

export function addProgram() {
  setState((prev) => {
    const nuevo = createProgram()
    return {
      programs: [...prev.programs, nuevo],
      activeProgramId: nuevo.id,
    }
  })
}

export function importProgram(formData) {
  setState((prev) => {
    const nuevo = {
      id: createId(),
      formData: { ...formData },
      preview: null,
      savedId: null, // CRÍTICO: null fuerza POST (nuevo registro) al guardar
      showResults: false,
      currentSection: 0,
      planEstudios: [],
      planEstudiosApplied: false,
    }
    return {
      programs: [...prev.programs, nuevo],
      activeProgramId: nuevo.id,
    }
  })
}

export function removeProgram(id) {
  let removed = false
  setState((prev) => {
    if (prev.programs.length <= 1) {
      return prev
    }
    removed = true
    const filtrados = prev.programs.filter((p) => p.id !== id)
    const nuevoActivo =
      prev.activeProgramId === id
        ? filtrados[filtrados.length - 1].id
        : prev.activeProgramId
    return {
      programs: filtrados,
      activeProgramId: nuevoActivo,
    }
  })
  return removed
}

export function resetProgram(id) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === id
        ? {
            ...p,
            formData: { ...INITIAL_STATE },
            preview: null,
            savedId: null,
            showResults: false,
            currentSection: 0,
            planEstudios: [],
            planEstudiosApplied: false,
          }
        : p
    ),
  }))
}

export function setActiveProgram(id) {
  setState((prev) => ({ ...prev, activeProgramId: id }))
}

export function resetAll() {
  const primero = createProgram()
  setState(() => ({
    programs: [primero],
    activeProgramId: primero.id,
  }))
}

// ── Mutaciones de formulario (inmutables) ───────────────────────────────────

export function setFormField(programId, field, value) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId
        ? { ...p, formData: { ...p.formData, [field]: value } }
        : p
    ),
  }))
}

export function addSubrecord(programId, arrayField, item) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId
        ? {
            ...p,
            formData: {
              ...p.formData,
              [arrayField]: [...p.formData[arrayField], item],
            },
          }
        : p
    ),
  }))
}

export function updateSubrecord(programId, arrayField, index, key, value) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId
        ? {
            ...p,
            formData: {
              ...p.formData,
              [arrayField]: p.formData[arrayField].map((item, i) =>
                i === index ? { ...item, [key]: value } : item
              ),
            },
          }
        : p
    ),
  }))
}

export function removeSubrecord(programId, arrayField, index) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId
        ? {
            ...p,
            formData: {
              ...p.formData,
              [arrayField]: p.formData[arrayField].filter((_, i) => i !== index),
            },
          }
        : p
    ),
  }))
}

export function setPreview(programId, result) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId ? { ...p, preview: result } : p
    ),
  }))
}

export function setSavedId(programId, id) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId ? { ...p, savedId: id } : p
    ),
  }))
}

export function setShowResults(programId, show) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId ? { ...p, showResults: show } : p
    ),
  }))
}

export function setSection(programId, section) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId ? { ...p, currentSection: section } : p
    ),
  }))
}

export function setPlanEstudios(programId, courses) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId
        ? { ...p, planEstudios: courses, planEstudiosApplied: false }
        : p
    ),
  }))
}

export function markPlanEstudiosApplied(programId) {
  setState((prev) => ({
    ...prev,
    programs: prev.programs.map((p) =>
      p.id === programId ? { ...p, planEstudiosApplied: true } : p
    ),
  }))
}

// ── Hook de React ───────────────────────────────────────────────────────────

function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot() {
  return appState
}

export function useAppStore(selector) {
  const state = useSyncExternalStore(
    subscribe,
    () => (selector ? selector(getSnapshot()) : getSnapshot()),
    () => (selector ? selector(getSnapshot()) : getSnapshot())
  )
  return state
}

// Export raw state getter for non-React utilities (e.g., global Excel export)
export function getAppState() {
  return appState
}
