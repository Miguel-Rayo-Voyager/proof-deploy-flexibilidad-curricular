-- ============================================================
-- MIGRACIÓN 001: Función de inserción transaccional
-- ============================================================
-- Propósito:
--   Insertar en la tabla principal "registros" + las 8 sub-tablas
--   en una única transacción atómica. Si cualquier sub-insert falla,
--   todo revierte: nunca quedan registros huérfanos.
--
-- Se llama vía Supabase RPC:
--   POST /rest/v1/rpc/fn_insertar_registro_completo
--   Body: { "payload": { ...campos del formulario... } }
--
-- Retorna: UUID del registro creado.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_insertar_registro_completo(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER   -- Ejecuta con privilegios del owner (evita conflictos con RLS)
SET search_path = public
AS $$
DECLARE
  v_id    UUID;
  v_orden SMALLINT;
  item    JSONB;
  arr     JSONB;
BEGIN

  -- ──────────────────────────────────────────────────────────
  -- 1. TABLA PRINCIPAL: registros
  -- ──────────────────────────────────────────────────────────
  INSERT INTO registros (
    n1_facultad,
    n2_nombre_programa,
    n3_modalidad,
    n4_nivel_formacion,
    n5_periodicidad,

    n6_creditos_totales,
    n7_creditos_especificos,
    n8_creditos_electivos,
    n10_creditos_prerrequisito,
    n11_creditos_correquisito,

    n12_tiene_nucleo_comun,
    n13_creditos_nucleo_facultad,
    n13_1_observacion,
    n14_programa_en_nucleo,
    n15_creditos_nucleo_programa,
    n16_razones_no_nucleo,

    n27_inv_grupo_investigacion,
    n27_inv_ponencias_semillero,
    n27_inv_trabajo_grado,
    n27_ps_proyecto_impacto_social,
    n27_ps_sistematizacion,
    n27_ps_educacion_continua,
    n27_ps_cursos_posgrado,
    n27_ps_certificaciones,
    n27_ps_movilidad_internacional,

    n32_convenios_doble_titulacion,
    n33_observacion_general
  ) VALUES (
    payload->>'n1_facultad',
    payload->>'n2_nombre_programa',
    payload->>'n3_modalidad',
    payload->>'n4_nivel_formacion',
    payload->>'n5_periodicidad',

    (payload->>'n6_creditos_totales')::SMALLINT,
    (payload->>'n7_creditos_especificos')::SMALLINT,
    (payload->>'n8_creditos_electivos')::SMALLINT,
    (payload->>'n10_creditos_prerrequisito')::SMALLINT,
    (payload->>'n11_creditos_correquisito')::SMALLINT,

    payload->>'n12_tiene_nucleo_comun',
    -- Campos opcionales: NULL si JSON null o clave ausente
    (payload->>'n13_creditos_nucleo_facultad')::SMALLINT,
    NULLIF(payload->>'n13_1_observacion', ''),
    NULLIF(payload->>'n14_programa_en_nucleo', ''),
    (payload->>'n15_creditos_nucleo_programa')::SMALLINT,
    NULLIF(payload->>'n16_razones_no_nucleo', ''),

    -- Booleanos de n27 (vienen como 'true'/'false' en JSONB ->>)
    COALESCE((payload->>'n27_inv_grupo_investigacion')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_inv_ponencias_semillero')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_inv_trabajo_grado')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_ps_proyecto_impacto_social')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_ps_sistematizacion')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_ps_educacion_continua')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_ps_cursos_posgrado')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_ps_certificaciones')::BOOLEAN, FALSE),
    COALESCE((payload->>'n27_ps_movilidad_internacional')::BOOLEAN, FALSE),

    COALESCE((payload->>'n32_convenios_doble_titulacion')::SMALLINT, 0),
    NULLIF(payload->>'n33_observacion_general', '')
  )
  RETURNING id INTO v_id;


  -- ──────────────────────────────────────────────────────────
  -- 2. SUB-TABLA n17: hom_mismo_nivel_int
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'hom_mismo_nivel_int', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_mismo_nivel_int (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_programa',
      COALESCE((item->>'creditos_homologables')::SMALLINT, 0)
    );
  END LOOP;


  -- ──────────────────────────────────────────────────────────
  -- 3. SUB-TABLA n19: hom_nivel_sup_int
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'hom_nivel_sup_int', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_nivel_sup_int (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_programa',
      COALESCE((item->>'creditos_homologables')::SMALLINT, 0)
    );
  END LOOP;


  -- ──────────────────────────────────────────────────────────
  -- 4. SUB-TABLA n21: hom_mismo_nivel_ext
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'hom_mismo_nivel_ext', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_mismo_nivel_ext (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_programa',
      COALESCE((item->>'creditos_homologables')::SMALLINT, 0)
    );
  END LOOP;


  -- ──────────────────────────────────────────────────────────
  -- 5. SUB-TABLA n23: hom_nivel_sup_ext
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'hom_nivel_sup_ext', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO hom_nivel_sup_ext (registro_id, orden, nombre_programa, creditos_homologables)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_programa',
      COALESCE((item->>'creditos_homologables')::SMALLINT, 0)
    );
  END LOOP;


  -- ──────────────────────────────────────────────────────────
  -- 6. SUB-TABLA n25: cursos_trabajo_comunidad
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'cursos_trabajo_comunidad', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_trabajo_comunidad (registro_id, orden, nombre_curso, creditos)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_curso',
      COALESCE((item->>'creditos')::SMALLINT, 0)
    );
  END LOOP;


  -- ──────────────────────────────────────────────────────────
  -- 7. SUB-TABLA n26: cursos_investigacion
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'cursos_investigacion', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_investigacion (registro_id, orden, nombre_curso, creditos)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_curso',
      COALESCE((item->>'creditos')::SMALLINT, 0)
    );
  END LOOP;


  -- ──────────────────────────────────────────────────────────
  -- 8. SUB-TABLA n30: cursos_virtuales
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'cursos_virtuales', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_virtuales (registro_id, orden, nombre_curso, creditos, horas_virtuales)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_curso',
      COALESCE((item->>'creditos')::SMALLINT, 0),
      COALESCE((item->>'horas_virtuales')::SMALLINT, 0)
    );
  END LOOP;


  -- ──────────────────────────────────────────────────────────
  -- 9. SUB-TABLA n31: cursos_hibridos
  -- ──────────────────────────────────────────────────────────
  arr := COALESCE(payload->'cursos_hibridos', '[]'::JSONB);
  v_orden := 0;
  FOR item IN SELECT value FROM jsonb_array_elements(arr)
  LOOP
    v_orden := v_orden + 1;
    INSERT INTO cursos_hibridos (registro_id, orden, nombre_curso, creditos, horas_sincronicas, horas_presenciales)
    VALUES (
      v_id,
      v_orden,
      item->>'nombre_curso',
      COALESCE((item->>'creditos')::SMALLINT, 0),
      COALESCE((item->>'horas_sincronicas')::SMALLINT, 0),
      COALESCE((item->>'horas_presenciales')::SMALLINT, 0)
    );
  END LOOP;


  RETURN v_id;

EXCEPTION
  WHEN OTHERS THEN
    -- PostgreSQL ya revierte la transacción automáticamente al salir con excepción,
    -- pero re-lanzamos para que el mensaje de error llegue al cliente.
    RAISE;
END;
$$;

-- Permitir que el rol anon (clave pública) ejecute la función
GRANT EXECUTE ON FUNCTION fn_insertar_registro_completo(JSONB) TO anon, authenticated;
