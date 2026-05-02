import { useState, useMemo, useCallback } from "react";
import { BoltTable } from "bolt-table";
import type { ColumnType } from "bolt-table";

interface Employee {
  key: string;
  name: string;
  age: number;
  department: string;
  salary: number;
  joinDate: string;
  status: "active" | "inactive" | "on_leave";
  email: string;
  role: string;
  rating: number;
}

const DEPARTMENTS = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance"];
const ROLES = ["Manager", "Senior", "Mid", "Junior", "Intern"];
const STATUSES: Employee["status"][] = ["active", "inactive", "on_leave"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateData(count: number): Employee[] {
  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack", "Karen", "Leo", "Mia", "Noah", "Olivia", "Paul", "Quinn", "Ryan", "Sara", "Tom"];
  const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson"];

  return Array.from({ length: count }, (_, i) => {
    const first = randomFrom(firstNames);
    const last = randomFrom(lastNames);
    return {
      key: String(i + 1),
      name: `${first} ${last}`,
      age: 22 + Math.floor(Math.random() * 40),
      department: randomFrom(DEPARTMENTS),
      salary: 30000 + Math.floor(Math.random() * 120000),
      joinDate: `${2015 + Math.floor(Math.random() * 10)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`,
      status: randomFrom(STATUSES),
      email: `${first.toLowerCase()}.${last.toLowerCase()}@company.com`,
      role: randomFrom(ROLES),
      rating: Math.round((1 + Math.random() * 4) * 10) / 10,
    };
  });
}

const themes = {
  dark: {
    bg: "#0f0f0f",
    text: "#e0e0e0",
    border: "#333",
    inputBg: "#1a1a1a",
    cardBg: "#181818",
    muted: "#888",
    accent: "#6366f1",
  },
  light: {
    bg: "#f8f9fa",
    text: "#1a1a2e",
    border: "#ddd",
    inputBg: "#fff",
    cardBg: "#fff",
    muted: "#666",
    accent: "#4f46e5",
  },
} as const;

const statusColors: Record<string, string> = {
  active: "#22c55e",
  inactive: "#ef4444",
  on_leave: "#f59e0b",
};

export default function App() {
  const [data, setData] = useState(() => generateData(200));
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [rowCount, setRowCount] = useState(200);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [viewMode, setViewMode] = useState<"full" | "default">("full");

  const t = themes[theme];

  const columns = useMemo<ColumnType<Employee>[]>(
    () => [
      {
        key: "name",
        dataIndex: "name",
        title: "Name",
        width: 180,
        sortable: true,
        sorter: true,
        editable: true,
      },
      {
        key: "email",
        dataIndex: "email",
        title: "Email",
        width: 250,
        copy: true,
      },
      {
        key: "department",
        dataIndex: "department",
        title: "Department",
        width: 140,
        sortable: true,
        sorter: true,
        editable: true,
        editorType: "select",
        editorOptions: DEPARTMENTS,
      },
      {
        key: "role",
        dataIndex: "role",
        title: "Role",
        width: 120,
        sortable: true,
        sorter: true,
      },
      {
        key: "age",
        dataIndex: "age",
        title: "Age",
        width: 80,
        sortable: true,
        sorter: (a, b) => a.age - b.age,
        filterType: "numberRange",
      },
      {
        key: "salary",
        dataIndex: "salary",
        title: "Salary",
        width: 120,
        sortable: true,
        sorter: (a, b) => a.salary - b.salary,
        filterType: "numberRange",
        render: (v) => `$${(v as number).toLocaleString()}`,
      },
      {
        key: "joinDate",
        dataIndex: "joinDate",
        title: "Join Date",
        width: 130,
        sortable: true,
        sorter: true,
        filterType: "dateRange",
      },
      {
        key: "status",
        dataIndex: "status",
        title: "Status",
        width: 110,
        sortable: true,
        sorter: true,
        editable: true,
        editorType: "select",
        editorOptions: STATUSES.map((s) => ({
          label: s.replace("_", " "),
          value: s,
        })),
        render: (v) => {
          const s = v as string;
          return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: statusColors[s] ?? "#888",
                }}
              />
              {s.replace("_", " ")}
            </span>
          );
        },
      },
      {
        key: "rating",
        dataIndex: "rating",
        title: "Rating",
        width: 100,
        sortable: true,
        sorter: (a, b) => a.rating - b.rating,
        render: (v) => {
          const n = v as number;
          return (
            <span style={{ color: n >= 4 ? "#22c55e" : n >= 3 ? "#f59e0b" : "#ef4444" }}>
              {"★".repeat(Math.round(n))}{"☆".repeat(5 - Math.round(n))} {n.toFixed(1)}
            </span>
          );
        },
      },
    ],
    [],
  );

  const handleEdit = useCallback(
    (
      value: unknown,
      record: Employee,
      dataIndex: string,
      _rowIndex: number,
    ) => {
      setData((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.key === record.key);
        if (idx !== -1) {
          next[idx] = { ...next[idx], [dataIndex]: value };
        }
        return next;
      });
    },
    [],
  );

  const bareColumns = useMemo<ColumnType<Employee>[]>(
    () => [
      { key: "name", dataIndex: "name", title: "Name", width: 180 },
      { key: "email", dataIndex: "email", title: "Email", width: 250 },
      { key: "department", dataIndex: "department", title: "Department", width: 140 },
      { key: "role", dataIndex: "role", title: "Role", width: 120 },
      { key: "age", dataIndex: "age", title: "Age", width: 80 },
      { key: "salary", dataIndex: "salary", title: "Salary", width: 120 },
      { key: "joinDate", dataIndex: "joinDate", title: "Join Date", width: 130 },
      { key: "status", dataIndex: "status", title: "Status", width: 110 },
      { key: "rating", dataIndex: "rating", title: "Rating", width: 100 },
    ],
    [],
  );

  const handleRegenerate = useCallback(() => {
    setData(generateData(rowCount));
    setSelectedKeys([]);
  }, [rowCount]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        fontSize: 13,
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Bolt Table Playground
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: t.muted }}>Rows:</label>
            <input
              type="number"
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value) || 10)}
              style={{
                width: 70,
                padding: "4px 8px",
                borderRadius: 4,
                border: `1px solid ${t.border}`,
                background: t.inputBg,
                color: t.text,
                fontSize: 13,
              }}
            />
            <button
              type="button"
              onClick={handleRegenerate}
              style={{
                padding: "5px 14px",
                borderRadius: 4,
                border: `1px solid ${t.border}`,
                background: t.cardBg,
                color: t.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Regenerate
            </button>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setViewMode((p) => (p === "full" ? "default" : "full"))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${viewMode === "default" ? t.accent : t.border}`,
              background: viewMode === "default" ? t.accent : t.cardBg,
              color: viewMode === "default" ? "#fff" : t.text,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              transition: "background 0.3s, color 0.3s, border 0.3s",
            }}
          >
            {viewMode === "default" ? "Default View" : "Default View"}
          </button>
          <button
            type="button"
            onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              background: t.cardBg,
              color: t.text,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              transition: "background 0.3s, color 0.3s, border 0.3s",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        {viewMode === "default" ? (
          <>
            <p style={{ margin: "0 0 12px", color: t.muted, fontSize: 12 }}>
              This is what a user sees with just <code style={{ background: "rgba(128,128,128,0.15)", padding: "1px 5px", borderRadius: 3 }}>&lt;BoltTable data=&#123;data&#125; columns=&#123;columns&#125; rowKey="key" /&gt;</code> — zero configuration.
            </p>
            <div style={{ height: "70vh" }}>
              <BoltTable<Employee>
                data={data}
                columns={bareColumns}
                rowKey="key"
              />
            </div>
          </>
        ) : (
        <div style={{ height: "75vh" }}>
          <BoltTable<Employee>
            data={data}
            columns={columns}
            rowKey="key"
            theme={theme}
            accentColor={'#00ff00'}
            enableRowAnimation
            multiSort
            showStatusBar
            enableFilterBuilder
            aiMode
            showColumnSettings
            styles={{
              wrapper: {
                background: t.cardBg,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                overflow: "hidden",
              },
            }}
            rowSelection={{
              type: "checkbox",
              selectedRowKeys: selectedKeys,
              onChange: (keys) => setSelectedKeys(keys),
            }}
            pagination={{ pageSize: 50, pageSizeOptions: [25, 50, 100, 200] }}
            onEdit={handleEdit}
            conditionalFormatting={[
              {
                columns: ["salary"],
                condition: (v) => (v as number) > 120000,
                style: { color: "#22c55e", fontWeight: 600 },
              },
              {
                condition: (_v, r) => (r as Employee).status === "inactive",
                style: { opacity: 0.5 },
                applyToRow: true,
              },
            ]}
            masterDetail={(record, close) => (
              <div style={{ padding: 20 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>
                  {record.name} - Details
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 12,
                  }}
                >
                  {Object.entries(record).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 13 }}>
                      <span style={{ color: t.muted }}>{k}: </span>
                      <span style={{ fontWeight: 500 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    marginTop: 12,
                    padding: "4px 12px",
                    borderRadius: 4,
                    border: `1px solid ${t.border}`,
                    background: t.cardBg,
                    color: t.text,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          />
        </div>
        )}
      </div>
    </div>
  );
}
