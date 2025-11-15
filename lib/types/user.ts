/**
 * User Types für die Users Tabelle in Supabase
 * Diese Tabelle erweitert die Supabase Auth User-Daten um zusätzliche Felder wie username
 */

/**
 * User-Datenfelder für Supabase (ohne Metadaten)
 */
export interface UserData {
  auth_user_id: string;
  username: string;
  display_name?: string;
}

/**
 * User-Interface für die Anwendung
 * Repräsentiert einen vollständigen User-Datensatz aus der Datenbank
 */
export interface User {
  id: string;
  auth_user_id: string;
  username: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}
