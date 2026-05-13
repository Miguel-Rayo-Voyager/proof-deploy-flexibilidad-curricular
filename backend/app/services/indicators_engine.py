"""
IndicatorsEngine
================
Lógica de cálculo del Índice de Flexibilidad Curricular I(f).

Cada dimensión es una función pura e independiente que recibe únicamente
los datos que necesita. Esto facilita tests unitarios y la adición de
nuevas dimensiones sin tocar las existentes.

Fuente de verdad: "Mapeo del formulario - FLEXIBILIDAD CURRICULAR.docx"
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal


Modalidad = Literal["Presencial", "Distancia"]


# ─── Estructuras de entrada ────────────────────────────────────────────────────

@dataclass
class SubregistroCreditos:
    nombre: str
    creditos: int


@dataclass
class CursoVirtual:
    nombre: str
    creditos: int
    horas_virtuales: int


@dataclass
class CursoHibrido:
    nombre: str
    creditos: int
    horas_sincronicas: int
    horas_presenciales: int


@dataclass
class FormData:
    # Identificación
    modalidad: Modalidad
    creditos_totales: int

    # Dimensión 1
    creditos_especificos: int = 0
    creditos_electivos: int = 0
    creditos_prerrequisito: int = 0
    creditos_correquisito: int = 0

    # Dimensión 2 – Núcleo común
    creditos_nucleo_programa: int = 0       # n15 (0 si n14='NO')

    # Dimensión 2 – Homologaciones
    hom_mismo_nivel_int: list[SubregistroCreditos] = field(default_factory=list)
    hom_nivel_sup_int: list[SubregistroCreditos] = field(default_factory=list)
    hom_mismo_nivel_ext: list[SubregistroCreditos] = field(default_factory=list)
    hom_nivel_sup_ext: list[SubregistroCreditos] = field(default_factory=list)

    # Dimensión 3
    cursos_trabajo_comunidad: list[SubregistroCreditos] = field(default_factory=list)
    num_modalidades_ps: int = 0             # n29 (calculado de checkboxes n27)

    # Dimensión 4
    cursos_investigacion: list[SubregistroCreditos] = field(default_factory=list)
    num_modalidades_inv: int = 0            # n28 (calculado de checkboxes n27)

    # Dimensión 5 (solo Presencial)
    cursos_virtuales: list[CursoVirtual] = field(default_factory=list)
    cursos_hibridos: list[CursoHibrido] = field(default_factory=list)


# ─── Tipos de salida ───────────────────────────────────────────────────────────

@dataclass
class DimensionResult:
    nombre: str
    peso: float
    indicadores: dict[str, float]
    promedio: float


@dataclass
class IndiceFResult:
    modalidad: Modalidad
    dimensiones: list[DimensionResult]
    indice: float


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _ratio(numerador: float | int, denominador: float | int) -> float:
    """División segura: devuelve 0.0 si el denominador es 0."""
    if denominador == 0:
        return 0.0
    return round(numerador / denominador, 6)


def _sum_creditos(subregistros: list[SubregistroCreditos]) -> int:
    return sum(s.creditos for s in subregistros)


def _avg_creditos(subregistros: list[SubregistroCreditos]) -> float:
    """Promedio de créditos: sum / n. Devuelve 0.0 si la lista está vacía."""
    if not subregistros:
        return 0.0
    return _sum_creditos(subregistros) / len(subregistros)


def _promedio(valores: list[float]) -> float:
    if not valores:
        return 0.0
    return round(sum(valores) / len(valores), 6)


# ─── Cálculo por dimensión ────────────────────────────────────────────────────

def calcular_dimension_1(data: FormData, peso: float) -> DimensionResult:
    """
    CRÉDITOS ACADÉMICOS
    Promedio D1 = ((ind_especificos + ind_electivos) - (ind_prerrequisito + ind_correquisito)) / 4
    """
    ct = data.creditos_totales
    indicadores = {
        "1.1.1_especificos":    _ratio(data.creditos_especificos, ct),
        "1.2.1_electivos":      _ratio(data.creditos_electivos, ct),
        "1.3.1_prerrequisito":  _ratio(data.creditos_prerrequisito, ct),
        "1.4.1_correquisito":   _ratio(data.creditos_correquisito, ct),
    }
    promedio_d1 = round(
        ((indicadores["1.1.1_especificos"] + indicadores["1.2.1_electivos"])
        - (indicadores["1.3.1_prerrequisito"] + indicadores["1.4.1_correquisito"]))/4,
        6,
    )
    return DimensionResult(
        nombre="CRÉDITOS ACADÉMICOS",
        peso=peso,
        indicadores=indicadores,
        promedio=promedio_d1,
    )


def calcular_dimension_2(data: FormData, peso: float) -> DimensionResult:
    """
    TRANSVERSALIDAD
    5 indicadores: núcleo común + 4 rutas de homologación.
    """
    ct = data.creditos_totales
    indicadores = {
        "2.1.1_nucleo_comun":           _ratio(data.creditos_nucleo_programa, ct),
        "2.2.1_hom_mismo_nivel_int":    _ratio(_avg_creditos(data.hom_mismo_nivel_int), ct),
        "2.2.2_hom_nivel_sup_int":      _ratio(_avg_creditos(data.hom_nivel_sup_int), ct),
        "2.3.1_hom_mismo_nivel_ext":    _ratio(_avg_creditos(data.hom_mismo_nivel_ext), ct),
        "2.3.2_hom_nivel_sup_ext":      _ratio(_avg_creditos(data.hom_nivel_sup_ext), ct),
    }
    return DimensionResult(
        nombre="TRANSVERSALIDAD",
        peso=peso,
        indicadores=indicadores,
        promedio=_promedio(list(indicadores.values())),
    )


def calcular_dimension_3(data: FormData, peso: float) -> DimensionResult:
    """
    PROYECCIÓN SOCIAL
    2 indicadores: trabajo en comunidad + modalidades de grado PS.
    Denominador fijo institucional para modalidades: 6.
    """
    ct = data.creditos_totales
    indicadores = {
        "3.1.1_trabajo_comunidad":  _ratio(_sum_creditos(data.cursos_trabajo_comunidad), ct),
        "3.2.1_modalidades_ps":     _ratio(data.num_modalidades_ps, 6),
    }
    return DimensionResult(
        nombre="PROYECCIÓN SOCIAL",
        peso=peso,
        indicadores=indicadores,
        promedio=_promedio(list(indicadores.values())),
    )


def calcular_dimension_4(data: FormData, peso: float) -> DimensionResult:
    """
    INVESTIGACIÓN
    2 indicadores: ruta de investigación + modalidades de grado INV.
    Denominador fijo institucional para modalidades: 3.
    """
    ct = data.creditos_totales
    indicadores = {
        "4.1.1_ruta_investigacion": _ratio(_sum_creditos(data.cursos_investigacion), ct),
        "4.2.1_modalidades_inv":    _ratio(data.num_modalidades_inv, 3),
    }
    return DimensionResult(
        nombre="INVESTIGACIÓN",
        peso=peso,
        indicadores=indicadores,
        promedio=_promedio(list(indicadores.values())),
    )


def calcular_dimension_5(data: FormData, peso: float) -> DimensionResult:
    """
    INCLUSIÓN TECNOLÓGICA  (solo aplica para modalidad Presencial)
    2 indicadores: créditos híbridos + créditos virtuales.
    """
    ct = data.creditos_totales
    creditos_hibridos  = sum(c.creditos for c in data.cursos_hibridos)
    creditos_virtuales = sum(c.creditos for c in data.cursos_virtuales)
    indicadores = {
        "5.1.1_hibridos":  _ratio(creditos_hibridos, ct),
        "5.2.1_virtuales": _ratio(creditos_virtuales, ct),
    }
    return DimensionResult(
        nombre="INCLUSIÓN TECNOLÓGICA",
        peso=peso,
        indicadores=indicadores,
        promedio=_promedio(list(indicadores.values())),
    )


# ─── Ponderaciones por modalidad ──────────────────────────────────────────────

PESOS_PRESENCIAL: dict[str, float] = {
    "dim1": 0.30,
    "dim2": 0.15,
    "dim3": 0.15,
    "dim4": 0.15,
    "dim5": 0.25,
}

PESOS_DISTANCIA: dict[str, float] = {
    "dim1": 0.35,
    "dim2": 0.25,
    "dim3": 0.20,
    "dim4": 0.20,
}


# ─── Punto de entrada principal ───────────────────────────────────────────────

def calcular_indice(data: FormData) -> IndiceFResult:
    """
    Calcula el Índice de Flexibilidad Curricular I(f) completo.

    Retorna las dimensiones calculadas y el índice final ponderado
    según la modalidad del programa.
    """
    if data.modalidad == "Presencial":
        pesos = PESOS_PRESENCIAL
        dim1 = calcular_dimension_1(data, pesos["dim1"])
        dim2 = calcular_dimension_2(data, pesos["dim2"])
        dim3 = calcular_dimension_3(data, pesos["dim3"])
        dim4 = calcular_dimension_4(data, pesos["dim4"])
        dim5 = calcular_dimension_5(data, pesos["dim5"])
        dimensiones = [dim1, dim2, dim3, dim4, dim5]
        indice = round(
            pesos["dim1"] * dim1.promedio +
            pesos["dim2"] * dim2.promedio +
            pesos["dim3"] * dim3.promedio +
            pesos["dim4"] * dim4.promedio +
            pesos["dim5"] * dim5.promedio,
            6,
        )
    else:  # Distancia
        pesos = PESOS_DISTANCIA
        dim1 = calcular_dimension_1(data, pesos["dim1"])
        dim2 = calcular_dimension_2(data, pesos["dim2"])
        dim3 = calcular_dimension_3(data, pesos["dim3"])
        dim4 = calcular_dimension_4(data, pesos["dim4"])
        dimensiones = [dim1, dim2, dim3, dim4]
        indice = round(
            pesos["dim1"] * dim1.promedio +
            pesos["dim2"] * dim2.promedio +
            pesos["dim3"] * dim3.promedio +
            pesos["dim4"] * dim4.promedio,
            6,
        )

    return IndiceFResult(
        modalidad=data.modalidad,
        dimensiones=dimensiones,
        indice=indice,
    )
