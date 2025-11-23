# Color Picker Remaining Issues - Analysis & Fix Plan

## Current Status

After implementing the ProseKit `toggleMark` fix, the text color feature is **mostly working**:

✅ **Working:**

- Color applies correctly in Properties Panel (sidebar)
- Color displays correctly in Preview mode
- Color persists after save/reload
- The core functionality is fixed

❌ **Not Working:**

1. Color picker jumps around when dragging
2. Color doesn't display in Canvas (builder mode)

## Issue 1: Color Picker Jumping Around

### Problem Description

When dragging the color picker handle, the selected color jumps back to black or other colors instead of smoothly following the drag.

### Root Cause

[`ColorPicker.tsx:17-25`](../app/[locale]/builder/components/blocks/ColorPicker.tsx:17-25):

```typescript
const currentColor = useEditorDerivedValue((editor) => {
  if (!editor.mounted) return "#000000";
  const state = editor.view.state;
  const { selection } = state;
  const { $from } = selection;
  const marks = $from.marks();
  const colorMark = marks.find((m: Mark) => m.type.name === "textColor");
  return (colorMark ? colorMark.attrs.color : "#000000") as string;
});
```

**The Issue:**

1. User drags color picker → `handleColorChange(color)` fires
2. This calls `editor.commands.setTextColor({ color })` (via `toggleMark`)
3. `toggleMark` **toggles** the mark (removes if exists, adds if doesn't)
4. Editor state changes → `useEditorDerivedValue` re-runs
5. During rapid dragging, the toggle behavior causes marks to be added/removed repeatedly
6. The derived value reads from cursor position, which may not have the mark yet
7. Result: color jumps between the new color and black

**Why it happens:**

- `toggleMark` is designed for on/off toggle (like bold/italic)
- Color picker needs **set** behavior, not toggle
- Rapid `onChange` events during dragging cause race conditions

### Solution

We need two separate commands:

1. `setTextColor` - always sets color (doesn't toggle)
2. `toggleTextColor` - toggles color on/off (for keyboard shortcuts)

#### Option A: Use `toggleMark` with proper check (Recommended)

ProseKit's `toggleMark` checks if mark exists before toggling. We need to prevent toggle behavior by always removing first, then adding:

```typescript
import { defineMarkSpec, defineCommands, union } from "prosekit/core";

export function defineTextColor() {
  return union([
    defineMarkSpec({
      name: "textColor",
      attrs: {
        color: { default: null },
      },
      parseDOM: [
        {
          style: "color",
          getAttrs: (value) => {
            return { color: value };
          },
        },
      ],
      toDOM: (node) => {
        return ["span", { style: `color: ${node.attrs.color}` }, 0];
      },
    }),
    defineCommands({
      // Always SET color, don't toggle
      setTextColor: ({ color }: { color: string }) => {
        return (state, dispatch) => {
          const { selection, schema } = state;
          const { from, to } = selection;
          const markType = schema.marks.textColor;

          if (!markType || !dispatch) return false;

          // Remove any existing textColor mark first
          let tr = state.tr.removeMark(from, to, markType);

          // Then add the new color
          tr = tr.addMark(from, to, markType.create({ color }));

          // For empty selections, use stored marks
          if (selection.empty) {
            tr = tr.addStoredMark(markType.create({ color }));
          }

          dispatch(tr);
          return true;
        };
      },
      // Remove color completely
      removeTextColor: () => {
        return (state, dispatch) => {
          const { selection, schema } = state;
          const { from, to } = selection;
          const markType = schema.marks.textColor;

          if (!markType || !dispatch) return false;

          let tr = state.tr.removeMark(from, to, markType);

          if (selection.empty) {
            tr = tr.removeStoredMark(markType);
          }

          dispatch(tr);
          return true;
        };
      },
    }),
  ]);
}
```

#### Option B: Debounce the color change (Additional improvement)

Add debouncing to the `handleColorChange` to reduce update frequency:

```typescript
import { useCallback } from "react";
import { debounce } from "lodash"; // or implement simple debounce

export function ColorPicker() {
  const editor = useEditor<EditorExtension>();

  const currentColor = useEditorDerivedValue((editor) => {
    if (!editor.mounted) return "#000000";
    const state = editor.view.state;
    const { selection } = state;
    const { $from } = selection;
    const marks = $from.marks();
    const colorMark = marks.find((m: Mark) => m.type.name === "textColor");
    return (colorMark ? colorMark.attrs.color : "#000000") as string;
  });

  // Debounce color changes during dragging
  const handleColorChange = useCallback(
    debounce((color: string) => {
      editor.commands.setTextColor({ color });
    }, 50), // 50ms debounce
    [editor]
  );

  return (
    <DropdownMenu>
      {/* ... */}
      <HexColorPicker color={currentColor} onChange={handleColorChange} />
      {/* ... */}
    </DropdownMenu>
  );
}
```

**Recommendation:** Use Option A (fix the command) + Option B (debounce) for best UX.

## Issue 2: Color Not Showing in Canvas

### Problem Description

Color works in:

- ✅ Properties Panel (sidebar)
- ✅ Preview mode

But NOT in:

- ❌ Canvas (builder mode)

### Root Cause Analysis

Looking at [`TextBlock.tsx:57`](../app/[locale]/builder/components/blocks/TextBlock.tsx:57):

```typescript
<div
  ref={editor.mount}
  className={cn("min-h-[50px] h-full")}
  contentEditable={false} // ← This is the issue
/>
```

**The Problem:**

1. `contentEditable={false}` makes the editor read-only
2. ProseKit editor is mounted but in read-only mode
3. **The editor is displaying the content correctly** (color marks are there)
4. But the Canvas wrapper might be hiding it or overriding styles

Looking at [`Canvas.tsx:95-101`](../app/[locale]/builder/components/Canvas.tsx:95-101):

```typescript
className={cn(
    isPreviewMode
        ? ""
        : "p-4 border rounded-lg bg-background relative cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
    !isPreviewMode && isSelected &&
        "ring-2 ring-primary ring-offset-2 border-primary"
)}
```

The Canvas wrapper adds styling around blocks in builder mode but should not affect text colors.

### Hypothesis

The color **IS** being rendered but may not be visible due to:

1. **CSS Specificity Issues**: The Tailwind `.prose` class might be overriding color styles
2. **Missing ProseKit CSS**: Line 10 in TextBlock.tsx has commented out: `// import "prosekit/basic/style.css";`
3. **Z-index/Opacity Issues**: Canvas wrapper might have overlays

### Solution

#### Step 1: Uncomment ProseKit Styles

```typescript
// TextBlock.tsx
import "prosekit/basic/style.css"; // ← UNCOMMENT THIS
```

#### Step 2: Check Prose Class Override

The `.prose` class from Tailwind Typography might be overriding inline styles. Add custom CSS:

```typescript
// TextBlock.tsx
<div
    className={cn(
        "prose dark:prose-invert max-w-none flex-1 overflow-y-auto",
        !isPreviewMode && "p-4",
        "[&_span[style*='color']]:!text-[var(--color)]" // Force color styles
    )}
>
```

Or better, use CSS custom properties:

```css
/* In your global CSS or TextBlock styles */
.prose span[style*="color"] {
  color: inherit !important; /* Don't override inline colors */
}
```

#### Step 3: Verify Editor Mount

Ensure the editor is actually mounting and rendering in Canvas:

```typescript
const editor = useMemo(() => {
  return createEditor({
    extension,
    defaultContent:
      (block.data.content as NodeJSON | string | undefined) || undefined,
    editable: !isPreviewMode, // Make editable in builder mode? (test this)
  });
}, [extension, block.id, isPreviewMode]);
```

### Testing Approach

1. **Enable ProseKit styles**: Uncomment the import
2. **Inspect DOM**: Check if color styles are actually in the HTML
3. **CSS specificity**: Add `!important` to force color display
4. **Editor editable state**: Test if making editor editable in builder mode helps

## Implementation Plan

### Priority 1: Fix Color Not Showing in Canvas

This is more critical because color is completely invisible.

**Steps:**

1. Uncomment `import "prosekit/basic/style.css";` in TextBlock.tsx
2. Add CSS override for prose color styles
3. Test if colors appear
4. If not, inspect DOM to see if color styles are present
5. Debug CSS specificity issues

### Priority 2: Fix Color Picker Jumping

Once colors are visible, fix the jumping:

**Steps:**

1. Update `setTextColor` command to always set (remove + add)
2. Add stored marks support for empty selections
3. Add debouncing to `handleColorChange`
4. Test smooth dragging

## Summary

| Issue               | Root Cause                                   | Solution                                     | Priority |
| ------------------- | -------------------------------------------- | -------------------------------------------- | -------- |
| Color not in Canvas | ProseKit CSS not loaded or `.prose` override | Uncomment CSS import + override prose styles | High     |
| Picker jumps        | `toggleMark` toggles on/off + rapid updates  | Change to always-set + debounce              | Medium   |

Both issues are fixable with relatively simple changes. The Canvas issue is more critical as it affects core visibility.

## Next Steps

1. Switch to code mode
2. Implement Canvas color fix first (uncomment CSS, add overrides)
3. Test and verify colors show in Canvas
4. Then fix picker jumping (update command + debounce)
5. Final testing of all scenarios
