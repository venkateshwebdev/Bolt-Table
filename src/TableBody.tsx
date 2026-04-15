'use client';

import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ClassNamesTypes, StylesTypes } from './BoltTable';
import type {
  ColumnType,
  DataRecord,
  ExpandableConfig,
  RowSelectionConfig,
} from './types';

interface TableBodyProps {
  /** Current page's row data */
  data: DataRecord[];

  /** Ordered visible columns (left pinned → unpinned → right pinned) */
  orderedColumns: ColumnType<DataRecord>[];

  /** TanStack Virtual row virtualizer instance */
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;

  /** Map of column key → sticky offset in pixels */
  columnOffsets: Map<string, number>;

  /** Shared style overrides from BoltTable */
  styles?: StylesTypes;

  /** Shared class name overrides from BoltTable */
  classNames?: ClassNamesTypes;

  /** Row selection configuration */
  rowSelection?: RowSelectionConfig<DataRecord>;

  /** Pre-normalized selected row keys (all strings) */
  normalizedSelectedKeys?: string[];

  /** Returns the string key for a given row record and index */
  getRowKey?: (record: DataRecord, index: number) => string;

  /** Returns the original-typed key for a given row record and index */
  getRawRowKey?: (record: DataRecord, index: number) => React.Key;

  /** Expandable row configuration */
  expandable?: ExpandableConfig<DataRecord>;

  /** Set of currently expanded row keys */
  resolvedExpandedKeys?: Set<React.Key>;

  /** Height of each regular row in pixels */
  rowHeight?: number;

  /** Total pixel width of all columns combined */
  totalTableWidth?: number;

  /** Visible width of the scroll container in pixels */
  scrollAreaWidth?: number;

  /** Accent color for the expand toggle button */
  accentColor?: string;

  /** Ref to the scroll container element */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;

  /** When true, cells render as shimmer skeletons */
  isLoading?: boolean;

  /** Called when an expanded row's content height changes */
  onExpandedRowResize?: (rowKey: string, contentHeight: number) => void;

  /** Max height for expanded row panels (scrollable if exceeded) */
  maxExpandedRowHeight?: number;

  /** Rows pinned to the top of the table body */
  pinnedTopData?: DataRecord[];

  /** Rows pinned to the bottom of the table body */
  pinnedBottomData?: DataRecord[];

  /** CSS gridTemplateColumns string matching the parent grid */
  gridTemplateColumns?: string;

  /** Height of the column header row in pixels */
  headerHeight?: number;

  /** Returns a CSS class name for a given row based on its record and index */
  rowClassName?: (record: DataRecord, index: number) => string;

  /** Returns inline CSS styles for a given row based on its record and index */
  rowStyle?: (record: DataRecord, index: number) => React.CSSProperties;

  /** CSS grid row index for the body area. Defaults to 2. Set to 3 when column groups add an extra header row. */
  bodyGridRow?: number;

  /** Called when a user finishes editing an editable cell. */
  onEdit?: (value: unknown, record: DataRecord, dataIndex: string, rowIndex: number) => void;

  /** Identifies the cell currently in edit mode (set from the context menu). */
  editingCell?: { rowKey: string; columnKey: string } | null;

  /** Called when the editing input commits or cancels — clears `editingCell`. */
  onEditComplete?: () => void;
}

const SHIMMER_WIDTHS = [55, 70, 45, 80, 60, 50, 75, 65];

interface CellProps {
  value: unknown;
  record: DataRecord;
  column: ColumnType<DataRecord>;
  rowIndex: number;
  classNames?: ClassNamesTypes;
  styles?: StylesTypes;
  isSelected?: boolean;
  isExpanded?: boolean;
  rowSelection?: RowSelectionConfig<DataRecord>;
  normalizedSelectedKeys?: string[];
  rowKey?: string;
  allData?: DataRecord[];
  getRowKey?: (record: DataRecord, index: number) => string;
  getRawRowKey?: (record: DataRecord, index: number) => React.Key;
  accentColor?: string;
  isLoading?: boolean;
  recordFingerprint?: string;
  onEdit?: (value: unknown, record: DataRecord, dataIndex: string, rowIndex: number) => void;
  isEditing?: boolean;
  onEditComplete?: () => void;
}

const EditableCell = ({
  value,
  record,
  column,
  rowIndex,
  onEdit,
  onEditComplete,
}: {
  value: unknown;
  record: DataRecord;
  column: ColumnType<DataRecord>;
  rowIndex: number;
  onEdit: (value: unknown, record: DataRecord, dataIndex: string, rowIndex: number) => void;
  onEditComplete: () => void;
}) => {
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value ?? ''));
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [value]);

  const commit = useCallback(() => {
    const raw = String(value ?? '');
    if (draft !== raw && column.dataIndex) {
      const coerced: unknown =
        typeof value === 'number' && !Number.isNaN(Number(draft))
          ? Number(draft)
          : draft;
      onEdit(coerced, record, column.dataIndex, rowIndex);
    }
    onEditComplete();
  }, [draft, value, column.dataIndex, record, rowIndex, onEdit, onEditComplete]);

  const cancel = useCallback(() => {
    onEditComplete();
  }, [onEditComplete]);

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
      }}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        font: 'inherit',
        color: 'inherit',
        padding: 0,
        margin: 0,
        boxSizing: 'border-box',
      }}
    />
  );
};
EditableCell.displayName = 'EditableCell';

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
    getRawRowKey,
    accentColor,
    isLoading,
    onEdit,
    isEditing,
    onEditComplete,
  }: CellProps) => {
    const isPinned = Boolean(column.pinned);
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
            ...styles?.cell,
          }}
        >
          {shimmerContent}
        </div>
      );
    }

    if (column.key === '__select__' && rowSelection && rowKey !== undefined) {
      const checkboxProps = rowSelection.getCheckboxProps?.(record) ?? {
        disabled: false,
      };

      const rawKey: React.Key = getRawRowKey ? getRawRowKey(record, rowIndex) : rowKey!;

      const content =
        rowSelection.type === 'radio' ? (
          <input
            type="radio"
            checked={!!isSelected}
            disabled={checkboxProps.disabled}
            onChange={(e) => {
              e.stopPropagation();
              rowSelection.onSelect?.(record, true, [record], e.nativeEvent);
              rowSelection.onChange?.([rawKey], [record], { type: 'single' });
            }}
            style={{ cursor: 'pointer', accentColor,backgroundColor:'#94A3B8' }}
          />
        ) : (
          <input
            type="checkbox"
            checked={!!isSelected}
            disabled={checkboxProps.disabled}
            onChange={(e) => {
              e.stopPropagation();
              const currentKeys = rowSelection.selectedRowKeys ?? [];
              const newSelected = isSelected
                ? currentKeys.filter((k) => String(k) !== rowKey)
                : [...currentKeys, rawKey];
              const newSelectedRows = (allData ?? []).filter((row, idx) => {
                const rk = getRowKey ? getRowKey(row, idx) : String(idx);
                return newSelected.some((k) => String(k) === rk);
              });
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
            style={{ cursor: "pointer", accentColor,backgroundColor:'#94A3B8' }}
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
            justifyContent:
              column.key === '__select__' || column.key === '__expand__'
                ? 'center'
                : undefined,
            height: '100%',
            boxSizing: 'border-box',
            ...column.style,
            ...(isPinned ? styles?.pinnedCell : undefined),
            ...styles?.cell,
          }}
        >
          {content}
        </div>
      );
    }

    const isEditable = !!column.editable && !column.render && !!onEdit;
    const showEditor = isEditable && isEditing && onEditComplete;

    let content: React.ReactNode;
    if (showEditor) {
      content = (
        <EditableCell
          value={value}
          record={record}
          column={column}
          rowIndex={rowIndex}
          onEdit={onEdit!}
          onEditComplete={onEditComplete!}
        />
      );
    } else if (column.render) {
      try {
        content = column.render(value, record, rowIndex);
      } catch {
        content = String(value ?? '');
      }
    } else {
      content = (value as React.ReactNode) ?? '';
    }

    const isSystem = column.key === '__select__' || column.key === '__expand__';

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
          justifyContent: isSystem ? 'center' : undefined,
          height: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
          ...column.style,
          ...(isPinned ? styles?.pinnedCell : undefined),
          ...styles?.cell,
        }}
      >
        {isSystem ? content : showEditor ? content : (
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            {content}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.isLoading !== next.isLoading) return false;
    if (prev.column.pinned !== next.column.pinned) return false;
    if (prev.classNames !== next.classNames) return false;
    if (prev.styles !== next.styles) return false;
    if (prev.column.editable !== next.column.editable) return false;
    if (prev.onEdit !== next.onEdit) return false;
    if (prev.isEditing !== next.isEditing) return false;
    if (prev.onEditComplete !== next.onEditComplete) return false;
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
      if (prev.recordFingerprint !== next.recordFingerprint) return false;
      if (prev.rowIndex !== next.rowIndex) return false;
      return prev.column.render === next.column.render;
    }
    return (
      prev.value === next.value &&
      prev.rowIndex === next.rowIndex &&
      prev.column.key === next.column.key
    );
  },
);
Cell.displayName = 'Cell';

/** Wraps expanded row content and reports its height via ResizeObserver. */
const MeasuredExpandedRow = React.memo(
  ({
    rowKey,
    onResize,
    children,
  }: {
    rowKey: string;
    onResize: (rowKey: string, height: number) => void;
    children: React.ReactNode;
  }) => {
    const ref = useRef<HTMLDivElement>(null);

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
  getRawRowKey,
  expandable,
  resolvedExpandedKeys,
  rowHeight = 40,
  totalTableWidth,
  scrollAreaWidth,
  accentColor,
  isLoading = false,
  onExpandedRowResize,
  maxExpandedRowHeight,
  pinnedTopData = [],
  pinnedBottomData = [],
  gridTemplateColumns,
  headerHeight = 36,
  rowClassName,
  rowStyle,
  bodyGridRow = 2,
  onEdit,
  editingCell,
  onEditComplete,
}) => {
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const selectedKeySet = useMemo(() => new Set(normalizedSelectedKeys), [normalizedSelectedKeys]);

  const safeData = data ?? [];
  const safeColumns = orderedColumns ?? [];

  const allDataForSelection = useMemo(() => {
    if (pinnedTopData.length === 0 && pinnedBottomData.length === 0)
      return safeData;
    return [...pinnedTopData, ...safeData, ...pinnedBottomData];
  }, [pinnedTopData, safeData, pinnedBottomData]);

  const pinnedRowBg =
    (styles as any)?.pinnedRowBg ?? (styles as any)?.pinnedBg;

  const columnStyles = useMemo(() => {
    return safeColumns.map((col, colIndex) => {
      const stickyOffset = columnOffsets.get(col.key);
      const isPinned = Boolean(col.pinned);

      let zIndex = 0;
      if (col.key === '__select__' || col.key === '__expand__') zIndex = 11;
      else if (isPinned) zIndex = 2;

      const style: React.CSSProperties = {
        gridColumn: colIndex + 1,
        gridRow: bodyGridRow,
        height: `${totalSize}px`,
        position: isPinned ? 'sticky' : 'relative',
        zIndex,
      };

      if (col.pinned === 'left' && stickyOffset !== undefined)
        style.left = `${stickyOffset}px`;
      else if (col.pinned === 'right' && stickyOffset !== undefined)
        style.right = `${stickyOffset}px`;

      if (isPinned) {
        if (styles?.pinnedCell) Object.assign(style, styles.pinnedCell);
      }

      return { key: col.key, style, isPinned };
    });
  }, [safeColumns, columnOffsets, totalSize, styles, bodyGridRow]);

  if (safeData.length === 0 || safeColumns.length === 0) return null;

  return (
    <>
      {columnStyles.map((colStyle, colIndex) => {
        const col = safeColumns[colIndex];
        if (!col) return null;
        const hasRender = !!col.render;

        return (
          <div
            key={`spacer-${colStyle.key}`}
            {...(colStyle.isPinned ? { 'data-bt-pinned': '' } : {})}
            style={colStyle.style}
          >
            {virtualItems.map((virtualRow: VirtualItem) => {
              const row = safeData[virtualRow.index];
              if (row == null) return null;
              const rowKey = getRowKey
                ? getRowKey(row, virtualRow.index)
                : String(virtualRow.index);
              const isSelected = selectedKeySet.has(rowKey);
              const isExpanded = resolvedExpandedKeys?.has(rowKey) ?? false;
              const cellValue = col.dataIndex != null ? row[col.dataIndex] : undefined;
              const isRowShimmer = isLoading || rowKey.startsWith('__shimmer_');
              let recordFingerprint: string | undefined;
              if (hasRender && !isRowShimmer) {
                try { recordFingerprint = JSON.stringify(row); } catch { recordFingerprint = rowKey; }
              }

              let rowCls = '';
              try { rowCls = rowClassName ? rowClassName(row, virtualRow.index) : ''; } catch { /* ignore */ }
              let rowSty: React.CSSProperties | undefined;
              try { rowSty = rowStyle ? rowStyle(row, virtualRow.index) : undefined; } catch { /* ignore */ }

              return (
                <div
                  key={`${rowKey}-${col.key}`}
                  data-row-key={rowKey}
                  data-column-key={col.key}
                  data-bt-cell=""
                  data-selected={isSelected || undefined}
                  className={rowCls || undefined}
                  style={{
                    position: 'absolute',
                    top: `${virtualRow.start}px`,
                    left: 0,
                    right: 0,
                    height: `${virtualRow.size}px`,
                    ...rowSty,
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
                      allData={allDataForSelection}
                      getRowKey={getRowKey}
                      getRawRowKey={getRawRowKey}
                      accentColor={accentColor}
                      isLoading={isRowShimmer}
                      recordFingerprint={recordFingerprint}
                      onEdit={onEdit}
                      isEditing={editingCell?.rowKey === rowKey && editingCell?.columnKey === col.key}
                      onEditComplete={onEditComplete}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {expandable && (
        <div
          style={{
            gridColumn: '1 / -1',
            gridRow: bodyGridRow,
            height: `${totalSize}px`,
            position: 'relative',
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          {virtualItems.map((virtualRow: VirtualItem) => {
            const row = safeData[virtualRow.index];
            if (row == null) return null;
            const rk = getRowKey
              ? getRowKey(row, virtualRow.index)
              : String(virtualRow.index);

            if (!(resolvedExpandedKeys?.has(rk) ?? false)) return null;

            let expandedRenderResult: React.ReactNode = null;
            try {
              expandedRenderResult = expandable.expandedRowRender(row, virtualRow.index, 0, true);
            } catch { /* gracefully swallow render errors in expanded content */ }

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
                {expandedRenderResult}
              </div>
            );

            return (
              <div
                key={`expanded-${rk}`}
                style={{
                  position: 'absolute',
                  top: virtualRow.start + rowHeight,
                  left: 0,
                  right: 0,
                }}
              >
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

      {pinnedTopData.length > 0 && (
        <div
          style={{
            gridColumn: '1 / -1',
            gridRow: bodyGridRow,
            height: `${totalSize}px`,
            position: 'relative',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: headerHeight,
              pointerEvents: 'auto',
              boxShadow: '0 2px 6px -1px rgba(0,0,0,0.08)',
            }}
          >
            {pinnedTopData.map((row, rowIdx) => {
              if (row == null) return null;
              const rk = getRowKey
                ? getRowKey(row, rowIdx)
                : String(rowIdx);
              const isSelected = selectedKeySet.has(rk);
              const isExpanded = resolvedExpandedKeys?.has(rk) ?? false;

              let rowCls = '';
              try { rowCls = rowClassName ? rowClassName(row, rowIdx) : ''; } catch { /* ignore */ }
              let rowSty: React.CSSProperties | undefined;
              try { rowSty = rowStyle ? rowStyle(row, rowIdx) : undefined; } catch { /* ignore */ }

              return (
                <div
                  key={`pinned-top-${rk}`}
                  className={`${classNames?.pinnedRow ?? ''} ${rowCls}`.trim() || undefined}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplateColumns ?? '',
                    minWidth: totalTableWidth
                      ? `${totalTableWidth}px`
                      : undefined,
                    ...styles?.pinnedRow,
                    ...rowSty,
                  }}
                >
                  {safeColumns.map((col) => {
                    const cellValue = col.dataIndex != null ? row[col.dataIndex] : undefined;
                    const stickyOffset = columnOffsets.get(col.key);
                    const isPinned = Boolean(col.pinned);
                    let zIndex = 0;
                    if (
                      col.key === '__select__' ||
                      col.key === '__expand__'
                    )
                      zIndex = 11;
                    else if (isPinned) zIndex = 2;

                    let recordFingerprint: string | undefined;
                    if (col.render) {
                      try { recordFingerprint = JSON.stringify(row); } catch { recordFingerprint = rk; }
                    }

                    return (
                      <div
                        key={col.key}
                        data-row-key={rk}
                        data-column-key={col.key}
                        data-bt-cell=""
                        data-selected={isSelected || undefined}
                        style={{
                          position: isPinned ? 'sticky' : 'relative',
                          ...(col.pinned === 'left' &&
                          stickyOffset !== undefined
                            ? { left: `${stickyOffset}px` }
                            : {}),
                          ...(col.pinned === 'right' &&
                          stickyOffset !== undefined
                            ? { right: `${stickyOffset}px` }
                            : {}),
                          zIndex,
                          backgroundColor: pinnedRowBg,
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          ...(isPinned && styles?.pinnedCell
                            ? styles.pinnedCell
                            : {}),
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
                            rowIndex={rowIdx}
                            classNames={classNames}
                            styles={styles}
                            isSelected={isSelected}
                            isExpanded={isExpanded}
                            rowSelection={rowSelection}
                            normalizedSelectedKeys={normalizedSelectedKeys}
                            rowKey={rk}
                            allData={allDataForSelection}
                            getRowKey={getRowKey}
                            getRawRowKey={getRawRowKey}
                            accentColor={accentColor}
                            isLoading={false}
                            recordFingerprint={recordFingerprint}
                            onEdit={onEdit}
                            isEditing={editingCell?.rowKey === rk && editingCell?.columnKey === col.key}
                            onEditComplete={onEditComplete}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pinnedBottomData.length > 0 && (
        <div
          style={{
            gridColumn: '1 / -1',
            gridRow: bodyGridRow,
            height: `${totalSize}px`,
            position: 'relative',
            zIndex: 20,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              marginTop: 'auto',
              position: 'sticky',
              bottom: 0,
              pointerEvents: 'auto',
              boxShadow: '0 -2px 6px -1px rgba(0,0,0,0.08)',
            }}
          >
            {pinnedBottomData.map((row, rowIdx) => {
              if (row == null) return null;
              const rk = getRowKey
                ? getRowKey(row, rowIdx)
                : String(rowIdx);
              const isSelected = selectedKeySet.has(rk);
              const isExpanded = resolvedExpandedKeys?.has(rk) ?? false;

              let rowCls = '';
              try { rowCls = rowClassName ? rowClassName(row, rowIdx) : ''; } catch { /* ignore */ }
              let rowSty: React.CSSProperties | undefined;
              try { rowSty = rowStyle ? rowStyle(row, rowIdx) : undefined; } catch { /* ignore */ }

              return (
                <div
                  key={`pinned-bottom-${rk}`}
                  className={`${classNames?.pinnedRow ?? ''} ${rowCls}`.trim() || undefined}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplateColumns ?? '',
                    minWidth: totalTableWidth
                      ? `${totalTableWidth}px`
                      : undefined,
                    ...styles?.pinnedRow,
                    ...rowSty,
                  }}
                >
                  {safeColumns.map((col) => {
                    const cellValue = col.dataIndex != null ? row[col.dataIndex] : undefined;
                    const stickyOffset = columnOffsets.get(col.key);
                    const isPinned = Boolean(col.pinned);
                    let zIndex = 0;
                    if (
                      col.key === '__select__' ||
                      col.key === '__expand__'
                    )
                      zIndex = 11;
                    else if (isPinned) zIndex = 2;

                    let recordFingerprint: string | undefined;
                    if (col.render) {
                      try { recordFingerprint = JSON.stringify(row); } catch { recordFingerprint = rk; }
                    }

                    return (
                      <div
                        key={col.key}
                        data-row-key={rk}
                        data-column-key={col.key}
                        data-bt-cell=""
                        data-selected={isSelected || undefined}
                        style={{
                          position: isPinned ? 'sticky' : 'relative',
                          ...(col.pinned === 'left' &&
                          stickyOffset !== undefined
                            ? { left: `${stickyOffset}px` }
                            : {}),
                          ...(col.pinned === 'right' &&
                          stickyOffset !== undefined
                            ? { right: `${stickyOffset}px` }
                            : {}),
                          zIndex,
                          backgroundColor: pinnedRowBg,
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          ...(isPinned && styles?.pinnedCell
                            ? styles.pinnedCell
                            : {}),
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
                            rowIndex={rowIdx}
                            classNames={classNames}
                            styles={styles}
                            isSelected={isSelected}
                            isExpanded={isExpanded}
                            rowSelection={rowSelection}
                            normalizedSelectedKeys={normalizedSelectedKeys}
                            rowKey={rk}
                            allData={allDataForSelection}
                            getRowKey={getRowKey}
                            getRawRowKey={getRawRowKey}
                            accentColor={accentColor}
                            isLoading={false}
                            recordFingerprint={recordFingerprint}
                            onEdit={onEdit}
                            isEditing={editingCell?.rowKey === rk && editingCell?.columnKey === col.key}
                            onEditComplete={onEditComplete}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

TableBody.displayName = 'TableBody';

export default TableBody;
