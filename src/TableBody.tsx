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
  accentColor?: string;
  isLoading?: boolean;
  recordFingerprint?: string;
}

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

    const content = column.render
      ? column.render(value, record, rowIndex)
      : ((value as React.ReactNode) ?? '');

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
        {isSystem ? content : (
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
}) => {
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const selectedKeySet = useMemo(() => new Set(normalizedSelectedKeys), [normalizedSelectedKeys]);

  const allDataForSelection = useMemo(() => {
    if (pinnedTopData.length === 0 && pinnedBottomData.length === 0)
      return data;
    return [...pinnedTopData, ...data, ...pinnedBottomData];
  }, [pinnedTopData, data, pinnedBottomData]);

  const pinnedRowBg =
    (styles as any)?.pinnedRowBg ?? (styles as any)?.pinnedBg;

  const columnStyles = useMemo(() => {
    return orderedColumns.map((col, colIndex) => {
      const stickyOffset = columnOffsets.get(col.key);
      const isPinned = Boolean(col.pinned);

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
        if (styles?.pinnedCell) Object.assign(style, styles.pinnedCell);
      }

      return { key: col.key, style, isPinned };
    });
  }, [orderedColumns, columnOffsets, totalSize, styles]);

  return (
    <>
      {columnStyles.map((colStyle, colIndex) => {
        const col = orderedColumns[colIndex];
        const hasRender = !!col.render;

        return (
          <div
            key={`spacer-${colStyle.key}`}
            {...(colStyle.isPinned ? { 'data-bt-pinned': '' } : {})}
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
              const isRowShimmer = isLoading || rowKey.startsWith('__shimmer_');
              const recordFingerprint = hasRender && !isRowShimmer
                ? JSON.stringify(row)
                : undefined;

              return (
                <div
                  key={`${rowKey}-${col.key}`}
                  data-row-key={rowKey}
                  data-column-key={col.key}
                  data-bt-cell=""
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
                      allData={allDataForSelection}
                      getRowKey={getRowKey}
                      accentColor={accentColor}
                      isLoading={isRowShimmer}
                      recordFingerprint={recordFingerprint}
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
            gridRow: 2,
            height: `${totalSize}px`,
            position: 'relative',
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          {virtualItems.map((virtualRow: VirtualItem) => {
            const row = data[virtualRow.index];
            const rk = getRowKey
              ? getRowKey(row, virtualRow.index)
              : String(virtualRow.index);

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
            gridRow: 2,
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
              const rk = getRowKey
                ? getRowKey(row, rowIdx)
                : String(rowIdx);
              const isSelected = selectedKeySet.has(rk);
              const isExpanded = resolvedExpandedKeys?.has(rk) ?? false;

              return (
                <div
                  key={`pinned-top-${rk}`}
                  className={classNames?.pinnedRow ?? ''}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplateColumns ?? '',
                    minWidth: totalTableWidth
                      ? `${totalTableWidth}px`
                      : undefined,
                    ...styles?.pinnedRow,
                  }}
                >
                  {orderedColumns.map((col) => {
                    const cellValue = row[col.dataIndex];
                    const stickyOffset = columnOffsets.get(col.key);
                    const isPinned = Boolean(col.pinned);
                    let zIndex = 0;
                    if (
                      col.key === '__select__' ||
                      col.key === '__expand__'
                    )
                      zIndex = 11;
                    else if (isPinned) zIndex = 2;

                    const recordFingerprint = col.render
                      ? JSON.stringify(row)
                      : undefined;

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
                            accentColor={accentColor}
                            isLoading={false}
                            recordFingerprint={recordFingerprint}
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
            gridRow: 2,
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
              const rk = getRowKey
                ? getRowKey(row, rowIdx)
                : String(rowIdx);
              const isSelected = selectedKeySet.has(rk);
              const isExpanded = resolvedExpandedKeys?.has(rk) ?? false;

              return (
                <div
                  key={`pinned-bottom-${rk}`}
                  className={classNames?.pinnedRow ?? ''}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplateColumns ?? '',
                    minWidth: totalTableWidth
                      ? `${totalTableWidth}px`
                      : undefined,
                    ...styles?.pinnedRow,
                  }}
                >
                  {orderedColumns.map((col) => {
                    const cellValue = row[col.dataIndex];
                    const stickyOffset = columnOffsets.get(col.key);
                    const isPinned = Boolean(col.pinned);
                    let zIndex = 0;
                    if (
                      col.key === '__select__' ||
                      col.key === '__expand__'
                    )
                      zIndex = 11;
                    else if (isPinned) zIndex = 2;

                    const recordFingerprint = col.render
                      ? JSON.stringify(row)
                      : undefined;

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
                            accentColor={accentColor}
                            isLoading={false}
                            recordFingerprint={recordFingerprint}
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
