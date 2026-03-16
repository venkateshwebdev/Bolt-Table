import { ReactNode } from 'react';

/**
 * The direction of a column sort.
 *
 * - `'asc'`  — ascending order (A → Z, 0 → 9)
 * - `'desc'` — descending order (Z → A, 9 → 0)
 * - `null`   — no sort applied
 *
 * @example
 * const [sortDir, setSortDir] = useState<SortDirection>(null);
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Defines the shape of a single column in BoltTable.
 *
 * @typeParam T - The type of a single row record. Defaults to `unknown`.
 *
 * @example
 * const columns: ColumnType<User>[] = [
 *   {
 *     key: 'name',
 *     dataIndex: 'name',
 *     title: 'Full Name',
 *     width: 200,
 *     sortable: true,
 *     render: (value, record) => <strong>{record.name}</strong>,
 *   },
 * ];
 */
export interface ColumnType<T = unknown> {
  /**
   * The text or React node shown in the column header.
   *
   * @example
   * title: 'Full Name'
   * title: <span style={{ color: 'red' }}>Name</span>
   */
  title: string | ReactNode;

  /**
   * The key in the row data object whose value this column displays.
   * Must match a property name on your row record type `T`.
   *
   * @example
   * // For a row { id: 1, firstName: 'John' }
   * dataIndex: 'firstName'
   */
  dataIndex: string;

  /**
   * The fixed pixel width of this column.
   * If omitted, defaults to `150px`.
   * The last column always stretches to fill remaining space (minmax).
   *
   * @example
   * width: 200
   */
  width?: number;

  /**
   * A unique identifier for this column.
   * Used internally for drag-and-drop ordering, pinning, hiding, and sorting.
   * Should match `dataIndex` in most cases unless you have computed columns.
   *
   * @example
   * key: 'firstName'
   */
  key: string;

  /**
   * Custom render function for the cell content.
   * If omitted, the raw value from `dataIndex` is rendered as-is.
   *
   * @param text   - The raw cell value (`record[dataIndex]`)
   * @param record - The full row data object
   * @param index  - The row index (0-based) in the current page/view
   * @returns A React node to render inside the cell
   *
   * @example
   * render: (value, record) => (
   *   <span style={{ color: record.isActive ? 'green' : 'gray' }}>
   *     {String(value)}
   *   </span>
   * )
   */
  render?: (text: unknown, record: T, index: number) => ReactNode;

  /**
   * Custom render function for the shimmer (loading skeleton) state.
   * When the table is loading and has no data, this replaces the default
   * animated pulse bar for this column.
   *
   * @returns A React node to render as the loading placeholder
   *
   * @example
   * shimmerRender: () => (
   *   <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eee' }} />
   * )
   */
  shimmerRender?: () => ReactNode;

  /**
   * Whether this column shows sort controls (ascending/descending).
   * Defaults to `true`. Set to `false` to hide sorting for this column entirely.
   *
   * @default true
   *
   * @example
   * sortable: false  // disables sort UI for this column
   */
  sortable?: boolean;

  /**
   * Custom sort comparator used for **client-side** (local) sorting.
   * Only applies when no `onSortChange` callback is provided to BoltTable
   * (i.e. you are not doing server-side sorting).
   *
   * - Pass `true` to use the default comparator (string localeCompare / number subtraction).
   * - Pass a function `(a, b) => number` for custom sort logic.
   *   Return negative if `a` should come first, positive if `b` should come first, 0 if equal.
   *
   * @example
   * // Default comparator
   * sorter: true
   *
   * // Custom comparator — sort by string length
   * sorter: (a, b) => String(a.name).length - String(b.name).length
   *
   * // Custom comparator — sort by date
   * sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
   */
  sorter?: boolean | ((a: T, b: T) => number);

  /**
   * Whether this column shows a filter control in the context menu.
   * Defaults to `true`. Set to `false` to hide filtering for this column.
   *
   * @default true
   *
   * @example
   * filterable: false  // disables filter UI for this column
   */
  filterable?: boolean;

  /**
   * Custom filter predicate used for **client-side** (local) filtering.
   * Only applies when no `onFilterChange` callback is provided to BoltTable.
   *
   * @param filterValue - The string the user typed into the filter input
   * @param record      - The full row data object being tested
   * @param dataIndex   - The column's `dataIndex` value
   * @returns `true` to keep the row, `false` to exclude it
   *
   * Falls back to a case-insensitive substring match when not provided.
   *
   * @example
   * // Only show rows where the status exactly matches the filter
   * filterFn: (filterValue, record) =>
   *   record.status === filterValue
   *
   * // Numeric range filter — keep rows where age >= filterValue
   * filterFn: (filterValue, record) =>
   *   Number(record.age) >= Number(filterValue)
   */
  filterFn?: (filterValue: string, record: T, dataIndex: string) => boolean;

  /**
   * Whether this column is hidden by default on first render.
   * The user can still show it via column visibility controls if you expose them.
   *
   * @default false
   */
  defaultHidden?: boolean;

  /**
   * Which side this column is pinned to by default on first render.
   * - `'left'`  — column sticks to the left edge while scrolling horizontally
   * - `'right'` — column sticks to the right edge
   * - `false`   — column is not pinned (scrolls normally)
   *
   * @default false
   */
  defaultPinned?: 'left' | 'right' | false;

  /**
   * Controls the current hidden state of the column.
   * Use this for controlled visibility (managed by parent state).
   * For uncontrolled, use `defaultHidden` instead.
   *
   * @example
   * hidden: hiddenColumns.includes('email')
   */
  hidden?: boolean;

  /**
   * Controls the current pinned state of the column.
   * Use this for controlled pinning (managed by parent state).
   * For uncontrolled, use `defaultPinned` instead.
   *
   * - `'left'`  — pinned to the left
   * - `'right'` — pinned to the right
   * - `false`   — not pinned
   *
   * @example
   * pinned: 'left'
   */
  pinned?: 'left' | 'right' | false;

  /**
   * Additional CSS class name(s) applied to every cell in this column,
   * including both the header and body cells.
   *
   * @example
   * className: 'text-right font-mono'
   */
  className?: string;

  /**
   * Inline CSS styles applied to every cell in this column,
   * including both the header and body cells.
   *
   * @example
   * style: { textAlign: 'right', fontFamily: 'monospace' }
   */
  style?: React.CSSProperties;
}

/**
 * A single item in the column header context menu (right-click menu).
 * Use `columnContextMenuItems` on BoltTable to inject custom actions
 * alongside the built-in sort/filter/pin/hide options.
 *
 * @example
 * const menuItems: ColumnContextMenuItem[] = [
 *   {
 *     key: 'copy',
 *     label: 'Copy column data',
 *     icon: <CopyIcon />,
 *     onClick: (columnKey) => copyColumnToClipboard(columnKey),
 *   },
 *   {
 *     key: 'delete',
 *     label: 'Remove column',
 *     danger: true,
 *     onClick: (columnKey) => removeColumn(columnKey),
 *   },
 * ];
 */
export interface ColumnContextMenuItem {
  /**
   * Unique identifier for this menu item.
   * Used as the React `key` prop — must be unique among all custom items.
   */
  key: string;

  /**
   * The label shown in the menu. Can be a string or any React node.
   *
   * @example
   * label: 'Copy column'
   * label: <span style={{ fontWeight: 'bold' }}>Copy column</span>
   */
  label: React.ReactNode;

  /**
   * Optional icon shown to the left of the label.
   * Recommended size: 12–14px .
   *
   * @example
   * icon: <CopyIcon className="h-3 w-3" />
   */
  icon?: React.ReactNode;

  /**
   * When `true`, the label renders in red to indicate a destructive action.
   *
   * @default false
   */
  danger?: boolean;

  /**
   * When `true`, the item is grayed out and the click handler is not called.
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * Called when the user clicks this menu item.
   *
   * @param columnKey - The `key` of the column whose header was right-clicked
   *
   * @example
   * onClick: (columnKey) => console.log('Clicked on column:', columnKey)
   */
  onClick: (columnKey: string) => void;
}

/**
 * How the row selection was triggered.
 *
 * - `'all'`      — select/deselect all rows via the header checkbox
 * - `'single'`   — a single row was selected (radio or single click)
 * - `'multiple'` — individual checkboxes toggled
 */
export type RowSelectMethod = 'all' | 'single' | 'multiple';

/**
 * Configuration for expandable rows.
 * When provided, each row gets an expand toggle button that reveals
 * a custom rendered panel below the row.
 *
 * @typeParam T - The type of a single row record
 *
 * @example
 * const expandable: ExpandableConfig<Order> = {
 *   rowExpandable: (record) => record.items.length > 0,
 *   expandedRowRender: (record) => (
 *     <div>
 *       {record.items.map(item => <div key={item.id}>{item.name}</div>)}
 *     </div>
 *   ),
 * };
 */
export interface ExpandableConfig<T = unknown> {
  /**
   * When `true`, all rows are expanded on initial render.
   * Takes priority over `defaultExpandedRowKeys`.
   *
   * @default false
   */
  defaultExpandAllRows?: boolean;

  /**
   * Controlled list of currently expanded row keys.
   * When provided, BoltTable operates in **controlled mode** — you must
   * update this list yourself in `onExpandedRowsChange`.
   * When omitted, BoltTable manages expansion state internally.
   *
   * @example
   * expandedRowKeys={expandedKeys}
   */
  expandedRowKeys?: React.Key[];

  /**
   * Renders the expanded content panel for a row.
   * This panel appears directly below the row when it is expanded.
   * The panel auto-sizes to its content height.
   *
   * @param record   - The row data object
   * @param index    - The row index (0-based)
   * @param indent   - The indent level (always 0 for flat tables)
   * @param expanded - Whether the row is currently expanded (`true`)
   * @returns The React content to render in the expanded panel
   *
   * @example
   * expandedRowRender: (record) => (
   *   <pre>{JSON.stringify(record, null, 2)}</pre>
   * )
   */
  expandedRowRender: (
    record: T,
    index: number,
    indent: number,
    expanded: boolean,
  ) => ReactNode;

  /**
   * Row keys that are expanded by default on first render (uncontrolled mode).
   * Ignored when `expandedRowKeys` is provided.
   *
   * @example
   * defaultExpandedRowKeys={['row-1', 'row-3']}
   */
  defaultExpandedRowKeys?: React.Key[];

  /**
   * Called whenever the set of expanded rows changes.
   * In controlled mode, use this to update your `expandedRowKeys` state.
   *
   * @param expandedKeys - The full list of currently expanded row keys
   *
   * @example
   * onExpandedRowsChange={(keys) => setExpandedKeys(keys)}
   */
  onExpandedRowsChange?: (expandedKeys: React.Key[]) => void;

  /**
   * Controls whether to show the expand icon for a specific row.
   * Return `false` to hide the toggle for rows that cannot be expanded visually.
   *
   * @example
   * showExpandIcon: (record) => record.hasChildren
   */
  showExpandIcon?: (record: T) => boolean;

  /**
   * Determines whether a specific row is expandable.
   * When this returns `false` for a row, no expand button is rendered for it.
   *
   * @example
   * rowExpandable: (record) => record.subRows.length > 0
   */
  rowExpandable?: (record: T) => boolean;
}

/**
 * Configuration for row selection (checkboxes or radio buttons).
 * When provided, a selection column is prepended to the left of the table.
 *
 * @typeParam T - The type of a single row record
 *
 * @example
 * // Checkbox selection
 * const rowSelection: RowSelectionConfig<User> = {
 *   type: 'checkbox',
 *   selectedRowKeys,
 *   onChange: (keys, rows) => setSelectedRowKeys(keys),
 * };
 *
 * // Radio selection (single row only)
 * const rowSelection: RowSelectionConfig<User> = {
 *   type: 'radio',
 *   selectedRowKeys,
 *   onChange: (keys, rows) => setSelectedRowKeys(keys),
 * };
 */
export interface RowSelectionConfig<T = unknown> {
  /**
   * The type of selection control.
   * - `'checkbox'` — multiple rows can be selected (default)
   * - `'radio'`    — only one row can be selected at a time
   *
   * @default 'checkbox'
   */
  type?: 'checkbox' | 'radio';

  /**
   * When `true`, hides the "select all" checkbox in the header.
   * Useful when using radio mode or when you want to prevent bulk selection.
   *
   * @default false
   */
  hideSelectAll?: boolean;

  /**
   * The currently selected row keys (controlled).
   * This must always be provided — BoltTable does not manage selection state internally.
   * Keys are matched against the value returned by the `rowKey` prop on BoltTable.
   *
   * @example
   * selectedRowKeys={['row-1', 'row-5']}
   */
  selectedRowKeys: React.Key[];

  /**
   * Called when the header "select all" checkbox is toggled.
   *
   * @param selected     - `true` if selecting all, `false` if deselecting all
   * @param selectedRows - The rows that are now selected
   * @param changeRows   - The rows that changed in this action
   *
   * @example
   * onSelectAll: (selected, rows) => {
   *   setSelectedKeys(selected ? rows.map(r => r.id) : []);
   * }
   */
  onSelectAll?: (selected: boolean, selectedRows: T[], changeRows: T[]) => void;

  /**
   * Called when a single row's checkbox or radio is toggled.
   *
   * @param record        - The row record that was toggled
   * @param selected      - `true` if the row is now selected
   * @param selectedRows  - All currently selected rows after this change
   * @param nativeEvent   - The original DOM event
   *
   * @example
   * onSelect: (record, selected) => {
   *   console.log(`Row ${record.id} is now ${selected ? 'selected' : 'deselected'}`);
   * }
   */
  onSelect?: (
    record: T,
    selected: boolean,
    selectedRows: T[],
    nativeEvent: Event,
  ) => void;

  /**
   * Called whenever the selection changes for any reason (single toggle or select all).
   * This is the primary callback for keeping your state in sync.
   *
   * @param selectedRowKeys - The full list of currently selected row keys
   * @param selectedRows    - The full list of currently selected row records
   * @param info            - Metadata about how the change was triggered
   *
   * @example
   * onChange: (keys, rows) => {
   *   setSelectedRowKeys(keys);
   *   setSelectedRows(rows);
   * }
   */
  onChange?: (
    selectedRowKeys: React.Key[],
    selectedRows: T[],
    info: { type: RowSelectMethod },
  ) => void;

  /**
   * Returns additional props for the checkbox/radio of a specific row.
   * Currently supports `disabled` to prevent a row from being selected.
   *
   * @param record - The row record
   * @returns An object with optional `disabled` boolean
   *
   * @example
   * getCheckboxProps: (record) => ({
   *   disabled: record.status === 'locked',
   * })
   */
  getCheckboxProps?: (record: T) => { disabled?: boolean };
}

/**
 * Configuration for the pagination footer.
 * Pass `false` to the `pagination` prop on BoltTable to disable pagination entirely.
 *
 * BoltTable supports both **client-side** and **server-side** pagination:
 * - **Client-side**: pass all your data at once; BoltTable slices it per page automatically.
 * - **Server-side**: pass only the current page's data; set `total` to the full dataset size
 *   and handle `onPaginationChange` to fetch the next page from your API.
 *
 * @example
 * // Client-side (pass all data)
 * pagination={{ pageSize: 20 }}
 *
 * // Server-side
 * pagination={{
 *   current: page,
 *   pageSize: 20,
 *   total: 500,
 *   showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
 * }}
 */
export interface PaginationType {
  /**
   * The current active page number (1-based).
   * Required for controlled / server-side pagination.
   * Defaults to `1` if omitted.
   *
   * @example
   * current: 3  // currently on page 3
   */
  current?: number;

  /**
   * Number of rows displayed per page.
   * The user can also change this via the page-size selector in the footer.
   *
   * @default 10
   *
   * @example
   * pageSize: 25
   */
  pageSize?: number;

  /**
   * The total number of rows across **all pages**.
   * Required for server-side pagination so BoltTable knows how many pages exist.
   * For client-side pagination, omit this — BoltTable calculates it from `data.length`.
   *
   * @example
   * total: 1234  // 1234 rows total on the server
   */
  total?: number;

  /**
   * Custom renderer for the "showing X-Y of Z" text in the pagination footer.
   *
   * @param total - The total number of rows
   * @param range - A tuple `[start, end]` of the currently visible row range
   * @returns A React node to render as the total label
   *
   * @example
   * showTotal: (total, [start, end]) => `Showing ${start} to ${end} of ${total} results`
   */
  showTotal?: (total: number, range: [number, number]) => ReactNode;
}

/**
 * Configuration for row pinning.
 * When provided, the specified rows are rendered as sticky rows at the top
 * and/or bottom of the table body, remaining visible during vertical scroll.
 *
 * Pinned rows are excluded from pagination — they are always visible regardless
 * of which page the user is on. Filtering still applies: if a pinned row's key
 * doesn't exist in the (filtered) data, it simply won't appear.
 *
 * @example
 * // Pin two rows to the top and one to the bottom
 * rowPinning={{ top: ['row-1', 'row-3'], bottom: ['row-10'] }}
 *
 * @example
 * // Controlled pinning — manage pinned keys in parent state
 * const [pinning, setPinning] = useState<RowPinningConfig>({ top: ['header-row'] });
 * <BoltTable rowPinning={pinning} ... />
 */
export interface RowPinningConfig {
  /**
   * Row keys to pin at the top of the table.
   * These rows stick below the column headers during vertical scroll.
   * Order is preserved — rows are rendered in the order listed here.
   */
  top?: React.Key[];

  /**
   * Row keys to pin at the bottom of the table.
   * These rows stick to the bottom of the visible area during vertical scroll.
   * Order is preserved — rows are rendered in the order listed here.
   */
  bottom?: React.Key[];
}

/**
 * @deprecated Use `ExpandableConfig` instead.
 * This interface is kept for backwards compatibility only.
 */
export interface RowExpansionConfig<T = unknown> {
  showExpandIcon?: (v: T) => boolean;
  expandedRowRenderer?: (v: T, index: number) => React.ReactNode;
  onExpandedRowsChange?: (keys: readonly React.Key[]) => void;
  defaultExpandedRowKeys?: number[] | string[];
  expandedRowKeys?: readonly React.Key[];
  defaultExpandAllRows?: boolean;
}

/**
 * The base type for a row record in BoltTable.
 * All row data objects must be indexable by string keys.
 *
 * BoltTable is generic over `T extends DataRecord`, so you can pass your
 * own strongly-typed row type for full type safety in `render`, `sorter`,
 * `filterFn`, and selection callbacks.
 *
 * @example
 * interface User extends DataRecord {
 *   id: string;
 *   name: string;
 *   email: string;
 *   age: number;
 * }
 *
 * <BoltTable<User> columns={columns} data={users} />
 */
export type DataRecord = Record<string, unknown>;