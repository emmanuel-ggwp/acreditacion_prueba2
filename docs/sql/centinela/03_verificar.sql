SELECT count(*) FILTER (WHERE p.custom_data::jsonb #> '{q_tt2xyrl,enabled}' = 'true'::jsonb) AS respuestas_si,
       count(*) FILTER (WHERE p.custom_data::jsonb #> '{q_tt2xyrl,enabled}' = 'true'::jsonb AND p.guest_companion IS TRUE AND p.guest_count = 1 AND COALESCE(p.guest_loads,0) = 0) AS si_sincronizados,
       count(*) FILTER (WHERE p.custom_data::jsonb #> '{q_tt2xyrl,enabled}' = 'true'::jsonb AND NOT (COALESCE(p.guest_companion,false) AND COALESCE(p.guest_count,0) = 1 AND COALESCE(p.guest_loads,0) = 0)) AS si_pendientes_revision,
       count(*) FILTER (WHERE p.custom_data::jsonb #> '{q_tt2xyrl,enabled}' = 'false'::jsonb) AS respuestas_no,
       count(*) FILTER (WHERE p.custom_data::jsonb #> '{q_tt2xyrl,enabled}' = 'true'::jsonb AND EXISTS (SELECT 1 FROM guests g WHERE g.participant_id = p.id AND g.deleted_at IS NULL)) AS si_con_cargas_con_nombre
FROM participants p
WHERE p.event_id = 'd2da5e1c-affb-4418-8569-e32b16e56deb'::uuid
  AND p.deleted_at IS NULL
