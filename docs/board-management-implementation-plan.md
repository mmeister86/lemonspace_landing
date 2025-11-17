# Board-Verwaltung: Implementierungsplan

## Übersicht

Dieses Dokument enthält die konkreten Code-Änderungen zur Behebung der Board-Verwaltungsprobleme. Siehe [`board-management-fix-analysis.md`](board-management-fix-analysis.md) für die vollständige Fehleranalyse.

## Phase 1: Critical Fixes (P0)

### Fix 1: API-Route - Kombinierter UUID/Slug-Lookup

**Datei:** [`app/api/boards/[id]/route.ts`](../app/api/boards/[id]/route.ts)

#### Änderung 1.1: Helper-Funktionen hinzufügen (nach Zeile 17)

```typescript
// ===========================================
// UUID/Slug Detection Helper Functions
// ===========================================

/**
 * Prüft ob ein String ein gültiger UUID v4 ist
 * @param str - Der zu prüfende String
 * @returns true wenn UUID, false wenn Slug oder anderes Format
 */
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Holt ein Board entweder per UUID oder Slug
 * @param supabase - Supabase Client
 * @param identifier - UUID oder Slug
 * @param userId - Optional: User ID zur Filterung (empfohlen für Slug-Lookups)
 * @returns Board-Daten oder Fehler
 */
async function fetchBoardByIdOrSlug(
  supabase: any,
  identifier: string,
  userId?: string
) {
  if (isUUID(identifier)) {
    // UUID-Lookup: Direkt nach ID suchen
    console.log(`[API] Board lookup: UUID=${identifier}`);
    return await supabase
      .from("boards")
      .select(
        `
        id,
        user_id,
        owner_id,
        title,
        description,
        slug,
        visibility,
        thumbnail_url,
        grid_config,
        blocks,
        template_id,
        is_template,
        expires_at,
        published_at,
        created_at,
        updated_at
      `
      )
      .eq("id", identifier)
      .single();
  } else {
    // Slug-Lookup: Nach slug suchen
    console.log(
      `[API] Board lookup: Slug=${identifier}${
        userId ? `, UserId=${userId}` : ""
      }`
    );

    let query = supabase
      .from("boards")
      .select(
        `
        id,
        user_id,
        owner_id,
        title,
        description,
        slug,
        visibility,
        thumbnail_url,
        grid_config,
        blocks,
        template_id,
        is_template,
        expires_at,
        published_at,
        created_at,
        updated_at
      `
      )
      .eq("slug", identifier);

    // Bei authenticated User: Nur Boards dieses Users zurückgeben
    // (Slugs sind nur pro User eindeutig, nicht global)
    if (userId) {
      query = query.eq("user_id", userId);
    }

    return await query.single();
  }
}
```

#### Änderung 1.2: Board-Lookup ersetzen (Zeile 209-233)

**Vorher:**

```typescript
// 3. Fetch board metadata with specific columns (performance optimization)
// Try to fetch with new schema first, fallback to old schema if needed
const { data: boardData, error: boardError } = await supabase
  .from("boards")
  .select(
    `
    id,
    user_id,
    owner_id,
    title,
    description,
    slug,
    visibility,
    thumbnail_url,
    grid_config,
    blocks,
    template_id,
    is_template,
    expires_at,
    published_at,
    created_at,
    updated_at
  `
  )
  .eq("id", boardId)
  .single();
```

**Nachher:**

```typescript
// 3. Fetch board metadata with specific columns (performance optimization)
// Support both UUID and Slug lookups for flexible URL routing
const { data: boardData, error: boardError } = await fetchBoardByIdOrSlug(
  supabase,
  boardId,
  user?.id // Pass user ID for slug disambiguation (slugs are unique per user)
);
```

#### Änderung 1.3: Fehlerbehandlung erweitern (Zeile 235-265)

**Nach Zeile 265 hinzufügen:**

```typescript
if (boardError) {
  if (boardError.code === "PGRST116") {
    // No rows found - provide helpful message based on identifier type
    const identifierType = isUUID(boardId) ? "UUID" : "Slug";
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Board not found (${identifierType}: ${boardId})`,
          details: user
            ? "Board does not exist or you don't have access"
            : "Board does not exist or is not public",
        },
      },
      { status: 404 }
    );
  }

  // Check for UUID syntax error (shouldn't happen anymore, but keep as safety net)
  if (boardError.code === "22P02") {
    return NextResponse.json<APIResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_IDENTIFIER",
          message: "Invalid board identifier format",
          details: "The board identifier must be either a valid UUID or slug",
        },
      },
      { status: 400 }
    );
  }

  console.error("[API] Database error fetching board:", boardError);
  return NextResponse.json<APIResponse<never>>(
    {
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to fetch board",
        details:
          process.env.NODE_ENV === "development"
            ? boardError.message
            : undefined,
      },
    },
    { status: 500 }
  );
}
```

### Fix 2: Frontend - Navigation nach Board-Erstellung

**Datei:** [`app/[locale]/builder/components/CreateBoardDialog.tsx`](../app/[locale]/builder/components/CreateBoardDialog.tsx)

#### Änderung 2.1: Import hinzufügen (Zeile 4)

**Vorher:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
```

**Nachher:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
```

#### Änderung 2.2: Router Hook einbinden (nach Zeile 47)

**Vorher:**

```typescript
export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const t = useTranslations("createBoard");
  const { user } = useUser();
  const setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
  const createBoardMutation = useCreateBoard();
  const titleInputRef = React.useRef<HTMLInputElement>(null);
```

**Nachher:**

```typescript
export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const t = useTranslations("createBoard");
  const router = useRouter();
  const { user } = useUser();
  const setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
  const createBoardMutation = useCreateBoard();
  const titleInputRef = React.useRef<HTMLInputElement>(null);
```

#### Änderung 2.3: Navigation im onSubmit Handler (Zeile 121-142)

**Vorher:**

```typescript
// Submit Handler
const onSubmit = async (data: CreateBoardFormData) => {
  if (!user?.id) {
    toast.error(t("error.notLoggedIn"));
    return;
  }

  try {
    const newBoard = await createBoardMutation.mutateAsync({
      title: data.title,
      slug: data.slug, // Optional - API generiert wenn nicht vorhanden
      grid_config: { columns: 4, gap: 16 },
      blocks: [],
    });

    setCurrentBoard(newBoard);
    onOpenChange(false);
    toast.success(t("success"));
  } catch (error) {
    console.error("Fehler beim Erstellen des Boards:", error);
    // Die Fehlermeldung wird bereits im Hook angezeigt
  }
};
```

**Nachher:**

```typescript
// Submit Handler
const onSubmit = async (data: CreateBoardFormData) => {
  if (!user?.id) {
    toast.error(t("error.notLoggedIn"));
    return;
  }

  try {
    const newBoard = await createBoardMutation.mutateAsync({
      title: data.title,
      slug: data.slug, // Optional - API generiert wenn nicht vorhanden
      grid_config: { columns: 4, gap: 16 },
      blocks: [],
    });

    // Update store für sofortige UI-Aktualisierung
    setCurrentBoard(newBoard);

    // Dialog schließen
    onOpenChange(false);

    // Success-Nachricht
    toast.success(t("success"));

    // Navigation zum neuen Board (Slug-basierte URL)
    // Fallback zu ID falls Slug unerwartet fehlen sollte
    const boardIdentifier = newBoard.slug || newBoard.id;
    router.push(`/builder/${boardIdentifier}`);
  } catch (error) {
    console.error("Fehler beim Erstellen des Boards:", error);
    // Die Fehlermeldung wird bereits im Hook angezeigt
  }
};
```

## Phase 2: Verbesserungen (P1)

### Verbesserung 1: Type Safety - Route Parameter Umbenennung

**Datei:** [`app/[locale]/builder/[boardId]/page.tsx`](../app/[locale]/builder/[boardId]/page.tsx)

#### Änderung 3.1: Variable umbenennen (Zeile 14-18)

**Vorher:**

```typescript
export default function BoardBuilderPage() {
  const t = useTranslations("boardBuilder");
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
```

**Nachher:**

```typescript
export default function BoardBuilderPage() {
  const t = useTranslations("boardBuilder");
  const params = useParams();
  const router = useRouter();

  // boardId parameter can be either UUID or Slug
  // The API will automatically detect the format and perform the appropriate lookup
  const boardIdentifier = params.boardId as string;
```

#### Änderung 3.2: Variable-Verwendung aktualisieren (Zeile 20-25)

**Vorher:**

```typescript
const {
  data: boardData,
  isLoading,
  error,
  initializeCanvas,
} = useBoardWithInitialization(boardId);
```

**Nachher:**

```typescript
const {
  data: boardData,
  isLoading,
  error,
  initializeCanvas,
} = useBoardWithInitialization(boardIdentifier);
```

### Verbesserung 2: Logging und Monitoring

**Datei:** [`app/api/boards/[id]/route.ts`](../app/api/boards/[id]/route.ts)

#### Änderung 4.1: Performance-Logging erweitern (Zeile 553-556)

**Vorher:**

```typescript
// Performance logging
const duration = Date.now() - startTime;
console.log(
  `[API] GET /api/boards/${boardId} completed in ${duration}ms (${elements.length} elements, ${connections.length} connections)`
);
```

**Nachher:**

```typescript
// Performance logging
const duration = Date.now() - startTime;
const identifierType = isUUID(boardId) ? "UUID" : "Slug";
console.log(
  `[API] GET /api/boards/${boardId} (${identifierType}) completed in ${duration}ms (${elements.length} elements, ${connections.length} connections)`
);
```

### Verbesserung 3: Slug-Redirect für alte URLs (Optional)

Falls Slugs änderbar sein sollen und alte URLs redirected werden sollen:

**Neue Datei:** `docs/slug-redirect-system.md`

````markdown
# Slug-Redirect System (Optional)

## Motivation

Wenn User Board-Slugs ändern können, sollten alte URLs zu neuen redirected werden.

## Implementierung

### 1. Neue Tabelle: slug_redirects

```sql
CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT slug_redirects_unique UNIQUE (old_slug)
);

CREATE INDEX slug_redirects_board_id_idx ON public.slug_redirects(board_id);
CREATE INDEX slug_redirects_old_slug_idx ON public.slug_redirects(old_slug);
```
````

### 2. API-Route erweitern

```typescript
// Bei Slug-Lookup: Erst direkt suchen, dann in Redirects
if (!isUUID(identifier)) {
  let result = await supabase
    .from("boards")
    .select("*")
    .eq("slug", identifier)
    .single();

  if (!result.data && result.error?.code === "PGRST116") {
    // Check slug_redirects
    const redirect = await supabase
      .from("slug_redirects")
      .select("board_id")
      .eq("old_slug", identifier)
      .single();

    if (redirect.data) {
      // Return redirect response
      return NextResponse.json(
        {
          redirect: true,
          newSlug: redirect.data.board_id,
        },
        { status: 301 }
      );
    }
  }
}
```

````

## Testing-Checkliste

### Pre-Deployment Tests

- [ ] **Test 1: UUID-basierter Zugriff**
  ```bash
  # Altes existierendes Board mit UUID aufrufen
  GET /api/boards/[existing-uuid]
  Expected: 200 OK mit Board-Daten
````

- [ ] **Test 2: Slug-basierter Zugriff**

  ```bash
  # Neues Board mit Slug aufrufen
  GET /api/boards/test-board-slug
  Expected: 200 OK mit Board-Daten
  ```

- [ ] **Test 3: Ungültiger Identifier**

  ```bash
  # Nicht existierender Slug
  GET /api/boards/does-not-exist-xyz
  Expected: 404 Not Found mit hilfreicher Fehlermeldung
  ```

- [ ] **Test 4: Board-Erstellung + Navigation**

  ```
  1. Create Board Dialog öffnen
  2. Titel: "My Test Board" eingeben
  3. Board erstellen (Submit)
  4. Expected:
     - Toast: "Board created successfully"
     - Dialog schließt sich
     - Navigation zu /builder/my-test-board
     - URL enthält Slug (nicht leer)
     - Board-Daten werden geladen
  ```

- [ ] **Test 5: Slug-Kollision zwischen Usern**

  ```
  1. User A erstellt Board "project-alpha"
  2. User B erstellt Board "project-alpha"
  3. Expected:
     - Beide Boards existieren
     - User A sieht sein Board unter /builder/project-alpha
     - User B sieht sein Board unter /builder/project-alpha
     - Keine Konflikte
  ```

- [ ] **Test 6: Unauthenticated Slug-Zugriff**
  ```bash
  # Öffentliches Board per Slug
  GET /api/boards/public-board (nicht authentifiziert)
  Expected: 200 OK wenn Board public, sonst 403
  ```

### Performance Tests

- [ ] **Test 7: Slug-Lookup Performance**

  ```
  Measure: Durchschnittliche Response-Zeit für Slug-Lookup
  Expected: < 200ms (mit Index)
  ```

- [ ] **Test 8: UUID-Lookup Performance**
  ```
  Measure: Durchschnittliche Response-Zeit für UUID-Lookup
  Expected: < 150ms (Primärschlüssel-Lookup)
  ```

### Regression Tests

- [ ] **Test 9: Bestehende Boards**

  ```
  Verify: Alle existierenden Boards (mit UUID-Links) funktionieren weiter
  ```

- [ ] **Test 10: Board-Operationen**
  ```
  - Board-Update
  - Board-Delete
  - Block-Operationen
  Expected: Alle funktionieren wie zuvor
  ```

## Deployment-Schritte

### 1. Pre-Deployment

```bash
# 1. Backup der Datenbank
# 2. Code auf Staging deployen
# 3. Tests durchführen
# 4. Monitoring-Alerts prüfen
```

### 2. Deployment

```bash
# 1. Code auf Production deployen
git push production main

# 2. Deployment-Status überwachen
# - Vercel/Your hosting dashboard
# - Check Logs für Fehler

# 3. Smoke Tests
curl https://your-domain.com/api/boards/[test-slug]
```

### 3. Post-Deployment

```bash
# 1. Monitoring für 1-2 Stunden
# - Error Rate
# - Response Times
# - 404 Rate

# 2. User-Feedback sammeln
# 3. Bei Problemen: Rollback bereit halten
```

## Rollback-Plan

Falls kritische Probleme auftreten:

```bash
# 1. Vorherige Version wiederherstellen
git revert [commit-hash]
git push production main

# 2. Alternative: Temporärer Fix
# Nur UUID-Lookup aktivieren, Slug-Lookup deaktivieren

# In app/api/boards/[id]/route.ts:
# Kommentiere fetchBoardByIdOrSlug aus
# Restore original .eq("id", boardId) lookup
```

## Monitoring nach Deployment

### Metriken zu überwachen

1. **API Response Times**

   - GET /api/boards/[id] average latency
   - 95th percentile latency

2. **Error Rates**

   - 404 Rate (sollte nicht steigen)
   - 500 Rate (sollte bei 0% bleiben)
   - UUID Parse Errors (sollten auf 0 fallen)

3. **Feature Adoption**
   - % Board-URLs mit Slug vs. UUID
   - Board-Erstellungen mit Navigation

### Logging-Queries

```typescript
// Beispiel: Supabase Analytics oder Custom Logging
SELECT
  COUNT(*) FILTER (WHERE identifier_type = 'UUID') as uuid_lookups,
  COUNT(*) FILTER (WHERE identifier_type = 'Slug') as slug_lookups,
  AVG(response_time_ms) as avg_response_time
FROM api_logs
WHERE endpoint = '/api/boards/[id]'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

## Success Criteria

✅ **Critical:**

- [ ] 0 UUID-Parse-Errors (PostgreSQL 22P02)
- [ ] 100% Board-Navigation nach Erstellung funktioniert
- [ ] Alle neuen Boards haben Slug in URL

✅ **Important:**

- [ ] API Response Times < 200ms für Slug-Lookups
- [ ] Keine Increase in 404 Rate
- [ ] Bestehende UUID-Links funktionieren weiter

✅ **Nice to Have:**

- [ ] Monitoring-Dashboard zeigt Slug vs. UUID Verwendung
- [ ] User-Feedback ist positiv
- [ ] Code-Review approved

## Code-Review Checkliste

Vor dem Merge prüfen:

- [ ] Alle Helper-Funktionen haben JSDoc-Kommentare
- [ ] Edge Cases sind dokumentiert
- [ ] Fehlerbehandlung ist vollständig
- [ ] Logging ist aussagekräftig
- [ ] Type Safety ist gewährleistet
- [ ] Tests sind erfolgreich
- [ ] Performance-Impact ist akzeptabel
- [ ] Backwards Compatibility ist gegeben

## Dokumentation Updates

Nach erfolgreichem Deployment:

- [ ] API-Dokumentation aktualisieren (UUID + Slug Support)
- [ ] README mit neuer URL-Struktur aktualisieren
- [ ] User-Guide: Slug-basierte URLs erklären
- [ ] Developer-Docs: fetchBoardByIdOrSlug dokumentieren

## Nächste Schritte nach diesem Ticket

**Potential Future Improvements:**

1. **Slug-Redirect System:** Alte Slugs zu neuen redirecten
2. **Analytics:** Dashboard für Slug vs. UUID Verwendung
3. **URL Shortener:** Noch kürzere Share-Links
4. **Custom Slugs:** User können Slug selbst wählen (bereits möglich)
5. **Slug-Validierung:** Reservierte Slugs (admin, api, etc.) blockieren

---

## Zusammenfassung

**Geschätzter Gesamtaufwand:** 3-4 Stunden

- Phase 1 (Critical): 2-3 Stunden
- Phase 2 (Improvements): 1 Stunde
- Testing: 1 Stunde

**Risk Level:** Low

- Keine Breaking Changes
- Keine DB-Migration
- Backwards Compatible
- Easy Rollback

**Impact:** High

- User Experience stark verbessert
- Technische Schuld reduziert
- Klare URL-Struktur
