/** Shape compatible with `ClaudeEnvCatalogEntry` from generated catalog. */
export interface EnvCatalogRow {
  key: string;
  description: string;
  category: string;
  tags?: readonly string[];
}

export function filterClaudeEnvCatalog(
  entries: readonly EnvCatalogRow[],
  opts: { search: string; category: string; previewOnly: boolean },
): EnvCatalogRow[] {
  const q = opts.search.trim().toLowerCase();
  return entries.filter((e) => {
    if (opts.previewOnly) {
      const t = e.tags ?? [];
      const hit = t.includes("preview") || t.includes("experimental");
      if (!hit) return false;
    }
    if (opts.category && e.category !== opts.category) return false;
    if (!q) return true;
    return e.key.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
  });
}
