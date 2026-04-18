#!/usr/bin/env node
/**
 * Fetches https://code.claude.com/docs/en/env-vars and generates
 * frontend/src/data/claudeEnvCatalog.ts
 *
 * Usage: node scripts/generate-claude-env-catalog.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DOC_URL = "https://code.claude.com/docs/en/env-vars.md";

const PREVIEW_KEYS = new Set([
  "ANTHROPIC_BETAS",
  "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS",
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
  "CLAUDE_CODE_NO_FLICKER",
  "ENABLE_TOOL_SEARCH",
  "ENABLE_PROMPT_CACHING_1H",
]);

function categoryForKey(key) {
  if (/^MCP_|^ENABLE_CLAUDEAI_MCP/.test(key)) return "MCP";
  if (/^VERTEX_REGION_/.test(key)) return "Google Vertex AI";
  if (/ANTHROPIC_VERTEX|CLAUDE_CODE_USE_VERTEX|CLAUDE_CODE_SKIP_VERTEX/.test(key)) return "Google Vertex AI";
  if (/BEDROCK|MANTLE|AWS_BEARER|CLAUDE_CODE_USE_BEDROCK|CLAUDE_CODE_USE_MANTLE|CLAUDE_CODE_SKIP_BEDROCK|CLAUDE_CODE_SKIP_MANTLE/.test(key))
    return "Amazon Bedrock";
  if (/FOUNDRY|CLAUDE_CODE_USE_FOUNDRY|CLAUDE_CODE_SKIP_FOUNDRY/.test(key)) return "Microsoft Foundry";
  if (/^OTEL_|^CLAUDE_CODE_OTEL_|^CLAUDE_CODE_ENABLE_TELEMETRY$/.test(key)) return "OpenTelemetry";
  if (/^HTTP_PROXY$|^HTTPS_PROXY$|^NO_PROXY$|CERT_STORE|CLIENT_CERT|CLIENT_KEY|PROXY_RESOLVES/.test(key)) return "Network and TLS";
  if (/^ANTHROPIC_API_KEY$|^ANTHROPIC_AUTH_TOKEN$|^ANTHROPIC_BASE_URL$|^ANTHROPIC_BETAS$|^ANTHROPIC_CUSTOM_/.test(key)) return "Authentication and API";
  if (/^CLAUDE_CODE_OAUTH_/.test(key)) return "Authentication and API";
  if (/^ANTHROPIC_MODEL$|^ANTHROPIC_DEFAULT_|^MAX_THINKING|^CLAUDE_CODE_EFFORT|^CLAUDE_CODE_SUBAGENT_MODEL|^DISABLE_PROMPT_CACHING|^ENABLE_PROMPT_CACHING|^FORCE_PROMPT_CACHING|^CLAUDE_CODE_MAX_OUTPUT|^CLAUDE_CODE_MAX_CONTEXT|^CLAUDE_CODE_DISABLE_1M|^CLAUDE_CODE_DISABLE_ADAPTIVE|^CLAUDE_CODE_DISABLE_THINKING|^DISABLE_INTERLEAVED|^API_TIMEOUT_MS$/.test(key))
    return "Model configuration";
  if (/^CLAUDE_CODE_PLUGIN_|^FORCE_AUTOUPDATE_PLUGINS$/.test(key)) return "Plugins";
  if (/^BASH_/.test(key)) return "Bash and tools";
  if (/^CLAUDE_CODE_GLOB_|^USE_BUILTIN_RIPGREP$|^CLAUDE_CODE_USE_POWERSHELL|^CLAUDE_ENV_FILE$|^SLASH_COMMAND_TOOL/.test(key)) return "Bash and tools";
  if (/^CLAUDE_CONFIG_DIR$|^CLAUDE_CODE_TMPDIR$|DEBUG_LOG/.test(key)) return "Paths and debug";
  if (/^CLAUDE_CODE_IDE_|^CLAUDE_CODE_ACCESSIBILITY$|^CLAUDE_CODE_NO_FLICKER$|^CLAUDE_CODE_DISABLE_MOUSE$|^CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL$|^CLAUDE_CODE_SCROLL_SPEED$|^CLAUDE_CODE_TMUX_TRUECOLOR$|^CLAUDE_CODE_SYNTAX_HIGHLIGHT$/.test(key))
    return "UI and IDE";
  if (/^DISABLE_|^CLAUDE_CODE_DISABLE_NONESSENTIAL|^CLAUDE_CODE_DISABLE_FEEDBACK|^CLAUDE_CODE_DISABLE_TELEMETRY|^DISABLE_TELEMETRY|^DISABLE_ERROR_/.test(key)) return "Privacy and telemetry";
  if (/^CLAUDE_CODE_EXPERIMENTAL_/.test(key)) return "Experimental";
  if (/^CLAUDE_CODE_ENABLE_(AWAY|BACKGROUND_PLUGIN|FINE_GRAINED|PROMPT_SUGGESTION|TASKS)/.test(key)) return "Interactive features";
  if (/^CLAUDE_AGENT_SDK_/.test(key)) return "Agent SDK";
  if (/^CLAUDE_AUTO_|^CLAUDE_BASH_|^CLAUDE_REMOTE|^CLAUDE_STREAM|^CLAUDE_ENABLE_/.test(key)) return "Session and runtime";
  if (/^CLAUDE_CODE_(SHELL|SESSIONEND|RESUME|REMOTE|SUBPROCESS|SYNC_PLUGIN|TASK_LIST|TEAM_NAME|NEW_INIT|FILE_READ|PERFORCE|SCRIPT_CAPS|SIMPLE|SKIP_PROMPT|BARE)/.test(key)) return "Session and runtime";
  if (/^CCR_/.test(key)) return "Remote and cloud session";
  if (/^CLAUDECODE$/.test(key)) return "Session and runtime";
  if (/^IS_DEMO$|^FALLBACK_FOR/.test(key)) return "Session and runtime";
  if (/^MAX_MCP_|^MAX_STRUCTURED/.test(key)) return "MCP";
  if (/^TASK_MAX_/.test(key)) return "Subagents";
  return "Other";
}

function tagsFor(key, description) {
  const tags = [];
  if (PREVIEW_KEYS.has(key)) tags.push("preview");
  if (key === "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS") tags.push("experimental");
  if (/\[DEPRECATED\]|Deprecated\.|deprecated/i.test(description)) tags.push("deprecated");
  if (key === "ENABLE_PROMPT_CACHING_1H_BEDROCK") tags.push("deprecated");
  if (key === "ANTHROPIC_SMALL_FAST_MODEL") tags.push("deprecated");
  return tags;
}

function replacedBy(key) {
  if (key === "ENABLE_PROMPT_CACHING_1H_BEDROCK") return "ENABLE_PROMPT_CACHING_1H";
  return undefined;
}

function escapeDesc(s) {
  return s.replace(/\r/g, "").trim();
}

async function main() {
  const res = await fetch(DOC_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split("\n");
  const rows = [];
  let inTable = false;
  for (const line of lines) {
    // Mintlify .md export: | `KEY` ... | Purpose ... |
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/);
    if (m && !line.includes("| Variable") && !line.includes("| :---")) {
      inTable = true;
      const desc = m[2].replace(/\s+/g, " ").trim();
      if (desc && m[1] !== "Variable") rows.push({ key: m[1], description: desc });
    } else if (inTable && line.startsWith("Standard OpenTelemetry")) {
      break;
    }
  }

  const otelStandard = [
    "OTEL_METRICS_EXPORTER",
    "OTEL_LOGS_EXPORTER",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_PROTOCOL",
    "OTEL_EXPORTER_OTLP_HEADERS",
    "OTEL_METRIC_EXPORT_INTERVAL",
    "OTEL_RESOURCE_ATTRIBUTES",
  ];
  for (const key of otelStandard) {
    rows.push({
      key,
      description:
        "Standard OpenTelemetry exporter variable. See https://code.claude.com/en/monitoring-usage",
    });
  }

  const root = dirname(fileURLToPath(import.meta.url));
  const outPath = join(root, "..", "frontend", "src", "data", "claudeEnvCatalog.ts");

  const entries = rows.map(({ key, description }) => {
    const cat = categoryForKey(key);
    const tags = tagsFor(key, description);
    const rb = replacedBy(key);
    const parts = [`    { key: ${JSON.stringify(key)}, description: ${JSON.stringify(escapeDesc(description))}, category: ${JSON.stringify(cat)}`];
    if (tags.length) parts.push(`, tags: ${JSON.stringify(tags)}`);
    if (rb) parts.push(`, replacedBy: ${JSON.stringify(rb)}`);
    parts.push(" }");
    return parts.join("");
  });

  const order = [
    "Authentication and API",
    "Model configuration",
    "Amazon Bedrock",
    "Google Vertex AI",
    "Microsoft Foundry",
    "MCP",
    "Plugins",
    "Network and TLS",
    "OpenTelemetry",
    "Privacy and telemetry",
    "UI and IDE",
    "Experimental",
    "Interactive features",
    "Agent SDK",
    "Bash and tools",
    "Subagents",
    "Session and runtime",
    "Remote and cloud session",
    "Paths and debug",
    "Other",
  ];
  const categories = [...new Set(rows.map(({ key }) => categoryForKey(key)))].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const header = `/**
 * Claude Code environment variables — bundled catalog.
 * Generated by scripts/generate-claude-env-catalog.mjs from ${DOC_URL}
 * Do not edit by hand; re-run the script to refresh from upstream docs.
 */

export type ClaudeEnvCatalogTag = "preview" | "experimental" | "deprecated";

export interface ClaudeEnvCatalogEntry {
  key: string;
  description: string;
  category: string;
  tags?: ClaudeEnvCatalogTag[];
  replacedBy?: string;
}

export const DOC_URL = "https://code.claude.com/docs/en/env-vars";

export const ENV_CATALOG_CATEGORIES = ${JSON.stringify(categories)} as const;

export type EnvCatalogCategory = (typeof ENV_CATALOG_CATEGORIES)[number];

export const CLAUDE_ENV_CATALOG: ClaudeEnvCatalogEntry[] = [
${entries.join(",\n")}
];
`;

  writeFileSync(outPath, header, "utf8");
  console.log(`Wrote ${rows.length} entries to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
