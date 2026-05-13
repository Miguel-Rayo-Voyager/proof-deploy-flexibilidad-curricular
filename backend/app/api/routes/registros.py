import uuid
import asyncio
import httpx
from fastapi import APIRouter, HTTPException, status, Query
from app.models.registro import RegistroCreate
from app.services.indicators_engine import (
    FormData, SubregistroCreditos, CursoVirtual, CursoHibrido,
    calcular_indice,
)
from app.core.supabase_client import get_supabase_client

router = APIRouter(prefix="/registros", tags=["registros"])


# ─── Helper: convierte el modelo Pydantic al FormData del motor ───────────────

def _to_engine_data(payload: RegistroCreate) -> FormData:
    return FormData(
        modalidad=payload.n3_modalidad,
        creditos_totales=payload.n6_creditos_totales,
        creditos_especificos=payload.n7_creditos_especificos,
        creditos_electivos=payload.n8_creditos_electivos,
        creditos_prerrequisito=payload.n10_creditos_prerrequisito,
        creditos_correquisito=payload.n11_creditos_correquisito,
        creditos_nucleo_programa=payload.n15_creditos_nucleo_programa or 0,
        hom_mismo_nivel_int=[SubregistroCreditos(h.nombre_programa, h.creditos_homologables) for h in payload.hom_mismo_nivel_int],
        hom_nivel_sup_int=[SubregistroCreditos(h.nombre_programa, h.creditos_homologables) for h in payload.hom_nivel_sup_int],
        hom_mismo_nivel_ext=[SubregistroCreditos(h.nombre_programa, h.creditos_homologables) for h in payload.hom_mismo_nivel_ext],
        hom_nivel_sup_ext=[SubregistroCreditos(h.nombre_programa, h.creditos_homologables) for h in payload.hom_nivel_sup_ext],
        cursos_trabajo_comunidad=[SubregistroCreditos(c.nombre_curso, c.creditos) for c in payload.cursos_trabajo_comunidad],
        num_modalidades_ps=payload.n29_num_modalidades_ps,
        cursos_investigacion=[SubregistroCreditos(c.nombre_curso, c.creditos) for c in payload.cursos_investigacion],
        num_modalidades_inv=payload.n28_num_modalidades_inv,
        cursos_virtuales=[CursoVirtual(c.nombre_curso, c.creditos, c.horas_virtuales) for c in payload.cursos_virtuales],
        cursos_hibridos=[CursoHibrido(c.nombre_curso, c.creditos, c.horas_sincronicas, c.horas_presenciales) for c in payload.cursos_hibridos],
    )


# ─── Helper: serializa el payload para la función PL/pgSQL ───────────────────

def _to_rpc_payload(payload: RegistroCreate) -> dict:
    """
    Construye el dict que se envía como argumento JSONB a fn_insertar_registro_completo.
    Los sub-arrays se pasan tal como los define el modelo Pydantic.
    """
    return {
        # Identificación
        "n1_facultad":        payload.n1_facultad,
        "n2_nombre_programa": payload.n2_nombre_programa,
        "n3_modalidad":       payload.n3_modalidad,
        "n4_nivel_formacion": payload.n4_nivel_formacion,
        "n5_periodicidad":    payload.n5_periodicidad,

        # Créditos
        "n6_creditos_totales":      payload.n6_creditos_totales,
        "n7_creditos_especificos":  payload.n7_creditos_especificos,
        "n8_creditos_electivos":    payload.n8_creditos_electivos,
        "n10_creditos_prerrequisito": payload.n10_creditos_prerrequisito,
        "n11_creditos_correquisito":  payload.n11_creditos_correquisito,

        # Núcleo común
        "n12_tiene_nucleo_comun":       payload.n12_tiene_nucleo_comun,
        "n13_creditos_nucleo_facultad": payload.n13_creditos_nucleo_facultad,
        "n13_1_observacion":            payload.n13_1_observacion,
        "n14_programa_en_nucleo":       payload.n14_programa_en_nucleo,
        "n15_creditos_nucleo_programa": payload.n15_creditos_nucleo_programa,
        "n16_razones_no_nucleo":        payload.n16_razones_no_nucleo,

        # Homologaciones (sub-arrays)
        "hom_mismo_nivel_int": [h.model_dump() for h in payload.hom_mismo_nivel_int],
        "hom_nivel_sup_int":   [h.model_dump() for h in payload.hom_nivel_sup_int],
        "hom_mismo_nivel_ext": [h.model_dump() for h in payload.hom_mismo_nivel_ext],
        "hom_nivel_sup_ext":   [h.model_dump() for h in payload.hom_nivel_sup_ext],

        # Proyección Social
        "cursos_trabajo_comunidad": [c.model_dump() for c in payload.cursos_trabajo_comunidad],

        # Investigación
        "cursos_investigacion": [c.model_dump() for c in payload.cursos_investigacion],

        # Modalidades de grado (n27 checkboxes)
        "n27_inv_grupo_investigacion":    payload.n27_inv_grupo_investigacion,
        "n27_inv_ponencias_semillero":    payload.n27_inv_ponencias_semillero,
        "n27_inv_trabajo_grado":          payload.n27_inv_trabajo_grado,
        "n27_ps_proyecto_impacto_social": payload.n27_ps_proyecto_impacto_social,
        "n27_ps_sistematizacion":         payload.n27_ps_sistematizacion,
        "n27_ps_educacion_continua":      payload.n27_ps_educacion_continua,
        "n27_ps_cursos_posgrado":         payload.n27_ps_cursos_posgrado,
        "n27_ps_certificaciones":         payload.n27_ps_certificaciones,
        "n27_ps_movilidad_internacional": payload.n27_ps_movilidad_internacional,

        # Inclusión Tecnológica
        "cursos_virtuales": [c.model_dump() for c in payload.cursos_virtuales],
        "cursos_hibridos":  [c.model_dump() for c in payload.cursos_hibridos],

        # Finales
        "n32_convenios_doble_titulacion": payload.n32_convenios_doble_titulacion,
        "n33_observacion_general":        payload.n33_observacion_general,
    }


# ─── Helper: serializa el resultado del motor para la respuesta ───────────────

def _result_to_dict(result) -> dict:
    return {
        "modalidad": result.modalidad,
        "indice_flexibilidad": result.indice,
        "dimensiones": [
            {
                "nombre": d.nombre,
                "peso": d.peso,
                "promedio": d.promedio,
                "indicadores": d.indicadores,
            }
            for d in result.dimensiones
        ],
    }


# ─── ENDPOINT 1: Cálculo en tiempo real (sin persistir) ──────────────────────

@router.post("/calcular")
async def calcular_preview(payload: RegistroCreate):
    """Calcula el I(f) en tiempo real sin persistir (usado para feedback live)."""
    result = calcular_indice(_to_engine_data(payload))
    return _result_to_dict(result)


# ─── ENDPOINT 2: Guardar en Supabase + calcular I(f) ─────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_registro(payload: RegistroCreate):
    """
    Persiste el formulario completo en Supabase y retorna el I(f) calculado.

    Flujo:
      1. Valida el payload con Pydantic (ya hecho al llegar aquí).
      2. Calcula el I(f) en Python (instantáneo, sin DB).
      3. Llama a fn_insertar_registro_completo(payload JSONB) vía Supabase RPC.
         Esta función PL/pgSQL inserta la tabla principal + las 8 sub-tablas
         en una única transacción atómica.
      4. Retorna {id, ...resultado_del_calculo}.

    Si el RPC falla (violación de constraint, timeout, etc.) se propaga
    como HTTP 422/500 según el tipo de error, sin ningún registro parcial
    en la DB.
    """
    # Paso 2: calcular antes de tocar la DB (si el cálculo falla, no persistimos)
    engine_result = calcular_indice(_to_engine_data(payload))

    # Paso 3: persistir vía RPC transaccional
    db = get_supabase_client()
    rpc_payload = _to_rpc_payload(payload)

    try:
        # La RPC de Supabase espera el argumento bajo el nombre del parámetro de la función
        registro_id: str = await db.rpc(
            "fn_insertar_registro_completo",
            {"payload": rpc_payload},
        )
    except httpx.HTTPStatusError as exc:
        # Supabase devuelve el error de Postgres en el body
        detail = exc.response.text
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error en la base de datos: {detail}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo conectar con Supabase: {exc}",
        ) from exc

    # Paso 4: construir respuesta combinada
    return {
        "id": registro_id,
        **_result_to_dict(engine_result),
    }


# ─── ENDPOINT 3: Actualizar registro existente ────────────────────────────────

@router.patch("/{registro_id}", status_code=status.HTTP_200_OK)
async def actualizar_registro(registro_id: str, payload: RegistroCreate):
    """
    Actualiza un registro ya existente (UPDATE + DELETE/INSERT sub-tablas)
    y retorna el I(f) recalculado con los nuevos valores.
    """
    engine_result = calcular_indice(_to_engine_data(payload))

    db = get_supabase_client()
    rpc_payload = _to_rpc_payload(payload)

    try:
        await db.rpc(
            "fn_actualizar_registro_completo",
            {"p_id": registro_id, "payload": rpc_payload},
        )
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error en la base de datos: {detail}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo conectar con Supabase: {exc}",
        ) from exc

    return {
        "id": registro_id,
        **_result_to_dict(engine_result),
    }


# ─── ENDPOINT 4: Listar registros (paginado + búsqueda) ────────────────────────

@router.get("", status_code=status.HTTP_200_OK)
async def listar_registros(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: str = Query(""),
):
    """
    Retorna una lista paginada de registros con campos resumidos.
    Soporta búsqueda por nombre de programa (case-insensitive).
    """
    db = get_supabase_client()
    offset = (page - 1) * per_page
    filters = {}

    if search.strip():
        filters["n2_nombre_programa"] = f"ilike.%{search.strip()}%"

    # 1) Obtener los registros paginados
    try:
        registros = await db.select(
            "registros",
            filters=filters,
            limit=per_page,
            offset=offset,
            order="updated_at.desc",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al consultar la base de datos: {exc.response.text}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo conectar con Supabase: {exc}",
        ) from exc

    # 2) Obtener el conteo total (header count=exact de Supabase)
    total = 0
    try:
        url = f"{db._base}/rest/v1/registros"
        headers = {
            **db._headers,
            "Prefer": "count=exact",
        }
        count_params = {k: v for k, v in filters.items()}
        count_params["limit"] = "1"
        count_params["offset"] = "0"

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=count_params, headers=headers)
        resp.raise_for_status()
        content_range = resp.headers.get("content-range", "")
        # Formato: "0-0/total" o "0-9/150"
        if "/" in content_range:
            total = int(content_range.split("/")[-1])
    except Exception:
        total = len(registros)  # fallback: si falla el count, usamos el tamaño de la página

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "data": [
            {
                "id": str(r["id"]),
                "n1_facultad": r["n1_facultad"],
                "n2_nombre_programa": r["n2_nombre_programa"],
                "n3_modalidad": r["n3_modalidad"],
                "n4_nivel_formacion": r["n4_nivel_formacion"],
                "n6_creditos_totales": r["n6_creditos_totales"],
                "created_at": r["created_at"],
            }
            for r in registros
        ],
    }


# ─── ENDPOINT 5: Obtener registro completo por ID ──────────────────────────────

@router.get("/{registro_id}", status_code=status.HTTP_200_OK)
async def obtener_registro(registro_id: str):
    """
    Retorna un registro completo incluyendo todas las sub-tablas.
    Útil para importar un registro existente a la sesión local.
    """
    try:
        registro_uuid = uuid.UUID(registro_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID proporcionado no es un UUID válido.",
        ) from exc

    db = get_supabase_client()
    rid = str(registro_uuid)

    async def fetch_main():
        row = await db.select_one("registros", {"id": "eq." + rid})
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro no encontrado.",
            )
        return row

    async def fetch_subtable(table: str) -> list[dict]:
        try:
            rows = await db.select(
                table,
                filters={"registro_id": "eq." + rid},
                limit=1000,
                order="orden.asc",
            )
            return rows
        except httpx.HTTPStatusError:
            return []
        except httpx.RequestError:
            return []

    try:
        (
            main,
            hom_mi,
            hom_si,
            hom_me,
            hom_se,
            ctc,
            ci,
            cv,
            ch,
        ) = await asyncio.gather(
            fetch_main(),
            fetch_subtable("hom_mismo_nivel_int"),
            fetch_subtable("hom_nivel_sup_int"),
            fetch_subtable("hom_mismo_nivel_ext"),
            fetch_subtable("hom_nivel_sup_ext"),
            fetch_subtable("cursos_trabajo_comunidad"),
            fetch_subtable("cursos_investigacion"),
            fetch_subtable("cursos_virtuales"),
            fetch_subtable("cursos_hibridos"),
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al consultar la base de datos: {exc}",
        ) from exc

    def strip_internal_fields(rows: list[dict]) -> list[dict]:
        """Elimina campos internos de la DB que no necesita el frontend."""
        return [
            {
                k: v
                for k, v in row.items()
                if k not in ("id", "registro_id", "created_at")
            }
            for row in rows
        ]

    return {
        "id": str(main["id"]),
        "n1_facultad": main["n1_facultad"],
        "n2_nombre_programa": main["n2_nombre_programa"],
        "n3_modalidad": main["n3_modalidad"],
        "n4_nivel_formacion": main["n4_nivel_formacion"],
        "n5_periodicidad": main["n5_periodicidad"],
        "n6_creditos_totales": main["n6_creditos_totales"],
        "n7_creditos_especificos": main["n7_creditos_especificos"],
        "n8_creditos_electivos": main["n8_creditos_electivos"],
        "n10_creditos_prerrequisito": main["n10_creditos_prerrequisito"],
        "n11_creditos_correquisito": main["n11_creditos_correquisito"],
        "n12_tiene_nucleo_comun": main["n12_tiene_nucleo_comun"],
        "n13_creditos_nucleo_facultad": main.get("n13_creditos_nucleo_facultad"),
        "n13_1_observacion": main.get("n13_1_observacion"),
        "n14_programa_en_nucleo": main.get("n14_programa_en_nucleo"),
        "n15_creditos_nucleo_programa": main.get("n15_creditos_nucleo_programa"),
        "n16_razones_no_nucleo": main.get("n16_razones_no_nucleo"),
        "n17_count_hom_mismo_nivel_int": main["n17_count_hom_mismo_nivel_int"],
        "n18_hom_ig_i": float(main["n18_hom_ig_i"]),
        "n19_count_hom_sup_nivel_int": main["n19_count_hom_sup_nivel_int"],
        "n20_hom_sup_i": float(main["n20_hom_sup_i"]),
        "n21_count_hom_mismo_nivel_ext": main["n21_count_hom_mismo_nivel_ext"],
        "n22_hom_ig_e": float(main["n22_hom_ig_e"]),
        "n23_count_hom_sup_nivel_ext": main["n23_count_hom_sup_nivel_ext"],
        "n24_hom_sup_e": float(main["n24_hom_sup_e"]),
        "n25_count_cursos_comunidad": main["n25_count_cursos_comunidad"],
        "n26_count_cursos_investigacion": main["n26_count_cursos_investigacion"],
        "n27_inv_grupo_investigacion": main["n27_inv_grupo_investigacion"],
        "n27_inv_ponencias_semillero": main["n27_inv_ponencias_semillero"],
        "n27_inv_trabajo_grado": main["n27_inv_trabajo_grado"],
        "n27_ps_proyecto_impacto_social": main["n27_ps_proyecto_impacto_social"],
        "n27_ps_sistematizacion": main["n27_ps_sistematizacion"],
        "n27_ps_educacion_continua": main["n27_ps_educacion_continua"],
        "n27_ps_cursos_posgrado": main["n27_ps_cursos_posgrado"],
        "n27_ps_certificaciones": main["n27_ps_certificaciones"],
        "n27_ps_movilidad_internacional": main["n27_ps_movilidad_internacional"],
        "n28_num_modalidades_inv": main["n28_num_modalidades_inv"],
        "n29_num_modalidades_ps": main["n29_num_modalidades_ps"],
        "n30_count_cursos_virtuales": main["n30_count_cursos_virtuales"],
        "n31_count_cursos_hibridos": main["n31_count_cursos_hibridos"],
        "n32_convenios_doble_titulacion": main["n32_convenios_doble_titulacion"],
        "n33_observacion_general": main.get("n33_observacion_general"),
        "hom_mismo_nivel_int": strip_internal_fields(hom_mi),
        "hom_nivel_sup_int": strip_internal_fields(hom_si),
        "hom_mismo_nivel_ext": strip_internal_fields(hom_me),
        "hom_nivel_sup_ext": strip_internal_fields(hom_se),
        "cursos_trabajo_comunidad": strip_internal_fields(ctc),
        "cursos_investigacion": strip_internal_fields(ci),
        "cursos_virtuales": strip_internal_fields(cv),
        "cursos_hibridos": strip_internal_fields(ch),
    }
