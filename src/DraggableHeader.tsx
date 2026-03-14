'use client';

import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ClassNamesTypes, StylesTypes } from './BoltTable';
import {
  type BoltTableIcons,
  ArrowDownAZIcon,
  ArrowUpAZIcon,
  EyeOffIcon,
  FilterIcon,
  FilterXIcon,
  GripVerticalIcon,
  PinIcon,
  PinOffIcon,
} from './icons';
import type {
  ColumnContextMenuItem,
  ColumnType,
  DataRecord,
  SortDirection,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// DraggableHeader
//
// Renders a single column header cell with the following capabilities:
//   • Drag-to-reorder  — powered by @dnd-kit/sortable (disabled for pinned columns)
//   • Column resize    — exposes a right-edge handle that calls onResizeStart
//   • Sort indicators  — shows ArrowUpAZ / ArrowDownAZ when sorted
//   • Filter indicator — shows a small Filter icon when a filter is active
//   • Context menu     — right-click reveals sort/filter/pin/hide actions
//                        plus any custom items from columnContextMenuItems
//   • Unpin button     — shown in place of the resize handle for pinned columns
//
// Performance: wrapped in React.memo with a custom comparator so headers only
// re-render when their own column's props actually change. A sort change on
// column A never causes column B to re-render.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the DraggableHeader component.
 * This is an internal component used by BoltTable — all props are passed
 * automatically and you do not need to use DraggableHeader directly.
 */
interface DraggableHeaderProps {
  /**
   * The column definition for this header cell.
   * Controls width, pinning, sort/filter capabilities, title, and styling.
   */
  column: ColumnType<DataRecord>;

  /**
   * The visual position index of this column in the ordered column array.
   * Used to set the CSS `grid-column` placement so headers align with body cells.
   */
  visualIndex: number;

  /**
   * The accent color used for sort indicators, filter icons, the active sort
   * highlight in the context menu, and the resize handle hover line.
   *
   * @default '#1890ff'
   */
  accentColor?: string;

  /**
   * Called when the user presses down on the resize handle at the right edge
   * of this header cell. Starts the resize drag operation in BoltTable.
   */
  onResizeStart?: (columnKey: string, event: React.MouseEvent) => void;

  /**
   * Called when the user starts dragging this column header to reorder.
   * BoltTable handles the full drag lifecycle from this point.
   */
  onColumnDragStart?: (columnKey: string, event: React.PointerEvent) => void;

  /**
   * Shared styling overrides for header cells.
   * `styles.header` applies to all headers; `styles.pinnedHeader` applies
   * additionally to pinned column headers.
   */
  styles?: StylesTypes;

  /**
   * Shared CSS class name overrides for header cells.
   * `classNames.header` applies to all headers; `classNames.pinnedHeader`
   * applies additionally to pinned column headers.
   */
  classNames?: ClassNamesTypes;

  /**
   * When `true`, the drag grip icon on the left of the header label is hidden.
   * The column can still be dragged; only the visual indicator is removed.
   *
   * @default false
   */
  hideGripIcon?: boolean;

  /**
   * A custom React node to use as the drag grip icon.
   * When omitted, the default `GripVertical` icon is used.
   *
   * @example
   * gripIcon={<MyCustomDragIcon />}
   */
  gripIcon?: React.ReactNode;

  /**
   * The pixel offset from the pinned edge (left or right) for this column.
   * Used to set `left` or `right` CSS on sticky-positioned pinned headers.
   * Calculated by BoltTable based on the total width of all preceding pinned columns.
   */
  stickyOffset?: number;

  /**
   * Called when the user pins or unpins this column via the context menu
   * or the unpin button shown on pinned headers.
   *
   * @param columnKey - The key of the column being toggled
   * @param pinned    - The new pinned state: `'left'`, `'right'`, or `false` (unpinned)
   */
  onTogglePin?: (columnKey: string, pinned: 'left' | 'right' | false) => void;

  /**
   * Called when the user clicks "Hide Column" in the context menu.
   * The column's `hidden` property will be toggled in BoltTable's state.
   * Pinned columns cannot be hidden and this will never be called for them.
   *
   * @param columnKey - The key of the column being hidden
   */
  onToggleHide?: (columnKey: string) => void;

  /**
   * Whether this is the rightmost visible column.
   * When `true`, the header cell uses `width: 100%` instead of a fixed pixel
   * width so it stretches to fill any remaining horizontal space.
   *
   * @default false
   */
  isLastColumn?: boolean;

  /**
   * The current sort direction applied to this column.
   * - `'asc'`  — column is sorted ascending (ArrowUpAZ icon shown)
   * - `'desc'` — column is sorted descending (ArrowDownAZ icon shown)
   * - `null`   — column is not currently sorted (no icon shown)
   *
   * Passed from BoltTable's sort state; only set for the currently sorted column.
   */
  sortDirection?: SortDirection;

  /**
   * Called when the user clicks a sort option in the context menu.
   *
   * @param columnKey - The key of the column to sort
   * @param direction - The requested sort direction (`'asc'`, `'desc'`, or `undefined` to toggle)
   */
  onSort?: (columnKey: string, direction?: SortDirection) => void;

  /**
   * The current filter value active on this column.
   * When non-empty, a small Filter icon is shown in the header label.
   *
   * @default ''
   */
  filterValue?: string;

  /**
   * Called when the user submits a new filter value via the context menu input.
   *
   * @param columnKey - The key of the column being filtered
   * @param value     - The filter string entered by the user
   */
  onFilter?: (columnKey: string, value: string) => void;

  /**
   * Called when the user clicks "Clear Filter" in the context menu.
   *
   * @param columnKey - The key of the column whose filter should be cleared
   */
  onClearFilter?: (columnKey: string) => void;

  /**
   * Additional custom items to append at the bottom of the right-click context menu.
   * These appear after the built-in sort/filter/pin/hide options.
   *
   * @example
   * customContextMenuItems={[
   *   {
   *     key: 'copy',
   *     label: 'Copy column data',
   *     icon: <CopyIcon />,
   *     onClick: (columnKey) => copyColumn(columnKey),
   *   }
   * ]}
   */
  customContextMenuItems?: ColumnContextMenuItem[];

  /**
   * Custom icon overrides from BoltTable's `icons` prop.
   * Passed through automatically — do not set manually.
   */
  icons?: BoltTableIcons;
}

/**
 * Returns `true` if the column should show sort UI (ascending/descending).
 * Columns are sortable by default; set `column.sortable = false` to disable.
 *
 * @param col - The column definition to check
 */
function isColumnSortable(col: ColumnType<DataRecord>): boolean {
  return col.sortable !== false;
}

/**
 * Returns `true` if the column should show a filter input in the context menu.
 * Columns are filterable by default; set `column.filterable = false` to disable.
 *
 * @param col - The column definition to check
 */
function isColumnFilterable(col: ColumnType<DataRecord>): boolean {
  return col.filterable !== false;
}

/**
 * DraggableHeader — a single column header cell for BoltTable.
 *
 * Features:
 * - **Drag to reorder**: grip icon on the left; dragging is disabled for pinned columns.
 * - **Resize handle**: a 12px wide invisible hit area on the right edge.
 * - **Sort indicators**: ArrowUpAZ / ArrowDownAZ shown when sorted.
 * - **Filter indicator**: small Filter icon when a filter is active.
 * - **Right-click context menu**: sort asc/desc, filter input, pin left/right, hide column,
 *   plus any custom items passed via `customContextMenuItems`.
 * - **Unpin button**: replaces the resize handle on pinned columns.
 *
 * Wrapped in `React.memo` with a custom equality check — only re-renders when
 * its own column's data changes, preventing cascade re-renders across all headers
 * when a single column's sort/filter/width changes.
 *
 * @internal This is an internal BoltTable component. Use BoltTable directly.
 */
const DraggableHeader = React.memo(
  ({
    column,
    visualIndex,
    accentColor,
    onResizeStart,
    styles,
    classNames,
    hideGripIcon = false,
    gripIcon,
    stickyOffset,
    onTogglePin,
    onToggleHide,
    isLastColumn = false,
    sortDirection,
    onSort,
    filterValue = '',
    onFilter,
    onClearFilter,
    customContextMenuItems,
    icons,
    onColumnDragStart,
  }: DraggableHeaderProps) => {
    const effectivelySortable = isColumnSortable(column);
    const effectivelyFilterable = isColumnFilterable(column);

    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
    } | null>(null);

    const [showFilterInput, setShowFilterInput] = useState(false);

    const filterInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // ── Close context menu when clicking outside it ─────────────────────────
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setContextMenu(null);
        }
      };
      if (contextMenu) {
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
          document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [contextMenu]);

    /**
     * Shows the context menu at the cursor position, adjusting to stay within
     * the viewport boundaries so it never renders partially off-screen.
     */
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menuWidth = 160;
      const menuHeight = 180;
      let x = e.clientX;
      let y = e.clientY;

      // Flip horizontally if the menu would overflow the right edge
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }

      // Flip vertically if the menu would overflow the bottom edge
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      setContextMenu({ x, y });
    };

    /**
     * Forwards the resize start event to BoltTable.
     * Pinned columns cannot be resized — the event is swallowed silently.
     */
    const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Pinned columns cannot be resized
      if (column.pinned) return;
      onResizeStart?.(column.key, e);
    };

    const columnWidth = column.width ?? 150;
    const widthPx = `${columnWidth}px`;
    const isPinned = Boolean(column.pinned);
    const zIndex = isPinned ? 12 : 10;

    const headerStyle: CSSProperties = {
      position: 'sticky',
      top: 0,
      zIndex,
      width: isLastColumn ? '100%' : widthPx,
      minWidth: widthPx,
      ...(isLastColumn ? {} : { maxWidth: widthPx }),
      gridColumn: visualIndex + 1,
      gridRow: 1,
      borderTop: 'none',
      borderRight: 'none',
      borderBottom: '1px solid rgba(128,128,128,0.2)',
      borderLeft: 'none',
      ...(column.pinned === 'left' && stickyOffset !== undefined
        ? { left: `${stickyOffset}px` }
        : {}),
      ...(column.pinned === 'right' && stickyOffset !== undefined
        ? { right: `${stickyOffset}px` }
        : {}),
      ...(isPinned
        ? {
            backgroundColor: (styles as any)?.pinnedBg ?? 'color-mix(in srgb, currentColor 4%, Canvas)',
            ...styles?.pinnedHeader,
          }
        : {}),
      ...column.style,
      ...styles?.header,
      backgroundColor:
        ((styles as any)?.pinnedBg && isPinned)
          ? (styles as any).pinnedBg
          : (isPinned ? 'color-mix(in srgb, currentColor 4%, Canvas)' : 'rgba(128,128,128,0.06)'),
      display: 'flex',
      height: 36,
      alignItems: 'center',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      ...(isPinned
        ? {}
        : { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }),
    };

    return (
      <>
        <div
          data-column-key={column.key}
          data-bt-header=""
          style={headerStyle}
          className={`${column.className ?? ''} ${classNames?.header ?? ''} ${isPinned ? (classNames?.pinnedHeader ?? '') : ''}`}
          onContextMenu={handleContextMenu}
        >
          <div
            role={isPinned ? undefined : 'button'}
            tabIndex={isPinned ? undefined : 0}
            aria-roledescription={isPinned ? undefined : 'sortable'}
            onPointerDown={
              isPinned
                ? undefined
                : (e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    onColumnDragStart?.(column.key, e);
                  }
            }
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              height: '100%',
              flex: '1 1 0%',
              touchAction: 'none',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
              paddingLeft: 8,
              paddingRight: 8,
              borderLeft: '1px solid rgba(128,128,128,0.2)',
              fontWeight: 500,
              cursor: isPinned ? 'default' : 'grab',
            }}
            aria-label={
              isPinned
                ? `${column.key} column (pinned)`
                : `Drag ${column.key} column`
            }
          >
            {hideGripIcon || isPinned
              ? null
              : (icons?.gripVertical ?? gripIcon ?? (
                  <span data-bt-grip="" style={{ opacity: 0.35, flexShrink: 0, display: 'flex' }}>
                    <GripVerticalIcon style={{ width: 12, height: 12 }} />
                  </span>
                ))}

            <div
              style={{
                display: 'flex',
                minWidth: 0,
                alignItems: 'center',
                gap: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
                textAlign: 'left',
                userSelect: 'none',
              }}
            >
              {column.title}

              {sortDirection === 'asc' && (
                <span style={{ color: accentColor, flexShrink: 0, display: 'flex' }}>
                  {icons?.sortAsc ?? <ArrowUpAZIcon style={{ width: 12, height: 12 }} />}
                </span>
              )}

              {sortDirection === 'desc' && (
                <span style={{ color: accentColor, flexShrink: 0, display: 'flex' }}>
                  {icons?.sortDesc ?? <ArrowDownAZIcon style={{ width: 12, height: 12 }} />}
                </span>
              )}

              {filterValue && (
                <span style={{ color: accentColor, flexShrink: 0, display: 'flex' }}>
                  {icons?.filter ?? <FilterIcon style={{ width: 10, height: 10 }} />}
                </span>
              )}
            </div>
          </div>

          {/*
           * ── Unpin button (pinned columns only) ─────────────────────────
           * Replaces the resize handle for pinned columns. Clicking unpins
           * the column and restores it to its original position in the flow.
           */}
          {isPinned && (
            <button
              style={{
                position: 'relative',
                height: '100%',
                width: 24,
                flexShrink: 0,
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                padding: 0,
                color: accentColor || '#1788ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePin?.(column.key, false);
              }}
              aria-label={`Unpin ${column.key} column`}
              title="Unpin column"
            >
              {icons?.pinOff ?? <PinOffIcon style={{ width: 12, height: 12 }} />}
            </button>
          )}

          {!isPinned && (
            <button
              data-bt-resize=""
              style={{
                position: 'relative',
                height: '100%',
                width: 12,
                flexShrink: 0,
                cursor: 'col-resize',
                border: 'none',
                background: 'transparent',
                padding: 0,
              }}
              onMouseDown={handleResizeStart}
              aria-label={`Resize ${column.key} column`}
            >
              <div
                data-bt-resize-line=""
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: '100%',
                  width: 2,
                  opacity: 0,
                  transition: 'opacity 0.15s',
                  backgroundColor: accentColor || '#1788ff',
                }}
              />
            </button>
          )}
        </div>

        {/*
         * ── Context menu (right-click) ─────────────────────────────────────
         * Rendered as a portal at document.body so it's never clipped by the
         * table's overflow:hidden containers.
         * Sections: Sort | Filter | Pin | Hide | Custom items
         */}
        {contextMenu &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                fontSize: 10,
                position: 'fixed',
                zIndex: 9999,
                minWidth: 160,
                borderRadius: 6,
                border: '1px solid rgba(128,128,128,0.2)',
                paddingTop: 4,
                paddingBottom: 4,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(128,128,128,0.1)',
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
              }}
              role="menu"
            >
              {effectivelySortable && onSort && (
                <>
                  <button
                    data-bt-ctx-item=""
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: 8,
                      paddingLeft: 12,
                      paddingRight: 12,
                      paddingTop: 6,
                      paddingBottom: 6,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: 'inherit',
                      color: 'inherit',
                      fontWeight: sortDirection === 'asc' ? 600 : undefined,
                      ...(sortDirection === 'asc' ? { color: accentColor } : {}),
                    }}
                    onClick={() => {
                      onSort(column.key, 'asc');
                      setContextMenu(null);
                    }}
                  >
                    {icons?.sortAsc ?? <ArrowUpAZIcon style={{ width: 12, height: 12 }} />}
                    Sort Ascending
                  </button>
                  <button
                    data-bt-ctx-item=""
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: 8,
                      paddingLeft: 12,
                      paddingRight: 12,
                      paddingTop: 6,
                      paddingBottom: 6,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: 'inherit',
                      color: 'inherit',
                      fontWeight: sortDirection === 'desc' ? 600 : undefined,
                      ...(sortDirection === 'desc' ? { color: accentColor } : {}),
                    }}
                    onClick={() => {
                      onSort(column.key, 'desc');
                      setContextMenu(null);
                    }}
                  >
                    {icons?.sortDesc ?? <ArrowDownAZIcon style={{ width: 12, height: 12 }} />}
                    Sort Descending
                  </button>
                  <div style={{ marginTop: 4, marginBottom: 4, borderTop: '1px solid rgba(128,128,128,0.2)' }} />
                </>
              )}

              {effectivelyFilterable && onFilter && (
                <>
                  {showFilterInput ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 8, paddingTop: 6, paddingBottom: 6 }}>
                      <input
                        ref={filterInputRef}
                        type="text"
                        autoFocus
                        defaultValue={filterValue}
                        placeholder="Filter..."
                        style={{
                          width: '100%',
                          borderRadius: 4,
                          border: '1px solid rgba(128,128,128,0.2)',
                          paddingLeft: 6,
                          paddingRight: 6,
                          paddingTop: 2,
                          paddingBottom: 2,
                          fontSize: 12,
                          outline: 'none',
                          background: 'inherit',
                          color: 'inherit',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onFilter(
                              column.key,
                              (e.target as HTMLInputElement).value,
                            );
                            setShowFilterInput(false);
                            setContextMenu(null);
                          }
                          if (e.key === 'Escape') {
                            setShowFilterInput(false);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      data-bt-ctx-item=""
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 8,
                        paddingLeft: 12,
                        paddingRight: 12,
                        paddingTop: 6,
                        paddingBottom: 6,
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                      onClick={() => {
                        setShowFilterInput(true);
                      }}
                    >
                      {icons?.filter ?? <FilterIcon style={{ width: 12, height: 12 }} />}
                      {filterValue
                        ? `Filtered: "${filterValue}"`
                        : 'Filter Column'}
                    </button>
                  )}
                  {filterValue && (
                    <button
                      data-bt-ctx-item=""
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 8,
                        paddingLeft: 12,
                        paddingRight: 12,
                        paddingTop: 6,
                        paddingBottom: 6,
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontSize: 'inherit',
                        color: '#ef4444',
                      }}
                      onClick={() => {
                        onClearFilter?.(column.key);
                        setShowFilterInput(false);
                        setContextMenu(null);
                      }}
                    >
                      {icons?.filterClear ?? <FilterXIcon style={{ width: 12, height: 12 }} />}
                      Clear Filter
                    </button>
                  )}
                  <div style={{ marginTop: 4, marginBottom: 4, borderTop: '1px solid rgba(128,128,128,0.2)' }} />
                </>
              )}

              <button
                data-bt-ctx-item=""
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 8,
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  fontSize: 'inherit',
                  color: 'inherit',
                }}
                onClick={() => {
                  onTogglePin?.(
                    column.key,
                    column.pinned === 'left' ? false : 'left',
                  );
                  setContextMenu(null);
                }}
              >
                {column.pinned === 'left'
                  ? (icons?.pinOff ?? <PinOffIcon style={{ width: 12, height: 12 }} />)
                  : (icons?.pin ?? <PinIcon style={{ width: 12, height: 12 }} />)}
                {column.pinned === 'left' ? 'Unpin Left' : 'Pin Left'}
              </button>

              <button
                data-bt-ctx-item=""
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 8,
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  fontSize: 'inherit',
                  color: 'inherit',
                }}
                onClick={() => {
                  onTogglePin?.(
                    column.key,
                    column.pinned === 'right' ? false : 'right',
                  );
                  setContextMenu(null);
                }}
              >
                {column.pinned === 'right'
                  ? (icons?.pinOff ?? <PinOffIcon style={{ width: 12, height: 12 }} />)
                  : (icons?.pin ?? <PinIcon style={{ width: 12, height: 12 }} />)}
                {column.pinned === 'right' ? 'Unpin Right' : 'Pin Right'}
              </button>

              {!isPinned && (
                <>
                  <div style={{ marginTop: 4, marginBottom: 4, borderTop: '1px solid rgba(128,128,128,0.2)' }} />
                  <button
                    data-bt-ctx-item=""
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: 8,
                      paddingLeft: 12,
                      paddingRight: 12,
                      paddingTop: 6,
                      paddingBottom: 6,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                    onClick={() => {
                      onToggleHide?.(column.key);
                      setContextMenu(null);
                    }}
                  >
                    {icons?.eyeOff ?? <EyeOffIcon style={{ width: 12, height: 12 }} />}
                    Hide Column
                  </button>
                </>
              )}

              {customContextMenuItems && customContextMenuItems.length > 0 && (
                <>
                  <div style={{ marginTop: 4, marginBottom: 4, borderTop: '1px solid rgba(128,128,128,0.2)' }} />
                  {customContextMenuItems.map((item) => (
                    <button
                      key={item.key}
                      data-bt-ctx-item=""
                      disabled={item.disabled}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 8,
                        paddingLeft: 12,
                        paddingRight: 12,
                        paddingTop: 6,
                        paddingBottom: 6,
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontSize: 'inherit',
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        opacity: item.disabled ? 0.5 : 1,
                        color: item.danger ? '#ef4444' : 'inherit',
                      }}
                      onClick={() => {
                        item.onClick(column.key);
                        setContextMenu(null);
                      }}
                    >
                      {item.icon && (
                        <span style={{ display: 'flex', width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
                          {item.icon}
                        </span>
                      )}
                      {item.label}
                    </button>
                  ))}
                </>
              )}
            </div>,
            document.body,
          )}
      </>
    );
  },
  // ── Custom memo comparator ─────────────────────────────────────────────────
  // Only re-render when props that actually affect this header's output change.
  // This prevents a sort/filter change on one column from re-rendering all others.
  (prevProps, nextProps) => {
    return (
      prevProps.column.width === nextProps.column.width &&
      prevProps.column.key === nextProps.column.key &&
      prevProps.column.pinned === nextProps.column.pinned &&
      prevProps.column.sortable === nextProps.column.sortable &&
      prevProps.column.filterable === nextProps.column.filterable &&
      prevProps.column.sorter === nextProps.column.sorter &&
      prevProps.column.filterFn === nextProps.column.filterFn &&
      prevProps.visualIndex === nextProps.visualIndex &&
      prevProps.stickyOffset === nextProps.stickyOffset &&
      prevProps.isLastColumn === nextProps.isLastColumn &&
      prevProps.sortDirection === nextProps.sortDirection &&
      prevProps.filterValue === nextProps.filterValue
    );
  },
);

DraggableHeader.displayName = 'DraggableHeader';

export default DraggableHeader;