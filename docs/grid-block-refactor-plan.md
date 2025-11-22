# GridBlock Refactoring Plan

## Objective

Refactor `GridBlock.tsx` to use `react-resizable-panels` for improved stability, accessibility, and features, replacing the custom resize implementation.

## Current State

- `GridBlock` uses a custom implementation with `mousemove` and `mouseup` listeners.
- Column widths are stored as `ratios` (e.g., `[1, 1]`, `[1, 2]`) in `block.data`.
- `ResizeHandle` is a custom component.

## Target State

- `GridBlock` uses `PanelGroup`, `Panel`, and `PanelResizeHandle` from `react-resizable-panels`.
- `ratios` in `block.data` are maintained for backward compatibility and persistence, but converted to/from percentages for `react-resizable-panels`.
- `ResizeHandle` is adapted to work with `PanelResizeHandle`.

## Steps

1.  **Install Dependencies**

    - Install `react-resizable-panels`.

2.  **Refactor `GridBlock.tsx`**

    - **Imports**: Import components from `react-resizable-panels`.
    - **State Management**:
      - Calculate initial percentages from `ratios`.
      - Example: `ratios: [1, 3]` -> `percentages: [25, 75]`.
    - **Render**:
      - Replace the main `div` with `PanelGroup`.
      - Map `columns` to `Panel` components.
      - Insert `PanelResizeHandle` between panels.
    - **Persistence**:
      - Use `onLayout` callback from `PanelGroup` to capture resize events.
      - Convert new percentages back to a ratio-like format (or just store percentages directly if we decide to migrate, but for now, let's stick to ratios or normalize them).
      - Actually, storing percentages (0-100) might be easier now, but to keep compatibility with `nav-blocks.tsx` (which uses simple ratios like `[1, 2]`), we can normalize the percentages to a sum (e.g. sum of original ratios or just keep them as percentages and treat them as such).
      - _Decision_: Let's update `block.data.ratios` with the new values. If `react-resizable-panels` gives us `[25, 75]`, we can save that. The existing code `ratios.map(r => r + "fr")` works fine with `25fr 75fr`.
    - **Resize Handle**:
      - Update `ResizeHandle.tsx` or usage in `GridBlock` to be compatible with `PanelResizeHandle`. `PanelResizeHandle` expects to be a direct child of `PanelGroup`. We can pass our custom styling to it.

3.  **Verify & Test**
    - Check if drag and drop still works (Droppable areas inside Panels).
    - Check if resizing works smoothly.
    - Check if saving/loading preserves layout.
    - Check if adding/removing columns works (might need to reset layout or handle gracefully).

## Implementation Details

### Converting Ratios to Percentages

```typescript
const total = ratios.reduce((a, b) => a + b, 0);
const defaultSizes = ratios.map((r) => (r / total) * 100);
```

### Handling Updates

```typescript
const onLayout = (sizes: number[]) => {
  // sizes are percentages, e.g., [25, 75]
  // We can save these directly as "ratios" since "25fr 75fr" is valid CSS grid (though we are moving away from CSS grid for the layout structure itself, the data model calls it 'ratios').
  // Actually, PanelGroup uses flexbox/absolute positioning, so we don't need CSS grid for the columns anymore.
  updateBlock(block.id, { data: { ...block.data, ratios: sizes } });
};
```

### Component Structure

```tsx
<PanelGroup direction="horizontal" onLayout={onLayout}>
  {columns.map((col, index) => (
    <React.Fragment key={index}>
      <Panel defaultSize={defaultSizes[index]}>
        <GridColumn ... />
      </Panel>
      {index < columns.length - 1 && <PanelResizeHandle ... />}
    </React.Fragment>
  ))}
</PanelGroup>
```
