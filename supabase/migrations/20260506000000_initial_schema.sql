-- ============================================================
-- MIGRACIÓN: Sistema de Índice de Flexibilidad Curricular
-- Versión: 1.0.0  |  Fecha: 2026-05-06
-- Fuente: Mapeo del formulario - FLEXIBILIDAD CURRICULAR.docx
--
-- Estructura:
--   · Tabla principal "registros" con los 33 campos del formulario
--   · 8 sub-tablas para campos multi-entrada (n17, n19, n21, n23, n25, n26, n30, n31)
--   · Triggers para mantener contadores y promedios derivados sincronizados
--   · Vista v_indicadores: calcula los 14 indicadores atómicos
--   · Vista v_indice_flexibilidad: calcula el I(f) final según modalidad
-- ============================================================

-- Habilitar extensión UUID (requerida por Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLA PRINCIPAL: registros
-- Un registro = un formulario completo de un programa académico
-- ============================================================
CREATE TABLE IF NOT EXISTS registros (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),

  -- ── SECCIÓN 1: IDENTIFICACIÓN DEL PROGRAMA ──────────────────
  -- n1: Facultad
  n1_facultad VARCHAR(10) NOT NULL
    CHECK (n1_facultad IN ('FCC', 'FCE', 'FCHS', 'FEBIPE', 'FEDU', 'FING')),

  -- n2: Nombre del programa académico
  n2_nombre_programa TEXT NOT NULL,

  -- n3: Modalidad — determina las ponderaciones del Índice de Flexibilidad
  n3_modalidad VARCHAR(20) NOT NULL
    CHECK (n3_modalidad IN ('Presencial', 'Distancia')),

  -- n4: Nivel de formación
  n4_nivel_formacion VARCHAR(30) NOT NULL
    CHECK (n4_nivel_formacion IN ('Técnico', 'Tecnológico', 'Profesional', 'Especialización', 'Maestría')),

  -- n5: Periodicidad
  n5_periodicidad VARCHAR(20) NOT NULL
    CHECK (n5_periodicidad IN ('Semestral', 'Cuatrimestral')),


  -- ── SECCIÓN 2: DIMENSIÓN 1 — CRÉDITOS ACADÉMICOS ────────────
  -- n6: Créditos totales del programa (base denominador de todos los indicadores de crédito)
  n6_creditos_totales SMALLINT NOT NULL
    CHECK (n6_creditos_totales > 0),

  -- n7: Créditos específicos obligatorios  →  Indicador 1.1.1
  n7_creditos_especificos SMALLINT NOT NULL DEFAULT 0
    CHECK (n7_creditos_especificos >= 0),

  -- n8: Créditos electivos  →  Indicador 1.2.1
  n8_creditos_electivos SMALLINT NOT NULL DEFAULT 0
    CHECK (n8_creditos_electivos >= 0),

  -- n9: Complemento (AUTOMÁTICO = n6 − n7 − n8). Debe ser > 0 (validación en app).
  n9_comp1 SMALLINT GENERATED ALWAYS AS
    (n6_creditos_totales - n7_creditos_especificos - n8_creditos_electivos) STORED,

  -- n10: Créditos con requerimiento de prerrequisito  →  Indicador 1.3.1
  n10_creditos_prerrequisito SMALLINT NOT NULL DEFAULT 0
    CHECK (n10_creditos_prerrequisito >= 0),

  -- n11: Créditos con requerimiento de correquisito  →  Indicador 1.4.1
  n11_creditos_correquisito SMALLINT NOT NULL DEFAULT 0
    CHECK (n11_creditos_correquisito >= 0),

  -- Invariante de consistencia: específicos + electivos no pueden superar el total
  CONSTRAINT chk_creditos_coherentes
    CHECK (n7_creditos_especificos + n8_creditos_electivos <= n6_creditos_totales),


  -- ── SECCIÓN 3: DIMENSIÓN 2 — TRANSVERSALIDAD / NÚCLEO COMÚN ─
  -- n12: ¿La Facultad tiene núcleo común aprobado por el Consejo Académico?
  n12_tiene_nucleo_comun CHAR(2) NOT NULL
    CHECK (n12_tiene_nucleo_comun IN ('SI', 'NO')),

  -- n13: Créditos del núcleo común de la Facultad (visible si n12 = 'SI')
  n13_creditos_nucleo_facultad SMALLINT DEFAULT 0
    CHECK (n13_creditos_nucleo_facultad >= 0),

  -- n13.1: Observación del núcleo común
  n13_1_observacion TEXT,

  -- n14: ¿El programa forma parte del núcleo común?
  n14_programa_en_nucleo CHAR(2)
    CHECK (n14_programa_en_nucleo IN ('SI', 'NO')),

  -- n15: Créditos del núcleo común que implementa el programa  →  Indicador 2.1.1
  --      Solo aplica cuando n14 = 'SI'; NULL cuando n14 = 'NO'
  n15_creditos_nucleo_programa SMALLINT
    CHECK (n15_creditos_nucleo_programa >= 0),

  -- n16: Razones por las que el programa NO forma parte del núcleo común
  --      Solo aplica cuando n14 = 'NO'; NULL cuando n14 = 'SI'
  n16_razones_no_nucleo TEXT,


  -- ── SECCIÓN 4: DIMENSIÓN 2 — TRANSVERSALIDAD / HOMOLOGACIONES
  -- Los detalles (nombre de programa + créditos) viven en sub-tablas.
  -- Aquí se almacenan los contadores y los promedios derivados que
  -- los triggers mantienen sincronizados automáticamente.

  -- n17: Cantidad de homologaciones mismo nivel — institución propia
  n17_count_hom_mismo_nivel_int SMALLINT NOT NULL DEFAULT 0
    CHECK (n17_count_hom_mismo_nivel_int >= 0),

  -- n18 (Hom-ig_I): AVG(créditos) de sub-tabla n17  →  numerador Indicador 2.2.1
  --   El indicador usa SUM(créditos)/n6; la vista lo recalcula directamente.
  n18_hom_ig_i NUMERIC(12,6) NOT NULL DEFAULT 0
    CHECK (n18_hom_ig_i >= 0),

  -- n19: Cantidad de homologaciones nivel superior — institución propia
  n19_count_hom_sup_nivel_int SMALLINT NOT NULL DEFAULT 0
    CHECK (n19_count_hom_sup_nivel_int >= 0),

  -- n20 (Hom-Sup_I): AVG(créditos) de sub-tabla n19  →  numerador Indicador 2.2.2
  n20_hom_sup_i NUMERIC(12,6) NOT NULL DEFAULT 0
    CHECK (n20_hom_sup_i >= 0),

  -- n21: Cantidad de homologaciones mismo nivel — institución en convenio
  n21_count_hom_mismo_nivel_ext SMALLINT NOT NULL DEFAULT 0
    CHECK (n21_count_hom_mismo_nivel_ext >= 0),

  -- n22 (Hom-ig_E): AVG(créditos) de sub-tabla n21  →  numerador Indicador 2.3.1
  n22_hom_ig_e NUMERIC(12,6) NOT NULL DEFAULT 0
    CHECK (n22_hom_ig_e >= 0),

  -- n23: Cantidad de homologaciones nivel superior — institución en convenio
  n23_count_hom_sup_nivel_ext SMALLINT NOT NULL DEFAULT 0
    CHECK (n23_count_hom_sup_nivel_ext >= 0),

  -- n24 (Hom-Sup_E): AVG(créditos) de sub-tabla n23  →  numerador Indicador 2.3.2
  n24_hom_sup_e NUMERIC(12,6) NOT NULL DEFAULT 0
    CHECK (n24_hom_sup_e >= 0),


  -- ── SECCIÓN 5: DIMENSIÓN 3 — PROYECCIÓN SOCIAL ──────────────
  -- n25: Cantidad de cursos con trabajo en comunidad (detalles en sub-tabla)
  n25_count_cursos_comunidad SMALLINT NOT NULL DEFAULT 0
    CHECK (n25_count_cursos_comunidad >= 0),


  -- ── SECCIÓN 6: DIMENSIÓN 4 — INVESTIGACIÓN ──────────────────
  -- n26: Cantidad de cursos en ruta de investigación (detalles en sub-tabla)
  n26_count_cursos_investigacion SMALLINT NOT NULL DEFAULT 0
    CHECK (n26_count_cursos_investigacion >= 0),


  -- ── SECCIÓN 7: MODALIDADES DE GRADO (n27 = checkboxes agrupados)
  -- Grupo INVESTIGACIÓN — 3 opciones institucionales (denominador fijo = 3)
  n27_inv_grupo_investigacion     BOOLEAN NOT NULL DEFAULT FALSE,
  n27_inv_ponencias_semillero     BOOLEAN NOT NULL DEFAULT FALSE,
  n27_inv_trabajo_grado           BOOLEAN NOT NULL DEFAULT FALSE,

  -- Grupo PROYECCIÓN SOCIAL — 6 opciones institucionales (denominador fijo = 6)
  n27_ps_proyecto_impacto_social  BOOLEAN NOT NULL DEFAULT FALSE,
  n27_ps_sistematizacion          BOOLEAN NOT NULL DEFAULT FALSE,
  n27_ps_educacion_continua       BOOLEAN NOT NULL DEFAULT FALSE,
  n27_ps_cursos_posgrado          BOOLEAN NOT NULL DEFAULT FALSE,
  n27_ps_certificaciones          BOOLEAN NOT NULL DEFAULT FALSE,
  n27_ps_movilidad_internacional  BOOLEAN NOT NULL DEFAULT FALSE,

  -- n28: Conteo automático de modalidades de INVESTIGACIÓN seleccionadas  →  Indicador 4.2.1
  n28_num_modalidades_inv SMALLINT GENERATED ALWAYS AS (
    (n27_inv_grupo_investigacion::INT
     + n27_inv_ponencias_semillero::INT
     + n27_inv_trabajo_grado::INT)
  ) STORED,

  -- n29: Conteo automático de modalidades de PROYECCIÓN SOCIAL seleccionadas  →  Indicador 3.2.1
  n29_num_modalidades_ps SMALLINT GENERATED ALWAYS AS (
    (n27_ps_proyecto_impacto_social::INT
     + n27_ps_sistematizacion::INT
     + n27_ps_educacion_continua::INT
     + n27_ps_cursos_posgrado::INT
     + n27_ps_certificaciones::INT
     + n27_ps_movilidad_internacional::INT)
  ) STORED,


  -- ── SECCIÓN 8: DIMENSIÓN 5 — INCLUSIÓN TECNOLÓGICA ──────────
  -- n30: Cantidad de cursos en modalidad virtual (detalles en sub-tabla)
  n30_count_cursos_virtuales SMALLINT NOT NULL DEFAULT 0
    CHECK (n30_count_cursos_virtuales >= 0),

  -- n31: Cantidad de cursos en modalidad híbrida (detalles en sub-tabla)
  n31_count_cursos_hibridos SMALLINT NOT NULL DEFAULT 0
    CHECK (n31_count_cursos_hibridos >= 0),


  -- ── SECCIÓN 9: CAMPOS FINALES ────────────────────────────────
  -- n32: Convenios activos para doble titulación
  n32_convenios_doble_titulacion SMALLINT NOT NULL DEFAULT 0
    CHECK (n32_convenios_doble_titulacion >= 0),

  -- n33: Observación general
  n33_observacion_general TEXT
);


-- ============================================================
-- SUB-TABLAS: Subregistros de campos multi-entrada
-- Cada fila = una entrada del usuario para ese campo compuesto.
-- "orden" permite mantener el orden de ingreso para la UI.
-- ============================================================

-- n17: Homologaciones mismo nivel — institución propia
--      Sub-campos: 17.1 nombre_programa  |  17.2 creditos_homologables
CREATE TABLE IF NOT EXISTS hom_mismo_nivel_int (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id          UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden                SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_programa      TEXT     NOT NULL,
  creditos_homologables SMALLINT NOT NULL DEFAULT 0 CHECK (creditos_homologables >= 0),
  UNIQUE (registro_id, orden)
);

-- n19: Homologaciones nivel superior — institución propia
--      Sub-campos: 19.1 nombre_programa  |  19.2 creditos_homologables
CREATE TABLE IF NOT EXISTS hom_nivel_sup_int (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id          UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden                SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_programa      TEXT     NOT NULL,
  creditos_homologables SMALLINT NOT NULL DEFAULT 0 CHECK (creditos_homologables >= 0),
  UNIQUE (registro_id, orden)
);

-- n21: Homologaciones mismo nivel — institución en convenio
--      Sub-campos: 21.1 nombre_programa  |  21.2 creditos_homologables
CREATE TABLE IF NOT EXISTS hom_mismo_nivel_ext (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id          UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden                SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_programa      TEXT     NOT NULL,
  creditos_homologables SMALLINT NOT NULL DEFAULT 0 CHECK (creditos_homologables >= 0),
  UNIQUE (registro_id, orden)
);

-- n23: Homologaciones nivel superior — institución en convenio
--      Sub-campos: 23.1 nombre_programa  |  23.2 creditos_homologables
CREATE TABLE IF NOT EXISTS hom_nivel_sup_ext (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id          UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden                SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_programa      TEXT     NOT NULL,
  creditos_homologables SMALLINT NOT NULL DEFAULT 0 CHECK (creditos_homologables >= 0),
  UNIQUE (registro_id, orden)
);

-- n25: Cursos con trabajo en comunidad
--      Sub-campos: 25.1 nombre_curso  |  25.2 creditos
CREATE TABLE IF NOT EXISTS cursos_trabajo_comunidad (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden       SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_curso TEXT    NOT NULL,
  creditos     SMALLINT NOT NULL DEFAULT 0 CHECK (creditos >= 0),
  UNIQUE (registro_id, orden)
);

-- n26: Cursos en ruta de formación en investigación
--      Sub-campos: 26.1 nombre_curso  |  26.2 creditos
CREATE TABLE IF NOT EXISTS cursos_investigacion (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden       SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_curso TEXT    NOT NULL,
  creditos     SMALLINT NOT NULL DEFAULT 0 CHECK (creditos >= 0),
  UNIQUE (registro_id, orden)
);

-- n30: Cursos en modalidad virtual
--      Sub-campos: 30.1 nombre_curso  |  30.2 creditos  |  30.3 horas_virtuales
CREATE TABLE IF NOT EXISTS cursos_virtuales (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id   UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden         SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_curso  TEXT     NOT NULL,
  creditos      SMALLINT NOT NULL DEFAULT 0 CHECK (creditos >= 0),
  horas_virtuales SMALLINT NOT NULL DEFAULT 0 CHECK (horas_virtuales >= 0),
  UNIQUE (registro_id, orden)
);

-- n31: Cursos en modalidad híbrida
--      Sub-campos: 31.1 nombre_curso  |  31.2 creditos  |  31.3 horas_sincronicas  |  31.4 horas_presenciales
CREATE TABLE IF NOT EXISTS cursos_hibridos (
  id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id       UUID     NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  orden             SMALLINT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  nombre_curso      TEXT     NOT NULL,
  creditos          SMALLINT NOT NULL DEFAULT 0 CHECK (creditos >= 0),
  horas_sincronicas SMALLINT NOT NULL DEFAULT 0 CHECK (horas_sincronicas >= 0),
  horas_presenciales SMALLINT NOT NULL DEFAULT 0 CHECK (horas_presenciales >= 0),
  UNIQUE (registro_id, orden)
);


-- ============================================================
-- FUNCIÓN + TRIGGER: updated_at automático en registros
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registros_updated_at
  BEFORE UPDATE ON registros
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- TRIGGERS: Mantener contadores y promedios derivados en registros
-- cuando se insertan / actualizan / eliminan filas en sub-tablas.
--
-- Patrón: recalcula COUNT y AVG(créditos) para el registro padre
-- y actualiza los campos nXX_count y nXX_promedio correspondientes.
-- ============================================================

-- n17 / n18 ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_hom_mismo_nivel_int()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_rid  UUID;
  v_cnt  SMALLINT;
  v_avg  NUMERIC(12,6);
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT, COALESCE(AVG(creditos_homologables), 0)
    INTO v_cnt, v_avg
    FROM hom_mismo_nivel_int
   WHERE registro_id = v_rid;
  UPDATE registros
     SET n17_count_hom_mismo_nivel_int = v_cnt,
         n18_hom_ig_i                  = v_avg
   WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_hom_mismo_nivel_int
  AFTER INSERT OR UPDATE OR DELETE ON hom_mismo_nivel_int
  FOR EACH ROW EXECUTE FUNCTION fn_sync_hom_mismo_nivel_int();

-- n19 / n20 ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_hom_nivel_sup_int()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_rid UUID; v_cnt SMALLINT; v_avg NUMERIC(12,6);
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT, COALESCE(AVG(creditos_homologables), 0)
    INTO v_cnt, v_avg FROM hom_nivel_sup_int WHERE registro_id = v_rid;
  UPDATE registros SET n19_count_hom_sup_nivel_int = v_cnt, n20_hom_sup_i = v_avg WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_hom_nivel_sup_int
  AFTER INSERT OR UPDATE OR DELETE ON hom_nivel_sup_int
  FOR EACH ROW EXECUTE FUNCTION fn_sync_hom_nivel_sup_int();

-- n21 / n22 ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_hom_mismo_nivel_ext()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_rid UUID; v_cnt SMALLINT; v_avg NUMERIC(12,6);
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT, COALESCE(AVG(creditos_homologables), 0)
    INTO v_cnt, v_avg FROM hom_mismo_nivel_ext WHERE registro_id = v_rid;
  UPDATE registros SET n21_count_hom_mismo_nivel_ext = v_cnt, n22_hom_ig_e = v_avg WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_hom_mismo_nivel_ext
  AFTER INSERT OR UPDATE OR DELETE ON hom_mismo_nivel_ext
  FOR EACH ROW EXECUTE FUNCTION fn_sync_hom_mismo_nivel_ext();

-- n23 / n24 ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_hom_nivel_sup_ext()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_rid UUID; v_cnt SMALLINT; v_avg NUMERIC(12,6);
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT, COALESCE(AVG(creditos_homologables), 0)
    INTO v_cnt, v_avg FROM hom_nivel_sup_ext WHERE registro_id = v_rid;
  UPDATE registros SET n23_count_hom_sup_nivel_ext = v_cnt, n24_hom_sup_e = v_avg WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_hom_nivel_sup_ext
  AFTER INSERT OR UPDATE OR DELETE ON hom_nivel_sup_ext
  FOR EACH ROW EXECUTE FUNCTION fn_sync_hom_nivel_sup_ext();

-- n25 ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_cursos_comunidad()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_rid UUID; v_cnt SMALLINT;
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT INTO v_cnt FROM cursos_trabajo_comunidad WHERE registro_id = v_rid;
  UPDATE registros SET n25_count_cursos_comunidad = v_cnt WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cursos_comunidad
  AFTER INSERT OR UPDATE OR DELETE ON cursos_trabajo_comunidad
  FOR EACH ROW EXECUTE FUNCTION fn_sync_cursos_comunidad();

-- n26 ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_cursos_investigacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_rid UUID; v_cnt SMALLINT;
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT INTO v_cnt FROM cursos_investigacion WHERE registro_id = v_rid;
  UPDATE registros SET n26_count_cursos_investigacion = v_cnt WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cursos_investigacion
  AFTER INSERT OR UPDATE OR DELETE ON cursos_investigacion
  FOR EACH ROW EXECUTE FUNCTION fn_sync_cursos_investigacion();

-- n30 ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_cursos_virtuales()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_rid UUID; v_cnt SMALLINT;
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT INTO v_cnt FROM cursos_virtuales WHERE registro_id = v_rid;
  UPDATE registros SET n30_count_cursos_virtuales = v_cnt WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cursos_virtuales
  AFTER INSERT OR UPDATE OR DELETE ON cursos_virtuales
  FOR EACH ROW EXECUTE FUNCTION fn_sync_cursos_virtuales();

-- n31 ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_cursos_hibridos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_rid UUID; v_cnt SMALLINT;
BEGIN
  v_rid := COALESCE(NEW.registro_id, OLD.registro_id);
  SELECT COUNT(*)::SMALLINT INTO v_cnt FROM cursos_hibridos WHERE registro_id = v_rid;
  UPDATE registros SET n31_count_cursos_hibridos = v_cnt WHERE id = v_rid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cursos_hibridos
  AFTER INSERT OR UPDATE OR DELETE ON cursos_hibridos
  FOR EACH ROW EXECUTE FUNCTION fn_sync_cursos_hibridos();


-- ============================================================
-- VISTA: v_indicadores
-- Calcula los 14 indicadores atómicos para cada registro.
-- Fuente directa: sub-tablas (SUM de créditos) para evitar
-- depender de los promedios almacenados (n18, n20, n22, n24).
--
-- Todos los indicadores son ratios en [0, 1].
-- División por cero manejada con CASE WHEN n6 > 0.
-- ============================================================
CREATE OR REPLACE VIEW v_indicadores AS
WITH
  sum_hom_mi AS (
    SELECT registro_id, COALESCE(SUM(creditos_homologables), 0) AS total
      FROM hom_mismo_nivel_int GROUP BY registro_id
  ),
  sum_hom_si AS (
    SELECT registro_id, COALESCE(SUM(creditos_homologables), 0) AS total
      FROM hom_nivel_sup_int GROUP BY registro_id
  ),
  sum_hom_me AS (
    SELECT registro_id, COALESCE(SUM(creditos_homologables), 0) AS total
      FROM hom_mismo_nivel_ext GROUP BY registro_id
  ),
  sum_hom_se AS (
    SELECT registro_id, COALESCE(SUM(creditos_homologables), 0) AS total
      FROM hom_nivel_sup_ext GROUP BY registro_id
  ),
  sum_com AS (
    SELECT registro_id, COALESCE(SUM(creditos), 0) AS total
      FROM cursos_trabajo_comunidad GROUP BY registro_id
  ),
  sum_inv AS (
    SELECT registro_id, COALESCE(SUM(creditos), 0) AS total
      FROM cursos_investigacion GROUP BY registro_id
  ),
  sum_vir AS (
    SELECT registro_id, COALESCE(SUM(creditos), 0) AS total
      FROM cursos_virtuales GROUP BY registro_id
  ),
  sum_hib AS (
    SELECT registro_id, COALESCE(SUM(creditos), 0) AS total
      FROM cursos_hibridos GROUP BY registro_id
  )
SELECT
  r.id,
  r.n1_facultad,
  r.n2_nombre_programa,
  r.n3_modalidad,
  r.n4_nivel_formacion,
  r.n5_periodicidad,
  r.n6_creditos_totales,

  -- ══ DIMENSIÓN 1: CRÉDITOS ACADÉMICOS ══════════════════════
  -- 1.1.1  Específicos / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(r.n7_creditos_especificos::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_1_1_1,

  -- 1.2.1  Electivos / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(r.n8_creditos_electivos::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_1_2_1,

  -- 1.3.1  Prerrequisito / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(r.n10_creditos_prerrequisito::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_1_3_1,

  -- 1.4.1  Correquisito / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(r.n11_creditos_correquisito::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_1_4_1,

  -- ══ DIMENSIÓN 2: TRANSVERSALIDAD ══════════════════════════
  -- 2.1.1  Créditos núcleo común del programa / Total
  --        Si n14 = 'NO' o es NULL → n15 es NULL → COALESCE devuelve 0
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(r.n15_creditos_nucleo_programa, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_2_1_1,

  -- 2.2.1  Sum créditos hom. mismo nivel interno / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(hmi.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_2_2_1,

  -- 2.2.2  Sum créditos hom. nivel superior interno / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(hsi.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_2_2_2,

  -- 2.3.1  Sum créditos hom. mismo nivel externo (convenio) / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(hme.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_2_3_1,

  -- 2.3.2  Sum créditos hom. nivel superior externo (convenio) / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(hse.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_2_3_2,

  -- ══ DIMENSIÓN 3: PROYECCIÓN SOCIAL ════════════════════════
  -- 3.1.1  Créditos trabajo en comunidad / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(sc.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_3_1_1,

  -- 3.2.1  Modalidades PS del programa / 6 (total institucional fijo)
  ROUND(r.n29_num_modalidades_ps::NUMERIC / 6.0, 6)                 AS ind_3_2_1,

  -- ══ DIMENSIÓN 4: INVESTIGACIÓN ════════════════════════════
  -- 4.1.1  Créditos ruta investigación / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(si.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_4_1_1,

  -- 4.2.1  Modalidades INV del programa / 3 (total institucional fijo)
  ROUND(r.n28_num_modalidades_inv::NUMERIC / 3.0, 6)                AS ind_4_2_1,

  -- ══ DIMENSIÓN 5: INCLUSIÓN TECNOLÓGICA (solo Presencial) ══
  -- 5.1.1  Créditos híbridos / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(sh.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_5_1_1,

  -- 5.2.1  Créditos virtuales / Total
  CASE WHEN r.n6_creditos_totales > 0
    THEN ROUND(COALESCE(sv.total, 0)::NUMERIC / r.n6_creditos_totales, 6)
    ELSE 0::NUMERIC END                                              AS ind_5_2_1

FROM registros r
LEFT JOIN sum_hom_mi hmi ON hmi.registro_id = r.id
LEFT JOIN sum_hom_si hsi ON hsi.registro_id = r.id
LEFT JOIN sum_hom_me hme ON hme.registro_id = r.id
LEFT JOIN sum_hom_se hse ON hse.registro_id = r.id
LEFT JOIN sum_com    sc  ON sc.registro_id  = r.id
LEFT JOIN sum_inv    si  ON si.registro_id  = r.id
LEFT JOIN sum_vir    sv  ON sv.registro_id  = r.id
LEFT JOIN sum_hib    sh  ON sh.registro_id  = r.id;


-- ============================================================
-- VISTA: v_indice_flexibilidad
-- Agrega los indicadores por dimensión (PROMEDIO aritmético)
-- y aplica las ponderaciones según modalidad:
--
--   PRESENCIAL:  D1×0.30 + D2×0.15 + D3×0.15 + D4×0.15 + D5×0.25
--   DISTANCIA:   D1×0.35 + D2×0.25 + D3×0.20 + D4×0.20
--                (sin D5 — sin Inclusión Tecnológica)
-- ============================================================
CREATE OR REPLACE VIEW v_indice_flexibilidad AS
WITH ind AS (
  SELECT * FROM v_indicadores
),
promedios AS (
  SELECT
    id,
    n2_nombre_programa,
    n3_modalidad,

    -- PROMEDIO DIMENSIÓN 1: 4 indicadores (1.1.1 · 1.2.1 · 1.3.1 · 1.4.1)
    ROUND((ind_1_1_1 + ind_1_2_1 + ind_1_3_1 + ind_1_4_1) / 4.0, 6) AS prom_dim1,

    -- PROMEDIO DIMENSIÓN 2: 5 indicadores (2.1.1 · 2.2.1 · 2.2.2 · 2.3.1 · 2.3.2)
    ROUND((ind_2_1_1 + ind_2_2_1 + ind_2_2_2 + ind_2_3_1 + ind_2_3_2) / 5.0, 6) AS prom_dim2,

    -- PROMEDIO DIMENSIÓN 3: 2 indicadores (3.1.1 · 3.2.1)
    ROUND((ind_3_1_1 + ind_3_2_1) / 2.0, 6) AS prom_dim3,

    -- PROMEDIO DIMENSIÓN 4: 2 indicadores (4.1.1 · 4.2.1)
    ROUND((ind_4_1_1 + ind_4_2_1) / 2.0, 6) AS prom_dim4,

    -- PROMEDIO DIMENSIÓN 5: 2 indicadores (5.1.1 · 5.2.1) — solo se usa en Presencial
    ROUND((ind_5_1_1 + ind_5_2_1) / 2.0, 6) AS prom_dim5,

    -- Indicadores individuales expuestos para la tabla de resultados del frontend
    ind_1_1_1, ind_1_2_1, ind_1_3_1, ind_1_4_1,
    ind_2_1_1, ind_2_2_1, ind_2_2_2, ind_2_3_1, ind_2_3_2,
    ind_3_1_1, ind_3_2_1,
    ind_4_1_1, ind_4_2_1,
    ind_5_1_1, ind_5_2_1

  FROM ind
)
SELECT
  id,
  n2_nombre_programa,
  n3_modalidad,

  -- Promedios por dimensión
  prom_dim1,
  prom_dim2,
  prom_dim3,
  prom_dim4,
  CASE WHEN n3_modalidad = 'Presencial' THEN prom_dim5 ELSE NULL END AS prom_dim5,

  -- Indicadores individuales para renderizar la tabla completa
  ind_1_1_1, ind_1_2_1, ind_1_3_1, ind_1_4_1,
  ind_2_1_1, ind_2_2_1, ind_2_2_2, ind_2_3_1, ind_2_3_2,
  ind_3_1_1, ind_3_2_1,
  ind_4_1_1, ind_4_2_1,
  ind_5_1_1, ind_5_2_1,

  -- I(f) — Índice de Flexibilidad Curricular
  CASE
    WHEN n3_modalidad = 'Presencial' THEN
      ROUND(
        0.30 * prom_dim1 +
        0.15 * prom_dim2 +
        0.15 * prom_dim3 +
        0.15 * prom_dim4 +
        0.25 * prom_dim5,
        6
      )
    WHEN n3_modalidad = 'Distancia' THEN
      ROUND(
        0.35 * prom_dim1 +
        0.25 * prom_dim2 +
        0.20 * prom_dim3 +
        0.20 * prom_dim4,
        6
      )
  END AS indice_flexibilidad

FROM promedios;


-- ============================================================
-- ÍNDICES: optimización de consultas frecuentes
-- ============================================================
CREATE INDEX idx_registros_facultad   ON registros(n1_facultad);
CREATE INDEX idx_registros_modalidad  ON registros(n3_modalidad);
CREATE INDEX idx_registros_nivel      ON registros(n4_nivel_formacion);
CREATE INDEX idx_registros_programa   ON registros(n2_nombre_programa);

CREATE INDEX idx_hom_mi_reg  ON hom_mismo_nivel_int(registro_id);
CREATE INDEX idx_hom_si_reg  ON hom_nivel_sup_int(registro_id);
CREATE INDEX idx_hom_me_reg  ON hom_mismo_nivel_ext(registro_id);
CREATE INDEX idx_hom_se_reg  ON hom_nivel_sup_ext(registro_id);
CREATE INDEX idx_ctc_reg     ON cursos_trabajo_comunidad(registro_id);
CREATE INDEX idx_ci_reg      ON cursos_investigacion(registro_id);
CREATE INDEX idx_cv_reg      ON cursos_virtuales(registro_id);
CREATE INDEX idx_ch_reg      ON cursos_hibridos(registro_id);


-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- Habilitado en todas las tablas.
-- Política permisiva inicial ("Allow all") para desarrollo.
-- Reemplazar con políticas basadas en auth.uid() al implementar auth.
-- ============================================================
ALTER TABLE registros               ENABLE ROW LEVEL SECURITY;
ALTER TABLE hom_mismo_nivel_int     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hom_nivel_sup_int       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hom_mismo_nivel_ext     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hom_nivel_sup_ext       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_trabajo_comunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_investigacion    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_virtuales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos_hibridos         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_allow_all" ON registros               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON hom_mismo_nivel_int     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON hom_nivel_sup_int       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON hom_mismo_nivel_ext     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON hom_nivel_sup_ext       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON cursos_trabajo_comunidad FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON cursos_investigacion    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON cursos_virtuales        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON cursos_hibridos         FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
