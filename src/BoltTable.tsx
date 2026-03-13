'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
} from 'lucide-react';
import React, {
  CSSProperties,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import DraggableHeader from './DraggableHeader';
import ResizeOverlay, { type ResizeOverlayHandle } from './ResizeOverlay';
import TableBody from './TableBody';
import type {
  ColumnContextMenuItem,
  ColumnType,
  DataRecord,
  ExpandableConfig,
  PaginationType,
  RowSelectionConfig,
  SortDirection,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// BoltTable
//
// A high-performance, fully-featured React table component built on:
//   • @tanstack/react-virtual  — row virtualization (only visible rows in DOM)
//   • @dnd-kit/core + sortable — drag-to-reorder column headers
//
// Feature overview:
//   ┌─────────────────────────────────────────────────────────────────┐
//   │ Feature                │ Controlled  │ Uncontrolled (default)  │
//   ├─────────────────────────────────────────────────────────────────┤
//   │ Column order           │ onColumnOrderChange callback          │
//   │ Column width           │ onColumnResize callback              │
//   │ Column pinning         │ onColumnPin callback                 │
//   │ Column visibility      │ onColumnHide callback                │
//   │ Sort                   │ onSortChange (server-side)            │
//   │                        │ local sort (client-side, default)    │
//   │ Filter                 │ onFilterChange (server-side)          │
//   │                        │ local filter (client-side, default)  │
//   │ Pagination             │ onPaginationChange (server-side)      │
//   │                        │ client-side slice (default)          │
//   │ Row selection          │ rowSelection.onChange (always)        │
//   │ Row expansion          │ expandable.expandedRowKeys (opt.)    │
//   └─────────────────────────────────────────────────────────────────┘
//
// Performance notes:
//   - Only the visible rows are in the DOM at any time (virtualization).
//   - Row hover is handled via pure DOM attribute mutation — zero React re-renders.
//   - Column headers use React.memo with custom comparators.
//   - The selection column renders checkboxes inside Cell (not via column.render)
//     so toggling one row's selection never re-renders other cells.
//   - Column widths are stored in a separate state bucket so pagination prop
//     changes never reset user-adjusted widths.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the BoltTable component.
 *
 * @typeParam T - The type of a single row record. Must extend `DataRecord`
 *               (i.e. `Record<string, unknown>`). Pass your own interface for
 *               full type safety in column `render`, `sorter`, and `filterFn`.
 *
 * @example
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   age: number;
 * }
 *
 * <BoltTable<User>
 *   columns={columns}
 *   data={users}
 *   rowKey="id"
 *   pagination={{ pageSize: 20 }}
 * />
 */
interface BoltTableProps<T extends DataRecord = DataRecord> {
  /**
   * Column definitions array. Controls what columns are shown, their order,
   * width, pinning, sort/filter behavior, and cell rendering.
   *
   * BoltTable watches this array for changes using a content fingerprint
   * (key + hidden + pinned + width). The internal column state syncs whenever
   * the fingerprint changes, but sub-pixel width jitter (e.g. percentage widths)
   * is normalized to avoid unnecessary re-syncs.
   *
   * @example
   * const columns: ColumnType<User>[] = [
   *   { key: 'name', dataIndex: 'name', title: 'Name', width: 200, sortable: true },
   *   { key: 'email', dataIndex: 'email', title: 'Email', width: 250 },
   *   { key: 'age', dataIndex: 'age', title: 'Age', width: 80, sortable: true },
   * ];
   */
  readonly columns: ColumnType<T>[];

  /**
   * The row data to display. Each element corresponds to one table row.
   *
   * For **client-side** pagination/sort/filter, pass the full dataset.
   * BoltTable will slice, sort, and filter it internally.
   *
   * For **server-side** operations, pass only the current page's data and
   * provide `onSortChange`, `onFilterChange`, and `onPaginationChange` callbacks
   * to handle these operations on your server.
   *
   * @example
   * data={users}  // User[]
   */
  readonly data: T[];

  /**
   * Height of each regular (non-expanded) row in pixels.
   * All rows must have the same base height for virtualization to work correctly.
   *
   * @default 40
   *
   * @example
   * rowHeight={48}
   */
  readonly rowHeight?: number;

  /**
   * The **estimated** height (in pixels) for expanded row content panels.
   * Used as the initial size estimate when a row is first expanded, before
   * the actual content height has been measured by ResizeObserver.
   * Once measured, the virtualizer updates to the real height.
   *
   * Set this close to your typical expanded row height for the smoothest experience.
   *
   * @default 200
   *
   * @example
   * expandedRowHeight={300}
   */
  readonly expandedRowHeight?: number;

  /**
   * Optional maximum height in pixels for expanded row panels.
   * When the expanded content exceeds this height, the panel becomes scrollable.
   * When omitted, panels grow to their full content height.
   *
   * @example
   * maxExpandedRowHeight={400}
   */
  readonly maxExpandedRowHeight?: number;

  /**
   * The primary color used for interactive elements throughout the table:
   * - Sort direction indicators in column headers
   * - Active filter icon in column headers
   * - Column resize overlay line and label
   * - Selected row background tint (as a transparent overlay)
   * - Expand/collapse chevron buttons
   * - Checkbox and radio button accent color
   * - Highlighted sort/filter options in the context menu
   * - Page number highlight in the pagination footer
   *
   * Accepts any valid CSS color string.
   *
   * @default '#1890ff'
   *
   * @example
   * accentColor="#6366f1"   // indigo
   * accentColor="#10b981"   // emerald
   * accentColor="hsl(262, 80%, 50%)"
   */
  readonly accentColor?: string;

  /**
   * Additional CSS class name applied to the outermost wrapper div of BoltTable.
   * Use this to apply custom sizing, border, or shadow to the table container.
   *
   * @example
   * className="rounded-lg border shadow-sm"
   */
  readonly className?: string;

  /**
   * Granular CSS class name overrides for specific parts of the table.
   * Each key targets a different region of the table.
   *
   * @example
   * classNames={{
   *   header: 'text-xs uppercase tracking-wider',
   *   cell: 'text-sm',
   *   row: 'border-b',
   *   pinnedHeader: 'bg-blue-50',
   *   pinnedCell: 'bg-blue-50/50',
   * }}
   */
  readonly classNames?: ClassNamesTypes;

  /**
   * Inline style overrides for specific parts of the table.
   * Applied after all default and className-based styles, so these take
   * the highest specificity.
   *
   * Note: `pinnedBg` is a special string property (not CSSProperties) that
   * sets the background color of pinned column cells and headers directly.
   *
   * @example
   * styles={{
   *   header: { fontSize: 12, fontWeight: 600 },
   *   pinnedBg: 'rgba(239, 246, 255, 0.9)',
   *   rowHover: { backgroundColor: '#f0f9ff' },
   *   rowSelected: { backgroundColor: '#dbeafe' },
   * }}
   */
  readonly styles?: StylesTypes;

  /**
   * A custom React node to use as the drag grip icon in column headers.
   * When omitted, the default `GripVertical` icon from lucide-react is used.
   * Ignored when `hideGripIcon` is `true`.
   *
   * @example
   * gripIcon={<DragHandleIcon className="h-3 w-3" />}
   */
  readonly gripIcon?: React.ReactNode;

  /**
   * When `true`, the drag grip icon is hidden from all column headers.
   * Columns can still be dragged even without the grip icon.
   *
   * @default false
   *
   * @example
   * hideGripIcon={true}
   */
  readonly hideGripIcon?: boolean;

  /**
   * Pagination configuration for the footer, or `false` to disable pagination entirely.
   *
   * **Client-side pagination** (pass all data, BoltTable slices it):
   * ```tsx
   * pagination={{ pageSize: 20 }}
   * ```
   *
   * **Server-side pagination** (pass only current page's data):
   * ```tsx
   * pagination={{ current: page, pageSize: 20, total: 500 }}
   * onPaginationChange={(page, size) => fetchPage(page, size)}
   * ```
   *
   * **Disable pagination:**
   * ```tsx
   * pagination={false}
   * ```
   *
   * @default undefined (pagination footer shown with default settings)
   */
  readonly pagination?: PaginationType | false;

  /**
   * Called when the user changes the current page or page size via the pagination footer.
   * Required for server-side pagination. For client-side pagination, this is optional
   * (BoltTable handles page changes internally).
   *
   * @param page     - The new page number (1-based)
   * @param pageSize - The new page size
   *
   * @example
   * onPaginationChange={(page, size) => {
   *   setCurrentPage(page);
   *   setPageSize(size);
   *   fetchData({ page, size });
   * }}
   */
  readonly onPaginationChange?: (page: number, pageSize: number) => void;

  /**
   * Called when the user finishes resizing a column (on mouse up).
   * Use this to persist the new width to your state or storage.
   *
   * @param columnKey - The `key` of the resized column
   * @param newWidth  - The new column width in pixels
   *
   * @example
   * onColumnResize={(key, width) => {
   *   setColumnWidths(prev => ({ ...prev, [key]: width }));
   * }}
   */
  readonly onColumnResize?: (columnKey: string, newWidth: number) => void;

  /**
   * Called after the user drops a column header into a new position.
   * Receives the full new column key order.
   * Use this to persist the order to your state or storage.
   *
   * @param newOrder - Array of all column keys in their new order
   *
   * @example
   * onColumnOrderChange={(order) => {
   *   setColumnOrder(order);
   * }}
   */
  readonly onColumnOrderChange?: (newOrder: string[]) => void;

  /**
   * Called when the user pins or unpins a column via the context menu.
   *
   * @param columnKey - The `key` of the column whose pin state changed
   * @param pinned    - The new pin state: `'left'`, `'right'`, or `false`
   *
   * @example
   * onColumnPin={(key, pinned) => {
   *   setColumns(prev => prev.map(col =>
   *     col.key === key ? { ...col, pinned } : col
   *   ));
   * }}
   */
  readonly onColumnPin?: (
    columnKey: string,
    pinned: 'left' | 'right' | false,
  ) => void;

  /**
   * Called when the user hides or shows a column via the context menu.
   * Note: pinned columns cannot be hidden.
   *
   * @param columnKey - The `key` of the column whose visibility changed
   * @param hidden    - `true` if the column is now hidden, `false` if now visible
   *
   * @example
   * onColumnHide={(key, hidden) => {
   *   setColumns(prev => prev.map(col =>
   *     col.key === key ? { ...col, hidden } : col
   *   ));
   * }}
   */
  readonly onColumnHide?: (columnKey: string, hidden: boolean) => void;

  /**
   * Determines the unique key for each row. Used for selection, expansion,
   * and stable virtualizer item keys.
   *
   * Can be:
   * - A **string**: the name of a property on the row object (e.g. `'id'`)
   * - A **function**: `(record) => string` for computed keys
   * - A **number** or **symbol**: property access by index/symbol
   *
   * Always returns a string internally (numbers/symbols are coerced to string).
   *
   * @default 'id'
   *
   * @example
   * rowKey="id"
   * rowKey={(record) => `${record.type}-${record.id}`}
   */
  readonly rowKey?: string | ((record: T) => string) | number | symbol;

  /**
   * Row selection configuration. When provided, prepends a checkbox (or radio)
   * column to the left of the table.
   *
   * BoltTable does not manage selection state internally — you must track
   * `selectedRowKeys` in your own state and update it in `onChange`.
   *
   * @example
   * rowSelection={{
   *   type: 'checkbox',
   *   selectedRowKeys,
   *   onChange: (keys) => setSelectedRowKeys(keys),
   * }}
   */
  expandable?: ExpandableConfig<T>;

  /**
   * Expandable row configuration. When provided, prepends an expand toggle
   * column to the left of the table (to the right of the selection column
   * if both are used).
   *
   * Supports both controlled (`expandedRowKeys`) and uncontrolled modes.
   *
   * @example
   * expandable={{
   *   rowExpandable: (record) => record.hasDetails,
   *   expandedRowRender: (record) => <DetailPanel record={record} />,
   * }}
   */
  readonly rowSelection?: RowSelectionConfig<T>;

  /**
   * Called when the user scrolls near the bottom of the table.
   * Use this for infinite scroll / load-more behavior.
   * Fires when the last visible row is within `onEndReachedThreshold` rows of the end.
   *
   * A debounce guard prevents this from firing repeatedly — it resets automatically
   * when `data.length` changes or when `isLoading` flips back to `false`.
   *
   * @example
   * onEndReached={() => {
   *   if (!isLoading) fetchNextPage();
   * }}
   */
  readonly onEndReached?: () => void;

  /**
   * How many rows from the end of the list should trigger `onEndReached`.
   * A higher value triggers loading earlier (more buffer); lower means later.
   *
   * @default 5
   *
   * @example
   * onEndReachedThreshold={10}
   */
  readonly onEndReachedThreshold?: number;

  /**
   * When `true` and `data` is empty, the table renders animated shimmer
   * skeleton rows instead of the empty state or real data.
   *
   * When `true` and `data` is non-empty (e.g. loading the next page in
   * infinite scroll), a small number of shimmer rows are appended at the
   * bottom below the real data.
   *
   * @default false
   *
   * @example
   * isLoading={isFetching}
   */
  readonly isLoading?: boolean;

  /**
   * Scroll indicator configuration (reserved for future use).
   * Currently unused but accepted to avoid prop-drilling issues in parent components.
   */
  readonly scrollIndicators?: { vertical?: boolean; horizontal?: boolean };

  /**
   * Called when the user changes the sort direction via the column header context menu.
   *
   * **Server-side sorting**: provide this callback. BoltTable will NOT sort the
   * data locally — it will pass the event to you and display the data as-is.
   *
   * **Client-side sorting** (default): omit this callback. BoltTable will sort
   * the data locally using `column.sorter` or a default comparator.
   *
   * @param columnKey - The `key` of the column being sorted
   * @param direction - The new sort direction, or `null` to clear the sort
   *
   * @example
   * // Server-side
   * onSortChange={(key, dir) => {
   *   setSortKey(key);
   *   setSortDir(dir);
   *   refetch({ sortKey: key, sortDir: dir });
   * }}
   */
  readonly onSortChange?: (columnKey: string, direction: SortDirection) => void;

  /**
   * Called when the user applies or clears a column filter via the context menu.
   *
   * **Server-side filtering**: provide this callback. BoltTable will NOT filter
   * the data locally — it passes the full filters map to you.
   *
   * **Client-side filtering** (default): omit this callback. BoltTable will filter
   * locally using `column.filterFn` or a default case-insensitive substring match.
   *
   * @param filters - A map of `{ [columnKey]: filterValue }` for all active filters.
   *                  A column is removed from the map when its filter is cleared.
   *
   * @example
   * // Server-side
   * onFilterChange={(filters) => {
   *   setActiveFilters(filters);
   *   refetch({ filters });
   * }}
   */
  readonly onFilterChange?: (filters: Record<string, string>) => void;

  /**
   * Custom items to append to the bottom of the right-click context menu
   * that appears on column headers. These appear after the built-in
   * sort / filter / pin / hide options.
   *
   * @example
   * columnContextMenuItems={[
   *   {
   *     key: 'copy-col',
   *     label: 'Copy column data',
   *     icon: <CopyIcon className="h-3 w-3" />,
   *     onClick: (columnKey) => copyColumnToClipboard(columnKey),
   *   },
   * ]}
   */
  readonly columnContextMenuItems?: ColumnContextMenuItem[];

  /**
   * Controls how the table's height is determined.
   *
   * - `true` (default): the table **auto-sizes** to its content, up to a maximum
   *   of 10 rows. Shorter tables occupy less vertical space. The container uses
   *   `maxHeight` so a smaller flex parent can still clip it.
   *
   * - `false`: the table fills its parent container (`height: 100%`). The parent
   *   is fully responsible for providing a height. Use this when BoltTable is
   *   placed inside a fixed-height container (e.g. a modal, a resizable panel).
   *
   * @default true
   *
   * @example
   * // Table inside a fixed-height panel
   * autoHeight={false}
   */
  readonly autoHeight?: boolean;

  /**
   * When `true`, renders a full shimmer skeleton layout (including column headers)
   * before the table's column widths have been calculated from real data.
   *
   * Use this for the initial page load when you don't yet know the column widths
   * but want to show a realistic skeleton immediately.
   *
   * Differs from `isLoading`:
   * - `layoutLoading=true` → entire grid (headers + rows) is a skeleton
   * - `isLoading=true` → headers are real, only body rows are skeletons
   *
   * @default false
   *
   * @example
   * layoutLoading={!columnsResolved}
   */
  readonly layoutLoading?: boolean;

  /**
   * Custom React node to render when the table has no data and is not loading.
   * Replaces the default "No data" message.
   * The empty state is centered in the visible viewport (sticky left + fixed width)
   * so it always appears centered even when the table is scrolled horizontally.
   *
   * @example
   * emptyRenderer={
   *   <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
   *     <SearchX className="h-8 w-8" />
   *     <p>No results found</p>
   *   </div>
   * }
   */
  readonly emptyRenderer?: React.ReactNode;
}

/**
 * CSS class name overrides for specific regions of BoltTable.
 * All fields are optional — omit any you don't need to customize.
 *
 * @example
 * const classNames: ClassNamesTypes = {
 *   header: 'text-xs font-semibold uppercase text-gray-500',
 *   cell: 'text-sm text-gray-900',
 *   pinnedHeader: 'bg-blue-50 border-r border-blue-200',
 *   pinnedCell: 'bg-blue-50/50',
 * };
 */
export interface ClassNamesTypes {
  /**
   * Applied to all non-pinned column header cells.
   * Pinned headers also receive `pinnedHeader` on top of this.
   */
  header?: string;

  /** Applied to all body cells (both pinned and non-pinned) */
  cell?: string;

  /** Applied to each row's wrapper element (reserved for future use) */
  row?: string;

  /**
   * Applied to the floating drag overlay header shown while dragging a column.
   * Use this to style the "ghost" column that follows the cursor.
   */
  dragHeader?: string;

  /**
   * Applied additionally to pinned column header cells (on top of `header`).
   * Use this to add a border, background, or shadow to distinguish pinned headers.
   */
  pinnedHeader?: string;

  /**
   * Applied additionally to pinned column body cells.
   * Use this to add a border or separator between pinned and scrolling columns.
   */
  pinnedCell?: string;

  /**
   * Applied to the expanded row content panel (the div below an expanded row).
   * Does not affect the row itself, only the expanded panel.
   */
  expandedRow?: string;
}

/**
 * Inline style overrides for specific regions of BoltTable.
 * Applied after all default styles, so these take the highest specificity.
 *
 * All fields accept standard React `CSSProperties` except `pinnedBg`,
 * which accepts a CSS color string directly.
 *
 * @example
 * const styles: StylesTypes = {
 *   header: { fontSize: 12, letterSpacing: '0.05em' },
 *   rowHover: { backgroundColor: '#f8fafc' },
 *   rowSelected: { backgroundColor: '#eff6ff' },
 *   pinnedBg: 'rgba(239, 246, 255, 0.95)',
 * };
 */
export interface StylesTypes {
  /** Inline styles for all non-pinned column header cells */
  header?: CSSProperties;

  /** Inline styles for all body cells */
  cell?: CSSProperties;

  /** Inline styles for each row wrapper (reserved for future use) */
  row?: CSSProperties;

  /**
   * Inline styles for the drag overlay header shown while dragging a column.
   * Applied on top of `header` styles.
   */
  dragHeader?: CSSProperties;

  /**
   * Inline styles for pinned column header cells.
   * Applied on top of `header` styles.
   */
  pinnedHeader?: CSSProperties;

  /**
   * Inline styles for pinned column body cells.
   * Applied on top of `cell` styles.
   */
  pinnedCell?: CSSProperties;

  /** Inline styles for the expanded row content panel */
  expandedRow?: CSSProperties;

  /**
   * CSS color string applied as the background of hovered rows.
   * Defaults to `hsl(var(--muted) / 0.5)` if omitted.
   *
   * @example
   * rowHover: { backgroundColor: '#f8fafc' }
   */
  rowHover?: CSSProperties;

  /**
   * CSS color string applied as the background tint of selected rows.
   * Defaults to `${accentColor}15` (accentColor at 8% opacity).
   *
   * @example
   * rowSelected: { backgroundColor: '#dbeafe' }
   */
  rowSelected?: CSSProperties;

  /**
   * CSS color string for the background of pinned column cells and headers.
   * Accepts any valid CSS color. Defaults to a semi-transparent white/dark
   * based on the current theme.
   *
   * @example
   * pinnedBg: 'rgba(239, 246, 255, 0.9)'
   */
  pinnedBg?: string;
}

/**
 * Shimmer bar widths (%) used for the layout-loading skeleton.
 * Cycled deterministically per (rowIndex × 7 + colIndex) so different cells
 * show different widths without randomness (no hydration mismatches in SSR).
 */
const SHIMMER_WIDTHS = [55, 70, 45, 80, 60, 50, 75, 65, 40, 72];

/**
 * BoltTable — high-performance virtualized React table.
 *
 * Renders only the rows currently visible in the viewport using TanStack Virtual,
 * making it suitable for datasets of any size without performance degradation.
 *
 * @typeParam T - Your row data type. Must extend `DataRecord` (i.e. `Record<string, unknown>`).
 *
 * @example
 * // Minimal usage
 * <BoltTable
 *   columns={[
 *     { key: 'name', dataIndex: 'name', title: 'Name' },
 *     { key: 'email', dataIndex: 'email', title: 'Email' },
 *   ]}
 *   data={users}
 * />
 *
 * @example
 * // Full-featured server-side example
 * <BoltTable<User>
 *   columns={columns}
 *   data={pageData}
 *   rowKey="id"
 *   isLoading={isFetching}
 *   pagination={{ current: page, pageSize: 20, total: totalCount }}
 *   onPaginationChange={(p, size) => fetchPage(p, size)}
 *   onSortChange={(key, dir) => refetch({ sortKey: key, sortDir: dir })}
 *   onFilterChange={(filters) => refetch({ filters })}
 *   rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
 *   expandable={{
 *     rowExpandable: (r) => r.hasDetails,
 *     expandedRowRender: (r) => <DetailPanel record={r} />,
 *   }}
 *   accentColor="#6366f1"
 *   autoHeight={false}
 * />
 */
export default function BoltTable<T extends DataRecord = DataRecord>({
  columns: initialColumns,
  data,
  rowHeight = 40,
  expandedRowHeight = 200,
  maxExpandedRowHeight,
  accentColor = '#1890ff',
  className = '',
  classNames = {},
  styles = {},
  gripIcon,
  hideGripIcon,
  pagination,
  onPaginationChange,
  onColumnResize,
  onColumnOrderChange,
  onColumnPin,
  onColumnHide,
  rowSelection,
  expandable,
  rowKey = 'id',
  onEndReached,
  onEndReachedThreshold = 5,
  isLoading = false,
  onSortChange,
  onFilterChange,
  columnContextMenuItems,
  autoHeight = true,
  layoutLoading,
  emptyRenderer,
}: BoltTableProps<T>) {
  // ─── Internal column state ─────────────────────────────────────────────────
  // BoltTable maintains its own copy of columns so it can track user-driven
  // changes (pinning, hiding) without mutating the parent's array.
  const [columns, setColumns] = useState<ColumnType<T>[]>(initialColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    initialColumns.map((c) => c.key),
  );

  // The key being dragged (null when not dragging)
  const [activeId, setActiveId] = useState<string | null>(null);

  // ─── Sync columns from parent ──────────────────────────────────────────────
  // Uses a content fingerprint to detect real changes vs noise:
  //   - key:    column identity
  //   - hidden: visibility state
  //   - pinned: pin state
  //   - width:  rounded to integer to ignore sub-pixel jitter
  //
  // IMPORTANT: the fingerprint comparison happens inside a useEffect, not during
  // render, to avoid "Cannot update a component while rendering a different
  // component" errors when the parent re-renders with a new array reference.
  const columnsFingerprintRef = useRef('');
  const newFingerprint = initialColumns
    .map((c) => {
      const w =
        typeof c.width === 'number' ? Math.round(c.width) : (c.width ?? '');
      return `${c.key}:${!!c.hidden}:${c.pinned || ''}:${w}`;
    })
    .join('|');

  // Stable ref so the effect always reads the latest initialColumns
  // without adding it to the dependency array
  const initialColumnsRef = useRef(initialColumns);
  initialColumnsRef.current = initialColumns;

  React.useEffect(() => {
    if (columnsFingerprintRef.current === newFingerprint) return;
    columnsFingerprintRef.current = newFingerprint;
    setColumns(initialColumnsRef.current);
    setColumnOrder(initialColumnsRef.current.map((c) => c.key));
  }, [newFingerprint]);

  // ─── Persisted column widths ───────────────────────────────────────────────
  // Stored in a separate state bucket so pagination prop changes (which cause
  // BoltTable to re-render with a new `pagination` object) never reset widths
  // that the user has manually adjusted.
  const safeWidth = (w: unknown, fallback = 150): number =>
    typeof w === 'number' && Number.isFinite(w) ? w : fallback;

  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(
    () => new Map(),
  );
  // Tracks which columns have been manually resized (used to prevent auto-width
  // recalculations from overriding user-set widths in future enhancements)
  const manuallyResizedRef = useRef<Set<string>>(new Set());

  // Merge persisted widths into columns — keeps widths stable across re-renders
  const columnsWithPersistedWidths = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        width: safeWidth(columnWidths.get(col.key) ?? col.width),
      })),
    [columns, columnWidths],
  );

  // ─── Expandable state ──────────────────────────────────────────────────────
  // Supports both controlled (expandedRowKeys from parent) and uncontrolled modes.
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<
    Set<React.Key>
  >(() => {
    if (expandable?.defaultExpandAllRows) {
      return new Set(
        data.map((row, idx) => {
          if (typeof rowKey === 'function') return rowKey(row);
          if (typeof rowKey === 'string')
            return (row[rowKey] as React.Key) ?? idx;
          return idx;
        }),
      );
    }
    return new Set(expandable?.defaultExpandedRowKeys ?? []);
  });

  // Use a string fingerprint of the controlled keys to avoid Set reference
  // inequality causing unnecessary re-renders on every render
  const expandedKeysFingerprint = expandable?.expandedRowKeys
    ?.map(String)
    .join('|');
  const resolvedExpandedKeys = useMemo<Set<React.Key>>(() => {
    if (expandable?.expandedRowKeys !== undefined)
      return new Set(expandable.expandedRowKeys);
    return internalExpandedKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedKeysFingerprint, internalExpandedKeys]);

  const expandableRef = useRef(expandable);
  expandableRef.current = expandable;

  /**
   * Toggles the expanded state of a row.
   * Works in both controlled and uncontrolled modes:
   * - Controlled: derives new set from prop, calls onExpandedRowsChange
   * - Uncontrolled: updates internal state, calls onExpandedRowsChange
   */
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

  // ─── getRowKey ─────────────────────────────────────────────────────────────
  // Always returns a string. Normalizing to string means all key comparisons
  // are string-vs-string regardless of whether parent stores numbers or strings.
  const getRowKey = useCallback(
    (record: T, index: number): string => {
      if (typeof rowKey === 'function') return String(rowKey(record));
      if (typeof rowKey === 'string') {
        const val = record[rowKey];
        return val !== undefined && val !== null ? String(val) : String(index);
      }
      return String(index);
    },
    [rowKey],
  );

  // ─── Normalized selected keys ──────────────────────────────────────────────
  // Pre-normalized to strings once here so Cell never has to deal with
  // mixed number/string comparisons in its includes() checks.
  const normalizedSelectedKeys = useMemo<string[]>(
    () => (rowSelection?.selectedRowKeys ?? []).map((k) => String(k)),
    [rowSelection?.selectedRowKeys],
  );

  // ─── Inject expand column ─────────────────────────────────────────────────
  // Prepends a synthetic '__expand__' column with a render function that shows
  // the chevron toggle button. This approach keeps the expand logic centralized
  // in BoltTable rather than scattered across TableBody.
  const columnsWithExpand = useMemo(() => {
    if (!expandable?.rowExpandable) return columnsWithPersistedWidths;

    const expandColumn: ColumnType<T> = {
      key: '__expand__',
      dataIndex: '__expand__',
      title: '',
      width: 40,
      pinned: 'left',
      hidden: false,
      render: (_, record, index) => {
        const key = getRowKey(record, index);
        const canExpand = expandable.rowExpandable?.(record) ?? true;
        const isExpanded = resolvedExpandedKeys.has(key);

        if (!canExpand)
          return <span style={{ display: 'inline-block', width: 16 }} />;

        // Allow custom expand icons via expandable.expandIcon
        if (typeof (expandable as any).expandIcon === 'function') {
          return (expandable as { expandIcon?: (args: any) => React.ReactNode })
            .expandIcon!({
            expanded: isExpanded,
            onExpand: (_: T, e: React.MouseEvent) => {
              e.stopPropagation();
              toggleExpand(key);
            },
            record,
          });
        }

        // Default expand button: ChevronRight (collapsed) / ChevronDown (expanded)
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(key);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '3px',
              color: accentColor,
            }}
          >
            {isExpanded ? (
              <ChevronDown style={{ width: 14, height: 14 }} />
            ) : (
              <ChevronRight style={{ width: 14, height: 14 }} />
            )}
          </button>
        );
      },
    };

    return [expandColumn, ...columnsWithPersistedWidths];
  }, [
    expandable,
    columnsWithPersistedWidths,
    getRowKey,
    resolvedExpandedKeys,
    toggleExpand,
    accentColor,
  ]);

  // ─── Inject selection column ───────────────────────────────────────────────
  // The render function here is intentionally a no-op placeholder.
  // TableBody's Cell component handles the actual checkbox rendering for
  // __select__ cells using normalizedSelectedKeys passed as direct props.
  // This means selection changes never cause this memo or its siblings to re-run.
  const columnsWithSelection = useMemo(() => {
    if (!rowSelection) return columnsWithExpand;

    const selectionColumn: ColumnType<T> = {
      key: '__select__',
      dataIndex: '__select__',
      title: '',
      width: 48,
      pinned: 'left',
      hidden: false,
      render: () => null,
    };

    return [selectionColumn, ...columnsWithExpand];
  }, [rowSelection, columnsWithExpand]);

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const resizeOverlayRef = useRef<ResizeOverlayHandle>(null);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const [scrollAreaWidth, setScrollAreaWidth] = useState<number>(0);

  // ─── Scroll container width tracking ──────────────────────────────────────
  // Rules to prevent infinite loops:
  //   1. Only track WIDTH (never height — height changes cause DOM changes → loop).
  //   2. Guard with prevWidth ref — setState only fires when value actually changed.
  //   3. Debounce via requestAnimationFrame so multiple ResizeObserver entries
  //      in the same frame collapse into one setState call.
  //   4. Use a callback ref (not useLayoutEffect([])) so the observer re-attaches
  //      whenever the div mounts/unmounts (layoutLoading ternary swaps the element).
  const prevScrollAreaWidthRef = useRef<number>(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  /**
   * Callback ref for the scroll container div.
   * Attaches a ResizeObserver to track the container's width for:
   * - Sizing the empty state panel to the visible viewport width
   * - Sizing expanded row panels to the visible viewport width
   *
   * Also keeps `tableAreaRef.current` in sync for all existing code
   * that reads it (virtualizer, scroll listeners, resize overlay).
   */
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

  // ─── Row hover (zero re-renders — pure DOM) ────────────────────────────────
  // Hover state is tracked via DOM attribute mutation (`data-hover`) instead of
  // React state. This means hovering over rows never causes any React re-renders.
  // The CSS injected in the JSX below targets `[data-row-key][data-hover] > div`
  // to apply the hover background across all column divs for the same row.
  const hoveredRowRef = useRef<string | null>(null);

  React.useEffect(() => {
    const el = tableAreaRef.current;
    if (!el) return;

    const setHover = (key: string | null) => {
      if (hoveredRowRef.current === key) return;
      // Remove data-hover from the previously hovered row's cells
      if (hoveredRowRef.current) {
        el.querySelectorAll(
          `[data-row-key="${hoveredRowRef.current}"]`,
        ).forEach((n) => (n as HTMLElement).removeAttribute('data-hover'));
      }
      hoveredRowRef.current = key;
      // Add data-hover to all cells with the new hovered row key
      if (key) {
        el.querySelectorAll(`[data-row-key="${key}"]`).forEach((n) =>
          (n as HTMLElement).setAttribute('data-hover', ''),
        );
      }
    };

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        '[data-row-key]',
      );
      setHover(target?.dataset.rowKey ?? null);
    };
    const onLeave = () => setHover(null);

    el.addEventListener('mouseover', onOver, { passive: true });
    el.addEventListener('mouseleave', onLeave, { passive: true });
    return () => {
      el.removeEventListener('mouseover', onOver);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // ─── Column resize state ───────────────────────────────────────────────────
  // Stored in a ref (not state) because resize tracking happens on mousemove
  // and must not trigger re-renders during the drag. React state is only
  // updated on mouseup (handleResizeEnd) when the final width is committed.
  const resizeStateRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
    columnIndex: number;
    currentX: number;
  } | null>(null);

  // ─── DnD sensors ──────────────────────────────────────────────────────────
  // PointerSensor handles both mouse and touch drag events.
  const sensors = useSensors(useSensor(PointerSensor));

  /**
   * Called when the user starts dragging a column header.
   * System columns (__select__, __expand__) cannot be dragged.
   */
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.id === '__select__' || event.active.id === '__expand__')
      return;
    setActiveId(event.active.id as string);
  };

  /**
   * Called when the user drops a column header into a new position.
   * Updates column order state and notifies the parent via onColumnOrderChange.
   * The parent callback is deferred with setTimeout to avoid firing inside a
   * React updater (which would cause "Cannot update a component while rendering
   * a different component" if the parent calls its own setState).
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        setTimeout(() => onColumnOrderChange?.(newOrder), 0);
        return newOrder;
      });
    }
    setActiveId(null);
  };

  /**
   * Called on mousedown of a column's resize handle.
   * Captures the start position and initial width, then shows the ResizeOverlay.
   * Pinned columns and system columns (__select__, __expand__) cannot be resized.
   */
  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (columnKey === '__select__' || columnKey === '__expand__') return;

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

    // Show the resize overlay (vertical line + label)
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
          typeof column.title === 'string' ? column.title : String(column.key),
          areaRect,
          headerLeftInContent,
          40, // minimum column width
          scrollTop,
          scrollLeft,
          headerLeftInContent + startWidth,
        );
      }
    }

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  /**
   * Called on every mousemove during a column resize drag.
   * Updates the overlay line position via direct DOM mutation (no React state).
   */
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeStateRef.current) return;
    resizeStateRef.current.currentX = e.clientX;
    resizeOverlayRef.current?.move(e.clientX);
  };

  /**
   * Called on mouseup to commit the new column width.
   * Updates column widths state, notifies the parent, and hides the overlay.
   */
  const handleResizeEnd = React.useCallback(() => {
    if (!resizeStateRef.current) return;
    const { startX, startWidth, currentX, columnKey } = resizeStateRef.current;
    const finalWidth = Math.max(40, startWidth + (currentX - startX));

    manuallyResizedRef.current.add(columnKey);

    setColumnWidths((prev) => {
      const next = new Map(prev);
      next.set(columnKey, finalWidth);
      return next;
    });

    onColumnResize?.(columnKey, finalWidth);
    resizeOverlayRef.current?.hide();
    resizeStateRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [onColumnResize]);

  // ─── Column ordering & pinning ─────────────────────────────────────────────
  // Computes three groups: leftPinned, unpinned, rightPinned.
  // System columns (__select__, __expand__) are always prepended before the
  // user's column order, regardless of where they appear in columnOrder.
  const { leftPinned, unpinned, rightPinned } = useMemo(() => {
    const columnMap = new Map(columnsWithSelection.map((c) => [c.key, c]));
    const systemKeys = [
      ...(rowSelection ? ['__select__'] : []),
      ...(expandable ? ['__expand__'] : []),
    ];

    const visibleColumns = [...systemKeys, ...columnOrder]
      .map((key) => columnMap.get(key))
      .filter((col): col is ColumnType<T> => col !== undefined && !col.hidden);

    const left: ColumnType<T>[] = [],
      center: ColumnType<T>[] = [],
      right: ColumnType<T>[] = [];
    visibleColumns.forEach((col) => {
      if (col.pinned === 'left') left.push(col);
      else if (col.pinned === 'right') right.push(col);
      else center.push(col);
    });
    return { leftPinned: left, unpinned: center, rightPinned: right };
  }, [columnOrder, columnsWithSelection, rowSelection, expandable]);

  // Final ordered columns: left pinned → center → right pinned
  const orderedColumns = useMemo(
    () => [...leftPinned, ...unpinned, ...rightPinned],
    [leftPinned, unpinned, rightPinned],
  );

  // Total pixel width of all columns (used for minWidth on the grid)
  const totalTableWidth = useMemo(
    () =>
      orderedColumns
        .slice(0, -1)
        .reduce((sum, col) => sum + (col.width ?? 150), 0) +
      (orderedColumns.at(-1)?.width ?? 150),
    [orderedColumns],
  );

  // CSS gridTemplateColumns string — last column uses minmax() to stretch
  const gridTemplateColumns = useMemo(() => {
    if (orderedColumns.length === 0) return '';
    return orderedColumns
      .map((col, i) => {
        const w = col.width ?? 150;
        return i === orderedColumns.length - 1
          ? `minmax(${w}px, 1fr)`
          : `${w}px`;
      })
      .join(' ');
  }, [orderedColumns]);

  // Pixel offsets for pinned columns (left offset for left-pinned, right offset for right-pinned)
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

  /**
   * Updates a column's pinned state in internal column state and notifies parent.
   */
  const handleTogglePin = (
    columnKey: string,
    pinned: 'left' | 'right' | false,
  ) => {
    setColumns((prev) =>
      prev.map((col) => (col.key === columnKey ? { ...col, pinned } : col)),
    );
    onColumnPin?.(columnKey, pinned);
  };

  /**
   * Toggles a column's hidden state. Pinned columns cannot be hidden.
   * Notifies parent via onColumnHide.
   */
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

  // ─── Sorting ───────────────────────────────────────────────────────────────
  // When onSortChange is provided → server-side: delegate to parent, no local sort.
  // When undefined → client-side: sort locally inside BoltTable.
  const onSortChangeRef = useRef(onSortChange);
  onSortChangeRef.current = onSortChange;

  const [sortState, setSortState] = useState<{
    key: string;
    direction: SortDirection;
  }>({ key: '', direction: null });

  /**
   * Handles a sort request from a column header context menu.
   *
   * Toggle cycle (no explicit direction): unsorted → asc → desc → unsorted
   * Explicit direction: sets that direction, or clears it if already active.
   */
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
              ? 'asc'
              : prev.direction === 'asc'
                ? 'desc'
                : prev.direction === 'desc'
                  ? null
                  : 'asc';
        }
        const state = { key: next ? columnKey : '', direction: next };
        onSortChangeRef.current?.(columnKey, next);
        return state;
      });
    },
    [],
  );

  // ─── Column filters ────────────────────────────────────────────────────────
  // When onFilterChange is provided → server-side: delegate to parent, no local filter.
  // When undefined → client-side: filter locally inside BoltTable.
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );

  /**
   * Applies a filter value to a column.
   * Removes the key from the filters map when value is empty (cleared).
   * Notifies parent via onFilterChange with the full updated filters map.
   */
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

  /**
   * Clears the filter for a specific column.
   * Convenience wrapper around handleColumnFilter.
   */
  const handleClearFilter = useCallback(
    (columnKey: string) => {
      handleColumnFilter(columnKey, '');
    },
    [handleColumnFilter],
  );

  // ─── Local sort + filter ───────────────────────────────────────────────────
  // Only applies when the corresponding server-side callback is NOT provided.
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  const columnsLookupRef = useRef(initialColumns);
  columnsLookupRef.current = initialColumns;

  const processedData = useMemo(() => {
    let result = data;

    // Client-side filter (skipped when onFilterChange is provided)
    if (!onFilterChangeRef.current) {
      const filterKeys = Object.keys(columnFilters);
      if (filterKeys.length > 0) {
        result = result.filter((row) =>
          filterKeys.every((key) => {
            const col = columnsLookupRef.current.find((c) => c.key === key);
            if (typeof col?.filterFn === 'function') {
              return col.filterFn(columnFilters[key], row, col.dataIndex);
            }
            // Default: case-insensitive substring match
            const cellVal = String(row[key] ?? '').toLowerCase();
            return cellVal.includes(columnFilters[key].toLowerCase());
          }),
        );
      }
    }

    // Client-side sort (skipped when onSortChange is provided)
    if (!onSortChangeRef.current && sortState.key && sortState.direction) {
      const dir = sortState.direction === 'asc' ? 1 : -1;
      const key = sortState.key;
      const col = columnsLookupRef.current.find((c) => c.key === key);

      if (typeof col?.sorter === 'function') {
        const sorterFn = col.sorter;
        result = [...result].sort((a, b) => sorterFn(a, b) * dir);
      } else {
        result = [...result].sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (typeof aVal === 'number' && typeof bVal === 'number')
            return (aVal - bVal) * dir;
          return String(aVal).localeCompare(String(bVal)) * dir;
        });
      }
    }

    return result;
  }, [data, sortState, columnFilters]);

  // ─── Scroll to top when filters change ────────────────────────────────────
  // Prevents the user from being stuck on page 3 after narrowing the filter
  // results to only 1 page.
  const columnFiltersKey = Object.keys(columnFilters)
    .sort()
    .map((k) => `${k}:${columnFilters[k]}`)
    .join('|');
  React.useEffect(() => {
    tableAreaRef.current?.scrollTo({ top: 0 });
  }, [columnFiltersKey]);

  // ─── Client-side pagination ────────────────────────────────────────────────
  // When the parent passes ALL data and pagination is enabled, BoltTable
  // slices to the current page. Server-side paginated data (already one page)
  // passes through unmodified since data.length <= pageSize in that case.
  const pgEnabled = pagination !== false && !!pagination;
  const pgSize = pgEnabled ? (pagination.pageSize ?? 10) : 10;
  const pgCurrent = pgEnabled ? Number(pagination.current ?? 1) : 1;
  const needsClientPagination = pgEnabled && processedData.length > pgSize;

  const paginatedData = useMemo(() => {
    if (!needsClientPagination) return processedData;
    const start = (pgCurrent - 1) * pgSize;
    return processedData.slice(start, start + pgSize);
  }, [processedData, needsClientPagination, pgCurrent, pgSize]);

  // ─── Shimmer data ──────────────────────────────────────────────────────────
  // Full-screen shimmer: data is empty AND isLoading=true
  const shimmerCount = pgEnabled ? pgSize : 15;
  const showShimmer = isLoading && processedData.length === 0;
  const shimmerData = useMemo(() => {
    if (!showShimmer) return null;
    return Array.from(
      { length: shimmerCount },
      (_, i) =>
        ({
          [typeof rowKey === 'string' ? rowKey : 'id']: `__shimmer_${i}__`,
        }) as T,
    );
  }, [showShimmer, shimmerCount, rowKey]);

  // ─── Infinite scroll shimmer ───────────────────────────────────────────────
  // Appends shimmer rows below real data while loading the next page
  const INFINITE_SHIMMER_COUNT = 5;
  const infiniteLoadingShimmer = useMemo(() => {
    if (!isLoading || paginatedData.length === 0 || showShimmer) return null;
    if (pgEnabled) return null;
    return Array.from(
      { length: INFINITE_SHIMMER_COUNT },
      (_, i) =>
        ({
          [typeof rowKey === 'string' ? rowKey : 'id']: `__shimmer_${i}__`,
        }) as T,
    );
  }, [isLoading, paginatedData.length, showShimmer, pgEnabled, rowKey]);

  // Final data handed to the virtualizer
  const displayData = useMemo(() => {
    if (shimmerData) return shimmerData;
    if (infiniteLoadingShimmer)
      return [...paginatedData, ...infiniteLoadingShimmer];
    return paginatedData;
  }, [shimmerData, infiniteLoadingShimmer, paginatedData]);

  // ─── Expanded row height measurement ──────────────────────────────────────
  // Cache of measured content heights keyed by row key.
  // Updated by MeasuredExpandedRow via onExpandedRowResize.
  const measuredExpandedHeights = useRef<Map<string, number>>(new Map());

  // Debounce RAF ref — collapses rapid ResizeObserver callbacks into one virtualizer.measure()
  const expandedRowMeasureRafRef = useRef<number | null>(null);

  /**
   * Called by MeasuredExpandedRow when an expanded row's content height changes.
   * Updates the cached height and triggers a virtualizer re-measure.
   * Debounced via requestAnimationFrame to batch rapid resize events.
   */
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

  // ─── Virtualizer ───────────────────────────────────────────────────────────
  const rowVirtualizer = useVirtualizer({
    count: displayData.length,
    getScrollElement: () => tableAreaRef.current,
    estimateSize: (index) => {
      if (shimmerData) return rowHeight;
      const key = getRowKey(displayData[index], index);
      if (!resolvedExpandedKeys.has(key)) return rowHeight;
      // Use measured height if available, otherwise fall back to expandedRowHeight estimate
      const cached = measuredExpandedHeights.current.get(key);
      return cached ? rowHeight + cached : rowHeight + expandedRowHeight;
    },
    overscan: 5, // Render 5 extra rows above and below the visible window
    getItemKey: (index) =>
      shimmerData
        ? `__shimmer_${index}__`
        : getRowKey(displayData[index], index),
  });

  const rowVirtualizerRef = useRef(rowVirtualizer);
  rowVirtualizerRef.current = rowVirtualizer;

  // Re-measure virtualizer when expanded keys change.
  // Uses a string fingerprint to avoid re-measuring when the Set reference
  // changes but the contents are identical.
  const resolvedExpandedKeysFingerprint = Array.from(resolvedExpandedKeys)
    .sort()
    .join(',');
  React.useLayoutEffect(() => {
    rowVirtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedExpandedKeysFingerprint]);

  // ─── Infinite scroll / end-reach detection ────────────────────────────────
  // Fires onEndReached when the last visible row is within threshold rows of the end.
  const endReachedFiredRef = useRef(false);
  const onEndReachedRef = useRef(onEndReached);
  onEndReachedRef.current = onEndReached;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  // Reset the end-reached guard when new data arrives or loading finishes.
  // The 200ms delay gives the table time to re-render with new data before
  // allowing onEndReached to fire again.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      endReachedFiredRef.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [data.length, isLoading]);

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

    el.addEventListener('scroll', checkEndReached, { passive: true });
    return () => el.removeEventListener('scroll', checkEndReached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayData.length, onEndReachedThreshold]);

  // The column currently being dragged (used to render the DragOverlay)
  const activeColumn = activeId
    ? orderedColumns.find((col) => col.key === activeId)
    : null;

  // ─── Pagination values ─────────────────────────────────────────────────────
  const currentPage = pgCurrent;
  const pageSize = pgSize;

  const rawTotal = pgEnabled
    ? (pagination.total ??
      (needsClientPagination ? processedData.length : data.length))
    : data.length;

  // Freeze the last known good total while loading to prevent "Showing 1-0 of 0"
  // flicker on every API call.
  const lastKnownTotalRef = useRef<number>(0);
  if (!isLoading || rawTotal > 0) {
    lastKnownTotalRef.current = rawTotal;
  }
  const total =
    isLoading && lastKnownTotalRef.current > 0
      ? lastKnownTotalRef.current
      : rawTotal;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) onPaginationChange?.(p, pageSize);
  };
  const handlePageSizeChange = (s: number) => onPaginationChange?.(1, s);

  // Scroll to top when page changes in client-side pagination
  React.useEffect(() => {
    if (needsClientPagination) {
      tableAreaRef.current?.scrollTo({ top: 0 });
    }
  }, [pgCurrent, needsClientPagination]);

  /**
   * Computes the page numbers to show in the pagination footer.
   * Uses two distinct ellipsis string literals ('ellipsis-left', 'ellipsis-right')
   * so React never sees duplicate keys when both ellipses appear simultaneously.
   *
   * For ≤ 7 total pages, shows all page numbers.
   * For > 7 pages, shows: [1, ..., currentPage-1, currentPage, currentPage+1, ..., last]
   */
  const getPageNumbers = (): (
    | number
    | 'ellipsis-left'
    | 'ellipsis-right'
  )[] => {
    if (totalPages <= 7)
return Array.from({ length: totalPages }, (_: unknown, i: number) => i + 1)

    const leftSibling = Math.max(currentPage - 1, 2);
    const showLeftEllipsis = leftSibling > 2;
    const rightSibling = Math.min(currentPage + 1, totalPages - 1);
    const showRightEllipsis = currentPage < totalPages - 3;

    if (!showLeftEllipsis && showRightEllipsis)
      return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
    if (showLeftEllipsis && !showRightEllipsis)
      return [
        1,
        'ellipsis-left',
...Array.from({ length: 5 }, (_: unknown, i: number) => totalPages - 4 + i),
      ];
    return [
      1,
      'ellipsis-left',
      leftSibling,
      currentPage,
      rightSibling,
      'ellipsis-right',
      totalPages,
    ];
  };

  // ─── Height calculation ────────────────────────────────────────────────────
  // autoHeight=true  → grows to fit rows, capped at MAX_AUTO_ROWS.
  //                    Uses maxHeight (not height) so a smaller parent
  //                    can still constrain it.
  // autoHeight=false → fills parent container via flex-1 / h-full.
  const HEADER_HEIGHT = 36;
  const MAX_AUTO_ROWS = 10;
  const naturalContentHeight = rowVirtualizer.getTotalSize() + HEADER_HEIGHT;
  const maxAutoHeight = MAX_AUTO_ROWS * rowHeight + HEADER_HEIGHT;
  const isEmpty = displayData.length === 0 && !showShimmer;
  const emptyMinHeight = 4 * rowHeight + HEADER_HEIGHT;

  const clampedAutoHeight = isEmpty
    ? emptyMinHeight
    : Math.min(naturalContentHeight, maxAutoHeight);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`flex ${autoHeight ? 'max-h-full' : 'h-full'} w-full flex-col ${className}`}
      >
        {/*
         * ── Injected CSS for hover/selection ──────────────────────────────
         * Row hover and selection backgrounds are handled via pure CSS attribute
         * selectors targeting data-hover and data-selected attributes.
         * This means no React re-renders occur during hover or selection changes.
         *
         * [data-row-key][data-hover] > div    → hover background
         * [data-row-key][data-selected] > div → selected background
         */}
        <style>{`
          [data-row-key][data-hover] > div {
            background-color: ${styles.rowHover?.backgroundColor ?? `hsl(var(--muted) / 0.5)`};
          }
          [data-row-key][data-selected] > div {
            background-color: ${styles.rowSelected?.backgroundColor ?? `${accentColor}15`};
          }
          [data-row-key][data-selected][data-hover] > div {
            background-color: ${styles.rowSelected?.backgroundColor ?? `${accentColor}25`};
          }
        `}</style>

        {/*
         * ── Scroll wrapper ───────────────────────────────────────────────
         * autoHeight=true:
         *   height + maxHeight = clampedAutoHeight snaps wrapper to content
         *   flexShrink=1 allows a smaller flex parent to shrink it
         * autoHeight=false:
         *   flex-1 fills remaining parent height (parent must have a height)
         */}
        <div
          className={`relative ${autoHeight ? '' : 'flex-1'}`}
          style={
            autoHeight
              ? {
                  height: `${clampedAutoHeight}px`,
                  maxHeight: `${clampedAutoHeight}px`,
                  flexShrink: 1,
                  flexGrow: 0,
                }
              : undefined
          }
        >
          {layoutLoading ? (
            /*
             * ── Layout loading skeleton ──────────────────────────────────
             * Shown when layoutLoading=true. Renders real column headers
             * (based on orderedColumns) alongside shimmer body rows.
             * Used for initial page load when column widths are not yet known.
             */
            <div
              className="absolute inset-0 overflow-auto"
              style={{ contain: 'layout paint' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns,
                  gridTemplateRows: '36px auto',
                  minWidth: `${totalTableWidth}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {orderedColumns.map((column) => {
                  const isPinned = !!column.pinned;
                  const offset = columnOffsets.get(column.key);
                  const isSystem =
                    column.key === '__select__' || column.key === '__expand__';
                  return (
                    <div
                      key={column.key}
                      className={`flex h-9 items-center truncate border-t border-b ${
                        isPinned
                          ? `bg-background backdrop-blur ${classNames.pinnedHeader ?? ''}`
                          : `bg-muted/40 backdrop-blur ${classNames.header ?? ''}`
                      }`}
                      style={{
                        position: 'sticky',
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

                <div style={{ gridColumn: '1 / -1' }}>
                  {Array.from({ length: shimmerCount }).map((_, rowIndex) => (
                    <div
                      key={rowIndex}
                      style={{
                        display: 'grid',
                        gridTemplateColumns,
                        height: rowHeight,
                      }}
                    >
                      {orderedColumns.map((column, colIndex) => {
                        const isPinned = !!column.pinned;
                        const offset = columnOffsets.get(column.key);
                        const isSystem =
                          column.key === '__select__' ||
                          column.key === '__expand__';
                        const widthPercent =
                          SHIMMER_WIDTHS[
                            (rowIndex * 7 + colIndex) % SHIMMER_WIDTHS.length
                          ];
                        return (
                          <div
                            key={column.key}
                            className={`flex items-center border-b ${
                              isPinned
                                ? `bg-background ${classNames.pinnedCell ?? ''}`
                                : ''
                            }`}
                            style={{
                              ...(isPinned
                                ? {
                                    position: 'sticky' as const,
                                    [column.pinned as string]: offset ?? 0,
                                    zIndex: 5,
                                    ...styles.pinnedCell,
                                  }
                                : {}),
                              paddingLeft: isSystem ? 0 : 8,
                              paddingRight: isSystem ? 0 : 8,
                              justifyContent: isSystem ? 'center' : undefined,
                            }}
                          >
                            <div
                              className="bg-muted-foreground/15 animate-pulse rounded"
                              style={{
                                height: isSystem ? 16 : 14,
                                width: isSystem ? 16 : `${widthPercent}%`,
                                borderRadius: isSystem ? 3 : 4,
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
            /*
             * ── Main scroll container ────────────────────────────────────
             * absolute inset-0 so it fills whatever height the wrapper resolves to.
             * contain: layout paint — browser optimization hint that this element
             * is a layout and paint boundary (improves compositing performance).
             */
            <div
              ref={tableAreaCallbackRef}
              className="absolute inset-0 overflow-auto"
              style={{ contain: 'layout paint' }}
            >
              {/* Resize overlay — positioned inside scroll container so it scrolls with content */}
              <ResizeOverlay ref={resizeOverlayRef} accentColor={accentColor} />

              {/*
               * ── CSS Grid ─────────────────────────────────────────────
               * Row 1 (36px): sticky column headers
               * Row 2 (1fr):  table body (fills remaining space)
               *
               * The 1fr row lets the empty-state div use height:100% without
               * any JS measurement — it works in both autoHeight and flex modes.
               */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns,
                  gridTemplateRows: '36px 1fr',
                  minWidth: `${totalTableWidth}px`,
                  height: '100%',
                  width: '100%',
                  position: 'relative',
                }}
              >
                {/* ── Column headers ─────────────────────────────────── */}
                <SortableContext
                  items={columnOrder}
                  strategy={horizontalListSortingStrategy}
                >
                  {orderedColumns.map((column, visualIndex) => {
                    // Selection column header — custom render with "select all" checkbox
                    if (column.key === '__select__' && rowSelection) {
                      return (
                        <div
                          key="__select__"
                          className={`bg-muted/40 sticky flex h-9 items-center justify-center truncate border-t border-b backdrop-blur ${classNames.header ?? ''} ${classNames.pinnedHeader ?? ''} `}
                          style={{
                            position: 'sticky',
                            left: columnOffsets.get('__select__') ?? 0,
                            top: 0,
                            zIndex: 13,
                            width: '48px',
                            ...styles.header,
                            ...styles.pinnedHeader,
                          }}
                        >
                          {/* "Select all" checkbox — hidden in radio mode or when hideSelectAll=true */}
                          {rowSelection.type !== 'radio' &&
                            !rowSelection.hideSelectAll && (
                              <input
                                type="checkbox"
                                checked={
                                  data.length > 0 &&
                                  normalizedSelectedKeys.length === data.length
                                }
                                ref={(input) => {
                                  if (input) {
                                    // Indeterminate state: some (not all) rows are selected
                                    input.indeterminate =
                                      normalizedSelectedKeys.length > 0 &&
                                      normalizedSelectedKeys.length <
                                        data.length;
                                  }
                                }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const allKeys = data.map((row, idx) =>
                                      getRowKey(row, idx),
                                    );
                                    rowSelection.onSelectAll?.(
                                      true,
                                      data,
                                      data,
                                    );
                                    rowSelection.onChange?.(allKeys, data, {
                                      type: 'all',
                                    });
                                  } else {
                                    rowSelection.onSelectAll?.(false, [], data);
                                    rowSelection.onChange?.([], [], {
                                      type: 'all',
                                    });
                                  }
                                }}
                                className="cursor-pointer"
                                style={{ accentColor }}
                              />
                            )}
                        </div>
                      );
                    }

                    // Expand column header — empty cell (no content needed)
                    if (column.key === '__expand__') {
                      return (
                        <div
                          key="__expand__"
                          className={`bg-muted/40 sticky flex h-9 items-center justify-center truncate border-t border-b backdrop-blur ${classNames.header ?? ''} ${classNames.pinnedHeader ?? ''}`}
                          style={{
                            position: 'sticky',
                            left: columnOffsets.get('__expand__') ?? 0,
                            top: 0,
                            zIndex: 13,
                            width: '40px',
                            ...styles.header,
                            ...styles.pinnedHeader,
                          }}
                        />
                      );
                    }

                    // Regular column header — drag/sort/filter/resize/context-menu
                    return (
                      <DraggableHeader
                        key={column.key}
                        column={column as ColumnType<DataRecord>}
                        accentColor={accentColor}
                        visualIndex={visualIndex}
                        onResizeStart={handleResizeStart}
                        styles={styles}
                        classNames={classNames}
                        gripIcon={gripIcon}
                        hideGripIcon={hideGripIcon}
                        stickyOffset={columnOffsets.get(column.key)}
                        onTogglePin={handleTogglePin}
                        onToggleHide={handleToggleHide}
                        isLastColumn={visualIndex === orderedColumns.length - 1}
                        sortDirection={
                          sortState.key === column.key
                            ? sortState.direction
                            : null
                        }
                        onSort={handleSort}
                        filterValue={columnFilters[column.key] ?? ''}
                        onFilter={handleColumnFilter}
                        onClearFilter={handleClearFilter}
                        customContextMenuItems={columnContextMenuItems}
                      />
                    );
                  })}
                </SortableContext>

                {isEmpty ? (
                  /*
                   * ── Empty state ────────────────────────────────────────
                   * col-span-full + height:100% fills the 1fr body grid row.
                   *
                   * The inner div uses `position: sticky; left: 0` with a fixed
                   * width (scrollAreaWidth) to viewport-lock the empty state panel.
                   * Without this, the empty message would scroll horizontally
                   * with the grid content when there are many columns.
                   */
                  <div
                    className="col-span-full"
                    style={{ height: '100%', position: 'relative' }}
                  >
                    <div
                      style={{
                        position: 'sticky',
                        left: 0,
                        width:
                          scrollAreaWidth > 0 ? `${scrollAreaWidth}px` : '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {emptyRenderer ?? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 py-8">
                          <span className="text-sm">No data</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── Virtualized table body ─────────────────────────── */
                  <TableBody
                    data={displayData as DataRecord[]}
                    orderedColumns={orderedColumns as ColumnType<DataRecord>[]}
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
                      getRowKey as (record: DataRecord, index: number) => string
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
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Pagination footer ──────────────────────────────────────────────
         * Only rendered when pagination !== false.
         * Shows: [range info] [page buttons] [page size selector]
         */}
        {pagination !== false && (
          <div
            className="flex h-9 items-center justify-between border-t px-3 text-xs backdrop-blur"
            style={{
              backgroundColor: 'hsl(var(--background)/0.4)',
              gap: '12px',
            }}
          >
            {/* Left section: "X-Y of Z" range indicator */}
            <div className="flex flex-1 items-center">
              {(() => {
                const rangeStart =
                  total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
                const rangeEnd = Math.min(currentPage * pageSize, total);
                return pagination?.showTotal ? (
                  <span className="text-muted-foreground text-xs">
                    Showing{' '}
                    {pagination.showTotal(total, [rangeStart, rangeEnd])} of{' '}
                    {total} items
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {rangeStart}–{rangeEnd} of {total}
                  </span>
                );
              })()}
            </div>

            {/* Center section: page number buttons */}
            <div className="flex flex-1 items-center justify-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                title="First page"
              >
                <ChevronsLeft className="h-3 w-3" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                title="Previous page"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              {getPageNumbers().map((page) => {
                if (page === 'ellipsis-left' || page === 'ellipsis-right') {
                  return (
                    <span
                      key={page}
                      className="text-muted-foreground px-1 text-xs select-none"
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    style={{
                      color: page === currentPage ? accentColor : undefined,
                    }}
                    onClick={() => handlePageChange(page as number)}
                    className="inline-flex h-6 min-w-6 cursor-pointer items-center justify-center rounded px-1.5 text-xs transition-colors"
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                title="Next page"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                title="Last page"
              >
                <ChevronsRight className="h-3 w-3" />
              </button>
            </div>

            {/* Right section: rows-per-page selector */}
            <div className="flex flex-1 items-center justify-end gap-2">
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-background text-foreground hover:border-primary cursor-pointer rounded border px-1.5 py-0.5 text-xs"
                style={{ height: '24px' }}
              >
                {[10, 15, 20, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/*
       * ── Drag overlay ──────────────────────────────────────────────────────
       * Renders a "ghost" version of the dragged column header that follows
       * the cursor during a drag operation. Only shown when activeColumn is set.
       */}
      <DragOverlay>
        {activeColumn ? (
          <div
            className={`flex h-9 items-center truncate overflow-hidden border border-dashed shadow-md backdrop-blur ${classNames.header ?? ''} ${classNames.dragHeader ?? ''}`}
            style={{
              width: `${activeColumn.width ?? 150}px`,
              cursor: 'grabbing',
              ...styles.header,
              ...styles.dragHeader,
            }}
          >
            <div className="relative z-10 flex h-full flex-1 items-center gap-1 truncate overflow-hidden px-2 font-medium">
              <GripVertical className="h-3 w-3 shrink-0" />
              <div className="min-w-0 truncate overflow-hidden text-left text-ellipsis whitespace-nowrap select-none">
                {typeof activeColumn.title === 'string'
                  ? activeColumn.title
                  : activeColumn.key}
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}