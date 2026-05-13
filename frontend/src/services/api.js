/**
 * Servicio de comunicación con el backend FastAPI.
 * El proxy de Vite redirige /api → http://localhost:8000/api
 */

const API_BASE = import.meta.env.VITE_API_URL || ''
const BASE = `${API_BASE}/api/v1`

async function request(url, method, body) {
  const options = { method }
  if (body !== undefined && method !== 'GET') {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }
  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = err.detail
    const msg = Array.isArray(detail)
      ? detail.map(d => `${d.loc?.slice(1).join('.')} — ${d.msg}`).join('\n')
      : (detail || `Error ${res.status}`)
    throw new Error(msg)
  }
  return res.json()
}

/** Cálculo en tiempo real sin persistir (debounce en DynamicForm). */
export function calcularPreview(formData) {
  return request(`${BASE}/registros/calcular`, 'POST', formData)
}

/**
 * Guarda el formulario completo en Supabase y retorna el I(f).
 * La respuesta incluye `id` (UUID del registro en DB) + los indicadores.
 */
export function guardarRegistro(formData) {
  return request(`${BASE}/registros`, 'POST', formData)
}

/**
 * Actualiza un registro existente y retorna el I(f) recalculado.
 */
export function actualizarRegistro(id, formData) {
  return request(`${BASE}/registros/${id}`, 'PATCH', formData)
}

/**
 * Lista registros paginados desde la base de datos.
 */
export function listarRegistros({ page = 1, perPage = 10, search = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('per_page', String(perPage))
  if (search.trim()) params.set('search', search.trim())
  return request(`${BASE}/registros?${params.toString()}`, 'GET')
}

/**
 * Obtiene un registro completo por ID (incluye sub-tablas).
 */
export function obtenerRegistro(id) {
  return request(`${BASE}/registros/${id}`, 'GET')
}
