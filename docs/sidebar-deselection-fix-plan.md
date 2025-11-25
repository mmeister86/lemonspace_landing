# Fix: Block-Deselection beim Klick in die Settings-Sidebar

## Problem

Beim Klick in die rechte Settings-Sidebar wird der aktuell ausgewählte Block auf dem Canvas deselektiert. Dies ist unerwünscht, da der User die Block-Eigenschaften in der Sidebar bearbeiten möchte, ohne die Auswahl zu verlieren.

## Root Cause Analyse

### Aktueller Code-Flow

1. **Click-Handler in [`builder-client.tsx`](../app/[locale]/builder/builder-client.tsx:269-300)**

   ```typescript
   const handleGlobalClick = (e: MouseEvent) => {
     if (isPreviewMode) return;
     if (selectedBlockIds.length === 0) return;

     const target = e.target as HTMLElement;
     if (!target) return;

     // Check if click is within the right sidebar
     const rightSidebar = document.querySelector(
       '[data-sidebar="sidebar"][data-side="right"]'
     );
     const isWithinRightSidebar = rightSidebar && rightSidebar.contains(target);

     // If click is not within selected blocks or right sidebar, deselect all
     if (!isWithinSelectedBlock && !isWithinRightSidebar) {
       selectBlock(null);
     }
   };
   ```

2. **RightSidebar Komponente** ([`RightSidebar.tsx`](../app/[locale]/builder/components/RightSidebar.tsx:10-14))

   ```typescript
   <Sidebar
       side="right"
       collapsible="none"
       className="w-full border-l bg-sidebar"
   >
   ```

3. **Sidebar UI-Komponente** ([`sidebar.tsx`](../components/ui/sidebar.tsx:261-306))
   - Die Sidebar-Komponente rendert eine komplexe DOM-Struktur
   - `data-side="right"` wird auf dem äußeren Container gesetzt (Zeile 267)
   - `data-sidebar="sidebar"` wird auf dem inneren Element gesetzt (Zeile 298)
   - Diese Attribute sind NICHT auf demselben Element

### Das Problem im Detail

Der Selector `[data-sidebar="sidebar"][data-side="right"]` sucht nach einem Element, das **beide** Attribute hat:

- `data-sidebar="sidebar"`
- `data-side="right"`

**Tatsächliche DOM-Struktur der rechten Sidebar:**

```html
<div
  data-side="right"
  data-state="expanded"
  data-collapsible=""
  data-variant="sidebar"
  data-slot="sidebar"
>
  <div data-slot="sidebar-gap" />
  <div data-slot="sidebar-container">
    <div data-sidebar="sidebar" data-slot="sidebar-inner">
      <!-- Hier ist der eigentliche Inhalt (PropertiesPanel) -->
      <div data-sidebar="header">Settings</div>
      <div data-sidebar="content">
        <!-- PropertiesPanel content -->
      </div>
    </div>
  </div>
</div>
```

**Das Problem:** `data-sidebar="sidebar"` und `data-side="right"` befinden sich auf **verschiedenen Elementen**. Der Selector findet kein Match, daher wird `isWithinRightSidebar` zu `false` und Klicks in der Sidebar werden als "außerhalb" interpretiert.

## Lösung 1: Verbesserten Selector verwenden (Empfohlen)

Diese Lösung ist minimal-invasiv und nutzt die vorhandene DOM-Struktur.

### Implementierung

**Datei:** [`app/[locale]/builder/builder-client.tsx`](../app/[locale]/builder/builder-client.tsx:286-288)

**Änderung:**

```typescript
// VORHER (funktioniert nicht):
const rightSidebar = document.querySelector(
  '[data-sidebar="sidebar"][data-side="right"]'
);
const isWithinRightSidebar = rightSidebar && rightSidebar.contains(target);

// NACHHER (funktioniert):
// Finde das äußere Container-Element mit data-side="right"
const rightSidebarContainer = document.querySelector('[data-side="right"]');
const isWithinRightSidebar =
  rightSidebarContainer && rightSidebarContainer.contains(target);
```

### Erklärung

1. Wir suchen nur nach `[data-side="right"]` anstatt der Kombination
2. Das äußere Container-Element hat bereits `data-side="right"` gesetzt
3. `.contains(target)` prüft, ob der Klick **irgendwo** innerhalb dieses Containers erfolgte
4. Das schließt alle Kinder-Elemente ein (inkl. `data-sidebar="sidebar"`, Header, Content, PropertiesPanel, etc.)

### Vorteile

✅ Minimale Code-Änderung (nur 1 Zeile)
✅ Nutzt vorhandene DOM-Struktur
✅ Keine Änderungen an anderen Komponenten nötig
✅ Funktioniert für alle Inhalte der rechten Sidebar
✅ Robust gegenüber Änderungen im PropertiesPanel

### Potenzielle Edge Cases

⚠️ **Falls es mehrere Elemente mit `data-side="right"` gibt:**

- Lösung: Spezifischeren Selector verwenden: `[data-slot="sidebar"][data-side="right"]`

⚠️ **Falls die Sidebar auf Mobile anders rendert:**

- Die Lösung funktioniert auch für Mobile, da `.contains()` den gesamten Subtree prüft

## Lösung 2: Custom Data-Attribut (Alternative)

Falls die Lösung 1 nicht robust genug ist, kann ein custom Attribut hinzugefügt werden.

### Implementierung

**Datei 1:** [`app/[locale]/builder/components/RightSidebar.tsx`](../app/[locale]/builder/components/RightSidebar.tsx:10-14)

```typescript
// ÄNDERUNG:
<Sidebar
    side="right"
    collapsible="none"
    className="w-full border-l bg-sidebar"
    data-properties-sidebar="true"  // ← Neu hinzufügen
>
```

**Datei 2:** [`app/[locale]/builder/builder-client.tsx`](../app/[locale]/builder/builder-client.tsx:286-288)

```typescript
// ÄNDERUNG:
const rightSidebar = document.querySelector('[data-properties-sidebar="true"]');
const isWithinRightSidebar = rightSidebar && rightSidebar.contains(target);
```

### Vorteile von Lösung 2

✅ Sehr explizit - klar erkennbar, was gemeint ist
✅ Unabhängig von der internen Sidebar-Implementierung
✅ Einfacher zu debuggen

### Nachteile

❌ Erfordert Änderungen in 2 Dateien
❌ Propagation des custom Attributs durch die Sidebar-Komponente notwendig

## Empfehlung

**Verwende Lösung 1** mit dem verbesserten Selector:

```typescript
const rightSidebarContainer = document.querySelector(
  '[data-slot="sidebar"][data-side="right"]'
);
const isWithinRightSidebar =
  rightSidebarContainer && rightSidebarContainer.contains(target);
```

Der zusätzliche `[data-slot="sidebar"]` Selector macht es noch spezifischer und vermeidet potenzielle Konflikte mit anderen Elementen, die eventuell `data-side="right"` haben könnten.

## Testing Plan

Nach der Implementierung sollten folgende Szenarien getestet werden:

1. ✅ **Block auswählen und in Sidebar klicken**

   - Block bleibt ausgewählt
   - PropertiesPanel bleibt sichtbar

2. ✅ **Block auswählen und auf Canvas (außerhalb des Blocks) klicken**

   - Block wird deselektiert
   - PropertiesPanel zeigt "Kein Block ausgewählt"

3. ✅ **Block auswählen und auf anderen Block klicken**

   - Neuer Block wird ausgewählt
   - PropertiesPanel zeigt neuen Block

4. ✅ **In Sidebar-Header klicken**

   - Block bleibt ausgewählt

5. ✅ **In Input-Felder der PropertiesPanel klicken**

   - Block bleibt ausgewählt
   - Input erhält Focus

6. ✅ **Im Preview-Modus**
   - Keine Deselection, da Preview-Modus deaktiviert ist

## Implementierungs-Code

### Finale Änderung in [`builder-client.tsx`](../app/[locale]/builder/builder-client.tsx:286-288)

```typescript
// Check if click is within the right sidebar
// Use data-slot and data-side to find the outer container
const rightSidebarContainer = document.querySelector(
  '[data-slot="sidebar"][data-side="right"]'
);
const isWithinRightSidebar =
  rightSidebarContainer && rightSidebarContainer.contains(target);
```

Das ist die einzige benötigte Änderung!

## Weitere Überlegungen

### Performance

Die `.contains()` Methode ist effizient (O(n) im schlimmsten Fall, aber n ist die Tiefe des DOM-Baums, nicht die Anzahl aller Elemente). Bei normalen Sidebar-Strukturen ist dies vernachlässigbar.

### Accessibility

Die Lösung hat keine Auswirkungen auf Accessibility, da sie nur die Click-Detection verbessert.

### Browser-Kompatibilität

`.contains()` wird von allen modernen Browsern unterstützt (IE9+, alle evergreen Browser).

## Zusammenfassung

- **Problem:** Selector findet rechte Sidebar nicht, weil data-Attribute auf verschiedenen DOM-Ebenen sind
- **Root Cause:** `[data-sidebar="sidebar"][data-side="right"]` matched kein Element
- **Lösung:** Selector ändern zu `[data-slot="sidebar"][data-side="right"]`
- **Aufwand:** 1 Zeile Code ändern
- **Impact:** Minimal, nur positive Auswirkungen
