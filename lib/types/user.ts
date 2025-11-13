/**
 * User Types für die Users Collection in AppWrite
 * Diese Collection erweitert die AppWrite User-Daten um zusätzliche Felder wie username
 */

import type { Models } from "appwrite";

/**
 * User-Datenfelder für AppWrite (ohne Document-Metadaten)
 */
export interface UserDocumentData {
  appwrite_user_id: string;
  username: string;
  display_name?: string;
}

/**
 * User-Daten für AppWrite
 * Erweitert Models.Document mit User-spezifischen Feldern
 */
export interface UserDocument extends Models.Document, UserDocumentData {}

/**
 * User-Interface für die Anwendung
 */
export interface User {
  id: string;
  appwrite_user_id: string;
  username: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}
