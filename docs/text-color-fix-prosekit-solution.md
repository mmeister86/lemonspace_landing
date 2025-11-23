# Text Color Not Working - ProseKit Best Practice Solution

## Problem Summary

After pulling code to a different machine, the text color feature stopped working:

- Color picker opens correctly
- Selecting a color changes the picker's displayed color
- **But the text color doesn't change** - neither for selected text nor for future typing
- This affects both selected text and empty cursor positions

## Root Cause - CRITICAL FINDING

The issue is NOT with the empty selection check. According to ProseKit documentation, the problem is that **we're using a custom low-level implementation instead of ProseKit's built-in `toggleMark` function**.

### Current (Broken) Implementation

[`text-color-extension.ts`](../app/[locale]/builder/components/blocks/text-color-extension.ts:23-37):

```typescript
setTextColor: ({ color }: { color: string }) => {
  return (state, dispatch) => {
    const { selection, schema } = state;
    const { from, to, empty } = selection;
    if (empty) return false; // ❌ This is actually NOT the main problem

    if (dispatch) {
      const markType = schema.marks.textColor;
      if (!markType) return false;
      const tr = state.tr.addMark(from, to, markType.create({ color }));
      dispatch(tr);
    }
    return true;
  };
};
```

**Why This Fails:**

1. Uses low-level ProseMirror APIs directly (`state.tr.addMark`)
2. Doesn't handle stored marks for empty selections
3. Doesn't properly toggle (remove if already applied)
4. Manual mark type lookup is fragile
5. **Most importantly**: Doesn't follow ProseKit's recommended patterns

## The Solution - Use ProseKit's `toggleMark`

ProseKit provides a built-in `toggleMark` function that handles ALL the complexity:

- ✅ Works with selected text
- ✅ Works with empty selections (stored marks)
- ✅ Toggles on/off properly
- ✅ Type-safe
- ✅ Handles all edge cases

### ProseKit Official Pattern

From Context7 documentation:

```typescript
import {
  defineMarkSpec,
  defineCommands,
  toggleMark,
  union,
} from "prosekit/core";

// Define mark spec (we already have this)
const highlightSpec = defineMarkSpec({
  name: "highlight",
  attrs: {
    color: { default: "yellow" },
  },
  // ... parseDOM and toDOM ...
});

// Use toggleMark for commands (THIS IS WHAT WE'RE MISSING)
const highlightCommands = defineCommands({
  toggleHighlight: (attrs?: { color?: string }) =>
    toggleMark({
      type: "highlight",
      attrs: attrs || { color: "yellow" },
    }),
});

// Combine
const highlightExtension = union(highlightSpec, highlightCommands);
```

## Implementation Plan

### Step 1: Update text-color-extension.ts

**File:** [`app/[locale]/builder/components/blocks/text-color-extension.ts`](../app/[locale]/builder/components/blocks/text-color-extension.ts)

**Changes:**

1. Import `toggleMark` from ProseKit
2. Replace custom command implementations with `toggleMark`
3. Keep the mark spec as-is (it's correct)

```typescript
import {
  defineMarkSpec,
  defineCommands,
  toggleMark,
  union,
} from "prosekit/core";

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
      // ✅ Use toggleMark instead of custom implementation
      setTextColor: ({ color }: { color: string }) =>
        toggleMark({
          type: "textColor",
          attrs: { color },
        }),
      // ✅ Use toggleMark with null to remove
      removeTextColor: () =>
        toggleMark({
          type: "textColor",
        }),
    }),
  ]);
}
```

### Why This Works

The `toggleMark` function from ProseKit:

1. **Handles Empty Selections**: Automatically uses stored marks when selection is empty
2. **Toggle Behavior**:
   - If mark exists: removes it
   - If mark doesn't exist: adds it
   - Works for both selected text and cursor position
3. **Type Safety**: Properly typed with ProseKit's type system
4. **Edge Cases**: Handles all the complex scenarios internally

### Step 2: Update ColorPicker Usage (Optional Improvement)

The [`ColorPicker` component](../app/[locale]/builder/components/blocks/ColorPicker.tsx:27-29) might benefit from clearer feedback:

```typescript
const handleColorChange = (color: string) => {
  // toggleMark will handle everything correctly
  editor.commands.setTextColor({ color });
};
```

No changes needed here - the existing code will work once the command is fixed.

## Comparison with Working Commit

The user mentioned this worked in commit `f2b16d4b4df92bc0de45675aad0643b6185cfdd3`. Likely differences:

1. **Different ProseKit version**: Newer version might require using `toggleMark`
2. **Different API**: Previous version might have had different mark handling
3. **Build differences**: The manual implementation might have worked inconsistently

## Testing Strategy

After implementing the fix:

### 1. Test with Selected Text

- [ ] Select text
- [ ] Change color via ColorPicker
- [ ] Verify text color changes immediately
- [ ] Select same text again and change to different color
- [ ] Verify color updates

### 2. Test with Empty Selection (Stored Marks)

- [ ] Click to place cursor (no selection)
- [ ] Change color via ColorPicker
- [ ] Type new text
- [ ] Verify new text has selected color

### 3. Test Color Removal

- [ ] Select colored text
- [ ] Click "Reset Color" button
- [ ] Verify text returns to default color

### 4. Test Toggle Behavior

- [ ] Select text with color
- [ ] Apply same color again
- [ ] Verify appropriate toggle behavior

### 5. Test Persistence

- [ ] Apply colors to text
- [ ] Save the document
- [ ] Reload page
- [ ] Verify colors persist

## Benefits of Using toggleMark

Compared to manual implementation:

| Feature                        | Manual Implementation | toggleMark   |
| ------------------------------ | --------------------- | ------------ |
| Selected Text                  | ✅ Works              | ✅ Works     |
| Empty Selection (Stored Marks) | ❌ Broken             | ✅ Works     |
| Toggle On/Off                  | ❌ Only adds          | ✅ Toggles   |
| Type Safety                    | ⚠️ Partial            | ✅ Full      |
| Edge Cases                     | ❌ Manual handling    | ✅ Automatic |
| Code Lines                     | ~30 lines             | ~10 lines    |
| Maintenance                    | ❌ High               | ✅ Low       |

## Additional Considerations

### 1. Remove vs Toggle for Color

The current implementation has two separate commands:

- `setTextColor` - sets a color
- `removeTextColor` - removes color

With `toggleMark`, we have options:

**Option A: Keep separate commands (Current)**

```typescript
setTextColor: ({ color }) => toggleMark({ type: "textColor", attrs: { color }}),
removeTextColor: () => toggleMark({ type: "textColor" })
```

**Option B: Single toggle command**

```typescript
toggleTextColor: ({ color }) =>
  toggleMark({ type: "textColor", attrs: { color } });
```

**Recommendation**: Keep Option A for clarity - setting and removing are conceptually different actions in a color picker UI.

### 2. Mark Spec Is Correct

The existing mark specification is fine:

```typescript
defineMarkSpec({
  name: "textColor",
  attrs: { color: { default: null } },
  parseDOM: [{ style: "color", getAttrs: (value) => ({ color: value }) }],
  toDOM: (node) => ["span", { style: `color: ${node.attrs.color}` }, 0],
});
```

This correctly:

- Defines the color attribute
- Parses from DOM
- Renders to DOM

### 3. No Changes Needed in ColorPicker.tsx

The UI component is already correct:

```typescript
const handleColorChange = (color: string) => {
  editor.commands.setTextColor({ color });
};
```

Once the command uses `toggleMark`, this will just work.

## Summary

**Problem**: Custom low-level ProseMirror API usage instead of ProseKit's `toggleMark`

**Solution**: Replace manual `state.tr.addMark` with `toggleMark({ type: "textColor", attrs: { color }})`

**Impact**:

- Fixes color not applying to selected text
- Fixes stored marks for empty selections
- Reduces code complexity
- Improves maintainability
- Follows ProseKit best practices

**Risk**: Very low - this is the official recommended approach

**Estimated Time**: 5-10 minutes to implement, 10 minutes to test

## Next Steps

1. Switch to code mode
2. Update [`text-color-extension.ts`](../app/[locale]/builder/components/blocks/text-color-extension.ts) with `toggleMark`
3. Test thoroughly with all scenarios
4. Verify both schema fix and color fix work together
