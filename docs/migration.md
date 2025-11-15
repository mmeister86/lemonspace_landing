# Appwrite zu Supabase Migration

## Übersicht

Vollständige Migration von Appwrite (Account/Auth, Databases, Storage) zu Supabase Cloud. Alle Services werden durch Supabase-Äquivalente ersetzt.

## 1. Dependencies installieren/entfernen

### Bereits installiert:

- `@supabase/supabase-js` - Supabase Client Library
- `@supabase/ssr` - Supabase SSR Bibliothek

### Zu entfernen:

- `appwrite` - Wird durch Supabase ersetzt

## 2. Client-Konfiguration erstellen

**Datei:** `lib/supabase.ts` (neu)

Erstelle Supabase-Client-Konfiguration analog zu `lib/appwrite.ts`:

- Initialisiere Supabase Client mit `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Exportiere Client-Instanz für Auth, Database und Storage
- Behalte lazy initialization Pattern bei für Build-Zeit-Kompatibilität

## 3. Auth-Service migrieren

**Datei:** `hooks/useAuth.ts`

**Änderungen:**

- Ersetze `account` Import von Appwrite durch `supabase.auth`
- Migriere `signup()`: `account.create()` → `supabase.auth.signUp()`
- Migriere `signin()`: `account.createEmailPasswordSession()` → `supabase.auth.signInWithPassword()`
- Migriere `logout()`: `account.deleteSession()` → `supabase.auth.signOut()`
- Migriere `checkUser()`: `account.get()` → `supabase.auth.getUser()`
- Passe Fehlerbehandlung an Supabase-Fehlerstruktur an
- Nutze `onAuthStateChange()` für Session-Management

## 4. Database Services migrieren

### User Service

**Datei:** `app/lib/services/user-service.ts`

**Änderungen:**

- Ersetze `databases` Import durch Supabase Client
- Migriere alle CRUD-Operationen:
  - `databases.listDocuments()` → `supabase.from('users').select()`
  - `databases.createDocument()` → `supabase.from('users').insert()`
  - `databases.updateDocument()` → `supabase.from('users').update()`
  - `databases.getDocument()` → `supabase.from('users').select().eq().single()`
- Konvertiere Appwrite Query-Syntax (`Query.equal()`, `Query.notEqual()`) zu Supabase Query Builder
- Entferne `ID.unique()` → Nutze Supabase UUIDs oder `crypto.randomUUID()`
- Entferne Appwrite Permissions → Nutze Supabase Row-Level Security (RLS) Policies

### Board Service

**Datei:** `app/lib/services/board-service.ts`

**Änderungen:**

- Gleiche Migration wie User Service
- JSON-Felder (`grid_config`, `blocks`): Speichere direkt als JSONB statt String-Serialisierung
- Anpasse Query-Builder Syntax für alle Filteroperationen

## 5. Storage Service migrieren

**Datei:** `app/[locale]/builder/components/BuilderMenubar.tsx`

**Änderungen:**

- Ersetze `storage.getFilePreview()` durch `supabase.storage.from().getPublicUrl()` oder `createSignedUrl()`
- Anpassen der Storage-Bucket-Konfiguration

## 6. Types aktualisieren

### User Types

**Datei:** `lib/types/user.ts`

**Änderungen:**

- Entferne `Models.Document` und `Models.Preferences` Imports von Appwrite
- Ersetze `Models.Document` durch einfache Interface-Struktur
- Ersetze `$id`, `$createdAt`, `$updatedAt` durch Standard-Felder (`id`, `created_at`, `updated_at`)

### Board Types

**Datei:** `lib/types/board.ts`

**Änderungen:**

- Gleiche Anpassungen wie bei User Types
- Entferne `BoardDocumentData` Interface (nicht mehr benötigt, da JSONB direkt nutzbar)

## 7. User Context migrieren

**Datei:** `app/lib/user-context.tsx`

**Änderungen:**

- Ersetze `account.get()` durch `supabase.auth.getUser()`
- Nutze `supabase.auth.onAuthStateChange()` für Session-Überwachung
- Passe User-Interface an (keine `Models.User` mehr)

## 8. Datenbank-Schema erstellen

**Migration erforderlich:**

- Erstelle Supabase-Tabellen `users` und `boards` mit entsprechenden Spalten
- Richte Row-Level Security (RLS) Policies ein:
  - Users können nur eigene Daten lesen/schreiben
  - Öffentliche Boards für alle lesbar
- Indexe für Performance: `username`, `user_id`, `slug` Kombinationen
- Unique Constraints: `username` in users, `(user_id, slug)` in boards

## 9. Cleanup

**Datei:** `lib/appwrite.ts` (löschen oder als Referenz behalten)

- Entferne alle Appwrite-Imports aus anderen Dateien
- Entferne Appwrite-Umgebungsvariablen aus `.env.local` (behalte nur Supabase-Variablen)

## 10. Auth Utilities anpassen

**Datei:** `app/lib/auth-utils.ts`

**Änderungen:**

- Passe `isAuthError()` an Supabase-Fehlerstruktur an
- Supabase gibt andere Fehlercodes zurück (z.B. 400 statt 401 für einige Auth-Fehler)

## Technische Hinweise

- **Session Management:** Supabase nutzt automatisches Token-Refresh, anders als Appwrite
- **Permissions:** Row-Level Security (RLS) statt Appwrite Permissions-System
- **JSON-Felder:** Nutze JSONB in Supabase statt String-Serialisierung
- **IDs:** Supabase nutzt UUIDs statt Appwrite's ID-Format
- **Queries:** Supabase Query Builder ist typsicherer als Appwrite's Query-Klasse

## Implementierungs-Todos

1. **@supabase/supabase-js installieren** und appwrite Dependency entfernen
2. **lib/supabase.ts erstellen** mit Supabase Client-Konfiguration (analog zu lib/appwrite.ts)
3. **hooks/useAuth.ts migrieren**: Appwrite account → Supabase auth (signup, signin, logout, checkUser)
4. **app/lib/services/user-service.ts migrieren**: Appwrite databases → Supabase queries
5. **app/lib/services/board-service.ts migrieren**: Appwrite databases → Supabase queries, JSONB statt Strings
6. **Storage-Nutzung in BuilderMenubar.tsx migrieren** (Avatar-URLs)
7. **lib/types/user.ts und lib/types/board.ts aktualisieren**: Entferne Models.Document, ersetze $id/$createdAt/$updatedAt
8. **app/lib/user-context.tsx migrieren**: Nutze Supabase auth.onAuthStateChange()
9. **app/lib/auth-utils.ts anpassen**: Supabase-Fehlerstruktur für isAuthError()
10. **Supabase Datenbank-Schema erstellen**: Tabellen users/boards, RLS Policies, Indexe, Unique Constraints
11. **Appwrite-Code entfernen**: lib/appwrite.ts löschen, alle Imports aktualisieren, Umgebungsvariablen aufräumen
