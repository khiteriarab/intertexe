type Row = Record<string, unknown>;

function compare(a: unknown, op: "eq" | "in" | "gte", b: unknown) {
  if (op === "eq") return a === b;
  if (op === "in") return Array.isArray(b) && b.includes(a);
  if (op === "gte") return String(a) >= String(b);
  return false;
}

export function createMockSupabase(tables: Record<string, Row[]>) {
  const inserted: Record<string, Row[]> = {};
  return {
    inserted,
    from(name: string) {
      const rows = tables[name] || [];
      const filters: Array<{ col: string; op: "eq" | "in" | "gte"; val: unknown }> = [];
      let countHead = false;
      const run = () => {
        const data = rows.filter((row) =>
          filters.every((f) => compare(row[f.col], f.op, f.val))
        );
        return { data, error: null as null, count: data.length };
      };
      const api: Record<string, unknown> = {
        select(_cols?: string, opts?: { count?: string; head?: boolean }) {
          if (opts?.head && opts?.count === "exact") countHead = true;
          return api;
        },
        eq(col: string, val: unknown) {
          filters.push({ col, op: "eq", val });
          return api;
        },
        in(col: string, val: unknown[]) {
          filters.push({ col, op: "in", val });
          return api;
        },
        gte(col: string, val: unknown) {
          filters.push({ col, op: "gte", val });
          return api;
        },
        limit() {
          return api;
        },
        order() {
          return api;
        },
        maybeSingle() {
          const { data, error } = run();
          return Promise.resolve({ data: data[0] || null, error });
        },
        insert(row: Row | Row[]) {
          const list = Array.isArray(row) ? row : [row];
          inserted[name] = [...(inserted[name] || []), ...list];
          tables[name] = [...(tables[name] || []), ...list];
          const nested = {
            select() {
              return {
                maybeSingle() {
                  return Promise.resolve({ data: list[0], error: null });
                },
              };
            },
            then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
              return Promise.resolve({ data: list, error: null }).then(resolve, reject);
            },
          };
          return nested;
        },
        update(patch: Row) {
          return {
            eq(col: string, val: unknown) {
              for (const row of rows) {
                if (row[col] === val) Object.assign(row, patch);
              }
              return Promise.resolve({ error: null });
            },
          };
        },
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
          const result = run();
          if (countHead) {
            return Promise.resolve({ data: null, error: null, count: result.count }).then(
              resolve,
              reject
            );
          }
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return api;
    },
  };
}
