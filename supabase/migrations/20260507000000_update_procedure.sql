-- ============================================================
-- MIGRACIÓN 002: Función de actualización transaccional
-- ============================================================
-- Propósito:
--   Actualizar un registro existente (tabla principal + 8 sub-tablas)
--   en una única transacción atómica.
--   Estrategia: UPDATE tabla principal + DELETE/INSERT en sub-tablas.
--
-- Se llama vía Supabase RPC:
--   POST /rest/v1/rpc/fn_actualizar_registro_completo
--   Body: { "p_id": "uuid...", "payload": { ...campos del formulario... } }
--
-- Retorna: UUID del registro actualizado (confirma éxito).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_actualizar_registro_completo(p_id UUID, payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orden SMALLINT;
  item    JSONB;
  arr     JSONB;
BEGIN

  -- ──────────────────────────────────────────────────────────
  -- 1. UPDATE TABLA PRINCIPAL
  -- Nota: n9_comp1, n28_num_modalidades_inv, n29_num_modalidades_ps
  --       son GENERATED ALWAYS AS STORED → se auto-actualizan.
  -- ──────────────────────────────────────────────────────────
  UPDATE registros SET
    n1_facultad                    = payload->>'n1_facultad',
    n2_nombre_programa             = payload->>'n2_nombre_programa',
    n3_modalidad                   = payload->>'n3_modalidad',
    n4_nivel_formacion             = payload->>'n4_nivel_formacion',
    n5_periodicidad                = payload->>'n5_periodicidad',

    n6_creditos_totales            = (payload->>'n6_creditos_totales')::SMALLINT,
    n7_creditos_especificos        = (payload->>'n7_creditos_especificos')::SMALLINT,
    n8_creditos_electivos          = (payload->>'n8_creditos_electivos')::SMALLINT,
    n10_creditos_prerrequisito     = (payload->>'n10_creditos_prerrequisito')::SMALLINT,
    n11_creditos_correquisito      = (payload->>'n11_creditos_correquisito')::SMALLINT,

    n12_tiene_nucleo_comun         = payload->>'n12_tiene_nucleo_comun',
    n13_creditos_nucleo_facultad   = (payload->>'n13_creditos_nucleo_facultad')::SMALLINT,
    n13_1_observacion              = NULLIF(payload->>'n13_1_observacion', ''),
    n14_programa_en_nucleo         = NULLIF(payload->>'n14_programa_en_nucleo', ''),
    n15_creditos_nucleo_programa   = (payload->>'n15_creditos_nucleo_programa')::SMALLINT,
    n16_razones_no_nucleo          = NULLIF(payload->>'n16_razones_no_nucleo', ''),

    n27_inv_grupo_investigacion    = COALESCE((payload->>'n27_inv_grupo_investigacion')::BOOLEAN, FALSE),
    n27_inv_ponencias_semillero    = COALESCE((payload->>'n27_inv_ponencias_semillero')::BOOLEAN, FALSE),
    n27_inv_trabajo_grado          = COALESCE((payload->>'n27_inv_trabajo_grado')::BOOLEAN, FALSE),
    n27_ps_proyecto_impacto_social = COALESCE((payload->>'n27_ps_proyecto_impacto_social')::BOOLEAN, FALSE),
    n27_ps_sistematizacion         = COALESCE((payload->>'n27_ps_sistematizacion')::BOOLEAN, FALSE),
    n27_ps_educacion_continua      = COALESCE((payload->>'n27_ps_educacion_continua')::BOOLEAN, FALSE),
    n27_ps_cursos_posgrado         = COALESCE((payload->>'n27_ps_cursos_posgrado')::BOOLEAN, FALSE),
    n27_ps_certificaciones         = COALESCE((payload->>'n27_ps_certificaciones')::BOOLEAN, FALSE),
    n27_ps_movilidad_internacional = COALESCE((payload->>'n27_ps_movilidad_internacional')::BOOLEAN, FALSE),

    n32_convenios_doble_titulacion = COALESCE((payload->>'n32_convenios_doble_titulacion')::SMALLINT, 0),
    n33_observacion_general        = NULLIF(payload->>'n33_observacion_general', '')
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro con ID % no encontrado', p_id;
  END IF;


  -- ──────────────────────────────────────────────────────────
  -- 2. LIMPIAR sub-tablas del registro
  -- ──────────────────────────────────────────────────────────
  DELETE FROM hom_mismo_nivel_int      WHERE registro_id = p_id;
  DELETE FROM hom_nivel_sup_int        WHERE registro_id = p_id;
  DELETE FROM hom_mismo_nivel_ext      WHERE registro_id = p_id;
  DELETE FROM hom_nivel_sup_ext        WHERE registro_id = p_id;
  DELETE FROM cursos_trabajo_comunidad WHERE registro_id = p_id;
  DELETE FROM cursos_investigacion     WHERE registro_id = p_id;
  DELETE FROM cursos_virtuales         WHERE registro_id = p_id;
  DELETE FROM cursos_hibridos          WHERE registro_id = p_id;


  -- ──────────────────────────────────────────────────────────
  -- 3. RE-INSERTAR sub-tablas
  -- ──────────────────────────────────────────────────────────

  arr := COALESCE(payload->'hom_mismo_nivel_int', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_mismo_nivel_int (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (p_id, v_orden, item->>'nombre_programa', COALESCE((item->>'creditos_homologables')::SMALLINT, 0));
  END LOOP;

  arr := COALESCE(payload->'hom_nivel_sup_int', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_nivel_sup_int (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (p_id, v_orden, item->>'nombre_programa', COALESCE((item->>'creditos_homologables')::SMALLINT, 0));
  END LOOP;

  arr := COALESCE(payload->'hom_mismo_nivel_ext', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_mismo_nivel_ext (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (p_id, v_orden, item->>'nombre_programa', COALESCE((item->>'creditos_homologables')::SMALLINT, 0));
  END LOOP;

  arr := COALESCE(payload->'hom_nivel_sup_ext', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_nivel_sup_ext (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (p_id, v_orden, item->>'nombre_programa', COALESCE((item->>'creditos_homologables')::SMALLINT, 0));
  END LOOP;

  arr := COALESCE(payload->'cursos_trabajo_comunidad', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_trabajo_comunidad (registro_id, orden, nombre_curso, creditos)
    VALUES (p_id, v_orden, item->>'nombre_curso', COALESCE((item->>'creditos')::SMALLINT, 0));
  END LOOP;

  arr := COALESCE(payload->'cursos_investigacion', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_investigacion (registro_id, orden, nombre_curso, creditos)
    VALUES (p_id, v_orden, item->>'nombre_curso', COALESCE((item->>'creditos')::SMALLINT, 0));
  END LOOP;

  arr := COALESCE(payload->'cursos_virtuales', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_virtuales (registro_id, orden, nombre_curso, creditos, horas_virtuales)
    VALUES (p_id, v_orden, item->>'nombre_curso',
            COALESCE((item->>'creditos')::SMALLINT, 0),
            COALESCE((item->>'horas_virtuales')::SMALLINT, 0));
  END LOOP;

  arr := COALESCE(payload->'cursos_hibridos', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_hibridos (registro_id, orden, nombre_curso, creditos, horas_sincronicas, horas_presenciales)
    VALUES (p_id, v_orden, item->>'nombre_curso',
            COALESCE((item->>'creditos')::SMALLINT, 0),
            COALESCE((item->>'horas_sincronicas')::SMALLINT, 0),
            COALESCE((item->>'horas_presenciales')::SMALLINT, 0));
  END LOOP;


  RETURN p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_actualizar_registro_completo(UUID, JSONB) TO anon, authenticated;
