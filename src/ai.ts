"use client";

import type {
  AICondition,
  AIFilterOperation,
  AIOperation,
  AIResponse,
  AISortOperation,
  AIStyleOperation,
  AICellStyleOperation,
  BoltTableAIConfig,
  ColumnType,
  DataRecord,
} from "./types";

function detectColumnType(
  key: string,
  data: DataRecord[],
): { type: string; sample: string } {
  const values: unknown[] = [];
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const v = data[i]?.[key];
    if (v != null) values.push(v);
  }
  if (values.length === 0) return { type: "unknown", sample: "" };

  const allNumbers = values.every((v) => typeof v === "number");
  const allBooleans = values.every((v) => typeof v === "boolean");

  const uniqueVals = [...new Set(values.map(String))];
  const sampleStr =
    uniqueVals.length <= 8
      ? uniqueVals.join(", ")
      : uniqueVals.slice(0, 6).join(", ") + "...";

  if (allBooleans) return { type: "boolean", sample: sampleStr };
  if (allNumbers) {
    const nums = values as number[];
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return { type: "number", sample: `range ${min}–${max}` };
  }
  return { type: "string", sample: sampleStr };
}

export function buildSystemPrompt<T extends DataRecord>(
  columns: ColumnType<T>[],
  data: T[],
): string {
  const schemaLines = columns
    .filter((c) => c.key !== "__select__" && c.key !== "__expand__")
    .map((c) => {
      const key = c.dataIndex ?? c.key;
      const title = typeof c.title === "string" ? c.title : c.key;
      const info = detectColumnType(key, data);
      return `  - key: "${c.key}", title: "${title}", dataIndex: "${key}", type: ${info.type}${info.sample ? ` (values: ${info.sample})` : ""}`;
    })
    .join("\n");

  const sample = data.slice(0, 5).map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      if (col.key === "__select__" || col.key === "__expand__") continue;
      const di = col.dataIndex ?? col.key;
      obj[di] = row[di];
    }
    return obj;
  });

  return `You are a data table assistant. You help users query, filter, sort, and style tabular data.
You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation, no extra text.

## Table Schema
${schemaLines}

## Sample Data (first ${sample.length} of ${data.length} rows)
${JSON.stringify(sample, null, 2)}

## Available Operations
Combine any of these in a single response:

1. **filter** — show only rows matching conditions
   { "type": "filter", "conditions": [{ "column": "<dataIndex>", "op": "<op>", "value": <val> }], "logic": "and" | "or" }

2. **rowStyle** — apply CSS styles to entire rows matching conditions
   { "type": "rowStyle", "conditions": [...], "logic": "and"|"or", "style": { "<cssProp>": "<value>" } }

3. **cellStyle** — apply CSS styles to a specific column's cells matching conditions
   { "type": "cellStyle", "column": "<dataIndex>", "conditions": [...], "logic": "and"|"or", "style": { "<cssProp>": "<value>" } }

4. **sort** — sort data by a column
   { "type": "sort", "column": "<dataIndex>", "direction": "asc" | "desc" }

5. **hideColumns** / **showColumns** — toggle column visibility
   { "type": "hideColumns" | "showColumns", "columns": ["<key>", ...] }

## Operators
eq, neq, gt, gte, lt, lte, contains, notContains, startsWith, endsWith, in, notIn

## Response format
{
  "operations": [ ... ],
  "message": "Brief user-friendly description of what was applied"
}

## Rules
- Use the dataIndex values from the schema, not display titles.
- For colors use semi-transparent values like "rgba(255,0,0,0.15)" so text stays readable.
- CSS property names must be camelCase (e.g. "backgroundColor", "color", "fontWeight").
- If the user asks to highlight / color / mark specific rows, use rowStyle or cellStyle.
- If the user asks to show only certain rows, use filter.
- You can combine filter + rowStyle + sort etc. in one response.
- The "message" should be concise: what was done, in plain English.`;
}

export async function callAI(
  config: BoltTableAIConfig,
  systemPrompt: string,
  userQuery: string,
): Promise<string> {
  const { provider, apiKey, model, baseUrl, maxTokens = 1024, temperature = 0.1 } = config;

  if (provider === "openai" || provider === "custom") {
    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/chat/completions`
      : "https://api.openai.com/v1/chat/completions";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${body}`);
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "anthropic") {
    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/messages`
      : "https://api.anthropic.com/v1/messages";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: model ?? "claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: [{ role: "user", content: userQuery }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${body}`);
    }

    const json = await res.json();
    const textBlock = json.content?.find(
      (b: { type: string }) => b.type === "text",
    );
    return textBlock?.text ?? "";
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

export function parseAIResponse(raw: string): AIResponse {
  let text = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  // Try to find JSON object boundaries
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  const parsed = JSON.parse(text);

  if (!parsed.operations || !Array.isArray(parsed.operations)) {
    throw new Error("Invalid AI response: missing operations array");
  }

  return {
    operations: parsed.operations,
    message: parsed.message ?? "AI operations applied.",
  };
}

export function evaluateCondition(
  condition: AICondition,
  row: DataRecord,
): boolean {
  const rawVal = row[condition.column];
  const target = condition.value;

  switch (condition.op) {
    case "eq":
      // eslint-disable-next-line eqeqeq
      return rawVal == target;
    case "neq":
      // eslint-disable-next-line eqeqeq
      return rawVal != target;
    case "gt":
      return Number(rawVal) > Number(target);
    case "gte":
      return Number(rawVal) >= Number(target);
    case "lt":
      return Number(rawVal) < Number(target);
    case "lte":
      return Number(rawVal) <= Number(target);
    case "contains":
      return String(rawVal ?? "")
        .toLowerCase()
        .includes(String(target).toLowerCase());
    case "notContains":
      return !String(rawVal ?? "")
        .toLowerCase()
        .includes(String(target).toLowerCase());
    case "startsWith":
      return String(rawVal ?? "")
        .toLowerCase()
        .startsWith(String(target).toLowerCase());
    case "endsWith":
      return String(rawVal ?? "")
        .toLowerCase()
        .endsWith(String(target).toLowerCase());
    case "in":
      if (Array.isArray(target)) {
        // eslint-disable-next-line eqeqeq
        return target.some((t) => rawVal == t);
      }
      return false;
    case "notIn":
      if (Array.isArray(target)) {
        // eslint-disable-next-line eqeqeq
        return !target.some((t) => rawVal == t);
      }
      return true;
    default:
      return true;
  }
}

function matchesConditions(
  conditions: AICondition[],
  logic: "and" | "or" | undefined,
  row: DataRecord,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  if (logic === "or") {
    return conditions.some((c) => evaluateCondition(c, row));
  }
  return conditions.every((c) => evaluateCondition(c, row));
}

export function applyAIFilter<T extends DataRecord>(
  data: T[],
  op: AIFilterOperation,
): T[] {
  return data.filter((row) => matchesConditions(op.conditions, op.logic, row));
}

export function applyAISort<T extends DataRecord>(
  data: T[],
  op: AISortOperation,
): T[] {
  const dir = op.direction === "asc" ? 1 : -1;
  const col = op.column;
  return [...data].sort((a, b) => {
    const aVal = a[col];
    const bVal = b[col];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "number" && typeof bVal === "number")
      return (aVal - bVal) * dir;
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
}

export function getAIRowStyle(
  row: DataRecord,
  ops: AIStyleOperation[],
): React.CSSProperties | undefined {
  let merged: React.CSSProperties | undefined;
  for (const op of ops) {
    if (matchesConditions(op.conditions, op.logic, row)) {
      if (!merged) merged = {};
      Object.assign(merged, op.style);
    }
  }
  return merged;
}

export function getAICellStyle(
  row: DataRecord,
  columnKey: string,
  ops: AICellStyleOperation[],
): React.CSSProperties | undefined {
  let merged: React.CSSProperties | undefined;
  for (const op of ops) {
    if (op.column === columnKey && matchesConditions(op.conditions, op.logic, row)) {
      if (!merged) merged = {};
      Object.assign(merged, op.style);
    }
  }
  return merged;
}

export function applyAIOperations<T extends DataRecord>(
  data: T[],
  operations: AIOperation[],
): {
  filteredData: T[];
  sortOp: AISortOperation | null;
  styleOps: AIStyleOperation[];
  cellStyleOps: AICellStyleOperation[];
  hideColumns: string[];
  showColumns: string[];
} {
  let filteredData = data;
  let sortOp: AISortOperation | null = null;
  const styleOps: AIStyleOperation[] = [];
  const cellStyleOps: AICellStyleOperation[] = [];
  const hideColumns: string[] = [];
  const showColumns: string[] = [];

  for (const op of operations) {
    switch (op.type) {
      case "filter":
        filteredData = applyAIFilter(filteredData, op);
        break;
      case "sort":
        sortOp = op;
        break;
      case "rowStyle":
        styleOps.push(op);
        break;
      case "cellStyle":
        cellStyleOps.push(op);
        break;
      case "hideColumns":
        hideColumns.push(...op.columns);
        break;
      case "showColumns":
        showColumns.push(...op.columns);
        break;
    }
  }

  if (sortOp) {
    filteredData = applyAISort(filteredData, sortOp);
  }

  return { filteredData, sortOp, styleOps, cellStyleOps, hideColumns, showColumns };
}
