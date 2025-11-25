// Test-Skript zur Überprüfung der Sidebar-Deselektion-Fixes
// In Browser-Konsole ausführen, um die Implementierung zu testen

console.log("=== Sidebar Deselection Fix Test ===");

// 1. Test: RightSidebar mit custom data-Attribut
const rightSidebar = document.querySelector('[data-properties-sidebar="true"]');
console.log("1. RightSidebar gefunden:", rightSidebar !== null);
if (rightSidebar) {
    console.log("   RightSidebar Element:", rightSidebar);
    console.log("   Klassen:", rightSidebar.className);
} else {
    console.log("   ❌ RightSidebar nicht gefunden!");
    console.log("   Alle Elemente mit data-properties-sidebar:", document.querySelectorAll('[data-properties-sidebar="true"]'));
}

// 2. Test: Dialog-Overlay
const dialogOverlay = document.querySelector('[data-slot="dialog-overlay"]');
console.log("2. Dialog-Overlay gefunden:", dialogOverlay !== null);
if (!dialogOverlay) {
    console.log("   ℹ️ Kein Dialog aktuell offen - das ist normal");
}

// 3. Test: Ausgewählte Blöcke finden
const selectedBlocks = document.querySelectorAll('[data-block-id]');
console.log("3. Blöcke mit data-block-id Attribut:", selectedBlocks.length);

// 4. Test: Globaler Click-Handler prüfen
// Wir können den Handler nicht direkt testen, aber wir können die Logik simulieren
function testClickLogic(targetElement) {
    if (!targetElement) return false;

    // Simuliere die Logik aus builder-client.tsx
    const selectedBlockIds = Array.from(document.querySelectorAll('[data-block-id]')).map(el => el.getAttribute('data-block-id'));

    const isWithinSelectedBlock = selectedBlockIds.some(blockId => {
        const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
        return blockElement && blockElement.contains(targetElement);
    });

    const rightSidebar = document.querySelector('[data-properties-sidebar="true"]');
    const isWithinRightSidebar = rightSidebar && rightSidebar.contains(targetElement);

    const dialogOverlay = document.querySelector('[data-slot="dialog-overlay"]');
    const isWithinDialog = dialogOverlay && dialogOverlay.contains(targetElement);

    const shouldDeselect = !isWithinSelectedBlock && !isWithinRightSidebar && !isWithinDialog;

    return {
        shouldDeselect,
        isWithinSelectedBlock,
        isWithinRightSidebar,
        isWithinDialog
    };
}

// 5. Manuelle Tests
console.log("\n=== Manuelle Click-Tests ===");
console.log("Führe folgende Tests manuell in der UI durch:");
console.log("1. Wähle einen Block aus");
console.log("2. Klicke in die Properties Panel - sollte NICHT deselektieren");
console.log("3. Klicke auf Löschen-Button in Properties Panel - sollte NICHT deselektieren");
console.log("4. Öffne einen Dialog und klicke darin - sollte NICHT deselektieren");
console.log("5. Klicke auf leeren Canvas-Bereich - sollte deselektieren");

// Test-Funktion für manuelle Überprüfung
window.testClickTarget = function(element) {
    const result = testClickLogic(element);
    console.log("Click-Test für:", element);
    console.log("Result:", result);
    console.log("Aktion:", result.shouldDeselect ? "DESELEKTIEREN" : "BEIBEHALTEN");
    return result;
};

console.log("\nVerwende window.testClickTarget(element) um Clicks zu testen");
console.log("Beispiel: window.testClickTarget(document.querySelector('input'))");
