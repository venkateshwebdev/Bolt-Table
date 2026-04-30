"use client";

import type {
  AICondition,
  AIFilterOperation,
  AIOperation,
  AIPinColumnOperation,
  AIReorderColumnsOperation,
  AIResizeColumnOperation,
  AIResponse,
  AISetPageOperation,
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

let cachedSchema: { fingerprint: string; prompt: string } | null = null;

function buildSchemaFingerprint<T extends DataRecord>(
  columns: ColumnType<T>[],
  dataLen: number,
): string {
  return columns
    .filter((c) => c.key !== "__select__" && c.key !== "__expand__")
    .map((c) => c.key)
    .join(",") + `:${dataLen}`;
}

export function buildSystemPrompt<T extends DataRecord>(
  columns: ColumnType<T>[],
  data: T[],
): string {
  const fingerprint = buildSchemaFingerprint(columns, data.length);
  if (cachedSchema?.fingerprint === fingerprint) {
    return cachedSchema.prompt;
  }

  const cols = columns.filter((c) => c.key !== "__select__" && c.key !== "__expand__");
  const schema = cols.map((c) => {
    const key = c.dataIndex ?? c.key;
    const title = typeof c.title === "string" ? c.title : c.key;
    const info = detectColumnType(key, data);
    const w = c.width ?? 150;
    const pin = c.pinned ? `, pinned: "${c.pinned}"` : "";
    const hidden = c.hidden ? ", hidden: true" : "";
    const vals = info.sample ? "|vals: " + info.sample : "";
    return `  ${c.key}|${key}|"${title}"|${info.type}|w:${w}${pin}${hidden}${vals}`;
  }).join("\n");

  const sample = data.slice(0, 3).map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of cols) {
      const di = col.dataIndex ?? col.key;
      obj[di] = row[di];
    }
    return obj;
  });

  const prompt = `Data table AI. Respond ONLY with valid JSON, no markdown/explanation.

SCHEMA (key|dataIndex|title|type|width|flags|sample):
${schema}

SAMPLE (${sample.length}/${data.length} rows):
${JSON.stringify(sample)}

COLUMN ORDER: [${cols.map((c) => `"${c.key}"`).join(",")}]

OPS (combine any):
filter: {type:"filter",conditions:[{column:"<dataIndex>",op:"<op>",value:<v>}],logic:"and"|"or"}
sort: {type:"sort",column:"<dataIndex>",direction:"asc"|"desc"}
rowStyle: {type:"rowStyle",conditions:[...],logic:"and"|"or",style:{cssProp:"val"}}
cellStyle: {type:"cellStyle",column:"<dataIndex>",conditions:[...],logic:"and"|"or",style:{cssProp:"val"}}
hideColumns: {type:"hideColumns",columns:["key",...]}
showColumns: {type:"showColumns",columns:["key",...]}
resizeColumn: {type:"resizeColumn",column:"<key>",width:<px>}
reorderColumns: {type:"reorderColumns",order:["key1","key2",...]}  (full column order)
pinColumn: {type:"pinColumn",column:"<key>",pinned:"left"|"right"|false}
setPage: {type:"setPage",page:<number>}

OPS: eq,neq,gt,gte,lt,lte,contains,notContains,startsWith,endsWith,in,notIn

FORMAT: {"operations":[...],"message":"brief description"}

RULES:
- Use dataIndex for data ops, key for column ops (hide/show/resize/reorder/pin).
- Colors: semi-transparent rgba. CSS props: camelCase.
- reorderColumns: provide FULL ordered array of ALL visible column keys.
- resizeColumn width: integer pixels (min 40, max 800).
- Combine multiple ops freely. Message: concise plain English.`;

  cachedSchema = { fingerprint, prompt };
  return prompt;
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

export interface AIOperationsResult<T extends DataRecord> {
  filteredData: T[];
  sortOp: AISortOperation | null;
  styleOps: AIStyleOperation[];
  cellStyleOps: AICellStyleOperation[];
  hideColumns: string[];
  showColumns: string[];
  resizeOps: AIResizeColumnOperation[];
  reorderOp: AIReorderColumnsOperation | null;
  pinOps: AIPinColumnOperation[];
  setPageOp: AISetPageOperation | null;
}

export function applyAIOperations<T extends DataRecord>(
  data: T[],
  operations: AIOperation[],
): AIOperationsResult<T> {
  let filteredData = data;
  let sortOp: AISortOperation | null = null;
  const styleOps: AIStyleOperation[] = [];
  const cellStyleOps: AICellStyleOperation[] = [];
  const hideColumns: string[] = [];
  const showColumns: string[] = [];
  const resizeOps: AIResizeColumnOperation[] = [];
  let reorderOp: AIReorderColumnsOperation | null = null;
  const pinOps: AIPinColumnOperation[] = [];
  let setPageOp: AISetPageOperation | null = null;

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
      case "resizeColumn":
        resizeOps.push(op);
        break;
      case "reorderColumns":
        reorderOp = op;
        break;
      case "pinColumn":
        pinOps.push(op);
        break;
      case "setPage":
        setPageOp = op;
        break;
    }
  }

  if (sortOp) {
    filteredData = applyAISort(filteredData, sortOp);
  }

  return { filteredData, sortOp, styleOps, cellStyleOps, hideColumns, showColumns, resizeOps, reorderOp, pinOps, setPageOp };
}
