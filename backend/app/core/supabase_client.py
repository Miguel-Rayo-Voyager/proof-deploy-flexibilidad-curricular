"""
SupabaseClient
==============
Cliente async ligero sobre httpx para llamar a la API REST de Supabase.
No depende del paquete `supabase-py`; usa únicamente httpx (ya instalado
como dependencia de uvicorn[standard]).

Patrón de uso:
    client = get_supabase_client()
    registro_id = await client.rpc("fn_insertar_registro_completo", payload_dict)
    row = await client.select_one("v_indice_flexibilidad", {"id": "eq." + str(registro_id)})
"""

from __future__ import annotations
import httpx
from app.core.config import settings


class SupabaseClient:
    def __init__(self, url: str, key: str) -> None:
        self._base = url.rstrip("/")
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",   # Supabase devuelve el registro creado
        }

    # ── RPC (llamada a función PL/pgSQL) ─────────────────────────────────────
    async def rpc(self, fn_name: str, params: dict) -> object:
        """
        Llama a POST /rest/v1/rpc/{fn_name} con `params` como body JSON.
        Retorna el valor devuelto por la función (ya deserializado).
        Lanza httpx.HTTPStatusError si la respuesta no es 2xx.
        """
        url = f"{self._base}/rest/v1/rpc/{fn_name}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=params, headers=self._headers)
        resp.raise_for_status()
        return resp.json()

    # ── SELECT con filtros ────────────────────────────────────────────────────
    async def select_one(self, table: str, filters: dict[str, str]) -> dict | None:
        """
        Llama a GET /rest/v1/{table}?col=operador.valor&...
        Devuelve el primer resultado o None si no hay filas.

        Ejemplo de filters:
            {"id": "eq.550e8400-e29b-41d4-a716-446655440000"}
        """
        url = f"{self._base}/rest/v1/{table}"
        headers = {**self._headers, "Prefer": "return=representation"}
        params = {k: v for k, v in filters.items()}
        params["limit"] = "1"

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else None

    # ── SELECT paginado ───────────────────────────────────────────────────────
    async def select(
        self,
        table: str,
        filters: dict[str, str] | None = None,
        limit: int = 10,
        offset: int = 0,
        order: str | None = None,
    ) -> list[dict]:
        """
        Llama a GET /rest/v1/{table} con filtros, paginación y ordenamiento.

        Ejemplo de filters:
            {"n2_nombre_programa": "ilike.%ingenieria%"}
        """
        url = f"{self._base}/rest/v1/{table}"
        headers = {**self._headers, "Prefer": "return=representation"}
        params: dict[str, str] = {}

        if filters:
            params.update(filters)
        params["limit"] = str(limit)
        params["offset"] = str(offset)
        if order:
            params["order"] = order

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()

    # ── INSERT directo (sin RPC) ──────────────────────────────────────────────
    async def insert(self, table: str, data: dict) -> dict:
        """
        Llama a POST /rest/v1/{table} con `data` como body JSON.
        Retorna la fila creada (gracias a Prefer: return=representation).
        """
        url = f"{self._base}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=data, headers=self._headers)
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if isinstance(rows, list) else rows


# ── Singleton ─────────────────────────────────────────────────────────────────
_client: SupabaseClient | None = None


def get_supabase_client() -> SupabaseClient:
    """
    Retorna el cliente singleton. Se instancia la primera vez que se llama.
    FastAPI puede inyectarlo con Depends(get_supabase_client).
    """
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise RuntimeError(
                "SUPABASE_URL y SUPABASE_KEY deben estar definidos en el archivo .env"
            )
        _client = SupabaseClient(settings.supabase_url, settings.supabase_key)
    return _client
