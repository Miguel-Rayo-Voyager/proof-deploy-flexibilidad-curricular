"""
Pydantic models para validación de entrada y serialización de salida.
Corresponden 1-a-1 con el esquema SQL y los campos del formulario.
"""

from __future__ import annotations
from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional
import uuid


Facultad   = Literal["FCC", "FCE", "FCHS", "FEBIPE", "FEDU", "FING"]
Modalidad  = Literal["Presencial", "Distancia"]
Nivel      = Literal["Técnico", "Tecnológico", "Profesional", "Especialización", "Maestría"]
Periodo    = Literal["Semestral", "Cuatrimestral"]
SiNo       = Literal["SI", "NO"]


# ─── Sub-modelos ──────────────────────────────────────────────────────────────

class HomologacionItem(BaseModel):
    nombre_programa: str = Field(..., min_length=1)
    creditos_homologables: int = Field(..., ge=0)


class CursoCreditos(BaseModel):
    nombre_curso: str = Field(..., min_length=1)
    creditos: int = Field(..., ge=0)


class CursoVirtual(BaseModel):
    nombre_curso: str = Field(..., min_length=1)
    creditos: int = Field(..., ge=0)
    horas_virtuales: int = Field(..., ge=0)


class CursoHibrido(BaseModel):
    nombre_curso: str = Field(..., min_length=1)
    creditos: int = Field(..., ge=0)
    horas_sincronicas: int = Field(..., ge=0)
    horas_presenciales: int = Field(..., ge=0)


# ─── Formulario principal ─────────────────────────────────────────────────────

class RegistroCreate(BaseModel):
    # Sección 1: Identificación
    n1_facultad:        Facultad
    n2_nombre_programa: str = Field(..., min_length=1)
    n3_modalidad:       Modalidad
    n4_nivel_formacion: Nivel
    n5_periodicidad:    Periodo

    # Sección 2: Créditos académicos (Dimensión 1)
    n6_creditos_totales:     int = Field(..., gt=0)
    n7_creditos_especificos: int = Field(..., ge=0)
    n8_creditos_electivos:   int = Field(..., ge=0)
    n10_creditos_prerrequisito: int = Field(..., ge=0)
    n11_creditos_correquisito:  int = Field(..., ge=0)

    # Sección 3: Núcleo común (Dimensión 2)
    n12_tiene_nucleo_comun:       SiNo
    n13_creditos_nucleo_facultad: Optional[int] = Field(None, ge=0)
    n13_1_observacion:            Optional[str] = None
    n14_programa_en_nucleo:       Optional[SiNo] = None
    n15_creditos_nucleo_programa: Optional[int] = Field(None, ge=0)
    n16_razones_no_nucleo:        Optional[str] = None

    # Sección 4: Homologaciones (Dimensión 2)
    hom_mismo_nivel_int: list[HomologacionItem] = Field(default_factory=list)
    hom_nivel_sup_int:   list[HomologacionItem] = Field(default_factory=list)
    hom_mismo_nivel_ext: list[HomologacionItem] = Field(default_factory=list)
    hom_nivel_sup_ext:   list[HomologacionItem] = Field(default_factory=list)

    # Sección 5: Proyección Social (Dimensión 3)
    cursos_trabajo_comunidad: list[CursoCreditos] = Field(default_factory=list)

    # Sección 6: Investigación (Dimensión 4)
    cursos_investigacion: list[CursoCreditos] = Field(default_factory=list)

    # Sección 7: Modalidades de grado (n27 checkboxes → n28/n29 automáticos)
    n27_inv_grupo_investigacion:    bool = False
    n27_inv_ponencias_semillero:    bool = False
    n27_inv_trabajo_grado:          bool = False
    n27_ps_proyecto_impacto_social: bool = False
    n27_ps_sistematizacion:         bool = False
    n27_ps_educacion_continua:      bool = False
    n27_ps_cursos_posgrado:         bool = False
    n27_ps_certificaciones:         bool = False
    n27_ps_movilidad_internacional: bool = False

    # Sección 8: Inclusión Tecnológica (Dimensión 5 – solo Presencial)
    cursos_virtuales: list[CursoVirtual]  = Field(default_factory=list)
    cursos_hibridos:  list[CursoHibrido]  = Field(default_factory=list)

    # Sección 9
    n32_convenios_doble_titulacion: int = Field(default=0, ge=0)
    n33_observacion_general:        Optional[str] = None

    @model_validator(mode="after")
    def validar_coherencia_creditos(self) -> "RegistroCreate":
        if self.n7_creditos_especificos + self.n8_creditos_electivos > self.n6_creditos_totales:
            raise ValueError(
                "La suma de créditos específicos y electivos no puede superar el total del programa."
            )
        return self

    @property
    def n28_num_modalidades_inv(self) -> int:
        return sum([
            self.n27_inv_grupo_investigacion,
            self.n27_inv_ponencias_semillero,
            self.n27_inv_trabajo_grado,
        ])

    @property
    def n29_num_modalidades_ps(self) -> int:
        return sum([
            self.n27_ps_proyecto_impacto_social,
            self.n27_ps_sistematizacion,
            self.n27_ps_educacion_continua,
            self.n27_ps_cursos_posgrado,
            self.n27_ps_certificaciones,
            self.n27_ps_movilidad_internacional,
        ])


class RegistroResponse(RegistroCreate):
    id: uuid.UUID
