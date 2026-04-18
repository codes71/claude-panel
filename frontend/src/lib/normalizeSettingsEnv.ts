/** Claude Code `settings.json` may store `env` as a map or as `{ key, value }[]`. */

export interface EnvRow {
  key: string;
  value: string;
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Normalize `settings.env` into editable rows (never uses array indices as keys). */
export function envFieldToRows(env: unknown): EnvRow[] {
  if (env == null) return [];
  if (Array.isArray(env)) {
    const rows: EnvRow[] = [];
    for (const item of env) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const key = rec.key;
      if (typeof key !== "string" || key.trim() === "") continue;
      rows.push({ key, value: stringifyValue(rec.value) });
    }
    return rows;
  }
  if (typeof env === "object") {
    return Object.entries(env as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: stringifyValue(value),
    }));
  }
  return [];
}

/** Keys currently defined in `settings.env` (both storage shapes). */
export function envFieldKeys(env: unknown): string[] {
  return envFieldToRows(env).map((r) => r.key);
}
