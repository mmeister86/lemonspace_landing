/**
 * Board Types basierend auf Masterplan-Datenmodell
 */

export interface GridConfig {
  columns: number; // Maximal 4 Spalten auf Desktop
  gap: number; // Gap zwischen Blöcken in px
}

export interface Block {
  id: string;
  type: BlockType;
  data: Record<string, unknown>; // Block-spezifische Daten
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
}

export type BlockType =
  | "text"
  | "heading"
  | "image"
  | "button"
  | "spacer"
  | "video"
  | "form"
  | "pricing"
  | "testimonial"
  | "accordion"
  | "code";

/**
 * Board-Datenfelder für Supabase (ohne Metadaten)
 * Diese Felder werden an insert/update übergeben
 *
 * Hinweis: grid_config und blocks werden als JSONB gespeichert
 */
export interface BoardData {
  user_id: string;
  title: string;
  slug: string;
  visibility?: 'private' | 'public' | 'shared'; // ← ADD THIS
  grid_config: GridConfig; // Als JSONB in Supabase
  blocks: Block[]; // Als JSONB in Supabase
  template_id?: string;
  is_template?: boolean;
  password_hash?: string;
  expires_at?: string;
  published_at?: string;
}

/**
 * Board-Interface für die Anwendung
 * Repräsentiert einen vollständigen Board-Datensatz aus der Datenbank
 */
export interface Board {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  grid_config: GridConfig;
  blocks: Block[];
  template_id?: string;
  is_template?: boolean;
  password_hash?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}
