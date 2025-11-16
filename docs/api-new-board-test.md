# API-Route `/api/new-board` - Test-Dokumentation

## Testfälle

### 1. Erfolgreiche Board-Erstellung

**Request:**

```bash
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{
    "title": "Mein Test Board",
    "slug": "mein-test-board"
  }'
```

**Erwartete Response:**

```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "title": "Mein Test Board",
  "slug": "mein-test-board",
  "grid_config": { "columns": 4, "gap": 16 },
  "blocks": [],
  "created_at": "2025-11-16T12:00:00.000Z",
  "updated_at": "2025-11-16T12:00:00.000Z"
}
```

**Status:** 201 Created

### 2. Automatische Slug-Generierung

**Request:**

```bash
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{
    "title": "Mein Awesome Board 2024!"
  }'
```

**Erwartete Response:**

```json
{
  "title": "Mein Awesome Board 2024!",
  "slug": "mein-awesome-board-2024"
}
```

### 3. Mit Grid-Config und Blocks

**Request:**

```bash
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{
    "title": "Board mit Layout",
    "grid_config": {
      "columns": 2,
      "gap": 24
    },
    "blocks": [
      {
        "id": "block-1",
        "type": "text",
        "data": {"content": "Hello World"}
      }
    ]
  }'
```

### 4. Fehlerfälle

#### 4.1 Nicht authentifiziert

```bash
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
```

**Status:** 401 Unauthorized

#### 4.2 Ungültiger Titel

```bash
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{"title": "AB"}'
```

**Status:** 400 Bad Request
**Response:** `{"error": "Ungültige Eingabedaten", "details": {"title": ["Titel muss mindestens 3 Zeichen haben"]}}`

#### 4.3 Ungültiger Slug

```bash
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{"title": "Test Board", "slug": "Invalid Slug!"}'
```

**Status:** 400 Bad Request

#### 4.4 Ungültige Grid-Config

```bash
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{
    "title": "Test Board",
    "grid_config": {
      "columns": 10,
      "gap": -5
    }
  }'
```

**Status:** 400 Bad Request

## Manuelle Tests im Browser

1. **Login durchführen** und Cookies speichern
2. **Developer Console öffnen** und folgenden Code ausführen:

```javascript
// Test 1: Erfolgreiche Erstellung
fetch("/api/new-board", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Test Board " + Date.now(),
    slug: "test-" + Date.now(),
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);

// Test 2: Mit vollständigen Daten
fetch("/api/new-board", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Full Board " + Date.now(),
    grid_config: { columns: 3, gap: 20 },
    blocks: [
      {
        id: "block-" + Date.now(),
        type: "text",
        data: { content: "Hello from API" },
      },
    ],
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

## Integrationstests

### React Component Test

```typescript
// Test für CreateBoardDialog Integration
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateBoardDialog } from "./CreateBoardDialog";

test("should create board via API", async () => {
  const mockCreateBoard = jest.fn().mockResolvedValue({
    id: "test-id",
    title: "Test Board",
    slug: "test-board",
  });

  render(<CreateBoardDialog open={true} onOpenChange={jest.fn()} />);

  // Titel eingeben
  fireEvent.change(screen.getByLabelText(/titel/i), {
    target: { value: "Test Board" },
  });

  // Submit klicken
  fireEvent.click(screen.getByRole("button", { name: /erstellen/i }));

  await waitFor(() => {
    expect(mockCreateBoard).toHaveBeenCalledWith({
      title: "Test Board",
      slug: "test-board",
      grid_config: { columns: 4, gap: 16 },
      blocks: [],
    });
  });
});
```

## Performance-Tests

### Load Test mit Artillery

```yaml
# artillery-config.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
  payload:
    path: "payload.json"

scenarios:
  - name: "Create Board"
    weight: 100
    flow:
      - post:
          url: "/api/new-board"
          headers:
            Content-Type: "application/json"
          json:
            title: "Load Test Board {{ $randomString() }}"
            slug: "load-test-{{ $randomString() }}"
```

## Sicherheits-Tests

### SQL Injection Versuche

```bash
# SQL Injection im Titel
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{
    "title": "'; DROP TABLE boards; --",
    "slug": "sql-injection-test"
  }'
```

**Erwartet:** 400 Bad Request (Validierung fehlschlägt)

### XSS Versuche

```bash
# XSS im Titel
curl -X POST http://localhost:3000/api/new-board \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{
    "title": "<script>alert('XSS')</script>",
    "slug": "xss-test"
  }'
```

**Erwartet:** 201 Created (Script wird in Datenbank gespeichert, aber nicht ausgeführt)

## Monitoring und Logging

### Log-Muster

```typescript
// Erfolgreiche Erstellung
console.log(`[API] Board created: ${board.id} by user ${user.id}`);

// Fehlerfälle
console.error(`[API] Board creation failed:`, {
  error: insertError,
  userId: user.id,
  requestData: validatedData,
});
```

### Metriken

- Response Time: < 200ms (Target)
- Success Rate: > 99%
- Error Rate: < 1%
- Concurrent Users: Support für 100+ gleichzeitige Requests
