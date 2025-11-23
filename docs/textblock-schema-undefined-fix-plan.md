# TextBlock Schema Undefined Error - Fix Plan

## Error Summary

**Error:** `can't access property "nodeFromJSON", options.schema is undefined`

**Location:** [`app/[locale]/builder/components/blocks/TextBlock.tsx:60`](../app/[locale]/builder/components/blocks/TextBlock.tsx:60)

**Commit Reference:** The error resurfaced after commit `56be051da07394eed51a59ee6cec283ee2f78912` which was supposed to fix it.

## Root Cause Analysis

### The Problem: Race Condition in Editor Initialization

The error occurs due to a **timing issue** between editor creation and editor mounting:

```typescript
// Line 39-44: Editor is created in useMemo
const editor = useMemo(() => {
  return createEditor({
    extension,
    defaultContent: (block.data.content as string) || undefined,
  });
}, [extension, block.id]);

// Line 50-80: useEffect tries to access editor.schema IMMEDIATELY
useEffect(() => {
  // ...
  const doc = nodeFromJSON(editor.schema, blockContent); // ❌ FAILS HERE
  // ...
}, [editor, blockContent, blockProp.id]);
```

**Why it fails:**

1. `createEditor()` creates an editor instance
2. The editor object exists, but its internal properties (like `schema`, `view`) are not fully initialized
3. The `useEffect` runs immediately after render
4. `editor.schema` is `undefined` because the ProseKit component hasn't mounted the editor yet
5. The ProseKit component mounts the editor via `ref={editor.mount}` (line 103), which happens **after** the useEffect runs

### Why It's Machine-Dependent

React's render timing can vary based on:

- Node.js version differences
- React version (strict mode double-renders in dev)
- System performance (faster machines hit the race condition more often)
- Environment differences (dev vs production builds)

This explains why the error appeared after pulling code to a different machine.

## Why the Previous Fix Failed

The commit `56be051` likely tried to add the `nodeFromJSON` approach, but didn't account for the editor lifecycle. The fundamental issue is:

❌ **Wrong Approach:** Using low-level ProseKit APIs (`nodeFromJSON`) that require the editor to be mounted
✅ **Correct Approach:** Using high-level ProseKit APIs (`setDocJSON`) that handle initialization internally

## The Solution

### Strategy: Remove the Fragile useEffect

The current `useEffect` (lines 50-80) is trying to sync content from the store back to the editor. However, this creates multiple issues:

1. **Race condition** with editor initialization
2. **Unnecessary complexity** - we're manually managing what ProseKit already handles
3. **Potential infinite loops** - updating the editor triggers store updates, which trigger editor updates

### Better Approach: Trust ProseKit's Built-in Content Management

ProseKit already has proper content synchronization. We should:

1. **Remove the problematic useEffect** entirely
2. **Use `defaultContent` properly** - let ProseKit handle initial content
3. **Only update editor from external changes** (like from the properties panel) using the safe `setDocJSON` API

## Implementation Plan

### Step 1: Fix TextBlock.tsx

**File:** [`app/[locale]/builder/components/blocks/TextBlock.tsx`](../app/[locale]/builder/components/blocks/TextBlock.tsx)

#### Changes Required:

1. **Remove the entire useEffect** (lines 46-80)
2. **Remove unused imports**: `nodeFromJSON`, `useEffect`, `useRef`
3. **Simplify the component** to trust ProseKit's content handling

#### New Implementation:

```typescript
"use client";

import { createEditor } from "prosekit/core";
import { ProseKit } from "prosekit/react";
import { Block } from "@/lib/types/board";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { defineExtension } from "./editor-extension";
import { BlockDeleteButton } from "../BlockDeleteButton";

interface TextBlockProps {
  block: Block;
  isSelected?: boolean;
  isPreviewMode?: boolean;
}

export function TextBlock({
  block,
  isSelected,
  isPreviewMode = false,
}: TextBlockProps) {
  const extension = useMemo(() => {
    return defineExtension();
  }, []);

  const editor = useMemo(() => {
    return createEditor({
      extension,
      defaultContent: block.data.content || undefined,
    });
  }, [extension, block.id]);

  return (
    <ProseKit editor={editor}>
      <div
        className={cn(
          "w-full h-full min-h-[50px] flex flex-col overflow-hidden relative",
          !isPreviewMode && "border rounded-md bg-background",
          !isPreviewMode &&
            isSelected &&
            "ring-2 ring-primary ring-offset-2 border-primary"
        )}
      >
        {!isPreviewMode && isSelected && (
          <BlockDeleteButton blockId={block.id} />
        )}
        <div
          className={cn(
            "prose dark:prose-invert max-w-none flex-1 overflow-y-auto",
            !isPreviewMode && "p-4"
          )}
        >
          <div
            ref={editor.mount}
            className={cn("min-h-[50px] h-full")}
            contentEditable={false}
          />
        </div>
      </div>
    </ProseKit>
  );
}
```

#### Key Changes:

1. ❌ **Removed:** `nodeFromJSON` import (causes the error)
2. ❌ **Removed:** `useEffect`, `useRef` (no longer needed)
3. ❌ **Removed:** Store selectors for reactive content (unnecessary)
4. ✅ **Kept:** Simple `defaultContent` initialization
5. ✅ **Simplified:** Let ProseKit manage its own state

### Step 2: Verify TextProperties.tsx

**File:** [`app/[locale]/builder/components/properties/TextProperties.tsx`](../app/[locale]/builder/components/properties/TextProperties.tsx)

This component already uses the correct approach with `setDocJSON` (line 51), which is safe and doesn't have the race condition issue.

**No changes needed** - this component is already correct.

### Step 3: Content Synchronization Strategy

With the new approach, content flows like this:

```mermaid
graph LR
    A[Store: block.data.content] --> B[TextBlock: defaultContent]
    B --> C[ProseKit Editor]
    D[User edits in Properties Panel] --> E[TextProperties: setDocJSON]
    E --> F[ProseKit Editor]
    F --> G[Save via handleSave]
    G --> H[Store: updateBlock]
    H --> A
```

#### How Content Updates Work:

1. **Initial Load:**

   - Block data from store → `defaultContent` prop → ProseKit renders it

2. **Editing in Properties Panel:**

   - User types → ProseKit editor state changes
   - Click "Save" → `handleSave()` → `editor.getDocJSON()` → store updated
   - Store update doesn't affect TextBlock (editor already has the content)

3. **Loading Different Block:**

   - React key changes (block.id) → component remounts
   - New `defaultContent` → ProseKit renders new content

4. **No Need for Sync:**
   - TextBlock shows read-only view (`contentEditable={false}`)
   - Editing happens in Properties Panel
   - No bidirectional sync needed

## Testing Plan

### Test Cases

#### 1. Basic Rendering

- [ ] Create a new text block
- [ ] Verify it renders without errors
- [ ] Check console for schema errors

#### 2. Content Editing

- [ ] Select text block
- [ ] Edit in Properties Panel
- [ ] Save changes
- [ ] Verify content updates in TextBlock

#### 3. Multiple Blocks

- [ ] Create multiple text blocks
- [ ] Switch between them
- [ ] Verify each shows correct content

#### 4. Page Reload

- [ ] Edit text block content
- [ ] Save changes
- [ ] Reload page
- [ ] Verify content persists

#### 5. Cross-Machine Test

- [ ] Run on machine where error occurred
- [ ] Run on original machine
- [ ] Verify no schema errors on either

### Edge Cases

- [ ] Empty content (new block)
- [ ] Rich formatted content (bold, italic, links)
- [ ] Very long content
- [ ] Rapid block switching
- [ ] Preview mode vs edit mode

## Why This Fix Works

### Root Cause Addressed

✅ **No more race conditions:** We don't access `editor.schema` before mounting
✅ **Simpler lifecycle:** Let ProseKit manage its own initialization
✅ **Proper separation:** TextBlock = display, TextProperties = editing

### ProseKit Best Practices

The fix follows ProseKit's recommended patterns:

1. **Use `defaultContent` for initialization** (not manual DOM manipulation)
2. **Use `setDocJSON` for programmatic updates** (not `nodeFromJSON`)
3. **Trust the framework** (don't fight against React/ProseKit lifecycle)

### Machine Independence

By removing the timing-dependent code, the fix will work consistently across:

- Different Node.js versions
- Different React versions
- Different hardware performance
- Development vs production builds

## Migration Notes

### Breaking Changes

None - this is a bug fix that maintains the same external API.

### Rollback Plan

If issues arise, the previous version is in git history at commit `56be051`. However, note that version has the schema error.

## Summary

**Problem:** Race condition accessing `editor.schema` before editor is mounted

**Solution:** Remove problematic `useEffect` and trust ProseKit's content management

**Impact:**

- Fixes schema undefined error
- Simplifies code (removes ~34 lines)
- Improves reliability across machines
- Better follows ProseKit best practices

**Risk:** Low - simplification that removes problematic code

**Estimated Implementation Time:** 10-15 minutes

**Testing Time:** 15-20 minutes

## Next Steps

1. Review this plan
2. Switch to code mode for implementation
3. Apply changes to [`TextBlock.tsx`](../app/[locale]/builder/components/blocks/TextBlock.tsx)
4. Test thoroughly
5. Commit with clear message referencing this plan and the previous failed fix
