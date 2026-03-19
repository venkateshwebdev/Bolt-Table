import { ReactNode } from 'react';

/** `'asc'` | `'desc'` | `null` — the direction of a column sort. */
export type SortDirection = 'asc' | 'desc' | null;

/** Defines the shape of a single column in BoltTable. */
export interface ColumnType<T = unknown> {
  /** The text or React node shown in the column header. */
  title: string | ReactNode;

  /** The key in the row data object whose value this column displays. */
  dataIndex: string;

  /** Fixed pixel width of this column. Defaults to `150px`; last column stretches to fill. */
  width?: number;

  /** Unique identifier for this column, used for ordering, pinning, hiding, and sorting. */
  key: string;

  /** Custom render function for cell content. Receives `(value, record, index)`. */
  render?: (text: unknown, record: T, index: number) => ReactNode;

  /** Custom render for the shimmer/loading skeleton state of this column. */
  shimmerRender?: () => ReactNode;

  /** Whether this column shows sort controls. Defaults to `true`. */
  sortable?: boolean;

  /**
   * Client-side sort comparator. `true` uses default comparator;
   * pass `(a, b) => number` for custom logic.
   */
  sorter?: boolean | ((a: T, b: T) => number);

  /** Whether this column shows a filter control. Defaults to `true`. */
  filterable?: boolean;

  /**
   * Client-side filter predicate. Return `true` to keep the row.
   * Falls back to case-insensitive substring match when not provided.
   */
  filterFn?: (filterValue: string, record: T, dataIndex: string) => boolean;

  /** Whether this column is hidden by default on first render. */
  defaultHidden?: boolean;

  /** Which side this column is pinned to by default: `'left'`, `'right'`, or `false`. */
  defaultPinned?: 'left' | 'right' | false;

  /** Controlled hidden state of the column. For uncontrolled, use `defaultHidden`. */
  hidden?: boolean;

  /** Controlled pinned state: `'left'`, `'right'`, or `false`. For uncontrolled, use `defaultPinned`. */
  pinned?: 'left' | 'right' | false;

  /** Additional CSS class name(s) applied to every cell in this column. */
  className?: string;

  /** Inline CSS styles applied to every cell in this column. */
  style?: React.CSSProperties;

  /**
   * Enables the "Copy" action in the cell context menu.
   * `true` copies the raw value; pass a function for custom copy text.
   */
  copy?: boolean | ((value: unknown, record: T, index: number) => string);

  /** Custom context menu items appended to this column's header right-click menu. */
  columnHeaderContextMenuItems?: ColumnContextMenuItem[];

  /** Custom context menu items appended to every cell's right-click menu in this column. */
  columnCellContextMenuItems?: CellContextMenuItem<T>[];
}

/** A single item in the cell right-click context menu (column-level). */
export interface CellContextMenuItem<T = unknown> {
  /** Unique identifier for this menu item, used as the React `key`. */
  key: string;

  /** The label shown in the menu. Can be a string or React node. */
  label: React.ReactNode;

  /** Optional icon shown to the left of the label. */
  icon?: React.ReactNode;

  /** When `true`, the label renders in red to indicate a destructive action. */
  danger?: boolean;

  /** When `true`, the item is grayed out and click handler is not called. */
  disabled?: boolean;

  /** Called when the user clicks this menu item. Receives the column key, row record, and row index. */
  onClick: (columnKey: string, record: T, rowIndex: number) => void;
}

/** A single item in the column header right-click context menu. */
export interface ColumnContextMenuItem {
  /** Unique identifier for this menu item, used as the React `key`. */
  key: string;

  /** The label shown in the menu. Can be a string or React node. */
  label: React.ReactNode;

  /** Optional icon shown to the left of the label. */
  icon?: React.ReactNode;

  /** When `true`, the label renders in red to indicate a destructive action. */
  danger?: boolean;

  /** When `true`, the item is grayed out and click handler is not called. */
  disabled?: boolean;

  /** Called when the user clicks this menu item. Receives the column `key`. */
  onClick: (columnKey: string) => void;
}

/** How the row selection was triggered: `'all'`, `'single'`, or `'multiple'`. */
export type RowSelectMethod = 'all' | 'single' | 'multiple';

/** Configuration for expandable rows with a custom rendered panel below each row. */
export interface ExpandableConfig<T = unknown> {
  /** When `true`, all rows are expanded on initial render. */
  defaultExpandAllRows?: boolean;

  /** Controlled list of currently expanded row keys. Omit for uncontrolled mode. */
  expandedRowKeys?: React.Key[];

  /** Renders the expanded content panel for a row. */
  expandedRowRender: (
    record: T,
    index: number,
    indent: number,
    expanded: boolean,
  ) => ReactNode;

  /** Row keys expanded by default on first render (uncontrolled mode). */
  defaultExpandedRowKeys?: React.Key[];

  /** Called whenever the set of expanded rows changes. */
  onExpandedRowsChange?: (expandedKeys: React.Key[]) => void;

  /** Controls whether the expand icon is shown for a specific row. */
  showExpandIcon?: (record: T) => boolean;

  /** Determines whether a specific row is expandable. */
  rowExpandable?: (record: T) => boolean;
}

/** Configuration for row selection (checkboxes or radio buttons). */
export interface RowSelectionConfig<T = unknown> {
  /** `'checkbox'` for multi-select (default) or `'radio'` for single-select. */
  type?: 'checkbox' | 'radio';

  /** When `true`, hides the "select all" checkbox in the header. */
  hideSelectAll?: boolean;

  /** The currently selected row keys (controlled). */
  selectedRowKeys: React.Key[];

  /** Called when the header "select all" checkbox is toggled. */
  onSelectAll?: (selected: boolean, selectedRows: T[], changeRows: T[]) => void;

  /** Called when a single row's checkbox or radio is toggled. */
  onSelect?: (
    record: T,
    selected: boolean,
    selectedRows: T[],
    nativeEvent: Event,
  ) => void;

  /** Called whenever the selection changes for any reason. Primary state-sync callback. */
  onChange?: (
    selectedRowKeys: React.Key[],
    selectedRows: T[],
    info: { type: RowSelectMethod },
  ) => void;

  /** Returns additional props (e.g. `disabled`) for the checkbox/radio of a specific row. */
  getCheckboxProps?: (record: T) => { disabled?: boolean };
}

/** Configuration for the pagination footer. Pass `false` to disable pagination. */
export interface PaginationType {
  /** Current active page number (1-based). Defaults to `1`. */
  current?: number;

  /** Number of rows displayed per page. Defaults to `10`. */
  pageSize?: number;

  /** Total number of rows across all pages. Required for server-side pagination. */
  total?: number;

  /** Custom renderer for the "showing X–Y of Z" text in the pagination footer. */
  showTotal?: (total: number, range: [number, number]) => ReactNode;

  /** When `true`, hides the page-size dropdown selector in the pagination footer. */
  hidePageSelector?: boolean;

  /** Custom page-size options shown in the dropdown. Defaults to `[10, 15, 20, 25, 50, 100]`. */
  pageSizeOptions?: number[];

}

/** Configuration for row pinning. Pinned rows remain visible during vertical scroll. */
export interface RowPinningConfig {
  /** Row keys to pin at the top of the table. */
  top?: React.Key[];

  /** Row keys to pin at the bottom of the table. */
  bottom?: React.Key[];
}

/** @deprecated Use `ExpandableConfig` instead. */
export interface RowExpansionConfig<T = unknown> {
  showExpandIcon?: (v: T) => boolean;
  expandedRowRenderer?: (v: T, index: number) => React.ReactNode;
  onExpandedRowsChange?: (keys: readonly React.Key[]) => void;
  defaultExpandedRowKeys?: number[] | string[];
  expandedRowKeys?: readonly React.Key[];
  defaultExpandAllRows?: boolean;
}

/** Base type for row records — all row objects must be indexable by string keys. */
export type DataRecord = Record<string, unknown>;
