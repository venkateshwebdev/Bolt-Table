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
  LoaderIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "./icons";
import {
  applyAIOperations,
  buildSystemPrompt,
  callAI,
  getAICellStyle,
  getAIRowStyle,
  parseAIResponse,
} from "./ai";
import ResizeOverlay, { type ResizeOverlayHandle } from "./ResizeOverlay";
import TableBody from "./TableBody";
import type {
  AICellStyleOperation,
  AIOperation,
  AIResponse,
  AIStyleOperation,
  BoltTableAIConfig,
  ColumnContextMenuItem,
  ColumnPersistenceConfig,
  ColumnType,
  ConditionalFormatRule,
  DataRecord,
  RowGroupingConfig,
  TreeDataConfig,
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

  /**
   * Color scheme hint for the table.
   * - `"auto"` (default): inherits from the parent's computed `color-scheme` or the system preference.
   * - `"dark"`: forces dark mode system colors and form controls.
   * - `"light"`: forces light mode system colors and form controls.
   */
  readonly theme?: "auto" | "dark" | "light";

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

  /** Enable sorting by multiple columns simultaneously. Hold Shift while clicking sort to add columns. */
  readonly multiSort?: boolean;

  /** Called when the multi-sort state changes. Receives the full ordered array of active sorts. Only fires when `multiSort` is true. */
  readonly onMultiSortChange?: (sorts: ReadonlyArray<{ columnKey: string; direction: SortDirection }>) => void;

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

  /** Declarative conditional formatting rules. Each rule applies styles/classNames to cells or rows matching a condition. */
  readonly conditionalFormatting?: ConditionalFormatRule<T>[];

  /** Group rows by a column value, with collapsible headers and optional aggregations. */
  readonly rowGrouping?: RowGroupingConfig<T>;

  /** Display data as a tree hierarchy. Rows with a `children` array (or custom key) are shown as expandable tree nodes. */
  readonly treeData?: TreeDataConfig<T>;

  /** Show an advanced filter builder button in the toolbar. Allows building complex multi-condition filters visually. */
  readonly enableFilterBuilder?: boolean;

  /** Render a detail panel below the table when a row is clicked. Receives the clicked row record and a close function. */
  readonly masterDetail?: (record: T, close: () => void) => React.ReactNode;

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

  /** Extra content rendered on the right side of the toolbar, after all built-in buttons. */
  readonly toolbarRight?: React.ReactNode;

  /** Label for the column-settings button. Defaults to "Columns". */
  readonly columnSettingsLabel?: React.ReactNode;

  /** Enable the AI assistant button in the toolbar. Requires `aiConfig` or `onAIQuery`. */
  readonly aiMode?: boolean;

  /** AI provider configuration (API key, model, etc.). Used by the built-in AI handler. */
  readonly aiConfig?: BoltTableAIConfig;

  /** Custom AI query handler. When provided, overrides the built-in AI call. Return an `AIResponse` with operations to apply. */
  readonly onAIQuery?: (
    query: string,
    context: { data: T[]; columns: ColumnType<T>[] },
  ) => Promise<AIResponse>;

  /** Called after the AI applies operations. Receives the parsed response. */
  readonly onAIResponse?: (response: AIResponse) => void;

  /** Placeholder text for the AI search bar. */
  readonly aiPlaceholder?: string;

  /** Label for the AI button. Defaults to "Ask AI". */
  readonly aiButtonLabel?: React.ReactNode;

  /** Enable smooth CSS transitions on rows when data changes (sort, filter, reorder). Adds `transition: top` on cells. */
  readonly enableRowAnimation?: boolean;

  /** Show a status bar at the bottom of the table with row counts, selection info, etc. */
  readonly showStatusBar?: boolean;

  /** Custom renderer for the status bar. Receives `{ totalRows, filteredRows, selectedRows, currentPage, pageSize }`. When omitted, a default status bar is rendered. */
  readonly statusBarContent?: (info: {
    totalRows: number;
    filteredRows: number;
    selectedRows: number;
    currentPage: number;
    pageSize: number;
  }) => React.ReactNode;

  /** Called when the user clicks the "AI Insights" button. Should return a textual analysis of the data. Falls back to the built-in AI if not provided. */
  readonly onAIInsights?: (data: T[], columns: ColumnType<T>[]) => Promise<string>;

  /** Called when the user clicks the "AI Chart" button. Should return a React node with a chart visualization. When omitted and `aiConfig` is set, the built-in AI generates SVG chart markup. */
  readonly onAIChart?: (data: T[], columns: ColumnType<T>[]) => Promise<React.ReactNode>;

  /** Enable row drag-and-drop reordering. When true, shows a grip handle on each row. Requires `onRowReorder`. */
  readonly rowDragEnabled?: boolean;

  /** Called when the user drops a row into a new position. Receives the old and new index. */
  readonly onRowReorder?: (fromIndex: number, toIndex: number) => void;
}

export interface ClassNamesTypes {
  /** Applied to the outermost wrapper div. */
  wrapper?: string;

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

  /** Applied to the toolbar bar (search + buttons). */
  toolbar?: string;

  /** Applied to the global search input. */
  searchInput?: string;

  /** Applied to the status bar at the bottom. */
  statusBar?: string;

  /** Applied to the filter builder drawer. */
  filterDrawer?: string;

  /** Applied to the AI input/bar area. */
  aiBar?: string;

  /** Applied to the master-detail panel below the table. */
  masterDetailPanel?: string;

  /** Applied to group header rows (row grouping). */
  groupHeader?: string;

  /** Applied to the empty state container. */
  emptyState?: string;

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
  /** Inline styles for the outermost wrapper div. */
  wrapper?: CSSProperties;

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

  /** Inline styles for the toolbar bar (search + buttons). */
  toolbar?: CSSProperties;

  /** Inline styles for the global search input. */
  searchInput?: CSSProperties;

  /** Inline styles for the status bar at the bottom. */
  statusBar?: CSSProperties;

  /** Inline styles for the filter builder drawer. */
  filterDrawer?: CSSProperties;

  /** Inline styles for the AI input/bar area. */
  aiBar?: CSSProperties;

  /** Inline styles for the master-detail panel below the table. */
  masterDetailPanel?: CSSProperties;

  /** Inline styles for group header rows (row grouping). */
  groupHeader?: CSSProperties;

  /** Inline styles for the empty state container. */
  emptyState?: CSSProperties;

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
  theme = "auto",
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
  multiSort = false,
  onMultiSortChange,
  onFilterChange,
  columnContextMenuItems,
  autoHeight = true,
  layoutLoading,
  emptyRenderer,
  rowClassName,
  rowStyle,
  conditionalFormatting,
  rowGrouping,
  treeData,
  masterDetail,
  enableFilterBuilder = false,
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
  toolbarRight,
  columnSettingsLabel,
  aiMode = false,
  aiConfig,
  onAIQuery,
  onAIResponse,
  aiPlaceholder = "Ask AI anything about your data...",
  aiButtonLabel,
  onAIInsights,
  onAIChart,
  enableRowAnimation = false,
  showStatusBar = false,
  statusBarContent,
  rowDragEnabled = false,
  onRowReorder,
}: BoltTableProps<T>) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const [systemDark, setSystemDark] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false,
  );
  React.useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [theme]);

  const isDark = theme === "dark" || (theme === "auto" && systemDark);

  const bt = useMemo(() => {
    if (isDark) return { color: "#e0e0e0", bg: "#0f0f0f", cardBg: "#181818", border: "#333", inputBg: "#1a1a1a", menuBg: "rgba(28,28,30,0.92)", menuShadow: "0 8px 24px rgba(0,0,0,0.5)" };
    return { color: "#1a1a2e", bg: "#ffffff", cardBg: "#ffffff", border: "#ddd", inputBg: "#ffffff", menuBg: "rgba(255,255,255,0.95)", menuShadow: "0 8px 24px rgba(0,0,0,0.12)" };
  }, [isDark]);

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
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [masterDetailRecord, setMasterDetailRecord] = useState<T | null>(null);
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

  // ── AI Mode state ──────────────────────────────────────────────────────
  const aiOnlyToolbar = !!(aiMode && hideGlobalSearch && !showColumnSettings && !toolbarContent);
  const [aiBarOpen, setAiBarOpen] = useState(false);
  const effectiveAiBarOpen = aiOnlyToolbar || aiBarOpen;
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const [aiConversationHistory, setAiConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);

  const handleAIInsights = useCallback(async () => {
    setAiInsightsLoading(true);
    setAiInsights(null);
    try {
      let result: string;
      if (onAIInsights) {
        result = await onAIInsights(data as T[], initialColumns as ColumnType<T>[]);
      } else if (aiConfig) {
        const sysPrompt = `You are a data analyst. Analyze the provided dataset and give concise insights: trends, outliers, summary statistics, and notable patterns. Reply in plain text, not JSON.

Columns: ${initialColumns.map((c) => `${c.key}${c.dataIndex ? ` (${c.dataIndex})` : ""}`).join(", ")}

Sample data (first 20 rows):
${JSON.stringify(data.slice(0, 20), null, 2)}

Total rows: ${data.length}`;
        result = await callAI(aiConfig, sysPrompt, "Analyze this data and provide key insights.");
      } else {
        result = "AI insights requires either aiConfig or onAIInsights prop.";
      }
      setAiInsights(result);
    } catch (err) {
      setAiInsights(`Error: ${err instanceof Error ? err.message : "Failed to generate insights"}`);
    } finally {
      setAiInsightsLoading(false);
    }
  }, [data, initialColumns, aiConfig, onAIInsights]);

  const [aiChart, setAiChart] = useState<React.ReactNode | null>(null);
  const [aiChartLoading, setAiChartLoading] = useState(false);

  const handleAIChart = useCallback(async () => {
    setAiChartLoading(true);
    setAiChart(null);
    try {
      if (onAIChart) {
        const result = await onAIChart(data as T[], initialColumns as ColumnType<T>[]);
        setAiChart(result);
      } else if (aiConfig) {
        const numericCols = initialColumns.filter((c) => {
          const sample = data.slice(0, 5).map((r) => (r as DataRecord)[c.dataIndex ?? c.key]);
          return sample.some((v) => typeof v === "number");
        });

        if (numericCols.length === 0) {
          setAiChart(<div style={{ padding: 16, textAlign: "center", color: "GrayText" }}>No numeric columns found for chart generation.</div>);
          return;
        }

        const chartCol = numericCols[0];
        const colKey = chartCol.dataIndex ?? chartCol.key;
        const values = data.slice(0, 20).map((r) => {
          const v = (r as DataRecord)[colKey];
          return typeof v === "number" ? v : 0;
        });
        const max = Math.max(...values, 1);
        const barWidth = Math.floor(400 / values.length);

        setAiChart(
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: "0.85em", fontWeight: 600, marginBottom: 8, color: accentColor }}>
              {typeof chartCol.title === "string" ? chartCol.title : chartCol.key} (first {values.length} rows)
            </div>
            <svg width="100%" viewBox={`0 0 ${values.length * barWidth} 120`} style={{ maxWidth: 500 }}>
              {values.map((v, i) => (
                <g key={i}>
                  <rect
                    x={i * barWidth + 2}
                    y={120 - (v / max) * 100}
                    width={barWidth - 4}
                    height={(v / max) * 100}
                    fill={accentColor}
                    opacity={0.7}
                    rx={2}
                  />
                  <text
                    x={i * barWidth + barWidth / 2}
                    y={115}
                    textAnchor="middle"
                    fontSize={8}
                    fill="GrayText"
                  >
                    {v}
                  </text>
                </g>
              ))}
            </svg>
          </div>,
        );
      }
    } catch (err) {
      setAiChart(<div style={{ padding: 16, color: "#ef4444" }}>Chart generation failed: {err instanceof Error ? err.message : "Unknown error"}</div>);
    } finally {
      setAiChartLoading(false);
    }
  }, [data, initialColumns, aiConfig, onAIChart, accentColor]);

  const aiSuggestions = useMemo(() => {
    if (!aiMode) return [];
    const colNames = initialColumns
      .filter((c) => !c.key.startsWith("__") && c.dataIndex)
      .map((c) => ({ key: c.dataIndex ?? c.key, title: typeof c.title === "string" ? c.title : c.key }));

    const suggestions: string[] = [];
    for (const col of colNames.slice(0, 6)) {
      suggestions.push(`Show rows where ${col.title} is highest`);
      suggestions.push(`Filter by ${col.title}`);
      suggestions.push(`Sort by ${col.title} descending`);
    }
    suggestions.push("Highlight rows with missing values");
    suggestions.push("Show only the top 10 rows");
    suggestions.push("Remove all filters");
    suggestions.push("Show all columns");
    return suggestions;
  }, [aiMode, initialColumns]);
  const [aiStyleOps, setAiStyleOps] = useState<AIStyleOperation[]>([]);
  const [aiCellStyleOps, setAiCellStyleOps] = useState<AICellStyleOperation[]>(
    [],
  );
  const [aiFilteredDataKeys, setAiFilteredDataKeys] = useState<Set<string> | null>(null);
  const [aiSortKey, setAiSortKey] = useState<string | null>(null);
  const [aiSortDir, setAiSortDir] = useState<"asc" | "desc" | null>(null);

  // ── Saved AI Filters (localStorage) ──────────────────────────────────
  const aiFiltersStorageKey = columnPersistence && typeof columnPersistence === "object"
    ? `bt-ai-filters-${columnPersistence.storageKey}`
    : "bt-ai-filters";

  const [savedAIFilters, setSavedAIFilters] = useState<
    { label: string; operations: AIOperation[]; query: string }[]
  >(() => {
    try {
      const raw = localStorage.getItem(aiFiltersStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [justSavedFilter, setJustSavedFilter] = useState(false);
  const savedFiltersRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showSavedFilters) return;
    const close = (e: MouseEvent) => {
      if (savedFiltersRef.current && !savedFiltersRef.current.contains(e.target as Node)) {
        setShowSavedFilters(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showSavedFilters]);

  const saveCurrentAIFilter = useCallback(() => {
    if (!aiResult) return;
    const label = aiQuery || aiResult.message;
    const entry = { label, operations: aiResult.operations, query: aiQuery };
    const next = [...savedAIFilters, entry];
    setSavedAIFilters(next);
    try { localStorage.setItem(aiFiltersStorageKey, JSON.stringify(next)); } catch { /* noop */ }
    setJustSavedFilter(true);
    setTimeout(() => setJustSavedFilter(false), 1500);
  }, [aiResult, aiQuery, savedAIFilters, aiFiltersStorageKey]);

  const removeSavedFilter = useCallback((index: number) => {
    const next = savedAIFilters.filter((_, i) => i !== index);
    setSavedAIFilters(next);
    try { localStorage.setItem(aiFiltersStorageKey, JSON.stringify(next)); } catch { /* noop */ }
  }, [savedAIFilters, aiFiltersStorageKey]);

  const applySavedFilter = useCallback((filter: { label: string; operations: AIOperation[]; query: string }) => {
    const { filteredData, sortOp, styleOps: sOps, cellStyleOps: csOps, hideColumns: hideCols, showColumns: showCols, resizeOps, reorderOp, pinOps, setPageOp } =
      applyAIOperations(data as DataRecord[], filter.operations);

    setAiStyleOps(sOps);
    setAiCellStyleOps(csOps);

    if (filter.operations.some((op) => op.type === "filter")) {
      const keySet = new Set<string>();
      filteredData.forEach((row, idx) => {
        const k =
          typeof rowKey === "function"
            ? (rowKey as (r: T) => string)(row as T)
            : String((row as DataRecord)[typeof rowKey === "string" ? rowKey : "id"] ?? idx);
        keySet.add(k);
      });
      setAiFilteredDataKeys(keySet);
    } else {
      setAiFilteredDataKeys(null);
    }

    if (sortOp) {
      setAiSortKey(sortOp.column);
      setAiSortDir(sortOp.direction);
    } else {
      setAiSortKey(null);
      setAiSortDir(null);
    }

    if (hideCols.length > 0 || showCols.length > 0) {
      setColumns((prev) =>
        prev.map((col) => {
          if (hideCols.includes(col.key)) return { ...col, hidden: true };
          if (showCols.includes(col.key)) return { ...col, hidden: false };
          return col;
        }),
      );
    }

    for (const rOp of resizeOps) {
      const w = Math.max(40, Math.min(800, rOp.width));
      setColumnWidths((prev) => { const n = new Map(prev); n.set(rOp.column, w); return n; });
      onColumnResize?.(rOp.column, w);
    }

    if (reorderOp) {
      setColumnOrder(reorderOp.order);
      onColumnOrderChange?.(reorderOp.order);
    }

    for (const pOp of pinOps) {
      setColumns((prev) =>
        prev.map((col) => col.key === pOp.column ? { ...col, pinned: pOp.pinned } : col),
      );
      onColumnPin?.(pOp.column, pOp.pinned);
    }

    if (setPageOp) {
      setInternalPage(setPageOp.page);
    }

    setAiResult({ operations: filter.operations, message: `Applied saved filter: ${filter.label}` });
    setShowSavedFilters(false);
  }, [data, rowKey, onColumnResize, onColumnOrderChange, onColumnPin]);

  const onAIResponseRef = useRef(onAIResponse);
  onAIResponseRef.current = onAIResponse;

  const handleAISubmit = useCallback(async () => {
    const query = aiQuery.trim();
    if (!query) return;
    setAiLoading(true);
    setAiError(null);
    try {
      let response: AIResponse;
      if (onAIQuery) {
        response = await onAIQuery(query, {
          data: data as T[],
          columns: initialColumns as ColumnType<T>[],
        });
      } else if (aiConfig) {
        const sysPrompt = buildSystemPrompt(initialColumns, data);
        const raw = await callAI(aiConfig, sysPrompt, query, aiConversationHistory);
        response = parseAIResponse(raw);

        setAiConversationHistory((prev) => [
          ...prev,
          { role: "user" as const, content: query },
          { role: "assistant" as const, content: raw },
        ]);
      } else {
        throw new Error("AI mode requires either aiConfig or onAIQuery prop");
      }

      const { filteredData, sortOp, styleOps: sOps, cellStyleOps: csOps, hideColumns: hideCols, showColumns: showCols, resizeOps, reorderOp, pinOps, setPageOp } =
        applyAIOperations(data as DataRecord[], response.operations);

      setAiStyleOps(sOps);
      setAiCellStyleOps(csOps);

      if (response.operations.some((op) => op.type === "filter")) {
        const keySet = new Set<string>();
        filteredData.forEach((row, idx) => {
          const k =
            typeof rowKey === "function"
              ? (rowKey as (r: T) => string)(row as T)
              : String((row as DataRecord)[typeof rowKey === "string" ? rowKey : "id"] ?? idx);
          keySet.add(k);
        });
        setAiFilteredDataKeys(keySet);
      } else {
        setAiFilteredDataKeys(null);
      }

      if (sortOp) {
        setAiSortKey(sortOp.column);
        setAiSortDir(sortOp.direction);
      } else {
        setAiSortKey(null);
        setAiSortDir(null);
      }

      if (hideCols.length > 0 || showCols.length > 0) {
        setColumns((prev) =>
          prev.map((col) => {
            if (hideCols.includes(col.key)) return { ...col, hidden: true };
            if (showCols.includes(col.key)) return { ...col, hidden: false };
            return col;
          }),
        );
      }

      for (const rOp of resizeOps) {
        const w = Math.max(40, Math.min(800, rOp.width));
        setColumnWidths((prev) => { const n = new Map(prev); n.set(rOp.column, w); return n; });
        onColumnResize?.(rOp.column, w);
      }

      if (reorderOp) {
        setColumnOrder(reorderOp.order);
        onColumnOrderChange?.(reorderOp.order);
      }

      for (const pOp of pinOps) {
        setColumns((prev) =>
          prev.map((col) => col.key === pOp.column ? { ...col, pinned: pOp.pinned } : col),
        );
        onColumnPin?.(pOp.column, pOp.pinned);
      }

      if (setPageOp) {
        setInternalPage(setPageOp.page);
      }

      setAiResult(response);
      onAIResponseRef.current?.(response);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "AI query failed");
    } finally {
      setAiLoading(false);
    }
  }, [aiQuery, aiConfig, onAIQuery, data, initialColumns, rowKey, aiConversationHistory]);

  const handleAIClear = useCallback(() => {
    setAiResult(null);
    setAiError(null);
    setAiStyleOps([]);
    setAiCellStyleOps([]);
    setAiFilteredDataKeys(null);
    setAiSortKey(null);
    setAiSortDir(null);
    setAiQuery("");
    setAiConversationHistory([]);
  }, []);

  const handleAIBarClose = useCallback(() => {
    setAiBarOpen(false);
    handleAIClear();
  }, [handleAIClear]);

  React.useEffect(() => {
    if (effectiveAiBarOpen && aiInputRef.current) {
      setTimeout(() => aiInputRef.current?.focus(), 300);
    }
  }, [effectiveAiBarOpen]);

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
      if (record == null) return `__row_${index}`;
      try {
        if (typeof rowKey === "function") {
          const result = rowKey(record);
          const str = String(result);
          if (str === "undefined" || str === "null" || str === "NaN" || str === "") {
            return `__row_${index}`;
          }
          return str;
        }
        if (typeof rowKey === "string") {
          const val = record[rowKey];
          if (val == null) return `__row_${index}`;
          const str = String(val);
          if (str === "undefined" || str === "null" || str === "NaN" || str === "") {
            return `__row_${index}`;
          }
          return str;
        }
      } catch {
        return `__row_${index}`;
      }
      return `__row_${index}`;
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
        if (typeof rowKey === "function") {
          const result = rowKey(record);
          if (result == null || (typeof result === "number" && Number.isNaN(result))) return index;
          const str = String(result);
          if (str === "undefined" || str === "null" || str === "NaN" || str === "") return index;
          return result;
        }
        if (typeof rowKey === "string") {
          const val = record[rowKey];
          if (val == null || (typeof val === "number" && Number.isNaN(val))) return index;
          const str = String(val);
          if (str === "undefined" || str === "null" || str === "NaN" || str === "") return index;
          if (typeof val === "number" || typeof val === "string") return val;
          return str;
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

  const columnsWithDrag = useMemo(() => {
    if (!rowDragEnabled || !onRowReorder) return columnsWithSelection;

    const dragColumn: ColumnType<T> = {
      key: "__drag__",
      dataIndex: "__drag__",
      title: "",
      width: 36,
      pinned: "left",
      hidden: false,
      render: () => null,
    };

    return [dragColumn, ...columnsWithSelection];
  }, [rowDragEnabled, onRowReorder, columnsWithSelection]);

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
      if (columnKey === "__select__" || columnKey === "__expand__" || columnKey === "__drag__") return;
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
            key === "__drag__" ||
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

  // ── Row drag-and-drop reordering ─────────────────────────────────────
  const rowDragGhostRef = useRef<HTMLDivElement | null>(null);
  const rowDragFromRef = useRef<number | null>(null);
  const rowDragOverRef = useRef<number | null>(null);
  const onRowReorderRef = useRef(onRowReorder);
  onRowReorderRef.current = onRowReorder;

  const handleRowDragStart = useCallback(
    (rowIndex: number, e: React.PointerEvent) => {
      if (!onRowReorderRef.current) return;
      e.preventDefault();

      rowDragFromRef.current = rowIndex;
      rowDragOverRef.current = null;

      const target = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-row-key]");
      const rowHeight = target?.offsetHeight ?? 40;

      const ghost = rowDragGhostRef.current;
      if (ghost) {
        ghost.textContent = `Row ${rowIndex + 1}`;
        ghost.style.display = "flex";
        ghost.style.left = `${e.clientX + 12}px`;
        ghost.style.top = `${e.clientY - 12}px`;
        ghost.style.height = `${Math.min(rowHeight, 36)}px`;
      }

      const grabStyle = document.createElement("style");
      grabStyle.textContent = "* { cursor: grabbing !important; }";
      document.head.appendChild(grabStyle);

      const scrollEl = tableAreaRef.current;

      const onMove = (ev: PointerEvent) => {
        if (ghost) {
          ghost.style.left = `${ev.clientX + 12}px`;
          ghost.style.top = `${ev.clientY - 12}px`;
        }
        if (!scrollEl) return;

        const cells = scrollEl.querySelectorAll<HTMLElement>("[data-bt-cell][data-row-key]");
        let closestIdx: number | null = null;
        let closestDist = Infinity;

        cells.forEach((cell) => {
          const rk = cell.dataset.rowKey;
          if (!rk) return;
          const rect = cell.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const dist = Math.abs(ev.clientY - midY);
          if (dist < closestDist) {
            closestDist = dist;
            const idxAttr = cell.dataset.rowIndex;
            if (idxAttr != null) closestIdx = Number(idxAttr);
          }
        });

        // Clear all drag-over indicators
        scrollEl.querySelectorAll<HTMLElement>("[data-row-drag-over]").forEach(
          (el) => el.removeAttribute("data-row-drag-over"),
        );

        if (closestIdx != null && closestIdx !== rowDragFromRef.current) {
          rowDragOverRef.current = closestIdx;
          scrollEl.querySelectorAll<HTMLElement>(
            `[data-bt-cell][data-row-index="${closestIdx}"]`,
          ).forEach((el) => el.setAttribute("data-row-drag-over", ""));
        } else {
          rowDragOverRef.current = null;
        }
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        grabStyle.remove();
        if (ghost) ghost.style.display = "none";

        if (scrollEl) {
          scrollEl.querySelectorAll<HTMLElement>("[data-row-drag-over]").forEach(
            (el) => el.removeAttribute("data-row-drag-over"),
          );
        }

        const from = rowDragFromRef.current;
        const to = rowDragOverRef.current;
        if (from != null && to != null && from !== to) {
          onRowReorderRef.current?.(from, to);
        }

        rowDragFromRef.current = null;
        rowDragOverRef.current = null;
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [],
  );

  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (columnKey === "__select__" || columnKey === "__expand__" || columnKey === "__drag__") return;

    const columnIndex = columnsWithDrag.findIndex(
      (col) => col.key === columnKey,
    );
    if (columnIndex === -1) return;
    if (columnsWithDrag[columnIndex].pinned) return;

    const column = columnsWithDrag[columnIndex];
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

  const handleAutoFitColumn = useCallback((columnKey: string) => {
    const scrollEl = tableAreaRef.current;
    if (!scrollEl) return;

    const col = columnsWithDrag.find((c) => c.key === columnKey);
    if (!col) return;

    const headerEl = scrollEl.querySelector<HTMLElement>(
      `[data-column-key="${columnKey}"] [data-bt-grip]`,
    )?.parentElement ??
      scrollEl.querySelector<HTMLElement>(`[data-column-key="${columnKey}"]`);

    let maxWidth = 0;

    if (headerEl) {
      const title = typeof col.title === "string" ? col.title : col.key;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const computedStyle = window.getComputedStyle(headerEl);
        ctx.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
        maxWidth = ctx.measureText(title).width + 60;
      }
    }

    const cells = scrollEl.querySelectorAll<HTMLElement>(
      `[data-bt-cell][data-column-key="${columnKey}"]`,
    );
    cells.forEach((cell) => {
      const inner = cell.querySelector<HTMLElement>("div > div");
      if (inner) {
        const scrollW = inner.scrollWidth;
        if (scrollW > maxWidth) maxWidth = scrollW;
      }
    });

    const finalWidth = Math.max(60, Math.min(Math.ceil(maxWidth) + 24, 800));

    manuallyResizedRef.current.add(columnKey);
    React.startTransition(() => {
      setColumnWidths((prev) => {
        const next = new Map(prev);
        next.set(columnKey, finalWidth);
        return next;
      });
    });
    onColumnResize?.(columnKey, finalWidth);
  }, [columnsWithDrag, onColumnResize]);

  const { leftPinned, unpinned, rightPinned } = useMemo(() => {
    const columnMap = new Map(columnsWithDrag.map((c) => [c.key, c]));
    const systemKeys = [
      ...(rowDragEnabled && onRowReorder ? ["__drag__"] : []),
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
  }, [columnOrder, columnsWithDrag, rowSelection, expandable, rowDragEnabled, onRowReorder]);

  const orderedColumns = useMemo(
    () => [...leftPinned, ...unpinned, ...rightPinned],
    [leftPinned, unpinned, rightPinned],
  );

  const freshOrderedColumns = useMemo(() => {
    const latestMap = new Map(initialColumnsRef.current.map((c) => [c.key, c]));
    return orderedColumns.map((col) => {
      if (col.key === "__select__" || col.key === "__expand__" || col.key === "__drag__") return col;
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
  const onMultiSortChangeRef = useRef(onMultiSortChange);
  onMultiSortChangeRef.current = onMultiSortChange;

  type SortEntry = { key: string; direction: SortDirection };
  const [sortState, setSortState] = useState<SortEntry[]>([]);

  const handleSort = useCallback(
    (columnKey: string, direction?: SortDirection, additive?: boolean) => {
      setSortState((prev) => {
        const existingIdx = prev.findIndex((s) => s.key === columnKey);
        const existing = existingIdx >= 0 ? prev[existingIdx] : null;

        let next: SortDirection;
        if (direction !== undefined) {
          next = existing?.direction === direction ? null : direction;
        } else {
          next = !existing
            ? "asc"
            : existing.direction === "asc"
              ? "desc"
              : existing.direction === "desc"
                ? null
                : "asc";
        }

        let result: SortEntry[];

        if (additive && multiSort) {
          result = prev.filter((s) => s.key !== columnKey);
          if (next) result.push({ key: columnKey, direction: next });
        } else {
          result = next ? [{ key: columnKey, direction: next }] : [];
        }

        onSortChangeRef.current?.(columnKey, next);
        if (multiSort) {
          onMultiSortChangeRef.current?.(
            result.map((s) => ({ columnKey: s.key, direction: s.direction })),
          );
        }
        return result;
      });
    },
    [multiSort],
  );

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );

  // Global search state
  const [internalGlobalSearch, setInternalGlobalSearch] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const addToSearchHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((t) => t !== term);
      return [term, ...filtered].slice(0, 10);
    });
  }, []);

  // ── Filter builder state ──
  type FilterBuilderRow = { id: number; column: string; operator: string; value: string };
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [filterBuilderRows, setFilterBuilderRows] = useState<FilterBuilderRow[]>([
    { id: 1, column: "", operator: "contains", value: "" },
  ]);
  const [filterBuilderLogic, setFilterBuilderLogic] = useState<"and" | "or">("and");
  const filterBuilderIdRef = useRef(2);

  const applyFilterBuilder = useCallback(() => {
    const activeRules = filterBuilderRows.filter((r) => r.column && r.value);
    if (activeRules.length === 0) return;

    const newFilters: Record<string, string> = {};
    for (const rule of activeRules) {
      newFilters[rule.column] = `${rule.operator}:${rule.value}`;
    }

    setColumnFilters((prev) => {
      const next = { ...prev, ...newFilters };
      onFilterChange?.(next);
      return next;
    });
    setShowFilterBuilder(false);
  }, [filterBuilderRows, onFilterChange]);

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
              const filterVal = columnFilters[key];
              if (col?.filterType === "dateRange" && filterVal.includes("..")) {
                const [from, to] = filterVal.split("..");
                const cellDate = String(row[col.dataIndex ?? key] ?? "");
                if (from && cellDate < from) return false;
                if (to && cellDate > to) return false;
                return true;
              }
              if (col?.filterType === "numberRange" && filterVal.includes("..")) {
                const [minS, maxS] = filterVal.split("..");
                const num = Number(row[col.dataIndex ?? key]);
                if (Number.isNaN(num)) return false;
                if (minS && num < Number(minS)) return false;
                if (maxS && num > Number(maxS)) return false;
                return true;
              }
              const opMatch = filterVal.match(/^(eq|neq|gt|gte|lt|lte|contains|startsWith|endsWith):(.*)$/);
              if (opMatch) {
                const op = opMatch[1];
                const opVal = opMatch[2];
                const cellRaw = row[col?.dataIndex ?? key];
                const cellStr = String(cellRaw ?? "").toLowerCase();
                const opValLower = opVal.toLowerCase();
                const numCell = Number(cellRaw);
                const numOp = Number(opVal);
                switch (op) {
                  case "eq": return cellStr === opValLower;
                  case "neq": return cellStr !== opValLower;
                  case "gt": return !Number.isNaN(numCell) && !Number.isNaN(numOp) && numCell > numOp;
                  case "gte": return !Number.isNaN(numCell) && !Number.isNaN(numOp) && numCell >= numOp;
                  case "lt": return !Number.isNaN(numCell) && !Number.isNaN(numOp) && numCell < numOp;
                  case "lte": return !Number.isNaN(numCell) && !Number.isNaN(numOp) && numCell <= numOp;
                  case "contains": return cellStr.includes(opValLower);
                  case "startsWith": return cellStr.startsWith(opValLower);
                  case "endsWith": return cellStr.endsWith(opValLower);
                  default: return true;
                }
              }
              const cellVal = String(row[key] ?? "").toLowerCase();
              return cellVal.includes(filterVal.toLowerCase());
            } catch {
              return true;
            }
          });
        });
      }
    }

    if (!onSortChangeRef.current && sortState.length > 0) {
      const activeSorts = sortState.filter((s) => s.key && s.direction);
      if (activeSorts.length > 0) {
        try {
          result = [...result].sort((a, b) => {
            if (a == null && b == null) return 0;
            if (a == null) return 1;
            if (b == null) return -1;
            for (const { key, direction } of activeSorts) {
              const dir = direction === "asc" ? 1 : -1;
              const col = columnsLookupRef.current.find((c) => c.key === key);
              let cmp = 0;
              if (typeof col?.sorter === "function") {
                cmp = col.sorter(a, b) * dir;
              } else {
                const aVal = (a as DataRecord)[key];
                const bVal = (b as DataRecord)[key];
                if (aVal == null && bVal != null) cmp = 1;
                else if (aVal != null && bVal == null) cmp = -1;
                else if (aVal != null && bVal != null) {
                  if (typeof aVal === "number" && typeof bVal === "number")
                    cmp = (aVal - bVal) * dir;
                  else cmp = String(aVal).localeCompare(String(bVal)) * dir;
                }
              }
              if (cmp !== 0) return cmp;
            }
            return 0;
          });
        } catch {
          // If sort comparator throws, return unsorted data
        }
      }
    }

    return result;
  }, [data, sortState, columnFilters, globalSearchValue, internalGlobalSearch]);

  // ── AI post-processing layer ───────────────────────────────────────────
  const aiProcessedData = useMemo(() => {
    let result = processedData;

    if (aiFilteredDataKeys) {
      result = result.filter((row, idx) => {
        if (row == null) return false;
        const k =
          typeof rowKey === "function"
            ? (rowKey as (r: T) => string)(row)
            : String(
                (row as DataRecord)[
                  typeof rowKey === "string" ? rowKey : "id"
                ] ?? idx,
              );
        return aiFilteredDataKeys.has(k);
      });
    }

    if (aiSortKey && aiSortDir) {
      const dir = aiSortDir === "asc" ? 1 : -1;
      const col = aiSortKey;
      result = [...result].sort((a, b) => {
        const aVal = (a as DataRecord)[col];
        const bVal = (b as DataRecord)[col];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === "number" && typeof bVal === "number")
          return (aVal - bVal) * dir;
        return String(aVal).localeCompare(String(bVal)) * dir;
      });
    }

    return result;
  }, [processedData, aiFilteredDataKeys, aiSortKey, aiSortDir, rowKey]);

  // ── Row grouping ─────────────────────────────────────────────────────────
  const [internalCollapsedGroups, setInternalCollapsedGroups] = useState<Set<string>>(() =>
    rowGrouping?.defaultCollapsed ? new Set(["__all_collapsed__"]) : new Set(),
  );

  const resolvedCollapsedGroups = rowGrouping?.collapsedGroups ?? internalCollapsedGroups;

  const toggleGroup = useCallback(
    (groupKey: string) => {
      const next = !resolvedCollapsedGroups.has(groupKey);
      if (rowGrouping?.onGroupToggle) {
        rowGrouping.onGroupToggle(groupKey, next);
      } else {
        setInternalCollapsedGroups((prev) => {
          const s = new Set(prev);
          s.delete("__all_collapsed__");
          if (next) s.add(groupKey);
          else s.delete(groupKey);
          return s;
        });
      }
    },
    [resolvedCollapsedGroups, rowGrouping],
  );

  const computeAggregate = useCallback(
    (values: unknown[], fn: import("./types").AggregateFunction): unknown => {
      if (typeof fn === "function") return fn(values);
      const nums = values.filter((v): v is number => typeof v === "number");
      switch (fn) {
        case "count": return values.length;
        case "sum": return nums.reduce((a, b) => a + b, 0);
        case "avg": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        case "min": return nums.length ? Math.min(...nums) : undefined;
        case "max": return nums.length ? Math.max(...nums) : undefined;
        default: return undefined;
      }
    },
    [],
  );

  const groupedData = useMemo(() => {
    if (!rowGrouping?.groupBy) return aiProcessedData;

    const groupByKey = rowGrouping.groupBy;
    const groups = new Map<string, T[]>();
    const groupOrder: string[] = [];

    for (const row of aiProcessedData) {
      if (row == null) continue;
      const gv = String((row as DataRecord)[groupByKey] ?? "");
      if (!groups.has(gv)) {
        groups.set(gv, []);
        groupOrder.push(gv);
      }
      groups.get(gv)!.push(row);
    }

    const allCollapsed = resolvedCollapsedGroups.has("__all_collapsed__") && rowGrouping.defaultCollapsed;

    const result: T[] = [];
    for (const gk of groupOrder) {
      const rows = groups.get(gk)!;
      const collapsed = allCollapsed || resolvedCollapsedGroups.has(gk);

      const aggregates: Record<string, unknown> = {};
      if (rowGrouping.aggregations) {
        for (const [colKey, fn] of Object.entries(rowGrouping.aggregations)) {
          const vals = rows.map((r) => (r as DataRecord)[colKey]);
          aggregates[colKey] = computeAggregate(vals, fn);
        }
      }

      const headerRow = {
        __bt_group_header__: true,
        __bt_group_key__: gk,
        __bt_group_value__: (rows[0] as DataRecord)?.[groupByKey],
        __bt_group_count__: rows.length,
        __bt_group_collapsed__: collapsed,
        __bt_group_aggregates__: aggregates,
        __bt_group_rows__: rows,
      } as unknown as T;

      result.push(headerRow);
      if (!collapsed) {
        result.push(...rows);
      }
    }
    return result;
  }, [aiProcessedData, rowGrouping, resolvedCollapsedGroups, computeAggregate]);

  // ── Tree data flattening ─────────────────────────────────────────────────
  const [internalTreeExpanded, setInternalTreeExpanded] = useState<Set<React.Key>>(() => {
    if (!treeData) return new Set();
    if (treeData.defaultExpandAll) return new Set(["__tree_expand_all__"]);
    return new Set(treeData.defaultExpandedKeys ?? []);
  });

  const resolvedTreeExpanded = useMemo(() => {
    if (treeData?.expandedKeys) return new Set(treeData.expandedKeys);
    return internalTreeExpanded;
  }, [treeData?.expandedKeys, internalTreeExpanded]);

  const toggleTreeNode = useCallback(
    (key: React.Key) => {
      const wasExpanded = resolvedTreeExpanded.has(key);
      if (treeData?.onExpandChange) {
        const next = wasExpanded
          ? [...resolvedTreeExpanded].filter((k) => k !== key && k !== "__tree_expand_all__")
          : [...resolvedTreeExpanded, key].filter((k) => k !== "__tree_expand_all__");
        treeData.onExpandChange(next as React.Key[]);
      } else {
        setInternalTreeExpanded((prev) => {
          const s = new Set(prev);
          s.delete("__tree_expand_all__");
          if (wasExpanded) s.delete(key);
          else s.add(key);
          return s;
        });
      }
    },
    [resolvedTreeExpanded, treeData],
  );

  const treeProcessedData = useMemo(() => {
    if (!treeData) return groupedData;

    const childrenKey = treeData.childrenKey ?? "children";
    const expandAll = resolvedTreeExpanded.has("__tree_expand_all__");
    const flat: T[] = [];

    const walk = (rows: T[], level: number) => {
      for (const row of rows) {
        if (row == null) continue;
        const rec = row as DataRecord;
        const children = rec[childrenKey] as T[] | undefined;
        const hasChildren = Array.isArray(children) && children.length > 0;

        const key = typeof rowKey === "function"
          ? (rowKey as (r: T) => string)(row)
          : String(rec[typeof rowKey === "string" ? rowKey : "id"] ?? flat.length);

        const isExpanded = expandAll || resolvedTreeExpanded.has(key);

        const annotated = {
          ...rec,
          __bt_tree_level__: level,
          __bt_tree_has_children__: hasChildren,
          __bt_tree_expanded__: isExpanded,
          __bt_tree_key__: key,
        } as unknown as T;

        flat.push(annotated);

        if (hasChildren && isExpanded) {
          walk(children, level + 1);
        }
      }
    };

    walk(groupedData, 0);
    return flat;
  }, [groupedData, treeData, resolvedTreeExpanded, rowKey]);

  const getAIRowStyleForRecord = useCallback(
    (record: T): React.CSSProperties | undefined => {
      if (aiStyleOps.length === 0) return undefined;
      return getAIRowStyle(record as DataRecord, aiStyleOps);
    },
    [aiStyleOps],
  );

  const getAICellStyleForRecord = useCallback(
    (record: T, columnKey: string): React.CSSProperties | undefined => {
      if (aiCellStyleOps.length === 0) return undefined;
      return getAICellStyle(record as DataRecord, columnKey, aiCellStyleOps);
    },
    [aiCellStyleOps],
  );

  // ── Conditional formatting helpers ───────────────────────────────────────
  const cfRowRules = useMemo(
    () => (conditionalFormatting ?? []).filter((r) => r.applyToRow),
    [conditionalFormatting],
  );
  const cfCellRules = useMemo(
    () => (conditionalFormatting ?? []).filter((r) => !r.applyToRow),
    [conditionalFormatting],
  );

  const getCFRowStyle = useCallback(
    (record: T): React.CSSProperties | undefined => {
      if (cfRowRules.length === 0) return undefined;
      let merged: React.CSSProperties | undefined;
      for (const rule of cfRowRules) {
        try {
          if (rule.condition(undefined, record, "")) {
            merged = merged ? { ...merged, ...rule.style } : { ...rule.style };
          }
        } catch { /* skip bad rule */ }
      }
      return merged;
    },
    [cfRowRules],
  );

  const getCFRowClassName = useCallback(
    (record: T): string => {
      if (cfRowRules.length === 0) return "";
      const classes: string[] = [];
      for (const rule of cfRowRules) {
        try {
          if (rule.className && rule.condition(undefined, record, "")) {
            classes.push(rule.className);
          }
        } catch { /* skip bad rule */ }
      }
      return classes.join(" ");
    },
    [cfRowRules],
  );

  const getCFCellStyle = useCallback(
    (record: T, columnKey: string): React.CSSProperties | undefined => {
      if (cfCellRules.length === 0) return undefined;
      let merged: React.CSSProperties | undefined;
      for (const rule of cfCellRules) {
        if (rule.columns && rule.columns.length > 0 && !rule.columns.includes(columnKey)) continue;
        try {
          const value = (record as DataRecord)[columnKey];
          if (rule.condition(value, record, columnKey)) {
            merged = merged ? { ...merged, ...rule.style } : { ...rule.style };
          }
        } catch { /* skip bad rule */ }
      }
      return merged;
    },
    [cfCellRules],
  );

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
          unpinnedProcessedData: treeProcessedData,
        };
      }

      const topKeySet = new Set((resolvedRowPinning.top ?? []).map(String));
      const bottomKeySet = new Set(
        (resolvedRowPinning.bottom ?? []).map(String),
      );

      const topMap = new Map<string, T>();
      const bottomMap = new Map<string, T>();
      const rest: T[] = [];

      treeProcessedData.forEach((row, idx) => {
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
      treeProcessedData,
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
  const showShimmer = isLoading && treeProcessedData.length === 0;
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
      if (col.key === "__select__" || col.key === "__expand__" || col.key === "__drag__") return true;
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

  React.useEffect(() => {
    if (!focusedCell) return;
    const el = tableAreaRef.current;
    if (!el) return;
    const cell = el.querySelector<HTMLElement>(
      `[data-bt-focused]`,
    );
    cell?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [focusedCell]);

  return (
    <>
      <div
        ref={wrapperRef}
        className={`${className ?? ""} ${classNames.wrapper ?? ""}`}
        style={{
          display: "flex",
          width: "100%",
          flexDirection: "column",
          fontSize: "inherit",
          fontWeight: 400,
          color: bt.color,
          background: bt.bg,
          colorScheme: isDark ? "dark" : "light",
          position: "relative",
          ...(autoHeight ? { maxHeight: "100%" } : { height: "100%" }),
          ...styles.wrapper,
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
          :where([data-bt-pinned]:not([data-bt-header])) {
            background-color: ${styles.pinnedBg ?? "rgba(128,128,128,0.06)"};
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
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
          [data-bt-ctx-item] {
            transition: background-color 0.15s ease;
          }
          [data-bt-ctx-item]:not(:disabled):hover {
            background-color: rgba(128, 128, 128, 0.15) !important;
          }
          [data-bt-header][data-dragging] {
            opacity: 0.2 !important;
          }
          [data-bt-header][data-drag-over] {
            border: 1px dashed ${accentColor} !important;
          }
          ${onRowClick || masterDetail ? "[data-bt-cell] { cursor: pointer; }" : ""}
          [data-row-drag-over] {
            box-shadow: 0 -2px 0 0 ${accentColor} inset;
          }
          [data-bt-row-grip] {
            cursor: grab;
            opacity: 0.3;
            transition: opacity 0.15s;
          }
          [data-bt-row-grip]:hover {
            opacity: 0.8;
          }
          @keyframes bt-drawer-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes bt-spin { to { transform: rotate(360deg); } }
          @keyframes bt-ai-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          [data-bt-focused] {
            outline: 2px solid ${accentColor};
            outline-offset: -2px;
            z-index: 12 !important;
          }
          [data-bt-check] {
            appearance: none;
            -webkit-appearance: none;
            width: 15px;
            height: 15px;
            border: 1.5px solid rgba(128,128,128,0.4);
            border-radius: 3px;
            background: transparent;
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
            margin: 0;
            vertical-align: middle;
          }
          [data-bt-check]:checked {
            background: ${accentColor};
            border-color: ${accentColor};
          }
          [data-bt-check]:checked::after {
            content: '';
            position: absolute;
            left: 4px;
            top: 1px;
            width: 5px;
            height: 9px;
            border: solid #fff;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }
          [data-bt-check]:indeterminate {
            background: ${accentColor};
            border-color: ${accentColor};
          }
          [data-bt-check]:indeterminate::after {
            content: '';
            position: absolute;
            left: 2px;
            top: 6px;
            width: 9px;
            height: 0;
            border: solid #fff;
            border-width: 0 0 2px 0;
          }
          [data-bt-check]:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
        `}</style>
        <style>{`
          [data-bt-scroll]::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          [data-bt-scroll]::-webkit-scrollbar-track {
            background: transparent;
          }
          [data-bt-scroll]::-webkit-scrollbar-thumb {
            background: rgba(128,128,128,0.3);
            border-radius: 3px;
          }
          [data-bt-scroll]::-webkit-scrollbar-thumb:hover {
            background: rgba(128,128,128,0.5);
          }
          [data-bt-scroll]::-webkit-scrollbar-corner {
            background: transparent;
          }
          [data-bt-scroll] {
            scrollbar-width: thin;
            scrollbar-color: rgba(128,128,128,0.3) transparent;
          }
        `}</style>

        {/* Toolbar: Global Search + Column Picker + AI */}
        {(!hideGlobalSearch || showColumnSettings || aiMode) && (
          <div
            className={classNames.toolbar ?? ""}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderBottom: "1px solid rgba(128,128,128,0.2)",
              fontSize: "inherit",
              flexShrink: 0,
              zIndex: 20,
              ...styles.toolbar,
            }}
          >
            {/* ── Normal toolbar items ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: "1 1 0%",
                opacity: effectiveAiBarOpen ? 0 : 1,
                transform: effectiveAiBarOpen ? "scale(0.97)" : "scale(1)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
                pointerEvents: effectiveAiBarOpen ? "none" : "auto",
                minWidth: 0,
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
                    style={{
                      display: "flex",
                      color: "GrayText",
                      flexShrink: 0,
                    }}
                  >
                    {icons?.search ?? (
                      <SearchIcon style={{ width: 14, height: 14 }} />
                    )}
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search all columns..."
                    value={globalSearchValue ?? internalGlobalSearch}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (onGlobalSearchChange) onGlobalSearchChange(v);
                      else setInternalGlobalSearch(v);
                    }}
                    onFocus={() => {
                      if (searchHistory.length > 0) setShowSearchHistory(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSearchHistory(false), 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToSearchHistory((globalSearchValue ?? internalGlobalSearch) || "");
                        setShowSearchHistory(false);
                      }
                    }}
                    className={classNames.searchInput ?? ""}
                    style={{
                      flex: "1 1 0%",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      font: "inherit",
                      color: "inherit",
                      padding: "4px 6px",
                      minWidth: 0,
                      ...styles.searchInput,
                    }}
                  />
                  {showSearchHistory && searchHistory.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 99999,
                        borderRadius: 6,
                        border: "1px solid rgba(128,128,128,0.2)",
                        boxShadow: bt.menuShadow,
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        backgroundColor: bt.menuBg,
                        padding: "4px 0",
                        marginTop: 2,
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
                      <div style={{ padding: "4px 10px", fontSize: "0.75em", opacity: 0.5, fontWeight: 600 }}>Recent</div>
                      {searchHistory.map((term, i) => (
                        <button
                          key={i}
                          type="button"
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "5px 10px",
                            fontSize: "inherit",
                            color: "inherit",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(128,128,128,0.15)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (onGlobalSearchChange) onGlobalSearchChange(term);
                            else setInternalGlobalSearch(term);
                            setShowSearchHistory(false);
                          }}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  )}
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
                      fontSize: "inherit",
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
                        boxShadow: bt.menuShadow,
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        backgroundColor: bt.menuBg,
                        padding: "4px 0",
                        marginTop: 4,
                      }}
                    >
                      {initialColumns
                        .filter(
                          (c) =>
                            c.key !== "__select__" && c.key !== "__expand__" && c.key !== "__drag__",
                        )
                        .map((col) => {
                          const current = columns.find(
                            (c) => c.key === col.key,
                          );
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
                                fontSize: "inherit",
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
                                  cursor: isPinned
                                    ? "not-allowed"
                                    : "pointer",
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
              {/* ── Filter builder toggle ── */}
              {enableFilterBuilder && (
                <button
                  type="button"
                  onClick={() => setShowFilterBuilder((p) => !p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    background: showFilterBuilder ? `${accentColor}15` : "none",
                    border: `1px solid ${showFilterBuilder ? accentColor + "40" : "rgba(128,128,128,0.2)"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    padding: "4px 6px",
                    color: showFilterBuilder ? accentColor : "inherit",
                    flexShrink: 0,
                    fontSize: "inherit",
                  }}
                  title="Advanced filter builder"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  <span>Filters</span>
                </button>
              )}
              {/* ── Saved AI Filters dropdown (in normal toolbar, not when aiOnlyToolbar) ── */}
              {aiMode && !aiOnlyToolbar && savedAIFilters.length > 0 && (
                <div ref={savedFiltersRef} style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowSavedFilters((p) => !p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "none",
                      border: "1px solid rgba(128,128,128,0.2)",
                      borderRadius: 4,
                      cursor: "pointer",
                      padding: "4px 6px",
                      color: "inherit",
                      fontSize: "inherit",
                    }}
                    title="Saved AI filters"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    <span>{savedAIFilters.length}</span>
                  </button>
                  {showSavedFilters && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        zIndex: 99999,
                        minWidth: 240,
                        maxWidth: 360,
                        maxHeight: 320,
                        overflowY: "auto",
                        borderRadius: 8,
                        border: "1px solid rgba(128,128,128,0.2)",
                        boxShadow: bt.menuShadow,
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        backgroundColor: bt.menuBg,
                        padding: "4px 0",
                        marginTop: 4,
                      }}
                    >
                      <div style={{ padding: "6px 12px", fontSize: "0.85em", opacity: 0.5, fontWeight: 600 }}>
                        Saved Filters
                      </div>
                      {savedAIFilters.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: "inherit",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(128,128,128,0.15)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                        >
                          <span
                            style={{ flex: "1 1 0%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            onClick={() => applySavedFilter(f)}
                          >
                            {f.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeSavedFilter(i); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                              color: "GrayText",
                              flexShrink: 0,
                            }}
                            title="Remove"
                          >
                            {icons?.close ?? <XIcon style={{ width: 10, height: 10 }} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* ── Ask AI button ── */}
              {aiMode && (
                <button
                  type="button"
                  onClick={() => setAiBarOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
                    border: `1px solid ${accentColor}40`,
                    borderRadius: 4,
                    cursor: "pointer",
                    padding: "4px 8px",
                    color: accentColor,
                    fontSize: "inherit",
                    fontWeight: 500,
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                  }}
                  title="Ask AI"
                >
                  {icons?.sparkles ?? (
                    <SparklesIcon style={{ width: 14, height: 14 }} />
                  )}
                  <span>{aiButtonLabel ?? "Ask AI"}</span>
                </button>
              )}
              {aiMode && (aiConfig || onAIInsights) && (
                <button
                  type="button"
                  onClick={handleAIInsights}
                  disabled={aiInsightsLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "1px solid rgba(128,128,128,0.2)",
                    borderRadius: 4,
                    cursor: aiInsightsLoading ? "wait" : "pointer",
                    padding: "4px 8px",
                    color: "inherit",
                    fontSize: "inherit",
                    flexShrink: 0,
                    opacity: aiInsightsLoading ? 0.6 : 1,
                  }}
                  title="AI Data Insights"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
                  <span>{aiInsightsLoading ? "Analyzing..." : "Insights"}</span>
                </button>
              )}
              {aiMode && (aiConfig || onAIChart) && (
                <button
                  type="button"
                  onClick={handleAIChart}
                  disabled={aiChartLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "1px solid rgba(128,128,128,0.2)",
                    borderRadius: 4,
                    cursor: aiChartLoading ? "wait" : "pointer",
                    padding: "4px 8px",
                    color: "inherit",
                    fontSize: "inherit",
                    flexShrink: 0,
                    opacity: aiChartLoading ? 0.6 : 1,
                  }}
                  title="AI Chart"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                  <span>{aiChartLoading ? "Generating..." : "Chart"}</span>
                </button>
              )}
              {toolbarRight}
            </div>

            {/* ── AI search bar overlay ── */}
            {aiMode && (
              <div
                className={classNames.aiBar ?? ""}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 8px",
                  opacity: effectiveAiBarOpen ? 1 : 0,
                  transform: effectiveAiBarOpen
                    ? "translateX(0)"
                    : "translateX(40px)",
                  transition:
                    "opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)",
                  pointerEvents: effectiveAiBarOpen ? "auto" : "none",
                  zIndex: 2,
                  background: "inherit",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  ...styles.aiBar,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    color: accentColor,
                    flexShrink: 0,
                  }}
                >
                  {icons?.sparkles ?? (
                    <SparklesIcon style={{ width: 16, height: 16 }} />
                  )}
                </span>
                <input
                  ref={aiInputRef}
                  type="text"
                  placeholder={aiPlaceholder}
                  value={aiQuery}
                  onChange={(e) => {
                    setAiQuery(e.target.value);
                    setShowAiSuggestions(!!e.target.value.trim());
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !aiLoading) { handleAISubmit(); setShowAiSuggestions(false); }
                    if (e.key === "Escape" && !aiOnlyToolbar) handleAIBarClose();
                    if (e.key === "Escape") setShowAiSuggestions(false);
                  }}
                  onFocus={() => { if (aiQuery.trim() || !aiQuery) setShowAiSuggestions(true); }}
                  onBlur={() => { setTimeout(() => setShowAiSuggestions(false), 150); }}
                  disabled={aiLoading}
                  style={{
                    flex: "1 1 0%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    font: "inherit",
                    color: "inherit",
                    padding: "4px 6px",
                    minWidth: 0,
                    fontSize: "inherit",
                  }}
                />
                {showAiSuggestions && aiSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 99999,
                      borderRadius: 6,
                      border: "1px solid rgba(128,128,128,0.2)",
                      boxShadow: bt.menuShadow,
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      backgroundColor: bt.menuBg,
                      padding: "4px 0",
                      marginTop: 4,
                      maxHeight: 180,
                      overflowY: "auto",
                    }}
                  >
                    <div style={{ padding: "4px 10px", fontSize: "0.75em", opacity: 0.5, fontWeight: 600 }}>Suggestions</div>
                    {aiSuggestions
                      .filter((s) => !aiQuery.trim() || s.toLowerCase().includes(aiQuery.toLowerCase()))
                      .slice(0, 6)
                      .map((suggestion, i) => (
                        <button
                          key={i}
                          type="button"
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "5px 10px",
                            fontSize: "0.85em",
                            color: "inherit",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(128,128,128,0.15)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setAiQuery(suggestion);
                            setShowAiSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                  </div>
                )}
                {/* Saved AI Filters (inline in AI bar when aiOnlyToolbar) */}
                {aiOnlyToolbar && savedAIFilters.length > 0 && (
                  <div ref={savedFiltersRef} style={{ position: "relative", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setShowSavedFilters((p) => !p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "1px solid rgba(128,128,128,0.2)",
                        borderRadius: 4,
                        cursor: "pointer",
                        padding: "4px 6px",
                        color: "inherit",
                        fontSize: "inherit",
                      }}
                      title="Saved AI filters"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                      <span>{savedAIFilters.length}</span>
                    </button>
                    {showSavedFilters && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          zIndex: 99999,
                          minWidth: 240,
                          maxWidth: 360,
                          maxHeight: 320,
                          overflowY: "auto",
                          borderRadius: 8,
                          border: "1px solid rgba(128,128,128,0.2)",
                          boxShadow: bt.menuShadow,
                          backdropFilter: "blur(16px)",
                          WebkitBackdropFilter: "blur(16px)",
                          backgroundColor: bt.menuBg,
                          padding: "4px 0",
                          marginTop: 4,
                        }}
                      >
                        <div style={{ padding: "6px 12px", fontSize: "0.85em", opacity: 0.5, fontWeight: 600 }}>
                          Saved Filters
                        </div>
                        {savedAIFilters.map((f, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontSize: "inherit",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(128,128,128,0.15)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                          >
                            <span
                              style={{ flex: "1 1 0%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              onClick={() => applySavedFilter(f)}
                            >
                              {f.label}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeSavedFilter(i); }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "GrayText",
                                flexShrink: 0,
                              }}
                              title="Remove"
                            >
                              {icons?.close ?? <XIcon style={{ width: 10, height: 10 }} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Send / Loading button */}
                <button
                  type="button"
                  onClick={handleAISubmit}
                  disabled={aiLoading || !aiQuery.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: aiQuery.trim()
                      ? accentColor
                      : "rgba(128,128,128,0.15)",
                    border: "none",
                    borderRadius: 4,
                    cursor:
                      aiLoading || !aiQuery.trim()
                        ? "not-allowed"
                        : "pointer",
                    padding: "4px 8px",
                    color: aiQuery.trim() ? "#fff" : "GrayText",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                    gap: 4,
                    fontSize: "inherit",
                    opacity: aiLoading ? 0.7 : 1,
                  }}
                  title="Send"
                >
                  {aiLoading ? (
                    <>
                      {icons?.loader ?? (
                        <LoaderIcon
                          style={{
                            width: 14,
                            height: 14,
                            animation: "bt-spin 1s linear infinite",
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {icons?.send ?? (
                        <SendIcon style={{ width: 14, height: 14 }} />
                      )}
                    </>
                  )}
                </button>
                {/* Close AI bar (hidden when AI is the only toolbar item) */}
                {!aiOnlyToolbar && (
                  <button
                    type="button"
                    onClick={handleAIBarClose}
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
                    title="Close AI"
                  >
                    {icons?.close ?? (
                      <XIcon style={{ width: 14, height: 14 }} />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Filter builder drawer (inside table) ── */}
        {showFilterBuilder && (
          <div
            className={classNames.filterDrawer ?? ""}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 340,
              maxWidth: "80%",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              background: isDark ? "rgba(20,20,20,0.75)" : "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderLeft: "1px solid rgba(128,128,128,0.15)",
              boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
              animation: "bt-drawer-in 0.2s ease",
              color: "inherit",
              ...styles.filterDrawer,
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: "1px solid rgba(128,128,128,0.15)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                <span style={{ fontWeight: 600 }}>Filter Builder</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterBuilder(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "GrayText",
                  padding: 2,
                }}
              >
                {icons?.close ?? <XIcon style={{ width: 14, height: 14 }} />}
              </button>
            </div>

            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(128,128,128,0.1)",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: "0.85em", color: "GrayText", marginBottom: 6 }}>Logic</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["and", "or"] as const).map((logic) => (
                  <button
                    key={logic}
                    type="button"
                    onClick={() => setFilterBuilderLogic(logic)}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      borderRadius: 5,
                      border: `1.5px solid ${filterBuilderLogic === logic ? accentColor : "rgba(128,128,128,0.2)"}`,
                      background: filterBuilderLogic === logic ? `${accentColor}15` : "transparent",
                      color: filterBuilderLogic === logic ? accentColor : "inherit",
                      cursor: "pointer",
                      fontSize: "inherit",
                      fontWeight: 500,
                    }}
                  >
                    {logic === "and" ? "Match ALL" : "Match ANY"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              flex: "1 1 0%",
              overflowY: "auto",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              {filterBuilderRows.map((row, ri) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid rgba(128,128,128,0.15)",
                    background: "rgba(128,128,128,0.04)",
                    position: "relative",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    <span style={{ fontSize: "0.75em", color: "GrayText", fontWeight: 500 }}>#{ri + 1}</span>
                    <button
                      type="button"
                      onClick={() => setFilterBuilderRows((p) => p.length > 1 ? p.filter((r) => r.id !== row.id) : p)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: filterBuilderRows.length > 1 ? "pointer" : "not-allowed",
                        color: filterBuilderRows.length > 1 ? "#ef4444" : "GrayText",
                        fontSize: "inherit",
                        padding: "0 2px",
                        lineHeight: 1,
                        opacity: filterBuilderRows.length > 1 ? 1 : 0.4,
                      }}
                      title="Remove condition"
                    >
                      ×
                    </button>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.85em", color: "GrayText", marginBottom: 3 }}>Column</div>
                    <select
                      value={row.column}
                      onChange={(e) => setFilterBuilderRows((p) => p.map((r) => r.id === row.id ? { ...r, column: e.target.value } : r))}
                      style={{
                        width: "100%",
                        fontSize: "inherit",
                        border: "1px solid rgba(128,128,128,0.2)",
                        borderRadius: 5,
                        padding: "5px 8px",
                        background: "transparent",
                        color: "inherit",
                        outline: "none",
                      }}
                    >
                      <option value="">Select column...</option>
                      {orderedColumns.filter((c) => !c.key.startsWith("__")).map((c) => (
                        <option key={c.key} value={c.key}>{typeof c.title === "string" ? c.title : c.key}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.85em", color: "GrayText", marginBottom: 3 }}>Operator</div>
                    <select
                      value={row.operator}
                      onChange={(e) => setFilterBuilderRows((p) => p.map((r) => r.id === row.id ? { ...r, operator: e.target.value } : r))}
                      style={{
                        width: "100%",
                        fontSize: "inherit",
                        border: "1px solid rgba(128,128,128,0.2)",
                        borderRadius: 5,
                        padding: "5px 8px",
                        background: "transparent",
                        color: "inherit",
                        outline: "none",
                      }}
                    >
                      <option value="contains">Contains</option>
                      <option value="eq">Equals</option>
                      <option value="neq">Not equals</option>
                      <option value="gt">Greater than</option>
                      <option value="gte">Greater or equal</option>
                      <option value="lt">Less than</option>
                      <option value="lte">Less or equal</option>
                      <option value="startsWith">Starts with</option>
                      <option value="endsWith">Ends with</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.85em", color: "GrayText", marginBottom: 3 }}>Value</div>
                    <input
                      type="text"
                      value={row.value}
                      placeholder="Enter value..."
                      onChange={(e) => setFilterBuilderRows((p) => p.map((r) => r.id === row.id ? { ...r, value: e.target.value } : r))}
                      style={{
                        width: "100%",
                        fontSize: "inherit",
                        border: "1px solid rgba(128,128,128,0.2)",
                        borderRadius: 5,
                        padding: "5px 8px",
                        outline: "none",
                        background: "transparent",
                        color: "inherit",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = accentColor; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(128,128,128,0.2)"; }}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFilterBuilderRows((p) => [...p, { id: filterBuilderIdRef.current++, column: "", operator: "contains", value: "" }]);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "none",
                  border: "1px dashed rgba(128,128,128,0.25)",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: accentColor,
                  fontSize: "inherit",
                  padding: "8px 0",
                  fontWeight: 500,
                }}
              >
                + Add condition
              </button>
            </div>

            <div style={{
              padding: "10px 14px",
              borderTop: "1px solid rgba(128,128,128,0.15)",
              display: "flex",
              gap: 8,
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={() => {
                  setColumnFilters({});
                  onFilterChange?.({});
                  setFilterBuilderRows([{ id: filterBuilderIdRef.current++, column: "", operator: "contains", value: "" }]);
                }}
                style={{
                  flex: 1,
                  fontSize: "inherit",
                  background: "none",
                  border: "1px solid rgba(128,128,128,0.2)",
                  borderRadius: 5,
                  padding: "6px 0",
                  cursor: "pointer",
                  color: "inherit",
                  fontWeight: 500,
                }}
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => {
                  applyFilterBuilder();
                  setShowFilterBuilder(false);
                }}
                style={{
                  flex: 1,
                  fontSize: "inherit",
                  background: accentColor,
                  border: "none",
                  borderRadius: 5,
                  padding: "6px 0",
                  cursor: "pointer",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* ── AI insights panel ── */}
        {aiInsights && (
          <div
            style={{
              borderBottom: "1px solid rgba(128,128,128,0.2)",
              padding: "10px 12px",
              fontSize: "inherit",
              lineHeight: 1.6,
              background: `linear-gradient(90deg, ${accentColor}06, transparent)`,
              flexShrink: 0,
              maxHeight: 200,
              overflowY: "auto",
              position: "relative",
              whiteSpace: "pre-wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setAiInsights(null)}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "GrayText",
                padding: 2,
                display: "flex",
              }}
            >
              {icons?.close ?? <XIcon style={{ width: 12, height: 12 }} />}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontWeight: 600, fontSize: "0.85em", color: accentColor }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
              AI Insights
            </div>
            {aiInsights}
          </div>
        )}

        {/* ── AI chart panel ── */}
        {aiChart && (
          <div
            style={{
              borderBottom: "1px solid rgba(128,128,128,0.2)",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setAiChart(null)}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "GrayText",
                padding: 2,
                display: "flex",
                zIndex: 1,
              }}
            >
              {icons?.close ?? <XIcon style={{ width: 12, height: 12 }} />}
            </button>
            {aiChart}
          </div>
        )}

        {/* ── AI result banner ── */}
        {aiResult && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              fontSize: "inherit",
              borderBottom: "1px solid rgba(128,128,128,0.2)",
              background: `linear-gradient(90deg, ${accentColor}08, transparent)`,
              flexShrink: 0,
            }}
          >
            <span style={{ color: accentColor, display: "flex", flexShrink: 0 }}>
              {icons?.sparkles ?? (
                <SparklesIcon style={{ width: 14, height: 14 }} />
              )}
            </span>
            <span style={{ flex: "1 1 0%", opacity: 0.85 }}>
              {aiResult.message}
            </span>
            <button
              type="button"
              onClick={saveCurrentAIFilter}
              disabled={justSavedFilter}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: justSavedFilter ? `${accentColor}25` : `${accentColor}12`,
                border: `1px solid ${justSavedFilter ? accentColor : `${accentColor}30`}`,
                borderRadius: 4,
                cursor: justSavedFilter ? "default" : "pointer",
                padding: "2px 8px",
                color: accentColor,
                fontSize: "0.85em",
                flexShrink: 0,
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              title={justSavedFilter ? "Filter saved!" : "Save this filter for quick access later"}
            >
              {justSavedFilter ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              )}
              <span>{justSavedFilter ? "Saved" : "Save Filter"}</span>
            </button>
            <button
              type="button"
              onClick={handleAIClear}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "1px solid rgba(128,128,128,0.2)",
                borderRadius: 4,
                cursor: "pointer",
                padding: "2px 8px",
                color: "inherit",
                fontSize: "0.85em",
                flexShrink: 0,
                opacity: 0.7,
              }}
              title="Clear AI results"
            >
              {icons?.close ?? (
                <XIcon style={{ width: 10, height: 10 }} />
              )}
              <span>Clear</span>
            </button>
          </div>
        )}

        {/* ── AI error banner ── */}
        {aiError && !aiResult && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              fontSize: "inherit",
              borderBottom: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.06)",
              color: "#ef4444",
              flexShrink: 0,
            }}
          >
            <span style={{ flex: "1 1 0%" }}>{aiError}</span>
            <button
              type="button"
              onClick={() => setAiError(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                color: "#ef4444",
                flexShrink: 0,
              }}
            >
              {icons?.close ?? (
                <XIcon style={{ width: 12, height: 12 }} />
              )}
            </button>
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
              data-bt-scroll=""
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
                    column.key === "__select__" || column.key === "__expand__" || column.key === "__drag__";
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
                        WebkitBackdropFilter: "blur(8px)",
                        position: "sticky",
                        top: 0,
                        zIndex: isPinned ? 13 : 10,
                        paddingLeft: isSystem ? 0 : 8,
                        paddingRight: isSystem ? 0 : 8,
                        ...(isPinned
                          ? {
                              [column.pinned as string]: offset ?? 0,
                              ...styles.pinnedHeader,
                            }
                          : styles.header),
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
                          column.key === "__expand__" ||
                          column.key === "__drag__";
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
                              paddingLeft: isSystem ? 0 : 8,
                              paddingRight: isSystem ? 0 : 8,
                              justifyContent: isSystem ? "center" : undefined,
                              ...(isPinned
                                ? {
                                    position: "sticky" as const,
                                    [column.pinned as string]: offset ?? 0,
                                    zIndex: 5,
                                    ...styles.pinnedCell,
                                  }
                                : {}),
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
              tabIndex={0}
              data-bt-scroll=""
              style={{
                position: "absolute",
                inset: 0,
                overflow: "auto",
                contain: "layout paint",
                outline: "none",
              }}
              onKeyDown={(e) => {
                const maxRow = treeProcessedData.length - 1;
                const maxCol = orderedColumns.length - 1;
                if (maxRow < 0 || maxCol < 0) return;

                const nav = (dr: number, dc: number) => {
                  e.preventDefault();
                  setFocusedCell((prev) => {
                    const r = Math.max(0, Math.min(maxRow, (prev?.row ?? 0) + dr));
                    const c = Math.max(0, Math.min(maxCol, (prev?.col ?? 0) + dc));
                    return { row: r, col: c };
                  });
                };

                switch (e.key) {
                  case "ArrowDown": nav(1, 0); break;
                  case "ArrowUp": nav(-1, 0); break;
                  case "ArrowRight": nav(0, 1); break;
                  case "ArrowLeft": nav(0, -1); break;
                  case "Home":
                    e.preventDefault();
                    setFocusedCell((prev) => ({ row: prev?.row ?? 0, col: e.ctrlKey ? 0 : 0 }));
                    break;
                  case "End":
                    e.preventDefault();
                    setFocusedCell((prev) => ({ row: prev?.row ?? 0, col: maxCol }));
                    break;
                  case "Tab":
                    if (focusedCell) {
                      e.preventDefault();
                      const dc = e.shiftKey ? -1 : 1;
                      setFocusedCell((prev) => {
                        if (!prev) return { row: 0, col: 0 };
                        let c = prev.col + dc;
                        let r = prev.row;
                        if (c > maxCol) { c = 0; r = Math.min(r + 1, maxRow); }
                        else if (c < 0) { c = maxCol; r = Math.max(r - 1, 0); }
                        return { row: r, col: c };
                      });
                    }
                    break;
                  case "Escape":
                    setFocusedCell(null);
                    break;
                }
              }}
              onFocus={() => {
                if (!focusedCell) setFocusedCell({ row: 0, col: 0 });
              }}
              onBlur={() => setFocusedCell(null)}
            >
              <ResizeOverlay ref={resizeOverlayRef} accentColor={accentColor} />

              <div
                role="grid"
                aria-rowcount={data.length}
                aria-colcount={orderedColumns.length}
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
                  onRowClick || masterDetail
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
                        const findAndHandle = (row: T, i: number) => {
                          onRowClick?.(row, i, e);
                          if (masterDetail) setMasterDetailRecord(row);
                        };
                        for (let i = 0; i < (displayData as T[]).length; i++) {
                          const row = displayData[i] as T;
                          if (row == null) continue;
                          if (getSafeRowKey(row, i) === rk) {
                            findAndHandle(row, i);
                            return;
                          }
                        }
                        for (let i = 0; i < pinnedTopRows.length; i++) {
                          if (pinnedTopRows[i] == null) continue;
                          if (getSafeRowKey(pinnedTopRows[i], i) === rk) {
                            findAndHandle(pinnedTopRows[i], i);
                            return;
                          }
                        }
                        for (let i = 0; i < pinnedBottomRows.length; i++) {
                          if (pinnedBottomRows[i] == null) continue;
                          if (getSafeRowKey(pinnedBottomRows[i], i) === rk) {
                            findAndHandle(pinnedBottomRows[i], i);
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
                          fontWeight: 500,
                          userSelect: "none",
                          borderTop: "none",
                          borderLeft: "none",
                          borderBottom: "1px solid rgba(128,128,128,0.2)",
                          borderRight: groupEndsAtLastCol
                            ? "none"
                            : "1px solid rgba(128,128,128,0.2)",
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
                    (c) => c.key !== "__select__" && c.key !== "__expand__" && c.key !== "__drag__",
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
                            position: "sticky",
                            left: columnOffsets.get("__select__") ?? 0,
                            top: 0,
                            zIndex: 13,
                            width: "48px",
                            gridRow: leafGridRow,
                            borderTop: "none",
                            borderLeft: "none",
                            borderBottom: "1px solid rgba(128,128,128,0.2)",
                            borderRight: "1px solid rgba(128,128,128,0.2)",
                            ...styles.header,
                            ...styles.pinnedHeader,
                          }}
                        >
                          {rowSelection.type !== "radio" &&
                            !rowSelection.hideSelectAll && (
                              <input
                                data-bt-check=""
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
                              />
                            )}
                        </div>
                      );
                    }

                    if (column.key === "__drag__") {
                      return (
                        <div
                          key="__drag__"
                          data-bt-header=""
                          data-bt-pinned=""
                          className={`${classNames.header ?? ""} ${classNames.pinnedHeader ?? ""}`}
                          style={{
                            display: "flex",
                            height: leafHeight,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            whiteSpace: "nowrap" as const,
                            boxSizing: "border-box",
                            position: "sticky",
                            left: columnOffsets.get("__drag__") ?? 0,
                            top: 0,
                            zIndex: 13,
                            width: "36px",
                            gridRow: leafGridRow,
                            borderTop: "none",
                            borderLeft: "none",
                            borderBottom: "1px solid rgba(128,128,128,0.2)",
                            borderRight: "1px solid rgba(128,128,128,0.2)",
                            ...styles.header,
                            ...styles.pinnedHeader,
                          }}
                        >
                          <GripVerticalIcon style={{ width: 12, height: 12, opacity: 0.4 }} />
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
                            position: "sticky",
                            left: columnOffsets.get("__expand__") ?? 0,
                            top: 0,
                            zIndex: 13,
                            width: "40px",
                            backgroundColor: styles.pinnedBg,
                            gridRow: leafGridRow,
                            borderTop: "none",
                            borderLeft: "none",
                            borderBottom: "1px solid rgba(128,128,128,0.2)",
                            borderRight: "1px solid rgba(128,128,128,0.2)",
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
                          sortState.find((s) => s.key === column.key)
                            ?.direction ?? null
                        }
                        sortPriority={
                          multiSort && sortState.length > 1
                            ? sortState.findIndex((s) => s.key === column.key) + 1 || undefined
                            : undefined
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
                        onAutoFitColumn={handleAutoFitColumn}
                        isDark={isDark}
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
                          className={classNames.emptyState ?? ""}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                            paddingTop: 32,
                            paddingBottom: 32,
                            color: "GrayText",
                            ...styles.emptyState,
                          }}
                        >
                          <span style={{ fontSize: "inherit" }}>No data</span>
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
                      cfRowRules.length > 0
                        ? (record: DataRecord, index: number) => {
                            const base = rowClassName
                              ? (rowClassName as (record: DataRecord, index: number) => string)(record, index)
                              : "";
                            const cf = getCFRowClassName(record as T);
                            return [base, cf].filter(Boolean).join(" ") || "";
                          }
                        : (rowClassName as
                            | ((record: DataRecord, index: number) => string)
                            | undefined)
                    }
                    rowStyle={
                      aiStyleOps.length > 0 || cfRowRules.length > 0
                        ? (record: DataRecord, index: number) => {
                            const base = rowStyle
                              ? (
                                  rowStyle as (
                                    record: DataRecord,
                                    index: number,
                                  ) => React.CSSProperties
                                )(record, index)
                              : undefined;
                            const ai = getAIRowStyleForRecord(record as T);
                            const cf = getCFRowStyle(record as T);
                            if (!base && !ai && !cf) return {} as React.CSSProperties;
                            return { ...base, ...cf, ...ai };
                          }
                        : (rowStyle as
                            | ((
                                record: DataRecord,
                                index: number,
                              ) => React.CSSProperties)
                            | undefined)
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
                    cellStyleFn={
                      aiCellStyleOps.length > 0 || cfCellRules.length > 0
                        ? (record: DataRecord, columnKey: string) => {
                            const ai = getAICellStyleForRecord(record as T, columnKey);
                            const cf = getCFCellStyle(record as T, columnKey);
                            if (!ai && !cf) return undefined;
                            return { ...cf, ...ai };
                          }
                        : undefined
                    }
                    onRowDragStart={
                      rowDragEnabled && onRowReorder
                        ? handleRowDragStart
                        : undefined
                    }
                    focusedCell={focusedCell}
                    enableRowAnimation={enableRowAnimation}
                    onGroupToggle={rowGrouping ? toggleGroup : undefined}
                    groupAccentColor={accentColor}
                    onTreeToggle={treeData ? toggleTreeNode : undefined}
                    treeIndentSize={treeData?.indentSize ?? 20}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Master-detail panel ── */}
        {masterDetail && masterDetailRecord && (
          <div
            className={classNames.masterDetailPanel ?? ""}
            style={{
              borderTop: `2px solid ${accentColor}`,
              padding: 12,
              flexShrink: 0,
              maxHeight: "40%",
              overflow: "auto",
              position: "relative",
              ...styles.masterDetailPanel,
            }}
          >
            <button
              type="button"
              onClick={() => setMasterDetailRecord(null)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "1px solid rgba(128,128,128,0.2)",
                borderRadius: 4,
                cursor: "pointer",
                padding: "2px 4px",
                color: "GrayText",
                fontSize: "0.85em",
              }}
              title="Close detail"
            >
              {icons?.close ?? <XIcon style={{ width: 12, height: 12 }} />}
            </button>
            {masterDetail(masterDetailRecord, () => setMasterDetailRecord(null))}
          </div>
        )}

        {pgEnabled && (
          <div
            className={classNames.pagination ?? ""}
            style={{
              display: "flex",
              height: 36,
              minHeight: 36,
              maxHeight: 36,
              boxSizing: "border-box",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              paddingLeft: 12,
              paddingRight: 12,
              fontSize: "inherit",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              backgroundColor: "rgba(128,128,128,0.06)",
              gap: 12,
              flexShrink: 0,
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
                      fontSize: "inherit",
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
                      fontSize: "inherit",
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
                  fontSize: "inherit",
                  opacity: currentPage === 1 ? 0.2 : 1,
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
                  fontSize: "inherit",
                  opacity: currentPage === 1 ? 0.2 : 1,
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
                        fontSize: "inherit",
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
                      fontSize: "inherit",
                      color: isActivePage ? accentColor : "inherit",
                      fontWeight: isActivePage ? 600 : "inherit",
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
                  fontSize: "inherit",
                  opacity: currentPage === totalPages ? 0.2 : 1,
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
                  fontSize: "inherit",
                  opacity: currentPage === totalPages ? 0.2 : 1,
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
                    fontSize: "inherit",
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

        {/* ── Status bar ── */}
        {showStatusBar && (
          <div
            className={classNames.statusBar ?? ""}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "4px 12px",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              fontSize: "0.85em",
              color: "GrayText",
              flexShrink: 0,
              minHeight: 24,
              ...styles.statusBar,
            }}
          >
            {statusBarContent ? (
              statusBarContent({
                totalRows: data.length,
                filteredRows: treeProcessedData.length,
                selectedRows: rowSelection?.selectedRowKeys?.length ?? 0,
                currentPage: pgCurrent,
                pageSize: pgSize,
              })
            ) : (
              <>
                <span>{treeProcessedData.length === data.length ? `${data.length} rows` : `${treeProcessedData.length} of ${data.length} rows`}</span>
                {rowSelection && rowSelection.selectedRowKeys.length > 0 && (
                  <span style={{ color: accentColor, fontWeight: 500 }}>
                    {rowSelection.selectedRowKeys.length} selected
                  </span>
                )}
                {Object.keys(columnFilters).length > 0 && (
                  <span>{Object.keys(columnFilters).length} filter{Object.keys(columnFilters).length > 1 ? "s" : ""} active</span>
                )}
                {sortState.length > 0 && (
                  <span>Sorted by {sortState.length} column{sortState.length > 1 ? "s" : ""}</span>
                )}
              </>
            )}
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
              fontSize: "inherit",
              color: bt.color,
              alignItems: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
              borderRadius: 6,
              border: "1px dashed rgba(128,128,128,0.2)",
              boxShadow: bt.menuShadow,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              backgroundColor: bt.menuBg,
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

      {mounted && rowDragEnabled && onRowReorder &&
        createPortal(
          <div
            ref={rowDragGhostRef}
            style={{
              display: "none",
              position: "fixed",
              zIndex: 99999,
              height: 32,
              fontSize: "0.85em",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 12px",
              borderRadius: 6,
              border: `1px dashed ${accentColor}60`,
              boxShadow: bt.menuShadow,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              backgroundColor: bt.menuBg,
              cursor: "grabbing",
              pointerEvents: "none",
              fontWeight: 500,
              color: accentColor,
            }}
          />,
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
            fontSize: "inherit",
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
                boxShadow: bt.menuShadow,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                backgroundColor: bt.menuBg,
                color: bt.color,
                padding: "4px 0",
                fontSize: "0.75em",
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
                        label:
                          | React.ReactNode
                          | ((
                              columnKey: string,
                              record: T,
                              rowIndex: number,
                            ) => React.ReactNode);
                        icon?:
                          | React.ReactNode
                          | ((
                              columnKey: string,
                              record: T,
                              rowIndex: number,
                            ) => React.ReactNode);
                        danger?: boolean;
                        disabled?: boolean;
                        onClick?: (
                          columnKey: string,
                          record: T,
                          rowIndex: number,
                        ) => void;
                      }[]
                    ).map((item) => {
                      const resolvedIcon =
                        typeof item.icon === "function"
                          ? menuRecord
                            ? item.icon(
                                menuCol.key,
                                menuRecord,
                                menuRowIndex,
                              )
                            : null
                          : item.icon;
                      const resolvedLabel =
                        typeof item.label === "function"
                          ? menuRecord
                            ? item.label(
                                menuCol.key,
                                menuRecord,
                                menuRowIndex,
                              )
                            : null
                          : item.label;
                      return (
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
                            if (menuRecord && item.onClick) {
                              item.onClick(
                                menuCol.key,
                                menuRecord,
                                menuRowIndex,
                              );
                            }
                            setCellContextMenu(null);
                          }}
                        >
                          {resolvedIcon && (
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
                              {resolvedIcon}
                            </span>
                          )}
                          {resolvedLabel}
                        </button>
                      );
                    })}
                  </>
                )}
            </div>,
            document.body,
          );
        })()}
    </>
  );
}
