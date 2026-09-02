import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export function createMockD1(dbFile: string = ":memory:"): D1Database {
  const sqlite = new DatabaseSync(dbFile);

  // Initialize schema if schema.sql exists
  const schemaPath = path.resolve(process.cwd(), "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    sqlite.exec(schema);
  }

  const d1 = {
    prepare(query: string) {
      let boundParams: any[] = [];
      return {
        bind(...values: any[]) {
          boundParams = values;
          return this;
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          const stmt = sqlite.prepare(query);
          const row = stmt.get(...boundParams) as any;
          if (!row) return null;
          if (colName) return row[colName] ?? null;
          return row as T;
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          const stmt = sqlite.prepare(query);
          const rows = stmt.all(...boundParams) as T[];
          return {
            results: rows,
            success: true,
            meta: {} as any,
          };
        },
        async run<T = unknown>(): Promise<D1Result<T>> {
          const stmt = sqlite.prepare(query);
          const info = stmt.run(...boundParams);
          return {
            results: [] as T[],
            success: true,
            meta: {
              changes: Number(info.changes),
              last_row_id: Number(info.lastInsertRowid),
            } as any,
          };
        },
        async raw<T = unknown>(): Promise<T[]> {
          const stmt = sqlite.prepare(query);
          const rows = stmt.all(...boundParams) as any[];
          return rows.map((r) => Object.values(r)) as T[];
        },
      };
    },
    async batch<T = unknown>(statements: any[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
    async exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return {
        count: 1,
        duration: 0,
      };
    },
  };

  return d1 as unknown as D1Database;
}
