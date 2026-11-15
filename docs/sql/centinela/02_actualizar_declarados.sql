UPDATE participants p
SET guest_companion = true,
    guest_count = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE p.event_id = 'd2da5e1c-affb-4418-8569-e32b16e56deb'::uuid
  AND p.deleted_at IS NULL
  AND p.custom_data::jsonb #> '{q_tt2xyrl,enabled}' = 'true'::jsonb
  AND COALESCE(p.guest_count,0) = 0
  AND COALESCE(p.guest_loads,0) = 0
  AND NOT COALESCE(p.guest_companion,false)
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p.event_id AND e.deleted_at IS NULL
      AND e.public_slug = 'navidadcentinela2026'
      AND e.registration_config::jsonb #>> '{guests,mode}' = 'named'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(e.registration_config::jsonb -> 'customQuestions') q
        WHERE q ->> 'key' = 'q_tt2xyrl' AND COALESCE(q ->> 'active','true') = 'true'
      )
  )
RETURNING p.id, p.guest_companion, p.guest_count, p.guest_loads
