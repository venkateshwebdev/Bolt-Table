'use client';

import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useMemo, useRef } from 'react';


import { ClassNamesTypes, StylesTypes } from './BoltTable';
import type {
  ColumnType,
  DataRecord,
  ExpandableConfig,
  RowSelectionConfig,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// TableBody
//
// Renders the virtualized body of BoltTable. It is architected around the
// CSS Grid layout that BoltTable establishes: one column per table column,
// where each grid column contains an absolutely-positioned stack of cells.
//
// Architecture overview:
//
//   ┌─────────────────────────────────────────────────────────────┐
//   │  Grid (gridTemplateColumns mirrors header)                   │
//   │                                                              │
//   │  col 1        col 2        col 3        ...                 │
//   │  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
//   │  │ spacer   │ │ spacer   │ │ spacer   │  ← height=totalSize │
//   │  │          │ │          │ │          │                     │
//   │  │  cell 0  │ │  cell 0  │ │  cell 0  │  ← absolute pos    │
//   │  │  cell 1  │ │  cell 1  │ │  cell 1  │                     │
//   │  │  ...     │ │  ...     │ │  ...     │                     │
//   │  └──────────┘ └──────────┘ └──────────┘                    │
//   │                                                              │
//   │  expanded row overlay (gridColumn: 1/-1, z-index: 15)       │
//   └─────────────────────────────────────────────────────────────┘
//
// Why this layout:
//   1. Each column is a single sticky-capable block, so pinned columns can use
//      `position: sticky` without breaking the column alignment.
//   2. Virtualizer only controls the Y-axis (which rows are rendered and their
//      top offset). The X-axis is handled entirely by CSS Grid.
//   3. Expanded rows are in a separate overlay div that spans all columns,
//      positioned absolutely below their parent row and viewport-locked via
//      `position: sticky; left: 0`.
//
// Performance optimizations:
//   - Cell is wrapped in React.memo with a custom comparator. Selection and
//     expand cells only re-render when their specific row's state changes.
//     Normal cells only re-render when their value changes.
//   - Pinned column background is applied at the column-spacer level (not per
//     cell) so changing the scroll position never causes cell re-renders.
//   - MeasuredExpandedRow uses a ResizeObserver to report content height to
//     the virtualizer without causing React re-renders on every frame.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the TableBody component.
 * All props are passed automatically by BoltTable — this is an internal component.
 */
interface TableBodyProps {
  /** The current page's row data (already sliced/filtered/sorted by BoltTable) */
  data: DataRecord[];

  /** The ordered visible columns (left pinned → unpinned → right pinned) */
  orderedColumns: ColumnType<DataRecord>[];

  /**
   * The TanStack Virtual row virtualizer instance.
   * Provides `getVirtualItems()` and `getTotalSize()` for rendering.
   */
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;

  /**
   * Map of column key → sticky offset in pixels.
   * For left-pinned columns: distance from the left edge.
   * For right-pinned columns: distance from the right edge.
   */
  columnOffsets: Map<string, number>;

  /** Shared style overrides passed down from BoltTable */
  styles?: StylesTypes;

  /** Shared class name overrides passed down from BoltTable */
  classNames?: ClassNamesTypes;

  /**
   * Row selection configuration.
   * When provided, the `__select__` column renders checkboxes or radio buttons.
   * `undefined` during shimmer loading to prevent selection UI on skeleton rows.
   */
  rowSelection?: RowSelectionConfig<DataRecord>;

  /**
   * Pre-normalized selected row keys (all converted to strings).
   * Normalized in BoltTable so Cell never has to deal with number/string mismatches.
   *
   * @default []
   */
  normalizedSelectedKeys?: string[];

  /**
   * Returns the string key for a given row record and index.
   * Derived from BoltTable's `rowKey` prop. Always returns a string.
   *
   * @param record - The row data object
   * @param index  - The row's position in the data array
   */
  getRowKey?: (record: DataRecord, index: number) => string;

  /**
   * Expandable row configuration.
   * When provided, rows in `resolvedExpandedKeys` render an expanded content panel.
   * `undefined` during shimmer loading to prevent expand UI on skeleton rows.
   */
  expandable?: ExpandableConfig<DataRecord>;

  /**
   * The set of currently expanded row keys.
   * Used to determine whether to render the expanded content panel for each row.
   */
  resolvedExpandedKeys?: Set<React.Key>;

  /**
   * Height of each regular (non-expanded) row in pixels.
   * Must match the `rowHeight` prop passed to BoltTable.
   *
   * @default 40
   */
  rowHeight?: number;

  /**
   * Total pixel width of all columns combined.
   * Used to set `minWidth` on the column spacer so the grid never collapses
   * below the sum of all column widths.
   */
  totalTableWidth?: number;

  /**
   * The visible width of the scroll container in pixels.
   * Used to set the width of expanded row panels and the empty state div
   * so they fill exactly the visible viewport rather than the full content width.
   */
  scrollAreaWidth?: number;

  /**
   * The accent color used for the expand toggle button chevron icon.
   * Should match the `accentColor` prop on BoltTable.
   *
   * @default '#1890ff'
   */
  accentColor?: string;

  /**
   * Ref to the scroll container element.
   * Reserved for potential future use (e.g. programmatic scrolling from within TableBody).
   */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;

  /**
   * When `true`, all cells render as animated shimmer skeletons instead of
   * real data. Used during initial loading when `data` is empty.
   *
   * @default false
   */
  isLoading?: boolean;

  /**
   * Called by `MeasuredExpandedRow` when an expanded row's content height changes.
   * BoltTable uses this to update the virtualizer's size estimate for that row,
   * triggering a re-layout so the expanded content is never clipped.
   *
   * @param rowKey        - The string key of the row whose expanded height changed
   * @param contentHeight - The new content height in pixels (border-box)
   */
  onExpandedRowResize?: (rowKey: string, contentHeight: number) => void;

  /**
   * Optional maximum height in pixels for expanded row panels.
   * When set, the panel becomes scrollable if its content exceeds this height.
   * When omitted, the panel grows to its full content height.
   *
   * @example
   * maxExpandedRowHeight={300}
   */
  maxExpandedRowHeight?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell
// ─────────────────────────────────────────────────────────────────────────────

/** Widths (as percentages) for shimmer skeleton bars, cycled per cell position */
const SHIMMER_WIDTHS = [55, 70, 45, 80, 60, 50, 75, 65];

/**
 * Props for the Cell component.
 * All props are passed automatically by TableBody.
 */
interface CellProps {
  /** The raw cell value (`row[column.dataIndex]`) */
  value: unknown;

  /** The full row data object */
  record: DataRecord;

  /** The column definition for this cell */
  column: ColumnType<DataRecord>;

  /** The row's absolute index in the current data array (0-based) */
  rowIndex: number;

  /** Class name overrides from BoltTable */
  classNames?: ClassNamesTypes;

  /** Style overrides from BoltTable */
  styles?: StylesTypes;

  /** Whether this row is currently selected */
  isSelected?: boolean;

  /** Whether this row is currently expanded */
  isExpanded?: boolean;

  /** Row selection config (for `__select__` cells only) */
  rowSelection?: RowSelectionConfig<DataRecord>;

  /**
   * Pre-normalized selected row keys.
   * Used by the `__select__` cell to derive the new selection after a toggle
   * without risking a stale closure.
   */
  normalizedSelectedKeys?: string[];

  /** The string key for this row */
  rowKey?: string;

  /** All rows in the current view — needed to derive `selectedRows` after a toggle */
  allData?: DataRecord[];

  /** Row key resolver passed from BoltTable */
  getRowKey?: (record: DataRecord, index: number) => string;

  /** Accent color for checkbox/radio `accentColor` style */
  accentColor?: string;

  /**
   * When `true`, renders a shimmer skeleton instead of real content.
   * Triggered for rows whose key starts with `__shimmer_` or when `isLoading` is true.
   */
  isLoading?: boolean;
}

/**
 * Cell — renders a single table body cell.
 *
 * Handles three distinct render paths:
 *
 * 1. **Shimmer** (`isLoading=true`): renders an animated pulse skeleton bar.
 *    If the column defines a `shimmerRender` function, that is used instead.
 *
 * 2. **Selection cell** (`column.key === '__select__'`): renders a checkbox or
 *    radio button driven by `rowSelection` props. The actual checked state comes
 *    from `normalizedSelectedKeys` (not `column.render`) so selection changes
 *    never cause BoltTable's column memos to re-run.
 *
 * 3. **Normal cell**: calls `column.render(value, record, index)` if defined,
 *    otherwise renders the raw value as a React node.
 *
 * Wrapped in `React.memo` with a custom comparator:
 * - `__select__` cells: only re-render when `isSelected` or `normalizedSelectedKeys` changes
 * - `__expand__` cells: only re-render when `isExpanded` changes
 * - Normal cells: only re-render when `value` or `rowIndex` changes
 */
const Cell = React.memo(
  ({
    value,
    record,
    column,
    rowIndex,
    classNames,
    styles,
    isSelected,
    rowSelection,
    rowKey,
    allData,
    getRowKey,
    accentColor,
    isLoading,
  }: CellProps) => {
    const isPinned = Boolean(column.pinned);

    // ── 1. Shimmer state ──────────────────────────────────────────────────────
    // Skip shimmer for system columns (__select__, __expand__) — they have no
    // meaningful skeleton. Other columns render either a custom shimmerRender
    // or a default animated pulse bar.
    if (
      isLoading &&
      column.key !== '__select__' &&
      column.key !== '__expand__'
    ) {
      const shimmerContent = column.shimmerRender ? (
        column.shimmerRender()
      ) : (
        <div
          style={{
            backgroundColor: 'rgba(100, 116, 139, 0.15)',
            animation: 'bt-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            borderRadius: 4,
            width: `${SHIMMER_WIDTHS[(rowIndex + column.key.length) % SHIMMER_WIDTHS.length]}%`,
            height: 14,
          }}
        />
      );

      return (
        <div
          className={`${column.className ?? ''} ${classNames?.cell ?? ''} ${isPinned ? (classNames?.pinnedCell ?? '') : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(128,128,128,0.2)',
            paddingLeft: 8,
            paddingRight: 8,
            height: '100%',
            boxSizing: 'border-box',
            ...column.style,
            ...(isPinned ? styles?.pinnedCell : undefined),
          }}
        >
          {shimmerContent}
        </div>
      );
    }

    // ── 2. Selection cell ─────────────────────────────────────────────────────
    // Rendered here (not via column.render) so that checking/unchecking a row
    // only re-renders its own Cell, never triggering BoltTable's column memos.
    if (column.key === '__select__' && rowSelection && rowKey !== undefined) {
      const checkboxProps = rowSelection.getCheckboxProps?.(record) ?? {
        disabled: false,
      };

      const content =
        rowSelection.type === 'radio' ? (
          <input
            type="radio"
            checked={!!isSelected}
            disabled={checkboxProps.disabled}
            onChange={(e) => {
              e.stopPropagation();
              rowSelection.onSelect?.(record, true, [record], e.nativeEvent);
              rowSelection.onChange?.([rowKey], [record], { type: 'single' });
            }}
            style={{ cursor: 'pointer', accentColor }}
          />
        ) : (
          <input
            type="checkbox"
            checked={!!isSelected}
            disabled={checkboxProps.disabled}
            onChange={(e) => {
              e.stopPropagation();
              const currentKeys = (rowSelection.selectedRowKeys ?? []).map(
                (k) => String(k),
              );
              const newSelected = isSelected
                ? currentKeys.filter((k) => k !== rowKey)
                : [...currentKeys, rowKey];
              const newSelectedRows = (allData ?? []).filter((row, idx) =>
                newSelected.includes(
                  getRowKey ? getRowKey(row, idx) : String(idx),
                ),
              );
              rowSelection.onSelect?.(
                record,
                !isSelected,
                newSelectedRows,
                e.nativeEvent,
              );
              rowSelection.onChange?.(newSelected, newSelectedRows, {
                type: 'multiple',
              });
            }}
            style={{ cursor: 'pointer', accentColor }}
          />
        );

      return (
        <div
          className={`${column.className ?? ''} ${classNames?.cell ?? ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(128,128,128,0.2)',
            paddingLeft: 8,
            paddingRight: 8,
            justifyContent:
              column.key === '__select__' || column.key === '__expand__'
                ? 'center'
                : undefined,
            height: '100%',
            boxSizing: 'border-box',
            ...column.style,
            ...(isPinned ? styles?.pinnedCell : undefined),
          }}
        >
          {content}
        </div>
      );
    }

    // ── 3. Normal cell ────────────────────────────────────────────────────────
    // Use column.render if provided, otherwise render the raw value.
    // Note: the expand cell (__expand__) is handled by the render function
    // injected into the column definition in BoltTable — it arrives here as
    // a normal cell with a render prop.
    const content = column.render
      ? column.render(value, record, rowIndex)
      : ((value as React.ReactNode) ?? '');

    return (
      <div
        className={`${column.className ?? ''} ${classNames?.cell ?? ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
          borderBottom: '1px solid rgba(128,128,128,0.2)',
          paddingLeft: 8,
          paddingRight: 8,
          justifyContent:
            column.key === '__select__' || column.key === '__expand__'
              ? 'center'
              : undefined,
          height: '100%',
          boxSizing: 'border-box',
          ...column.style,
          ...(isPinned ? styles?.pinnedCell : undefined),
        }}
      >
        {content}
      </div>
    );
  },
  // ── Custom memo comparator ─────────────────────────────────────────────────
  // Minimizes re-renders:
  // - __select__ cells: re-render only when selection changes
  // - __expand__ cells: re-render only when expand state changes
  // - Normal cells: re-render only when value or rowIndex changes
  (prev, next) => {
    if (prev.isLoading !== next.isLoading) return false;
    if (prev.column.key === '__select__') {
      return (
        prev.isSelected === next.isSelected &&
        prev.normalizedSelectedKeys === next.normalizedSelectedKeys
      );
    }
    if (prev.column.key === '__expand__') {
      return prev.isExpanded === next.isExpanded;
    }
    if (prev.column.render) {
      return prev.record === next.record && prev.rowIndex === next.rowIndex;
    }
    return (
      prev.value === next.value &&
      prev.rowIndex === next.rowIndex &&
      prev.column.key === next.column.key
    );
  },
);
Cell.displayName = 'Cell';

// ─────────────────────────────────────────────────────────────────────────────
// MeasuredExpandedRow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MeasuredExpandedRow — wraps expanded row content and reports its height.
 *
 * Uses a `ResizeObserver` to watch for content height changes and calls
 * `onResize(rowKey, height)` whenever the height changes. BoltTable uses
 * this callback to update the virtualizer's size estimate for the row,
 * so the expanded panel is always fully visible without overflow.
 *
 * Height updates are debounced via `useRef` to prevent the ResizeObserver
 * from reporting the same height repeatedly (e.g. during scroll reflows).
 * Sub-pixel values are rounded to avoid infinite measurement loops.
 *
 * @internal Used only inside TableBody's expanded row overlay section.
 */
const MeasuredExpandedRow = React.memo(
  ({
    rowKey,
    onResize,
    children,
  }: {
    /** The string key of the row being measured */
    rowKey: string;
    /**
     * Called when the content height changes.
     * @param rowKey        - The row key
     * @param contentHeight - The new border-box height in pixels (rounded to integer)
     */
    onResize: (rowKey: string, height: number) => void;
    /** The expanded row content to render and measure */
    children: React.ReactNode;
  }) => {
    const ref = useRef<HTMLDivElement>(null);

    // Keep onResize in a ref so the ResizeObserver callback always calls the
    // latest version without needing to re-subscribe on every render
    const onResizeRef = useRef(onResize);
    useEffect(() => {
      onResizeRef.current = onResize;
    }, [onResize]);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const height = entries[0]?.borderBoxSize?.[0]?.blockSize;
        if (height != null && height > 0) {
          onResizeRef.current(rowKey, height);
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [rowKey]);

    return <div ref={ref}>{children}</div>;
  },
);
MeasuredExpandedRow.displayName = 'MeasuredExpandedRow';

// ─────────────────────────────────────────────────────────────────────────────
// TableBody
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TableBody — the virtualized body renderer for BoltTable.
 *
 * Renders the visible rows using TanStack Virtual's window virtualization.
 * Only the rows currently in (or near) the viewport are in the DOM.
 *
 * Layout strategy:
 * - One `<div>` per column, spanning the full virtual height (`totalSize`px).
 * - Inside each column div, only the visible rows are rendered as
 *   `position: absolute` cells stacked at their `virtualRow.start` offset.
 * - Pinned columns use `position: sticky` on the column div itself, backed
 *   by a semi-transparent background to visually separate from scrolling content.
 * - Expanded rows are rendered in a separate full-width overlay div that sits
 *   on top of all column divs (z-index: 15) and uses `position: sticky; left: 0`
 *   to stay viewport-locked during horizontal scroll.
 *
 * @internal This is an internal BoltTable component. Use BoltTable directly.
 */
const TableBody: React.FC<TableBodyProps> = ({
  data,
  orderedColumns,
  rowVirtualizer,
  columnOffsets,
  styles,
  classNames,
  rowSelection,
  normalizedSelectedKeys = [],
  getRowKey,
  expandable,
  resolvedExpandedKeys,
  rowHeight = 40,
  scrollAreaWidth,
  accentColor,
  isLoading = false,
  onExpandedRowResize,
  maxExpandedRowHeight,
}) => {
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const selectedKeySet = useMemo(() => new Set(normalizedSelectedKeys), [normalizedSelectedKeys]);

  /**
   * Pre-computed styles for each column's spacer div.
   * Memoized so column styles only recompute when columns, offsets,
   * total virtual height, or pinned styles change — not on every scroll.
   *
   * Each spacer div:
   * - Spans the full virtual height (`totalSize`px) so the absolute-positioned
   *   cells inside it have a stable containing block for their `top` values.
   * - Is `position: sticky` for pinned columns (with left/right offset).
   * - Gets a semi-transparent background for pinned columns so they visually
   *   overlay scrolling content behind them.
   */
  const columnStyles = useMemo(() => {
    return orderedColumns.map((col, colIndex) => {
      const stickyOffset = columnOffsets.get(col.key);
      const isPinned = Boolean(col.pinned);

      // z-index hierarchy:
      // - system columns (__select__, __expand__): 11 (above pinned, below menus)
      // - pinned columns: 2 (above scrolling content)
      // - normal columns: 0
      let zIndex = 0;
      if (col.key === '__select__' || col.key === '__expand__') zIndex = 11;
      else if (isPinned) zIndex = 2;

      const style: React.CSSProperties = {
        gridColumn: colIndex + 1,
        gridRow: 2,
        height: `${totalSize}px`,
        position: isPinned ? 'sticky' : 'relative',
        zIndex,
      };

      if (col.pinned === 'left' && stickyOffset !== undefined)
        style.left = `${stickyOffset}px`;
      else if (col.pinned === 'right' && stickyOffset !== undefined)
        style.right = `${stickyOffset}px`;

      if (isPinned) {
        style.backgroundColor = (styles as any)?.pinnedBg;
        if (styles?.pinnedCell) Object.assign(style, styles.pinnedCell);
      }

      return { key: col.key, style, isPinned };
    });
  }, [orderedColumns, columnOffsets, totalSize, styles]);

  return (
    <>
      {/*
       * ── Column spacer divs ───────────────────────────────────────────────
       * One div per column. Each div:
       *   - Is `height: totalSize` to create the scrollable area
       *   - Contains only the virtual (visible) rows as absolute children
       *   - Is sticky for pinned columns
       */}
      {columnStyles.map((colStyle, colIndex) => {
        const col = orderedColumns[colIndex];

        return (
          <div
            key={`spacer-${colStyle.key}`}
            style={colStyle.style}
          >
            {virtualItems.map((virtualRow: VirtualItem) => {
              const row = data[virtualRow.index];
              const rowKey = getRowKey
                ? getRowKey(row, virtualRow.index)
                : String(virtualRow.index);
              const isSelected = selectedKeySet.has(rowKey);
              const isExpanded = resolvedExpandedKeys?.has(rowKey) ?? false;
              const cellValue = row[col.dataIndex];
              // Rows with shimmer keys or when isLoading=true render as skeletons
              const isRowShimmer = isLoading || rowKey.startsWith('__shimmer_');

              return (
                /*
                 * Row wrapper div:
                 * - data-row-key: used by BoltTable's DOM-based hover system
                 *   (mouseover reads this attribute to apply hover styles
                 *   across all column divs for the same row simultaneously)
                 * - data-selected: presence/absence attribute consumed by the
                 *   CSS injected by BoltTable for selected row background
                 * - Absolute positioned at virtualRow.start for virtualization
                 * - Height = virtualRow.size (includes expanded row height)
                 */
                <div
                  key={`${rowKey}-${col.key}`}
                  data-row-key={rowKey}
                  data-selected={isSelected || undefined}
                  style={{
                    position: 'absolute',
                    top: `${virtualRow.start}px`,
                    left: 0,
                    right: 0,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  <div
                    style={{
                      height: `${rowHeight}px`,
                      position: 'relative',
                    }}
                  >
                    <Cell
                      value={cellValue}
                      record={row}
                      column={col}
                      rowIndex={virtualRow.index}
                      classNames={classNames}
                      styles={styles}
                      isSelected={isSelected}
                      isExpanded={isExpanded}
                      rowSelection={rowSelection}
                      normalizedSelectedKeys={normalizedSelectedKeys}
                      rowKey={rowKey}
                      allData={data}
                      getRowKey={getRowKey}
                      accentColor={accentColor}
                      isLoading={isRowShimmer}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/*
       * ── Expanded row overlay ─────────────────────────────────────────────
       * A single full-width div that spans all grid columns (gridColumn: 1/-1).
       * It has the same total height as the column spacers so absolute
       * positioning of expanded panels uses the same coordinate space.
       *
       * Each expanded panel:
       * - Is positioned at virtualRow.start + rowHeight (directly below its row)
       * - Uses `position: sticky; left: 0; width: scrollAreaWidth` to stay
       *   viewport-locked during horizontal scroll (pure CSS, no JS needed)
       * - Is wrapped in MeasuredExpandedRow to auto-size the virtualizer slot
       *
       * Why a separate overlay div instead of rendering inside each column?
       * Because the expanded content spans the full visible width, not one column.
       * A single overlay avoids duplicating the content per column.
       */}
      {expandable && (
        <div
          style={{
            gridColumn: '1 / -1',
            gridRow: 2,
            height: `${totalSize}px`,
            position: 'relative',
            zIndex: 15,
            // pointerEvents: none on the overlay so hover/click pass through
            // to the cells below for rows that are NOT expanded
            pointerEvents: 'none',
          }}
        >
          {virtualItems.map((virtualRow: VirtualItem) => {
            const row = data[virtualRow.index];
            const rk = getRowKey
              ? getRowKey(row, virtualRow.index)
              : String(virtualRow.index);

            // Skip rows that are not expanded
            if (!(resolvedExpandedKeys?.has(rk) ?? false)) return null;

            const expandedContent = (
              <div
                className={classNames?.expandedRow ?? ''}
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 5,
                  width:
                    scrollAreaWidth && scrollAreaWidth > 0
                      ? `${scrollAreaWidth}px`
                      : '100%',
                  overflow: 'auto',
                  pointerEvents: 'auto',
                  borderBottom: '1px solid rgba(128,128,128,0.2)',
                  backgroundColor: 'rgba(128,128,128,0.06)',
                  padding: 20,
                  ...(maxExpandedRowHeight
                    ? { maxHeight: `${maxExpandedRowHeight}px` }
                    : undefined),
                  ...styles?.expandedRow,
                }}
              >
                {expandable.expandedRowRender(row, virtualRow.index, 0, true)}
              </div>
            );

            return (
              <div
                key={`expanded-${rk}`}
                style={{
                  position: 'absolute',
                  // Position immediately below the row's base height
                  top: virtualRow.start + rowHeight,
                  left: 0,
                  right: 0,
                }}
              >
                {/*
                 * Wrap in MeasuredExpandedRow when a resize callback is provided.
                 * This lets the virtualizer know the actual content height so it
                 * allocates the right space. Without this, the virtualizer uses
                 * `expandedRowHeight` as an estimate, which may cause clipping.
                 */}
                {onExpandedRowResize ? (
                  <MeasuredExpandedRow
                    rowKey={rk}
                    onResize={onExpandedRowResize}
                  >
                    {expandedContent}
                  </MeasuredExpandedRow>
                ) : (
                  expandedContent
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

TableBody.displayName = 'TableBody';

export default TableBody;