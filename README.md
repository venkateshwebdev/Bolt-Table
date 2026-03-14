# bolt-table

A high-performance, zero-dependency\* React table component built on [TanStack Virtual](https://tanstack.com/virtual). Only the rows visible in the viewport are ever in the DOM — making it fast for datasets of any size.

\*Only peer dependency is `@tanstack/react-virtual` (+ React). No Tailwind, no CSS framework, no icon library required.

[![npm version](https://img.shields.io/npm/v/bolt-table)](https://www.npmjs.com/package/bolt-table)
[![license](https://img.shields.io/npm/l/bolt-table)](./LICENSE)

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
