# bolt-table

A high-performance, zero-dependency\* React table component. Only the rows visible in the viewport are ever in the DOM — making it fast for datasets of any size uisng [TanStack Virtual](https://tanstack.com/virtual).

[![npm version](https://img.shields.io/npm/v/bolt-table)](https://www.npmjs.com/package/bolt-table)
[![license](https://img.shields.io/npm/l/bolt-table)](./LICENSE)
[![github](https://github.com/venkateshwebdev/Bolt-Table)]
[![Website](https://bolt-table.vercel.app/)]


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
- **Right-click context menu** — sort, filter, pin, hide, plus custom items
- **Theme-agnostic** — works in light and dark mode out of the box, no CSS variables needed
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

You can customize everything via the `styles` and `classNames` props. If your project uses Tailwind, you can pass Tailwind classes through `classNames` and they'll be applied on top of the inline defaults.

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

Available icon keys: `gripVertical`, `sortAsc`, `sortDesc`, `filter`, `filterClear`, `pin`, `pinOff`, `eyeOff`, `chevronDown`, `chevronLeft`, `chevronRight`, `chevronsLeft`, `chevronsRight`.

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

---

### `ColumnType<T>`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | — | Unique column identifier (required) |
| `dataIndex` | `string` | — | Row object property to display (required) |
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

A complete guide to every feature in BoltTable. Each section explains the concept, shows the relevant types, and provides copy-paste code.

### Table of Contents

- [Core Concepts](#core-concepts)
- [Column Definitions](#column-definitions-in-depth)
- [Data & Row Keys](#data--row-keys)
- [Sorting](#sorting-in-depth)
- [Filtering](#filtering-in-depth)
- [Pagination](#pagination-in-depth)
- [Row Selection](#row-selection-in-depth)
- [Expandable Rows](#expandable-rows-in-depth)
- [Column Interactions](#column-interactions)
- [Loading States](#loading-states)
- [Infinite Scroll](#infinite-scroll-in-depth)
- [Empty States](#empty-states)
- [Styling & Theming](#styling--theming)
- [Context Menu](#context-menu)
- [Auto Height vs Fixed Height](#auto-height-vs-fixed-height)
- [Custom Icons](#custom-icons-1)
- [TypeScript](#typescript)
- [Server-Side Operations](#server-side-operations)
- [Performance](#performance)
- [Next.js & Frameworks](#nextjs--frameworks)

---

### Core Concepts

BoltTable is built around three ideas:

1. **Virtualization** — Only the rows visible in the viewport exist in the DOM. Scroll through 100,000 rows as smoothly as 10. Powered by [TanStack Virtual](https://tanstack.com/virtual).

2. **Client-side or server-side — your choice** — Every interactive feature (sorting, filtering, pagination) works in two modes. Omit the callback and BoltTable handles it locally. Provide the callback and BoltTable delegates to you.

3. **Zero configuration styling** — BoltTable renders with inline styles by default. No CSS imports, no Tailwind dependency, no CSS variables to set up. It works in light mode, dark mode, and everything in between. Then customize with `classNames` and `styles` when you need to.

**Minimum viable table:**

```tsx
import { BoltTable, ColumnType } from 'bolt-table';

const columns: ColumnType<{ id: string; name: string }>[] = [
  { key: 'name', dataIndex: 'name', title: 'Name' },
];

<BoltTable columns={columns} data={[{ id: '1', name: 'Alice' }]} />
```

That gives you virtualization, column reordering (drag headers), column resizing (drag edges), a right-click context menu with sort/filter/pin/hide, and auto-height sizing — all with zero configuration.

---

### Column Definitions In-Depth

Columns are the backbone of BoltTable. Each column is an object conforming to `ColumnType<T>`.

#### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique identifier. Used internally for drag-and-drop, pinning, hiding, sorting. |
| `dataIndex` | `string` | The property name on your row object to read. Must match a key on `T`. |
| `title` | `string \| ReactNode` | What appears in the header. Can be a string or any React element. |

#### Layout fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `width` | `number` | `150` | Column width in pixels. The **last visible column** always stretches to fill remaining space using CSS `minmax()`. |
| `hidden` | `boolean` | `false` | Controlled visibility. When `true`, the column is not rendered. |
| `defaultHidden` | `boolean` | `false` | Uncontrolled initial visibility. Column starts hidden but can be shown via context menu. |
| `pinned` | `'left' \| 'right' \| false` | `false` | Controlled pin state. Pinned columns stick to the edge during horizontal scroll. |
| `defaultPinned` | `'left' \| 'right' \| false` | `false` | Uncontrolled initial pin state. |
| `className` | `string` | — | CSS class applied to every cell in this column (header + body). |
| `style` | `CSSProperties` | — | Inline styles applied to every cell in this column. |

#### Behavior fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sortable` | `boolean` | `true` | Whether sort controls appear for this column. |
| `sorter` | `boolean \| (a: T, b: T) => number` | — | `true` uses the default comparator. A function gives you full control. |
| `filterable` | `boolean` | `true` | Whether filter controls appear in the context menu. |
| `filterFn` | `(value: string, record: T, dataIndex: string) => boolean` | — | Custom filter predicate. Falls back to case-insensitive substring match. |

#### Custom rendering

| Field | Type | Description |
|-------|------|-------------|
| `render` | `(value: unknown, record: T, index: number) => ReactNode` | Custom cell renderer. If omitted, the raw value is rendered as text. |
| `shimmerRender` | `() => ReactNode` | Custom loading skeleton for this column. |

#### Example: a fully configured column

```tsx
const nameColumn: ColumnType<User> = {
  key: 'name',
  dataIndex: 'name',
  title: 'Full Name',
  width: 220,
  pinned: 'left',
  sortable: true,
  sorter: (a, b) => a.name.localeCompare(b.name),
  filterable: true,
  filterFn: (filterValue, record) =>
    record.name.toLowerCase().includes(filterValue.toLowerCase()),
  render: (value, record) => (
    <div>
      <strong>{record.name}</strong>
      <span style={{ color: '#888', marginLeft: 8 }}>{record.email}</span>
    </div>
  ),
  shimmerRender: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee' }} />
      <div style={{ width: 120, height: 14, borderRadius: 4, background: '#eee' }} />
    </div>
  ),
  className: 'font-medium',
  style: { minWidth: 180 },
};
```

---

### Data & Row Keys

#### The `data` prop

Pass an array of objects. Each object is one row. The shape must match your generic type `T`:

```tsx
interface Order {
  [key: string]: unknown;
  id: string;
  customer: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
}

const orders: Order[] = [
  { id: 'ord-1', customer: 'Acme Corp', total: 1250, status: 'shipped' },
  { id: 'ord-2', customer: 'Globex',    total: 3400, status: 'pending' },
];

<BoltTable<Order> columns={columns} data={orders} />
```

For **client-side** operations, pass the full dataset. BoltTable handles slicing, sorting, and filtering internally.

For **server-side** operations, pass only the current page. Handle sort/filter/paginate in your API layer.

#### The `rowKey` prop

BoltTable needs a unique identifier for each row — for selection, expansion, and stable virtualizer keys.

```tsx
// String — reads record[rowKey]
<BoltTable rowKey="id" />

// Function — compute the key yourself
<BoltTable rowKey={(record) => `${record.type}-${record.id}`} />

// Default is "id" when omitted
<BoltTable />
```

The `rowKey` is always coerced to a string internally.

#### The `DataRecord` constraint

BoltTable's generic parameter requires `T extends DataRecord` where `DataRecord = Record<string, unknown>`. This means your interface needs an index signature:

```tsx
// This works
interface User {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
}

// This also works
type User = {
  id: string;
  name: string;
  email: string;
};
```

TypeScript `type` aliases satisfy `Record<string, unknown>` implicitly. If you use `interface`, add `[key: string]: unknown;` as the first line. This does not change the behavior of your type — all named properties retain their specific types.

---

### Sorting In-Depth

Sorting has two modes based on whether you provide the `onSortChange` callback.

#### Client-side sorting (default)

When `onSortChange` is **not** provided, BoltTable sorts the data array in memory.

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    sortable: true,
    // Option 1: default comparator (localeCompare for strings, subtraction for numbers)
    sorter: true,
  },
  {
    key: 'age',
    dataIndex: 'age',
    title: 'Age',
    sortable: true,
    // Option 2: custom comparator
    sorter: (a, b) => a.age - b.age,
  },
  {
    key: 'createdAt',
    dataIndex: 'createdAt',
    title: 'Created',
    sortable: true,
    // Option 3: complex custom logic
    sorter: (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
];

<BoltTable columns={columns} data={users} />
```

**Sort cycle**: click a column header (or use the context menu) to cycle through `null → 'asc' → 'desc' → null`. Only one column is sorted at a time.

#### Server-side sorting

When `onSortChange` **is** provided, BoltTable does **not** sort locally. It fires the callback and displays data as-is.

```tsx
const [sortKey, setSortKey] = useState('');
const [sortDir, setSortDir] = useState<SortDirection>(null);

<BoltTable
  columns={columns}
  data={serverData}
  onSortChange={(columnKey, direction) => {
    setSortKey(columnKey);
    setSortDir(direction);
    // direction is 'asc', 'desc', or null (sort cleared)
    refetch({ sort: columnKey, order: direction });
  }}
/>
```

#### Disabling sort on specific columns

```tsx
{
  key: 'actions',
  dataIndex: 'id',
  title: '',
  sortable: false,  // no sort controls for this column
}
```

---

### Filtering In-Depth

Filtering also has client-side and server-side modes.

#### Client-side filtering (default)

When `onFilterChange` is **not** provided, BoltTable filters in memory. Users filter via the right-click context menu on column headers.

```tsx
const columns: ColumnType<User>[] = [
  {
    key: 'status',
    dataIndex: 'status',
    title: 'Status',
    filterable: true,
    // Custom filter: exact match
    filterFn: (filterValue, record) =>
      record.status.toLowerCase() === filterValue.toLowerCase(),
  },
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    filterable: true,
    // No filterFn → falls back to case-insensitive substring match
  },
  {
    key: 'tags',
    dataIndex: 'tags',
    title: 'Tags',
    filterable: false,  // disable filtering for this column
  },
];
```

The default fallback filter converts the cell value to a string and checks if it includes the filter value (case-insensitive).

#### Server-side filtering

When `onFilterChange` **is** provided, BoltTable skips local filtering and passes the filters map to you:

```tsx
<BoltTable
  columns={columns}
  data={serverData}
  onFilterChange={(filters) => {
    // filters is Record<string, string>
    // e.g. { status: "active", region: "us-east" }
    // A column is removed from the map when its filter is cleared
    setActiveFilters(filters);
    refetch({ filters });
  }}
/>
```

#### How users interact with filters

1. Right-click a column header
2. Click "Filter Column" in the context menu
3. Type a filter value in the input
4. Press Enter or click the checkmark to apply
5. To clear: right-click again and click "Clear Filter"

When a filter is active, a small filter icon appears in the column header.

---

### Pagination In-Depth

BoltTable renders a pagination footer with page navigation, page size selector, and a "showing X-Y of Z" label.

#### Client-side pagination

Pass all your data. BoltTable slices it per page:

```tsx
<BoltTable
  columns={columns}
  data={allUsers}             // all 500 users
  pagination={{ pageSize: 20 }}
/>
```

BoltTable manages the current page internally. If you want controlled page state:

```tsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);

<BoltTable
  columns={columns}
  data={allUsers}
  pagination={{
    current: page,
    pageSize,
    total: allUsers.length,
  }}
  onPaginationChange={(newPage, newSize) => {
    setPage(newPage);
    setPageSize(newSize);
  }}
/>
```

#### Server-side pagination

Pass only the current page's data. Tell BoltTable the total so it can render page numbers:

```tsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
const { data, total } = useFetchUsers({ page, pageSize });

<BoltTable
  columns={columns}
  data={data}                    // only current page from API
  pagination={{
    current: page,
    pageSize,
    total,                       // total across all pages
    showTotal: (total, [from, to]) =>
      `Showing ${from}–${to} of ${total} users`,
  }}
  onPaginationChange={(newPage, newSize) => {
    setPage(newPage);
    setPageSize(newSize);
  }}
/>
```

#### `PaginationType` reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `current` | `number` | `1` | Active page number (1-based). |
| `pageSize` | `number` | `10` | Rows per page. Users can change this via the footer selector. |
| `total` | `number` | `data.length` | Total row count. Required for server-side pagination. |
| `showTotal` | `(total, [from, to]) => ReactNode` | — | Custom label for the "showing X of Y" text. |

#### Disabling pagination

```tsx
<BoltTable columns={columns} data={data} pagination={false} />
```

When pagination is `false`, all rows are rendered in a single scrollable viewport (virtualized).

---

### Row Selection In-Depth

Row selection prepends a checkbox (or radio) column to the left of the table.

#### Checkbox selection (multi-select)

```tsx
const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  rowSelection={{
    type: 'checkbox',
    selectedRowKeys: selectedKeys,
    onChange: (keys, rows, info) => {
      setSelectedKeys(keys);
      // info.type is 'all' | 'single' | 'multiple'
    },
  }}
/>
```

The header checkbox toggles select-all. When some (but not all) rows are selected, it shows an indeterminate state.

#### Radio selection (single-select)

```tsx
<BoltTable
  rowSelection={{
    type: 'radio',
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
  }}
/>
```

Only one row can be selected at a time. The header checkbox is hidden automatically.

#### Disabling specific rows

```tsx
<BoltTable
  rowSelection={{
    type: 'checkbox',
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.status === 'locked' || record.role === 'admin',
    }),
  }}
/>
```

Disabled rows render a grayed-out checkbox and cannot be toggled.

#### Hiding the select-all checkbox

```tsx
<BoltTable
  rowSelection={{
    type: 'checkbox',
    hideSelectAll: true,
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
  }}
/>
```

#### `RowSelectionConfig<T>` reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `'checkbox' \| 'radio'` | `'checkbox'` | Selection control type. |
| `selectedRowKeys` | `React.Key[]` | — | Currently selected keys (controlled, required). |
| `onChange` | `(keys, rows, info) => void` | — | Called on any selection change. Primary callback. |
| `onSelect` | `(record, selected, rows, event) => void` | — | Called when a single row is toggled. |
| `onSelectAll` | `(selected, selectedRows, changeRows) => void` | — | Called when the header checkbox is toggled. |
| `getCheckboxProps` | `(record) => { disabled?: boolean }` | — | Per-row checkbox/radio props. |
| `hideSelectAll` | `boolean` | `false` | Hide the header select-all checkbox. |

---

### Expandable Rows In-Depth

Expandable rows reveal a content panel below each row when the user clicks the expand toggle.

#### Basic usage (uncontrolled)

```tsx
<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  expandable={{
    rowExpandable: (record) => record.details != null,
    expandedRowRender: (record) => (
      <div style={{ padding: 16 }}>
        <h4>{record.name}</h4>
        <p>{record.description}</p>
      </div>
    ),
  }}
  expandedRowHeight={200}
/>
```

BoltTable manages which rows are expanded internally.

#### Controlled expansion

```tsx
const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

<BoltTable
  expandable={{
    expandedRowKeys: expandedKeys,
    onExpandedRowsChange: (keys) => setExpandedKeys(keys),
    expandedRowRender: (record) => <DetailPanel record={record} />,
  }}
/>
```

When you provide `expandedRowKeys`, BoltTable operates in controlled mode. You must update the keys yourself in `onExpandedRowsChange`.

#### Default expanded rows

```tsx
<BoltTable
  expandable={{
    defaultExpandAllRows: true,       // expand everything on mount
    expandedRowRender: (record) => <Detail record={record} />,
  }}
/>

// Or expand specific rows:
<BoltTable
  expandable={{
    defaultExpandedRowKeys: ['row-1', 'row-3'],
    expandedRowRender: (record) => <Detail record={record} />,
  }}
/>
```

#### Limiting expanded height

```tsx
<BoltTable
  expandedRowHeight={200}         // initial estimate for virtualizer
  maxExpandedRowHeight={400}      // panel becomes scrollable beyond this
  expandable={{
    expandedRowRender: (record) => <LongContent record={record} />,
  }}
/>
```

The expanded panel auto-measures its content using `ResizeObserver`. The `expandedRowHeight` is only an estimate to prevent layout jumps — the real height takes over once measured.

#### `ExpandableConfig<T>` reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `expandedRowRender` | `(record, index, indent, expanded) => ReactNode` | — | Renders the expanded content panel (required). |
| `rowExpandable` | `(record) => boolean` | — | Controls which rows show the expand toggle. |
| `expandedRowKeys` | `React.Key[]` | — | Controlled expanded keys. |
| `defaultExpandedRowKeys` | `React.Key[]` | — | Initially expanded keys (uncontrolled). |
| `defaultExpandAllRows` | `boolean` | `false` | Expand all rows on mount (uncontrolled). |
| `onExpandedRowsChange` | `(keys) => void` | — | Called when expanded keys change. |
| `showExpandIcon` | `(record) => boolean` | — | Controls expand icon visibility per row. |

---

### Column Interactions

BoltTable supports four column interactions out of the box. All are enabled by default.

#### Column reordering (drag-and-drop)

Drag a column header to reorder. BoltTable uses a custom zero-dependency drag implementation — no `@dnd-kit` or other library needed.

```tsx
<BoltTable
  columns={columns}
  data={data}
  onColumnOrderChange={(newOrder) => {
    // newOrder is string[] of column keys in their new positions
    console.log('New order:', newOrder);
    saveColumnOrder(newOrder);
  }}
/>
```

Pinned columns cannot be dragged.

#### Column resizing

Drag the right edge of any header to resize. A colored overlay line and width label follow the cursor.

```tsx
<BoltTable
  columns={columns}
  data={data}
  onColumnResize={(columnKey, newWidth) => {
    // newWidth is the final width in pixels after mouse-up
    saveColumnWidth(columnKey, newWidth);
  }}
/>
```

#### Column pinning

Pin columns to the left or right edge so they stay visible during horizontal scroll.

**Declarative (in column definitions):**

```tsx
const columns: ColumnType<User>[] = [
  { key: 'name', dataIndex: 'name', title: 'Name', pinned: 'left' },
  { key: 'email', dataIndex: 'email', title: 'Email' },
  { key: 'actions', dataIndex: 'id', title: '', pinned: 'right' },
];
```

**Runtime (via context menu):** Users right-click a header and select "Pin to Left" / "Pin to Right" / "Unpin".

```tsx
<BoltTable
  columns={columns}
  data={data}
  onColumnPin={(columnKey, pinned) => {
    // pinned is 'left' | 'right' | false
    updateColumnConfig(columnKey, { pinned });
  }}
/>
```

Pinned columns use `position: sticky` with a semi-transparent background.

#### Column hiding

Users can hide columns via the right-click context menu ("Hide Column"). Pinned columns cannot be hidden.

```tsx
<BoltTable
  columns={columns}
  data={data}
  onColumnHide={(columnKey, hidden) => {
    // hidden is true (just hidden) or false (just shown)
    updateColumnConfig(columnKey, { hidden });
  }}
/>
```

To programmatically control visibility:

```tsx
const columns = allColumns.map(col => ({
  ...col,
  hidden: hiddenSet.has(col.key),
}));
```

---

### Loading States

BoltTable has two loading modes for different scenarios.

#### `isLoading` — shimmer rows in the body

When `data` is empty and `isLoading` is `true`, the entire body renders animated skeleton rows. Headers remain real.

When `data` is non-empty and `isLoading` is `true` (e.g., loading the next page in infinite scroll), skeleton rows are appended at the bottom below real data.

```tsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState<User[]>([]);

useEffect(() => {
  fetchUsers().then((users) => {
    setData(users);
    setLoading(false);
  });
}, []);

<BoltTable
  columns={columns}
  data={data}
  isLoading={loading}
/>
```

#### `layoutLoading` — full skeleton (headers + body)

When you don't yet know column widths (e.g., columns are fetched from an API), use `layoutLoading` to show a complete skeleton:

```tsx
<BoltTable
  columns={columns}
  data={data}
  layoutLoading={!columnsResolved}
/>
```

The difference:

| State | Headers | Body |
|-------|---------|------|
| `isLoading=true`, data empty | Real headers | Shimmer rows |
| `isLoading=true`, data present | Real headers | Real rows + shimmer rows at bottom |
| `layoutLoading=true` | Shimmer headers | Shimmer rows |

#### Custom shimmer per column

```tsx
{
  key: 'avatar',
  dataIndex: 'avatar',
  title: 'Avatar',
  width: 60,
  shimmerRender: () => (
    <div style={{
      width: 36, height: 36,
      borderRadius: '50%',
      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  ),
}
```

---

### Infinite Scroll In-Depth

Infinite scroll loads more rows as the user scrolls to the bottom.

```tsx
const [data, setData] = useState<User[]>([]);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);

const loadMore = useCallback(async () => {
  if (loading || !hasMore) return;
  setLoading(true);
  const { rows, total } = await fetchPage(data.length);
  setData(prev => [...prev, ...rows]);
  setHasMore(data.length + rows.length < total);
  setLoading(false);
}, [loading, hasMore, data.length]);

<BoltTable
  columns={columns}
  data={data}
  rowKey="id"
  isLoading={loading}
  onEndReached={loadMore}
  onEndReachedThreshold={8}   // trigger 8 rows from bottom
  pagination={false}           // disable pagination for infinite scroll
  autoHeight={false}           // fill parent container height
/>
```

**Key points:**

- `onEndReached` fires when the last visible row is within `onEndReachedThreshold` rows of the end.
- A built-in debounce guard prevents it from firing repeatedly. It resets when `data.length` changes or `isLoading` flips to `false`.
- Set `pagination={false}` — pagination and infinite scroll are mutually exclusive patterns.
- Set `autoHeight={false}` so the table fills a fixed-height container (otherwise it auto-sizes and there's nothing to scroll).

---

### Empty States

When `data` is empty and `isLoading` is `false`, BoltTable renders an empty state.

#### Default

Without configuration, a simple "No data" message appears.

#### Custom empty renderer

```tsx
<BoltTable
  columns={columns}
  data={[]}
  emptyRenderer={
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: '48px 0',
      color: '#888',
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <p style={{ fontWeight: 500 }}>No results found</p>
      <p style={{ fontSize: 12 }}>Try adjusting your search or filters.</p>
    </div>
  }
/>
```

The empty state is centered within the visible viewport — it stays centered even if the table is wider than the screen.

---

### Styling & Theming

BoltTable provides three layers of customization, from broad to granular.

#### Layer 1: `accentColor`

A single color string that themes all interactive elements:

```tsx
<BoltTable
  accentColor="#6366f1"   // indigo — applied to sort icons, filter icons,
                          // resize line, selected rows, expand chevrons,
                          // checkboxes, pagination highlight
/>
```

Default is `#1890ff`.

#### Layer 2: `classNames`

CSS class overrides per table region. These are appended to (not replacing) the defaults:

```tsx
<BoltTable
  classNames={{
    header: 'text-xs uppercase tracking-wider text-gray-500',
    cell: 'text-sm text-gray-900',
    row: 'border-b',
    pinnedHeader: 'border-r border-blue-200 bg-blue-50',
    pinnedCell: 'border-r border-blue-100',
    dragHeader: 'opacity-80 shadow-lg',
    expandedRow: 'bg-gray-50',
  }}
/>
```

| Key | Applies to |
|-----|-----------|
| `header` | All non-pinned column header cells. |
| `cell` | All body cells (pinned and non-pinned). |
| `row` | Each row wrapper element. |
| `pinnedHeader` | Pinned column headers (in addition to `header`). |
| `pinnedCell` | Pinned column body cells (in addition to `cell`). |
| `dragHeader` | The floating ghost column shown while dragging. |
| `expandedRow` | The expanded content panel below each row. |

#### Layer 3: `styles`

Inline CSS overrides with the highest specificity:

```tsx
<BoltTable
  styles={{
    header: { fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' },
    cell: { fontSize: 14 },
    pinnedHeader: { borderRight: '2px solid #dbeafe' },
    pinnedCell: { borderRight: '1px solid #eff6ff' },
    pinnedBg: 'rgba(239, 246, 255, 0.95)',
    rowHover: { backgroundColor: '#f8fafc' },
    rowSelected: { backgroundColor: '#eff6ff' },
    dragHeader: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
    expandedRow: { borderTop: '1px solid #e2e8f0' },
  }}
/>
```

| Key | Type | Description |
|-----|------|-------------|
| `header` | `CSSProperties` | Non-pinned header cells. |
| `cell` | `CSSProperties` | Body cells. |
| `row` | `CSSProperties` | Row wrapper. |
| `pinnedHeader` | `CSSProperties` | Pinned headers (on top of `header`). |
| `pinnedCell` | `CSSProperties` | Pinned body cells (on top of `cell`). |
| `pinnedBg` | `string` | **CSS color** for pinned column backgrounds. |
| `rowHover` | `CSSProperties` | Applied when a row is hovered. |
| `rowSelected` | `CSSProperties` | Applied when a row is selected. |
| `dragHeader` | `CSSProperties` | The ghost column while dragging. |
| `expandedRow` | `CSSProperties` | Expanded content panel. |

#### Per-column styling

Each column can also have its own `className` and `style`:

```tsx
{
  key: 'amount',
  dataIndex: 'amount',
  title: 'Amount',
  className: 'text-right font-mono',
  style: { fontVariantNumeric: 'tabular-nums' },
}
```

---

### Context Menu

Right-clicking any column header opens a context menu with built-in actions:

1. **Sort Ascending** / **Sort Descending** — if `sortable` is not `false`
2. **Filter Column** / **Clear Filter** — if `filterable` is not `false`
3. **Pin to Left** / **Pin to Right** / **Unpin** — always available
4. **Hide Column** — not available for pinned columns

#### Custom context menu items

Append your own items below the built-in ones:

```tsx
import type { ColumnContextMenuItem } from 'bolt-table';

const customMenuItems: ColumnContextMenuItem[] = [
  {
    key: 'copy',
    label: 'Copy Column Data',
    icon: <CopyIcon className="h-3 w-3" />,
    onClick: (columnKey) => {
      const values = data.map(row => row[columnKey]);
      navigator.clipboard.writeText(values.join('\n'));
    },
  },
  {
    key: 'export',
    label: 'Export as CSV',
    onClick: (columnKey) => exportColumnAsCSV(columnKey),
  },
  {
    key: 'delete',
    label: 'Remove Column',
    danger: true,     // renders in red
    disabled: false,  // can be dynamically disabled
    onClick: (columnKey) => removeColumn(columnKey),
  },
];

<BoltTable
  columns={columns}
  data={data}
  columnContextMenuItems={customMenuItems}
/>
```

#### `ColumnContextMenuItem` reference

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique identifier (used as React key). |
| `label` | `ReactNode` | Menu item text. |
| `icon` | `ReactNode` | Optional icon (12–14px recommended). |
| `danger` | `boolean` | Renders label in red. |
| `disabled` | `boolean` | Grays out the item; click handler not called. |
| `onClick` | `(columnKey: string) => void` | Called with the column's key when clicked. |

---

### Auto Height vs Fixed Height

#### `autoHeight={true}` (default)

The table auto-sizes to its content, capped at 10 rows. Fewer rows = smaller table. More rows = capped at `10 × rowHeight`, with the remaining rows scrollable.

```tsx
<BoltTable columns={columns} data={data} autoHeight={true} />
```

Use this when the table is part of a page layout and you want it to take only the space it needs.

#### `autoHeight={false}`

The table fills its parent container (`height: 100%`). The parent must provide a height.

```tsx
<div style={{ height: 600 }}>
  <BoltTable columns={columns} data={data} autoHeight={false} />
</div>

{/* Or with CSS */}
<div className="h-[calc(100vh-200px)]">
  <BoltTable columns={columns} data={data} autoHeight={false} />
</div>
```

Use this for:
- Dashboard panels with fixed dimensions
- Infinite scroll (the table needs a fixed viewport to scroll within)
- Full-screen table views

---

### Custom Icons

Every built-in icon can be replaced via the `icons` prop. All default icons are inline SVGs at 12×12px.

```tsx
import type { BoltTableIcons } from 'bolt-table';
import {
  GripVertical, ArrowUpAZ, ArrowDownAZ, Filter, FilterX,
  Pin, PinOff, EyeOff, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';

const icons: BoltTableIcons = {
  gripVertical:  <GripVertical size={12} />,
  sortAsc:       <ArrowUpAZ size={12} />,
  sortDesc:      <ArrowDownAZ size={12} />,
  filter:        <Filter size={12} />,
  filterClear:   <FilterX size={12} />,
  pin:           <Pin size={12} />,
  pinOff:        <PinOff size={12} />,
  eyeOff:        <EyeOff size={12} />,
  chevronDown:   <ChevronDown size={12} />,
  chevronLeft:   <ChevronLeft size={12} />,
  chevronRight:  <ChevronRight size={12} />,
  chevronsLeft:  <ChevronsLeft size={12} />,
  chevronsRight: <ChevronsRight size={12} />,
};

<BoltTable columns={columns} data={data} icons={icons} />
```

| Icon Key | Used In |
|----------|---------|
| `gripVertical` | Column header drag handle |
| `sortAsc` | Sort ascending indicator in header |
| `sortDesc` | Sort descending indicator in header |
| `filter` | Filter active indicator in header |
| `filterClear` | Clear filter button in context menu |
| `pin` | Pin option in context menu |
| `pinOff` | Unpin button on pinned headers |
| `eyeOff` | Hide column option in context menu |
| `chevronDown` | Expand row toggle / page size dropdown |
| `chevronLeft` | Pagination: previous page |
| `chevronRight` | Pagination: next page |
| `chevronsLeft` | Pagination: first page |
| `chevronsRight` | Pagination: last page |

To hide the grip icon entirely:

```tsx
<BoltTable hideGripIcon={true} />
```

---

### TypeScript

BoltTable is fully typed. The main generic parameter is the row data type.

#### Generic usage

```tsx
import { BoltTable, ColumnType, SortDirection, DataRecord } from 'bolt-table';

interface Product {
  [key: string]: unknown;
  id: string;
  name: string;
  price: number;
  category: string;
}

const columns: ColumnType<Product>[] = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Product',
    render: (value, record) => {
      // `record` is typed as Product
      // `record.price` is `number`, not `unknown`
      return <span>{record.name} (${record.price})</span>;
    },
    sorter: (a, b) => {
      // `a` and `b` are typed as Product
      return a.name.localeCompare(b.name);
    },
    filterFn: (filterValue, record) => {
      // `record` is typed as Product
      return record.name.toLowerCase().includes(filterValue.toLowerCase());
    },
  },
];

<BoltTable<Product> columns={columns} data={products} />
```

#### All exported types

```ts
import type {
  BoltTableIcons,        // Icon override map
  ColumnType,            // Column definition
  ColumnContextMenuItem, // Custom context menu item
  DataRecord,            // Base row type (Record<string, unknown>)
  ExpandableConfig,      // Expandable rows configuration
  PaginationType,        // Pagination configuration
  RowSelectionConfig,    // Row selection configuration
  SortDirection,         // 'asc' | 'desc' | null
} from 'bolt-table';
```

#### `interface` vs `type` for row data

TypeScript `interface` declarations don't implicitly satisfy index signatures. If you use `interface`, add `[key: string]: unknown`:

```tsx
// Works (type alias)
type User = { id: string; name: string };

// Works (interface with index signature)
interface User {
  [key: string]: unknown;
  id: string;
  name: string;
}

// Does NOT work (interface without index signature)
interface User {
  id: string;
  name: string;
}
// Error: Type 'User' does not satisfy the constraint 'DataRecord'.
```

---

### Server-Side Operations

A complete example of a table where sorting, filtering, and pagination are all handled by your API.

```tsx
import { useState, useEffect, useCallback } from 'react';
import { BoltTable, ColumnType, SortDirection } from 'bolt-table';

interface User {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
  role: string;
}

const columns: ColumnType<User>[] = [
  { key: 'name',  dataIndex: 'name',  title: 'Name',  width: 200, sortable: true, filterable: true },
  { key: 'email', dataIndex: 'email', title: 'Email', width: 280, sortable: true, filterable: true },
  { key: 'role',  dataIndex: 'role',  title: 'Role',  width: 120, sortable: true, filterable: true },
];

export default function UsersTable() {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users?' + new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(sortKey && sortDir ? { sortKey, sortDir } : {}),
      ...filters,
    }));
    const json = await res.json();
    setData(json.rows);
    setTotal(json.total);
    setLoading(false);
  }, [page, pageSize, sortKey, sortDir, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <BoltTable<User>
      columns={columns}
      data={data}
      rowKey="id"
      isLoading={loading}
      pagination={{ current: page, pageSize, total }}
      onPaginationChange={(p, s) => {
        setPage(p);
        setPageSize(s);
      }}
      onSortChange={(key, dir) => {
        setSortKey(key);
        setSortDir(dir);
        setPage(1);           // reset to page 1 on sort change
      }}
      onFilterChange={(f) => {
        setFilters(f);
        setPage(1);           // reset to page 1 on filter change
      }}
    />
  );
}
```

**The rule is simple**: provide the callback → BoltTable delegates. Omit the callback → BoltTable handles it locally.

| Feature | Client-side (local) | Server-side (delegated) |
|---------|-------------------|----------------------|
| Sorting | Omit `onSortChange` | Provide `onSortChange` |
| Filtering | Omit `onFilterChange` | Provide `onFilterChange` |
| Pagination | Pass all data, use `pagination={{ pageSize }}` | Pass current page, use `pagination={{ current, pageSize, total }}` + `onPaginationChange` |

---

### Performance

BoltTable is designed to be fast by default. Here are the key performance characteristics and tips.

#### Virtualization

Only the rows visible in the viewport (plus a small overscan buffer) exist in the DOM. Whether your dataset has 50 rows or 50,000, the DOM node count stays constant. This is powered by TanStack Virtual.

#### Memoize columns and data

BoltTable watches the `columns` array for changes using a content fingerprint. To avoid unnecessary re-renders, memoize your column definitions:

```tsx
// Good — columns are computed once
const columns = useMemo(() => buildColumns(), []);

// Good — data is memoized unless the source changes
const data = useMemo(() => allData.slice(0, 50), [allData]);

// Bad — creates a new array on every render
const columns = buildColumns();
```

#### Stable render functions

Column `render` functions should be stable references when possible. If your render function uses external state, wrap the column definition in `useMemo` with the relevant dependencies:

```tsx
const columns = useMemo(() => [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    render: (value: unknown, record: User) => (
      <NameCell user={record} highlight={searchTerm} />
    ),
  },
], [searchTerm]);
```

#### Large datasets

For 10,000+ rows:
- Set `pagination={false}` and `autoHeight={false}` for a fixed-height virtualized viewport
- Avoid complex render functions that create many DOM nodes per cell
- Use `rowHeight` to give all rows a uniform height (avoids dynamic measurement)

---

### Next.js & Frameworks

#### Next.js (App Router)

BoltTable uses browser APIs (`ResizeObserver`, DOM events, `window.matchMedia`) and must be a client component:

```tsx
'use client';

import { BoltTable } from 'bolt-table';

export function UsersTable({ users }: { users: User[] }) {
  return <BoltTable columns={columns} data={users} rowKey="id" />;
}
```

#### Next.js (Pages Router)

No special configuration needed. Pages Router components are client-side by default.

#### Remix / React Router

No special configuration needed. Works out of the box.

#### Vite

No special configuration needed. Works out of the box.

```tsx
import { BoltTable } from 'bolt-table';
```

---

## Type exports

```ts
import type {
  ColumnType,
  ColumnContextMenuItem,
  RowSelectionConfig,
  ExpandableConfig,
  PaginationType,
  SortDirection,
  DataRecord,
  BoltTableIcons,
} from 'bolt-table';
```

---

## License

MIT © [Venkatesh Sirigineedi](https://github.com/venkateshsirigineedi)
