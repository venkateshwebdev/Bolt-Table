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

interface DraggableHeaderProps {
  /** Column definition for this header cell. */
  column: ColumnType<DataRecord>;
  /** Visual position index in the ordered column array. */
  visualIndex: number;
  /** Accent color for indicators and highlights. */
  accentColor?: string;
  /** Called when the user starts resizing this column. */
  onResizeStart?: (columnKey: string, event: React.MouseEvent) => void;
  /** Called when the user starts dragging this column header. */
  onColumnDragStart?: (columnKey: string, event: React.PointerEvent) => void;
  /** Shared styling overrides for header cells. */
  styles?: StylesTypes;
  /** Shared CSS class name overrides for header cells. */
  classNames?: ClassNamesTypes;
  /** When true, the drag grip icon is hidden. */
  hideGripIcon?: boolean;
  /** Custom React node to use as the drag grip icon. */
  gripIcon?: React.ReactNode;
  /** Pixel offset from the pinned edge for sticky positioning. */
  stickyOffset?: number;
  /** Called when the user pins or unpins this column. */
  onTogglePin?: (columnKey: string, pinned: 'left' | 'right' | false) => void;
  /** Called when the user hides this column via the context menu. */
  onToggleHide?: (columnKey: string) => void;
  /** Whether this is the rightmost visible column. */
  isLastColumn?: boolean;
  /** Current sort direction applied to this column. */
  sortDirection?: SortDirection;
  /** Called when the user clicks a sort option in the context menu. */
  onSort?: (columnKey: string, direction?: SortDirection) => void;
  /** Current filter value active on this column. */
  filterValue?: string;
  /** Called when the user submits a filter value via the context menu. */
  onFilter?: (columnKey: string, value: string) => void;
  /** Called when the user clears the filter via the context menu. */
  onClearFilter?: (columnKey: string) => void;
  /** Additional custom items for the right-click context menu. */
  customContextMenuItems?: ColumnContextMenuItem[];
  /** Custom icon overrides from BoltTable's icons prop. */
  icons?: BoltTableIcons;
  /** When true, hides the filter option from the context menu. */
  disabledFilters?: boolean;
}

function isColumnSortable(col: ColumnType<DataRecord>): boolean {
  return col.sortable !== false;
}

function isColumnFilterable(col: ColumnType<DataRecord>): boolean {
  return col.filterable !== false;
}

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
    disabledFilters,
  }: DraggableHeaderProps) => {
    const effectivelySortable = isColumnSortable(column);
    const effectivelyFilterable = !disabledFilters && isColumnFilterable(column);

    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
    } | null>(null);

    const [showFilterInput, setShowFilterInput] = useState(false);

    const filterInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const showContextMenuAt = (clientX: number, clientY: number) => {
      const menuWidth = 160;
      const menuHeight = 180;
      let x = clientX;
      let y = clientY;
      if (x + menuWidth > window.innerWidth)
        x = window.innerWidth - menuWidth - 10;
      if (y + menuHeight > window.innerHeight)
        y = window.innerHeight - menuHeight - 10;
      setContextMenu({ x, y });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenuAt(e.clientX, e.clientY);
    };

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const cancelLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartRef.current = null;
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      cancelLongPress();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        showContextMenuAt(touch.clientX, touch.clientY);
      }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelLongPress();
    };

    const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
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
      display: 'flex',
      height: 36,
      alignItems: 'center',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
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
      ...column.style,
      ...(isPinned ? styles?.pinnedHeader : {}),
      ...styles?.header,
    };

    return (
      <>
        <div
          data-column-key={column.key}
          data-bt-header=""
          {...(isPinned ? { 'data-bt-pinned': '' } : {})}
          style={headerStyle}
          className={`${column.className ?? ''} ${classNames?.header ?? ''} ${isPinned ? (classNames?.pinnedHeader ?? '') : ''}`}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
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
              {(() => {
                const ctxItemBase: CSSProperties = {
                  cursor: 'pointer',
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 8,
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  textAlign: 'left' as const,
                  background: 'none',
                  border: 'none',
                  fontSize: 'inherit',
                  color: 'inherit',
                  ...styles?.contextMenuItem,
                };
                return (
                  <>
              {effectivelySortable && onSort && (
                <>
                  <button
                    data-bt-ctx-item=""
                    style={{
                      ...ctxItemBase,
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
                      ...ctxItemBase,
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
                      style={ctxItemBase}
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
                        ...ctxItemBase,
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
                style={ctxItemBase}
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
                style={ctxItemBase}
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
                    style={ctxItemBase}
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
                  </>
                );
              })()}
            </div>,
            document.body,
          )}
      </>
    );
  },
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
      prevProps.filterValue === nextProps.filterValue &&
      prevProps.classNames === nextProps.classNames &&
      prevProps.styles === nextProps.styles &&
      prevProps.customContextMenuItems === nextProps.customContextMenuItems &&
      prevProps.disabledFilters === nextProps.disabledFilters
    );
  },
);

DraggableHeader.displayName = 'DraggableHeader';

export default DraggableHeader;
