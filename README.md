# bolt-table

A high-performance, zero-dependency\* React table component. Only the rows visible in the viewport are ever in the DOM — making it fast for datasets of any size using [TanStack Virtual](https://tanstack.com/virtual).

[![npm version](https://img.shields.io/npm/v/bolt-table)](https://www.npmjs.com/package/bolt-table)
[![license](https://img.shields.io/npm/l/bolt-table)](./LICENSE)
[![github](https://img.shields.io/badge/GitHub-Source-181717?logo=github)](https://github.com/venkateshwebdev/Bolt-Table)
[![website](https://img.shields.io/badge/Website-Live_Demo-blue?logo=vercel)](https://bolt-table.vercel.app/)

---

## Features

- **Row virtualization** — only visible rows are rendered, powered by TanStack Virtual
- **Horizontal virtualization** — optionally render only visible columns (great for 100+ column tables)
- **Dynamic row heights** — auto-measure row heights from content instead of using a fixed `rowHeight`
- **Drag to reorder columns** — custom zero-dependency drag-and-drop (no @dnd-kit needed)
- **Column pinning** — pin columns to the left or right edge via right-click
- **Column resizing** — drag the right edge of any header to resize
- **Column hiding** — hide/show columns via the right-click context menu
- **Column picker** — built-in checklist panel to toggle multiple columns on/off at once
- **Column persistence** — optional localStorage save/restore of column order, widths, visibility, and pinned state
- **Global search** — a search bar above the table that filters all rows across every column
- **Sorting** — client-side or server-side, with custom comparators per column
- **Filtering** — client-side or server-side, with custom filter functions per column
- **Pagination** — client-side slice or server-side with full control
- **Row selection** — checkbox or radio, with select-all, indeterminate state, and disabled rows
- **Expandable rows** — auto-measured content panels below each row, controlled or uncontrolled
- **Shimmer loading** — animated skeleton rows on initial load and infinite scroll append
- **Infinite scroll** — `onEndReached` callback with configurable threshold
- **Empty state** — custom renderer or default "No data" message
- **Auto height** — table shrinks/grows to fit rows, capped at 10 rows by default
- **Row pinning** — pin rows to the top or bottom of the table, sticky during vertical scroll
- **Cell context menu** — right-click (or long-press on mobile) any cell to pin rows or copy values
- **Right-click context menu** — sort, filter, pin, hide, plus custom items
- **Mobile-friendly context menus** — long-press (touch-and-hold) triggers context menus on touch devices
- **Nested / grouped columns** — group related columns under a shared header spanning multiple columns
- **Duplicate key safety** — automatically deduplicates row keys when data contains rows with the same ID
- **Theme-agnostic** — works in light and dark mode out of the box, no CSS variables needed
- **Editable cells** — right-click any cell on an `editable` column to inline-edit via the context menu
- **Custom icons** — override any built-in icon via the `icons` prop

---

## Installation

```bash
npm install bolt-table @tanstack/react-virtual
```

That's it. No other peer dependencies.

---

## Quick start

```tsx
import { BoltTable, ColumnType } from 'bolt-table';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

const columns: ColumnType<User>[] = [
  { key: 'name',  dataIndex: 'name',  title: 'Name',  width: 200 },
  { key: 'email', dataIndex: 'email', title: 'Email', width: 280 },
  { key: 'age',   dataIndex: 'age',   title: 'Age',   width: 80  },
];

const data: User[] = [
  { id: '1', name: 'Alice',   email: 'alice@example.com',   age: 28 },
  { id: '2', name: 'Bob',     email: 'bob@example.com',     age: 34 },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 22 },
];

export default function App() {
  return (
    <BoltTable<User>
      columns={columns}
      data={data}
      rowKey="id"
    />
  );
}
```

---

## Next.js (App Router)

BoltTable uses browser APIs and must be wrapped in a client boundary:

```tsx
'use client';
import { BoltTable } from 'bolt-table';
```

---

## Styling

BoltTable uses **inline CSS styles** for all defaults — no Tailwind, no CSS variables, no external stylesheets required. It works out of the box in any React project, light or dark mode.

You can customize everything via the `styles` and `classNames` props, including headers, cells, rows, pinned regions, and pagination. If your project uses Tailwind, you can pass Tailwind classes through `classNames` and they'll be applied on top of the inline defaults.

### Custom icons

All built-in icons are inline SVGs. Override any icon via the `icons` prop:

```tsx
import type { BoltTableIcons } from 'bolt-table';

<BoltTable
  icons={{
    gripVertical: <MyGripIcon size={12} />,
    sortAsc: <MySortUpIcon size={12} />,
    chevronsLeft: <MyFirstPageIcon size={12} />,
    search: <MySearchIcon size={14} />,
    columns: <MyColumnsIcon size={14} />,
    close: <MyXIcon size={12} />,
  }}
/>
```

Available icon keys: `gripVertical`, `sortAsc`, `sortDesc`, `filter`, `filterClear`, `pin`, `pinOff`, `eyeOff`, `chevronDown`, `chevronLeft`, `chevronRight`, `chevronsLeft`, `chevronsRight`, `copy`, `edit`, `search`, `columns`, `close`.

---

## Props

### `BoltTable`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnType<T>[]` | — | Column definitions (required) |
| `data` | `T[]` | — | Row data array (required) |
| `rowKey` | `string \| (record: T) => string` | `'id'` | Unique row identifier. Duplicate keys are handled automatically |
| `rowHeight` | `number` | `40` | Base height of each row in pixels |
| `expandedRowHeight` | `number` | `200` | Estimated height for expanded rows |
| `maxExpandedRowHeight` | `number` | — | Max height for expanded row panels (makes them scrollable) |
| `accentColor` | `string` | `'#1890ff'` | Color used for sort icons, selected rows, resize line, etc. |
| `className` | `string` | `''` | Class name for the outer wrapper |
| `classNames` | `ClassNamesTypes` | `{}` | Granular class overrides per table region |
| `styles` | `StylesTypes` | `{}` | Inline style overrides per table region |
| `icons` | `BoltTableIcons` | — | Custom icon overrides for built-in SVG icons |
| `gripIcon` | `ReactNode` | — | Custom drag grip icon (deprecated, use `icons.gripVertical`) |
| `hideGripIcon` | `boolean` | `false` | Hide the drag grip icon from all headers |
| `pagination` | `PaginationType \| false` | — | Pagination config, or `false` to disable |
| `onPaginationChange` | `(page, pageSize) => void` | — | Called when page or page size changes |
| `onColumnResize` | `(columnKey, newWidth) => void` | — | Called when a column is resized |
| `onColumnOrderChange` | `(newOrder) => void` | — | Called when columns are reordered |
| `onColumnPin` | `(columnKey, pinned) => void` | — | Called when a column is pinned/unpinned |
| `onColumnHide` | `(columnKey, hidden) => void` | — | Called when a column is hidden/shown |
| `rowSelection` | `RowSelectionConfig<T>` | — | Row selection config |
| `rowPinning` | `RowPinningConfig` | — | Row pinning config (`{ top?: Key[], bottom?: Key[] }`) |
| `onRowPin` | `(rowKey, pinned) => void` | — | Called when a row is pinned/unpinned via cell context menu |
| `expandable` | `ExpandableConfig<T>` | — | Expandable row config |
| `onEndReached` | `() => void` | — | Called when scrolled near the bottom (infinite scroll) |
| `onEndReachedThreshold` | `number` | `5` | Rows from end to trigger `onEndReached` |
| `isLoading` | `boolean` | `false` | Shows shimmer skeleton rows when `true` |
| `onSortChange` | `(columnKey, direction) => void` | — | Server-side sort handler (disables local sort) |
| `onFilterChange` | `(filters) => void` | — | Server-side filter handler (disables local filter) |
| `columnContextMenuItems` | `ColumnContextMenuItem[]` | — | Custom items appended to the header context menu |
| `autoHeight` | `boolean` | `true` | Auto-size table height to content (capped at 10 rows) |
| `layoutLoading` | `boolean` | `false` | Show full skeleton layout (headers + rows) |
| `emptyRenderer` | `ReactNode` | — | Custom empty state content |
| `rowClassName` | `(record, index) => string` | — | Returns a CSS class name for conditional row styling |
| `rowStyle` | `(record, index) => CSSProperties` | — | Returns inline styles for conditional row styling |
| `disabledFilters` | `boolean` | `false` | Removes the filter option from all header context menus |
| `onCopy` | `(text, columnKey, record, rowIndex) => void` | — | Called after a cell value is copied to the clipboard |
| `keepPinnedRowsAcrossPages` | `boolean` | `false` | Pinned rows remain visible after navigating to a different page |
| `onEdit` | `(value, record, dataIndex, rowIndex) => void` | — | Called when a user finishes editing an editable cell |
| `onRowClick` | `(record, index, event) => void` | — | Called when a row is clicked; adds pointer cursor to all cells |
| `enableColumnVirtualization` | `boolean` | `false` | Only render columns visible in the viewport. Recommended for 100+ column tables |
| `enableDynamicRowHeight` | `boolean` | `false` | Measure each row's actual content height instead of using a fixed `rowHeight` |
| `columnPersistence` | `ColumnPersistenceConfig \| false` | `false` | Save column order, widths, visibility, and pinned state to localStorage |
| `showColumnSettings` | `boolean` | `true` | Show the column picker button (checklist panel to toggle columns on/off) |
| `hideGlobalSearch` | `boolean` | `false` | Hide the global search input above the table |
| `globalSearchValue` | `string` | — | Controlled global search value |
| `onGlobalSearchChange` | `(value: string) => void` | — | Called when the global search input changes |

---

### `ColumnType<T>`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | — | Unique column identifier (required) |
| `dataIndex` | `string` | — | Row object property to display (required for leaf columns, omit for groups) |
| `title` | `string \| ReactNode` | — | Header label (required) |
| `width` | `number` | `150` | Column width in pixels |
| `render` | `(value, record, index) => ReactNode` | — | Custom cell renderer |
| `shimmerRender` | `() => ReactNode` | — | Custom shimmer skeleton for this column |
| `sortable` | `boolean` | `true` | Show sort controls for this column |
| `sorter` | `boolean \| (a: T, b: T) => number` | — | Custom sort comparator for client-side sort |
| `filterable` | `boolean` | `true` | Show filter option in context menu |
| `filterFn` | `(value, record, dataIndex) => boolean` | — | Custom filter predicate for client-side filter |
| `hidden` | `boolean` | `false` | Hide this column |
| `defaultHidden` | `boolean` | `false` | Hide this column on first render (uncontrolled) |
| `pinned` | `'left' \| 'right' \| false` | `false` | Pin this column to an edge |
| `defaultPinned` | `'left' \| 'right' \| false` | `false` | Pin this column on first render (uncontrolled) |
| `className` | `string` | — | Class applied to all cells in this column |
| `style` | `CSSProperties` | — | Styles applied to all cells in this column |
| `copy` | `boolean \| (value, record, index) => string` | — | Enable "Copy" in cell context menu; function customizes what's copied |
| `editable` | `boolean` | `false` | Cells become inline-editable (no custom `render` required) |
| `children` | `ColumnType<T>[]` | — | Nested child columns. Makes this column a header group — only leaf columns render data |

---

### `ColumnPersistenceConfig`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `storageKey` | `string` | — | localStorage key prefix used to store the state (required) |
| `persistOrder` | `boolean` | `true` | Persist and restore column order |
| `persistWidths` | `boolean` | `true` | Persist and restore column widths |
| `persistVisibility` | `boolean` | `true` | Persist and restore hidden/visible state |
| `persistPinned` | `boolean` | `true` | Persist and restore column pinned state |

---

## Examples

### Global search

BoltTable renders a search bar above the table by default. It searches across **all columns** of every row using a case-insensitive substring match.

```tsx
// Uncontrolled — BoltTable manages the search value internally
<BoltTable columns={columns} data={data} />

// Hide it entirely
<BoltTable columns={columns} data={data} hideGlobalSearch />

// Controlled — drive the search value from outside
const [search, setSearch] = useState('');

<BoltTable
  columns={columns}
  data={data}
  globalSearchValue={search}
  onGlobalSearchChange={setSearch}
/>
```

---

### Column picker

The column picker button ("Columns") is shown in the toolbar by default. Clicking it opens a checklist panel letting users toggle any non-pinned column on or off.

```tsx
// Shown by default — no configuration needed
<BoltTable columns={columns} data={data} />

// Hide the column picker button
<BoltTable columns={columns} data={data} showColumnSettings={false} />
```

> **Note:** Pinned columns cannot be hidden from the picker — unpin them first.

---

### Column persistence

Pass a `columnPersistence` config to automatically save column state to `localStorage`. On the next page load the table restores the saved order, widths, visibility, and pinned state.

```tsx
<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  columnPersistence={{
    storageKey: 'users-table',       // stored as bt_users-table in localStorage
    persistOrder: true,              // default
    persistWidths: true,             // default
    persistVisibility: true,         // default
    persistPinned: true,             // default
  }}
/>
```

To persist only widths (not order or visibility):

```tsx
<BoltTable
  columnPersistence={{
    storageKey: 'orders-table',
    persistOrder: false,
    persistVisibility: false,
    persistPinned: false,
  }}
/>
```

---

### Horizontal virtualization

For tables with a large number of columns enable column virtualization. Only the columns currently visible in the viewport (plus one overscan column on each side) are rendered. Pinned columns always render regardless.

```tsx
<BoltTable
  columns={hundredsOfColumns}
  data={data}
  enableColumnVirtualization
/>
```

> Best suited for tables with 50+ columns. For typical column counts (< 30) the overhead isn't worth it.

---

### Dynamic row heights

When row content can vary in height (e.g. multi-line text, embedded components), enable dynamic row heights. BoltTable uses `ResizeObserver` to measure each row's actual rendered height and updates the virtualizer accordingly.

```tsx
<BoltTable
  columns={columns}
  data={data}
  enableDynamicRowHeight
  rowHeight={40}  // used as the minimum / estimated height
/>
```

The `rowHeight` prop still acts as the minimum and estimated height used before measurement. Rows grow taller as needed based on their content.

---

### Duplicate row keys

If your data can contain rows with the same `id` (or whatever field is used as `rowKey`), BoltTable handles it automatically — no extra configuration needed. Internally it detects duplicates and appends the row index to produce a unique key for the virtualizer and DOM, while still passing the original key to selection and event callbacks.

```tsx
// Works correctly even with duplicate ids
<BoltTable
  columns={columns}
  data={[
    { id: 1, name: 'Alice' },
    { id: 1, name: 'Alice (copy)' }, // same id — renders correctly
  ]}
  rowKey="id"
/>
```

---

### Sorting

**Client-side** (no `onSortChange` — BoltTable sorts locally):

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    sortable: true,
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    key: 'age',
    dataIndex: 'age',
    title: 'Age',
    sortable: true,
  },
];

<BoltTable columns={columns} data={data} />
```

**Server-side** (provide `onSortChange` — BoltTable delegates to you):

```tsx
const [sortKey, setSortKey] = useState('');
const [sortDir, setSortDir] = useState<SortDirection>(null);

<BoltTable
  columns={columns}
  data={serverData}
  onSortChange={(key, dir) => {
    setSortKey(key);
    setSortDir(dir);
    refetch({ sortKey: key, sortDir: dir });
  }}
/>
```

---

### Filtering

**Client-side** (no `onFilterChange`):

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'status',
    dataIndex: 'status',
    title: 'Status',
    filterable: true,
    filterFn: (value, record) => record.status === value,
  },
];
```

**Server-side**:

```tsx
<BoltTable
  columns={columns}
  data={serverData}
  onFilterChange={(filters) => {
    setActiveFilters(filters);
    refetch({ filters });
  }}
/>
```

---

### Pagination

**Client-side** (pass all data, BoltTable slices it):

```tsx
<BoltTable
  columns={columns}
  data={allUsers}
  pagination={{ pageSize: 20 }}
  onPaginationChange={(page, size) => setPage(page)}
/>
```

**Server-side** (pass only the current page):

```tsx
<BoltTable
  columns={columns}
  data={currentPageData}
  pagination={{
    current: page,
    pageSize: 20,
    total: 500,
    showTotal: (total, [from, to]) => `${from}-${to} of ${total} users`,
  }}
  onPaginationChange={(page, size) => fetchPage(page, size)}
/>
```

**Disable pagination:**

```tsx
<BoltTable columns={columns} data={data} pagination={false} />
```

---

### Row selection

```tsx
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  rowSelection={{
    type: 'checkbox',
    selectedRowKeys,
    onChange: (keys, rows) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.status === 'locked',
    }),
  }}
/>
```

---

### Expandable rows

```tsx
<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  expandable={{
    rowExpandable: (record) => record.details !== null,
    expandedRowRender: (record) => (
      <div style={{ padding: 16 }}>
        <h4>{record.name} — Details</h4>
        <pre>{JSON.stringify(record.details, null, 2)}</pre>
      </div>
    ),
  }}
  expandedRowHeight={150}
  maxExpandedRowHeight={400}
/>
```

---

### Infinite scroll

```tsx
const [data, setData] = useState<User[]>([]);
const [isLoading, setIsLoading] = useState(false);

const loadMore = async () => {
  setIsLoading(true);
  const newRows = await fetchNextPage();
  setData(prev => [...prev, ...newRows]);
  setIsLoading(false);
};

<BoltTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  onEndReached={loadMore}
  onEndReachedThreshold={8}
  pagination={false}
/>
```

---

### Column pinning

```tsx
const columns: ColumnType<User>[] = [
  { key: 'name',    dataIndex: 'name',    title: 'Name',    pinned: 'left',  width: 200 },
  { key: 'email',   dataIndex: 'email',   title: 'Email',   width: 250 },
  { key: 'actions', dataIndex: 'actions', title: 'Actions', pinned: 'right', width: 100 },
];
```

Users can also pin/unpin columns at runtime via the right-click context menu.

---

### Row pinning

Pin rows to the top or bottom of the table so they stay visible while scrolling vertically. Pinned rows transcend pagination — they are always visible regardless of which page the user is on.

```tsx
const [rowPinning, setRowPinning] = useState({ top: [], bottom: [] });

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  rowPinning={rowPinning}
  onRowPin={(key, pinned) => {
    setRowPinning(prev => {
      const top = (prev.top ?? []).filter(k => String(k) !== String(key));
      const bottom = (prev.bottom ?? []).filter(k => String(k) !== String(key));
      if (pinned === 'top') top.push(key);
      if (pinned === 'bottom') bottom.push(key);
      return { top, bottom };
    });
  }}
  styles={{ pinnedRowBg: 'rgba(255, 255, 255, 0.95)' }}
/>
```

Users can also pin/unpin rows at runtime via the right-click context menu on any body cell (when `onRowPin` is provided).

Pinned rows use `position: sticky` with `backdropFilter: blur(12px)` and a subtle box-shadow to visually separate them from scrolling content. Customize with `classNames.pinnedRow`, `styles.pinnedRow`, and `styles.pinnedRowBg`.

---

### Cell context menu & copy

Right-click (or long-press on mobile) any body cell to see a context menu with:

- **Pin to Top / Unpin from Top** — shown when `onRowPin` is provided
- **Pin to Bottom / Unpin from Bottom** — shown when `onRowPin` is provided
- **Copy** — shown when the column has `copy: true` or a copy function

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    copy: true, // copies the raw cell value
  },
  {
    key: 'email',
    dataIndex: 'email',
    title: 'Email',
    // Custom copy — control exactly what goes to the clipboard
    copy: (value, record) => `${record.name} <${value}>`,
  },
];
```

The cell context menu only appears when there is at least one action available (either `onRowPin` or `column.copy`). Otherwise, the browser's default context menu is used.

---

### Editable cells

Mark columns as `editable: true` and provide an `onEdit` callback to allow inline editing. Right-click (or long-press on mobile) an editable cell to see the **Edit** option (with a pencil icon) in the context menu. Selecting it turns the cell into an input field. Press **Enter** or click away to commit, **Escape** to cancel.

```tsx
const [data, setData] = useState<User[]>(initialData);

const columns: ColumnType<User>[] = [
  { key: 'name',  dataIndex: 'name',  title: 'Name',  editable: true, width: 200 },
  { key: 'age',   dataIndex: 'age',   title: 'Age',   editable: true, width: 80  },
  {
    key: 'status',
    dataIndex: 'status',
    title: 'Status',
    render: (value) => <span className="badge">{String(value)}</span>,
    editable: true, // ignored — custom render takes precedence
  },
];

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  onEdit={(value, record, dataIndex, rowIndex) => {
    setData(prev =>
      prev.map((row, i) =>
        i === rowIndex ? { ...row, [dataIndex]: value } : row
      )
    );
  }}
/>
```

The edit icon can be customized via the `icons` prop:

```tsx
<BoltTable icons={{ edit: <MyPencilIcon size={14} /> }} />
```

> **Note:** `editable` is skipped for columns that define a custom `render` function — since the cell content is fully controlled by the renderer, inline editing wouldn't know how to display or commit changes. If you need editable custom-rendered cells, handle the editing UX inside your `render` function.

---

### Styling overrides

```tsx
<BoltTable
  columns={columns}
  data={data}
  accentColor="#6366f1"
  classNames={{
    header: 'text-xs uppercase tracking-wider text-gray-500',
    cell: 'text-sm',
    pinnedHeader: 'border-r border-indigo-200',
    pinnedCell: 'border-r border-indigo-100',
  }}
  styles={{
    header: { fontWeight: 600 },
    rowHover: { backgroundColor: '#f0f9ff' },
    rowSelected: { backgroundColor: '#e0e7ff' },
    pinnedBg: 'rgba(238, 242, 255, 0.95)',
  }}
/>
```

---

### Nested / grouped columns

Group related columns under a shared header. Parent columns act as header groups — only leaf columns (without `children`) render data cells. Leaf columns within groups support resizing and reordering just like standalone columns.

```tsx
const columns: ColumnType<User>[] = [
  { key: 'id', dataIndex: 'id', title: 'ID', width: 80 },
  {
    key: 'nameGroup',
    title: 'Name',
    children: [
      { key: 'firstName', dataIndex: 'firstName', title: 'First Name', width: 150 },
      { key: 'lastName',  dataIndex: 'lastName',  title: 'Last Name',  width: 150 },
    ],
  },
  {
    key: 'contactGroup',
    title: 'Contact Info',
    children: [
      { key: 'email', dataIndex: 'email', title: 'Email', width: 250 },
      { key: 'phone', dataIndex: 'phone', title: 'Phone', width: 150 },
    ],
  },
  { key: 'age', dataIndex: 'age', title: 'Age', width: 80 },
];

<BoltTable columns={columns} data={data} rowKey="id" />
```

The header renders two rows: group headers span their children columns in the top row, and leaf column headers appear in the bottom row. Standalone columns (not in any group) span both header rows.

---

### Pagination styles

Customize every part of the pagination footer via `styles` and `classNames`:

```tsx
<BoltTable
  columns={columns}
  data={data}
  pagination={{ pageSize: 20 }}
  classNames={{
    pagination: 'bg-gray-50 border-t border-gray-200',
    paginationButton: 'rounded hover:bg-gray-200',
    paginationActiveButton: 'font-bold text-blue-600',
    paginationSelect: 'rounded border-gray-300',
    paginationInfo: 'text-gray-500 text-xs',
  }}
  styles={{
    pagination: { height: 40 },
    paginationButton: { borderRadius: 4 },
    paginationActiveButton: { fontWeight: 700 },
    paginationSelect: { borderRadius: 4 },
    paginationInfo: { fontSize: 11 },
  }}
/>
```

Available pagination style/class keys: `pagination` (wrapper), `paginationButton` (nav buttons), `paginationActiveButton` (active page), `paginationSelect` (page-size dropdown), `paginationInfo` (range text).

---

### Fixed height (fill parent)

By default, BoltTable auto-sizes to its content. To fill a fixed-height container instead:

```tsx
<div style={{ height: 600 }}>
  <BoltTable
    columns={columns}
    data={data}
    autoHeight={false}
  />
</div>
```

---

## Documentation

For the complete guide with in-depth examples for every feature, visit the **[BoltTable Documentation](https://bolt-table.vercel.app/)**.

---

## Type exports

```ts
import type {
  ColumnType,
  ColumnContextMenuItem,
  ColumnPersistenceConfig,
  RowSelectionConfig,
  RowPinningConfig,
  ExpandableConfig,
  PaginationType,
  SortDirection,
  DataRecord,
  BoltTableIcons,
} from 'bolt-table';
```

---

## License

MIT © [Venkatesh Sirigineedi](https://github.com/venkateshwebdev)


[![npm version](https://img.shields.io/npm/v/bolt-table)](https://www.npmjs.com/package/bolt-table)
[![license](https://img.shields.io/npm/l/bolt-table)](./LICENSE)
[![github](https://img.shields.io/badge/GitHub-Source-181717?logo=github)](https://github.com/venkateshwebdev/Bolt-Table)
[![website](https://img.shields.io/badge/Website-Live_Demo-blue?logo=vercel)](https://bolt-table.vercel.app/)

---

## Features

- **Row virtualization** — only visible rows are rendered, powered by TanStack Virtual
- **Drag to reorder columns** — custom zero-dependency drag-and-drop (no @dnd-kit needed)
- **Column pinning** — pin columns to the left or right edge via right-click
- **Column resizing** — drag the right edge of any header to resize
- **Column hiding** — hide/show columns via the right-click context menu
- **Sorting** — client-side or server-side, with custom comparators per column
- **Filtering** — client-side or server-side, with custom filter functions per column
- **Pagination** — client-side slice or server-side with full control
- **Row selection** — checkbox or radio, with select-all, indeterminate state, and disabled rows
- **Expandable rows** — auto-measured content panels below each row, controlled or uncontrolled
- **Shimmer loading** — animated skeleton rows on initial load and infinite scroll append
- **Infinite scroll** — `onEndReached` callback with configurable threshold
- **Empty state** — custom renderer or default "No data" message
- **Auto height** — table shrinks/grows to fit rows, capped at 10 rows by default
- **Row pinning** — pin rows to the top or bottom of the table, sticky during vertical scroll
- **Cell context menu** — right-click (or long-press on mobile) any cell to pin rows or copy values
- **Right-click context menu** — sort, filter, pin, hide, plus custom items
- **Mobile-friendly context menus** — long-press (touch-and-hold) triggers context menus on touch devices
- **Nested / grouped columns** — group related columns under a shared header spanning multiple columns
- **Theme-agnostic** — works in light and dark mode out of the box, no CSS variables needed
- **Editable cells** — right-click any cell on an `editable` column to inline-edit via the context menu
- **Custom icons** — override any built-in icon via the `icons` prop

---

## Installation

```bash
npm install bolt-table @tanstack/react-virtual
```

That's it. No other peer dependencies.

---

## Quick start

```tsx
import { BoltTable, ColumnType } from 'bolt-table';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

const columns: ColumnType<User>[] = [
  { key: 'name',  dataIndex: 'name',  title: 'Name',  width: 200 },
  { key: 'email', dataIndex: 'email', title: 'Email', width: 280 },
  { key: 'age',   dataIndex: 'age',   title: 'Age',   width: 80  },
];

const data: User[] = [
  { id: '1', name: 'Alice',   email: 'alice@example.com',   age: 28 },
  { id: '2', name: 'Bob',     email: 'bob@example.com',     age: 34 },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 22 },
];

export default function App() {
  return (
    <BoltTable<User>
      columns={columns}
      data={data}
      rowKey="id"
    />
  );
}
```

---

## Next.js (App Router)

BoltTable uses browser APIs and must be wrapped in a client boundary:

```tsx
'use client';
import { BoltTable } from 'bolt-table';
```

---

## Styling

BoltTable uses **inline CSS styles** for all defaults — no Tailwind, no CSS variables, no external stylesheets required. It works out of the box in any React project, light or dark mode.

You can customize everything via the `styles` and `classNames` props, including headers, cells, rows, pinned regions, and pagination. If your project uses Tailwind, you can pass Tailwind classes through `classNames` and they'll be applied on top of the inline defaults.

### Custom icons

All built-in icons are inline SVGs. Override any icon via the `icons` prop:

```tsx
import type { BoltTableIcons } from 'bolt-table';

<BoltTable
  icons={{
    gripVertical: <MyGripIcon size={12} />,
    sortAsc: <MySortUpIcon size={12} />,
    chevronsLeft: <MyFirstPageIcon size={12} />,
  }}
/>
```

Available icon keys: `gripVertical`, `sortAsc`, `sortDesc`, `filter`, `filterClear`, `pin`, `pinOff`, `eyeOff`, `chevronDown`, `chevronLeft`, `chevronRight`, `chevronsLeft`, `chevronsRight`, `copy`, `edit`.

---

## Props

### `BoltTable`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnType<T>[]` | — | Column definitions (required) |
| `data` | `T[]` | — | Row data array (required) |
| `rowKey` | `string \| (record: T) => string` | `'id'` | Unique row identifier |
| `rowHeight` | `number` | `40` | Height of each row in pixels |
| `expandedRowHeight` | `number` | `200` | Estimated height for expanded rows |
| `maxExpandedRowHeight` | `number` | — | Max height for expanded row panels (makes them scrollable) |
| `accentColor` | `string` | `'#1890ff'` | Color used for sort icons, selected rows, resize line, etc. |
| `className` | `string` | `''` | Class name for the outer wrapper |
| `classNames` | `ClassNamesTypes` | `{}` | Granular class overrides per table region |
| `styles` | `StylesTypes` | `{}` | Inline style overrides per table region |
| `icons` | `BoltTableIcons` | — | Custom icon overrides for built-in SVG icons |
| `gripIcon` | `ReactNode` | — | Custom drag grip icon (deprecated, use `icons.gripVertical`) |
| `hideGripIcon` | `boolean` | `false` | Hide the drag grip icon from all headers |
| `pagination` | `PaginationType \| false` | — | Pagination config, or `false` to disable |
| `onPaginationChange` | `(page, pageSize) => void` | — | Called when page or page size changes |
| `onColumnResize` | `(columnKey, newWidth) => void` | — | Called when a column is resized |
| `onColumnOrderChange` | `(newOrder) => void` | — | Called when columns are reordered |
| `onColumnPin` | `(columnKey, pinned) => void` | — | Called when a column is pinned/unpinned |
| `onColumnHide` | `(columnKey, hidden) => void` | — | Called when a column is hidden/shown |
| `rowSelection` | `RowSelectionConfig<T>` | — | Row selection config |
| `rowPinning` | `RowPinningConfig` | — | Row pinning config (`{ top?: Key[], bottom?: Key[] }`) |
| `onRowPin` | `(rowKey, pinned) => void` | — | Called when a row is pinned/unpinned via cell context menu |
| `expandable` | `ExpandableConfig<T>` | — | Expandable row config |
| `onEndReached` | `() => void` | — | Called when scrolled near the bottom (infinite scroll) |
| `onEndReachedThreshold` | `number` | `5` | Rows from end to trigger `onEndReached` |
| `isLoading` | `boolean` | `false` | Shows shimmer skeleton rows when `true` |
| `onSortChange` | `(columnKey, direction) => void` | — | Server-side sort handler (disables local sort) |
| `onFilterChange` | `(filters) => void` | — | Server-side filter handler (disables local filter) |
| `columnContextMenuItems` | `ColumnContextMenuItem[]` | — | Custom items appended to the header context menu |
| `autoHeight` | `boolean` | `true` | Auto-size table height to content (capped at 10 rows) |
| `layoutLoading` | `boolean` | `false` | Show full skeleton layout (headers + rows) |
| `emptyRenderer` | `ReactNode` | — | Custom empty state content |
| `rowClassName` | `(record, index) => string` | — | Returns a CSS class name for conditional row styling |
| `rowStyle` | `(record, index) => CSSProperties` | — | Returns inline styles for conditional row styling |
| `disabledFilters` | `boolean` | `false` | Removes the filter option from all header context menus |
| `onCopy` | `(text, columnKey, record, rowIndex) => void` | — | Called after a cell value is copied to the clipboard |
| `keepPinnedRowsAcrossPages` | `boolean` | `false` | Pinned rows remain visible after navigating to a different page |
| `onEdit` | `(value, record, dataIndex, rowIndex) => void` | — | Called when a user finishes editing an editable cell |

---

### `ColumnType<T>`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | — | Unique column identifier (required) |
| `dataIndex` | `string` | — | Row object property to display (required for leaf columns, omit for groups) |
| `title` | `string \| ReactNode` | — | Header label (required) |
| `width` | `number` | `150` | Column width in pixels |
| `render` | `(value, record, index) => ReactNode` | — | Custom cell renderer |
| `shimmerRender` | `() => ReactNode` | — | Custom shimmer skeleton for this column |
| `sortable` | `boolean` | `true` | Show sort controls for this column |
| `sorter` | `boolean \| (a: T, b: T) => number` | — | Custom sort comparator for client-side sort |
| `filterable` | `boolean` | `true` | Show filter option in context menu |
| `filterFn` | `(value, record, dataIndex) => boolean` | — | Custom filter predicate for client-side filter |
| `hidden` | `boolean` | `false` | Hide this column |
| `pinned` | `'left' \| 'right' \| false` | `false` | Pin this column to an edge |
| `className` | `string` | — | Class applied to all cells in this column |
| `style` | `CSSProperties` | — | Styles applied to all cells in this column |
| `copy` | `boolean \| (value, record, index) => string` | — | Enable "Copy" in cell context menu; function customizes what's copied |
| `editable` | `boolean` | `false` | When `true` and no custom `render` is set, cells become inline-editable on double-click |
| `children` | `ColumnType<T>[]` | — | Nested child columns. Makes this column a header group — only leaf columns render data |

---

## Examples

### Sorting

**Client-side** (no `onSortChange` — BoltTable sorts locally):

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    sortable: true,
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    key: 'age',
    dataIndex: 'age',
    title: 'Age',
    sortable: true,
  },
];

<BoltTable columns={columns} data={data} />
```

**Server-side** (provide `onSortChange` — BoltTable delegates to you):

```tsx
const [sortKey, setSortKey] = useState('');
const [sortDir, setSortDir] = useState<SortDirection>(null);

<BoltTable
  columns={columns}
  data={serverData}
  onSortChange={(key, dir) => {
    setSortKey(key);
    setSortDir(dir);
    refetch({ sortKey: key, sortDir: dir });
  }}
/>
```

---

### Filtering

**Client-side** (no `onFilterChange`):

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'status',
    dataIndex: 'status',
    title: 'Status',
    filterable: true,
    filterFn: (value, record) => record.status === value,
  },
];
```

**Server-side**:

```tsx
<BoltTable
  columns={columns}
  data={serverData}
  onFilterChange={(filters) => {
    setActiveFilters(filters);
    refetch({ filters });
  }}
/>
```

---

### Pagination

**Client-side** (pass all data, BoltTable slices it):

```tsx
<BoltTable
  columns={columns}
  data={allUsers}
  pagination={{ pageSize: 20 }}
  onPaginationChange={(page, size) => setPage(page)}
/>
```

**Server-side** (pass only the current page):

```tsx
<BoltTable
  columns={columns}
  data={currentPageData}
  pagination={{
    current: page,
    pageSize: 20,
    total: 500,
    showTotal: (total, [from, to]) => `${from}-${to} of ${total} users`,
  }}
  onPaginationChange={(page, size) => fetchPage(page, size)}
/>
```

**Disable pagination:**

```tsx
<BoltTable columns={columns} data={data} pagination={false} />
```

---

### Row selection

```tsx
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  rowSelection={{
    type: 'checkbox',
    selectedRowKeys,
    onChange: (keys, rows) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.status === 'locked',
    }),
  }}
/>
```

---

### Expandable rows

```tsx
<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  expandable={{
    rowExpandable: (record) => record.details !== null,
    expandedRowRender: (record) => (
      <div style={{ padding: 16 }}>
        <h4>{record.name} — Details</h4>
        <pre>{JSON.stringify(record.details, null, 2)}</pre>
      </div>
    ),
  }}
  expandedRowHeight={150}
  maxExpandedRowHeight={400}
/>
```

---

### Infinite scroll

```tsx
const [data, setData] = useState<User[]>([]);
const [isLoading, setIsLoading] = useState(false);

const loadMore = async () => {
  setIsLoading(true);
  const newRows = await fetchNextPage();
  setData(prev => [...prev, ...newRows]);
  setIsLoading(false);
};

<BoltTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  onEndReached={loadMore}
  onEndReachedThreshold={8}
  pagination={false}
/>
```

---

### Column pinning

```tsx
const columns: ColumnType<User>[] = [
  { key: 'name',    dataIndex: 'name',    title: 'Name',    pinned: 'left',  width: 200 },
  { key: 'email',   dataIndex: 'email',   title: 'Email',   width: 250 },
  { key: 'actions', dataIndex: 'actions', title: 'Actions', pinned: 'right', width: 100 },
];
```

Users can also pin/unpin columns at runtime via the right-click context menu.

---

### Row pinning

Pin rows to the top or bottom of the table so they stay visible while scrolling vertically. Pinned rows transcend pagination — they are always visible regardless of which page the user is on.

```tsx
const [rowPinning, setRowPinning] = useState({ top: [], bottom: [] });

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  rowPinning={rowPinning}
  onRowPin={(key, pinned) => {
    setRowPinning(prev => {
      const top = (prev.top ?? []).filter(k => String(k) !== String(key));
      const bottom = (prev.bottom ?? []).filter(k => String(k) !== String(key));
      if (pinned === 'top') top.push(key);
      if (pinned === 'bottom') bottom.push(key);
      return { top, bottom };
    });
  }}
  styles={{ pinnedRowBg: 'rgba(255, 255, 255, 0.95)' }}
/>
```

Users can also pin/unpin rows at runtime via the right-click context menu on any body cell (when `onRowPin` is provided).

Pinned rows use `position: sticky` with `backdropFilter: blur(12px)` and a subtle box-shadow to visually separate them from scrolling content. Customize with `classNames.pinnedRow`, `styles.pinnedRow`, and `styles.pinnedRowBg`.

---

### Cell context menu & copy

Right-click (or long-press on mobile) any body cell to see a context menu with:

- **Pin to Top / Unpin from Top** — shown when `onRowPin` is provided
- **Pin to Bottom / Unpin from Bottom** — shown when `onRowPin` is provided
- **Copy** — shown when the column has `copy: true` or a copy function

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    copy: true, // copies the raw cell value
  },
  {
    key: 'email',
    dataIndex: 'email',
    title: 'Email',
    // Custom copy — control exactly what goes to the clipboard
    copy: (value, record) => `${record.name} <${value}>`,
  },
];
```

The cell context menu only appears when there is at least one action available (either `onRowPin` or `column.copy`). Otherwise, the browser's default context menu is used.

---

### Editable cells

Mark columns as `editable: true` and provide an `onEdit` callback to allow inline editing. Right-click (or long-press on mobile) an editable cell to see the **Edit** option (with a pencil icon) in the context menu. Selecting it turns the cell into an input field. Press **Enter** or click away to commit, **Escape** to cancel.

```tsx
const [data, setData] = useState<User[]>(initialData);

const columns: ColumnType<User>[] = [
  { key: 'name',  dataIndex: 'name',  title: 'Name',  editable: true, width: 200 },
  { key: 'age',   dataIndex: 'age',   title: 'Age',   editable: true, width: 80  },
  {
    key: 'status',
    dataIndex: 'status',
    title: 'Status',
    render: (value) => <span className="badge">{String(value)}</span>,
    editable: true, // ignored — custom render takes precedence
  },
];

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  onEdit={(value, record, dataIndex, rowIndex) => {
    setData(prev =>
      prev.map((row, i) =>
        i === rowIndex ? { ...row, [dataIndex]: value } : row
      )
    );
  }}
/>
```

The edit icon can be customized via the `icons` prop:

```tsx
<BoltTable icons={{ edit: <MyPencilIcon size={14} /> }} />
```

> **Note:** `editable` is skipped for columns that define a custom `render` function — since the cell content is fully controlled by the renderer, inline editing wouldn't know how to display or commit changes. If you need editable custom-rendered cells, handle the editing UX inside your `render` function.

---

### Styling overrides

```tsx
<BoltTable
  columns={columns}
  data={data}
  accentColor="#6366f1"
  classNames={{
    header: 'text-xs uppercase tracking-wider text-gray-500',
    cell: 'text-sm',
    pinnedHeader: 'border-r border-indigo-200',
    pinnedCell: 'border-r border-indigo-100',
  }}
  styles={{
    header: { fontWeight: 600 },
    rowHover: { backgroundColor: '#f0f9ff' },
    rowSelected: { backgroundColor: '#e0e7ff' },
    pinnedBg: 'rgba(238, 242, 255, 0.95)',
  }}
/>
```

---

### Nested / grouped columns

Group related columns under a shared header. Parent columns act as header groups — only leaf columns (without `children`) render data cells. Leaf columns within groups support resizing and reordering just like standalone columns.

```tsx
const columns: ColumnType<User>[] = [
  { key: 'id', dataIndex: 'id', title: 'ID', width: 80 },
  {
    key: 'nameGroup',
    title: 'Name',
    children: [
      { key: 'firstName', dataIndex: 'firstName', title: 'First Name', width: 150 },
      { key: 'lastName',  dataIndex: 'lastName',  title: 'Last Name',  width: 150 },
    ],
  },
  {
    key: 'contactGroup',
    title: 'Contact Info',
    children: [
      { key: 'email', dataIndex: 'email', title: 'Email', width: 250 },
      { key: 'phone', dataIndex: 'phone', title: 'Phone', width: 150 },
    ],
  },
  { key: 'age', dataIndex: 'age', title: 'Age', width: 80 },
];

<BoltTable columns={columns} data={data} rowKey="id" />
```

The header renders two rows: group headers span their children columns in the top row, and leaf column headers appear in the bottom row. Standalone columns (not in any group) span both header rows.

---

### Pagination styles

Customize every part of the pagination footer via `styles` and `classNames`:

```tsx
<BoltTable
  columns={columns}
  data={data}
  pagination={{ pageSize: 20 }}
  classNames={{
    pagination: 'bg-gray-50 border-t border-gray-200',
    paginationButton: 'rounded hover:bg-gray-200',
    paginationActiveButton: 'font-bold text-blue-600',
    paginationSelect: 'rounded border-gray-300',
    paginationInfo: 'text-gray-500 text-xs',
  }}
  styles={{
    pagination: { height: 40 },
    paginationButton: { borderRadius: 4 },
    paginationActiveButton: { fontWeight: 700 },
    paginationSelect: { borderRadius: 4 },
    paginationInfo: { fontSize: 11 },
  }}
/>
```

Available pagination style/class keys: `pagination` (wrapper), `paginationButton` (nav buttons), `paginationActiveButton` (active page), `paginationSelect` (page-size dropdown), `paginationInfo` (range text).

---

### Fixed height (fill parent)

By default, BoltTable auto-sizes to its content. To fill a fixed-height container instead:

```tsx
<div style={{ height: 600 }}>
  <BoltTable
    columns={columns}
    data={data}
    autoHeight={false}
  />
</div>
```

---

## Documentation

For the complete guide with in-depth examples for every feature, visit the **[BoltTable Documentation](https://bolt-table.vercel.app/)**.

---

## Type exports

```ts
import type {
  ColumnType,
  ColumnContextMenuItem,
  RowSelectionConfig,
  RowPinningConfig,
  ExpandableConfig,
  PaginationType,
  SortDirection,
  DataRecord,
  BoltTableIcons,
} from 'bolt-table';
```

---

## License

MIT © [Venkatesh Sirigineedi](https://github.com/venkateshwebdev)
