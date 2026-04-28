"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import React, {
  CSSProperties,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = arr.slice();
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function flattenColumns<T>(columns: ColumnType<T>[]): ColumnType<T>[] {
  const result: ColumnType<T>[] = [];
  for (const col of columns) {
    if (col == null) continue;
    if (col.children && col.children.length > 0) {
      result.push(...flattenColumns(col.children));
    } else {
      result.push(col);
    }
  }
  return result;
}

interface HeaderGroup {
  key: string;
  title: string | React.ReactNode;
  childKeys: string[];
  style?: CSSProperties;
  className?: string;
}

import DraggableHeader from "./DraggableHeader";
import {
  type BoltTableIcons,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ColumnsIcon,
  CopyIcon,
  GripVerticalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  SearchIcon,
  XIcon,
} from "./icons";
import ResizeOverlay, { type ResizeOverlayHandle } from "./ResizeOverlay";
import TableBody from "./TableBody";
import type {
  ColumnContextMenuItem,
  ColumnPersistenceConfig,
  ColumnType,
  DataRecord,
  ExpandableConfig,
  PaginationType,
  RowPinningConfig,
  RowSelectionConfig,
  SortDirection,
} from "./types";

interface BoltTableProps<T extends DataRecord = DataRecord> {
  /** Column definitions controlling what columns are shown, their order, width, pinning, sort/filter, and rendering. */
  readonly columns: ColumnType<T>[];

  /** The row data to display. Each element corresponds to one table row. */
  readonly data: T[];

  /** Height of each row in pixels. All rows must have the same base height for virtualization. */
  readonly rowHeight?: number;

  /** Estimated height (px) for expanded row content, used before actual measurement. */
  readonly expandedRowHeight?: number;

  /** Max height in pixels for expanded row panels. Scrolls when exceeded. */
  readonly maxExpandedRowHeight?: number;

  /** Primary color for interactive elements (sort indicators, selected rows, checkboxes, etc.). */
  readonly accentColor?: string;

  /** Additional CSS class name applied to the outermost wrapper div. */
  readonly className?: string;

  /** Granular CSS class name overrides for specific parts of the table. */
  readonly classNames?: ClassNamesTypes;

  /** Inline style overrides for specific parts of the table. */
  readonly styles?: StylesTypes;

  /** @deprecated Use `icons.gripVertical` instead. Custom drag grip icon for column headers. */
  readonly gripIcon?: React.ReactNode;

  /** Custom icon overrides for the table's built-in icons. */
  readonly icons?: BoltTableIcons;

  /** When true, the drag grip icon is hidden from all column headers. */
  readonly hideGripIcon?: boolean;

  /** Pagination configuration for the footer, or false to disable pagination. */
  readonly pagination?: PaginationType | false;

  /** Called when the user changes the current page or page size via the pagination footer. */
  readonly onPaginationChange?: (page: number, pageSize: number) => void;

  /** Called when the user finishes resizing a column (on mouse up). */
  readonly onColumnResize?: (columnKey: string, newWidth: number) => void;

  /** Called after the user drops a column header into a new position. */
  readonly onColumnOrderChange?: (newOrder: string[]) => void;

  /** Called when the user pins or unpins a column via the context menu. */
  readonly onColumnPin?: (
    columnKey: string,
    pinned: "left" | "right" | false,
  ) => void;

  /** Called when the user hides or shows a column via the context menu. */
  readonly onColumnHide?: (columnKey: string, hidden: boolean) => void;

  /** Determines the unique key for each row. Can be a string property name, function, number, or symbol. */
  readonly rowKey?: string | ((record: T) => string) | number | symbol;

  /** Expandable row configuration. Prepends an expand toggle column when provided. */
  readonly expandable?: ExpandableConfig<T>;

  /** Row selection configuration. Prepends a checkbox/radio column when provided. */
  readonly rowSelection?: RowSelectionConfig<T>;

  /** Row pinning configuration. Pass `true` for internal state management, or an object for controlled mode. */
  readonly rowPinning?: RowPinningConfig | boolean;

  /** Called when the user pins or unpins a row via the cell context menu. */
  readonly onRowPin?: (
    rowKey: React.Key,
    pinned: "top" | "bottom" | false,
  ) => void;

  /** Called when the user scrolls near the bottom of the table. Use for infinite scroll. */
  readonly onEndReached?: () => void;

  /** How many rows from the end of the list should trigger onEndReached. */
  readonly onEndReachedThreshold?: number;

  /** When true and data is empty, shows shimmer skeleton rows. With data, appends shimmer rows at bottom. */
  readonly isLoading?: boolean;

  /** Called when the user changes sort direction. Provide for server-side sorting. */
  readonly onSortChange?: (columnKey: string, direction: SortDirection) => void;

  /** Called when the user applies or clears a column filter. Provide for server-side filtering. */
  readonly onFilterChange?: (filters: Record<string, string>) => void;

  /** Custom items to append to the column header right-click context menu. */
  readonly columnContextMenuItems?: ColumnContextMenuItem[];

  /** Controls table height. True: auto-sizes to content (max 10 rows). False: fills parent container. */
  readonly autoHeight?: boolean;

  /** When true, renders a full shimmer skeleton layout before column widths are calculated. */
  readonly layoutLoading?: boolean;

  /** Custom React node to render when the table has no data and is not loading. */
  readonly emptyRenderer?: React.ReactNode;

  /** Returns a CSS class name for a given row based on its record and index. Useful for Tailwind or any CSS class-based conditional row styling. */
  readonly rowClassName?: (record: T, index: number) => string;

  /** Returns inline CSS styles for a given row based on its record and index. Useful for dynamic per-row styling. */
  readonly rowStyle?: (record: T, index: number) => React.CSSProperties;

  /** When true, removes the filter option from all header column context menus. */
  readonly disabledFilters?: boolean;

  /** Called after a cell value is copied to the clipboard via the context menu. */
  readonly onCopy?: (
    text: string,
    columnKey: string,
    record: T,
    rowIndex: number,
  ) => void;

  /** When true, pinned rows remain visible even after navigating to a different page. */
  readonly keepPinnedRowsAcrossPages?: boolean;

  /** Called when a user finishes editing an editable cell. Receives the new value, the row record, the column's `dataIndex`, and the row index. */
  readonly onEdit?: (
    value: unknown,
    record: T,
    dataIndex: string,
    rowIndex: number,
  ) => void;

  /** Called when a row is clicked. When provided, all row cells show a pointer cursor on hover. */
  readonly onRowClick?: (
    record: T,
    index: number,
    event: React.MouseEvent,
  ) => void;

  /** Enable horizontal virtualization for tables with many columns. Only visible columns are rendered. */
  readonly enableColumnVirtualization?: boolean;

  /** Enable dynamic row heights based on content. Uses ResizeObserver to measure actual row heights. */
  readonly enableDynamicRowHeight?: boolean;

  /** Configuration for persisting column state (order, widths, visibility, pinned) to localStorage. Defaults to `false` (disabled). */
  readonly columnPersistence?: ColumnPersistenceConfig | false;

  /** Show the column picker/settings button in the header area. Defaults to `true`. */
  readonly showColumnSettings?: boolean;

  /** Hide the global search input above the table. Defaults to `false`. */
  readonly hideGlobalSearch?: boolean;

  /** Controlled global search value. When provided, the table uses this instead of its own internal state. */
  readonly globalSearchValue?: string;

  /** Called when the global search value changes. */
  readonly onGlobalSearchChange?: (value: string) => void;

  /** Extra content rendered in the toolbar between the search bar and the column-settings button. */
  readonly toolbarContent?: React.ReactNode;

  /** Label for the column-settings button. Defaults to "Columns". */
  readonly columnSettingsLabel?: React.ReactNode;
}

export interface ClassNamesTypes {
  /** Applied to all non-pinned column header cells. */
  header?: string;

  /** Applied to all body cells (both pinned and non-pinned). */
  cell?: string;

  /** Applied to each row's wrapper element. */
  row?: string;

  /** Applied to the floating drag overlay header while dragging a column. */
  dragHeader?: string;

  /** Applied additionally to pinned column header cells. */
  pinnedHeader?: string;

  /** Applied additionally to pinned column body cells. */
  pinnedCell?: string;

  /** Applied to the expanded row content panel. */
  expandedRow?: string;

  /** Applied to each pinned row's wrapper div. */
  pinnedRow?: string;

  /** Applied to the pagination footer wrapper. */
  pagination?: string;

  /** Applied to all pagination navigation buttons (first, prev, next, last). */
  paginationButton?: string;

  /** Applied additionally to the active page number button. */
  paginationActiveButton?: string;

  /** Applied to the page-size select dropdown. */
  paginationSelect?: string;

  /** Applied to the "X–Y of Z" info text. */
  paginationInfo?: string;
}

export interface StylesTypes {
  /** Inline styles for all non-pinned column header cells. */
  header?: CSSProperties;

  /** Inline styles for all body cells. */
  cell?: CSSProperties;

  /** Inline styles for each row wrapper. */
  row?: CSSProperties;

  /** Inline styles for the drag overlay header. */
  dragHeader?: CSSProperties;

  /** Inline styles for pinned column header cells. */
  pinnedHeader?: CSSProperties;

  /** Inline styles for pinned column body cells. */
  pinnedCell?: CSSProperties;

  /** Inline styles for the expanded row content panel. */
  expandedRow?: CSSProperties;

  /** Inline styles for pinned row wrappers. */
  pinnedRow?: CSSProperties;

  /** CSS color string for pinned row cell backgrounds. Falls back to pinnedBg. */
  pinnedRowBg?: string;

  /** Styles applied to hovered rows. */
  rowHover?: CSSProperties;

  /** Styles applied to selected rows. */
  rowSelected?: CSSProperties;

  /** CSS color string for pinned column cells and headers background. */
  pinnedBg?: string;

  /** Inline styles applied to built-in context menu items (sort, filter, pin, copy, etc.). */
  contextMenuItem?: CSSProperties;

  /** Inline styles for the pagination footer wrapper. */
  pagination?: CSSProperties;

  /** Inline styles for all pagination navigation buttons (first, prev, next, last). */
  paginationButton?: CSSProperties;

  /** Inline styles for the active page number button. */
  paginationActiveButton?: CSSProperties;

  /** Inline styles for the page-size select dropdown. */
  paginationSelect?: CSSProperties;

  /** Inline styles for the "X–Y of Z" info text. */
  paginationInfo?: CSSProperties;
}

const SHIMMER_WIDTHS = [55, 70, 45, 80, 60, 50, 75, 65, 40, 72];
const EMPTY_CLASSNAMES: ClassNamesTypes = {};
const EMPTY_STYLES: StylesTypes = {};
const STABLE_EMPTY_DATA: readonly any[] = [];
const STABLE_EMPTY_COLS: readonly any[] = [];

export default function BoltTable<T extends DataRecord = DataRecord>({
  columns: rawInitialColumns,
  data: rawData,
  rowHeight = 40,
  expandedRowHeight = 200,
  maxExpandedRowHeight,
  accentColor = "#1890ff",
  className = "",
  classNames = EMPTY_CLASSNAMES,
  styles = EMPTY_STYLES,
  gripIcon,
  hideGripIcon,
  icons,
  pagination,
  onPaginationChange,
  onColumnResize,
  onColumnOrderChange,
  onColumnPin,
  onColumnHide,
  rowSelection,
  rowPinning,
  onRowPin,
  expandable,
  rowKey = "id",
  onEndReached,
  onEndReachedThreshold = 5,
  isLoading = false,
  onSortChange,
  onFilterChange,
  columnContextMenuItems,
  autoHeight = true,
  layoutLoading,
  emptyRenderer,
  rowClassName,
  rowStyle,
  disabledFilters,
  onCopy,
  keepPinnedRowsAcrossPages,
  onEdit,
  onRowClick,
  enableColumnVirtualization = false,
  enableDynamicRowHeight = false,
  columnPersistence = false,
  showColumnSettings = true,
  hideGlobalSearch = false,
  globalSearchValue,
  onGlobalSearchChange,
  toolbarContent,
  columnSettingsLabel,
}: BoltTableProps<T>) {
  const data = useMemo<T[]>(() => {
    if (!Array.isArray(rawData)) return STABLE_EMPTY_DATA as T[];
    const filtered = rawData.filter((item): item is T => item != null);
    return filtered.length > 0 ? filtered : (STABLE_EMPTY_DATA as T[]);
  }, [rawData]);

  const initialColumns = useMemo<ColumnType<T>[]>(() => {
    if (!Array.isArray(rawInitialColumns))
      return STABLE_EMPTY_COLS as ColumnType<T>[];
    const safe = rawInitialColumns.filter(
      (col): col is ColumnType<T> => col != null && typeof col.key === "string",
    );
    const flattened = flattenColumns(safe);
    const validated = flattened.filter(
      (col): col is ColumnType<T> => col != null && typeof col.key === "string",
    );
    return validated.length > 0
      ? validated
      : (STABLE_EMPTY_COLS as ColumnType<T>[]);
  }, [rawInitialColumns]);

  const headerGroups = useMemo<HeaderGroup[]>(() => {
    if (!Array.isArray(rawInitialColumns)) return [];
    const groups: HeaderGroup[] = [];
    for (const col of rawInitialColumns) {
      if (
        col != null &&
        typeof col.key === "string" &&
        col.children &&
        col.children.length > 0
      ) {
        const leafKeys = flattenColumns([col])
          .filter((c) => c != null && typeof c.key === "string")
          .map((c) => c.key);
        if (leafKeys.length > 0) {
          groups.push({
            key: col.key,
            title: col.title,
            childKeys: leafKeys,
            style: col.style,
            className: col.className,
          });
        }
      }
    }
    return groups;
  }, [rawInitialColumns]);

  const hasColumnGroups = headerGroups.length > 0;

  const groupedColumnKeySet = useMemo<Set<string> | null>(() => {
    if (!hasColumnGroups) return null;
    const keys = new Set<string>();
    for (const g of headerGroups) {
      for (const k of g.childKeys) keys.add(k);
    }
    return keys;
  }, [headerGroups, hasColumnGroups]);

  const [columns, setColumns] = useState<ColumnType<T>[]>(initialColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    initialColumns.map((c) => c.key),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const columnsFingerprintRef = useRef("");
  const newFingerprint = initialColumns
    .map((c) => {
      const w =
        typeof c.width === "number" ? Math.round(c.width) : (c.width ?? "");
      return `${c.key}:${!!c.hidden}:${c.pinned || ""}:${w}`;
    })
    .join("|");

  const initialColumnsRef = useRef(initialColumns);
  initialColumnsRef.current = initialColumns;

  React.useEffect(() => {
    if (columnsFingerprintRef.current === newFingerprint) return;
    columnsFingerprintRef.current = newFingerprint;
    setColumns(initialColumnsRef.current);
    setColumnOrder(initialColumnsRef.current.map((c) => c.key));
  }, [newFingerprint]);

  const safeWidth = (w: unknown, fallback = 150): number =>
    typeof w === "number" && Number.isFinite(w) ? w : fallback;

  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(
    () => new Map(),
  );
  const manuallyResizedRef = useRef<Set<string>>(new Set());

  // Column persistence: load from localStorage on mount
  const persistenceAppliedRef = useRef(false);
  React.useEffect(() => {
    if (!columnPersistence || persistenceAppliedRef.current) return;
    persistenceAppliedRef.current = true;
    const {
      storageKey,
      persistOrder = true,
      persistWidths = true,
      persistVisibility = true,
      persistPinned = true,
    } = columnPersistence;
    try {
      const raw = localStorage.getItem(`bt_${storageKey}`);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        order?: string[];
        widths?: Record<string, number>;
        hidden?: Record<string, boolean>;
        pinned?: Record<string, "left" | "right" | false>;
      };

      if (persistOrder && saved.order) {
        setColumnOrder(saved.order);
      }
      if (persistWidths && saved.widths) {
        setColumnWidths(
          new Map(Object.entries(saved.widths).map(([k, v]) => [k, Number(v)])),
        );
      }
      if (
        (persistVisibility && saved.hidden) ||
        (persistPinned && saved.pinned)
      ) {
        setColumns((prev) =>
          prev.map((col) => {
            let updated = col;
            if (persistVisibility && saved.hidden && col.key in saved.hidden) {
              updated = { ...updated, hidden: saved.hidden[col.key] };
            }
            if (persistPinned && saved.pinned && col.key in saved.pinned) {
              updated = { ...updated, pinned: saved.pinned[col.key] };
            }
            return updated;
          }),
        );
      }
    } catch {
      /* ignore corrupt localStorage */
    }
  }, [columnPersistence]);

  // Column persistence: save to localStorage on changes
  const persistColumnsToStorage = useCallback(() => {
    if (!columnPersistence) return;
    const {
      storageKey,
      persistOrder = true,
      persistWidths = true,
      persistVisibility = true,
      persistPinned = true,
    } = columnPersistence;
    try {
      const saved: Record<string, unknown> = {};
      if (persistOrder) saved.order = columnOrder;
      if (persistWidths) {
        const widths: Record<string, number> = {};
        columnWidths.forEach((v, k) => {
          widths[k] = v;
        });
        saved.widths = widths;
      }
      if (persistVisibility) {
        const hidden: Record<string, boolean> = {};
        columns.forEach((c) => {
          if (c.hidden) hidden[c.key] = true;
        });
        saved.hidden = hidden;
      }
      if (persistPinned) {
        const pinned: Record<string, "left" | "right" | false> = {};
        columns.forEach((c) => {
          if (c.pinned) pinned[c.key] = c.pinned;
        });
        saved.pinned = pinned;
      }
      localStorage.setItem(`bt_${storageKey}`, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [columnPersistence, columnOrder, columnWidths, columns]);

  React.useEffect(() => {
    if (!columnPersistence || !persistenceAppliedRef.current) return;
    persistColumnsToStorage();
  }, [columnPersistence, persistColumnsToStorage]);

  // Column picker state
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showColumnPicker) return;
    const close = (e: MouseEvent) => {
      if (
        columnPickerRef.current &&
        !columnPickerRef.current.contains(e.target as Node)
      ) {
        setShowColumnPicker(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowColumnPicker(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [showColumnPicker]);

  const columnsWithPersistedWidths = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        width: safeWidth(columnWidths.get(col.key) ?? col.width),
      })),
    [columns, columnWidths],
  );

  const [internalExpandedKeys, setInternalExpandedKeys] = useState<
    Set<React.Key>
  >(() => {
    if (expandable?.defaultExpandAllRows && data.length > 0) {
      return new Set(
        data.map((row, idx) => {
          if (row == null) return idx;
          try {
            if (typeof rowKey === "function") return rowKey(row);
          } catch {
            return idx;
          }
          if (typeof rowKey === "string")
            return (row[rowKey] as React.Key) ?? idx;
          return idx;
        }),
      );
    }
    return new Set(expandable?.defaultExpandedRowKeys ?? []);
  });

  const expandedKeysFingerprint = expandable?.expandedRowKeys
    ?.map(String)
    .join("|");
  const resolvedExpandedKeys = useMemo<Set<React.Key>>(() => {
    if (expandable?.expandedRowKeys !== undefined)
      return new Set(expandable.expandedRowKeys);
    return internalExpandedKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedKeysFingerprint, internalExpandedKeys]);

  const expandableRef = useRef(expandable);
  expandableRef.current = expandable;

  const toggleExpand = useCallback((key: React.Key) => {
    const exp = expandableRef.current;
    if (exp?.expandedRowKeys !== undefined) {
      const next = new Set(exp.expandedRowKeys);
      next.has(key) ? next.delete(key) : next.add(key);
      exp.onExpandedRowsChange?.(Array.from(next));
    } else {
      setInternalExpandedKeys((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        exp?.onExpandedRowsChange?.(Array.from(next));
        return next;
      });
    }
  }, []);

  const getRowKey = useCallback(
    (record: T, index: number): string => {
      if (record == null) return String(index);
      try {
        if (typeof rowKey === "function") return String(rowKey(record));
        if (typeof rowKey === "string") {
          const val = record[rowKey];
          return val != null ? String(val) : String(index);
        }
      } catch {
        return String(index);
      }
      return String(index);
    },
    [rowKey],
  );

  // Deduplicated row keys: appends __{index} when duplicate keys are detected
  const deduplicatedRowKeys = useMemo(() => {
    const seen = new Map<string, number>();
    return data.map((row, idx) => {
      const raw = getRowKey(row, idx);
      const count = seen.get(raw) ?? 0;
      seen.set(raw, count + 1);
      return count > 0 ? `${raw}__${idx}` : raw;
    });
  }, [data, getRowKey]);

  // Check if there are any duplicates at all
  const hasDuplicateKeys = useMemo(() => {
    const seen = new Set<string>();
    for (const row of data) {
      if (row == null) continue;
      const k = getRowKey(row, 0);
      if (seen.has(k)) return true;
      seen.add(k);
    }
    return false;
  }, [data, getRowKey]);

  const getSafeRowKey = useCallback(
    (record: T, index: number): string => {
      if (!hasDuplicateKeys) return getRowKey(record, index);
      return deduplicatedRowKeys[index] ?? getRowKey(record, index);
    },
    [getRowKey, hasDuplicateKeys, deduplicatedRowKeys],
  );

  const getRawRowKey = useCallback(
    (record: T, index: number): React.Key => {
      if (record == null) return index;
      try {
        if (typeof rowKey === "function") return rowKey(record);
        if (typeof rowKey === "string") {
          const val = record[rowKey];
          if (typeof val === "number" || typeof val === "string") return val;
          return val != null ? String(val) : index;
        }
      } catch {
        return index;
      }
      return index;
    },
    [rowKey],
  );

  const normalizedSelectedKeys = useMemo<string[]>(() => {
    const keys = rowSelection?.selectedRowKeys;
    if (!Array.isArray(keys)) return [];
    return keys.filter((k) => k != null).map((k) => String(k));
  }, [rowSelection?.selectedRowKeys]);

  const getRowKeyRef = useRef(getSafeRowKey);
  getRowKeyRef.current = getSafeRowKey;
  const resolvedExpandedKeysRef = useRef(resolvedExpandedKeys);
  resolvedExpandedKeysRef.current = resolvedExpandedKeys;
  const toggleExpandRef = useRef(toggleExpand);
  toggleExpandRef.current = toggleExpand;
  const iconsRef = useRef(icons);
  iconsRef.current = icons;

  const hasExpandable = !!expandable?.rowExpandable;
  const columnsWithExpand = useMemo(() => {
    if (!hasExpandable) return columnsWithPersistedWidths;

    const expandColumn: ColumnType<T> = {
      key: "__expand__",
      dataIndex: "__expand__",
      title: "",
      width: 40,
      pinned: "left",
      hidden: false,
      render: (_, record, index) => {
        const key = getRowKeyRef.current(record, index);
        const canExpand =
          expandableRef.current?.rowExpandable?.(record) ?? true;
        const isExpanded = resolvedExpandedKeysRef.current.has(key);

        if (!canExpand)
          return <span style={{ display: "inline-block", width: 16 }} />;

        if (typeof (expandableRef.current as any)?.expandIcon === "function") {
          return (
            expandableRef.current as {
              expandIcon?: (args: any) => React.ReactNode;
            }
          ).expandIcon!({
            expanded: isExpanded,
            onExpand: (_: T, e: React.MouseEvent) => {
              e.stopPropagation();
              toggleExpandRef.current(key);
            },
            record,
          });
        }

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpandRef.current(key);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              borderRadius: "3px",
              color: accentColor,
            }}
          >
            {isExpanded
              ? (iconsRef.current?.chevronDown ?? (
                  <ChevronDownIcon style={{ width: 14, height: 14 }} />
                ))
              : (iconsRef.current?.chevronRight ?? (
                  <ChevronRightIcon style={{ width: 14, height: 14 }} />
                ))}
          </button>
        );
      },
    };

    return [expandColumn, ...columnsWithPersistedWidths];
  }, [hasExpandable, columnsWithPersistedWidths, accentColor]);

  const columnsWithSelection = useMemo(() => {
    if (!rowSelection) return columnsWithExpand;

    const selectionColumn: ColumnType<T> = {
      key: "__select__",
      dataIndex: "__select__",
      title: "",
      width: 48,
      pinned: "left",
      hidden: false,
      render: () => null,
    };

    return [selectionColumn, ...columnsWithExpand];
  }, [rowSelection, columnsWithExpand]);

  const resizeOverlayRef = useRef<ResizeOverlayHandle>(null);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const [scrollAreaWidth, setScrollAreaWidth] = useState<number>(0);

  const prevScrollAreaWidthRef = useRef<number>(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  const tableAreaCallbackRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    (tableAreaRef as React.MutableRefObject<HTMLDivElement | null>).current =
      el;

    if (!el) return;

    const measure = () => {
      rafRef.current = null;
      const w = el.clientWidth;
      if (w !== prevScrollAreaWidthRef.current) {
        prevScrollAreaWidthRef.current = w;
        setScrollAreaWidth(w);
      }
    };

    measure();

    const ro = new ResizeObserver(() => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  const hoveredRowRef = useRef<string | null>(null);

  React.useEffect(() => {
    const el = tableAreaRef.current;
    if (!el) return;

    const setHover = (key: string | null) => {
      if (hoveredRowRef.current === key) return;
      if (hoveredRowRef.current) {
        el.querySelectorAll(
          `[data-row-key="${hoveredRowRef.current}"]`,
        ).forEach((n) => (n as HTMLElement).removeAttribute("data-hover"));
      }
      hoveredRowRef.current = key;
      if (key) {
        el.querySelectorAll(`[data-row-key="${key}"]`).forEach((n) =>
          (n as HTMLElement).setAttribute("data-hover", ""),
        );
      }
    };

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-row-key]",
      );
      setHover(target?.dataset.rowKey ?? null);
    };
    const onLeave = () => setHover(null);

    el.addEventListener("mouseover", onOver, { passive: true });
    el.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("mouseover", onOver);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const resizeStateRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
    columnIndex: number;
    currentX: number;
  } | null>(null);

  const columnGroupMapRef = useRef<Map<string, string | null>>(new Map());
  useMemo(() => {
    const map = new Map<string, string | null>();
    for (const g of headerGroups) {
      for (const k of g.childKeys) map.set(k, g.key);
    }
    for (const col of initialColumns) {
      if (!map.has(col.key)) map.set(col.key, null);
    }
    columnGroupMapRef.current = map;
  }, [headerGroups, initialColumns]);

  const overIdRef = useRef<string | null>(null);
  const dragActiveIdRef = useRef<string | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const onColumnOrderChangeRef = useRef(onColumnOrderChange);
  onColumnOrderChangeRef.current = onColumnOrderChange;

  const handleColumnDragStart = useCallback(
    (columnKey: string, e: React.PointerEvent) => {
      if (columnKey === "__select__" || columnKey === "__expand__") return;
      const headerEl = (e.currentTarget as HTMLElement).closest<HTMLElement>(
        "[data-column-key]",
      );
      if (!headerEl) return;

      const rect = headerEl.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      setActiveId(columnKey);
      dragActiveIdRef.current = columnKey;
      headerEl.setAttribute("data-dragging", "");

      const ghost = ghostRef.current;
      if (ghost) {
        ghost.style.display = "flex";
        ghost.style.width = `${rect.width}px`;
        ghost.style.left = `${e.clientX - offsetX}px`;
        ghost.style.top = `${rect.top}px`;
      }

      const grabStyle = document.createElement("style");
      grabStyle.textContent = "* { cursor: grabbing !important; }";
      document.head.appendChild(grabStyle);

      const draggedGroup = columnGroupMapRef.current.get(columnKey);

      const onMove = (ev: PointerEvent) => {
        if (ghost) {
          ghost.style.left = `${ev.clientX - offsetX}px`;
          ghost.style.top = `${ev.clientY - offsetY}px`;
        }
        const scrollEl = tableAreaRef.current;
        if (!scrollEl) return;
        const headers = scrollEl.querySelectorAll<HTMLElement>(
          "[data-bt-header][data-column-key]",
        );
        let newOverId: string | null = null;
        headers.forEach((h) => {
          const key = h.dataset.columnKey;
          if (
            !key ||
            key === "__select__" ||
            key === "__expand__" ||
            key === columnKey
          ) {
            h.removeAttribute("data-drag-over");
            return;
          }
          const targetGroup = columnGroupMapRef.current.get(key);
          if (draggedGroup !== targetGroup) {
            h.removeAttribute("data-drag-over");
            return;
          }
          const r = h.getBoundingClientRect();
          if (
            ev.clientX >= r.left &&
            ev.clientX <= r.right &&
            ev.clientY >= r.top - 20 &&
            ev.clientY <= r.bottom + 20
          ) {
            newOverId = key;
            h.setAttribute("data-drag-over", "");
          } else {
            h.removeAttribute("data-drag-over");
          }
        });
        overIdRef.current = newOverId;
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        grabStyle.remove();
        const scrollEl = tableAreaRef.current;
        if (scrollEl) {
          scrollEl
            .querySelectorAll<HTMLElement>("[data-dragging]")
            .forEach((h) => h.removeAttribute("data-dragging"));
          scrollEl
            .querySelectorAll<HTMLElement>("[data-drag-over]")
            .forEach((h) => h.removeAttribute("data-drag-over"));
        }
        if (ghost) ghost.style.display = "none";

        const currentOverId = overIdRef.current;
        const currentActiveId = dragActiveIdRef.current;
        if (
          currentOverId &&
          currentActiveId &&
          currentOverId !== currentActiveId &&
          columnGroupMapRef.current.get(currentActiveId) ===
            columnGroupMapRef.current.get(currentOverId)
        ) {
          React.startTransition(() => {
            setColumnOrder((items) => {
              const oldIndex = items.indexOf(currentActiveId);
              const newIndex = items.indexOf(currentOverId);
              if (oldIndex === -1 || newIndex === -1) return items;
              const newOrder = arrayMove(items, oldIndex, newIndex);
              setTimeout(() => onColumnOrderChangeRef.current?.(newOrder), 0);
              return newOrder;
            });
          });
        }
        setActiveId(null);
        dragActiveIdRef.current = null;
        overIdRef.current = null;
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [],
  );

  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (columnKey === "__select__" || columnKey === "__expand__") return;

    const columnIndex = columnsWithSelection.findIndex(
      (col) => col.key === columnKey,
    );
    if (columnIndex === -1) return;
    if (columnsWithSelection[columnIndex].pinned) return;

    const column = columnsWithSelection[columnIndex];
    const startWidth = column.width ?? 150;

    resizeStateRef.current = {
      columnKey,
      startX: e.clientX,
      startWidth,
      columnIndex,
      currentX: e.clientX,
    };

    if (tableAreaRef.current) {
      const headerElement = tableAreaRef.current.querySelector(
        `[data-column-key="${columnKey}"]`,
      );
      if (headerElement) {
        const areaRect = tableAreaRef.current.getBoundingClientRect();
        const headerRect = headerElement.getBoundingClientRect();
        const scrollTop = tableAreaRef.current.scrollTop;
        const scrollLeft = tableAreaRef.current.scrollLeft;
        const headerLeftInContent =
          headerRect.left - areaRect.left + scrollLeft;

        resizeOverlayRef.current?.show(
          headerRect.right,
          typeof column.title === "string" ? column.title : String(column.key),
          areaRect,
          headerLeftInContent,
          40,
          scrollTop,
          scrollLeft,
          headerLeftInContent + startWidth,
        );
      }
    }

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeStateRef.current) return;
    resizeStateRef.current.currentX = e.clientX;
    resizeOverlayRef.current?.move(e.clientX);
  };

  const handleResizeEnd = React.useCallback(() => {
    if (!resizeStateRef.current) return;
    const { startX, startWidth, currentX, columnKey } = resizeStateRef.current;
    const finalWidth = Math.max(40, startWidth + (currentX - startX));

    resizeOverlayRef.current?.hide();
    resizeStateRef.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);

    manuallyResizedRef.current.add(columnKey);

    React.startTransition(() => {
      setColumnWidths((prev) => {
        const next = new Map(prev);
        next.set(columnKey, finalWidth);
        return next;
      });
    });

    onColumnResize?.(columnKey, finalWidth);
  }, [onColumnResize]);

  const { leftPinned, unpinned, rightPinned } = useMemo(() => {
    const columnMap = new Map(columnsWithSelection.map((c) => [c.key, c]));
    const systemKeys = [
      ...(rowSelection ? ["__select__"] : []),
      ...(expandable ? ["__expand__"] : []),
    ];

    const visibleColumns = [...systemKeys, ...columnOrder]
      .map((key) => columnMap.get(key))
      .filter((col): col is ColumnType<T> => col !== undefined && !col.hidden);

    const left: ColumnType<T>[] = [],
      center: ColumnType<T>[] = [],
      right: ColumnType<T>[] = [];
    visibleColumns.forEach((col) => {
      if (col.pinned === "left") left.push(col);
      else if (col.pinned === "right") right.push(col);
      else center.push(col);
    });
    return { leftPinned: left, unpinned: center, rightPinned: right };
  }, [columnOrder, columnsWithSelection, rowSelection, expandable]);

  const orderedColumns = useMemo(
    () => [...leftPinned, ...unpinned, ...rightPinned],
    [leftPinned, unpinned, rightPinned],
  );

  const freshOrderedColumns = useMemo(() => {
    const latestMap = new Map(initialColumnsRef.current.map((c) => [c.key, c]));
    return orderedColumns.map((col) => {
      if (col.key === "__select__" || col.key === "__expand__") return col;
      const latest = latestMap.get(col.key);
      if (!latest) return col;
      return {
        ...latest,
        width: col.width,
        hidden: col.hidden,
        pinned: col.pinned,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedColumns, initialColumns]);

  const totalTableWidth = useMemo(
    () =>
      orderedColumns
        .slice(0, -1)
        .reduce((sum, col) => sum + (col.width ?? 150), 0) +
      (orderedColumns.at(-1)?.width ?? 150),
    [orderedColumns],
  );

  const gridTemplateColumns = useMemo(() => {
    if (orderedColumns.length === 0) return "";
    return orderedColumns
      .map((col, i) => {
        const w = col.width ?? 150;
        return i === orderedColumns.length - 1
          ? `minmax(${w}px, 1fr)`
          : `${w}px`;
      })
      .join(" ");
  }, [orderedColumns]);

  const columnOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let lo = 0;
    leftPinned.forEach((col) => {
      offsets.set(col.key, lo);
      lo += col.width ?? 150;
    });
    let ro = 0;
    for (let i = rightPinned.length - 1; i >= 0; i--) {
      const col = rightPinned[i];
      offsets.set(col.key, ro);
      ro += col.width ?? 150;
    }
    return offsets;
  }, [leftPinned, rightPinned]);

  const columnGridIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedColumns.forEach((col, i) => map.set(col.key, i + 1));
    return map;
  }, [orderedColumns]);

  const handleTogglePin = (
    columnKey: string,
    pinned: "left" | "right" | false,
  ) => {
    setColumns((prev) =>
      prev.map((col) => (col.key === columnKey ? { ...col, pinned } : col)),
    );
    onColumnPin?.(columnKey, pinned);
  };

  const handleToggleHide = (columnKey: string) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.key !== columnKey || col.pinned) return col;
        return { ...col, hidden: !col.hidden };
      }),
    );
    const column = columns.find((col) => col.key === columnKey);
    if (column && !column.pinned) onColumnHide?.(columnKey, !column.hidden);
  };

  const [internalRowPinning, setInternalRowPinning] =
    useState<RowPinningConfig>({ top: [], bottom: [] });
  const resolvedRowPinning: RowPinningConfig | undefined =
    rowPinning === true
      ? internalRowPinning
      : rowPinning && typeof rowPinning === "object"
        ? rowPinning
        : undefined;

  const handleRowPin = useCallback(
    (rk: React.Key, pinned: "top" | "bottom" | false) => {
      if (onRowPin) {
        onRowPin(rk, pinned);
        return;
      }
      if (rowPinning === true) {
        setInternalRowPinning((prev) => {
          const rkStr = String(rk);
          const newTop = (prev.top ?? []).filter((k) => String(k) !== rkStr);
          const newBottom = (prev.bottom ?? []).filter(
            (k) => String(k) !== rkStr,
          );
          if (pinned === "top") newTop.push(rk);
          else if (pinned === "bottom") newBottom.push(rk);
          return { top: newTop, bottom: newBottom };
        });
      }
    },
    [onRowPin, rowPinning],
  );

  const onSortChangeRef = useRef(onSortChange);
  onSortChangeRef.current = onSortChange;

  const [sortState, setSortState] = useState<{
    key: string;
    direction: SortDirection;
  }>({ key: "", direction: null });

  const handleSort = useCallback(
    (columnKey: string, direction?: SortDirection) => {
      setSortState((prev) => {
        let next: SortDirection;
        if (direction !== undefined) {
          next =
            prev.key === columnKey && prev.direction === direction
              ? null
              : direction;
        } else {
          next =
            prev.key !== columnKey
              ? "asc"
              : prev.direction === "asc"
                ? "desc"
                : prev.direction === "desc"
                  ? null
                  : "asc";
        }
        const state = { key: next ? columnKey : "", direction: next };
        onSortChangeRef.current?.(columnKey, next);
        return state;
      });
    },
    [],
  );

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );

  // Global search state
  const [internalGlobalSearch, setInternalGlobalSearch] = useState("");

  const handleColumnFilter = useCallback(
    (columnKey: string, value: string) => {
      setColumnFilters((prev) => {
        const next = { ...prev };
        if (value) next[columnKey] = value;
        else delete next[columnKey];
        onFilterChange?.(next);
        return next;
      });
    },
    [onFilterChange],
  );

  const handleClearFilter = useCallback(
    (columnKey: string) => {
      handleColumnFilter(columnKey, "");
    },
    [handleColumnFilter],
  );

  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  const columnsLookupRef = useRef(initialColumns);
  columnsLookupRef.current = initialColumns;

  const processedData = useMemo(() => {
    let result = data;

    // Global search filter
    const globalSearch = globalSearchValue ?? internalGlobalSearch;
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase();
      result = result.filter((row) => {
        if (row == null) return false;
        for (const key of Object.keys(row)) {
          const val = row[key];
          if (val != null && String(val).toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        return false;
      });
    }

    if (!onFilterChangeRef.current) {
      const filterKeys = Object.keys(columnFilters);
      if (filterKeys.length > 0) {
        result = result.filter((row) => {
          if (row == null) return false;
          return filterKeys.every((key) => {
            try {
              const col = columnsLookupRef.current.find((c) => c.key === key);
              if (typeof col?.filterFn === "function") {
                return col.filterFn(
                  columnFilters[key],
                  row,
                  col.dataIndex ?? key,
                );
              }
              const cellVal = String(row[key] ?? "").toLowerCase();
              return cellVal.includes(columnFilters[key].toLowerCase());
            } catch {
              return true;
            }
          });
        });
      }
    }

    if (!onSortChangeRef.current && sortState.key && sortState.direction) {
      const dir = sortState.direction === "asc" ? 1 : -1;
      const key = sortState.key;
      const col = columnsLookupRef.current.find((c) => c.key === key);

      try {
        if (typeof col?.sorter === "function") {
          const sorterFn = col.sorter;
          result = [...result].sort((a, b) => {
            if (a == null && b == null) return 0;
            if (a == null) return 1;
            if (b == null) return -1;
            return sorterFn(a, b) * dir;
          });
        } else {
          result = [...result].sort((a, b) => {
            if (a == null && b == null) return 0;
            if (a == null) return 1;
            if (b == null) return -1;
            const aVal = a[key];
            const bVal = b[key];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            if (typeof aVal === "number" && typeof bVal === "number")
              return (aVal - bVal) * dir;
            return String(aVal).localeCompare(String(bVal)) * dir;
          });
        }
      } catch {
        // If sort comparator throws, return unsorted data
      }
    }

    return result;
  }, [data, sortState, columnFilters, globalSearchValue, internalGlobalSearch]);

  const pinnedRowCacheRef = useRef<Map<string, T>>(new Map());

  const { pinnedTopRows, pinnedBottomRows, unpinnedProcessedData } =
    useMemo(() => {
      if (
        !resolvedRowPinning ||
        (!resolvedRowPinning.top?.length && !resolvedRowPinning.bottom?.length)
      ) {
        if (keepPinnedRowsAcrossPages) pinnedRowCacheRef.current.clear();
        return {
          pinnedTopRows: [] as T[],
          pinnedBottomRows: [] as T[],
          unpinnedProcessedData: processedData,
        };
      }

      const topKeySet = new Set((resolvedRowPinning.top ?? []).map(String));
      const bottomKeySet = new Set(
        (resolvedRowPinning.bottom ?? []).map(String),
      );

      const topMap = new Map<string, T>();
      const bottomMap = new Map<string, T>();
      const rest: T[] = [];

      processedData.forEach((row, idx) => {
        if (row == null) return;
        const key = getSafeRowKey(row as T, idx);
        if (topKeySet.has(key)) {
          topMap.set(key, row as T);
          if (keepPinnedRowsAcrossPages)
            pinnedRowCacheRef.current.set(key, row as T);
        } else if (bottomKeySet.has(key)) {
          bottomMap.set(key, row as T);
          if (keepPinnedRowsAcrossPages)
            pinnedRowCacheRef.current.set(key, row as T);
        } else {
          rest.push(row as T);
        }
      });

      if (keepPinnedRowsAcrossPages) {
        for (const k of topKeySet) {
          if (!topMap.has(k) && pinnedRowCacheRef.current.has(k)) {
            topMap.set(k, pinnedRowCacheRef.current.get(k)!);
          }
        }
        for (const k of bottomKeySet) {
          if (!bottomMap.has(k) && pinnedRowCacheRef.current.has(k)) {
            bottomMap.set(k, pinnedRowCacheRef.current.get(k)!);
          }
        }
        const allPinnedKeys = new Set([...topKeySet, ...bottomKeySet]);
        for (const cachedKey of pinnedRowCacheRef.current.keys()) {
          if (!allPinnedKeys.has(cachedKey))
            pinnedRowCacheRef.current.delete(cachedKey);
        }
      }

      const orderedTop = (resolvedRowPinning.top ?? [])
        .map((k) => topMap.get(String(k)))
        .filter((r): r is T => r !== undefined);

      const orderedBottom = (resolvedRowPinning.bottom ?? [])
        .map((k) => bottomMap.get(String(k)))
        .filter((r): r is T => r !== undefined);

      return {
        pinnedTopRows: orderedTop,
        pinnedBottomRows: orderedBottom,
        unpinnedProcessedData: rest,
      };
    }, [
      processedData,
      resolvedRowPinning,
      getSafeRowKey,
      keepPinnedRowsAcrossPages,
    ]);

  const pinnedTopHeight = pinnedTopRows.length * rowHeight;
  const pinnedBottomHeight = pinnedBottomRows.length * rowHeight;

  const pinnedTopKeySet = useMemo(
    () => new Set((resolvedRowPinning?.top ?? []).map(String)),
    [resolvedRowPinning?.top],
  );
  const pinnedBottomKeySet = useMemo(
    () => new Set((resolvedRowPinning?.bottom ?? []).map(String)),
    [resolvedRowPinning?.bottom],
  );

  const [editingCell, setEditingCell] = useState<{
    rowKey: string;
    columnKey: string;
  } | null>(null);

  const handleEditComplete = useCallback(() => {
    setEditingCell(null);
  }, []);

  const [cellContextMenu, setCellContextMenu] = useState<{
    x: number;
    y: number;
    rowKey: string;
    columnKey: string;
  } | null>(null);

  const cellMenuRef = useRef<HTMLDivElement>(null);

  const cellLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cellTouchStart = useRef<{ x: number; y: number } | null>(null);

  const cancelCellLongPress = useCallback(() => {
    if (cellLongPressTimer.current) {
      clearTimeout(cellLongPressTimer.current);
      cellLongPressTimer.current = null;
    }
    cellTouchStart.current = null;
  }, []);

  React.useEffect(() => {
    if (!cellContextMenu) return;
    const close = (e: MouseEvent) => {
      if (cellMenuRef.current && cellMenuRef.current.contains(e.target as Node))
        return;
      setCellContextMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCellContextMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [cellContextMenu]);

  const columnFiltersKey = Object.keys(columnFilters)
    .sort()
    .map((k) => `${k}:${columnFilters[k]}`)
    .join("|");
  const activeGlobalSearch = globalSearchValue ?? internalGlobalSearch;
  React.useEffect(() => {
    setInternalPage(1);
    tableAreaRef.current?.scrollTo({ top: 0 });
  }, [columnFiltersKey, activeGlobalSearch]);

  const DEFAULT_PAGE_SIZE = 15;
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(DEFAULT_PAGE_SIZE);

  const dataLength = data.length;
  const autoPagination =
    pagination === undefined && dataLength > DEFAULT_PAGE_SIZE;
  const pgEnabled =
    pagination === false ? false : !!pagination || autoPagination;
  const pgSize =
    pgEnabled &&
    typeof pagination === "object" &&
    pagination?.pageSize !== undefined
      ? pagination.pageSize
      : internalPageSize;
  const isControlledPagination =
    typeof pagination === "object" && pagination?.current !== undefined;
  const pgCurrent = pgEnabled
    ? isControlledPagination
      ? Number(pagination!.current)
      : internalPage
    : 1;
  const needsClientPagination =
    pgEnabled && unpinnedProcessedData.length > pgSize;

  const paginatedData = useMemo(() => {
    if (!needsClientPagination) return unpinnedProcessedData;
    const start = (pgCurrent - 1) * pgSize;
    return unpinnedProcessedData.slice(start, start + pgSize);
  }, [unpinnedProcessedData, needsClientPagination, pgCurrent, pgSize]);

  const shimmerCount = pgEnabled ? pgSize : 15;
  const showShimmer = isLoading && processedData.length === 0;
  const shimmerRowKeyField = typeof rowKey === "string" ? rowKey : "id";
  const shimmerData = useMemo(() => {
    if (!showShimmer) return null;
    return Array.from(
      { length: shimmerCount },
      (_, i) =>
        ({
          [shimmerRowKeyField]: `__shimmer_${i}__`,
        }) as T,
    );
  }, [showShimmer, shimmerCount, shimmerRowKeyField]);

  const INFINITE_SHIMMER_COUNT = 5;
  const showInfiniteShimmer =
    isLoading && paginatedData.length > 0 && !showShimmer && !pgEnabled;
  const infiniteLoadingShimmer = useMemo(() => {
    if (!showInfiniteShimmer) return null;
    return Array.from(
      { length: INFINITE_SHIMMER_COUNT },
      (_, i) =>
        ({
          [shimmerRowKeyField]: `__shimmer_${i}__`,
        }) as T,
    );
  }, [showInfiniteShimmer, shimmerRowKeyField]);

  const displayData = useMemo(() => {
    if (shimmerData) return shimmerData;
    if (infiniteLoadingShimmer)
      return [...paginatedData, ...infiniteLoadingShimmer];
    return paginatedData;
  }, [shimmerData, infiniteLoadingShimmer, paginatedData]);

  const measuredExpandedHeights = useRef<Map<string, number>>(new Map());

  // Dynamic row heights: measured heights from content
  const measuredRowHeights = useRef<Map<number, number>>(new Map());

  const handleRowHeightChange = useCallback(
    (index: number, height: number) => {
      if (!enableDynamicRowHeight) return;
      const prev = measuredRowHeights.current.get(index);
      if (prev === height) return;
      measuredRowHeights.current.set(index, height);
      rowVirtualizerRef.current?.measure();
    },
    [enableDynamicRowHeight],
  );

  const expandedRowMeasureRafRef = useRef<number | null>(null);

  const handleExpandedRowResize = useCallback(
    (rk: string, contentHeight: number) => {
      const prev = measuredExpandedHeights.current.get(rk);
      const rounded = Math.round(contentHeight);
      if (prev === rounded) return;
      measuredExpandedHeights.current.set(rk, rounded);
      if (expandedRowMeasureRafRef.current !== null) {
        cancelAnimationFrame(expandedRowMeasureRafRef.current);
      }
      expandedRowMeasureRafRef.current = requestAnimationFrame(() => {
        expandedRowMeasureRafRef.current = null;
        rowVirtualizerRef.current?.measure();
      });
    },
    [],
  );

  const rowVirtualizer = useVirtualizer({
    count: displayData.length,
    getScrollElement: () => tableAreaRef.current,
    estimateSize: (index) => {
      if (shimmerData) return rowHeight;
      const item = displayData[index];
      if (!item) return rowHeight;
      const baseHeight = enableDynamicRowHeight
        ? (measuredRowHeights.current.get(index) ?? rowHeight)
        : rowHeight;
      const key = getSafeRowKey(item, index);
      if (!resolvedExpandedKeys.has(key)) return baseHeight;
      const cached = measuredExpandedHeights.current.get(key);
      return cached ? baseHeight + cached : baseHeight + expandedRowHeight;
    },
    overscan: 5,
    getItemKey: (index) => {
      if (shimmerData) return `__shimmer_${index}__`;
      const item = displayData[index];
      if (!item) return `__fallback_${index}__`;
      return getSafeRowKey(item, index);
    },
    paddingStart: pinnedTopHeight,
    paddingEnd: pinnedBottomHeight,
  });

  const rowVirtualizerRef = useRef(rowVirtualizer);
  rowVirtualizerRef.current = rowVirtualizer;

  // Horizontal virtualization: determine which columns are visible
  const scrollLeftRef = useRef(0);
  const [visibleColumnRange, setVisibleColumnRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  React.useEffect(() => {
    if (!enableColumnVirtualization) return;
    const el = tableAreaRef.current;
    if (!el) return;

    const updateVisibleColumns = () => {
      const scrollLeft = el.scrollLeft;
      scrollLeftRef.current = scrollLeft;
      const viewportWidth = el.clientWidth;
      const viewStart = scrollLeft;
      const viewEnd = scrollLeft + viewportWidth;

      let cumWidth = 0;
      let startIdx = -1;
      let endIdx = orderedColumns.length - 1;

      for (let i = 0; i < orderedColumns.length; i++) {
        const col = orderedColumns[i];
        const colWidth = col.width ?? 150;
        const colStart = cumWidth;
        const colEnd = cumWidth + colWidth;
        cumWidth = colEnd;

        if (col.pinned) continue; // pinned columns always render

        if (startIdx === -1 && colEnd > viewStart) {
          startIdx = Math.max(0, i - 1); // overscan 1
        }
        if (colStart > viewEnd) {
          endIdx = Math.min(orderedColumns.length - 1, i + 1); // overscan 1
          break;
        }
      }
      if (startIdx === -1) startIdx = 0;

      setVisibleColumnRange((prev) => {
        if (prev && prev.start === startIdx && prev.end === endIdx) return prev;
        return { start: startIdx, end: endIdx };
      });
    };

    updateVisibleColumns();
    el.addEventListener("scroll", updateVisibleColumns, { passive: true });
    return () => el.removeEventListener("scroll", updateVisibleColumns);
  }, [enableColumnVirtualization, orderedColumns]);

  // Filter columns for horizontal virtualization
  const virtualizedColumns = useMemo(() => {
    if (!enableColumnVirtualization || !visibleColumnRange)
      return freshOrderedColumns;
    return freshOrderedColumns.filter((col, idx) => {
      if (col.pinned) return true; // always show pinned
      if (col.key === "__select__" || col.key === "__expand__") return true;
      return idx >= visibleColumnRange.start && idx <= visibleColumnRange.end;
    });
  }, [enableColumnVirtualization, visibleColumnRange, freshOrderedColumns]);

  const resolvedExpandedKeysFingerprint = Array.from(resolvedExpandedKeys)
    .sort()
    .join(",");
  React.useLayoutEffect(() => {
    rowVirtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedExpandedKeysFingerprint]);

  const endReachedFiredRef = useRef(false);
  const onEndReachedRef = useRef(onEndReached);
  onEndReachedRef.current = onEndReached;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      endReachedFiredRef.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [dataLength, isLoading]);

  React.useEffect(() => {
    const el = tableAreaRef.current;
    if (!el) return;

    const checkEndReached = () => {
      if (
        !onEndReachedRef.current ||
        displayData.length === 0 ||
        endReachedFiredRef.current ||
        isLoadingRef.current
      )
        return;
      const virtualItems = rowVirtualizer.getVirtualItems();
      if (virtualItems.length === 0) return;
      const lastVisibleIndex = virtualItems[virtualItems.length - 1].index;
      const distanceFromEnd = displayData.length - 1 - lastVisibleIndex;
      if (distanceFromEnd <= onEndReachedThreshold) {
        endReachedFiredRef.current = true;
        onEndReachedRef.current();
      }
    };

    el.addEventListener("scroll", checkEndReached, { passive: true });
    return () => el.removeEventListener("scroll", checkEndReached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayData.length, onEndReachedThreshold]);

  const activeColumn = activeId
    ? orderedColumns.find((col) => col.key === activeId)
    : null;

  const currentPage = pgCurrent;
  const pageSize = pgSize;

  const rawTotal = pgEnabled
    ? ((typeof pagination === "object" ? pagination?.total : undefined) ??
      (needsClientPagination ? unpinnedProcessedData.length : dataLength))
    : dataLength;

  const lastKnownTotalRef = useRef<number>(0);
  if (!isLoading || rawTotal > 0) {
    lastKnownTotalRef.current = rawTotal;
  }
  const total =
    isLoading && lastKnownTotalRef.current > 0
      ? lastKnownTotalRef.current
      : rawTotal;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (totalPages > 0 && internalPage > totalPages) {
      setInternalPage(totalPages);
    }
  }, [totalPages, internalPage]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setInternalPage(p);
      onPaginationChange?.(p, pageSize);
    }
  };
  const handlePageSizeChange = (s: number) => {
    setInternalPage(1);
    setInternalPageSize(s);
    onPaginationChange?.(1, s);
  };

  React.useEffect(() => {
    if (needsClientPagination) {
      tableAreaRef.current?.scrollTo({ top: 0 });
    }
  }, [pgCurrent, needsClientPagination]);

  const getPageNumbers = (): (
    | number
    | "ellipsis-left"
    | "ellipsis-right"
  )[] => {
    if (totalPages <= 7)
      return Array.from(
        { length: totalPages },
        (_: unknown, i: number) => i + 1,
      );

    const leftSibling = Math.max(currentPage - 1, 2);
    const showLeftEllipsis = leftSibling > 2;
    const rightSibling = Math.min(currentPage + 1, totalPages - 1);
    const showRightEllipsis = currentPage < totalPages - 3;

    if (!showLeftEllipsis && showRightEllipsis)
      return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
    if (showLeftEllipsis && !showRightEllipsis)
      return [
        1,
        "ellipsis-left",
        ...Array.from(
          { length: 5 },
          (_: unknown, i: number) => totalPages - 4 + i,
        ),
      ];
    return [
      1,
      "ellipsis-left",
      leftSibling,
      currentPage,
      rightSibling,
      "ellipsis-right",
      totalPages,
    ];
  };

  const HEADER_HEIGHT = hasColumnGroups ? 72 : 36;
  const MAX_AUTO_ROWS = 10;
  const virtualTotalSize = rowVirtualizer.getTotalSize();
  const naturalContentHeight = virtualTotalSize + HEADER_HEIGHT;
  const maxAutoHeight = MAX_AUTO_ROWS * rowHeight + HEADER_HEIGHT;
  const isEmpty = displayData.length === 0 && !showShimmer;
  const emptyMinHeight = 4 * rowHeight + HEADER_HEIGHT;

  const clampedAutoHeight = isEmpty
    ? emptyMinHeight
    : Math.min(naturalContentHeight, maxAutoHeight);

  return (
    <>
      <div
        className={className}
        style={{
          display: "flex",
          width: "100%",
          flexDirection: "column",
          ...(autoHeight ? { maxHeight: "100%" } : { height: "100%" }),
        }}
      >
        <style>{`
          @keyframes bt-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          :where([data-bt-header]) {
            background-color: rgba(128,128,128,0.06);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          :where([data-bt-pinned]) {
            background-color: ${styles.pinnedBg ?? "Canvas"};
          }
          [data-row-key][data-hover] > div {
            background-color: ${styles.rowHover?.backgroundColor ?? "rgba(128, 128, 128, 0.1)"};
          }
          [data-row-key][data-selected] > div {
            background-color: ${styles.rowSelected?.backgroundColor ?? `${accentColor}15`};
          }
          [data-row-key][data-selected][data-hover] > div {
            background-color: ${styles.rowSelected?.backgroundColor ?? `${accentColor}25`};
          }
          [data-bt-header]:hover [data-bt-grip] {
            opacity: 0.8 !important;
          }
          [data-bt-resize]:hover [data-bt-resize-line] {
            opacity: 1 !important;
          }
          [data-bt-ctx-item]:not(:disabled):hover {
            background-color: rgba(128, 128, 128, 0.15);
          }
          [data-bt-header][data-dragging] {
            opacity: 0.3 !important;
          }
          [data-bt-header][data-drag-over] {
            border: 1px dashed ${accentColor} !important;
          }
          ${onRowClick ? "[data-bt-cell] { cursor: pointer; }" : ""}
        `}</style>

        {/* Toolbar: Global Search + Column Picker */}
        {(!hideGlobalSearch || showColumnSettings) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderBottom: "1px solid rgba(128,128,128,0.2)",
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {!hideGlobalSearch && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flex: "1 1 0%",
                  position: "relative",
                }}
              >
                <span
                  style={{ display: "flex", color: "GrayText", flexShrink: 0 }}
                >
                  {icons?.search ?? (
                    <SearchIcon style={{ width: 14, height: 14 }} />
                  )}
                </span>
                <input
                  type="text"
                  placeholder="Search all columns..."
                  value={globalSearchValue ?? internalGlobalSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (onGlobalSearchChange) onGlobalSearchChange(v);
                    else setInternalGlobalSearch(v);
                  }}
                  style={{
                    flex: "1 1 0%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    font: "inherit",
                    color: "inherit",
                    padding: "4px 6px",
                    minWidth: 0,
                  }}
                />
                {(globalSearchValue ?? internalGlobalSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onGlobalSearchChange) onGlobalSearchChange("");
                      else setInternalGlobalSearch("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      color: "GrayText",
                      flexShrink: 0,
                    }}
                  >
                    {icons?.close ?? (
                      <XIcon style={{ width: 12, height: 12 }} />
                    )}
                  </button>
                )}
              </div>
            )}
            {toolbarContent}
            {showColumnSettings && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setShowColumnPicker((p) => !p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "1px solid rgba(128,128,128,0.2)",
                    borderRadius: 4,
                    cursor: "pointer",
                    padding: "4px 6px",
                    color: "inherit",
                    gap: 4,
                    fontSize: 12,
                  }}
                  title="Column settings"
                >
                  {icons?.columns ?? (
                    <ColumnsIcon style={{ width: 14, height: 14 }} />
                  )}
                  <span>{columnSettingsLabel ?? "Columns"}</span>
                </button>
                {showColumnPicker && (
                  <div
                    ref={columnPickerRef}
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      zIndex: 99999,
                      minWidth: 200,
                      maxHeight: 320,
                      overflowY: "auto",
                      borderRadius: 8,
                      border: "1px solid rgba(128,128,128,0.2)",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      backgroundColor: "rgba(128,128,128,0.08)",
                      padding: "4px 0",
                      marginTop: 4,
                    }}
                  >
                    {initialColumns
                      .filter(
                        (c) => c.key !== "__select__" && c.key !== "__expand__",
                      )
                      .map((col) => {
                        const current = columns.find((c) => c.key === col.key);
                        const isHidden = current?.hidden ?? false;
                        const isPinned = !!current?.pinned;
                        return (
                          <label
                            key={col.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 12px",
                              cursor: isPinned ? "not-allowed" : "pointer",
                              opacity: isPinned ? 0.5 : 1,
                              fontSize: 12,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              disabled={isPinned}
                              onChange={() => {
                                if (isPinned) return;
                                handleToggleHide(col.key);
                              }}
                              style={{
                                cursor: isPinned ? "not-allowed" : "pointer",
                                accentColor,
                              }}
                            />
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {typeof col.title === "string"
                                ? col.title
                                : col.key}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            position: "relative",
            ...(autoHeight
              ? {
                  height: `${clampedAutoHeight}px`,
                  maxHeight: `${clampedAutoHeight}px`,
                  flexShrink: 1,
                  flexGrow: 0,
                }
              : { flex: "1 1 0%" }),
          }}
        >
          {layoutLoading ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "auto",
                contain: "layout paint",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns,
                  gridTemplateRows: "36px auto",
                  minWidth: `${totalTableWidth}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {orderedColumns.map((column) => {
                  const isPinned = !!column.pinned;
                  const offset = columnOffsets.get(column.key);
                  const isSystem =
                    column.key === "__select__" || column.key === "__expand__";
                  return (
                    <div
                      key={column.key}
                      className={
                        isPinned
                          ? (classNames.pinnedHeader ?? "")
                          : (classNames.header ?? "")
                      }
                      style={{
                        display: "flex",
                        height: 36,
                        alignItems: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap" as const,
                        borderBottom: "1px solid rgba(128,128,128,0.2)",
                        backdropFilter: "blur(8px)",
                        position: "sticky",
                        top: 0,
                        zIndex: isPinned ? 13 : 10,
                        ...(isPinned
                          ? {
                              [column.pinned as string]: offset ?? 0,
                              ...styles.pinnedHeader,
                            }
                          : styles.header),
                        paddingLeft: isSystem ? 0 : 8,
                        paddingRight: isSystem ? 0 : 8,
                      }}
                    ></div>
                  );
                })}

                <div style={{ gridColumn: "1 / -1" }}>
                  {Array.from({ length: shimmerCount }).map((_, rowIndex) => (
                    <div
                      key={rowIndex}
                      style={{
                        display: "grid",
                        gridTemplateColumns,
                        height: rowHeight,
                      }}
                    >
                      {orderedColumns.map((column, colIndex) => {
                        const isPinned = !!column.pinned;
                        const offset = columnOffsets.get(column.key);
                        const isSystem =
                          column.key === "__select__" ||
                          column.key === "__expand__";
                        const widthPercent =
                          SHIMMER_WIDTHS[
                            (rowIndex * 7 + colIndex) % SHIMMER_WIDTHS.length
                          ];
                        return (
                          <div
                            key={column.key}
                            className={
                              isPinned ? (classNames.pinnedCell ?? "") : ""
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              borderBottom: "1px solid rgba(128,128,128,0.2)",
                              ...(isPinned
                                ? {
                                    position: "sticky" as const,
                                    [column.pinned as string]: offset ?? 0,
                                    zIndex: 5,
                                    ...styles.pinnedCell,
                                  }
                                : {}),
                              paddingLeft: isSystem ? 0 : 8,
                              paddingRight: isSystem ? 0 : 8,
                              justifyContent: isSystem ? "center" : undefined,
                            }}
                          >
                            <div
                              style={{
                                backgroundColor: "rgba(100, 116, 139, 0.15)",
                                animation:
                                  "bt-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                                borderRadius: isSystem ? 3 : 4,
                                height: isSystem ? 16 : 14,
                                width: isSystem ? 16 : `${widthPercent}%`,
                                animationDelay: `${(rowIndex * 7 + colIndex) * 50}ms`,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={tableAreaCallbackRef}
              style={{
                position: "absolute",
                inset: 0,
                overflow: "auto",
                contain: "layout paint",
              }}
            >
              <ResizeOverlay ref={resizeOverlayRef} accentColor={accentColor} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns,
                  gridTemplateRows: isEmpty
                    ? hasColumnGroups
                      ? "36px 36px 1fr"
                      : "36px 1fr"
                    : hasColumnGroups
                      ? `36px 36px ${virtualTotalSize}px`
                      : `36px ${virtualTotalSize}px`,
                  minWidth: `${totalTableWidth}px`,
                  width: "100%",
                  position: "relative",
                  ...(isEmpty ? { height: "100%" } : {}),
                }}
                onContextMenu={(e) => {
                  const cell = (e.target as HTMLElement).closest<HTMLElement>(
                    "[data-bt-cell]",
                  );
                  if (!cell) return;
                  const rk = cell.dataset.rowKey;
                  const ck = cell.dataset.columnKey;
                  if (!rk || !ck) return;

                  const col = freshOrderedColumns.find((c) => c.key === ck);
                  const hasCopy = !!col?.copy;
                  const hasRowPin = !!rowPinning;
                  const hasCellItems =
                    col?.columnCellContextMenuItems &&
                    col.columnCellContextMenuItems.length > 0;
                  const hasEdit = !!col?.editable && !col?.render && !!onEdit;
                  if (!hasCopy && !hasRowPin && !hasCellItems && !hasEdit)
                    return;

                  e.preventDefault();
                  setCellContextMenu({
                    x: Math.min(e.clientX, window.innerWidth - 200),
                    y: Math.min(e.clientY, window.innerHeight - 200),
                    rowKey: rk,
                    columnKey: ck,
                  });
                }}
                onTouchStart={(e) => {
                  cancelCellLongPress();
                  const cell = (e.target as HTMLElement).closest<HTMLElement>(
                    "[data-bt-cell]",
                  );
                  if (!cell) return;
                  const touch = e.touches[0];
                  cellTouchStart.current = {
                    x: touch.clientX,
                    y: touch.clientY,
                  };
                  const rk = cell.dataset.rowKey;
                  const ck = cell.dataset.columnKey;
                  cellLongPressTimer.current = setTimeout(() => {
                    cellLongPressTimer.current = null;
                    if (!rk || !ck) return;
                    const col = freshOrderedColumns.find((c) => c.key === ck);
                    const hasCopy = !!col?.copy;
                    const hasRowPin = !!rowPinning;
                    const hasCellItems =
                      col?.columnCellContextMenuItems &&
                      col.columnCellContextMenuItems.length > 0;
                    const hasEdit = !!col?.editable && !col?.render && !!onEdit;
                    if (!hasCopy && !hasRowPin && !hasCellItems && !hasEdit)
                      return;
                    setCellContextMenu({
                      x: Math.min(touch.clientX, window.innerWidth - 200),
                      y: Math.min(touch.clientY, window.innerHeight - 200),
                      rowKey: rk,
                      columnKey: ck,
                    });
                  }, 500);
                }}
                onTouchMove={(e) => {
                  if (!cellTouchStart.current) return;
                  const touch = e.touches[0];
                  const dx = touch.clientX - cellTouchStart.current.x;
                  const dy = touch.clientY - cellTouchStart.current.y;
                  if (Math.abs(dx) > 10 || Math.abs(dy) > 10)
                    cancelCellLongPress();
                }}
                onTouchEnd={cancelCellLongPress}
                onTouchCancel={cancelCellLongPress}
                onClick={
                  onRowClick
                    ? (e: React.MouseEvent) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("input, button, a, select, textarea")
                        )
                          return;
                        const cell =
                          target.closest<HTMLElement>("[data-bt-cell]");
                        if (!cell) return;
                        const rk = cell.dataset.rowKey;
                        if (!rk) return;
                        for (let i = 0; i < (displayData as T[]).length; i++) {
                          const row = displayData[i] as T;
                          if (row == null) continue;
                          if (getSafeRowKey(row, i) === rk) {
                            onRowClick(row, i, e);
                            return;
                          }
                        }
                        for (let i = 0; i < pinnedTopRows.length; i++) {
                          if (pinnedTopRows[i] == null) continue;
                          if (getSafeRowKey(pinnedTopRows[i], i) === rk) {
                            onRowClick(pinnedTopRows[i], i, e);
                            return;
                          }
                        }
                        for (let i = 0; i < pinnedBottomRows.length; i++) {
                          if (pinnedBottomRows[i] == null) continue;
                          if (getSafeRowKey(pinnedBottomRows[i], i) === rk) {
                            onRowClick(pinnedBottomRows[i], i, e);
                            return;
                          }
                        }
                      }
                    : undefined
                }
              >
                {hasColumnGroups &&
                  headerGroups.map((group) => {
                    let minIdx = Infinity;
                    let maxIdx = -1;
                    orderedColumns.forEach((col, idx) => {
                      if (group.childKeys.includes(col.key)) {
                        minIdx = Math.min(minIdx, idx);
                        maxIdx = Math.max(maxIdx, idx);
                      }
                    });
                    if (minIdx === Infinity) return null;

                    const groupEndsAtLastCol =
                      maxIdx === orderedColumns.length - 1;

                    return (
                      <div
                        key={`group-${group.key}`}
                        data-bt-header=""
                        className={`${group.className ?? ""} ${classNames.header ?? ""}`}
                        style={{
                          gridColumn: `${minIdx + 1} / ${maxIdx + 2}`,
                          gridRow: 1,
                          position: "sticky",
                          top: 0,
                          zIndex: 10,
                          display: "flex",
                          height: 36,
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap" as const,
                          boxSizing: "border-box",
                          borderBottom: "1px solid rgba(128,128,128,0.2)",
                          borderRight: groupEndsAtLastCol
                            ? "none"
                            : "1px solid rgba(128,128,128,0.2)",
                          fontWeight: 500,
                          userSelect: "none",
                          ...group.style,
                          ...styles.header,
                        }}
                      >
                        {group.title}
                      </div>
                    );
                  })}

                {(() => {
                  const firstDataColIndex = orderedColumns.findIndex(
                    (c) => c.key !== "__select__" && c.key !== "__expand__",
                  );
                  return orderedColumns.map((column, visualIndex) => {
                    const isInGroup =
                      groupedColumnKeySet?.has(column.key) ?? false;
                    const leafGridRow = hasColumnGroups
                      ? isInGroup
                        ? 2
                        : "1 / 3"
                      : 1;
                    const leafHeight = hasColumnGroups && !isInGroup ? 72 : 36;
                    const leafStickyTop = hasColumnGroups && isInGroup ? 36 : 0;

                    if (column.key === "__select__" && rowSelection) {
                      return (
                        <div
                          key="__select__"
                          data-bt-header=""
                          data-bt-pinned=""
                          className={`${classNames.header ?? ""} ${classNames.pinnedHeader ?? ""}`}
                          style={{
                            display: "flex",
                            height: leafHeight,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                            boxSizing: "border-box",
                            borderBottom: "1px solid rgba(128,128,128,0.2)",
                            borderRight: "1px solid rgba(128,128,128,0.2)",
                            position: "sticky",
                            left: columnOffsets.get("__select__") ?? 0,
                            top: 0,
                            zIndex: 13,
                            width: "48px",
                            gridRow: leafGridRow,
                            ...styles.header,
                            ...styles.pinnedHeader,
                          }}
                        >
                          {rowSelection.type !== "radio" &&
                            !rowSelection.hideSelectAll && (
                              <input
                                type="checkbox"
                                checked={
                                  dataLength > 0 &&
                                  normalizedSelectedKeys.length === dataLength
                                }
                                ref={(input) => {
                                  if (input) {
                                    input.indeterminate =
                                      normalizedSelectedKeys.length > 0 &&
                                      normalizedSelectedKeys.length <
                                        dataLength;
                                  }
                                }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const allKeys = data.map((row, idx) =>
                                      getRawRowKey(row, idx),
                                    );
                                    rowSelection.onSelectAll?.(
                                      true,
                                      data,
                                      data,
                                    );
                                    rowSelection.onChange?.(allKeys, data, {
                                      type: "all",
                                    });
                                  } else {
                                    rowSelection.onSelectAll?.(false, [], data);
                                    rowSelection.onChange?.([], [], {
                                      type: "all",
                                    });
                                  }
                                }}
                                style={{
                                  cursor: "pointer",
                                  accentColor,
                                  backgroundColor: "#94A3B8",
                                }}
                              />
                            )}
                        </div>
                      );
                    }

                    if (column.key === "__expand__") {
                      return (
                        <div
                          key="__expand__"
                          data-bt-header=""
                          data-bt-pinned=""
                          className={`${classNames.header ?? ""} ${classNames.pinnedHeader ?? ""}`}
                          style={{
                            display: "flex",
                            height: leafHeight,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                            boxSizing: "border-box",
                            borderBottom: "1px solid rgba(128,128,128,0.2)",
                            borderRight: "1px solid rgba(128,128,128,0.2)",
                            position: "sticky",
                            left: columnOffsets.get("__expand__") ?? 0,
                            top: 0,
                            zIndex: 13,
                            width: "40px",
                            backgroundColor: styles.pinnedBg,
                            gridRow: leafGridRow,
                            ...styles.header,
                            ...styles.pinnedHeader,
                          }}
                        />
                      );
                    }

                    return (
                      <DraggableHeader
                        key={column.key}
                        column={column as ColumnType<DataRecord>}
                        accentColor={accentColor}
                        visualIndex={visualIndex}
                        onResizeStart={handleResizeStart}
                        onColumnDragStart={handleColumnDragStart}
                        styles={styles}
                        classNames={classNames}
                        gripIcon={gripIcon}
                        hideGripIcon={hideGripIcon}
                        icons={icons}
                        stickyOffset={columnOffsets.get(column.key)}
                        onTogglePin={handleTogglePin}
                        onToggleHide={handleToggleHide}
                        isLastColumn={visualIndex === orderedColumns.length - 1}
                        isFirstColumn={visualIndex === firstDataColIndex}
                        sortDirection={
                          sortState.key === column.key
                            ? sortState.direction
                            : null
                        }
                        onSort={handleSort}
                        filterValue={columnFilters[column.key] ?? ""}
                        onFilter={handleColumnFilter}
                        onClearFilter={handleClearFilter}
                        customContextMenuItems={
                          column.columnHeaderContextMenuItems
                            ? [
                                ...(columnContextMenuItems ?? []),
                                ...column.columnHeaderContextMenuItems,
                              ]
                            : columnContextMenuItems
                        }
                        disabledFilters={disabledFilters}
                        headerGridRow={leafGridRow}
                        headerHeight={leafHeight}
                        stickyTop={leafStickyTop}
                      />
                    );
                  });
                })()}

                {isEmpty ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      height: "100%",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "sticky",
                        left: 0,
                        width:
                          scrollAreaWidth > 0 ? `${scrollAreaWidth}px` : "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {emptyRenderer ?? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                            paddingTop: 32,
                            paddingBottom: 32,
                            color: "GrayText",
                          }}
                        >
                          <span style={{ fontSize: 14 }}>No data</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <TableBody
                    data={displayData as DataRecord[]}
                    orderedColumns={
                      virtualizedColumns as ColumnType<DataRecord>[]
                    }
                    rowVirtualizer={rowVirtualizer}
                    columnOffsets={columnOffsets}
                    styles={styles}
                    classNames={classNames}
                    rowSelection={
                      !showShimmer
                        ? (rowSelection as
                            | RowSelectionConfig<DataRecord>
                            | undefined)
                        : undefined
                    }
                    normalizedSelectedKeys={normalizedSelectedKeys}
                    getRowKey={
                      getSafeRowKey as (
                        record: DataRecord,
                        index: number,
                      ) => string
                    }
                    getRawRowKey={
                      getRawRowKey as (
                        record: DataRecord,
                        index: number,
                      ) => React.Key
                    }
                    expandable={
                      !showShimmer
                        ? (expandable as
                            | ExpandableConfig<DataRecord>
                            | undefined)
                        : undefined
                    }
                    resolvedExpandedKeys={resolvedExpandedKeys}
                    rowHeight={rowHeight}
                    totalTableWidth={totalTableWidth}
                    scrollAreaWidth={scrollAreaWidth}
                    accentColor={accentColor}
                    scrollContainerRef={tableAreaRef}
                    isLoading={showShimmer}
                    onExpandedRowResize={handleExpandedRowResize}
                    maxExpandedRowHeight={maxExpandedRowHeight}
                    pinnedTopData={pinnedTopRows as DataRecord[]}
                    pinnedBottomData={pinnedBottomRows as DataRecord[]}
                    gridTemplateColumns={gridTemplateColumns}
                    headerHeight={HEADER_HEIGHT}
                    rowClassName={
                      rowClassName as
                        | ((record: DataRecord, index: number) => string)
                        | undefined
                    }
                    rowStyle={
                      rowStyle as
                        | ((
                            record: DataRecord,
                            index: number,
                          ) => React.CSSProperties)
                        | undefined
                    }
                    bodyGridRow={hasColumnGroups ? 3 : 2}
                    onEdit={
                      onEdit as
                        | ((
                            value: unknown,
                            record: DataRecord,
                            dataIndex: string,
                            rowIndex: number,
                          ) => void)
                        | undefined
                    }
                    editingCell={editingCell}
                    onEditComplete={handleEditComplete}
                    enableDynamicRowHeight={enableDynamicRowHeight}
                    onRowHeightChange={handleRowHeightChange}
                    columnGridIndexMap={columnGridIndexMap}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {pgEnabled && (
          <div
            className={classNames.pagination ?? ""}
            style={{
              display: "flex",
              height: 36,
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              paddingLeft: 12,
              paddingRight: 12,
              fontSize: 12,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(128,128,128,0.06)",
              gap: 12,
              ...styles.pagination,
            }}
          >
            <div
              style={{ display: "flex", flex: "1 1 0%", alignItems: "center" }}
            >
              {(() => {
                const rangeStart =
                  total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
                const rangeEnd = Math.min(currentPage * pageSize, total);
                return typeof pagination === "object" &&
                  pagination?.showTotal ? (
                  <span
                    className={classNames.paginationInfo ?? ""}
                    style={{
                      color: "GrayText",
                      fontSize: 12,
                      ...styles.paginationInfo,
                    }}
                  >
                    Showing{" "}
                    {pagination.showTotal(total, [rangeStart, rangeEnd])} of{" "}
                    {total} items
                  </span>
                ) : (
                  <span
                    className={classNames.paginationInfo ?? ""}
                    style={{
                      color: "GrayText",
                      fontSize: 12,
                      ...styles.paginationInfo,
                    }}
                  >
                    {rangeStart}–{rangeEnd} of {total}
                  </span>
                );
              })()}
            </div>

            <div
              style={{
                display: "flex",
                flex: "1 1 0%",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={classNames.paginationButton ?? ""}
                style={{
                  display: "inline-flex",
                  height: 24,
                  width: 24,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  opacity: currentPage === 1 ? 0.3 : 1,
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "inherit",
                  ...styles.paginationButton,
                }}
                title="First page"
              >
                {icons?.chevronsLeft ?? (
                  <ChevronsLeftIcon style={{ width: 12, height: 12 }} />
                )}
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={classNames.paginationButton ?? ""}
                style={{
                  display: "inline-flex",
                  height: 24,
                  width: 24,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  opacity: currentPage === 1 ? 0.3 : 1,
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "inherit",
                  ...styles.paginationButton,
                }}
                title="Previous page"
              >
                {icons?.chevronLeft ?? (
                  <ChevronLeftIcon style={{ width: 12, height: 12 }} />
                )}
              </button>

              {getPageNumbers().map((page) => {
                if (page === "ellipsis-left" || page === "ellipsis-right") {
                  return (
                    <span
                      key={page}
                      style={{
                        color: "GrayText",
                        paddingLeft: 4,
                        paddingRight: 4,
                        fontSize: 12,
                        userSelect: "none",
                      }}
                    >
                      ...
                    </span>
                  );
                }
                const isActivePage = page === currentPage;
                return (
                  <button
                    type="button"
                    key={page}
                    className={
                      `${classNames.paginationButton ?? ""} ${isActivePage ? (classNames.paginationActiveButton ?? "") : ""}`.trim() ||
                      undefined
                    }
                    style={{
                      display: "inline-flex",
                      height: 24,
                      minWidth: 24,
                      cursor: "pointer",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 4,
                      paddingLeft: 6,
                      paddingRight: 6,
                      fontSize: 12,
                      color: isActivePage ? accentColor : undefined,
                      background: "none",
                      border: "none",
                      ...styles.paginationButton,
                      ...(isActivePage
                        ? styles.paginationActiveButton
                        : undefined),
                    }}
                    onClick={() => handlePageChange(page as number)}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={classNames.paginationButton ?? ""}
                style={{
                  display: "inline-flex",
                  height: 24,
                  width: 24,
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  opacity: currentPage === totalPages ? 0.3 : 1,
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "inherit",
                  ...styles.paginationButton,
                }}
                title="Next page"
              >
                {icons?.chevronRight ?? (
                  <ChevronRightIcon style={{ width: 12, height: 12 }} />
                )}
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={classNames.paginationButton ?? ""}
                style={{
                  display: "inline-flex",
                  height: 24,
                  width: 24,
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  opacity: currentPage === totalPages ? 0.3 : 1,
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "inherit",
                  ...styles.paginationButton,
                }}
                title="Last page"
              >
                {icons?.chevronsRight ?? (
                  <ChevronsRightIcon style={{ width: 12, height: 12 }} />
                )}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flex: "1 1 0%",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              {typeof pagination === "object" &&
              pagination?.hidePageSelector ? null : (
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className={classNames.paginationSelect ?? ""}
                  style={{
                    cursor: "pointer",
                    borderRadius: 4,
                    border: "1px solid rgba(128,128,128,0.2)",
                    paddingLeft: 6,
                    paddingRight: 6,
                    paddingTop: 2,
                    paddingBottom: 2,
                    fontSize: 12,
                    height: 24,
                    background: "inherit",
                    color: "inherit",
                    ...styles.paginationSelect,
                  }}
                >
                  {(typeof pagination === "object" &&
                  pagination?.pageSizeOptions
                    ? pagination.pageSizeOptions
                    : [10, 15, 20, 25, 50, 100]
                  ).map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {mounted &&
        createPortal(
          <div
            ref={ghostRef}
            className={`${classNames.header ?? ""} ${classNames.dragHeader ?? ""}`}
            style={{
              display: "none",
              position: "fixed",
              zIndex: 99999,
              height: 36,
              fontSize: 12,
              alignItems: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
              borderRadius: 6,
              border: "1px dashed rgba(128,128,128,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              backgroundColor: "rgba(128,128,128,0.12)",
              cursor: "grabbing",
              pointerEvents: "none",
              ...styles.header,
              ...styles.dragHeader,
            }}
          >
            <div
              style={{
                display: "flex",
                height: "100%",
                flex: "1 1 0%",
                alignItems: "center",
                gap: 4,
                overflow: "hidden",
                paddingLeft: 8,
                paddingRight: 8,
                fontWeight: 500,
              }}
            >
              {icons?.gripVertical ?? gripIcon ?? (
                <GripVerticalIcon
                  style={{ width: 12, height: 12, flexShrink: 0 }}
                />
              )}
              <div
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap" as const,
                  textAlign: "left",
                  userSelect: "none",
                }}
              >
                {activeColumn
                  ? typeof activeColumn.title === "string"
                    ? activeColumn.title
                    : activeColumn.key
                  : ""}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {cellContextMenu &&
        mounted &&
        (() => {
          const menuCol = freshOrderedColumns.find(
            (c) => c.key === cellContextMenu.columnKey,
          );
          const isPinnedTop = pinnedTopKeySet.has(cellContextMenu.rowKey);
          const isPinnedBottom = pinnedBottomKeySet.has(cellContextMenu.rowKey);
          const hasCopy = !!menuCol?.copy;
          const hasRowPin = !!rowPinning;
          const hasEdit = !!menuCol?.editable && !menuCol?.render && !!onEdit;

          let menuRecord: T | undefined;
          let menuRowIndex = 0;
          const allRows = [
            ...pinnedTopRows,
            ...(displayData as T[]),
            ...pinnedBottomRows,
          ];
          for (let i = 0; i < allRows.length; i++) {
            if (allRows[i] == null) continue;
            const rk = getSafeRowKey(allRows[i], i);
            if (rk === cellContextMenu.rowKey) {
              menuRecord = allRows[i];
              menuRowIndex = i;
              break;
            }
          }

          const menuValue =
            menuRecord && menuCol?.dataIndex != null
              ? menuRecord[menuCol.dataIndex]
              : undefined;

          const btnStyle: CSSProperties = {
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
            color: "inherit",
            whiteSpace: "nowrap",
            ...styles.contextMenuItem,
          };

          return createPortal(
            <div
              ref={cellMenuRef}
              style={{
                position: "fixed",
                top: cellContextMenu.y,
                left: cellContextMenu.x,
                zIndex: 99999,
                minWidth: 170,
                borderRadius: 8,
                border: "1px solid rgba(128,128,128,0.2)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                backgroundColor: "rgba(128,128,128,0.08)",
                padding: "4px 0",
                fontSize: 10,
              }}
            >
              {hasRowPin && (
                <>
                  <button
                    type="button"
                    data-bt-ctx-item
                    style={btnStyle}
                    onClick={() => {
                      handleRowPin(
                        cellContextMenu.rowKey,
                        isPinnedTop ? false : "top",
                      );
                      setCellContextMenu(null);
                    }}
                  >
                    {isPinnedTop
                      ? (icons?.pinOff ?? (
                          <PinOffIcon
                            style={{ width: 14, height: 14, flexShrink: 0 }}
                          />
                        ))
                      : (icons?.pin ?? (
                          <PinIcon
                            style={{ width: 14, height: 14, flexShrink: 0 }}
                          />
                        ))}
                    {isPinnedTop ? "Unpin Row from Top" : "Pin Row to Top"}
                  </button>

                  <button
                    type="button"
                    data-bt-ctx-item
                    style={btnStyle}
                    onClick={() => {
                      handleRowPin(
                        cellContextMenu.rowKey,
                        isPinnedBottom ? false : "bottom",
                      );
                      setCellContextMenu(null);
                    }}
                  >
                    {isPinnedBottom
                      ? (icons?.pinOff ?? (
                          <PinOffIcon
                            style={{ width: 14, height: 14, flexShrink: 0 }}
                          />
                        ))
                      : (icons?.pin ?? (
                          <PinIcon
                            style={{
                              width: 14,
                              height: 14,
                              flexShrink: 0,
                              transform: "rotate(180deg)",
                            }}
                          />
                        ))}
                    {isPinnedBottom
                      ? "Unpin Row from Bottom"
                      : "Pin Row to Bottom"}
                  </button>
                </>
              )}

              {hasRowPin && (hasCopy || hasEdit) && (
                <div
                  style={{
                    borderTop: "1px solid rgba(128,128,128,0.2)",
                    margin: "4px 0",
                  }}
                />
              )}

              {hasEdit && (
                <button
                  type="button"
                  data-bt-ctx-item
                  style={btnStyle}
                  onClick={() => {
                    setEditingCell({
                      rowKey: cellContextMenu.rowKey,
                      columnKey: cellContextMenu.columnKey,
                    });
                    setCellContextMenu(null);
                  }}
                >
                  {icons?.edit ?? (
                    <PencilIcon
                      style={{ width: 14, height: 14, flexShrink: 0 }}
                    />
                  )}
                  Edit
                </button>
              )}

              {(hasEdit || hasRowPin) && hasCopy && (
                <div
                  style={{
                    borderTop: "1px solid rgba(128,128,128,0.2)",
                    margin: "4px 0",
                  }}
                />
              )}

              {hasCopy && menuRecord && menuCol && (
                <button
                  type="button"
                  data-bt-ctx-item
                  style={btnStyle}
                  onClick={() => {
                    const text =
                      typeof menuCol.copy === "function"
                        ? (
                            menuCol.copy as (
                              v: unknown,
                              r: T,
                              i: number,
                            ) => string
                          )(menuValue, menuRecord!, menuRowIndex)
                        : String(menuValue ?? "");
                    navigator.clipboard?.writeText(text);
                    onCopy?.(text, menuCol.key, menuRecord!, menuRowIndex);
                    setCellContextMenu(null);
                  }}
                >
                  {icons?.copy ?? (
                    <CopyIcon
                      style={{ width: 14, height: 14, flexShrink: 0 }}
                    />
                  )}
                  Copy
                </button>
              )}

              {menuCol?.columnCellContextMenuItems &&
                menuCol.columnCellContextMenuItems.length > 0 && (
                  <>
                    {(hasCopy || hasRowPin || hasEdit) && (
                      <div
                        style={{
                          borderTop: "1px solid rgba(128,128,128,0.2)",
                          margin: "4px 0",
                        }}
                      />
                    )}
                    {(
                      menuCol.columnCellContextMenuItems as {
                        key: string;
                        label: React.ReactNode;
                        icon?: React.ReactNode;
                        danger?: boolean;
                        disabled?: boolean;
                        onClick: (
                          columnKey: string,
                          record: T,
                          rowIndex: number,
                        ) => void;
                      }[]
                    ).map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        data-bt-ctx-item=""
                        disabled={item.disabled}
                        style={{
                          ...btnStyle,
                          cursor: item.disabled ? "not-allowed" : "pointer",
                          opacity: item.disabled ? 0.5 : 1,
                          color: item.danger ? "#ef4444" : "inherit",
                        }}
                        onClick={() => {
                          if (menuRecord) {
                            item.onClick(menuCol.key, menuRecord, menuRowIndex);
                          }
                          setCellContextMenu(null);
                        }}
                      >
                        {item.icon && (
                          <span
                            style={{
                              display: "flex",
                              width: 14,
                              height: 14,
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
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
          );
        })()}
    </>
  );
}
