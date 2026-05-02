# bolt-table

A high-performance, zero-dependency\* React table component. Only the rows visible in the viewport are ever in the DOM — making it fast for datasets of any size using [TanStack Virtual](https://tanstack.com/virtual).

[![npm version](https://img.shields.io/npm/v/bolt-table)](https://www.npmjs.com/package/bolt-table)
[![license](https://img.shields.io/npm/l/bolt-table)](./LICENSE)
[![github](https://img.shields.io/badge/GitHub-Source-181717?logo=github)](https://github.com/venkateshwebdev/Bolt-Table)
[![website](https://img.shields.io/badge/Docs_&_Examples-bolt--table.vercel.app-blue?logo=vercel)](https://bolt-table.vercel.app/)

---

## Features

- Row & column virtualization
- Dynamic row heights
- Drag-to-reorder columns & rows
- Column pinning, resizing, hiding, picker & persistence
- Row pinning (sticky top/bottom)
- Global search & filter builder
- Sorting (multi-sort with Shift+click)
- Filtering (text, date range, number range)
- Pagination (client or server-side)
- Row selection (checkbox / radio)
- Expandable rows & master-detail
- Conditional formatting
- Row grouping with aggregations
- Tree data (hierarchical rows)
- Editable cells (text, number, select, date, toggle)
- Shimmer loading & infinite scroll
- AI mode (natural-language queries, insights, charts)
- Status bar, toolbar customization, custom icons
- Theme support (auto / light / dark)
- Mobile-friendly context menus (long-press)
- Nested / grouped columns
- Zero-config styling (inline CSS, no imports needed)

---

## Installation

```bash
npm install bolt-table @tanstack/react-virtual
```

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

### Next.js (App Router)

```tsx
'use client';
import { BoltTable } from 'bolt-table';
```

---

## Documentation

For the complete guide with interactive examples, props reference, and API docs visit **[bolt-table.vercel.app](https://bolt-table.vercel.app/)**.

---

## Type exports

```ts
import type {
  ColumnType,
  ColumnContextMenuItem,
  CellContextMenuItem,
  ColumnPersistenceConfig,
  RowSelectionConfig,
  RowPinningConfig,
  ExpandableConfig,
  PaginationType,
  SortDirection,
  DataRecord,
  BoltTableIcons,
  ConditionalFormatRule,
  RowGroupingConfig,
  AggregateFunction,
  TreeDataConfig,
  ClassNamesTypes,
  StylesTypes,
  AIResponse,
  AIOperation,
  BoltTableAIConfig,
  BoltTableConfig,
} from 'bolt-table';
```

---

## License

MIT © [Venkatesh Sirigineedi](https://github.com/venkateshwebdev)
