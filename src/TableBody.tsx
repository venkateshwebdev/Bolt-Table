"use client";

import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ClassNamesTypes, StylesTypes } from "./BoltTable";
import type {
  ColumnType,
  DataRecord,
  ExpandableConfig,
  RowSelectionConfig,
} from "./types";

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
  onEdit?: (
    value: unknown,
    record: DataRecord,
    dataIndex: string,
    rowIndex: number,
  ) => void;

  /** Identifies the cell currently in edit mode (set from the context menu). */
  editingCell?: { rowKey: string; columnKey: string } | null;

  /** Called when the editing input commits or cancels — clears `editingCell`. */
  onEditComplete?: () => void;

  /** When true, rows use content-based heights measured by ResizeObserver. */
  enableDynamicRowHeight?: boolean;

  /** Called when a row's measured height changes. Used by the parent to update the virtualizer. */
  onRowHeightChange?: (index: number, height: number) => void;

  /** Maps column key → 1-based CSS grid column index in the full (non-virtualized) grid. Required for correct placement when column virtualization is enabled. */
  columnGridIndexMap?: Map<string, number>;

  /** Optional AI cell style function. Returns extra styles for a specific cell. */
  cellStyleFn?: (
    record: DataRecord,
    columnKey: string,
  ) => React.CSSProperties | undefined;

  /** Called when the user starts dragging a row by its grip handle. */
  onRowDragStart?: (rowIndex: number, e: React.PointerEvent) => void;

  /** Currently focused cell coordinates for keyboard navigation. */
  focusedCell?: { row: number; col: number } | null;

  /** Enable row position animation on data changes. */
  enableRowAnimation?: boolean;

  /** Called when a group header is clicked to toggle collapse. */
  onGroupToggle?: (groupKey: string) => void;

  /** Accent color for group headers. */
  groupAccentColor?: string;

  /** Called when a tree node expand/collapse is toggled. */
  onTreeToggle?: (key: React.Key) => void;

  /** Tree data indent size in pixels per level. */
  treeIndentSize?: number;
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
  onEdit?: (
    value: unknown,
    record: DataRecord,
    dataIndex: string,
    rowIndex: number,
  ) => void;
  isEditing?: boolean;
  onEditComplete?: () => void;
  cellStyleFn?: (
    record: DataRecord,
    columnKey: string,
  ) => React.CSSProperties | undefined;
  treeLevel?: number;
  treeHasChildren?: boolean;
  treeExpanded?: boolean;
  treeIndentSize?: number;
  onTreeToggle?: (key: React.Key) => void;
  treeKey?: React.Key;
  isFirstDataCol?: boolean;
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
  onEdit: (
    value: unknown,
    record: DataRecord,
    dataIndex: string,
    rowIndex: number,
  ) => void;
  onEditComplete: () => void;
}) => {
  const editorType = column.editorType ?? "text";
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setDraft(String(value ?? ""));
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    });
  }, [value]);

  const commit = useCallback(
    (newVal?: unknown) => {
      const raw = String(value ?? "");
      const finalVal = newVal !== undefined ? newVal : draft;
      if (String(finalVal) !== raw && column.dataIndex) {
        let coerced: unknown = finalVal;
        if (newVal === undefined) {
          coerced =
            typeof value === "number" && !Number.isNaN(Number(draft))
              ? Number(draft)
              : draft;
        }
        onEdit(coerced, record, column.dataIndex, rowIndex);
      }
      onEditComplete();
    },
    [draft, value, column.dataIndex, record, rowIndex, onEdit, onEditComplete],
  );

  const cancel = useCallback(() => {
    onEditComplete();
  }, [onEditComplete]);

  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    font: "inherit",
    color: "inherit",
    padding: 0,
    margin: 0,
    boxSizing: "border-box",
  };

  if (editorType === "toggle") {
    return (
      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", width: "100%", height: "100%" }}>
        <input
          data-bt-check=""
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            commit(e.target.checked);
          }}
        />
      </label>
    );
  }

  if (editorType === "select") {
    const options = column.editorOptions ?? [];
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => commit()}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        style={{ ...baseStyle, cursor: "pointer" }}
      >
        {options.map((opt) => {
          const label = typeof opt === "string" ? opt : opt.label;
          const val = typeof opt === "string" ? opt : String(opt.value);
          return (
            <option key={val} value={val}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={editorType === "date" ? "date" : editorType === "number" ? "number" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      style={baseStyle}
    />
  );
};
EditableCell.displayName = "EditableCell";

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
    cellStyleFn,
    treeLevel,
    treeHasChildren,
    treeExpanded,
    treeIndentSize = 20,
    onTreeToggle,
    treeKey,
    isFirstDataCol,
  }: CellProps) => {
    const isPinned = Boolean(column.pinned);
    const extraCellStyle = cellStyleFn?.(record, column.dataIndex ?? column.key);

    const [lazyValue, setLazyValue] = useState<{ loaded: boolean; value: unknown }>({ loaded: false, value: undefined });
    useEffect(() => {
      if (!column.lazyLoad) return;
      let cancelled = false;
      setLazyValue({ loaded: false, value: undefined });
      column.lazyLoad(record).then((v) => {
        if (!cancelled) setLazyValue({ loaded: true, value: v });
      }).catch(() => {
        if (!cancelled) setLazyValue({ loaded: true, value: undefined });
      });
      return () => { cancelled = true; };
    }, [column.lazyLoad, record]);
    if (
      isLoading &&
      column.key !== "__select__" &&
      column.key !== "__expand__"
    ) {
      const shimmerContent = column.shimmerRender ? (
        column.shimmerRender()
      ) : (
        <div
          style={{
            backgroundColor: "rgba(100, 116, 139, 0.15)",
            animation: "bt-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            borderRadius: 4,
            width: `${SHIMMER_WIDTHS[(rowIndex + column.key.length) % SHIMMER_WIDTHS.length]}%`,
            height: 14,
          }}
        />
      );

      return (
        <div
          className={`${column.className ?? ""} ${classNames?.cell ?? ""} ${isPinned ? (classNames?.pinnedCell ?? "") : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            borderBottom: "1px solid rgba(128,128,128,0.2)",
            paddingLeft: 8,
            paddingRight: 8,
            height: "100%",
            boxSizing: "border-box",
            ...column.style,
            ...(isPinned ? styles?.pinnedCell : undefined),
            ...styles?.cell,
          }}
        >
          {shimmerContent}
        </div>
      );
    }

    if (column.key === "__select__" && rowSelection && rowKey !== undefined) {
      const checkboxProps = rowSelection.getCheckboxProps?.(record) ?? {
        disabled: false,
      };

      const rawKey: React.Key = getRawRowKey
        ? getRawRowKey(record, rowIndex)
        : rowKey!;

      const content =
        rowSelection.type === "radio" ? (
          <input
            data-bt-check=""
            type="radio"
            checked={!!isSelected}
            disabled={checkboxProps.disabled}
            onChange={(e) => {
              e.stopPropagation();
              rowSelection.onSelect?.(record, true, [record], e.nativeEvent);
              rowSelection.onChange?.([rawKey], [record], { type: "single" });
            }}
          />
        ) : (
          <input
            data-bt-check=""
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
                type: "multiple",
              });
            }}
          />
        );

      return (
        <div
          className={`${column.className ?? ""} ${classNames?.cell ?? ""} ${isPinned ? (classNames?.pinnedCell ?? "") : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            borderBottom: "1px solid rgba(128,128,128,0.2)",
            paddingLeft: 8,
            paddingRight: 8,
            justifyContent:
              column.key === "__select__" || column.key === "__expand__"
                ? "center"
                : undefined,
            height: "100%",
            boxSizing: "border-box",
            ...column.style,
            ...(isPinned ? styles?.pinnedCell : undefined),
            ...styles?.cell,
          }}
        >
          {content}
        </div>
      );
    }

    if (column.lazyLoad && !lazyValue.loaded) {
      return (
        <div
          role="gridcell"
          className={`${column.className ?? ""} ${classNames?.cell ?? ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            borderBottom: "1px solid rgba(128,128,128,0.2)",
            paddingLeft: 8,
            paddingRight: 8,
            height: "100%",
            boxSizing: "border-box",
            ...column.style,
            ...styles?.cell,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(100, 116, 139, 0.15)",
              animation: "bt-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              borderRadius: 4,
              width: "60%",
              height: 14,
            }}
          />
        </div>
      );
    }

    const effectiveValue = column.lazyLoad ? lazyValue.value : value;

    const isEditable = !!column.editable && !column.render && !!onEdit;
    const showEditor = isEditable && isEditing && onEditComplete;

    let content: React.ReactNode;
    if (showEditor) {
      content = (
        <EditableCell
          value={effectiveValue}
          record={record}
          column={column}
          rowIndex={rowIndex}
          onEdit={onEdit!}
          onEditComplete={onEditComplete!}
        />
      );
    } else if (column.render) {
      try {
        content = column.render(effectiveValue, record, rowIndex);
      } catch {
        content = String(effectiveValue ?? "");
      }
    } else {
      content = (effectiveValue as React.ReactNode) ?? "";
    }

    const isSystem = column.key === "__select__" || column.key === "__expand__";
    const showTreeIndent = isFirstDataCol && treeLevel != null && treeLevel > 0;
    const showTreeToggle = isFirstDataCol && treeHasChildren;
    const treeIndent = showTreeIndent ? treeLevel * treeIndentSize : 0;

    return (
      <div
        role="gridcell"
        className={`${column.className ?? ""} ${classNames?.cell ?? ""} ${isPinned ? (classNames?.pinnedCell ?? "") : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          borderBottom: "1px solid rgba(128,128,128,0.2)",
          paddingLeft: isFirstDataCol ? 8 + treeIndent : 8,
          paddingRight: 8,
          justifyContent: isSystem ? "center" : undefined,
          height: "100%",
          boxSizing: "border-box",
          minWidth: 0,
          ...column.style,
          ...(isPinned ? styles?.pinnedCell : undefined),
          ...styles?.cell,
          ...extraCellStyle,
        }}
      >
        {showTreeToggle && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTreeToggle?.(treeKey!); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginRight: 4,
              width: 16,
              height: 16,
              flexShrink: 0,
              transform: treeExpanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.15s ease",
              fontSize: "0.75em",
              color: "inherit",
              opacity: 0.6,
            }}
          >
            ▼
          </button>
        )}
        {isFirstDataCol && treeLevel != null && !treeHasChildren && (
          <span style={{ display: "inline-block", width: 20, flexShrink: 0 }} />
        )}
        {isSystem ? (
          content
        ) : showEditor ? (
          content
        ) : (
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              maxWidth: "100%",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (el.scrollWidth > el.clientWidth) {
                el.title = el.textContent ?? "";
              } else {
                el.removeAttribute("title");
              }
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
    if (prev.cellStyleFn !== next.cellStyleFn) return false;
    if (prev.column.key === "__select__") {
      return (
        prev.isSelected === next.isSelected &&
        prev.normalizedSelectedKeys === next.normalizedSelectedKeys
      );
    }
    if (prev.column.key === "__expand__") {
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
Cell.displayName = "Cell";

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
MeasuredExpandedRow.displayName = "MeasuredExpandedRow";

/** Measures actual row height when dynamic row heights are enabled. */
const DynamicRowMeasurer = React.memo(
  ({
    index,
    onHeightChange,
    children,
  }: {
    index: number;
    onHeightChange: (index: number, height: number) => void;
    children: React.ReactNode;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const onHeightChangeRef = useRef(onHeightChange);
    useEffect(() => {
      onHeightChangeRef.current = onHeightChange;
    }, [onHeightChange]);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const height = entries[0]?.borderBoxSize?.[0]?.blockSize;
        if (height != null && height > 0) {
          onHeightChangeRef.current(index, Math.ceil(height));
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [index]);

    return <div ref={ref}>{children}</div>;
  },
);
DynamicRowMeasurer.displayName = "DynamicRowMeasurer";

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
  enableDynamicRowHeight = false,
  onRowHeightChange,
  columnGridIndexMap,
  cellStyleFn,
  onRowDragStart,
  focusedCell,
  enableRowAnimation = false,
  onGroupToggle,
  groupAccentColor,
  onTreeToggle,
  treeIndentSize = 20,
}) => {
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const selectedKeySet = useMemo(
    () => new Set(normalizedSelectedKeys),
    [normalizedSelectedKeys],
  );

  const safeData = data ?? [];
  const safeColumns = orderedColumns ?? [];

  const firstDataColIndex = useMemo(() => {
    const systemKeys = new Set(["__select__", "__expand__", "__drag__"]);
    return safeColumns.findIndex((c) => !systemKeys.has(c.key));
  }, [safeColumns]);

  const allDataForSelection = useMemo(() => {
    if (pinnedTopData.length === 0 && pinnedBottomData.length === 0)
      return safeData;
    return [...pinnedTopData, ...safeData, ...pinnedBottomData];
  }, [pinnedTopData, safeData, pinnedBottomData]);

  const pinnedRowBg = (styles as any)?.pinnedRowBg ?? (styles as any)?.pinnedBg;

  const columnStyles = useMemo(() => {
    return safeColumns.map((col, colIndex) => {
      const stickyOffset = columnOffsets.get(col.key);
      const isPinned = Boolean(col.pinned);

      let zIndex = 0;
      if (col.key === "__select__" || col.key === "__expand__") zIndex = 11;
      else if (isPinned) zIndex = 2;

      const gridCol = columnGridIndexMap?.get(col.key) ?? colIndex + 1;

      const style: React.CSSProperties = {
        gridColumn: gridCol,
        gridRow: bodyGridRow,
        height: `${totalSize}px`,
        position: isPinned ? "sticky" : "relative",
        zIndex,
      };

      if (col.pinned === "left" && stickyOffset !== undefined)
        style.left = `${stickyOffset}px`;
      else if (col.pinned === "right" && stickyOffset !== undefined)
        style.right = `${stickyOffset}px`;

      if (isPinned) {
        if (styles?.pinnedCell) Object.assign(style, styles.pinnedCell);
      }

      return { key: col.key, style, isPinned };
    });
  }, [safeColumns, columnOffsets, totalSize, styles, bodyGridRow, columnGridIndexMap]);

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
            {...(colStyle.isPinned ? { "data-bt-pinned": "" } : {})}
            style={colStyle.style}
          >
            {virtualItems.map((virtualRow: VirtualItem) => {
              const row = safeData[virtualRow.index];
              if (row == null) return null;

              const isGroupHeader = !!(row as any).__bt_group_header__;
              if (isGroupHeader) {
                const gk = (row as any).__bt_group_key__ as string;
                const gv = (row as any).__bt_group_value__;
                const gCount = (row as any).__bt_group_count__ as number;
                const gCollapsed = (row as any).__bt_group_collapsed__ as boolean;
                const gAggregates = ((row as any).__bt_group_aggregates__ ?? {}) as Record<string, unknown>;

                if (colIndex === 0) {
                  return (
                    <div
                      key={`group-${gk}`}
                      data-bt-group-header={gk}
                      className={classNames?.groupHeader ?? ""}
                      style={{
                        position: "absolute",
                        top: `${virtualRow.start}px`,
                        left: 0,
                        right: 0,
                        height: `${virtualRow.size}px`,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        paddingLeft: 8,
                        paddingRight: 8,
                        fontSize: "inherit",
                        fontWeight: 600,
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(128,128,128,0.2)",
                        background: `linear-gradient(90deg, ${groupAccentColor ?? "#6366f1"}08, transparent)`,
                        gridColumn: "1 / -1",
                        userSelect: "none",
                        ...styles?.groupHeader,
                      }}
                      onClick={() => onGroupToggle?.(gk)}
                    >
                      <span style={{
                        display: "inline-flex",
                        transform: gCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                        fontSize: "0.75em",
                      }}>
                        ▼
                      </span>
                      <span>{String(gv ?? gk)}</span>
                      <span style={{ opacity: 0.5, fontWeight: 400 }}>({gCount})</span>
                      {Object.entries(gAggregates).map(([k, v]) => (
                        <span key={k} style={{ opacity: 0.6, fontWeight: 400, marginLeft: 4 }}>
                          {k}: {String(v ?? "")}
                        </span>
                      ))}
                    </div>
                  );
                }
                return null;
              }

              const tLevel = (row as any).__bt_tree_level__ as number | undefined;
              const tHasChildren = (row as any).__bt_tree_has_children__ as boolean | undefined;
              const tExpanded = (row as any).__bt_tree_expanded__ as boolean | undefined;
              const tKey = (row as any).__bt_tree_key__ as React.Key | undefined;

              const rowKey = getRowKey
                ? getRowKey(row, virtualRow.index)
                : String(virtualRow.index);
              const isSelected = selectedKeySet.has(rowKey);
              const isExpanded = resolvedExpandedKeys?.has(rowKey) ?? false;
              const cellValue =
                col.dataIndex != null ? row[col.dataIndex] : undefined;
              const isRowShimmer = isLoading || rowKey.startsWith("__shimmer_");
              let recordFingerprint: string | undefined;
              if (hasRender && !isRowShimmer) {
                try {
                  recordFingerprint = JSON.stringify(row);
                } catch {
                  recordFingerprint = rowKey;
                }
              }

              let rowCls = "";
              try {
                rowCls = rowClassName
                  ? rowClassName(row, virtualRow.index)
                  : "";
              } catch {
                /* ignore */
              }
              let rowSty: React.CSSProperties | undefined;
              try {
                rowSty = rowStyle ? rowStyle(row, virtualRow.index) : undefined;
              } catch {
                /* ignore */
              }

              const isFocused = focusedCell?.row === virtualRow.index && focusedCell?.col === colIndex;

              return (
                <div
                  key={`${rowKey}-${col.key}`}
                  data-row-key={rowKey}
                  data-row-index={virtualRow.index}
                  data-column-key={col.key}
                  data-bt-cell=""
                  data-selected={isSelected || undefined}
                  {...(isFocused ? { "data-bt-focused": "" } : {})}
                  className={rowCls || undefined}
                  style={{
                    position: "absolute",
                    top: `${virtualRow.start}px`,
                    left: 0,
                    right: 0,
                    height: enableDynamicRowHeight
                      ? undefined
                      : `${virtualRow.size}px`,
                    minHeight: enableDynamicRowHeight
                      ? `${rowHeight}px`
                      : undefined,
                    ...(enableRowAnimation ? { transition: "top 0.2s ease, opacity 0.2s ease" } : {}),
                  }}
                >
                  {col.key === "__drag__" && onRowDragStart ? (
                    <div
                      style={{
                        height: `${rowHeight}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottom: "1px solid rgba(128,128,128,0.2)",
                        ...rowSty,
                      }}
                    >
                      <span
                        data-bt-row-grip=""
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          onRowDragStart(virtualRow.index, e);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          touchAction: "none",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                      </span>
                    </div>
                  ) : enableDynamicRowHeight &&
                  onRowHeightChange &&
                  colIndex === 0 ? (
                    <DynamicRowMeasurer
                      index={virtualRow.index}
                      onHeightChange={onRowHeightChange}
                    >
                      <div
                        style={{
                          minHeight: `${rowHeight}px`,
                          position: "relative",
                          ...rowSty,
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
                          isEditing={
                            editingCell?.rowKey === rowKey &&
                            editingCell?.columnKey === col.key
                          }
                          onEditComplete={onEditComplete}
                          cellStyleFn={cellStyleFn}
                          treeLevel={tLevel}
                          treeHasChildren={tHasChildren}
                          treeExpanded={tExpanded}
                          treeIndentSize={treeIndentSize}
                          onTreeToggle={onTreeToggle}
                          treeKey={tKey}
                          isFirstDataCol={colIndex === firstDataColIndex}
                        />
                      </div>
                    </DynamicRowMeasurer>
                  ) : (
                    <div
                      style={{
                        height: enableDynamicRowHeight
                          ? undefined
                          : `${rowHeight}px`,
                        minHeight: enableDynamicRowHeight
                          ? `${rowHeight}px`
                          : undefined,
                        position: "relative",
                        ...rowSty,
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
                        isEditing={
                          editingCell?.rowKey === rowKey &&
                          editingCell?.columnKey === col.key
                        }
                        onEditComplete={onEditComplete}
                        cellStyleFn={cellStyleFn}
                        treeLevel={tLevel}
                        treeHasChildren={tHasChildren}
                        treeExpanded={tExpanded}
                        treeIndentSize={treeIndentSize}
                        onTreeToggle={onTreeToggle}
                        treeKey={tKey}
                        isFirstDataCol={colIndex === firstDataColIndex}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {expandable && (
        <div
          style={{
            gridColumn: "1 / -1",
            gridRow: bodyGridRow,
            height: `${totalSize}px`,
            position: "relative",
            zIndex: 15,
            pointerEvents: "none",
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
              expandedRenderResult = expandable.expandedRowRender(
                row,
                virtualRow.index,
                0,
                true,
              );
            } catch {
              /* gracefully swallow render errors in expanded content */
            }

            const expandedContent = (
              <div
                className={classNames?.expandedRow ?? ""}
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 5,
                  width:
                    scrollAreaWidth && scrollAreaWidth > 0
                      ? `${scrollAreaWidth}px`
                      : "100%",
                  overflow: "auto",
                  pointerEvents: "auto",
                  borderBottom: "1px solid rgba(128,128,128,0.2)",
                  backgroundColor: "rgba(128,128,128,0.06)",
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
                  position: "absolute",
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
            gridColumn: "1 / -1",
            gridRow: bodyGridRow,
            height: `${totalSize}px`,
            position: "relative",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: headerHeight,
              pointerEvents: "auto",
              boxShadow: "0 2px 6px -1px rgba(0,0,0,0.08)",
            }}
          >
            {pinnedTopData.map((row, rowIdx) => {
              if (row == null) return null;
              const rk = getRowKey ? getRowKey(row, rowIdx) : String(rowIdx);
              const isSelected = selectedKeySet.has(rk);
              const isExpanded = resolvedExpandedKeys?.has(rk) ?? false;

              let rowCls = "";
              try {
                rowCls = rowClassName ? rowClassName(row, rowIdx) : "";
              } catch {
                /* ignore */
              }
              let rowSty: React.CSSProperties | undefined;
              try {
                rowSty = rowStyle ? rowStyle(row, rowIdx) : undefined;
              } catch {
                /* ignore */
              }

              return (
                <div
                  key={`pinned-top-${rk}`}
                  className={
                    `${classNames?.pinnedRow ?? ""} ${rowCls}`.trim() ||
                    undefined
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridTemplateColumns ?? "",
                    minWidth: totalTableWidth
                      ? `${totalTableWidth}px`
                      : undefined,
                    ...styles?.pinnedRow,
                    ...rowSty,
                  }}
                >
                  {safeColumns.map((col) => {
                    const cellValue =
                      col.dataIndex != null ? row[col.dataIndex] : undefined;
                    const stickyOffset = columnOffsets.get(col.key);
                    const isPinned = Boolean(col.pinned);
                    let zIndex = 0;
                    if (col.key === "__select__" || col.key === "__expand__")
                      zIndex = 11;
                    else if (isPinned) zIndex = 2;

                    let recordFingerprint: string | undefined;
                    if (col.render) {
                      try {
                        recordFingerprint = JSON.stringify(row);
                      } catch {
                        recordFingerprint = rk;
                      }
                    }

                    return (
                      <div
                        key={col.key}
                        data-row-key={rk}
                        data-column-key={col.key}
                        data-bt-cell=""
                        data-selected={isSelected || undefined}
                        style={{
                          position: isPinned ? "sticky" : "relative",
                          ...(col.pinned === "left" &&
                          stickyOffset !== undefined
                            ? { left: `${stickyOffset}px` }
                            : {}),
                          ...(col.pinned === "right" &&
                          stickyOffset !== undefined
                            ? { right: `${stickyOffset}px` }
                            : {}),
                          zIndex,
                          backgroundColor: pinnedRowBg,
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          ...(isPinned && styles?.pinnedCell
                            ? styles.pinnedCell
                            : {}),
                        }}
                      >
                        <div
                          style={{
                            height: `${rowHeight}px`,
                            position: "relative",
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
                            isEditing={
                              editingCell?.rowKey === rk &&
                              editingCell?.columnKey === col.key
                            }
                            onEditComplete={onEditComplete}
                            cellStyleFn={cellStyleFn}
                            isFirstDataCol={false}
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
            gridColumn: "1 / -1",
            gridRow: bodyGridRow,
            height: `${totalSize}px`,
            position: "relative",
            zIndex: 20,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              marginTop: "auto",
              position: "sticky",
              bottom: 0,
              pointerEvents: "auto",
              boxShadow: "0 -2px 6px -1px rgba(0,0,0,0.08)",
            }}
          >
            {pinnedBottomData.map((row, rowIdx) => {
              if (row == null) return null;
              const rk = getRowKey ? getRowKey(row, rowIdx) : String(rowIdx);
              const isSelected = selectedKeySet.has(rk);
              const isExpanded = resolvedExpandedKeys?.has(rk) ?? false;

              let rowCls = "";
              try {
                rowCls = rowClassName ? rowClassName(row, rowIdx) : "";
              } catch {
                /* ignore */
              }
              let rowSty: React.CSSProperties | undefined;
              try {
                rowSty = rowStyle ? rowStyle(row, rowIdx) : undefined;
              } catch {
                /* ignore */
              }

              return (
                <div
                  key={`pinned-bottom-${rk}`}
                  className={
                    `${classNames?.pinnedRow ?? ""} ${rowCls}`.trim() ||
                    undefined
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridTemplateColumns ?? "",
                    minWidth: totalTableWidth
                      ? `${totalTableWidth}px`
                      : undefined,
                    ...styles?.pinnedRow,
                    ...rowSty,
                  }}
                >
                  {safeColumns.map((col) => {
                    const cellValue =
                      col.dataIndex != null ? row[col.dataIndex] : undefined;
                    const stickyOffset = columnOffsets.get(col.key);
                    const isPinned = Boolean(col.pinned);
                    let zIndex = 0;
                    if (col.key === "__select__" || col.key === "__expand__")
                      zIndex = 11;
                    else if (isPinned) zIndex = 2;

                    let recordFingerprint: string | undefined;
                    if (col.render) {
                      try {
                        recordFingerprint = JSON.stringify(row);
                      } catch {
                        recordFingerprint = rk;
                      }
                    }

                    return (
                      <div
                        key={col.key}
                        data-row-key={rk}
                        data-column-key={col.key}
                        data-bt-cell=""
                        data-selected={isSelected || undefined}
                        style={{
                          position: isPinned ? "sticky" : "relative",
                          ...(col.pinned === "left" &&
                          stickyOffset !== undefined
                            ? { left: `${stickyOffset}px` }
                            : {}),
                          ...(col.pinned === "right" &&
                          stickyOffset !== undefined
                            ? { right: `${stickyOffset}px` }
                            : {}),
                          zIndex,
                          backgroundColor: pinnedRowBg,
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          ...(isPinned && styles?.pinnedCell
                            ? styles.pinnedCell
                            : {}),
                        }}
                      >
                        <div
                          style={{
                            height: `${rowHeight}px`,
                            position: "relative",
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
                            isEditing={
                              editingCell?.rowKey === rk &&
                              editingCell?.columnKey === col.key
                            }
                            onEditComplete={onEditComplete}
                            cellStyleFn={cellStyleFn}
                            isFirstDataCol={false}
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

TableBody.displayName = "TableBody";

export default TableBody;
