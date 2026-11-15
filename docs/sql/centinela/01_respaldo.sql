SELECT count(*) AS respuestas_si,
       count(*) FILTER (WHERE COALESCE(p.guest_count,0) = 0 AND COALESCE(p.guest_loads,0) = 0 AND NOT COALESCE(p.guest_companion,false)) AS pendientes_seguros,
       count(*) FILTER (WHERE p.guest_count = 1 AND p.guest_companion IS TRUE AND COALESCE(p.guest_loads,0) = 0) AS ya_sincronizados,
       jsonb_agg(jsonb_build_object('id',p.id,'event_id',p.event_id,'guest_count',p.guest_count,'guest_companion',p.guest_companion,'guest_loads',p.guest_loads,'updated_at',p.updated_at) ORDER BY p.id) AS respaldo_antes_del_cambio
FROM participants p
WHERE p.event_id = 'd2da5e1c-affb-4418-8569-e32b16e56deb'::uuid
  AND p.deleted_at IS NULL
  AND p.custom_data::jsonb #> '{q_tt2xyrl,enabled}' = 'true'::jsonb
