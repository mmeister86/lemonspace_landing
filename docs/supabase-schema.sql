-- =====================================================
-- Supabase Database Schema für Lemonspace
-- =====================================================
-- Dieses SQL-Script erstellt alle notwendigen Tabellen,
-- Row-Level Security (RLS) Policies, Indexe und Constraints
-- für die Lemonspace-Anwendung.
-- =====================================================

-- ============================================
-- 1. Users Tabelle
-- ============================================
-- Erweitert die Supabase Auth User-Daten um
-- zusätzliche Felder wie username und display_name
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT users_username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT users_auth_user_id_unique UNIQUE (auth_user_id),
  CONSTRAINT users_username_unique UNIQUE (username)
);

-- Indexe für Performance
CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users(username);

-- Auto-Update für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users können ihre eigenen Daten lesen
CREATE POLICY "Users can read their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Policy: Users können ihre eigenen Daten aktualisieren
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Users können ihre eigenen Daten erstellen
CREATE POLICY "Users can insert their own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Jeder kann Usernamen lesen (für Profil-Links)
CREATE POLICY "Anyone can read usernames"
  ON public.users
  FOR SELECT
  USING (true);

-- ============================================
-- 2. Boards Tabelle
-- ============================================
-- Speichert alle Boards mit Grid-Konfiguration
-- und Blöcken als JSONB
-- ============================================

CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  grid_config JSONB NOT NULL DEFAULT '{"columns": 4, "gap": 16}'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_id UUID,
  is_template BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT boards_slug_length CHECK (char_length(slug) >= 3 AND char_length(slug) <= 50),
  CONSTRAINT boards_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT boards_user_slug_unique UNIQUE (user_id, slug)
);

-- Indexe für Performance
CREATE INDEX IF NOT EXISTS boards_user_id_idx ON public.boards(user_id);
CREATE INDEX IF NOT EXISTS boards_slug_idx ON public.boards(slug);
CREATE INDEX IF NOT EXISTS boards_user_slug_idx ON public.boards(user_id, slug);
CREATE INDEX IF NOT EXISTS boards_template_idx ON public.boards(is_template) WHERE is_template = TRUE;
CREATE INDEX IF NOT EXISTS boards_published_idx ON public.boards(published_at) WHERE published_at IS NOT NULL;

-- JSONB Indexe für schnellere Queries
CREATE INDEX IF NOT EXISTS boards_grid_config_idx ON public.boards USING GIN (grid_config);
CREATE INDEX IF NOT EXISTS boards_blocks_idx ON public.boards USING GIN (blocks);

-- Auto-Update für updated_at
CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security (RLS)
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Policy: Users können ihre eigenen Boards lesen
CREATE POLICY "Users can read their own boards"
  ON public.boards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.auth_user_id = boards.user_id
    )
  );

-- Policy: Users können ihre eigenen Boards erstellen
CREATE POLICY "Users can create their own boards"
  ON public.boards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.auth_user_id = user_id
    )
  );

-- Policy: Users können ihre eigenen Boards aktualisieren
CREATE POLICY "Users can update their own boards"
  ON public.boards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.auth_user_id = boards.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.auth_user_id = boards.user_id
    )
  );

-- Policy: Users können ihre eigenen Boards löschen
CREATE POLICY "Users can delete their own boards"
  ON public.boards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.auth_user_id = boards.user_id
    )
  );

-- Policy: Jeder kann veröffentlichte Boards lesen
CREATE POLICY "Anyone can read published boards"
  ON public.boards
  FOR SELECT
  USING (published_at IS NOT NULL);

-- Policy: Jeder kann Templates lesen
CREATE POLICY "Anyone can read templates"
  ON public.boards
  FOR SELECT
  USING (is_template = TRUE);

-- ============================================
-- 3. Hilfs-Funktionen
-- ============================================

-- Funktion: Prüfe ob Username verfügbar ist
CREATE OR REPLACE FUNCTION is_username_available(check_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = check_username
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Prüfe ob Slug für User verfügbar ist
CREATE OR REPLACE FUNCTION is_slug_available_for_user(check_user_id UUID, check_slug TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.boards
    WHERE user_id = check_user_id AND slug = check_slug
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Kommentare für Dokumentation
-- ============================================

COMMENT ON TABLE public.users IS 'Erweiterte User-Daten die auf Supabase Auth basieren';
COMMENT ON COLUMN public.users.auth_user_id IS 'Referenz zu auth.users(id) für Supabase Auth';
COMMENT ON COLUMN public.users.username IS 'Eindeutiger Username (3-30 Zeichen, lowercase, alphanumeric + underscore)';
COMMENT ON COLUMN public.users.display_name IS 'Optionaler Display-Name für Anzeige in der UI';

COMMENT ON TABLE public.boards IS 'Boards/Spaces erstellt von Users';
COMMENT ON COLUMN public.boards.user_id IS 'Referenz zum auth_user_id des Besitzers';
COMMENT ON COLUMN public.boards.slug IS 'URL-freundlicher Slug (eindeutig pro User)';
COMMENT ON COLUMN public.boards.grid_config IS 'Grid-Konfiguration als JSONB: {columns: number, gap: number}';
COMMENT ON COLUMN public.boards.blocks IS 'Array von Block-Objekten als JSONB';
COMMENT ON COLUMN public.boards.is_template IS 'Markiert Board als öffentliches Template';
COMMENT ON COLUMN public.boards.published_at IS 'Zeitstempel der Veröffentlichung (NULL = nicht veröffentlicht)';
