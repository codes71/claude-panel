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

export interface UsageStats {
  available: boolean;
  messages_today: number;
  messages_week: number;
  sessions_today: number;
  tool_calls_today: number;
  daily_breakdown: { date: string; messages: number; sessions: number; tool_calls: number }[];
}

export interface ConfigInventory {
  plugins: number;
  plugins_enabled: number;
  mcp_servers: number;
  mcp_servers_enabled: number;
  claude_md_files: number;
  commands: number;
  hooks: number;
  agents: number;
  memory_files: number;
}

export interface DashboardData {
  total_tokens: number;
  categories: TokenCategory[];
  suggestions: OptimizationSuggestion[];
  top_consumers: TokenItem[];
  usage_stats?: UsageStats;
  inventory?: ConfigInventory;
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
  server_type: "stdio" | "http";
  command: string | null;
  args: string[];
  env: Record<string, string>;
  url: string | null;
  enabled: boolean;
  scope: "global" | "project" | "plugin";
  project_path?: string | null;
  plugin_id?: string | null;
  read_only?: boolean;
  tool_count: number;
  estimated_tokens: number;
}

export interface McpServerCreateRequest {
  name: string;
  server_type: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  scope: "global" | "project";
  project_path?: string | null;
}

export interface McpServerUpdateRequest {
  new_name?: string;
  server_type?: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  scope?: "global" | "project";
  project_path?: string | null;
}

export interface McpServerListResponse {
  servers: McpServer[];
  total_tokens: number;
}

export interface McpProjectsResponse {
  projects: string[];
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

// ---- Skill Catalog (paginated) ----

export interface CatalogItem {
  id: string;
  provider_slug: string;
  name: string;
  path_in_repo: string;
  description: string;
  category: string;
  token_estimate: number;
  item_type: "skill" | "command";
  installed: boolean;
  installed_scope: string;
  installed_path: string;
}

export interface CatalogPageResponse {
  items: CatalogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ---- Agents ----
export interface AgentInfo {
  name: string;
  display_name: string;
  file_path: string;
  size_bytes: number;
  token_estimate: number;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
  model: string;
}

export interface AgentDetail extends AgentInfo {
  content: string;
}

export interface AgentListResponse {
  agents: AgentInfo[];
  total_count: number;
  total_tokens: number;
}

export interface AgentCreateRequest {
  name: string;
  content: string;
}

export interface AgentUpdateRequest {
  content: string;
}

export interface AgentRenameRequest {
  new_name: string;
}

export interface BrowseEntry {
  name: string;
  path: string;
  is_dir: boolean;
  md_count: number;
}

export interface BrowseResponse {
  path: string;
  parent: string | null;
  entries: BrowseEntry[];
}

export interface AgentScanRequest {
  folder_path: string;
}

export interface AgentScanResponse {
  folder_path: string;
  agents: AgentInfo[];
  total_count: number;
}

export interface AgentImportRequest {
  folder_path: string;
  names: string[];
  overwrite: boolean;
}

export interface AgentImportResponse {
  imported: string[];
  skipped: string[];
  failed: { name: string; reason: string }[];
  imported_count: number;
  skipped_count: number;
  failed_count: number;
}

// ---- Transfers ----
export interface TransferCommandRef {
  namespace: string;
  name: string;
}

export interface TransferPluginRef {
  plugin_id: string;
}

export interface TransferMcpRef {
  name: string;
}

export interface TransferAgentRef {
  name: string;
}

export interface TransferPreviewRequest {
  source_path: string;
  target_path: string;
  commands: TransferCommandRef[];
  plugins: TransferPluginRef[];
  mcp_servers: TransferMcpRef[];
  agents: TransferAgentRef[];
}

export interface TransferApplyRequest extends TransferPreviewRequest {
  conflict_mode: "skip" | "overwrite";
}

export interface TransferItemStatus {
  name: string;
  status: "new" | "noop" | "conflict";
  details?: string;
}

export interface TransferCategorySummary {
  selected: number;
  new_count: number;
  conflicts: number;
  noops: number;
}

export interface TransferPreviewResponse {
  summary: {
    commands: TransferCategorySummary;
    plugins: TransferCategorySummary;
    mcp_servers: TransferCategorySummary;
    agents: TransferCategorySummary;
  };
  commands: TransferItemStatus[];
  plugins: TransferItemStatus[];
  mcp_servers: TransferItemStatus[];
  agents: TransferItemStatus[];
}

export interface TransferApplyResponse {
  applied: number;
  skipped: number;
  failed: number;
  results: {
    commands: TransferItemStatus[];
    plugins: TransferItemStatus[];
    mcp_servers: TransferItemStatus[];
    agents: TransferItemStatus[];
  };
}

// ---- Instances ----
export interface InstanceInfo {
  id: string;
  path: string;
  claude_json_path: string;
  label: string;
  has_credentials: boolean;
  has_settings: boolean;
  has_plugins: boolean;
  has_commands: boolean;
  settings_count: number;
  mcp_server_count: number;
  is_active: boolean;
}

export interface InstanceListResponse {
  instances: InstanceInfo[];
  active: InstanceInfo | null;
}

export interface InstanceSwitchRequest {
  path: string;
}

export interface InstanceAddRequest {
  path: string;
}

// ---- Reliability ----

export interface McpDiagnosticCheck {
  code: string;
  status: "ok" | "warn" | "fail";
  message: string;
}

export interface McpDiagnosticReport {
  name: string;
  enabled: boolean;
  server_type: "stdio" | "http";
  scope: "global" | "project" | "plugin";
  project_path?: string | null;
  status: "ok" | "warn" | "fail";
  checks: McpDiagnosticCheck[];
  checked_at: number;
}

export interface McpDiagnosticsResponse {
  servers: McpDiagnosticReport[];
  total: number;
}

export interface McpHealthItem {
  name: string;
  enabled: boolean;
  scope: "global" | "project" | "plugin";
  project_path?: string | null;
  status: "ok" | "warn" | "fail" | "unknown";
  error_code: string;
  message: string;
  checked_at: number;
}

export interface McpHealthResponse {
  servers: McpHealthItem[];
  updated_at: number;
}

export interface ClaudeMdDriftEvent {
  path: string;
  event_type: "added" | "changed" | "removed";
  scope: "global" | "project";
  last_modified: number;
}

export interface ClaudeMdDriftResponse {
  events: ClaudeMdDriftEvent[];
  cursor: string;
  generated_at: number;
}

export interface ProviderLockEntry {
  slug: string;
  repo: string;
  branch: string;
  commit: string;
  updated_at: string;
}

export interface ProviderProvenanceResponse {
  version: number;
  providers: ProviderLockEntry[];
}

export interface ConfigBundleExportResponse {
  bundle: Record<string, unknown>;
}

export interface ConfigBundleValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigBundleApplyResponse {
  applied: boolean;
  changes: string[];
  errors: string[];
  warnings: string[];
}
