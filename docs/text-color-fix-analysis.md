# Text Color Feature Not Working - Analysis and Fix

## Problem Summary

The text color picker opens but selecting a color doesn't apply it to the selected text. This issue appeared after pulling changes to a different machine, similar to the schema undefined error.

## Root Cause Analysis

Looking at the [`setTextColor` command implementation](../app/[locale]/builder/components/blocks/text-color-extension.ts:23-37):

```typescript
setTextColor: ({ color }: { color: string }) => {
  return (state, dispatch) => {
    const { selection, schema } = state;
    const { from, to, empty } = selection;
    if (empty) return false; // ← CRITICAL LINE

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

**The Issue:** Line 27 checks `if (empty) return false;` - this prevents the color command from working when there's no text selection (empty selection/cursor position).

### Standard Text Editor Behavior

Most text editors support two ways to apply formatting:

1. **Apply to Selection**: Select text → Apply format → Selected text changes
2. **Apply to Typing**: No selection → Apply format → Next typed text has that format

ProseKit supports this via **stored marks** - marks that are "pending" and will be applied to newly typed text.

## Why It's Not Working

The current implementation only works with text selection (`if (empty) return false`). When you:

1. Click to place cursor (no selection, `empty = true`)
2. Open color picker and select a color
3. Command returns `false` without applying the mark
4. No stored mark is created
5. Typing doesn't have the color

This is different from bold/italic/etc. which likely use ProseKit's built-in commands that handle stored marks properly.

## The Solution

We need to support **stored marks** for empty selections, similar to how standard formatting works.

### Option 1: Use ProseKit's Built-in Mark Commands (Recommended)

ProseKit likely has built-in helpers for mark toggling that handle stored marks. Let me check the best practice approach.

### Option 2: Implement Stored Marks Manually

Update the `setTextColor` command to handle empty selections:

```typescript
setTextColor: ({ color }: { color: string }) => {
    return (state, dispatch) => {
        const { selection, schema } = state;
        const { from, to, empty } = selection;

        if (dispatch) {
            const markType = schema.marks.textColor;
            if (!markType) return false;

            if (empty) {
                // For empty selection, add to stored marks
                const mark = markType.create({ color });
                const tr = state.tr.addStoredMark(mark);
                dispatch(tr);
            } else {
                // For text selection, apply mark to range
                const tr = state.tr.addMark(from, to, markType.create({ color }));
                dispatch(tr);
            }
        }
        return true;
    };
},
removeTextColor: () => {
    return (state, dispatch) => {
        const { selection, schema } = state;
        const { from, to, empty } = selection;

        if (dispatch) {
            const markType = schema.marks.textColor;
            if (!markType) return false;

            if (empty) {
                // For empty selection, remove from stored marks
                const tr = state.tr.removeStoredMark(markType);
                dispatch(tr);
            } else {
                // For text selection, remove mark from range
                const tr = state.tr.removeMark(from, to, markType);
                dispatch(tr);
            }
        }
        return true;
    };
}
```

## Comparison with Working Commit f2b16d4

The user mentioned this worked in commit `f2b16d4b4df92bc0de45675aad0643b6185cfdd3`. The likely differences:

1. **Different ProseKit version** - newer version might have changed how marks work
2. **Different command implementation** - previous version might have used a different approach
3. **Different extension setup** - the mark might have been configured differently

## Testing Strategy

After implementing the fix:

1. **Test with Selection:**

   - Select text
   - Change color
   - Verify color applies to selected text

2. **Test without Selection (Stored Marks):**

   - Click to place cursor (no selection)
   - Change color
   - Type new text
   - Verify new text has the selected color

3. **Test Color Removal:**

   - Select colored text
   - Click "Reset Color"
   - Verify color is removed

4. **Test with No Selection + Reset:**
   - Click to place cursor
   - Set a color
   - Click "Reset Color"
   - Type new text
   - Verify text is default color

## Additional Considerations

### Color Persistence

The color mark needs to be properly serialized/deserialized when saving/loading content. The current implementation has:

```typescript
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
```

This should work correctly for persistence, but verify that:

1. Colored text is saved to the database
2. Colored text is loaded correctly on page refresh
3. The JSON format preserves the color mark

### ColorPicker Component

The [`ColorPicker` component](../app/[locale]/builder/components/blocks/ColorPicker.tsx:27-29) currently calls:

```typescript
const handleColorChange = (color: string) => {
  editor.commands.setTextColor({ color });
};
```

This should work fine once the command is fixed. However, consider adding feedback:

```typescript
const handleColorChange = (color: string) => {
  const success = editor.commands.setTextColor({ color });
  if (!success) {
    console.warn("Failed to apply color - no text selected");
  }
};
```

## Related Issues

Both this issue and the schema undefined error appeared after pulling code to a different machine. This suggests:

1. **Environment differences** (Node.js, npm versions)
2. **Dependency version mismatches** (check `package-lock.json` vs `node_modules`)
3. **Build cache issues** (try `rm -rf .next node_modules && npm install`)

### Recommended Actions

1. Compare `package.json` and `package-lock.json` between machines
2. Ensure both machines use the same Node.js version
3. Check ProseKit version specifically
4. Clear build caches and reinstall dependencies

## Implementation Priority

1. ✅ **High Priority**: Fix schema undefined error (already done)
2. 🔥 **High Priority**: Fix text color with stored marks
3. 📋 **Medium Priority**: Add user feedback for color application
4. 🔍 **Low Priority**: Investigate environment differences

## Next Steps

1. Implement stored marks support in `text-color-extension.ts`
2. Test thoroughly with and without text selection
3. Verify color persistence after save/reload
4. Consider investigating ProseKit best practices for custom marks

## Related Files

- [`text-color-extension.ts`](../app/[locale]/builder/components/blocks/text-color-extension.ts) - Command implementation
- [`ColorPicker.tsx`](../app/[locale]/builder/components/blocks/ColorPicker.tsx) - UI component
- [`EditorToolbar.tsx`](../app/[locale]/builder/components/blocks/EditorToolbar.tsx) - Toolbar integration
- [`editor-extension.ts`](../app/[locale]/builder/components/blocks/editor-extension.ts) - Extension union
