function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

export function parseCsv(text: string): { columns: string[]; rows: Array<Record<string, string>> } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) return { columns: [], rows: [] };
  const columns = splitCsvLine(lines[0]).map((col) => col.trim()).filter(Boolean);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    columns.forEach((col, index) => {
      row[col] = cells[index] || "";
    });
    return row;
  });
  return { columns, rows };
}

export function parseImportPayload(input: { csv?: string; json?: unknown }): {
  columns: string[];
  rows: Array<Record<string, string>>;
} {
  if (input.csv && input.csv.trim()) return parseCsv(input.csv);
  if (Array.isArray(input.json)) {
    const rows = input.json.map((row) => {
      const out: Record<string, string> = {};
      if (row && typeof row === "object") {
        for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
          out[key] = value == null ? "" : String(value);
        }
      }
      return out;
    });
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    return { columns, rows };
  }
  return { columns: [], rows: [] };
}
