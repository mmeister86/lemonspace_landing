-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.board_collaborators (
id uuid NOT NULL DEFAULT gen_random_uuid(),
board_id uuid NOT NULL,
user_id uuid NOT NULL,
role character varying NOT NULL DEFAULT 'viewer'::character varying CHECK (role::text = ANY (ARRAY['owner'::character varying, 'editor'::character varying, 'viewer'::character varying]::text[])),
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT board_collaborators_pkey PRIMARY KEY (id),
CONSTRAINT board_collaborators_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id),
CONSTRAINT board_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.board_elements (
id uuid NOT NULL DEFAULT gen_random_uuid(),
board_id uuid NOT NULL,
type character varying NOT NULL,
position_x numeric NOT NULL DEFAULT 0,
position_y numeric NOT NULL DEFAULT 0,
width numeric NOT NULL DEFAULT 100,
height numeric NOT NULL DEFAULT 100,
z_index integer NOT NULL DEFAULT 1,
content jsonb,
styles jsonb,
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT board_elements_pkey PRIMARY KEY (id),
CONSTRAINT board_elements_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id)
);
CREATE TABLE public.boards (
id uuid NOT NULL DEFAULT gen_random_uuid(),
user_id uuid NOT NULL,
title text NOT NULL,
slug text NOT NULL CHECK (char_length(slug) >= 3 AND char_length(slug) <= 50),
grid_config jsonb NOT NULL DEFAULT '{"gap": 16, "columns": 4}'::jsonb,
blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
template_id uuid,
is_template boolean DEFAULT false,
password_hash text,
expires_at timestamp with time zone,
published_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
owner_id uuid,
description text,
visibility character varying DEFAULT 'private'::character varying CHECK (visibility::text = ANY (ARRAY['public'::character varying::text, 'private'::character varying::text, 'shared'::character varying::text, 'workspace'::character varying::text])),
thumbnail_url text,
metadata jsonb DEFAULT '{}'::jsonb,
CONSTRAINT boards_pkey PRIMARY KEY (id),
CONSTRAINT boards_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.element_connections (
id uuid NOT NULL DEFAULT gen_random_uuid(),
board_id uuid NOT NULL,
source_element_id uuid NOT NULL,
target_element_id uuid NOT NULL,
connection_type character varying NOT NULL DEFAULT 'arrow'::character varying,
source_anchor character varying DEFAULT 'auto'::character varying,
target_anchor character varying DEFAULT 'auto'::character varying,
style jsonb,
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
CONSTRAINT element_connections_pkey PRIMARY KEY (id),
CONSTRAINT element_connections_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id),
CONSTRAINT element_connections_source_element_id_fkey FOREIGN KEY (source_element_id) REFERENCES public.board_elements(id),
CONSTRAINT element_connections_target_element_id_fkey FOREIGN KEY (target_element_id) REFERENCES public.board_elements(id)
);
CREATE TABLE public.users (
id uuid NOT NULL DEFAULT gen_random_uuid(),
auth_user_id uuid NOT NULL UNIQUE,
username text NOT NULL UNIQUE CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
display_name text,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT users_pkey PRIMARY KEY (id),
CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);
