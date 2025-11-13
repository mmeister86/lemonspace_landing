/**
 * Board Types basierend auf Masterplan-Datenmodell
 */

import type { Models } from "appwrite";

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

/**
 * Board-Datenfelder für AppWrite (ohne Document-Metadaten)
 * Diese Felder werden an createDocument/updateDocument übergeben
 *
 * Hinweis: grid_config und blocks werden als JSON-Strings gespeichert,
 * da selbstgehostete AppWrite-Installationen keinen JSON-Attribut-Typ unterstützen
 */
export interface BoardDocumentData {
  user_id: string;
  title: string;
  slug: string;
  grid_config: string; // JSON als String gespeichert
  blocks: string; // JSON als String gespeichert
  template_id?: string;
  is_template?: boolean;
  password_hash?: string;
  expires_at?: string;
  published_at?: string;
}

/**
 * Board-Daten für AppWrite (JSON-Felder als Strings)
 * Erweitert Models.Document mit Board-spezifischen Feldern
 */
export interface BoardDocument extends Models.Document, BoardDocumentData {}
