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

// ---- Code Router ----
export interface CcrProvider {
  name: string;
  api_base_url: string;
  models: string[];
  has_api_key: boolean;
  transformer_names: string[];
}

export interface CcrRouterConfig {
  default_model: string | null;
  background: string | null;
  think: string | null;
  long_context: string | null;
  long_context_threshold: number;
  web_search: string | null;
}

export interface CcrStatus {
  installed: boolean;
  running: boolean;
  config_path: string;
}

export interface CcrDashboardResponse {
  status: CcrStatus;
  providers: CcrProvider[];
  router: CcrRouterConfig;
  raw_config: Record<string, unknown> | null;
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

// ---- Marketplace ----
export interface MarketplaceInfo {
  id: string;
  name: string;
  description: string;
  owner: string;
  plugin_count: number;
  last_updated: string;
}

export interface MarketplacePlugin {
  name: string;
  marketplace_id: string;
  plugin_id: string;
  description: string;
  version: string;
  category: string;
  author: string;
  homepage: string;
  installed: boolean;
  installed_version: string;
  installed_scope: string;
  enabled: boolean;
  skills: string[];
  agents: string[];
  commands: string[];
}

export interface MarketplaceListResponse {
  marketplaces: MarketplaceInfo[];
  plugins: MarketplacePlugin[];
  total_available: number;
  total_installed: number;
}

export interface PluginInstallRequest {
  plugin_id: string;
  scope: string;
}

// ---- Providers ----
export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  owner: string;
  repo: string;
  plugin_count: number;
  last_updated: string;
  install_location: string;
}

export interface ProviderListResponse {
  providers: ProviderInfo[];
}

export interface ProviderAddRequest {
  source: string;
}

export interface ProviderActionResponse {
  name: string;
  action: string;
  success: boolean;
  message: string;
}

// ---- Commands ----
export interface CommandInfo {
  name: string;
  namespace: string;
  qualified_name: string;
  file_path: string;
  size_bytes: number;
  token_estimate: number;
  description: string;
  category: string;
}

export interface CommandDetail extends CommandInfo {
  content: string;
}

export interface CommandNamespace {
  name: string;
  command_count: number;
  total_tokens: number;
}

export interface CommandListResponse {
  namespaces: CommandNamespace[];
  commands: CommandInfo[];
  total_count: number;
  total_tokens: number;
}

export interface CommandCreateRequest {
  namespace: string;
  name: string;
  content: string;
}

export interface CommandUpdateRequest {
  content: string;
}

export interface CommandRenameRequest {
  new_namespace: string;
  new_name: string;
}

// ---- Skill Providers ----

export interface SkillProviderInfo {
  slug: string;
  display_name: string;
  owner: string;
  repo_url: string;
  branch: string;
  added_at: string;
  last_updated: string;
  skill_count: number;
  command_count: number;
}

export interface DiscoveredSkill {
  id: string;
  provider_slug: string;
  name: string;
  path_in_repo: string;
  description: string;
  token_estimate: number;
  installed: boolean;
  installed_scope: string;
  installed_path: string;
}

export interface DiscoveredCommand {
  id: string;
  provider_slug: string;
  name: string;
  path_in_repo: string;
  description: string;
  token_estimate: number;
  installed: boolean;
  installed_scope: string;
  installed_path: string;
}

export interface SkillProviderListResponse {
  providers: SkillProviderInfo[];
  skills: DiscoveredSkill[];
  commands: DiscoveredCommand[];
  total_providers: number;
  total_skills: number;
  total_commands: number;
}

export interface SkillProviderAddRequest {
  source: string;
  branch: string;
}

export interface SkillInstallRequest {
  item_id: string;
  scope: string;
}

export interface SkillProviderActionResponse {
  slug: string;
  action: string;
  success: boolean;
  message: string;
}

export interface SkillInstallActionResponse {
  item_id: string;
  action: string;
  success: boolean;
  message: string;
  installed_path: string;
}
