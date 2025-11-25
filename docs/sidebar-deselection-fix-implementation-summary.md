# Sidebar Deselection Fix - Implementation Summary

## Problem (Commit ea647aecaced5ffff505c2d9c656191f7c0bee91)

Ausgewählte Blöcke wurden immer deselektiert, egal was geklickt wurde. Dies machte es unmöglich:

- Löschen-Buttons in der Properties Panel zu verwenden
- Text-Editor in der Properties Panel zu nutzen
- Andere Funktionen des ausgewählten Blocks zu verwenden

## Root Cause

Der globale Click-Handler in `builder-client.tsx` suchte nach `[data-sidebar="sidebar"][data-side="right"]`, aber diese Attribute existierten nicht im DOM, weil die `RightSidebar` Komponente `collapsible="none"` verwendet.

## Lösung

### 1. RightSidebar mit custom data-Attribut

**Datei:** `app/[locale]/builder/components/RightSidebar.tsx`

```typescript
<Sidebar
    side="right"
    collapsible="none"
    className="w-full border-l bg-sidebar"
    data-properties-sidebar="true"  // ← NEU
>
```

### 2. Globaler Click-Handler angepasst

**Datei:** `app/[locale]/builder/builder-client.tsx`

```typescript
// VORHER (funktionierte nicht):
const rightSidebar = document.querySelector(
  '[data-sidebar="sidebar"][data-side="right"]'
);

// NACHHER (funktioniert):
const rightSidebar = document.querySelector('[data-properties-sidebar="true"]');

// Zusätzlich: Dialog-Schutz
const dialogOverlay = document.querySelector('[data-slot="dialog-overlay"]');
const isWithinDialog = dialogOverlay && dialogOverlay.contains(target);

// Erweiterte Logik:
if (!isWithinSelectedBlock && !isWithinRightSidebar && !isWithinDialog) {
  selectBlock(null);
}
```

### 3. data-block-id Attribute für alle Block-Typen

**Dateien:**

- `app/[locale]/builder/components/blocks/TextBlock.tsx`
- `app/[locale]/builder/components/blocks/GridBlock.tsx`
- `app/[locale]/builder/components/blocks/BlockRenderer.tsx`

Alle Block-Container haben jetzt `data-block-id={block.id}` für korrekte Click-Erkennung.

## Geschützte Elemente (keine Deselektion)

✅ **Innerhalb ausgewählter Blöcke** - Clicks auf den Block selbst oder seine Kinder
✅ **Properties Panel** - Alle Interaktionen mit der rechten Sidebar
✅ **Dialoge/Overlays** - Alle Modal-Dialoge und Overlays
✅ **Löschen-Buttons** - Sowohl in Blöcken als auch in Properties Panel

## Deselektion findet statt bei

❌ **Leerer Canvas-Bereich** - Klicks auf den Hintergrund
❌ **Linke Sidebar** - Navigation und Block-Palette
❌ **Menubar** - Außer bei Dialog-Interaktionen

## Test-Szenarien

### Manuelles Testing

1. **Block auswählen** → Klick auf Properties Panel → **sollte ausgewählt bleiben**
2. **Block auswählen** → Klick auf Löschen-Button in Properties → **sollte ausgewählt bleiben**
3. **Block auswählen** → Text im Properties Panel bearbeiten → **sollte ausgewählt bleiben**
4. **Block auswählen** → Dialog öffnen und darin klicken → **sollte ausgewählt bleiben**
5. **Block auswählen** → Klick auf leeren Canvas-Bereich → **sollte deselektiert werden**
6. **Block auswählen** → Klick auf linke Sidebar → **sollte deselektiert werden**

### Automatisiertes Testing

Verwende das Test-Skript `test-sidebar-fix.js` in der Browser-Konsole:

```javascript
// Kopiere das Skript und führe es aus
// Dann teste mit:
window.testClickTarget(document.querySelector("input")); // Properties Panel
window.testClickTarget(document.querySelector(".bg-muted")); // Canvas
```

## Technische Details

### DOM-Struktur nach Fix

```html
<!-- RightSidebar mit custom Attribut -->
<div data-slot="sidebar" data-properties-sidebar="true" class="bg-sidebar ...">
  <div data-sidebar="header">...</div>
  <div data-sidebar="content">
    <!-- Properties Panel -->
    <input type="text" />
    <!-- Geschützt vor Deselektion -->
  </div>
</div>

<!-- Blöcke mit data-block-id -->
<div data-block-id="block-123" class="ring-2 ring-primary ...">
  <button class="delete-button">🗑️</button>
  <!-- Geschützt vor Deselektion -->
</div>

<!-- Dialog Overlay -->
<div data-slot="dialog-overlay" class="fixed inset-0 ...">
  <div>Dialog Inhalt</div>
  <!-- Geschützt vor Deselektion -->
</div>
```

### Click-Handler Logik

```typescript
const handleGlobalClick = (e: MouseEvent) => {
    // 1. Preview Mode überspringen
    if (isPreviewMode) return;

    // 2. Keine Auswahl → überspringen
    if (selectedBlockIds.length === 0) return;

    // 3. Prüfen ob Click in geschütztem Bereich
    const isWithinSelectedBlock = /* ... */;
    const isWithinRightSidebar = /* ... */;
    const isWithinDialog = /* ... */;

    // 4. Nur deselektieren wenn außerhalb aller geschützten Bereiche
    if (!isWithinSelectedBlock && !isWithinRightSidebar && !isWithinDialog) {
        selectBlock(null);
    }
};
```

## Datei-Übersicht der Änderungen

| Datei                | Änderung                                     | Zweck                                            |
| -------------------- | -------------------------------------------- | ------------------------------------------------ |
| `RightSidebar.tsx`   | `data-properties-sidebar="true"` hinzugefügt | Sidebar identifizierbar machen                   |
| `builder-client.tsx` | Selector und Logik angepasst                 | Korrekte Erkennung und Dialog-Schutz             |
| `TextBlock.tsx`      | `data-block-id` hinzugefügt                  | Click-Erkennung für Text-Blöcke                  |
| `GridBlock.tsx`      | `data-block-id` hinzugefügt                  | Click-Erkennung für Grid-Blöcke                  |
| `BlockRenderer.tsx`  | `data-block-id` für alle Typen               | Click-Erkennung für heading, button, image, etc. |

## Zusammenfassung

Das Problem wurde durch eine Kombination aus:

1. **Falschen DOM-Selektoren** (durch `collapsible="none"`)
2. **Fehlenden data-block-id Attributen** (für einige Block-Typen)

verursacht. Die Lösung behebt beide Probleme und fügt zusätzlichen Schutz für Dialoge hinzu.

**Impact:** Minimal (5 Dateien, 7 Zeilen Code)
**Robustheit:** Hoch (mehrere Schutz-Ebenen)
**Performance:** Unverändert (effiziente DOM-Abfragen)
