import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Checkbox,
  Switch,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CodeIcon from "@mui/icons-material/Code";
import TerminalIcon from "@mui/icons-material/Terminal";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExtensionIcon from "@mui/icons-material/Extension";
import PowerIcon from "@mui/icons-material/Power";
import PowerOffIcon from "@mui/icons-material/PowerOff";
import {
  useSkillProviders,
  useAddSkillProvider,
  useRemoveSkillProvider,
  useUpdateSkillProvider,
  useInstallSkill,
  useUninstallSkill,
} from "../api/skillProviders";
import { usePlugins, useTogglePlugin } from "../api/plugins";
import type { DiscoveredSkill, DiscoveredCommand } from "../types";

type CatalogItem = (DiscoveredSkill | DiscoveredCommand) & { type: "skill" | "command" };

export default function SkillCatalogPage() {
  // Query hooks
  const { data, isLoading, error } = useSkillProviders();
  const { data: pluginData } = usePlugins();
  const addProvider = useAddSkillProvider();
  const removeProvider = useRemoveSkillProvider();
  const updateProvider = useUpdateSkillProvider();
  const installSkill = useInstallSkill();
  const uninstallSkill = useUninstallSkill();
  const togglePlugin = useTogglePlugin();

  // Installed skills section
  const [installedExpanded, setInstalledExpanded] = useState(true);
  const [installedSearch, setInstalledSearch] = useState("");
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

  // Group installed skills by plugin
  interface PluginGroup {
    pluginId: string;
    name: string;
    enabled: boolean;
    skills: { skill: string; slash: string }[];
  }

  const pluginGroups = useMemo<PluginGroup[]>(() => {
    if (!pluginData?.plugins) return [];
    return pluginData.plugins
      .filter((p) => p.skills.length > 0)
      .map((p) => ({
        pluginId: p.plugin_id,
        name: p.name,
        enabled: p.enabled,
        skills: p.skills.map((s) => ({
          skill: s,
          slash: p.skills.length === 1 && s === p.name ? `/${s}` : `/${p.name}:${s}`,
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pluginData]);

  const totalSkillCount = useMemo(() => pluginGroups.reduce((sum, g) => sum + g.skills.length, 0), [pluginGroups]);

  const filteredGroups = useMemo(() => {
    if (!installedSearch) return pluginGroups;
    const q = installedSearch.toLowerCase();
    return pluginGroups
      .map((g) => ({
        ...g,
        skills: g.skills.filter(
          (s) => s.skill.toLowerCase().includes(q) || s.slash.toLowerCase().includes(q) || g.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.skills.length > 0);
  }, [pluginGroups, installedSearch]);

  const togglePluginExpanded = (name: string) => {
    setExpandedPlugins((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const togglePluginSelected = (name: string) => {
    setSelectedPlugins((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleBulkDisable = () => {
    for (const pluginId of selectedPlugins) {
      const group = pluginGroups.find((g) => g.pluginId === pluginId);
      if (group?.enabled) {
        togglePlugin.mutate({ pluginId, enabled: false });
      }
    }
    setSelectedPlugins(new Set());
    setToast({ msg: `Disabled ${selectedPlugins.size} plugin(s)`, severity: "success" });
  };

  const handleBulkEnable = () => {
    for (const pluginId of selectedPlugins) {
      const group = pluginGroups.find((g) => g.pluginId === pluginId);
      if (!group?.enabled) {
        togglePlugin.mutate({ pluginId, enabled: true });
      }
    }
    setSelectedPlugins(new Set());
    setToast({ msg: `Enabled ${selectedPlugins.size} plugin(s)`, severity: "success" });
  };

  // UI state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "skills" | "commands">("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [providersExpanded, setProvidersExpanded] = useState(true);

  // Add provider dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addSource, setAddSource] = useState("");
  const [addBranch, setAddBranch] = useState("main");

  // Install dialog
  const [installItem, setInstallItem] = useState<CatalogItem | null>(null);
  const [installScope, setInstallScope] = useState<"personal" | "project">("personal");

  // Uninstall dialog
  const [uninstallItem, setUninstallItem] = useState<CatalogItem | null>(null);

  // Remove provider dialog
  const [removeSlug, setRemoveSlug] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // Combine skills and commands into unified list
  const allItems = useMemo<CatalogItem[]>(() => {
    if (!data) return [];
    const skills: CatalogItem[] = (data.skills || []).map((s) => ({ ...s, type: "skill" as const }));
    const commands: CatalogItem[] = (data.commands || []).map((c) => ({ ...c, type: "command" as const }));
    return [...skills, ...commands];
  }, [data]);

  // Filtered items
  const filtered = useMemo(() => {
    let items = allItems;
    if (typeFilter === "skills") items = items.filter((i) => i.type === "skill");
    if (typeFilter === "commands") items = items.filter((i) => i.type === "command");
    if (providerFilter !== "all") items = items.filter((i) => i.provider_slug === providerFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
      );
    }
    return items;
  }, [allItems, typeFilter, providerFilter, search]);

  // Handlers
  const handleAddProvider = () => {
    if (!addSource.trim()) return;
    addProvider.mutate(
      { source: addSource.trim(), branch: addBranch.trim() || "main" },
      {
        onSuccess: (res) => {
          setToast({ msg: res.message || `Provider added: ${res.slug}`, severity: "success" });
          setAddOpen(false);
          setAddSource("");
          setAddBranch("main");
        },
        onError: (e: any) => setToast({ msg: e.detail || e.message || "Failed to add provider", severity: "error" }),
      },
    );
  };

  const handleRemoveProvider = () => {
    if (!removeSlug) return;
    removeProvider.mutate(removeSlug, {
      onSuccess: (res) => {
        setToast({ msg: res.message || `Provider removed: ${res.slug}`, severity: "success" });
        setRemoveSlug(null);
      },
      onError: (e: any) => setToast({ msg: e.detail || e.message || "Failed to remove provider", severity: "error" }),
    });
  };

  const handleUpdateAll = () => {
    updateProvider.mutate(undefined, {
      onSuccess: () => setToast({ msg: "All providers updated", severity: "success" }),
      onError: (e: any) => setToast({ msg: e.detail || e.message || "Update failed", severity: "error" }),
    });
  };

  const handleUpdateOne = (slug: string) => {
    updateProvider.mutate(slug, {
      onSuccess: () => setToast({ msg: `Provider updated: ${slug}`, severity: "success" }),
      onError: (e: any) => setToast({ msg: e.detail || e.message || "Update failed", severity: "error" }),
    });
  };

  const handleInstall = () => {
    if (!installItem) return;
    installSkill.mutate(
      { item_id: installItem.id, scope: installScope },
      {
        onSuccess: (res) => {
          setToast({ msg: res.message || `Installed to ${res.installed_path}`, severity: "success" });
          setInstallItem(null);
          setInstallScope("personal");
        },
        onError: (e: any) => setToast({ msg: e.detail || e.message || "Install failed", severity: "error" }),
      },
    );
  };

  const handleUninstall = () => {
    if (!uninstallItem) return;
    uninstallSkill.mutate(
      { item_id: uninstallItem.id, scope: "" },
      {
        onSuccess: (res) => {
          setToast({ msg: res.message || `Uninstalled: ${uninstallItem.name}`, severity: "success" });
          setUninstallItem(null);
        },
        onError: (e: any) => setToast({ msg: e.detail || e.message || "Uninstall failed", severity: "error" }),
      },
    );
  };

  if (error) return <Alert severity="error">Failed to load skill providers: {(error as any).message}</Alert>;

  const providers = data?.providers || [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Skill Catalog</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Browse and install skills and commands from GitHub repositories.
      </Typography>

      {/* ---- Provider Management Section ---- */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="h6">Providers</Typography>
          <IconButton size="small" onClick={() => setProvidersExpanded(!providersExpanded)}>
            {providersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <Button size="small" startIcon={<RefreshIcon />} onClick={handleUpdateAll} disabled={updateProvider.isPending || providers.length === 0}>
            Update All
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add Provider
          </Button>
        </Box>
        <Collapse in={providersExpanded}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress /></Box>
          ) : providers.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>No providers added yet. Click "Add Provider" to get started.</Alert>
          ) : (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {providers.map((p) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={p.slug}>
                  <Card variant="outlined">
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{p.display_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.owner}</Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Chip label={`${p.skill_count} skills`} size="small" color="primary" variant="outlined" />
                        <Chip label={`${p.command_count} commands`} size="small" color="secondary" variant="outlined" />
                      </Box>
                      {p.last_updated && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Updated: {new Date(p.last_updated).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Tooltip title="Update from remote">
                        <IconButton size="small" onClick={() => handleUpdateOne(p.slug)} disabled={updateProvider.isPending}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove provider">
                        <IconButton size="small" color="error" onClick={() => setRemoveSlug(p.slug)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Collapse>
      </Box>

      {/* ---- Installed Skills Section ---- */}
      {pluginGroups.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="h6">Installed Skills</Typography>
            <Chip label={totalSkillCount} size="small" color="success" />
            <IconButton size="small" onClick={() => setInstalledExpanded(!installedExpanded)}>
              {installedExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Box sx={{ flex: 1 }} />
            {selectedPlugins.size > 0 && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" startIcon={<PowerIcon />} onClick={handleBulkEnable} color="success" variant="outlined">
                  Enable ({selectedPlugins.size})
                </Button>
                <Button size="small" startIcon={<PowerOffIcon />} onClick={handleBulkDisable} color="error" variant="outlined">
                  Disable ({selectedPlugins.size})
                </Button>
              </Box>
            )}
          </Box>
          <Collapse in={installedExpanded}>
            <Box sx={{ mb: 1.5 }}>
              <TextField
                size="small"
                placeholder="Search installed skills..."
                value={installedSearch}
                onChange={(e) => setInstalledSearch(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            {filteredGroups.map((group) => {
              const isExpanded = expandedPlugins.has(group.name);
              const isSelected = selectedPlugins.has(group.pluginId);
              return (
                <Card
                  key={group.pluginId}
                  variant="outlined"
                  sx={{
                    mb: 1,
                    opacity: group.enabled ? 1 : 0.5,
                    borderColor: (t) => group.enabled ? alpha(t.palette.success.main, 0.25) : "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1.5,
                      py: 0.75,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => togglePluginExpanded(group.name)}
                  >
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => togglePluginSelected(group.pluginId)}
                      sx={{ p: 0.5, mr: 0.5 }}
                    />
                    <ExtensionIcon sx={{ fontSize: 18, color: group.enabled ? "success.main" : "text.disabled", mr: 1 }} />
                    <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
                      {group.name}
                    </Typography>
                    <Chip label={`${group.skills.length} skill${group.skills.length !== 1 ? "s" : ""}`} size="small" variant="outlined" sx={{ mr: 1 }} />
                    <Tooltip title={group.enabled ? "Disable plugin" : "Enable plugin"}>
                      <Switch
                        size="small"
                        checked={group.enabled}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => togglePlugin.mutate({ pluginId: group.pluginId, enabled: !group.enabled })}
                      />
                    </Tooltip>
                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                  <Collapse in={isExpanded}>
                    <Box sx={{ px: 2, pb: 1.5 }}>
                      <Grid container spacing={1}>
                        {group.skills.map((s) => (
                          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={s.slash}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                py: 0.5,
                                px: 1,
                                borderRadius: 1,
                                bgcolor: (t) => alpha(t.palette.background.default, 0.5),
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <TerminalIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "0.7rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.slash}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Collapse>
                </Card>
              );
            })}
            {filteredGroups.length === 0 && installedSearch && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No installed skills match "{installedSearch}"
              </Typography>
            )}
          </Collapse>
        </Box>
      )}

      {/* ---- Skill Catalog Section ---- */}
      <Typography variant="h6" gutterBottom>Catalog</Typography>

      {/* Filter bar */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search skills and commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 250 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {(["all", "skills", "commands"] as const).map((t) => (
            <Chip
              key={t}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              color={typeFilter === t ? "primary" : "default"}
              onClick={() => setTypeFilter(t)}
              variant={typeFilter === t ? "filled" : "outlined"}
              size="small"
            />
          ))}
        </Box>
        {providers.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Provider</InputLabel>
            <Select value={providerFilter} label="Provider" onChange={(e) => setProviderFilter(e.target.value)}>
              <MenuItem value="all">All Providers</MenuItem>
              {providers.map((p) => (
                <MenuItem key={p.slug} value={p.slug}>{p.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Catalog grid */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">
          {allItems.length === 0 ? "No skills or commands available. Add a provider first." : "No items match your filters."}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((item) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
              <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    {item.type === "skill" ? (
                      <CodeIcon fontSize="small" color="primary" />
                    ) : (
                      <TerminalIcon fontSize="small" color="secondary" />
                    )}
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>{item.name}</Typography>
                    <Chip
                      label={item.type === "skill" ? "Skill" : "Command"}
                      size="small"
                      color={item.type === "skill" ? "primary" : "secondary"}
                      variant="outlined"
                    />
                  </Box>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{item.description}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Provider: {item.provider_slug} | ~{item.token_estimate.toLocaleString()} tokens
                  </Typography>
                  {item.installed && (
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={`Installed (${item.installed_scope})`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  {item.installed ? (
                    <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setUninstallItem(item)}>
                      Uninstall
                    </Button>
                  ) : (
                    <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={() => setInstallItem(item)}>
                      Install
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ---- Dialogs ---- */}

      {/* Add Provider Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Skill Provider</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="GitHub Source"
            placeholder="owner/repo"
            value={addSource}
            onChange={(e) => setAddSource(e.target.value)}
            sx={{ mt: 1 }}
            helperText='Enter "owner/repo" or a full GitHub URL'
          />
          <TextField
            fullWidth
            label="Branch"
            value={addBranch}
            onChange={(e) => setAddBranch(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddProvider} disabled={!addSource.trim() || addProvider.isPending}>
            {addProvider.isPending ? "Cloning..." : "Add Provider"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install Scope Dialog */}
      <Dialog open={!!installItem} onClose={() => setInstallItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Install {installItem?.type === "skill" ? "Skill" : "Command"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Install <strong>{installItem?.name}</strong> to:
          </Typography>
          <RadioGroup value={installScope} onChange={(e) => setInstallScope(e.target.value as "personal" | "project")}>
            <FormControlLabel value="personal" control={<Radio />} label="Personal (~/.claude/)" />
            <FormControlLabel value="project" control={<Radio />} label="Project (.claude/)" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleInstall} disabled={installSkill.isPending}>
            {installSkill.isPending ? "Installing..." : "Install"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Uninstall Confirmation Dialog */}
      <Dialog open={!!uninstallItem} onClose={() => setUninstallItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Uninstall {uninstallItem?.type === "skill" ? "Skill" : "Command"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to uninstall <strong>{uninstallItem?.name}</strong>? A backup will be created.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallItem(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleUninstall} disabled={uninstallSkill.isPending}>
            {uninstallSkill.isPending ? "Uninstalling..." : "Uninstall"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Provider Confirmation Dialog */}
      <Dialog open={!!removeSlug} onClose={() => setRemoveSlug(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Provider</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to remove provider <strong>{removeSlug}</strong>? Already installed skills will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveSlug(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRemoveProvider} disabled={removeProvider.isPending}>
            {removeProvider.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)} variant="filled">
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
