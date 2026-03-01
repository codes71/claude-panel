// ---- Dashboard ----
export interface TokenItem {
  name: string;
  category: string;
  estimated_tokens: number;
  file_path: string;
  enabled: boolean;
}

export interface TokenCategory {
  name: string;
  total_tokens: number;
  items: TokenItem[];
  color: string;
}

export interface OptimizationSuggestion {
  title: string;
  description: string;
  savings_tokens: number;
  action_type: string;
  action_params: Record<string, unknown>;
}

export interface DashboardData {
  total_tokens: number;
  categories: TokenCategory[];
  suggestions: OptimizationSuggestion[];
  top_consumers: TokenItem[];
}

// Derived for backward compat in components
export interface TokenBreakdown {
  category: string;
  tokens: number;
  color: string;
}

export interface TokenConsumer {
  name: string;
  category: string;
  tokens: number;
}

// ---- Settings ----
export interface StatusLineConfig {
  type: string;
  command: string;
}

export interface SettingsData {
  env: Record<string, string>;
  statusLine: StatusLineConfig | null;
  enabledPlugins: Record<string, boolean>;
  skipDangerousModePermissionPrompt: boolean;
  [key: string]: unknown;
}

export interface EnvVarUpdate {
  key: string;
  value: string | null;
}

export interface SettingsUpdateRequest {
  env?: EnvVarUpdate[];
  statusLine?: StatusLineConfig;
  enabledPlugins?: Record<string, boolean>;
  skipDangerousModePermissionPrompt?: boolean;
}

// ---- Plugins ----
export interface Plugin {
  plugin_id: string;
  name: string;
  marketplace: string;
  version: string;
  enabled: boolean;
  skills: string[];
  agents: string[];
  commands: string[];
  size_bytes: number;
  estimated_tokens: number;
}

export interface PluginListResponse {
  plugins: Plugin[];
  total_tokens: number;
}

// ---- MCP Servers ----
export interface McpServer {
  name: string;
  server_type: "stdio" | "sse";
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  scope: "global" | "project";
  tool_count: number;
  estimated_tokens: number;
}

export interface McpServerCreateRequest {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface McpServerListResponse {
  servers: McpServer[];
  total_tokens: number;
}

// ---- CLAUDE.md ----
export interface ClaudeMdFile {
  path: string;
  scope: "global" | "project";
  size_bytes: number;
  token_estimate: number;
  last_modified: number;
}

export interface ClaudeMdFileContent extends ClaudeMdFile {
  content: string;
}

export interface ClaudeMdUpdateRequest {
  path: string;
  content: string;
}

export interface ClaudeMdCreateRequest {
  path: string;
  content: string;
}

export interface ClaudeMdTreeNode {
  name: string;
  path: string | null;
  scope: "global" | "project" | null;
  token_estimate: number;
  size_bytes: number;
  children: ClaudeMdTreeNode[];
}

export interface ClaudeMdListResponse {
  tree: ClaudeMdTreeNode[];
  files: ClaudeMdFile[];
  total_tokens: number;
}

// ---- Visibility ----
export interface CommandItem {
  name: string;
  file_path: string;
  size_bytes: number;
  description: string;
}

export interface HookItem {
  event: string;
  command: string;
  file_path: string;
}

export interface AgentItem {
  name: string;
  file_path: string;
  description: string;
  size_bytes: number;
}

export interface MemoryFile {
  name: string;
  file_path: string;
  size_bytes: number;
  last_modified: number;
}

export interface VisibilityData {
  commands: CommandItem[];
  hooks: HookItem[];
  agents: AgentItem[];
  memory_files: MemoryFile[];
}
