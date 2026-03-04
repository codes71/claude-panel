import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  FormControlLabel,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import StorefrontIcon from "@mui/icons-material/Storefront";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useMarketplace, useInstallPlugin, useUninstallPlugin, useAddProvider } from "../api/marketplace";
import type { MarketplacePlugin } from "../types";
import LoadingCard from "../components/LoadingCard";

export default function MarketplacePage() {
  const { data, isLoading, error } = useMarketplace();
  const installPlugin = useInstallPlugin();
  const uninstallPlugin = useUninstallPlugin();
  const addProvider = useAddProvider();

  const [search, setSearch] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [installTarget, setInstallTarget] = useState<MarketplacePlugin | null>(null);
  const [installScope, setInstallScope] = useState("user");
  const [uninstallTarget, setUninstallTarget] = useState<MarketplacePlugin | null>(null);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [addSource, setAddSource] = useState("");
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const plugins = data?.plugins ?? [];
  const marketplaces = data?.marketplaces ?? [];

  const categories = useMemo(
    () => [...new Set(plugins.map((p) => p.category).filter(Boolean))].sort(),
    [plugins],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plugins.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (marketplaceFilter && p.marketplace_id !== marketplaceFilter) {
        return false;
      }
      if (selectedCategories.size > 0 && !selectedCategories.has(p.category)) {
        return false;
      }
      return true;
    });
  }, [plugins, search, marketplaceFilter, selectedCategories]);

  const handleCategoryToggle = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleInstallClick = (plugin: MarketplacePlugin) => {
    setInstallScope("user");
    setInstallTarget(plugin);
  };

  const handleInstallConfirm = () => {
    if (!installTarget) return;
    installPlugin.mutate(
      { plugin_id: installTarget.plugin_id, scope: installScope },
      {
        onSuccess: (res) => {
          setToast({ msg: res.message || `${installTarget.name} installed`, severity: "success" });
          setInstallTarget(null);
        },
        onError: (e) => {
          setToast({ msg: (e as Error).message, severity: "error" });
          setInstallTarget(null);
        },
      },
    );
  };

  const handleUninstallClick = (plugin: MarketplacePlugin) => {
    setUninstallTarget(plugin);
  };

  const handleUninstallConfirm = () => {
    if (!uninstallTarget) return;
    uninstallPlugin.mutate(uninstallTarget.plugin_id, {
      onSuccess: (res) => {
        setToast({
          msg: res.message || `${uninstallTarget.name} uninstalled`,
          severity: "success",
        });
        setUninstallTarget(null);
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
        setUninstallTarget(null);
      },
    });
  };

  const handleAddSourceConfirm = () => {
    if (!addSource.trim()) return;
    addProvider.mutate(addSource.trim(), {
      onSuccess: (res) => {
        setToast({ msg: res.message || "Source added", severity: "success" });
        setAddSourceOpen(false);
        setAddSource("");
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
      },
    });
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load marketplace: {(error as Error).message}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5, flexWrap: "wrap" }}>
        <Typography variant="h1">Marketplace</Typography>
        {data && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip label={`${data.total_available} available`} size="small" variant="outlined" />
            <Chip
              label={`${data.total_installed} installed`}
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>
        )}
        <Box sx={{ ml: "auto" }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => { setAddSource(""); setAddSourceOpen(true); }}
          >
            Add Source
          </Button>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Browse and install Claude Code plugins
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ maxWidth: 320 }}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Marketplace</InputLabel>
          <Select
            value={marketplaceFilter}
            label="Marketplace"
            onChange={(e) => setMarketplaceFilter(e.target.value)}
          >
            <MenuItem value="">All Marketplaces</MenuItem>
            {marketplaces.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {categories.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              variant={selectedCategories.has(cat) ? "filled" : "outlined"}
              color={selectedCategories.has(cat) ? "primary" : "default"}
              onClick={() => handleCategoryToggle(cat)}
              sx={{ cursor: "pointer" }}
            />
          ))}
        </Box>
      )}

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <LoadingCard />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {search || marketplaceFilter || selectedCategories.size > 0
            ? "No plugins match your filters."
            : "No plugins available."}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid key={p.plugin_id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Typography variant="h5">{p.name}</Typography>
                        <Chip label={p.version} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                        <Chip
                          icon={<StorefrontIcon sx={{ fontSize: 14 }} />}
                          label={p.marketplace_id}
                          size="small"
                          sx={{
                            bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                            color: "primary.main",
                            "& .MuiChip-icon": { color: "primary.main" },
                          }}
                        />
                        {p.category && (
                          <Chip label={p.category} size="small" variant="outlined" />
                        )}
                        {p.installed && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                            label="Installed"
                            size="small"
                            color="success"
                          />
                        )}
                        {p.enabled && (
                          <Chip label="Enabled" size="small" color="primary" />
                        )}
                      </Box>
                    </Box>
                    {p.homepage && (
                      <IconButton
                        size="small"
                        component="a"
                        href={p.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "text.secondary" }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.description}
                  </Typography>

                  {p.installed && ((p.skills ?? []).length > 0 || (p.agents ?? []).length > 0 || (p.commands ?? []).length > 0) && (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                      {(p.skills ?? []).length > 0 && (
                        <Chip
                          label={`${(p.skills ?? []).length} skill${(p.skills ?? []).length !== 1 ? "s" : ""}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {(p.agents ?? []).length > 0 && (
                        <Chip
                          label={`${(p.agents ?? []).length} agent${(p.agents ?? []).length !== 1 ? "s" : ""}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {(p.commands ?? []).length > 0 && (
                        <Chip
                          label={`${(p.commands ?? []).length} command${(p.commands ?? []).length !== 1 ? "s" : ""}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {p.author}
                      </Typography>
                      {p.installed && p.installed_scope && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({p.installed_scope})
                        </Typography>
                      )}
                    </Box>
                    {p.installed ? (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleUninstallClick(p)}
                        disabled={uninstallPlugin.isPending}
                      >
                        Uninstall
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleInstallClick(p)}
                        disabled={installPlugin.isPending}
                      >
                        Install
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={!!installTarget} onClose={() => setInstallTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Install {installTarget?.name}</DialogTitle>
        <DialogContent>
          <RadioGroup value={installScope} onChange={(e) => setInstallScope(e.target.value)}>
            <FormControlLabel
              value="user"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">User</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Recommended - available everywhere
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="project"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">Project</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Server working directory only
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInstallConfirm}
            disabled={installPlugin.isPending}
            startIcon={installPlugin.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!uninstallTarget}
        onClose={() => setUninstallTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Uninstall {uninstallTarget?.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to uninstall this plugin? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleUninstallConfirm}
            disabled={uninstallPlugin.isPending}
            startIcon={uninstallPlugin.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Uninstall
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addSourceOpen} onClose={() => setAddSourceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Marketplace Source</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="GitHub Repository"
            placeholder="owner/repo"
            helperText="Enter a GitHub repository that provides plugins (e.g., anthropics/claude-plugins)"
            value={addSource}
            onChange={(e) => setAddSource(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSourceConfirm(); }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddSourceOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddSourceConfirm}
            disabled={!addSource.trim() || addProvider.isPending}
            startIcon={addProvider.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
