--
-- PostgreSQL database dump
--

\restrict RT6c0pDkk9lfIVxExP5u6n8BDlDmZ8oxn1Q8gZAXiOe7OaieIi9dPKamW6JP74E

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.participants DROP CONSTRAINT IF EXISTS participants_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.participants DROP CONSTRAINT IF EXISTS participants_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.participant_schedules DROP CONSTRAINT IF EXISTS participant_schedules_schedule_id_fkey;
ALTER TABLE IF EXISTS ONLY public.participant_schedules DROP CONSTRAINT IF EXISTS participant_schedules_participant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.participant_awards DROP CONSTRAINT IF EXISTS participant_awards_participant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.participant_awards DROP CONSTRAINT IF EXISTS participant_awards_delivered_by_fkey;
ALTER TABLE IF EXISTS ONLY public.participant_awards DROP CONSTRAINT IF EXISTS participant_awards_award_id_fkey;
ALTER TABLE IF EXISTS ONLY public.participant_awards DROP CONSTRAINT IF EXISTS participant_awards_assigned_by_fkey;
ALTER TABLE IF EXISTS ONLY public.guests DROP CONSTRAINT IF EXISTS guests_participant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.gift_types DROP CONSTRAINT IF EXISTS gift_types_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.gift_employees DROP CONSTRAINT IF EXISTS gift_employees_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.gift_deliveries DROP CONSTRAINT IF EXISTS gift_deliveries_gift_type_id_fkey;
ALTER TABLE IF EXISTS ONLY public.gift_deliveries DROP CONSTRAINT IF EXISTS gift_deliveries_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.event_schedules DROP CONSTRAINT IF EXISTS event_schedules_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accreditations DROP CONSTRAINT IF EXISTS accreditations_participant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accreditations DROP CONSTRAINT IF EXISTS accreditations_guest_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accreditations DROP CONSTRAINT IF EXISTS accreditations_event_schedule_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accreditations DROP CONSTRAINT IF EXISTS accreditations_accredited_by_fkey;
DROP INDEX IF EXISTS public.users_username;
DROP INDEX IF EXISTS public.users_email;
DROP INDEX IF EXISTS public.unique_accreditation_participant_schedule;
DROP INDEX IF EXISTS public.unique_accreditation_guest_schedule;
DROP INDEX IF EXISTS public.participants_email;
DROP INDEX IF EXISTS public.participants_document_number;
DROP INDEX IF EXISTS public.participant_schedules_participant_id_schedule_id;
DROP INDEX IF EXISTS public.gift_deliveries_employee_id_gift_type_id;
DROP INDEX IF EXISTS public.accreditations_event_schedule_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_key;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.participants DROP CONSTRAINT IF EXISTS participants_pkey;
ALTER TABLE IF EXISTS ONLY public.participant_schedules DROP CONSTRAINT IF EXISTS participant_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.participant_schedules DROP CONSTRAINT IF EXISTS participant_schedules_participant_id_schedule_id_key;
ALTER TABLE IF EXISTS ONLY public.participant_awards DROP CONSTRAINT IF EXISTS participant_awards_pkey;
ALTER TABLE IF EXISTS ONLY public.participant_awards DROP CONSTRAINT IF EXISTS participant_awards_participant_id_award_id_key;
ALTER TABLE IF EXISTS ONLY public.guests DROP CONSTRAINT IF EXISTS guests_pkey;
ALTER TABLE IF EXISTS ONLY public.gift_types DROP CONSTRAINT IF EXISTS gift_types_pkey;
ALTER TABLE IF EXISTS ONLY public.gift_employees DROP CONSTRAINT IF EXISTS gift_employees_pkey;
ALTER TABLE IF EXISTS ONLY public.gift_deliveries DROP CONSTRAINT IF EXISTS gift_deliveries_pkey;
ALTER TABLE IF EXISTS ONLY public.gift_campaigns DROP CONSTRAINT IF EXISTS gift_campaigns_pkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_public_slug_key;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY public.event_schedules DROP CONSTRAINT IF EXISTS event_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.accreditations DROP CONSTRAINT IF EXISTS accreditations_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.refresh_tokens;
DROP TABLE IF EXISTS public.participants;
DROP TABLE IF EXISTS public.participant_schedules;
DROP TABLE IF EXISTS public.participant_awards;
DROP TABLE IF EXISTS public.guests;
DROP TABLE IF EXISTS public.gift_types;
DROP TABLE IF EXISTS public.gift_employees;
DROP TABLE IF EXISTS public.gift_deliveries;
DROP TABLE IF EXISTS public.gift_campaigns;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.event_schedules;
DROP TABLE IF EXISTS public.email_templates;
DROP TABLE IF EXISTS public.awards;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.accreditations;
DROP TYPE IF EXISTS public.enum_users_role;
DROP TYPE IF EXISTS public.enum_participants_registration_source;
DROP TYPE IF EXISTS public.enum_gift_types_basis;
DROP TYPE IF EXISTS public.enum_gift_employees_source;
DROP TYPE IF EXISTS public.enum_event_schedules_block_type;
DROP TYPE IF EXISTS public.enum_audit_logs_action;
--
-- Name: enum_audit_logs_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_audit_logs_action AS ENUM (
    'CREATE',
    'UPDATE',
    'SYSTEM-BULK-UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'ACCESS',
    'REVOKE'
);


--
-- Name: enum_event_schedules_block_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_event_schedules_block_type AS ENUM (
    'SINGLE',
    'AM',
    'PM',
    'FULL_DAY',
    'CUSTOM'
);


--
-- Name: enum_gift_employees_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_gift_employees_source AS ENUM (
    'IMPORT',
    'MANUAL'
);


--
-- Name: enum_gift_types_basis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_gift_types_basis AS ENUM (
    'FAMILY',
    'CHILD',
    'CARGA'
);


--
-- Name: enum_participants_registration_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_participants_registration_source AS ENUM (
    'MANUAL',
    'IMPORT',
    'PUBLIC_FORM'
);


--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'ADMIN',
    'ACREDITADOR',
    'GUARDIA',
    'MANAGER',
    'OPERATOR'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accreditations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accreditations (
    id uuid NOT NULL,
    participant_id uuid,
    guest_id uuid,
    event_schedule_id uuid NOT NULL,
    accredited_by uuid NOT NULL,
    accredited_at timestamp with time zone,
    check_in_time timestamp with time zone NOT NULL,
    check_out_time timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    action public.enum_audit_logs_action NOT NULL,
    entity character varying(255) NOT NULL,
    entity_id character varying(255),
    details json,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.awards (
    id uuid NOT NULL,
    event_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    quantity integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    template_id character varying(255) NOT NULL,
    description character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN email_templates.template_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_templates.template_id IS 'Template ID de EmailJS';


--
-- Name: event_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_schedules (
    id uuid NOT NULL,
    event_id uuid NOT NULL,
    schedule_name character varying(255) NOT NULL,
    start_date_time timestamp with time zone NOT NULL,
    end_date_time timestamp with time zone NOT NULL,
    max_capacity integer,
    location character varying(255),
    block_type public.enum_event_schedules_block_type DEFAULT 'SINGLE'::public.enum_event_schedules_block_type NOT NULL,
    label character varying(255),
    image_url character varying(255),
    is_active boolean DEFAULT true,
    status character varying(255) DEFAULT 'published'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN event_schedules.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_schedules.location IS 'Ubicación específica del bloque; si es null, hereda la del evento';


--
-- Name: COLUMN event_schedules.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_schedules.label IS 'Etiqueta visible del bloque (ej. Mañana, Tarde)';


--
-- Name: COLUMN event_schedules.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_schedules.image_url IS 'Imagen opcional para la tarjeta de fecha en la landing';


--
-- Name: COLUMN event_schedules.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_schedules.status IS 'published: Visible/Upcoming, accrediting: Check-in open, accredited: Finished/Closed, cancelled: Cancelled';


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    location character varying(255),
    is_active boolean DEFAULT true,
    max_capacity integer,
    allow_guests boolean DEFAULT true,
    max_guests_per_participant integer DEFAULT 2,
    public_slug character varying(255),
    public_template character varying(255) DEFAULT 'default'::character varying,
    is_public boolean DEFAULT false,
    registration_open boolean DEFAULT true,
    registration_config json,
    logo_url character varying(255),
    background_image_url character varying(255),
    email_template_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    allow_multiple_schedules boolean DEFAULT false
);


--
-- Name: COLUMN events.registration_open; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.registration_open IS 'Si es false, la landing pública muestra "Inscripciones cerradas" y rechaza nuevos registros';


--
-- Name: COLUMN events.email_template_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.email_template_id IS 'Plantilla de correo (EmailTemplate) seleccionada para este evento';


--
-- Name: gift_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_campaigns (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: gift_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_deliveries (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    gift_type_id uuid NOT NULL,
    delivered_qty integer DEFAULT 0,
    delivered_at timestamp with time zone,
    delivered_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: gift_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_employees (
    id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    rut character varying(255),
    empresa character varying(255),
    cargas integer DEFAULT 0,
    cargas_hijos integer DEFAULT 0,
    source public.enum_gift_employees_source DEFAULT 'IMPORT'::public.enum_gift_employees_source NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: gift_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_types (
    id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    basis public.enum_gift_types_basis DEFAULT 'FAMILY'::public.enum_gift_types_basis NOT NULL,
    "order" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guests (
    id uuid NOT NULL,
    participant_id uuid NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255),
    document_number character varying(255),
    email character varying(255),
    phone character varying(255),
    birth_date date,
    age integer,
    guest_type character varying(255),
    relationship character varying(255),
    custom_data jsonb,
    confirmed boolean DEFAULT false,
    schedule_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    dietary_preference character varying(255)
);


--
-- Name: COLUMN guests.guest_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guests.guest_type IS 'Tipo de invitado configurable por evento (ej. CARGA, ACOMPANANTE)';


--
-- Name: COLUMN guests.relationship; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guests.relationship IS 'Parentesco o relación con el participante';


--
-- Name: COLUMN guests.custom_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guests.custom_data IS 'Valores de campos personalizados de invitado definidos por el evento';


--
-- Name: COLUMN guests.confirmed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guests.confirmed IS 'Si el invitado/carga fue confirmado para asistir';


--
-- Name: COLUMN guests.schedule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guests.schedule_id IS 'Horario/fecha al que el invitado fue confirmado';


--
-- Name: participant_awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participant_awards (
    id uuid NOT NULL,
    participant_id uuid NOT NULL,
    award_id uuid NOT NULL,
    assigned_by uuid NOT NULL,
    delivered_at timestamp with time zone,
    delivered_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: participant_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participant_schedules (
    id uuid NOT NULL,
    participant_id uuid NOT NULL,
    schedule_id uuid NOT NULL,
    attended boolean DEFAULT false,
    attended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participants (
    id uuid NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(255),
    document_number character varying(255),
    numero_sap character varying(255),
    company character varying(255),
    "position" character varying(255),
    dietary_preference character varying(255) DEFAULT 'NONE'::character varying NOT NULL,
    dietary_comments character varying(255),
    allowed_guests integer DEFAULT 0,
    registration_source public.enum_participants_registration_source DEFAULT 'MANUAL'::public.enum_participants_registration_source NOT NULL,
    is_new boolean DEFAULT false,
    event_id uuid,
    birth_date date,
    age integer,
    custom_data jsonb,
    is_awarded boolean DEFAULT false,
    award_reason character varying(255),
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    allow_multiple_schedules boolean DEFAULT false
);


--
-- Name: COLUMN participants.dietary_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.participants.dietary_comments IS 'Detalles de alergias o especificaciones adicionales';


--
-- Name: COLUMN participants.custom_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.participants.custom_data IS 'Valores de campos personalizados definidos por el evento';


--
-- Name: COLUMN participants.award_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.participants.award_reason IS 'Motivo de premiación (opcional)';


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token character varying(512) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_revoked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    role public.enum_users_role DEFAULT 'ACREDITADOR'::public.enum_users_role NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Data for Name: accreditations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accreditations (id, participant_id, guest_id, event_schedule_id, accredited_by, accredited_at, check_in_time, check_out_time, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, entity, entity_id, details, created_at) FROM stdin;
57b7e734-9985-468d-a4c4-a2e5220961e7	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:02:42.703-03
5b472b7c-e6ba-493f-9e49-648300a3309b	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:04:13.968-03
01cfd957-48d8-4b50-9330-a02e622a5307	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:05:13.997-03
e86a98d2-2af6-4185-a1f0-aad3f316b1b8	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:07:49.115-03
391767c4-c733-4beb-bc53-5afad8e0e1cc	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:08:39.134-03
764cffaf-6979-48ab-915c-969f0dd26984	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:14:48.615-03
91519201-83ad-4083-bd2e-745d916ebef6	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-28T19:14:53.470Z"}	2026-06-28 16:14:53.489-03
e7234347-3a8c-4f78-bf32-cfa22a926cc6	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:15:35.156-03
c8566786-fe4b-45ff-9635-f84f5017810d	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:27:45.619-03
805348c0-205a-41d5-b5e3-f1f52d5c1ca2	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-28T19:27:45.924Z"}	2026-06-28 16:27:46.093-03
126d5621-9b5d-4821-8e39-8cc9ff46a605	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:33:35.274-03
026f7b08-72c7-494c-98d2-4653637a840f	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:38:01.841-03
0ed29be1-5efb-453f-a96c-51cb7e3a6eec	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:38:34.434-03
f0eac090-b688-4f38-ba2f-9e76b9b5f2df	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:39:23.925-03
7f9a6254-56e5-4637-9bb0-378dbea9a008	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 16:52:47.976-03
04248367-9a6d-4ff9-a767-80f15159bc46	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 17:34:13.638-03
371e09e3-cfc5-4aae-9c85-a0839874fc58	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 18:34:42.711-03
434fc78b-2324-41e2-97dc-c0143d964dbd	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	dbb6145a-1f4c-43b6-a631-7dbe7fadfbb6	{"name":"Borrar Test 1782682482729","reason":"Evento duplicado"}	2026-06-28 18:34:43.708-03
797b6e28-84de-4116-86a5-1decf98c3a15	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	f8c086ee-f572-42ea-9f45-bbe9724b9023	{"name":"Ana Borrar","email":"aborrar@test.cl","reason":"Inscripción errónea"}	2026-06-28 18:34:45.092-03
1347922e-adc5-4bcd-9972-b19ba59af991	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	cec80aa4-907b-488b-a047-f4f50f6e6600	{"name":"Cont 1782682483715","reason":"cleanup"}	2026-06-28 18:34:45.721-03
02be2a36-e862-41c1-bfa5-719fdab2b524	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 18:43:21.411-03
833490ba-8c36-41eb-8df8-3690ecd32cfa	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	7b571fe1-6180-4b26-beed-8b1bf53fffab	{"name":"Audit2 1782683001429"}	2026-06-28 18:43:22.191-03
05e97106-ff6b-4504-9643-fb6dcc27288f	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	7b571fe1-6180-4b26-beed-8b1bf53fffab	{"name":"Audit2 1782683001429","fields":["location"]}	2026-06-28 18:43:22.765-03
f57f3010-525a-43b3-b7a0-479c910cacc8	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	394fdbb9-83a7-4600-b6f1-f5672dee142b	{"name":"Carlos Edita","email":"cedita@test.cl"}	2026-06-28 18:43:23.441-03
b59474fe-6893-4dfe-b515-59dd9aac4dd2	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Participant	394fdbb9-83a7-4600-b6f1-f5672dee142b	{"name":"Carlos Edita","fields":["company"]}	2026-06-28 18:43:24.126-03
a582e5d7-dbc6-428c-a907-d7a0275687b6	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	7b571fe1-6180-4b26-beed-8b1bf53fffab	{"name":"Audit2 1782683001429","reason":"cleanup"}	2026-06-28 18:43:24.414-03
95d2fd0b-db11-4750-87b7-1f660283024e	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 19:20:03.126-03
1cd1a714-ce08-4581-9c83-55686f741708	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	23334f04-eedc-489c-86cb-5e2aa6950a05	{"name":"Diff 1782685203143"}	2026-06-28 19:20:03.697-03
3b85e6b3-035d-4607-b008-da894e1f3f74	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	575a9790-7c2b-4616-9c92-25b55657486c	{"name":"Pablo Diff","email":"pdiff@test.cl"}	2026-06-28 19:20:04.84-03
1f9f40b9-5b2a-4104-afff-0d488a358cf2	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	23334f04-eedc-489c-86cb-5e2aa6950a05	{"name":"Diff 1782685203143","reason":"cleanup"}	2026-06-28 19:20:05.526-03
b3fab6f5-b3d6-4280-b8cc-3b7e12a51d6a	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 19:20:45.039-03
7a13e739-28f9-49a3-b022-bcc4a062d774	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	de66bb10-85bc-4823-9416-2b115a3d06de	{"name":"Dbg 1782685245054"}	2026-06-28 19:20:45.152-03
f92fa994-a44a-4ed0-ad24-408d6bd8c4b8	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	de66bb10-85bc-4823-9416-2b115a3d06de	{"name":"Dbg 1782685245054","reason":"x"}	2026-06-28 19:20:45.417-03
fc9d8238-2c50-4a2a-9f87-cbb03dda7614	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 19:26:46.879-03
a07c294f-b608-489a-bd2f-d6e82ce5d341	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	90af93c0-7435-4c96-998f-f1b3c853dd58	{"name":"Diff 1782685606893"}	2026-06-28 19:26:47.513-03
803c17fc-f9f9-4a70-b022-87dc667ba7cc	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	a8de5d92-00cb-43cb-87ab-44d2aec9637f	{"name":"Pablo Diff","email":"pdiff@test.cl"}	2026-06-28 19:26:49.837-03
dbc7e641-4f70-4c15-a21f-8cb30cd61773	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	90af93c0-7435-4c96-998f-f1b3c853dd58	{"name":"Diff 1782685606893","reason":"cleanup"}	2026-06-28 19:26:51.978-03
4600a33f-e5ae-42cb-bfe5-bccb99f29d95	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 19:31:47.339-03
e80586c8-d38c-44fb-a868-d9ca0e23b175	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	1ad1da41-b58c-4a5b-bc08-b39c41172324	{"name":"Dbg2 1782685907356"}	2026-06-28 19:31:47.39-03
7101f0ec-22d1-41e3-87c6-54786aa0ace8	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	1ad1da41-b58c-4a5b-bc08-b39c41172324	{"name":"Dbg2 1782685907356","reason":"x"}	2026-06-28 19:31:47.54-03
bee6c0fe-7116-4da8-8bfe-892ec7bb816b	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 19:34:04.984-03
6c23500b-c811-42ec-8228-e4b7eb0f6d3c	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	a87bf31f-f3a6-41ee-9510-66671de53ab6	{"name":"Dbg2 1782686045004"}	2026-06-28 19:34:05.462-03
767381a9-a4d5-4163-9268-576dde5edfdc	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	a87bf31f-f3a6-41ee-9510-66671de53ab6	{"name":"Dbg2 1782686045004","reason":"x"}	2026-06-28 19:34:05.955-03
da4d0b58-142e-496b-a238-38f18d82636c	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 19:36:45.379-03
07cf1e7c-fc82-4208-9733-248c0089a845	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	2b55bc6c-8ed2-4fdd-94ea-d098beaab515	{"name":"Diff 1782686205401"}	2026-06-28 19:36:45.813-03
8fd18697-51f1-456a-a017-037772997894	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	2b55bc6c-8ed2-4fdd-94ea-d098beaab515	{"name":"Diff 1782686205401","changes":{"location":{"from":"Lugar A","to":"Lugar B"},"maxCapacity":{"from":10,"to":50}}}	2026-06-28 19:36:46.189-03
2df12d05-87d7-46dd-8774-4b4e5f02442d	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	1681fd71-2a1f-4be6-ba85-57ba8d83ba3f	{"name":"Pablo Diff","email":"pdiff@test.cl"}	2026-06-28 19:36:46.611-03
00a11ff2-8e3c-4090-888f-ddcf3db0decc	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Participant	1681fd71-2a1f-4be6-ba85-57ba8d83ba3f	{"name":"Pablo Diff","changes":{"company":{"from":"Old SA","to":"New SA"},"position":{"from":null,"to":"Gerente"}}}	2026-06-28 19:36:46.995-03
27a59551-54df-42bc-911b-6bd4c967b58f	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	2b55bc6c-8ed2-4fdd-94ea-d098beaab515	{"name":"Diff 1782686205401","reason":"cleanup"}	2026-06-28 19:36:47.082-03
751a89c6-175b-4668-acbc-bc11932ea187	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 19:56:01.25-03
45b89643-9c5d-463b-b4b2-c1c9a7bca536	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	dd68e91c-7264-4756-84bc-0b7ca2af5e63	{"name":"AuditAll 1782687361266"}	2026-06-28 19:56:01.66-03
773ff05b-5d06-43a5-a300-b4430caedca8	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	1db35176-8739-4d7b-a1dc-4a2da1f6bde9	{"name":"Bloque AM"}	2026-06-28 19:56:03.567-03
84952840-7e3a-4147-a12d-505bcbe435d6	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	1db35176-8739-4d7b-a1dc-4a2da1f6bde9	{"name":"Bloque AM","changes":{"location":{"from":"Sala 1","to":"Sala 2"}}}	2026-06-28 19:56:05.619-03
5d304012-9101-4c84-ba05-c7735364866a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Award	dcb10d1b-913b-4b70-8a37-b89d77d3bcc8	{"name":"Medalla Oro"}	2026-06-28 19:56:07.69-03
9170a5e5-d46a-4fa3-b468-276fe443b3fb	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Award	dcb10d1b-913b-4b70-8a37-b89d77d3bcc8	{"name":"Medalla Oro","changes":{"quantity":{"from":5,"to":8}}}	2026-06-28 19:56:09.704-03
ded1120d-29c8-48a5-bb20-a6776af09129	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	1d29a10a-b54a-482e-98c2-3ce568b86f1d	{"name":"Rosa Pinto","email":"rosa@test.cl"}	2026-06-28 19:56:10.015-03
2516ba30-8d8e-4baa-b7f2-520ebfd6baa4	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	7a481686-aecb-4a41-abf9-8bfc0aeccad3	{"name":"Niño Pinto"}	2026-06-28 19:56:12.192-03
d5d5a6df-93c0-433e-a9e0-17d45e36452a	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Guest	7a481686-aecb-4a41-abf9-8bfc0aeccad3	{"name":"Niño Pinto Soto","changes":{"lastName":{"from":"Pinto","to":"Pinto Soto"}}}	2026-06-28 19:56:14.263-03
f59b10b6-f7ff-4f33-b0c2-e7d596a1ef52	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Guest	7a481686-aecb-4a41-abf9-8bfc0aeccad3	{"name":"Niño Pinto Soto","reason":"Carga repetida"}	2026-06-28 19:56:14.337-03
28165e01-c505-4f61-b281-99e358180a50	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Award	dcb10d1b-913b-4b70-8a37-b89d77d3bcc8	{"name":"Medalla Oro","reason":"Premio cancelado"}	2026-06-28 19:56:14.412-03
1212afa9-06b3-4846-b743-02c828efbcde	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	EventSchedule	1db35176-8739-4d7b-a1dc-4a2da1f6bde9	{"name":"Bloque AM","reason":"Horario movido"}	2026-06-28 19:56:14.481-03
6a6fbc67-d1e3-438a-ac60-3ce989f50328	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	dd68e91c-7264-4756-84bc-0b7ca2af5e63	{"name":"AuditAll 1782687361266","reason":"cleanup"}	2026-06-28 19:56:15.934-03
b5b218ec-5475-4e62-a9f9-d9074051c986	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 20:43:04.169-03
ba479b5e-9281-4565-890c-ee971c03d937	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-28T23:43:04.209Z"}	2026-06-28 20:43:04.309-03
b621e654-b74f-4664-a966-304023e7da58	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 20:43:37.448-03
4691ae41-88a9-4403-86a0-9a9388dc7967	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-28 21:23:16.688-03
66822455-bf10-4006-9c25-127ca8ab4133	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T00:23:16.727Z"}	2026-06-28 21:23:16.83-03
04dbd4c8-ecf6-46ed-9be5-a3524ecb9de3	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T15:20:01.819Z"}	2026-06-29 12:20:02.113-03
01591a2e-c82a-48fb-9a97-fc891eda0138	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 12:37:33.198-03
0343bccf-cd0c-43f2-9453-9dc8481e0c7a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	f143f201-e179-4084-bba4-6861f3b31432	{"name":"Acred 1782747453229"}	2026-06-29 12:37:34.048-03
bb600083-e49e-4c0b-8bd3-2b52f32a4df1	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	a9afd53e-7a30-40c3-9f0e-607f1a71b46b	{"name":"Bloque en curso"}	2026-06-29 12:37:36.733-03
48eb28b3-5b20-40f8-bc93-45cfd241b374	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T15:37:37.639Z"}	2026-06-29 12:37:37.656-03
e4127448-ff42-4e6e-9328-37df6726a4eb	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 12:38:36.891-03
d06e9351-0d0c-424d-b1d0-ea1ef17c5319	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	76cd0c93-ca44-4ff8-a5ee-8189ea1b265f	{"name":"Acred 1782747516921"}	2026-06-29 12:38:36.978-03
b8095d7b-8da2-49c1-81e2-6b2e769602d5	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	883866cf-0e49-4f7f-abf5-1d512a895083	{"name":"Bloque en curso"}	2026-06-29 12:38:37.1-03
2e90ed68-486e-4152-a164-8d1776764a41	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	0a1edfdd-9451-47f1-ac34-09f74ccfc47e	{"name":"Bloque mas tarde"}	2026-06-29 12:38:37.154-03
151b1036-707f-4c51-bbd1-6abfa6d1eaf3	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	0a1edfdd-9451-47f1-ac34-09f74ccfc47e	{"name":"Bloque mas tarde","changes":{"status":{"from":"published","to":"accrediting"}}}	2026-06-29 12:38:39.996-03
6ba12690-aa9e-4973-bac0-4576cfb9ff4b	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	883866cf-0e49-4f7f-abf5-1d512a895083	{"name":"Bloque en curso","changes":{"status":{"from":"published","to":"accredited"}}}	2026-06-29 12:38:40.148-03
94c05ea1-8526-467d-8e08-9253dc9e9823	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	76cd0c93-ca44-4ff8-a5ee-8189ea1b265f	{"name":"Acred 1782747516921","reason":"cleanup"}	2026-06-29 12:38:43.965-03
09110589-0d77-445e-8722-284b78aec427	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 12:44:00.522-03
15ed66bf-1465-481a-a424-3362da643a1a	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T15:44:00.582Z"}	2026-06-29 12:44:00.599-03
0e52013a-b016-406e-ac60-adf98ac6e03f	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T15:54:51.554Z"}	2026-06-29 12:54:51.874-03
4b16476b-a036-4e8d-a646-67cfd11f5c6f	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T16:11:43.781Z"}	2026-06-29 13:11:43.922-03
04b34bad-55c4-47ad-8399-9cc80ee5de3e	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T16:23:13.507Z"}	2026-06-29 13:23:13.891-03
fa71dc87-4e92-44a8-9ba2-0cc83f11d8df	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:23:35.221-03
9f04cb3b-a078-430e-a9cc-8880a6131739	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	f143f201-e179-4084-bba4-6861f3b31432	{"name":"Acred 1782747453229","reason":"Limpieza para simulación"}	2026-06-29 13:23:37.989-03
85f11d9b-23d3-434f-8b0d-e1d3afaa59cb	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	f220eb8b-2333-4355-b8aa-e69b48a908cd	{"name":"Demo Responsive Gala","reason":"Limpieza para simulación"}	2026-06-29 13:23:38.106-03
f8d8956d-612e-4151-92a9-9fee00d130a4	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	c7d290da-8abf-49a5-81b6-0de68494346e	{"name":"Gala Anual de Colaboradores 2026"}	2026-06-29 13:23:38.167-03
85f169fe-5f80-48b8-86ee-40a9fe780a0a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	eb8376fa-8bfa-4642-a85a-8443b0081db3	{"name":"Recepción y Gala"}	2026-06-29 13:23:40.774-03
942dd914-1844-4af4-950e-52080eb5a19e	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	eb8376fa-8bfa-4642-a85a-8443b0081db3	{"name":"Recepción y Gala","changes":{"status":{"from":"published","to":"accrediting"}}}	2026-06-29 13:23:44.053-03
ffc139ef-6279-4ef7-baa3-3d16bddcc905	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	682387ce-fad9-442d-bf85-62cf7a54e34c	{"name":"Valentina Rojas","email":"valentina.rojas@empresa.cl"}	2026-06-29 13:23:44.516-03
32e2cabf-a2bb-42eb-9d94-28c5d0acfb50	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	af468b14-7709-4f38-b620-96db81058c09	{"name":"Pedro Rojas"}	2026-06-29 13:23:47.716-03
0915da66-b9cb-4057-ae99-2e57bee5363a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	8900781e-df92-4eec-b3ad-84cae87f5844	{"name":"Matías González","email":"matias.gonzalez@empresa.cl"}	2026-06-29 13:23:47.787-03
3e2cdeea-213e-4f64-bc98-5717d226268c	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	b095b3aa-4b9b-4c6f-a8fe-0174c2b74972	{"name":"Sofía González"}	2026-06-29 13:23:48.042-03
b561ebdd-729d-4a19-95a5-90877d2a4093	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	6db54eb6-2206-4e45-93ac-928db123bd4e	{"name":"Laura Méndez"}	2026-06-29 13:23:48.093-03
55cf18c4-dfe3-4161-ab7a-5b936f35b7d0	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	c654419d-81b8-4398-8eef-73bb5f00f7eb	{"name":"Catalina Muñoz","email":"catalina.munoz@empresa.cl"}	2026-06-29 13:23:48.133-03
50eaaf02-8f0d-4d3b-92c4-7e083f7c650a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	36f1547d-97fd-43df-8566-11967b0132fa	{"name":"Diego Lara"}	2026-06-29 13:23:48.184-03
0abb44d3-c666-4b0b-9fda-46c14dd6ab07	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	7ab85a39-146b-481d-8045-53dcf09863c4	{"name":"Sebastián Díaz","email":"sebastian.diaz@empresa.cl"}	2026-06-29 13:23:48.231-03
d052836f-b8c2-40cc-91ea-e4101f93ad9e	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	cf97da66-054d-4df7-9ae5-0a86059ae454	{"name":"Emilia Díaz"}	2026-06-29 13:23:48.272-03
3d3fd55a-5146-4520-a79a-ef82f8ab97cb	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	45f627a9-4f4e-4925-b9e5-d39243a010e5	{"name":"Antonia Pérez","email":"antonia.perez@empresa.cl"}	2026-06-29 13:23:48.321-03
eab53db8-fb9f-4bd7-ab62-5049ee000127	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	cb762ada-8d83-4d01-9e37-fa2f007d0d73	{"name":"Lucas Pérez"}	2026-06-29 13:23:48.366-03
24ede7ac-abd0-4937-a2c8-f46628f794af	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	ea6b948e-8a4f-4a17-8b10-d9ca4391515c	{"name":"Camila Ruiz"}	2026-06-29 13:23:48.403-03
7ce2bb42-d1ef-44d4-abbe-28d255f4871b	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	d618e2da-c382-4985-ad6f-27211012956d	{"name":"Benjamín Soto","email":"benjamin.soto@empresa.cl"}	2026-06-29 13:23:48.514-03
f52db2d1-2914-409a-b18c-2e4a52f2083b	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	5089ecf6-1d27-4437-9217-3417453e4cba	{"name":"Martina Soto"}	2026-06-29 13:23:48.569-03
411804c5-4aa9-4bae-8e91-a86a231e60eb	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	736afd4e-bd45-43ed-9be3-5e234a45ed39	{"name":"Florencia Castro","email":"florencia.castro@empresa.cl"}	2026-06-29 13:23:48.618-03
62f4b20a-2cb9-412a-92ff-421b0f8ea461	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	561592f1-8b92-4743-9698-ff65b1808660	{"name":"Tomás Vidal"}	2026-06-29 13:23:48.66-03
22800dce-1475-466f-b847-cdb48a1b8a0a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	b1f8aaef-1821-4ec6-99f4-bcb5ce915629	{"name":"Tomás Fuentes","email":"tomas.fuentes@empresa.cl"}	2026-06-29 13:23:48.717-03
b7d29c7b-6a86-4724-a599-8b38750f3ac1	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	1752307d-41ea-4a1d-9e94-da06e14aace4	{"name":"Javiera Morales","email":"javiera.morales@empresa.cl"}	2026-06-29 13:23:48.764-03
67e6727d-e597-469e-92e8-fbbcd628a3c6	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	a6d5ae21-fbc0-4a48-8cec-bf8d32c0924f	{"name":"Vicente Araya","email":"vicente.araya@empresa.cl"}	2026-06-29 13:23:48.819-03
586236b7-7d84-48ea-9e69-46d15dc73f99	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	736324d7-a6b3-4001-ae46-2b4ee0e52cf5	{"name":"Isidora Silva","email":"isidora.silva@empresa.cl"}	2026-06-29 13:23:48.917-03
bc84f3db-b532-4782-ba7d-a1c3fff554c7	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	a6a57692-cf70-4b18-87c2-1a41d6e904cc	{"name":"Joaquín Vega","email":"joaquin.vega@empresa.cl"}	2026-06-29 13:23:48.968-03
7d5cbf13-099d-4534-8c7e-25566f3bdeb7	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:31:06.637-03
9c105925-52c4-4594-b882-a3cf7ed48226	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	38511290-a3ca-43cf-bd75-44ff381ba679	{"name":"Noche de Gala — Aniversario 2026"}	2026-06-29 13:31:06.715-03
d9abffab-b7e4-4df8-9028-c248f7a097f0	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	57153323-36f5-4a8c-b05a-738dfee97902	{"name":"Gala — Viernes"}	2026-06-29 13:31:06.807-03
e9070fdf-cf3c-4917-b171-89834088b2e8	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	839e499d-ca06-45f8-8e9f-3189a4cf31ee	{"name":"Gala — Sábado"}	2026-06-29 13:31:06.86-03
3c3a494f-5dd4-4e2e-a631-3564a0cc2e66	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:33:35.806-03
3b9a84a0-b9cc-4bca-8c8f-8e3fd504515c	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T16:33:35.861Z"}	2026-06-29 13:33:35.872-03
c9d4eeab-122d-49c2-a4c4-6bacaae4234d	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	38511290-a3ca-43cf-bd75-44ff381ba679	{"name":"Noche de Gala — Aniversario 2026","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#C9A227","buttonColor":"#C9A227","overlayOpacity":0.55},"guests":{"allowed":true,"max":1,"typesEnabled":false,"types":[],"fields":[]}},"to":{"mode":"open","theme":{"primaryColor":"#A78BFA","buttonColor":"#7C3AED","overlayOpacity":0.5},"guests":{"allowed":true,"max":1,"typesEnabled":false,"types":[],"fields":[]}}}}}	2026-06-29 13:33:35.988-03
094e8f0e-1505-4819-af40-8fc44bb82ddb	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	5dbd3858-7b7e-4bc3-9fdd-f9512c713167	{"name":"Ignacio Herrera","email":"ignacio.herrera@gala.cl"}	2026-06-29 13:33:36.12-03
99209c8e-0739-4655-a4d0-bcb608d00502	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	77c1ba85-5aee-4647-8221-6a4fc49bc719	{"name":"Paula Herrera"}	2026-06-29 13:33:36.211-03
19d1987b-f4a0-43f6-9d98-2410dc43d76c	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	7af94629-debb-49b0-b44b-eca8df757507	{"name":"Constanza Núñez","email":"constanza.nunez@gala.cl"}	2026-06-29 13:33:36.263-03
489d2eeb-a303-49d8-98a6-703a2765eb16	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	1ae054c7-04e5-4c6f-b30b-0b9412f4b820	{"name":"Marco Lillo"}	2026-06-29 13:33:36.322-03
05d92573-ec89-400f-aff1-86880dd0d524	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	ccaaade1-2ad7-4fd0-a4a7-af275cb9fdf8	{"name":"Felipe Sandoval","email":"felipe.sandoval@gala.cl"}	2026-06-29 13:33:36.389-03
ef2f61a0-ca95-4f65-b951-a45a7b357eaf	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	6780c0c0-9b8e-4f0c-8351-fd05a5bd4d85	{"name":"Daniela Cruz"}	2026-06-29 13:33:36.56-03
a03b1681-cbee-4fc3-8a9f-8e768a185144	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	c162c8da-5a30-4121-b0e6-4e34e297ed05	{"name":"Camila Tapia","email":"camila.tapia@gala.cl"}	2026-06-29 13:33:36.722-03
15622885-1d3f-45d1-a7b3-1ee64d1e5a6d	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	012f5077-d868-4a1a-b96b-ee775e00b2c4	{"name":"Andrés Tapia"}	2026-06-29 13:33:36.785-03
f9aa7792-0245-440d-a0ee-6a741c2bb904	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	3a6c6ec6-a576-4855-9f75-f578c1d396bd	{"name":"Diego Espinoza","email":"diego.espinoza@gala.cl"}	2026-06-29 13:33:36.833-03
f5d7b229-e028-4f9e-b253-9dd47ce3b74b	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	5507b86d-5288-4a64-af32-0359c056d052	{"name":"Bárbara León"}	2026-06-29 13:33:36.882-03
67557ea8-b0b7-485d-859b-0ff1d77bf664	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	d265e000-fafe-48e7-b8d4-858b2a1a0203	{"name":"Fernanda Cortés","email":"fernanda.cortes@gala.cl"}	2026-06-29 13:33:36.954-03
b4e68f62-cf6d-4844-aa50-06ecd036fcb2	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	fecd1121-3172-424d-abf3-15dd24c39e6b	{"name":"Rodrigo Pino"}	2026-06-29 13:33:37.005-03
02f4c831-1a61-4157-a9ab-c7bfa7bd6443	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	17fa6311-7532-4bb4-b942-a532bd0674d0	{"name":"Maximiliano Reyes","email":"maximiliano.reyes@gala.cl"}	2026-06-29 13:33:37.054-03
e3fa3fd1-e3a7-4a68-9b11-83acb649605d	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	d1e342e7-3cc1-489f-9b9a-21313da0ab18	{"name":"Josefa Bravo","email":"josefa.bravo@gala.cl"}	2026-06-29 13:33:37.113-03
c6b6a9db-c975-4c2a-a007-ec4792fc9e09	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	7f459cd3-979a-4e46-a410-120f5b54c482	{"name":"Gabriel Fuentealba","email":"gabriel.fuentealba@gala.cl"}	2026-06-29 13:33:37.173-03
f00eba00-d3fc-4d96-8211-c1aeaf9f95ee	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	f0ef6ef1-d706-46c1-a5bf-f5a3d9d99261	{"name":"Paula Riquelme","email":"paula.riquelme@gala.cl"}	2026-06-29 13:33:37.224-03
ab76c1fc-01ff-4824-91a7-56d445be30ed	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T16:39:51.242Z"}	2026-06-29 13:39:52.031-03
631c03e4-2c48-4767-8e29-d118e9758cc1	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T16:45:43.664Z"}	2026-06-29 13:45:44.019-03
d10a962d-6505-490a-bcf8-cb3f7a4acd3b	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:48:08.548-03
e0d584e0-6329-4e62-8dbe-de9419fc6a92	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Accreditation	00069989-9617-46ae-ae5c-19af761f94f2	{"participantId":"b1f8aaef-1821-4ec6-99f4-bcb5ce915629","eventScheduleId":"eb8376fa-8bfa-4642-a85a-8443b0081db3"}	2026-06-29 13:48:08.9-03
8ba39744-4643-4f62-a478-d182436b25d9	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:50:31.045-03
15528b6f-b8e0-4b5d-87bf-fcd8539d144a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Accreditation	efc3ebca-43f4-485f-adf9-733980bc7f26	{"participantId":"7ab85a39-146b-481d-8045-53dcf09863c4","eventScheduleId":"eb8376fa-8bfa-4642-a85a-8443b0081db3"}	2026-06-29 13:50:31.458-03
e36323da-0886-4735-a35d-776cf78f5533	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T16:51:02.932Z"}	2026-06-29 13:51:02.979-03
30c3847c-b16a-4188-a252-8927d9ee2869	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:51:17.276-03
10dacfb4-c928-42df-b031-adcdc5422eec	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:53:00.751-03
1b4bd284-6203-4e95-84b2-7fb35b09d784	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Accreditation	cbc5bb28-7025-426d-903c-cb43555fd7c2	{"guestId":"36f1547d-97fd-43df-8566-11967b0132fa","eventScheduleId":"eb8376fa-8bfa-4642-a85a-8443b0081db3"}	2026-06-29 13:53:02.82-03
a828a05a-95e0-444d-9b9a-c2be226dbd95	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T16:56:13.546Z"}	2026-06-29 13:56:13.638-03
19861a77-0022-4d0d-baed-5fff6d461bf7	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:57:10.46-03
3d151bfa-ba50-47bc-bfff-2df84e099afb	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Accreditation	1aef1cad-2be8-4dbd-8f37-d43c9f1a68b1	{"participantId":"45f627a9-4f4e-4925-b9e5-d39243a010e5","eventScheduleId":"eb8376fa-8bfa-4642-a85a-8443b0081db3"}	2026-06-29 13:57:31.041-03
dacb3069-cb6a-40e6-ae6f-f73e41be3744	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 13:58:15.525-03
5827dbb1-04aa-4ab3-bb5a-3c11021e6453	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:03:18.683-03
bdc7f067-87ed-4744-a9eb-af5a038c1132	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T17:03:18.830Z"}	2026-06-29 14:03:18.849-03
c88ab0b9-1c5a-48f6-8b31-c207200ccacc	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:03:47.414-03
7327de27-f8aa-4897-93c3-8f4c270ac526	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO "}	2026-06-29 14:03:56.236-03
96023173-8002-4771-8220-c2ec55b98f51	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:04:18.191-03
19661501-360c-4da2-830e-cc1708e9712e	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	509fc687-e5f3-4a24-87e5-a3b35932a0fd	{"name":"Fantasilandia"}	2026-06-29 14:07:09.183-03
1941ff1a-9f5b-45e5-b3f4-41d5f739721e	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicSlug":{"from":"","to":"astro"},"isPublic":{"from":false,"to":true}}}	2026-06-29 14:07:45.484-03
6f919761-a292-4942-b64f-6a4119fa307d	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"default","to":"gala"}}}	2026-06-29 14:08:09.853-03
28014418-b90e-4a6e-8660-32f843077203	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:19:37.791-03
52093f00-a68f-430d-9e99-6f209558c3ab	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T17:19:37.946Z"}	2026-06-29 14:19:37.979-03
84b79ae5-9dd6-41d1-b623-3bc9091c7c87	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:24:08.74-03
77dc6fb3-dbed-49f5-9fb3-b987bfa21d8a	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:30:53.557-03
d20dec6e-5f2a-47ee-b01c-f61f1d7fdcb0	14bef065-25fb-4524-a5af-910a47b34c80	LOGOUT	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:32:10.437-03
33eb5b51-24f3-46a7-88b7-cd1920b13c68	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:32:33.593-03
0b21b381-9445-407b-8d44-c05effeaf841	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T17:32:34.473Z"}	2026-06-29 14:32:34.487-03
e897d626-f4a4-4369-8843-16741a381fb1	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:38:16.185-03
555e0981-0ec7-4f2e-bbba-fb0917ec712c	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T17:38:16.922Z"}	2026-06-29 14:38:16.933-03
45bd55fa-1c03-496b-841e-3b3bc048e1b9	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	eb8376fa-8bfa-4642-a85a-8443b0081db3	{"name":"Recepción y Gala","changes":{"imagen":"actualizada"}}	2026-06-29 14:38:17.816-03
9bb1c2c5-1ee3-4281-8a6d-119e03f75c2a	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	eb8376fa-8bfa-4642-a85a-8443b0081db3	{"name":"Recepción y Gala","changes":{"imagen":"quitada"}}	2026-06-29 14:38:17.909-03
83ae8905-2a53-4b7e-8245-2e9caa1afdf7	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:43:04.592-03
c6336e4a-d840-4a56-ae74-c405b97378f4	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	d5c16345-8fa5-4ee7-8371-e409a5db971b	{"name":"Sesión prueba"}	2026-06-29 14:43:05.243-03
e58d5a75-74b7-4308-a1a7-d4cae78b4eb2	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:44:25.647-03
e26743c7-176f-4720-8a1b-7c87f1e9b571	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:46:17.056-03
bd0eb71a-f8e5-4b0a-a5bc-9fa88bb9ad13	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	6426e908-c99f-4569-aec3-b8629a450f11	{"name":"Bloque paralelo (prueba)"}	2026-06-29 14:46:18.284-03
5f57ccd5-0cf1-40b2-9c0d-5c243e1f7596	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	EventSchedule	6426e908-c99f-4569-aec3-b8629a450f11	{"name":"Bloque paralelo (prueba)","reason":"limpieza prueba"}	2026-06-29 14:46:19.003-03
964b53ee-e605-4f1c-874f-471008fdd1ac	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	af68f775-35aa-40ee-9068-36cdeba6b533	{"name":"Navidad Curuninas"}	2026-06-29 14:47:50.925-03
eabb0e9e-13b3-4fd9-ae79-c6c7c8022114	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Participant	1833b2b2-791e-42bd-ae9b-a5e5b8da5b21	{"name":"Alba Diaz Martinez","changes":{"isAwarded":{"from":false,"to":true}}}	2026-06-29 14:48:25.097-03
23a8ec8f-031e-43ec-90e5-3a97a5b41588	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T17:51:29.494Z"}	2026-06-29 14:51:29.531-03
3b8157a0-dec8-4b76-9667-bfdf251b14db	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 14:59:05.952-03
1b18be92-6c8f-435f-b8ea-3fad18ed1edf	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T17:59:06.358Z"}	2026-06-29 14:59:06.409-03
dd1c5977-82d1-4977-8ebb-c143bdd17320	14bef065-25fb-4524-a5af-910a47b34c80	LOGOUT	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:00:45.172-03
67c0bd53-7339-438d-8ffd-9fbe58c6196e	14bef065-25fb-4524-a5af-910a47b34c80	LOGOUT	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:00:45.18-03
f2e803c4-4619-455b-b83f-bd56fb979678	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:02:11.253-03
eb1d5fb3-e51d-4a46-b9c5-3d395ef48f3a	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T18:14:55.852Z"}	2026-06-29 15:14:55.887-03
2c6eacc4-cbd5-48ea-8ac4-caa1e6876f93	14bef065-25fb-4524-a5af-910a47b34c80	LOGOUT	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:16:23.101-03
9b8fdddc-9fd5-4150-81a6-fa8905d4c2b5	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Accreditation	92bb80a9-8610-49d4-9722-6d4f6f13befe	{"participantId":"f38c8ae9-1eb3-4e74-8858-9efcc6a8df77","eventScheduleId":"af68f775-35aa-40ee-9068-36cdeba6b533"}	2026-06-29 15:16:28.897-03
2ec8dceb-2b88-4d4d-b06b-3f718c5910c7	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:18:39.086-03
d6dedafd-4a3c-4947-b455-64a4f737715a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Accreditation	6982ed67-57e9-4f74-a4ea-5a608779bddc	{"guestId":"65ca51de-4917-44ab-939b-979f68fbe5ef","eventScheduleId":"af68f775-35aa-40ee-9068-36cdeba6b533"}	2026-06-29 15:18:39.388-03
577b2f33-7516-49ac-966e-07627fb61fb5	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:19:27.444-03
684b239f-c1c5-4e96-ae01-9d826ee43d7a	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:29:52.423-03
bdabfe56-c65b-440c-aa86-0be9a11f7e0e	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	LOGIN	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"success":true}	2026-06-29 15:29:53.668-03
f8ffeb59-9267-4dd7-a0a7-c81af0b7e6fc	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T18:29:53.869Z"}	2026-06-29 15:29:53.884-03
b8413468-bae3-459b-a424-bdefe304345c	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:38:43.727-03
a71e231f-143f-481d-88a1-ee1e50fb668a	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 15:43:10.691-03
b64daffc-e079-49a6-ad3f-9e0da4667ac2	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	User	806dd3d5-3a96-48c9-8543-2851490d8d2c	{"name":"qa_test","role":"GUARDIA"}	2026-06-29 15:43:12.947-03
fe7617ca-8ee2-4f65-8ee5-501b5d882b70	806dd3d5-3a96-48c9-8543-2851490d8d2c	LOGIN	User	806dd3d5-3a96-48c9-8543-2851490d8d2c	{"success":true}	2026-06-29 15:43:13.779-03
8ae70565-6d3e-4c43-82c1-2e232affd038	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	User	806dd3d5-3a96-48c9-8543-2851490d8d2c	{"name":"qa_test","changes":{"role":{"from":"GUARDIA","to":"OPERATOR"}}}	2026-06-29 15:43:16.839-03
a1d0ef62-d812-40f8-9734-d6d748d76f79	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	User	806dd3d5-3a96-48c9-8543-2851490d8d2c	{"name":"qa_test","changes":{"isActive":{"from":true,"to":false}}}	2026-06-29 15:43:16.945-03
2bd06531-658a-4c9a-90f7-ae0b804da1fb	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	User	806dd3d5-3a96-48c9-8543-2851490d8d2c	{"name":"qa_test","reason":"limpieza prueba"}	2026-06-29 15:43:16.992-03
bdf627e3-6699-4573-9c5e-d5067f2c20ad	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T18:43:33.737Z"}	2026-06-29 15:43:33.752-03
6b2830eb-8162-4420-bea1-16f683feeb00	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T18:52:02.598Z"}	2026-06-29 15:52:02.631-03
08cda90d-65e1-4cd8-901b-d3aecf8a27c5	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T19:02:10.202Z"}	2026-06-29 16:02:10.256-03
97c7cfeb-e601-4834-801d-b6017921c967	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T19:20:19.619Z"}	2026-06-29 16:20:19.655-03
eb3a2c87-8b6f-4394-9509-bdb439efbbfd	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 16:40:57.257-03
3756c88c-da20-4a2e-9f52-d53d5b18e16c	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T19:40:59.080Z"}	2026-06-29 16:40:59.503-03
5ef4da49-865e-4d48-97fd-2c9b38574ac0	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T19:40:59.190Z"}	2026-06-29 16:40:59.804-03
c62454d2-2bd2-4318-b0f1-da1828cfc073	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T20:19:16.243Z"}	2026-06-29 17:19:16.273-03
1454da89-060d-4184-aeeb-9b78ee76535b	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T20:24:37.024Z"}	2026-06-29 17:24:37.306-03
da1c198c-f2b9-4098-bd97-971116b720f9	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T20:30:44.242Z"}	2026-06-29 17:30:45.494-03
15d6e932-545f-40aa-87f3-4c000ae3e140	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:27:59.177-03
0b402da8-f69f-416d-8d0f-33a798a4bb8b	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T22:28:01.028Z"}	2026-06-29 19:28:01.088-03
f4fa5ae4-9992-42c9-b440-382f1afa77d9	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	c7d290da-8abf-49a5-81b6-0de68494346e	{"name":"Gala Anual de Colaboradores 2026","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#0F766E","buttonColor":"#0F766E"},"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[]}},"to":{"mode":"open","theme":{"primaryColor":"#0F766E","buttonColor":"#0F766E"},"formFields":{"phone":{"enabled":true},"documentNumber":{"enabled":true},"numeroSap":{"enabled":true,"required":true},"dietary":{"enabled":true}},"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-29 19:28:02.806-03
854aa457-c23c-46a5-a5d8-53df72ea72e3	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:28:58.803-03
34ac42e1-360c-4565-832c-1d087093165f	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:31:47.026-03
46ff6c06-4f35-4049-bdc0-49e779436545	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	2d882548-dfa5-404d-9898-574ec3dc7629	{"name":"Campos Prueba","email":"campos.prueba@test.cl","reason":null}	2026-06-29 19:31:55.198-03
c4ac9289-6d3c-4f24-9102-2313af566b14	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:32:39.222-03
b5c8fafb-d2e6-4bd0-9dca-24ecb58c667e	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	c7d290da-8abf-49a5-81b6-0de68494346e	{"name":"Gala Anual de Colaboradores 2026","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#0F766E","buttonColor":"#0F766E"},"formFields":{"phone":{"enabled":true},"documentNumber":{"enabled":true},"numeroSap":{"enabled":true,"required":true},"dietary":{"enabled":true}},"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#0F766E","buttonColor":"#0F766E"},"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":false}}}}}	2026-06-29 19:32:40.187-03
6a242038-1916-41ee-a0c9-12eb6a16e958	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:42:31.383-03
bda3bea9-186e-482a-9538-fd61a782fbe5	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T22:42:31.756Z"}	2026-06-29 19:42:31.779-03
792918a5-b5d9-4aac-9474-972046df0254	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	5ec72f86-695c-48ef-adeb-3217081102ce	{"name":"AdminCampos Prueba","email":"admincampos@test.cl"}	2026-06-29 19:42:33.718-03
c6789e17-27c9-4333-80bd-e09fbfaf1298	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	5ec72f86-695c-48ef-adeb-3217081102ce	{"name":"AdminCampos Prueba","email":"admincampos@test.cl","reason":null}	2026-06-29 19:42:42.082-03
947b5302-0462-452a-87b4-e4e6310dc154	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:42:45.393-03
9438d556-71de-4de7-a5c6-d905157dfdde	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:47:14.727-03
5c09068d-b7a2-4ef9-9a27-ff1452f64a55	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	29e99d7f-5aff-4b79-a9fe-0bc04d4af79a	{"name":"AdminCampos Dos","email":"admincampos2@test.cl"}	2026-06-29 19:47:15.254-03
eb8d96ec-11c0-45f5-87d0-00a441564f86	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	29e99d7f-5aff-4b79-a9fe-0bc04d4af79a	{"name":"AdminCampos Dos","email":"admincampos2@test.cl","reason":null}	2026-06-29 19:47:15.773-03
d2f8bdaa-db56-4d1f-b7fb-790e340c3daf	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:57:01.006-03
37300f88-6cb7-4879-9b39-3d36c0214a1a	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T22:57:04.054Z"}	2026-06-29 19:57:04.085-03
9d202742-f777-458e-a66e-05edc56bd03f	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	ca440d13-a7ee-4a13-b351-176ee9f61d13	{"name":"AdminCampos Tres","email":"admincampos3@test.cl"}	2026-06-29 19:57:05.189-03
79a55759-e5bc-4338-ad29-294c6f5fa639	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	8a364a63-ed3f-4dc3-a4e8-af17959c648d	{"name":"InvAdmin Tres"}	2026-06-29 19:57:09.787-03
5768a79b-6d36-46bc-b732-770b0daeaae4	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	ca440d13-a7ee-4a13-b351-176ee9f61d13	{"name":"AdminCampos Tres","email":"admincampos3@test.cl","reason":null}	2026-06-29 19:57:14.276-03
70914de1-b25c-45ed-a286-54b54a44b3ca	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 19:58:33.044-03
cfe1dce4-2e16-4d36-8d71-2592832bc63e	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 20:04:10.561-03
1fe7f5b4-2eea-4df9-ac2e-baf73d5af5d1	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T23:04:10.613Z"}	2026-06-29 20:04:10.627-03
412dd661-bebc-4bc9-915b-79b29ac3918d	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Participant	b395073c-5bcd-4299-b15a-589745b05d82	{"name":"RepCampos Diet","email":"repcampos@test.cl"}	2026-06-29 20:04:10.72-03
d0944cf3-e3cf-4bbc-8389-493f89baaa4b	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Guest	3d045919-d221-4e9e-8b40-0230174767ae	{"name":"InvRep Diet"}	2026-06-29 20:04:10.848-03
f73f1f84-dd0c-4c1a-9f7a-f4d10bea6ac9	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	b395073c-5bcd-4299-b15a-589745b05d82	{"name":"RepCampos Diet","email":"repcampos@test.cl","reason":null}	2026-06-29 20:04:14.675-03
bae53ef6-e0d4-4db4-a02e-5863dfad80c5	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 20:08:21.91-03
5bbf0686-f92c-4f6e-b85a-20863888de51	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 20:29:20.133-03
49c188ad-fbf7-4d86-a63e-5b025d74004f	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 20:29:23.108-03
8458b0f4-9130-4f82-9070-1d348c32c53d	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T23:29:24.478Z"}	2026-06-29 20:29:24.492-03
4b9673c4-f5c0-4914-b70b-dc999426551b	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 20:42:42.184-03
55a1ea98-a304-4bce-ab82-eb403eb35c5d	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 20:42:43.437-03
5868df3d-9ded-4e1c-8a30-faa77e59e91a	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-29T23:42:43.623Z"}	2026-06-29 20:42:43.636-03
147f0dad-ee66-4086-a06e-f9b491522f89	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 23:16:31.468-03
58465a38-9a46-4aa3-b0fb-b296cc1d6d9d	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 23:16:32.176-03
3eae37d2-8f5d-4bad-927f-e393a8b88dd5	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-30T02:16:32.660Z"}	2026-06-29 23:16:32.672-03
cb564163-5f8b-40f0-95c6-da6fd1d862c3	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 23:32:06.523-03
fb64710f-cfdb-49f9-81e2-3f788e904a07	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-30T02:32:06.994Z"}	2026-06-29 23:32:07.011-03
08b2370a-1c6a-4e77-aa52-063cf948eb3b	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5}},"to":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"dietary":{"enabled":true}},"dietaryOptions":["Vegetariano","Sin TACC","Bajo en sodio"],"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-29 23:32:08.856-03
2efd8e1c-2e24-4171-a22a-283d8d7c2561	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	b058f16f-8673-4d32-a81a-40b152460ecf	{"name":"Dieta Custom","email":"dietacustom@test.cl","reason":null}	2026-06-29 23:32:15.438-03
c2c9deda-2b65-410e-8b3c-2b3d4eedcbff	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 23:32:42.585-03
c13a8b66-0b61-49c6-b7b8-d4c9230e6d79	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-29 23:32:55.69-03
b8f1e776-e64a-421e-b509-76d87d6b83a7	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"dietary":{"enabled":true}},"dietaryOptions":["Vegetariano","Sin TACC","Bajo en sodio"],"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"dietary":{"enabled":false}},"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":false}}}}}	2026-06-29 23:32:55.893-03
78eaf5db-516d-4186-9988-6680684c16ad	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-30T03:22:42.817Z"}	2026-06-30 00:22:42.847-03
23af6115-f454-42d3-a530-0865893a65aa	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"dietary":{"enabled":false}},"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":false}},"to":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":false},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":false,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Kosher","Halal","Otro"],"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":false}}},"emailTemplateId":{"from":null,"to":"e7c3778c-d242-4c83-b8ef-db8211d3571c"}}}	2026-06-30 00:23:38.344-03
1b0de29f-36cc-412b-b88c-0536e40d673c	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 00:58:48.724-03
1ebc7706-0f4a-4e0a-8d89-4706630a320e	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-06-30T03:58:49.226Z"}	2026-06-30 00:58:49.237-03
93db7fdb-a046-44dd-9da1-9cb68d2c87f2	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Participant	ee5c3cec-b7cd-48a0-970f-48254e3d11f2	{"name":"Rut Dedup","email":"rutdedup1@test.cl","reason":null}	2026-06-30 00:58:58.086-03
da3a5599-8c05-4be8-8cce-f3d097d53b9d	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 22:36:41.221-03
abca960d-c257-45ac-92bf-eeb5e7f73270	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T01:36:43.600Z"}	2026-06-30 22:36:43.679-03
fcd77ca3-0b3d-4509-895c-c93af16d5d94	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T01:42:24.525Z"}	2026-06-30 22:42:24.565-03
2be9936c-b175-401b-95d3-d5d5b8316d17	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba"}	2026-06-30 22:43:59.852-03
a8277547-74b6-477f-9349-8a0ad573250f	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	8b94fb91-f80a-4c25-9d2c-27232ce29362	{"name":"Fantasilandia"}	2026-06-30 22:44:41.337-03
f0723ae0-5075-4024-82bd-7e7d63f1a1cd	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"modern"}}}	2026-06-30 22:45:22.549-03
ff4327b5-2cb8-4dde-88dd-bec3a64898cf	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#4f46e5","secondaryColor":"#6366f1","buttonColor":"#4f46e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#48e5cb","secondaryColor":"#f27964","buttonColor":"#d348e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-30 22:46:01.54-03
a7636206-d8ad-43d6-a5a6-7a5205a0aef8	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"default"}}}	2026-06-30 22:46:23.894-03
ccafb545-beb4-427a-8728-0a25431cfa97	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	814a934f-418a-43e0-93c3-012d9d49d704	{"name":"Navidad Curuninas"}	2026-06-30 22:47:04.794-03
8e90fdea-3ba3-46d7-8905-8bd04576adf0	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 22:56:51.95-03
669b0d37-07e5-4a72-8082-460750ed1a11	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T01:56:51.993Z"}	2026-06-30 22:56:52.004-03
cfa09cb6-d7f0-4735-9a72-2939381cb1d6	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"gala","to":"modern"}}}	2026-06-30 22:56:52.746-03
c6960bbd-4f9d-4875-ad1a-5c83589af258	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"modern","to":"default"}}}	2026-06-30 22:56:53.752-03
38c1cb7a-c91a-49b1-bed2-a236826bdca4	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"default","to":"gala"}}}	2026-06-30 22:56:54.003-03
ffaff35b-1e28-46be-9809-3ce945082406	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"default","to":"modern"}}}	2026-06-30 23:02:48.392-03
12795f8b-4911-41f6-bfe6-51f809aa8be3	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"minimal"}}}	2026-06-30 23:03:34.733-03
05aedcd0-7982-4e37-9de5-b74a89a09ac3	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 23:08:58.604-03
660fe22c-bbc0-4325-ba22-acd7f2d8fe9c	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T02:08:59.527Z"}	2026-06-30 23:08:59.536-03
fed604cf-d8bd-4cce-9f77-091f15490807	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":false},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":false,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Kosher","Halal","Otro"],"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":false}},"to":{"mode":"open","theme":{"primaryColor":"#5778ff","secondaryColor":"#7a7dff","buttonColor":"#505758","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#1a0a2e","overlayOpacity":0.6},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":false},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":false,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Kosher","Halal","Otro"],"guests":{"allowed":true,"max":2,"typesEnabled":false,"types":[],"fields":[],"dietary":false}}}}}	2026-06-30 23:09:00.444-03
c8b9581c-404d-41bb-ab7e-4f74ab509f80	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"gala","to":"modern"}}}	2026-06-30 23:09:01.916-03
fb7ae347-21fd-41a9-b24c-74a813389f3b	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"modern","to":"minimal"}}}	2026-06-30 23:09:02.192-03
80decd51-4ab1-406d-8130-be0b652e7e2b	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"minimal","to":"default"}}}	2026-06-30 23:09:03.165-03
b1947a10-b037-4dcc-9a1d-65f9f12f8669	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"default","to":"gala"}}}	2026-06-30 23:09:03.552-03
0b3ce959-dc9b-4931-8112-ca87a6083319	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 23:31:50.399-03
c96863d9-9967-4ad0-99d5-1cefb6fb6f38	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T02:31:51.102Z"}	2026-06-30 23:31:51.125-03
3943adf5-6649-4d62-9441-198e28808b7d	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"maxCapacity":{"from":97,"to":100}}}	2026-06-30 23:31:51.958-03
5b26e273-1453-46da-9926-2de2e7cb737d	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	af68f775-35aa-40ee-9068-36cdeba6b533	{"name":"Navidad Curuninas","changes":{"maxCapacity":{"from":0,"to":1}}}	2026-06-30 23:31:55.528-03
26773164-a1e3-4861-82ae-bad3aa395259	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	af68f775-35aa-40ee-9068-36cdeba6b533	{"name":"Navidad Curuninas","changes":{"maxCapacity":{"from":1,"to":0}}}	2026-06-30 23:32:00.225-03
8ce28b23-c344-4a56-9db1-aaf0f6937acd	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"maxCapacity":{"from":100,"to":97}}}	2026-06-30 23:32:00.295-03
a00189d5-8507-4a23-8b45-e291e3ee5384	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 23:34:27.621-03
c1e3e59d-63f5-4dbf-a779-c4e5e41e76c9	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	aff902d1-631d-4fa1-8202-e76b44209f06	{"name":"TEST Capacidad"}	2026-06-30 23:34:27.822-03
9a73348a-a809-4647-a565-bc141d8d238b	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	aff902d1-631d-4fa1-8202-e76b44209f06	{"name":"TEST Capacidad","changes":{"maxCapacity":{"from":100,"to":1}}}	2026-06-30 23:34:29.828-03
6b8c72f1-1e76-41d4-b589-a4dab25725ef	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	aff902d1-631d-4fa1-8202-e76b44209f06	{"name":"TEST Capacidad","reason":"prueba"}	2026-06-30 23:34:30.492-03
6855b7db-30d5-4664-b81e-e043e00ddf8a	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 23:35:03.813-03
8dc85ab5-bb40-42d6-a979-4b30188ca53b	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	8929c376-851c-46a2-8560-d74d32aa7d89	{"name":"TEST Capacidad"}	2026-06-30 23:35:03.976-03
1453974c-b264-4955-8ad3-3a21ff0b34dd	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	8929c376-851c-46a2-8560-d74d32aa7d89	{"name":"TEST Capacidad","reason":"dbg"}	2026-06-30 23:35:04.443-03
ceaf897d-a0b4-4edd-b39f-8424ef50dbc9	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 23:35:32.168-03
491ddf73-f2ae-4a43-ba27-42adc400b4d1	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	Event	c6659195-064b-4329-addb-5f8a5373b54b	{"name":"TEST Capacidad"}	2026-06-30 23:35:32.398-03
d9384654-f78a-4e5a-a576-566a601e68df	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	EventSchedule	ca0f03b9-9b1d-4ca1-b21b-d1ba0e19579c	{"name":"Fecha Uno"}	2026-06-30 23:35:32.723-03
1533db0e-4b13-46a9-b140-c5286a7c7739	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	c6659195-064b-4329-addb-5f8a5373b54b	{"name":"TEST Capacidad","changes":{"maxCapacity":{"from":100,"to":1}}}	2026-06-30 23:35:33.636-03
7709493a-9a32-48a1-a802-6c188515bdbb	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	EventSchedule	ca0f03b9-9b1d-4ca1-b21b-d1ba0e19579c	{"name":"Fecha Uno","changes":{"maxCapacity":{"from":1,"to":0}}}	2026-06-30 23:35:33.704-03
c3d2eaad-9f17-49f2-8dec-ec121788923a	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	Event	c6659195-064b-4329-addb-5f8a5373b54b	{"name":"TEST Capacidad","reason":"prueba"}	2026-06-30 23:35:34.22-03
9d603835-296b-4a94-9c1c-c95269f24b9c	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 23:43:26.387-03
b1f61ac8-520f-4ae3-9600-a9219fc7ded6	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T02:43:26.520Z"}	2026-06-30 23:43:26.531-03
addb899e-3018-460d-9a32-ce0c747da0fd	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"gala","to":"modern"}}}	2026-06-30 23:43:27.651-03
f45fe6ea-c714-4ac4-a080-24a44f90bebe	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"modern","to":"default"}}}	2026-06-30 23:43:28.388-03
da5a0b22-88a8-4b86-b0f1-6c0161b3e87f	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"default","to":"gala"}}}	2026-06-30 23:43:28.998-03
a387ccc5-844d-4e10-ac83-4eedec1dad73	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-06-30 23:53:18.87-03
dbde844e-ceef-49f6-a600-9b617f5b0200	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T02:53:18.977Z"}	2026-06-30 23:53:18.985-03
7a3e7950-599f-4125-b983-47c21aeb4643	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"gala","to":"modern"}}}	2026-06-30 23:53:19.865-03
b0f7f299-9cb6-427c-adfa-3480ba91bb31	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"modern","to":"default"}}}	2026-06-30 23:53:20.28-03
90604dd6-1f7e-41c1-99d4-75fe9c7e3c68	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	631b8689-a82c-4d52-a2f0-0ff0c02af1ca	{"name":"ASTRO ","changes":{"publicTemplate":{"from":"default","to":"gala"}}}	2026-06-30 23:53:20.652-03
551e9953-2a23-4439-a23e-4b367955893a	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#48e5cb","secondaryColor":"#f27964","buttonColor":"#d348e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#48e5cb","secondaryColor":"#f27964","buttonColor":"#d348e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-30 23:55:19.583-03
2e9e377c-f54b-408b-aa7f-bebff65d6780	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"default"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#48e5cb","secondaryColor":"#f27964","buttonColor":"#d348e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#4f46e5","secondaryColor":"#6366f1","buttonColor":"#4f46e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-30 23:56:02.947-03
c7444d77-81c9-4d34-a98a-55f82ed4d7c8	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"default","to":"gala"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#4f46e5","secondaryColor":"#6366f1","buttonColor":"#4f46e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#008a98","secondaryColor":"#00b4c8","buttonColor":"#008a98","textColor":"#ffffff","inputColor":"#0b1220","borderColor":"#334155","formBackgroundColor":"#0b1220","overlayColor":"#000000","overlayOpacity":0.55},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-30 23:56:46.218-03
e0bb62cc-1cfc-40dc-82ff-762a23b84d68	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"gala","to":"minimal"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#008a98","secondaryColor":"#00b4c8","buttonColor":"#008a98","textColor":"#ffffff","inputColor":"#0b1220","borderColor":"#334155","formBackgroundColor":"#0b1220","overlayColor":"#000000","overlayOpacity":0.55},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#111827","secondaryColor":"#6b7280","buttonColor":"#111827","textColor":"#111827","inputColor":"#ffffff","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#ffffff","overlayOpacity":0.8},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-30 23:57:32.957-03
c54ef2e2-3b64-4f17-afbd-0a0580a216c2	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"modern"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#111827","secondaryColor":"#6b7280","buttonColor":"#111827","textColor":"#111827","inputColor":"#ffffff","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#ffffff","overlayOpacity":0.8},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#3b82f6","secondaryColor":"#8b5cf6","buttonColor":"#6366f1","textColor":"#0f172a","inputColor":"#f1f5f9","borderColor":"#cbd5e1","formBackgroundColor":"#ffffff","overlayColor":"#0f172a","overlayOpacity":0.6},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-30 23:58:37.019-03
dcb18e4a-323d-417d-9b37-926a3bb42980	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"default"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#3b82f6","secondaryColor":"#8b5cf6","buttonColor":"#6366f1","textColor":"#0f172a","inputColor":"#f1f5f9","borderColor":"#cbd5e1","formBackgroundColor":"#ffffff","overlayColor":"#0f172a","overlayOpacity":0.6},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#4f46e5","secondaryColor":"#6366f1","buttonColor":"#4f46e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-06-30 23:59:02.788-03
c78504cf-d32c-40ac-a2f1-eda3b83ac92d	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T02:59:26.195Z"}	2026-06-30 23:59:26.294-03
1d334d49-53be-41e4-b161-e99c86db5a3d	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:00:57.374-03
2105c061-a089-46d8-9859-78517496d0f8	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T03:04:55.738Z"}	2026-07-01 00:04:55.748-03
ce62edfb-da90-4d0a-b0ff-2806b16c9b34	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"default","to":"modern"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#4f46e5","secondaryColor":"#6366f1","buttonColor":"#4f46e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#3b82f6","secondaryColor":"#8b5cf6","buttonColor":"#6366f1","textColor":"#0f172a","inputColor":"#f1f5f9","borderColor":"#cbd5e1","formBackgroundColor":"#ffffff","overlayColor":"#0f172a","overlayOpacity":0.6},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-07-01 00:05:08.816-03
0faf9d8c-3cdd-421b-a123-e7bb1a6f3a12	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"default"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#3b82f6","secondaryColor":"#8b5cf6","buttonColor":"#6366f1","textColor":"#0f172a","inputColor":"#f1f5f9","borderColor":"#cbd5e1","formBackgroundColor":"#ffffff","overlayColor":"#0f172a","overlayOpacity":0.6},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#4f46e5","secondaryColor":"#6366f1","buttonColor":"#4f46e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-07-01 00:05:38.279-03
cd004553-8de8-4767-8c24-8d2e1f94b384	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"default","to":"minimal"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#4f46e5","secondaryColor":"#6366f1","buttonColor":"#4f46e5","textColor":"#111827","inputColor":"#f9fafb","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#000000","overlayOpacity":0.5},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#111827","secondaryColor":"#6b7280","buttonColor":"#111827","textColor":"#111827","inputColor":"#ffffff","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#ffffff","overlayOpacity":0.8},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-07-01 00:06:28.564-03
dde1113f-b88d-40a8-8c85-17553f0f7ea2	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:11:08.302-03
9b11b725-107f-4424-b8e8-2653853e58f4	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T03:11:08.343Z"}	2026-07-01 00:11:08.351-03
41c6c833-b381-44f0-b56e-75b4d9caeef2	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"modern"}}}	2026-07-01 00:11:08.431-03
8b7bb233-2380-4460-ba79-75966ad002ce	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"minimal"}}}	2026-07-01 00:11:08.835-03
8ea0ce84-f289-4805-bfe6-91e2555e8174	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"default"}}}	2026-07-01 00:11:09.086-03
6105a823-d199-4d92-a1c8-311fb05dc0fb	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"default","to":"modern"},"registrationConfig":{"from":{"mode":"open","theme":{"primaryColor":"#111827","secondaryColor":"#6b7280","buttonColor":"#111827","textColor":"#111827","inputColor":"#ffffff","borderColor":"#e5e7eb","formBackgroundColor":"#ffffff","overlayColor":"#ffffff","overlayOpacity":0.8},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}},"to":{"mode":"open","theme":{"primaryColor":"#3b82f6","secondaryColor":"#8b5cf6","buttonColor":"#6366f1","textColor":"#0f172a","inputColor":"#f1f5f9","borderColor":"#cbd5e1","formBackgroundColor":"#ffffff","overlayColor":"#0f172a","overlayOpacity":0.6},"formFields":{"phone":{"enabled":true,"required":false},"documentNumber":{"enabled":true,"required":true},"company":{"enabled":false,"required":false},"position":{"enabled":false,"required":false},"numeroSap":{"enabled":false,"required":false},"dietary":{"enabled":true,"required":false}},"dietaryOptions":["Vegetariano","Vegano","Celíaco (sin gluten)","Otro"],"guests":{"allowed":false,"max":0,"typesEnabled":false,"types":[],"fields":[],"dietary":true}}}}}	2026-07-01 00:15:39.605-03
45b82f90-827e-47be-ab30-91943af2f989	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:18:30.55-03
a6bff57c-fd2c-4126-a0c2-42d9e3407aee	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T03:18:30.588Z"}	2026-07-01 00:18:30.595-03
b2a17c5c-daff-453f-b856-bd499d0d2989	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"minimal"}}}	2026-07-01 00:18:31.592-03
345630de-596a-4b85-923b-5ef6bad257e8	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"default"}}}	2026-07-01 00:18:32.035-03
5e05b3a4-8635-441b-9ef8-47b63af6dfa0	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:25:31.087-03
88ffe30d-c59e-495f-b247-2f9e7a083b3b	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T03:25:31.120Z"}	2026-07-01 00:25:31.126-03
9d1e12c1-6b88-4d9e-8a57-1e8c38616ab8	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"default","to":"modern"}}}	2026-07-01 00:25:31.208-03
aedd1054-598c-4f79-b2ed-ed0f8a43983a	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"minimal"}}}	2026-07-01 00:25:32.976-03
4d2a393a-1143-489d-b6cb-1e14bff64025	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"default"}}}	2026-07-01 00:25:33.231-03
d3f47605-d646-469a-9373-dab195cead56	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:38:03.207-03
810d6c93-d42b-4d3b-80fa-061c2e0b4084	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T03:38:04.100Z"}	2026-07-01 00:38:04.111-03
6f10327a-afed-4914-944e-a184b7af7146	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"default","to":"modern"}}}	2026-07-01 00:38:05.815-03
d9655bde-c583-4735-a71d-548ce1b91169	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"modern","to":"minimal"}}}	2026-07-01 00:38:06.148-03
a1fea68d-df7c-4555-920d-ae974a2e23ec	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	Event	0596acc2-80bd-4daa-8953-1a165e3b28a8	{"name":"Prueba","changes":{"publicTemplate":{"from":"minimal","to":"default"}}}	2026-07-01 00:38:06.434-03
e139eb52-b00b-49c0-bebb-25aad96bf34d	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:40:20.322-03
4bcbbecf-58f4-475f-889f-d7c1dd41b74f	14bef065-25fb-4524-a5af-910a47b34c80	LOGOUT	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:46:00.449-03
fbcad141-98c3-488f-abcc-bfa818b70537	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:46:07.698-03
81314deb-08af-44cf-9101-c69fc5f8b884	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:49:44.303-03
0f0e5cff-ec00-484c-a10d-4771980b405a	14bef065-25fb-4524-a5af-910a47b34c80	CREATE	User	f921a14e-b2ed-41d5-8a68-8c5283d48aaf	{"name":"agdmartinez","role":"ADMIN"}	2026-07-01 00:49:46.799-03
1659b46e-1dfb-4957-9063-95278502ba99	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:51:00.281-03
c9f256af-f8d2-4f09-bfb5-5840df5ad82c	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	User	14bef065-25fb-4524-a5af-910a47b34c80	{"name":"admin","changes":{"email":{"from":"admin@example.com","to":"m.prado@grupolocastillo.com"}}}	2026-07-01 00:51:01.832-03
a8f88ea1-a5a2-43dc-9a86-f047f19993cb	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"name":"guardia","changes":{"email":{"from":"guardia@example.com","to":"tuacreditacioncl@gmail.com"}}}	2026-07-01 00:51:01.893-03
d593c101-30d3-459a-b194-fc5dc7ca27e5	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:51:27.954-03
9de891a9-aa35-442b-bab8-e5dfabc9fd01	f921a14e-b2ed-41d5-8a68-8c5283d48aaf	LOGIN	User	f921a14e-b2ed-41d5-8a68-8c5283d48aaf	{"success":true}	2026-07-01 00:51:28.371-03
e984730e-03a3-42f5-b4af-8302e9515b9d	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	LOGIN	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"success":true}	2026-07-01 00:51:28.89-03
aee8e51d-79fc-47c6-9bb8-873f9d4962b4	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 00:56:19.578-03
0ac10738-c8f5-498c-b10f-e2e1586d458e	14bef065-25fb-4524-a5af-910a47b34c80	UPDATE	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"name":"guardia","changes":{"firstName":{"from":"Guardia","to":"Acreditador"},"lastName":{"from":"User","to":"Eventos"},"password":{"from":"••••","to":"(restablecida)"}}}	2026-07-01 00:56:20.298-03
d47cb848-f902-46b8-a327-f363ae7e9b29	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	LOGIN	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"success":true}	2026-07-01 00:56:20.702-03
b31f5541-60b2-4cf5-bdba-f82aa0ceea93	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	LOGIN	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"success":true}	2026-07-01 00:57:41.337-03
0f0baa94-f282-48dc-9125-d18366342b67	90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	SYSTEM-BULK-UPDATE	EventSchedule	\N	{"scope":"all-events","executedAt":"2026-07-01T03:57:43.674Z"}	2026-07-01 00:57:43.692-03
0cd934c0-ab22-453f-86a5-f8ea49427cc5	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	LOGOUT	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"success":true}	2026-07-01 00:58:43.031-03
adc7c76c-8138-4ffe-aa4a-491f7caca9ed	14bef065-25fb-4524-a5af-910a47b34c80	LOGIN	User	14bef065-25fb-4524-a5af-910a47b34c80	{"success":true}	2026-07-01 01:02:16.039-03
c5dd7de9-250b-42d2-acc5-d718ab117305	14bef065-25fb-4524-a5af-910a47b34c80	DELETE	User	d20dedde-346d-4e1f-91fc-bd6a8d86c8e3	{"name":"acreditador","reason":"Simplificar roles a Admin y Acreditador Eventos"}	2026-07-01 01:02:16.478-03
37b48bf3-55c5-41dc-ab87-cbb3b8ae14a3	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	LOGIN	User	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	{"success":true}	2026-07-01 01:02:16.883-03
\.


--
-- Data for Name: awards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.awards (id, event_id, name, description, quantity, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, name, template_id, description, is_active, created_at, updated_at, deleted_at) FROM stdin;
e7c3778c-d242-4c83-b8ef-db8211d3571c	Correo Generico	template_iq0rbep		t	2026-06-30 00:22:59.89823-03	2026-06-30 00:22:59.89823-03	\N
\.


--
-- Data for Name: event_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_schedules (id, event_id, schedule_name, start_date_time, end_date_time, max_capacity, location, block_type, label, image_url, is_active, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, name, description, location, is_active, max_capacity, allow_guests, max_guests_per_participant, public_slug, public_template, is_public, registration_open, registration_config, logo_url, background_image_url, email_template_id, created_by, created_at, updated_at, deleted_at, allow_multiple_schedules) FROM stdin;
\.


--
-- Data for Name: gift_campaigns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gift_campaigns (id, name, is_active, created_at, updated_at, deleted_at) FROM stdin;
9e19946a-f279-463f-a521-c1053532487d	Navidad 2025	t	2026-06-28 16:52:48.181-03	2026-06-28 16:52:53.95-03	2026-06-28 16:52:53.949-03
\.


--
-- Data for Name: gift_deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gift_deliveries (id, employee_id, gift_type_id, delivered_qty, delivered_at, delivered_by, created_at, updated_at) FROM stdin;
e924157e-c8e5-4a67-b98d-00e17304c398	1e721540-e8a4-46a1-a5d1-6c452699c679	c8f05c89-e3fc-4b90-a774-6cac59e53f96	1	2026-06-28 16:52:53.8-03	14bef065-25fb-4524-a5af-910a47b34c80	2026-06-28 16:52:53.765-03	2026-06-28 16:52:53.8-03
62318e42-3b76-41b7-8df6-d1cf8060055e	1e721540-e8a4-46a1-a5d1-6c452699c679	72c65701-6650-4d53-8e54-be0beda1ff3f	1	2026-06-28 16:52:53.827-03	14bef065-25fb-4524-a5af-910a47b34c80	2026-06-28 16:52:53.824-03	2026-06-28 16:52:53.827-03
\.


--
-- Data for Name: gift_employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gift_employees (id, campaign_id, full_name, rut, empresa, cargas, cargas_hijos, source, created_at, updated_at, deleted_at) FROM stdin;
1e721540-e8a4-46a1-a5d1-6c452699c679	9e19946a-f279-463f-a521-c1053532487d	Juan Perez	11.111.111-1	ACME	3	2	IMPORT	2026-06-28 16:52:51.753-03	2026-06-28 16:52:51.753-03	\N
36b3c865-c3bc-41f5-9098-eda46793f1c1	9e19946a-f279-463f-a521-c1053532487d	Ana Soto	22.222.222-2	ACME	1	1	IMPORT	2026-06-28 16:52:51.773-03	2026-06-28 16:52:51.773-03	\N
105551db-a16d-45bf-b3b7-b15dfe2ff12e	9e19946a-f279-463f-a521-c1053532487d	Pedro Manual	\N	BETA	2	1	MANUAL	2026-06-28 16:52:53.479-03	2026-06-28 16:52:53.479-03	\N
\.


--
-- Data for Name: gift_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gift_types (id, campaign_id, name, basis, "order", is_active, created_at, updated_at) FROM stdin;
c8f05c89-e3fc-4b90-a774-6cac59e53f96	9e19946a-f279-463f-a521-c1053532487d	Caja familiar	FAMILY	0	t	2026-06-28 16:52:48.188-03	2026-06-28 16:52:48.188-03
72c65701-6650-4d53-8e54-be0beda1ff3f	9e19946a-f279-463f-a521-c1053532487d	Regalo hijo	CHILD	1	t	2026-06-28 16:52:48.188-03	2026-06-28 16:52:48.188-03
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guests (id, participant_id, first_name, last_name, document_number, email, phone, birth_date, age, guest_type, relationship, custom_data, confirmed, schedule_id, created_at, updated_at, deleted_at, dietary_preference) FROM stdin;
\.


--
-- Data for Name: participant_awards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.participant_awards (id, participant_id, award_id, assigned_by, delivered_at, delivered_by, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: participant_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.participant_schedules (id, participant_id, schedule_id, attended, attended_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.participants (id, first_name, last_name, email, phone, document_number, numero_sap, company, "position", dietary_preference, dietary_comments, allowed_guests, registration_source, is_new, event_id, birth_date, age, custom_data, is_awarded, award_reason, created_by, created_at, updated_at, deleted_at, allow_multiple_schedules) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token, expires_at, is_revoked, created_at, updated_at) FROM stdin;
6bae2ace-0d1f-49d7-9818-8dd0f7b7dea2	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjczMzYyfQ.iwtWj9Au4Ia3_By-XfJcETeIYmkNCCxV_DYyB-_96UQ	2026-07-28 16:02:42.697-03	f	2026-06-28 16:02:42.700038-03	2026-06-28 16:02:42.697-03
8988d850-19d6-4109-b0d7-31592143fea0	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjczNDUzfQ.W5OI5pC6Kx0pZ7DpITyvrbrv7Z_Oupi0nbol3CFgdOc	2026-07-28 16:04:13.966-03	f	2026-06-28 16:04:13.967405-03	2026-06-28 16:04:13.966-03
2a8ba863-b56a-47e0-be8d-597c59b6783c	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjczNTEzfQ.BIcBsXv2yv51deyHigcngYR4Ughdqo9NOZ_eyUuYRF0	2026-07-28 16:05:13.994-03	f	2026-06-28 16:05:13.996126-03	2026-06-28 16:05:13.994-03
2336e695-80d1-406a-92ef-94819de3d240	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjczNjY5fQ.XaS1E5-s-FpRLSL8Bb9I7DnFXc-_Rz2C1Gi3PazcR-M	2026-07-28 16:07:49.108-03	f	2026-06-28 16:07:49.11265-03	2026-06-28 16:07:49.109-03
22fa3da2-cee0-4e63-8c35-6f8320a4bc8a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjczNzE5fQ.bzR9XJtwDFeLgYLTfHUGMIOJ_dI9f8ZD4u-rX2kMhxs	2026-07-28 16:08:39.126-03	f	2026-06-28 16:08:39.128367-03	2026-06-28 16:08:39.126-03
cb190d28-36bd-4d43-96f4-665e2c94ae47	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc0MDg4fQ.jj9q5n8Y8BoX3kmQgGn68xVDpvKI5hey5gkUedAFPoI	2026-07-28 16:14:48.611-03	f	2026-06-28 16:14:48.613017-03	2026-06-28 16:14:48.611-03
44ab1f44-6390-4827-8fed-8d818fcc363a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc0MTM1fQ.u6G4MmqY5pikP2BjgKbiXLS02FNxb2JgdVUkLy3v7uo	2026-07-28 16:15:35.149-03	f	2026-06-28 16:15:35.152828-03	2026-06-28 16:15:35.15-03
8e848968-f900-4cd6-a953-7724f7385dbf	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc0ODY1LCJleHAiOjE3ODMyNzk2NjV9.xEn_hAmHiZa_79TotunZKwmtmn9z9Y4ojUNjshRGLGg	2026-07-28 16:27:45.607-03	f	2026-06-28 16:27:45.611295-03	2026-06-28 16:27:45.608-03
74f8fdb0-a308-4537-8002-3801f29b86ca	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc1MjE1LCJleHAiOjE3ODMyODAwMTV9.OO_GQFF01Q4ubmhewN0S-XyOW-NY3IgRgM2Ew5G1ZVQ	2026-07-28 16:33:35.271-03	f	2026-06-28 16:33:35.272776-03	2026-06-28 16:33:35.271-03
917e6e03-a985-4cb0-80d8-bf55eb8da3ec	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc1NDgxLCJleHAiOjE3ODMyODAyODF9.3gOm0PjWlNPJI2pwB2e7OqROYC4j6S_yg-zrNEJPmXg	2026-07-28 16:38:01.839-03	f	2026-06-28 16:38:01.840693-03	2026-06-28 16:38:01.839-03
45de94e9-f19a-4d42-81f0-5fdd0077e82b	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc1NTE0LCJleHAiOjE3ODMyODAzMTR9.n07ysoMc5vOZRtF55LfDv5gl_rWTYFOJm7q7r-i3xWI	2026-07-28 16:38:34.43-03	f	2026-06-28 16:38:34.432755-03	2026-06-28 16:38:34.43-03
5fcbe2c8-1744-4edf-8149-f9c3ca547825	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc1NTYzLCJleHAiOjE3ODMyODAzNjN9.uWXAeBi7mIJF64DpLqRiLBa2VeN4wSJtHvy2uMrUa40	2026-07-28 16:39:23.919-03	f	2026-06-28 16:39:23.920652-03	2026-06-28 16:39:23.919-03
faee67ed-885a-4d76-bbc7-149fdc686d3d	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc2MzY3LCJleHAiOjE3ODMyODExNjd9.MXly28csDjj2A2-aJxxgbxDSpK6Wp570HnO8KQUsg2E	2026-07-28 16:52:47.969-03	f	2026-06-28 16:52:47.973581-03	2026-06-28 16:52:47.97-03
91a95393-7c81-4f1a-b1c5-39040d1c00e1	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjc4ODUzLCJleHAiOjE3ODMyODM2NTN9.4jfCZqnhoYmVsOodgKOZD5bq3xCu2ySQ8FvbyMSUIy8	2026-07-28 17:34:13.625-03	f	2026-06-28 17:34:13.633079-03	2026-06-28 17:34:13.627-03
150ecd22-ca83-4951-8eb3-605b2ed98f63	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjgyNDgyLCJleHAiOjE3ODMyODcyODJ9.Okz0JtpkVHG6GWYw1uZOoqwXO3mv8EIqGhlxFGT-rSw	2026-07-28 18:34:42.7-03	f	2026-06-28 18:34:42.702849-03	2026-06-28 18:34:42.7-03
62df88b1-48f1-496c-a6b5-ad65ec7051ae	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjgzMDAxLCJleHAiOjE3ODMyODc4MDF9.kJoKCa95HQRxSDLlePX5hD7MWBgj57ZJ8LwyH_LOX1s	2026-07-28 18:43:21.405-03	f	2026-06-28 18:43:21.408298-03	2026-06-28 18:43:21.405-03
46a97cee-68b3-4d3f-a567-e0b6835501bf	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjg1MjAzLCJleHAiOjE3ODMyOTAwMDN9.pBQT2KIqLL8NLjqWPZqnrrCGbS2GS1CaudKfCt8O3MQ	2026-07-28 19:20:03.121-03	f	2026-06-28 19:20:03.123811-03	2026-06-28 19:20:03.121-03
f6789301-f256-45e1-8ec0-81f762060510	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjg1MjQ1LCJleHAiOjE3ODMyOTAwNDV9.mtDHR2aOVCP6DfayiExWzzhfu2_m8SsPohsD59zxEiY	2026-07-28 19:20:45.036-03	f	2026-06-28 19:20:45.038556-03	2026-06-28 19:20:45.036-03
fbfb9636-90b0-4f5a-9e4b-d286f4ac96f2	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjg1NjA2LCJleHAiOjE3ODMyOTA0MDZ9.TXdmmjH3BqK-GWww45S5SpLh0WFjUS8VrSzhEMCHhGY	2026-07-28 19:26:46.875-03	f	2026-06-28 19:26:46.877762-03	2026-06-28 19:26:46.875-03
e4a05dd5-a699-4dca-b5b7-5e513ee4d54a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjg1OTA3LCJleHAiOjE3ODMyOTA3MDd9.RFBzQeuAl8AHQlrh80MSzWW08qF65BOKO2D_m9J1d3s	2026-07-28 19:31:47.336-03	f	2026-06-28 19:31:47.33805-03	2026-06-28 19:31:47.336-03
085145fb-c5e3-4dfd-98d2-c6070a15eb16	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjg2MDQ0LCJleHAiOjE3ODMyOTA4NDR9.AsFgrHezIuWwvL7KyOyw0KEamI2QJTMnqh2QZEBd_nk	2026-07-28 19:34:04.975-03	f	2026-06-28 19:34:04.981236-03	2026-06-28 19:34:04.976-03
cbcdc0b6-00fb-4189-bdc8-3e705a1c0cbd	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjg2MjA1LCJleHAiOjE3ODMyOTEwMDV9.S2NyIFL_-hIRGWhTGFfud7feZhnySPqJZbWGn2IqBKY	2026-07-28 19:36:45.369-03	f	2026-06-28 19:36:45.376106-03	2026-06-28 19:36:45.369-03
e81d2de4-406d-4bb9-ad31-171d8d8e4632	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjg3MzYxLCJleHAiOjE3ODMyOTIxNjF9.X-qgI1srCmxnNsB8m7Z9GnZ3VwtRGfxEwz0bPbYO6ww	2026-07-28 19:56:01.246-03	f	2026-06-28 19:56:01.24763-03	2026-06-28 19:56:01.246-03
0fa509ca-94da-48a2-a651-8b532aa63d7b	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjkwMTg0LCJleHAiOjE3ODMyOTQ5ODR9.E8gw6M4u3wV_WstW5omTGN1If4neaaQZmaiD7_LkOAc	2026-07-28 20:43:04.166-03	f	2026-06-28 20:43:04.169074-03	2026-06-28 20:43:04.166-03
b07af727-b980-4c2b-825f-c6a6ca6c36e8	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjkwMjE3LCJleHAiOjE3ODMyOTUwMTd9.KxU4viMXB37pQKabDrTZyTMDSorcecfghgPnW3OU4KA	2026-07-28 20:43:37.445-03	f	2026-06-28 20:43:37.44732-03	2026-06-28 20:43:37.445-03
aee82a68-8368-4ffa-8e80-c89c29f4b909	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNjkyNTk2LCJleHAiOjE3ODMyOTczOTZ9.dGVC_Y3TxP7nE7miwgVSrX6_UlXFOD3MurUPypIi78k	2026-07-28 21:23:16.683-03	f	2026-06-28 21:23:16.686329-03	2026-06-28 21:23:16.683-03
5dc8d3ff-e8d6-44d0-badf-80ae4ad362dd	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzQ3NDUzLCJleHAiOjE3ODMzNTIyNTN9.rSW8fPk6-qxsNzMpUZgCi1StAkH-Lhxl2UPVacOVm4E	2026-07-29 12:37:33.165-03	f	2026-06-29 12:37:33.172286-03	2026-06-29 12:37:33.166-03
4c8e11fa-86e5-4eba-a295-a9210b03b1a5	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzQ3NTE2LCJleHAiOjE3ODMzNTIzMTZ9.EF-najXHEvlx05OhAt6DGUC3OW0BylLbxDkpwenoQyM	2026-07-29 12:38:36.884-03	f	2026-06-29 12:38:36.888625-03	2026-06-29 12:38:36.884-03
42126763-4cf9-4d60-8b95-f42d40870a57	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzQ3ODQwLCJleHAiOjE3ODMzNTI2NDB9.Rh59NCjk1VA29Ho67xo-2ZNjW3rNF5kHxP7MAd6dSJM	2026-07-29 12:44:00.515-03	f	2026-06-29 12:44:00.518042-03	2026-06-29 12:44:00.516-03
a23e8db3-32d5-4621-ac49-fd680fe7b76f	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUwMjE1LCJleHAiOjE3ODMzNTUwMTV9.0QV7khJLqep6aFZXgvS81xYEZROouqY4ZIYTT7IQcpU	2026-07-29 13:23:35.215-03	f	2026-06-29 13:23:35.219144-03	2026-06-29 13:23:35.216-03
a20a0202-d7d3-4344-80af-9caa5a750508	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUwNjY2LCJleHAiOjE3ODMzNTU0NjZ9._ytiq6uDqVJD4FB-v7U-ud8vjHACIbGW7moXoxiSKMI	2026-07-29 13:31:06.632-03	f	2026-06-29 13:31:06.634404-03	2026-06-29 13:31:06.633-03
03a239fa-9ec9-4eb0-89a5-8f4d33b867e8	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUwODE1LCJleHAiOjE3ODMzNTU2MTV9.jEEcUANIukJqE4w1Jgt7qLJEQsqYIi-yYmyYYgtYgpc	2026-07-29 13:33:35.8-03	f	2026-06-29 13:33:35.80389-03	2026-06-29 13:33:35.8-03
d8f7dd36-6cc4-4cb4-9e5b-857ce8c5dd72	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUxNjg4LCJleHAiOjE3ODMzNTY0ODh9.6FVoMp37QUsXTgTCssk4MKyDwE83br1n-gH2CyjGQu4	2026-07-29 13:48:08.544-03	f	2026-06-29 13:48:08.546394-03	2026-06-29 13:48:08.545-03
ce4b6613-0fda-4037-8af1-337d6b4aa33c	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUxODMxLCJleHAiOjE3ODMzNTY2MzF9.n17-Q3PAVF1y-DMDlCYVvuPf21ZWVmyDEMPnsDLcotk	2026-07-29 13:50:31.042-03	f	2026-06-29 13:50:31.043663-03	2026-06-29 13:50:31.042-03
d1a04c05-baba-4fe1-9285-2c9ea9625e1e	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUxODc3LCJleHAiOjE3ODMzNTY2Nzd9.XFRhKTbPf0F93-lP7ZAAMp549EUBN6XPpWyoslMndbo	2026-07-29 13:51:17.273-03	f	2026-06-29 13:51:17.275483-03	2026-06-29 13:51:17.273-03
c407cc7b-8ae6-406b-9dee-8088980b5076	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUxOTgwLCJleHAiOjE3ODMzNTY3ODB9.hXdsRLWkQzCjV9Db6ZykNvFR-3GVL6TcXW3q31sxNjM	2026-07-29 13:53:00.746-03	f	2026-06-29 13:53:00.749598-03	2026-06-29 13:53:00.746-03
3936d836-48fe-4520-b739-0f41a26b8e82	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUyMjk1LCJleHAiOjE3ODMzNTcwOTV9.2IVwDz1TcxZaqOp0WiaGe5E1vcmRq5k15XG_ww6kx60	2026-07-29 13:58:15.522-03	f	2026-06-29 13:58:15.524429-03	2026-06-29 13:58:15.522-03
86d26195-da0c-43ed-a922-ab8730160146	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUyNTk4LCJleHAiOjE3ODMzNTczOTh9.Qwwi5IyTWJU7KTYDP9L-8R_hLGd_p_uvYewWP9QD9dg	2026-07-29 14:03:18.679-03	f	2026-06-29 14:03:18.682183-03	2026-06-29 14:03:18.679-03
7df67727-2304-45c3-a1e1-ad69c9b18a98	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUyNjI3LCJleHAiOjE3ODMzNTc0Mjd9.h31dK1_L2d3iJsiuc9Mj9QLBYaGKmXk7jiQpfiZBLoI	2026-07-29 14:03:47.405-03	f	2026-06-29 14:03:47.409709-03	2026-06-29 14:03:47.406-03
15e07136-9c83-4fa6-be4e-53e70e64ec7c	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUyNjU4LCJleHAiOjE3ODMzNTc0NTh9.tH-8NrXJbqa1bAlLXyEMop8kPXkNiN7R_Mu8QMrxf2g	2026-07-29 14:04:18.188-03	f	2026-06-29 14:04:18.190578-03	2026-06-29 14:04:18.188-03
035208b8-9a26-4577-852e-150e7e8c44f5	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUyMjMwLCJleHAiOjE3ODMzNTcwMzB9.l5VQMAaRpFYaDsww_2hM6kVW-UMwZNfJi6c813GKv_o	2026-07-29 13:57:10.455-03	t	2026-06-29 13:57:10.458489-03	2026-06-29 13:57:10.455-03
e6b407f1-bb30-46f7-be14-fa94c14d146c	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUzNTE0LCJleHAiOjE3ODMzNTgzMTR9.8TUgCfjNOmlh6f-n5pdm51ty3edb6jfkSI1O-wQv2Eo	2026-07-29 14:18:34.155-03	f	2026-06-29 14:18:34.157857-03	2026-06-29 14:18:34.155-03
776ad425-5077-4ad4-8461-1b15d93375c7	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUzNTc3LCJleHAiOjE3ODMzNTgzNzd9.0Ic9h5dbjM_l6T-v5IHTDru3o89rPaBpMvN-lI2BT9M	2026-07-29 14:19:37.777-03	f	2026-06-29 14:19:37.780956-03	2026-06-29 14:19:37.778-03
5cbb6597-db46-4779-82fe-26609373dbc0	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzUzODQ4LCJleHAiOjE3ODMzNTg2NDh9.Aa7bxzAIEji9C2_YhJidFElYiNheYyYS5HZysRvwadU	2026-07-29 14:24:08.737-03	f	2026-06-29 14:24:08.739675-03	2026-06-29 14:24:08.737-03
a2fee4f5-417b-462e-963d-21e06f56300a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU0MjUzLCJleHAiOjE3ODMzNTkwNTN9.3sKUS4cIuCWkY73m5Gh0q3KtZRJ1qV-E-SfPP4iE-9M	2026-07-29 14:30:53.54-03	f	2026-06-29 14:30:53.543034-03	2026-06-29 14:30:53.541-03
d2db4d31-ea27-44bd-ad3e-6deb6ef93375	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU0Njk2LCJleHAiOjE3ODMzNTk0OTZ9.dK3g3jI4nA1r-W-9glf10ZW14Hh4aJS52aUPebfbheQ	2026-07-29 14:38:16.181-03	f	2026-06-29 14:38:16.183356-03	2026-06-29 14:38:16.181-03
fbca7655-fcbb-4685-bf4f-1547efe4fe2e	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU0OTg0LCJleHAiOjE3ODMzNTk3ODR9.hL_f6jI9urIYPGVW7ZVhSKwXYQHlfUYThoqzYg5iwdE	2026-07-29 14:43:04.584-03	f	2026-06-29 14:43:04.585729-03	2026-06-29 14:43:04.584-03
53125f1a-f344-4e28-ba5c-871be100ee71	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU1MDY1LCJleHAiOjE3ODMzNTk4NjV9.QRRwjIWZgNFNZaVA3pm4boM3bTGCbdnCNAy4xckxips	2026-07-29 14:44:25.639-03	f	2026-06-29 14:44:25.642424-03	2026-06-29 14:44:25.639-03
bb21ad0d-ae30-45dc-882a-60c06a6bf98a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU1MTc3LCJleHAiOjE3ODMzNTk5Nzd9.n9nlKGXFFed0DCGjUFl3K1i_xALfT_dqiKagOcqsi88	2026-07-29 14:46:17.048-03	f	2026-06-29 14:46:17.050623-03	2026-06-29 14:46:17.048-03
724f38da-50c5-422f-bcf3-41e896bf17fc	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU0MzUzLCJleHAiOjE3ODMzNTkxNTN9.Mfie8Jaz3rJZdGOqtZEZPiBm-lQqMGlPJhIozz0CrWc	2026-07-29 14:32:33.59-03	t	2026-06-29 14:32:33.592158-03	2026-06-29 14:32:33.59-03
7291cbfa-e574-4a94-a20d-cbb7ba46fa89	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU1MTkzLCJleHAiOjE3ODMzNTk5OTN9.BBcvmZhk2pXMebKYNcnpDNVZpH5bD6DoJH0T4MKuqiU	2026-07-29 14:46:33.18-03	f	2026-06-29 14:46:33.182428-03	2026-06-29 14:46:33.18-03
fda0beb7-8bc6-4e85-b3d1-44756b8b195f	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU1OTQ1LCJleHAiOjE3ODMzNjA3NDV9.pI8jr654-8IPUH-G9D-DyK-8psSoIKsR67xpdDX5g0M	2026-07-29 14:59:05.944-03	f	2026-06-29 14:59:05.949921-03	2026-06-29 14:59:05.945-03
288975d5-e3aa-484b-aa02-573cac5afa60	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU2MTMxLCJleHAiOjE3ODMzNjA5MzF9.WOMIS7QTWyuZVJYBKqgYrr7BJAm3SYQNPrYy7vzxABI	2026-07-29 15:02:11.249-03	t	2026-06-29 15:02:11.251076-03	2026-06-29 15:02:11.249-03
75172394-f617-49fe-af2d-832753da4055	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU2OTcxLCJleHAiOjE3ODMzNjE3NzF9.B5K79o7bsPk4Wsuc-RJqiWNJtGxY_-G6JCQJ_L_Ox3I	2026-07-29 15:16:11.166-03	f	2026-06-29 15:16:11.170791-03	2026-06-29 15:16:11.167-03
4d5f20df-7082-406e-be03-adfcee3e6ba6	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU3MTE5LCJleHAiOjE3ODMzNjE5MTl9.dgCOkduR6wYfjlJsEG6VAtfLpqRTOCiTWt-dbDZrca8	2026-07-29 15:18:39.082-03	f	2026-06-29 15:18:39.096124-03	2026-06-29 15:18:39.083-03
7154b89c-2553-424d-90b2-5bfb40b3cedd	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU3NzkyLCJleHAiOjE3ODUzNDk3OTJ9.oFCbz-r45f16T3tP7G1UsezuXli_FgPrrcoZ-vhCxco	2026-07-29 15:29:52.416-03	f	2026-06-29 15:29:52.419476-03	2026-06-29 15:29:52.417-03
d9d673db-a24a-4296-be1b-41f61e103a22	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJhZGFlYmRmLTFkNDAtNDBlMC04YTliLWU2NmI5NDY5NmJiNiIsInJvbGUiOiJHVUFSRElBIiwiZW1haWwiOiJndWFyZGlhQGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJndWFyZGlhIiwiaWF0IjoxNzgyNzU3NzkzLCJleHAiOjE3ODUzNDk3OTN9.bNYVeWAtkcSXkBG2IcojJ_NXLdZYWSASKUVm7-HBLBI	2026-07-29 15:29:53.665-03	f	2026-06-29 15:29:53.667786-03	2026-06-29 15:29:53.665-03
7443dcbd-bd77-4062-9685-2ec4bc4985d7	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU3MTY3LCJleHAiOjE3ODMzNjE5Njd9.R4bC-7sriDfyB4Dlz_qLRXkhGL8shx0yK2YYuKY_Dqg	2026-07-29 15:19:27.438-03	t	2026-06-29 15:19:27.443249-03	2026-06-29 15:19:27.439-03
3c116916-4bc1-4709-a682-7c0da6b93ebf	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU4MDA3LCJleHAiOjE3ODUzNTAwMDd9.p1ydQC50oq4epwomZKIScrhMNk6ePgQWvRF8QiCSM1I	2026-07-29 15:33:27.522-03	f	2026-06-29 15:33:27.525032-03	2026-06-29 15:33:27.523-03
1ea3e462-aa45-4cce-abd3-b6d9f452fcdf	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU4MzIzLCJleHAiOjE3ODUzNTAzMjN9.K74osCZ2mgYd3KCNa3U1shCSN0bM7voWOgR6prDz7zA	2026-07-29 15:38:43.715-03	f	2026-06-29 15:38:43.718174-03	2026-06-29 15:38:43.716-03
dd7e7c87-c8b5-4d1b-9c45-9e5bc7ede118	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzU4NTkwLCJleHAiOjE3ODUzNTA1OTB9.u6f08cfSRnNkY831FKqb9ZioV9wsg-2mTRl0qukZRI0	2026-07-29 15:43:10.66-03	f	2026-06-29 15:43:10.666438-03	2026-06-29 15:43:10.662-03
b96b8bfe-6503-443c-9094-f461dbde92bb	806dd3d5-3a96-48c9-8543-2851490d8d2c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgwNmRkM2Q1LTNhOTYtNDhjOS04NTQzLTI4NTE0OTBkOGQyYyIsInJvbGUiOiJHVUFSRElBIiwiZW1haWwiOiJxYV90ZXN0QHRlc3QuY2wiLCJ1c2VybmFtZSI6InFhX3Rlc3QiLCJpYXQiOjE3ODI3NTg1OTMsImV4cCI6MTc4NTM1MDU5M30.8z4tU3GFRjyE8VTTrGI08pngudMOjF4DnqwmW4CA9_Y	2026-07-29 15:43:13.693-03	f	2026-06-29 15:43:13.695814-03	2026-06-29 15:43:13.693-03
0eaca3c7-38f7-43a2-a0e7-57893710a65b	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzYyMDU3LCJleHAiOjE3ODUzNTQwNTd9.-G6-xncHlD4D9hmi-gZtTJgR7rxUXDnLLw9EcX--wks	2026-07-29 16:40:57.213-03	f	2026-06-29 16:40:57.231695-03	2026-06-29 16:40:57.214-03
23cb1575-1766-4808-8620-c3318aa988d3	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzcyMDc5LCJleHAiOjE3ODUzNjQwNzl9.3W6nGlsZISK091WSjseIp7Y9FrNxnZhNJmQehZq9Vr0	2026-07-29 19:27:59.136-03	f	2026-06-29 19:27:59.139219-03	2026-06-29 19:27:59.137-03
b3b7fd7b-a698-4986-9fc8-6ae3bfe84782	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzcyMTM4LCJleHAiOjE3ODUzNjQxMzh9.igzJJvR77z07aFY-NaaqNwZWJSySs_-WDon1NlByGlk	2026-07-29 19:28:58.786-03	f	2026-06-29 19:28:58.788611-03	2026-06-29 19:28:58.786-03
caaaa91b-3654-48b9-8e49-1a6815f1e83a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzcyMzA3LCJleHAiOjE3ODUzNjQzMDd9.kECxvre2VcBto8TbNfgahLQjGrJ1nsKqvebCtbAQsQ4	2026-07-29 19:31:47.001-03	f	2026-06-29 19:31:47.002924-03	2026-06-29 19:31:47.001-03
e7e5e12a-1898-4a4a-a801-8f692d86fd58	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzcyMzU5LCJleHAiOjE3ODUzNjQzNTl9.u9YqYzGzRNfjoBGYIMbI8HY-p7FqKTzDHmP3_E64doc	2026-07-29 19:32:39.201-03	f	2026-06-29 19:32:39.204019-03	2026-06-29 19:32:39.201-03
57dd3448-bac5-4c53-9461-f13029ef2b69	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzcyOTUxLCJleHAiOjE3ODUzNjQ5NTF9.H-j6QnrpIihz4AYqmUNOY01AZkmmw4BcG6kVM1-_SWk	2026-07-29 19:42:31.361-03	f	2026-06-29 19:42:31.363564-03	2026-06-29 19:42:31.361-03
d75c4f7d-fe20-4460-a2aa-f091216c0976	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzcyOTY1LCJleHAiOjE3ODUzNjQ5NjV9.LFPEcqstlpxPnSnVz87w27S1rBWOhe1sD7f-vpaC0IY	2026-07-29 19:42:45.332-03	f	2026-06-29 19:42:45.335183-03	2026-06-29 19:42:45.332-03
aef87d81-cfc1-4f0e-a11c-9305d0ecb581	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzczMjM0LCJleHAiOjE3ODUzNjUyMzR9.NAeLRHqm-YvBKThdW_QLlHNtVp-2_feJlyvL1Rnkmh8	2026-07-29 19:47:14.718-03	f	2026-06-29 19:47:14.721877-03	2026-06-29 19:47:14.718-03
6e7cb547-ee88-45f0-abc8-4cc71e05ed4e	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzczODIwLCJleHAiOjE3ODUzNjU4MjB9.X7XSkrmdXYQh5OgqNwa9vVt-7LkPMeTlNMWaQu4Cs7Q	2026-07-29 19:57:00.996-03	f	2026-06-29 19:57:01.002902-03	2026-06-29 19:57:00.997-03
ae6c2bbc-5ffd-46b1-b69e-3a61af7754ca	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzczOTEzLCJleHAiOjE3ODUzNjU5MTN9.u3vBjvXAZyKJ4Fk9_2pEMObzwRDebw9NJzp2EkgyqKM	2026-07-29 19:58:33.037-03	f	2026-06-29 19:58:33.037352-03	2026-06-29 19:58:33.037-03
bc9bb92d-2584-41d9-8d9c-8d9e123bc8ab	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzc0MjUwLCJleHAiOjE3ODUzNjYyNTB9.uyG8iqP87mNqin0ypEs5W6Q0xkKrqWlam3l9NBa5nnw	2026-07-29 20:04:10.554-03	f	2026-06-29 20:04:10.558799-03	2026-06-29 20:04:10.555-03
8d692598-5a5d-425f-9103-f119aa13a4c8	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzc0NTAxLCJleHAiOjE3ODUzNjY1MDF9.lSnRFua55FHAcba32E_rEq1O4bPb4B7EutFX7fESxdI	2026-07-29 20:08:21.902-03	f	2026-06-29 20:08:21.905883-03	2026-06-29 20:08:21.903-03
5aaf4133-88ae-4349-b80b-68706c9dddde	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzc1NzYwLCJleHAiOjE3ODUzNjc3NjB9.16AkgfP50upGbXG7pqFnNwzqXIEdV3kWTeTeTTHS9Q0	2026-07-29 20:29:20.127-03	f	2026-06-29 20:29:20.130861-03	2026-06-29 20:29:20.127-03
a9fccfd3-095a-490a-a4e5-6cb3405e5a79	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzc1NzYzLCJleHAiOjE3ODUzNjc3NjN9.dvavIod8UrZUkPlaq1RxDdC7E0pUT4O-9xWYYC30rqo	2026-07-29 20:29:23.105-03	f	2026-06-29 20:29:23.107426-03	2026-06-29 20:29:23.105-03
3026d6b8-a986-49d0-a0dd-4f564e0424fa	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzc2NTYyLCJleHAiOjE3ODUzNjg1NjJ9.rVMLYF90BKFru5iXuLCxBxEcAVQGUL9E9hTAMc0n9ew	2026-07-29 20:42:42.177-03	f	2026-06-29 20:42:42.180429-03	2026-06-29 20:42:42.178-03
b2a327e1-282d-4970-ae53-18718e6439fc	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzc2NTYzLCJleHAiOjE3ODUzNjg1NjN9.oLQsYPAf0gKgB2_RtlVh5R52Q5zbjp2U3zAgLnF1OyY	2026-07-29 20:42:43.433-03	f	2026-06-29 20:42:43.435634-03	2026-06-29 20:42:43.433-03
cf10afa0-1551-4f1f-8736-d4eb19fc7f49	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzg1NzkxLCJleHAiOjE3ODUzNzc3OTF9.23Ut7QQ9jCJbXg3e-5cxhqitAszdKv-JOMygPgYCtYg	2026-07-29 23:16:31.453-03	f	2026-06-29 23:16:31.456892-03	2026-06-29 23:16:31.455-03
8d66d2b1-8002-442d-9589-1998fa5aad04	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzg1NzkyLCJleHAiOjE3ODUzNzc3OTJ9.fEPwL3c_mzpR2SfIZ254yN00r_zOWOj2I0zx7DTMUTY	2026-07-29 23:16:32.174-03	f	2026-06-29 23:16:32.175233-03	2026-06-29 23:16:32.174-03
22fff37f-0c94-44c6-86d6-0707b45a7448	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzg2NzI2LCJleHAiOjE3ODUzNzg3MjZ9.IG-KBFqc4KsO5RgfIQXt6ijtHWWLcL2zksK47PA6Tvg	2026-07-29 23:32:06.519-03	f	2026-06-29 23:32:06.522599-03	2026-06-29 23:32:06.519-03
c4e99a9f-7c18-410e-b601-545e6f507775	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzg2NzYyLCJleHAiOjE3ODUzNzg3NjJ9.UjMbt5bfNjlCaNvcWOo5yQbhpdjE1HsC-yqQm4vVpw8	2026-07-29 23:32:42.582-03	f	2026-06-29 23:32:42.584046-03	2026-06-29 23:32:42.582-03
05f9f3b5-93e5-42df-9e1f-90456894addc	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzg2Nzc1LCJleHAiOjE3ODUzNzg3NzV9.DuxVlfPXkdXZejcsgfJZXXOjUt_CSGRZXUz_1skGSfQ	2026-07-29 23:32:55.682-03	f	2026-06-29 23:32:55.684965-03	2026-06-29 23:32:55.682-03
1a26d953-d92f-4da5-b23c-7182b6799e2f	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyNzkxOTI4LCJleHAiOjE3ODUzODM5Mjh9.KXVZ28iaNorGVwgfAOrLlUXWesWjCJ5_zlvo7m5wPxk	2026-07-30 00:58:48.713-03	f	2026-06-30 00:58:48.719392-03	2026-06-30 00:58:48.714-03
f8147746-6583-4751-b198-f1b424b5c845	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODY5ODAxLCJleHAiOjE3ODU0NjE4MDF9.3J53fbflNc_RJ3dvmuquwd_u7luA614s-7-0xcen0Bg	2026-07-30 22:36:41.209-03	f	2026-06-30 22:36:41.212981-03	2026-06-30 22:36:41.21-03
37df2614-e592-431f-8e37-c9a298a09655	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODcxMDExLCJleHAiOjE3ODU0NjMwMTF9.8fd6aMS1wTTH5xaXxxQ4Zt1a6pnAgArbDVFnkhPC9sc	2026-07-30 22:56:51.935-03	f	2026-06-30 22:56:51.937451-03	2026-06-30 22:56:51.936-03
53027c9f-965b-4e8b-8d5f-a074b2e8407f	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODcxNzM4LCJleHAiOjE3ODU0NjM3Mzh9.QOKW66YeUQbCMe6N5dDIgeQ2Klp5wmO8hDTGYUDVaTU	2026-07-30 23:08:58.594-03	f	2026-06-30 23:08:58.599628-03	2026-06-30 23:08:58.597-03
09216ebb-9e8d-4586-a4c8-8c9392377997	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODczMTEwLCJleHAiOjE3ODU0NjUxMTB9.o-CtvwKY3SQq1-YLM4J42JaGLQH50DlvCLgzHpPljm8	2026-07-30 23:31:50.39-03	f	2026-06-30 23:31:50.391414-03	2026-06-30 23:31:50.39-03
4c836207-1115-46b1-b476-a1227ffa2924	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODczMjY3LCJleHAiOjE3ODU0NjUyNjd9.sbKWCyxaF0jqx0WXi46ssHFm_lEZY1Oe75tL2KI5mn0	2026-07-30 23:34:27.613-03	f	2026-06-30 23:34:27.614476-03	2026-06-30 23:34:27.614-03
9a5b5d66-0551-4107-9917-f46fda821931	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODczMzAzLCJleHAiOjE3ODU0NjUzMDN9.RH7PT_413VfK2dKB79PV4a3wXP_bDzYg96Y223H7Txw	2026-07-30 23:35:03.808-03	f	2026-06-30 23:35:03.743048-03	2026-06-30 23:35:03.809-03
60c1f326-6dc2-47e1-b358-3454da239714	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODczMzMyLCJleHAiOjE3ODU0NjUzMzJ9.SJuZwUFi1Qi26N8K6i9XFsMtr_pUbO2RILoFxpL1Jj8	2026-07-30 23:35:32.162-03	f	2026-06-30 23:35:32.164732-03	2026-06-30 23:35:32.162-03
f03c4b1f-1d35-4d64-b24e-7faddede52e3	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODczODA2LCJleHAiOjE3ODU0NjU4MDZ9.pDuS6p86ii9Pkpk0I3CVYQNABELXEtjgFdk9FmRs_CM	2026-07-30 23:43:26.383-03	f	2026-06-30 23:43:26.38525-03	2026-06-30 23:43:26.384-03
8dd88807-1cd3-4d25-9771-35f86799d5c9	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc0Mzk4LCJleHAiOjE3ODU0NjYzOTh9.tmXgGE0Xhj30Y893gaPDC0EKkEFtE8voM5s-y1gk5sQ	2026-07-30 23:53:18.867-03	f	2026-06-30 23:53:18.868456-03	2026-06-30 23:53:18.867-03
71bd9559-1afb-498e-a54d-0d1ae205b5c4	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc0ODU3LCJleHAiOjE3ODU0NjY4NTd9.ndVN1iHtKPeXdihscY0MgMyfuZyYY9HOG8Py4P5PDAs	2026-07-31 00:00:57.369-03	f	2026-07-01 00:00:57.372518-03	2026-07-01 00:00:57.37-03
5d77d2c2-1393-4789-87a2-7b720fec3b3a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc1NDY4LCJleHAiOjE3ODU0Njc0Njh9.SH9Cq3V0X_fypvzzqdeH-RZ5qmHxym56ReSmGecbtC0	2026-07-31 00:11:08.299-03	f	2026-07-01 00:11:08.301491-03	2026-07-01 00:11:08.299-03
fa9c2c43-58a9-4fdb-8ffd-e6a88f1063f2	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc1OTEwLCJleHAiOjE3ODU0Njc5MTB9.kGwO3QcenNBb3Dt6GuMQa_Wq52BXZnKBRG-vR6xlgNw	2026-07-31 00:18:30.547-03	f	2026-07-01 00:18:30.549238-03	2026-07-01 00:18:30.547-03
3fc96e7d-ba35-4944-b2f1-846cd5d6551a	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc2MzMxLCJleHAiOjE3ODU0NjgzMzF9.m1vA-RfAjFaZw4qhudFxtGVDkatY4RA8SyNo7vROXy4	2026-07-31 00:25:31.084-03	f	2026-07-01 00:25:31.086229-03	2026-07-01 00:25:31.084-03
8c9ebb40-499d-47b8-961d-8cc36e857472	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc3MDgzLCJleHAiOjE3ODU0NjkwODN9.zKpuAwJM9ucf_wW-lRhZGc4s_0CI0voRv7kxM5Zc-e4	2026-07-31 00:38:03.2-03	f	2026-07-01 00:38:03.204347-03	2026-07-01 00:38:03.201-03
46b6f956-b2b9-466f-a36d-3796af8bbf85	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc3MjIwLCJleHAiOjE3ODU0NjkyMjB9.pxdGbjvcd31AYYaDPg4a6gqHJYNBipXPxIgKvAmnLOw	2026-07-31 00:40:20.318-03	t	2026-07-01 00:40:20.32051-03	2026-07-01 00:40:20.318-03
c71e4e7e-dd69-4867-8481-c790daa5a7bc	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc3NTY3LCJleHAiOjE3ODU0Njk1Njd9.7lzIc_RB8ZLVsQinQ4z5mCZhNcg0UeoYZfOmvrO-Xg4	2026-07-31 00:46:07.695-03	f	2026-07-01 00:46:07.697212-03	2026-07-01 00:46:07.696-03
f669dfe4-544a-45f3-ab8a-5bd6be573bb1	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc3Nzg0LCJleHAiOjE3ODU0Njk3ODR9.Wnw2DZhpqZ4KHM4wfbXutWXxI47UEG3zkKqQ7YSz_Qw	2026-07-31 00:49:44.3-03	f	2026-07-01 00:49:44.302996-03	2026-07-01 00:49:44.301-03
d854ff9e-8781-4bf6-b590-dd2361dbb256	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzgyODc3ODYwLCJleHAiOjE3ODU0Njk4NjB9.1bJeQoylFFa7dbIGmVs5u9-9B2dMq6IU4Fs2l7bWCUQ	2026-07-31 00:51:00.276-03	f	2026-07-01 00:51:00.278993-03	2026-07-01 00:51:00.277-03
b5b98fa4-7cac-4518-9cd7-449e81d87490	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoibS5wcmFkb0BncnVwb2xvY2FzdGlsbG8uY29tIiwidXNlcm5hbWUiOiJhZG1pbiIsImlhdCI6MTc4Mjg3Nzg4NywiZXhwIjoxNzg1NDY5ODg3fQ.hKT5A9lR0azcSCuGL6PxNHe8uCeS7LejlfqDGrypl68	2026-07-31 00:51:27.948-03	f	2026-07-01 00:51:27.951059-03	2026-07-01 00:51:27.948-03
537c28e8-5944-434d-8516-cff6353c4ce5	f921a14e-b2ed-41d5-8a68-8c5283d48aaf	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY5MjFhMTRlLWIyZWQtNDFkNS04YTY4LThjNTI4M2Q0OGFhZiIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoiYWdkbWFydGluZXpAZ21haWwuY29tIiwidXNlcm5hbWUiOiJhZ2RtYXJ0aW5leiIsImlhdCI6MTc4Mjg3Nzg4OCwiZXhwIjoxNzg1NDY5ODg4fQ.Xfgjb8Nlttg2QgpFnSwPjBQG5uTSdULP3xwEnYHJozQ	2026-07-31 00:51:28.366-03	f	2026-07-01 00:51:28.368161-03	2026-07-01 00:51:28.366-03
3dcef7ed-2cf6-4cf4-b86f-557de67d2b0a	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJhZGFlYmRmLTFkNDAtNDBlMC04YTliLWU2NmI5NDY5NmJiNiIsInJvbGUiOiJHVUFSRElBIiwiZW1haWwiOiJ0dWFjcmVkaXRhY2lvbmNsQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiZ3VhcmRpYSIsImlhdCI6MTc4Mjg3Nzg4OCwiZXhwIjoxNzg1NDY5ODg4fQ.TzEhjBYlUYjD_lEvwZDHGXixlDh_wU9yu2htvyQ9YdE	2026-07-31 00:51:28.887-03	f	2026-07-01 00:51:28.889295-03	2026-07-01 00:51:28.887-03
fc7ca7dc-26d4-4e12-98af-41ad7f448a11	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoibS5wcmFkb0BncnVwb2xvY2FzdGlsbG8uY29tIiwidXNlcm5hbWUiOiJhZG1pbiIsImlhdCI6MTc4Mjg3ODE3OSwiZXhwIjoxNzg1NDcwMTc5fQ.ljAcvmIUpRHQxK-LnlHIBazC_GGdn4H0SCAeZhzrSos	2026-07-31 00:56:19.575-03	f	2026-07-01 00:56:19.576576-03	2026-07-01 00:56:19.575-03
96a32157-6d44-4efe-9768-c36cc47f78c2	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJhZGFlYmRmLTFkNDAtNDBlMC04YTliLWU2NmI5NDY5NmJiNiIsInJvbGUiOiJHVUFSRElBIiwiZW1haWwiOiJ0dWFjcmVkaXRhY2lvbmNsQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiZ3VhcmRpYSIsImlhdCI6MTc4Mjg3ODE4MCwiZXhwIjoxNzg1NDcwMTgwfQ.tpbHLCN6lb82_JEswUTo9bgb9I6-ixR0Gcjgptpigwo	2026-07-31 00:56:20.698-03	f	2026-07-01 00:56:20.700156-03	2026-07-01 00:56:20.698-03
9af38ef1-a018-4f79-b88f-50eaf07a0944	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJhZGFlYmRmLTFkNDAtNDBlMC04YTliLWU2NmI5NDY5NmJiNiIsInJvbGUiOiJHVUFSRElBIiwiZW1haWwiOiJ0dWFjcmVkaXRhY2lvbmNsQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiZ3VhcmRpYSIsImlhdCI6MTc4Mjg3ODI2MSwiZXhwIjoxNzg1NDcwMjYxfQ.PPyoLPvY78XEU8mr-Lg-UyVVENH1qqV70gOO9fx9-ac	2026-07-31 00:57:41.334-03	t	2026-07-01 00:57:41.336161-03	2026-07-01 00:57:41.334-03
c8acb32c-5a66-407c-8ab1-2b93b2617301	14bef065-25fb-4524-a5af-910a47b34c80	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0YmVmMDY1LTI1ZmItNDUyNC1hNWFmLTkxMGE0N2IzNGM4MCIsInJvbGUiOiJBRE1JTiIsImVtYWlsIjoibS5wcmFkb0BncnVwb2xvY2FzdGlsbG8uY29tIiwidXNlcm5hbWUiOiJhZG1pbiIsImlhdCI6MTc4Mjg3ODUzNiwiZXhwIjoxNzg1NDcwNTM2fQ.liId8B3g0zXy7UaFBVbyMxIEJdAP_K7FtGfb0BWdQx4	2026-07-31 01:02:16.034-03	f	2026-07-01 01:02:16.038001-03	2026-07-01 01:02:16.035-03
61a66149-8101-4d99-a864-7fa3fd693255	2adaebdf-1d40-40e0-8a9b-e66b94696bb6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJhZGFlYmRmLTFkNDAtNDBlMC04YTliLWU2NmI5NDY5NmJiNiIsInJvbGUiOiJHVUFSRElBIiwiZW1haWwiOiJ0dWFjcmVkaXRhY2lvbmNsQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiZ3VhcmRpYSIsImlhdCI6MTc4Mjg3ODUzNiwiZXhwIjoxNzg1NDcwNTM2fQ.zwXStE0i_4vcsHG8O-ui8n3VH0g9O4pXTkA3Q8Q8yyo	2026-07-31 01:02:16.881-03	f	2026-07-01 01:02:16.883108-03	2026-07-01 01:02:16.881-03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password, first_name, last_name, role, is_active, last_login, created_at, updated_at, deleted_at) FROM stdin;
90eb6c3a-6654-449a-b1d4-a2f05b9f80f1	system	system@system.local	$2b$12$4JDtYsVtBA634EcsuV2wDuxr/9Epmp5kjg4zeq52ojK2yhIHRr.Wq	Sistema		ADMIN	f	\N	2026-06-28 16:02:09.469036-03	2026-06-28 16:02:09.469036-03	\N
14bef065-25fb-4524-a5af-910a47b34c80	admin	m.prado@grupolocastillo.com	$2b$12$UTqoO6L6erilAkystU3VX.8svITfNgkbtnSu/KdEZCMi0yomVUjrK	Admin	User	ADMIN	t	2026-07-01 01:02:16.029-03	2026-06-28 16:02:08.544236-03	2026-07-01 01:02:16.031385-03	\N
d20dedde-346d-4e1f-91fc-bd6a8d86c8e3	acreditador	acreditador@example.com	$2b$12$0JlzJAg4T1izh1CPNYMCSOpoKXoDpGEyutC3zmHCg.MJcJ7fkg8JS	Acreditador	User	OPERATOR	t	\N	2026-06-28 16:02:08.852355-03	2026-07-01 01:02:16.466561-03	2026-07-01 01:02:16.464-03
2adaebdf-1d40-40e0-8a9b-e66b94696bb6	guardia	tuacreditacioncl@gmail.com	$2b$12$FtG4mYDsAIYUTWZWn5MCTOEq4KNBViNHezhBMJND0z25yseY2KEjC	Acreditador	Eventos	GUARDIA	t	2026-07-01 01:02:16.874-03	2026-06-28 16:02:09.162055-03	2026-07-01 01:02:16.876574-03	\N
806dd3d5-3a96-48c9-8543-2851490d8d2c	qa_test	qa_test@test.cl	$2b$12$k5F5JxrYaxYuMNopvEMKj.2xr45qRyDL0DH41DaBkfVW7C71f2CuC	QA	Test	OPERATOR	f	2026-06-29 15:43:13.64-03	2026-06-29 15:43:12.941115-03	2026-06-29 15:43:16.991521-03	2026-06-29 15:43:16.989-03
f921a14e-b2ed-41d5-8a68-8c5283d48aaf	agdmartinez	agdmartinez@gmail.com	$2b$12$ELP8RNXbc1lvSU.Mxdz6eOWfN.nvZVVS5RrZZ5W5AB2.45WkwXfcm	A.	Martínez	ADMIN	t	2026-07-01 00:51:28.363-03	2026-07-01 00:49:46.790018-03	2026-07-01 00:51:28.364875-03	\N
\.


--
-- Name: accreditations accreditations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditations
    ADD CONSTRAINT accreditations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: awards awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: event_schedules event_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_schedules
    ADD CONSTRAINT event_schedules_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_public_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_public_slug_key UNIQUE (public_slug);


--
-- Name: gift_campaigns gift_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_campaigns
    ADD CONSTRAINT gift_campaigns_pkey PRIMARY KEY (id);


--
-- Name: gift_deliveries gift_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_deliveries
    ADD CONSTRAINT gift_deliveries_pkey PRIMARY KEY (id);


--
-- Name: gift_employees gift_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_employees
    ADD CONSTRAINT gift_employees_pkey PRIMARY KEY (id);


--
-- Name: gift_types gift_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_types
    ADD CONSTRAINT gift_types_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: participant_awards participant_awards_participant_id_award_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_awards
    ADD CONSTRAINT participant_awards_participant_id_award_id_key UNIQUE (participant_id, award_id);


--
-- Name: participant_awards participant_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_awards
    ADD CONSTRAINT participant_awards_pkey PRIMARY KEY (id);


--
-- Name: participant_schedules participant_schedules_participant_id_schedule_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_schedules
    ADD CONSTRAINT participant_schedules_participant_id_schedule_id_key UNIQUE (participant_id, schedule_id);


--
-- Name: participant_schedules participant_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_schedules
    ADD CONSTRAINT participant_schedules_pkey PRIMARY KEY (id);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: accreditations_event_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accreditations_event_schedule_id ON public.accreditations USING btree (event_schedule_id);


--
-- Name: gift_deliveries_employee_id_gift_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX gift_deliveries_employee_id_gift_type_id ON public.gift_deliveries USING btree (employee_id, gift_type_id);


--
-- Name: participant_schedules_participant_id_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX participant_schedules_participant_id_schedule_id ON public.participant_schedules USING btree (participant_id, schedule_id);


--
-- Name: participants_document_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX participants_document_number ON public.participants USING btree (document_number);


--
-- Name: participants_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX participants_email ON public.participants USING btree (email);


--
-- Name: unique_accreditation_guest_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_accreditation_guest_schedule ON public.accreditations USING btree (guest_id, event_schedule_id) WHERE (guest_id IS NOT NULL);


--
-- Name: unique_accreditation_participant_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_accreditation_participant_schedule ON public.accreditations USING btree (participant_id, event_schedule_id);


--
-- Name: users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email ON public.users USING btree (email);


--
-- Name: users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username ON public.users USING btree (username);


--
-- Name: accreditations accreditations_accredited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditations
    ADD CONSTRAINT accreditations_accredited_by_fkey FOREIGN KEY (accredited_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accreditations accreditations_event_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditations
    ADD CONSTRAINT accreditations_event_schedule_id_fkey FOREIGN KEY (event_schedule_id) REFERENCES public.event_schedules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accreditations accreditations_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditations
    ADD CONSTRAINT accreditations_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accreditations accreditations_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accreditations
    ADD CONSTRAINT accreditations_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: awards awards_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: event_schedules event_schedules_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_schedules
    ADD CONSTRAINT event_schedules_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gift_deliveries gift_deliveries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_deliveries
    ADD CONSTRAINT gift_deliveries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.gift_employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gift_deliveries gift_deliveries_gift_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_deliveries
    ADD CONSTRAINT gift_deliveries_gift_type_id_fkey FOREIGN KEY (gift_type_id) REFERENCES public.gift_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gift_employees gift_employees_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_employees
    ADD CONSTRAINT gift_employees_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.gift_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gift_types gift_types_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_types
    ADD CONSTRAINT gift_types_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.gift_campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: guests guests_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: participant_awards participant_awards_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_awards
    ADD CONSTRAINT participant_awards_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: participant_awards participant_awards_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_awards
    ADD CONSTRAINT participant_awards_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.awards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: participant_awards participant_awards_delivered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_awards
    ADD CONSTRAINT participant_awards_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: participant_awards participant_awards_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_awards
    ADD CONSTRAINT participant_awards_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: participant_schedules participant_schedules_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_schedules
    ADD CONSTRAINT participant_schedules_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: participant_schedules participant_schedules_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_schedules
    ADD CONSTRAINT participant_schedules_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.event_schedules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: participants participants_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: participants participants_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict RT6c0pDkk9lfIVxExP5u6n8BDlDmZ8oxn1Q8gZAXiOe7OaieIi9dPKamW6JP74E

