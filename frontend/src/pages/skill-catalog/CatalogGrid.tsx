import { useState, useEffect } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  InputAdornment,
  Pagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CodeIcon from "@mui/icons-material/Code";
import TerminalIcon from "@mui/icons-material/Terminal";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  useSkillCatalog,
  useInstallSkill,
  useUninstallSkill,
} from "../../api/skillProviders";
import type { CatalogItem, SkillProviderInfo } from "../../types";

interface CatalogGridProps {
  providers: SkillProviderInfo[];
  toast: (msg: string, severity: "success" | "error") => void;
}

export default function CatalogGrid({ providers, toast }: CatalogGridProps) {
  const installSkill = useInstallSkill();
  const uninstallSkill = useUninstallSkill();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "skills" | "commands">("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [installItem, setInstallItem] = useState<CatalogItem | null>(null);
  const [installScope, setInstallScope] = useState<"personal" | "project">("personal");
  const [uninstallItem, setUninstallItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, providerFilter]);

  const catalogQuery = useSkillCatalog({
    page,
    pageSize: 48,
    search: debouncedSearch,
    provider: providerFilter !== "all" ? providerFilter : "",
    type: typeFilter === "all" ? "all" : typeFilter === "skills" ? "skill" : "command",
  });
  const catalogData = catalogQuery.data;
  const catalogLoading = catalogQuery.isLoading;

  const handleInstall = () => {
    if (!installItem) return;
    installSkill.mutate(
      { item_id: installItem.id, scope: installScope },
      {
        onSuccess: (res) => {
          toast(res.message || `Installed to ${res.installed_path}`, "success");
          setInstallItem(null);
          setInstallScope("personal");
        },
        onError: (e: any) => toast(e.detail || e.message || "Install failed", "error"),
      },
    );
  };

  const handleUninstall = () => {
    if (!uninstallItem) return;
    uninstallSkill.mutate(
      { item_id: uninstallItem.id, scope: "" },
      {
        onSuccess: (res) => {
          toast(res.message || `Uninstalled: ${uninstallItem.name}`, "success");
          setUninstallItem(null);
        },
        onError: (e: any) =>
          toast(e.detail || e.message || "Uninstall failed", "error"),
      },
    );
  };

  return (
    <>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="h6">Catalog</Typography>
        {catalogData && (
          <Chip label={`${catalogData.total} items`} size="small" variant="outlined" />
        )}
        {catalogQuery.isFetching && !catalogLoading && <CircularProgress size={16} />}
      </Box>

      {/* Filter bar */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="Search skills and commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 250 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
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
            <Select
              value={providerFilter}
              label="Provider"
              onChange={(e) => setProviderFilter(e.target.value)}
            >
              <MenuItem value="all">All Providers</MenuItem>
              {providers.map((p) => (
                <MenuItem key={p.slug} value={p.slug}>
                  {p.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Catalog grid */}
      {catalogLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : !catalogData || (catalogData?.items ?? []).length === 0 ? (
        <Alert severity="info">
          {!catalogData || catalogData.total === 0
            ? "No skills or commands available. Add a provider first."
            : "No items match your filters."}
        </Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            {(catalogData?.items ?? []).map((item) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
                <Card
                  variant="outlined"
                  sx={{ height: "100%", display: "flex", flexDirection: "column" }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      {item.item_type === "skill" ? (
                        <CodeIcon fontSize="small" color="primary" />
                      ) : (
                        <TerminalIcon fontSize="small" color="secondary" />
                      )}
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                        {item.name}
                      </Typography>
                      <Chip
                        label={item.item_type === "skill" ? "Skill" : "Command"}
                        size="small"
                        color={item.item_type === "skill" ? "primary" : "secondary"}
                        variant="outlined"
                      />
                    </Box>
                    {item.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Provider: {item.provider_slug}
                      {item.category ? ` | ${item.category}` : ""}
                      {item.token_estimate
                        ? ` | ~${item.token_estimate.toLocaleString()} tokens`
                        : ""}
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
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => setUninstallItem(item)}
                      >
                        Uninstall
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => setInstallItem(item)}
                      >
                        Install
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          {catalogData.total_pages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={catalogData.total_pages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Install Scope Dialog */}
      <Dialog
        open={!!installItem}
        onClose={() => setInstallItem(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Install {installItem?.item_type === "skill" ? "Skill" : "Command"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Install <strong>{installItem?.name}</strong> to:
          </Typography>
          <RadioGroup
            value={installScope}
            onChange={(e) => setInstallScope(e.target.value as "personal" | "project")}
          >
            <FormControlLabel
              value="personal"
              control={<Radio />}
              label="Personal (~/.claude/)"
            />
            <FormControlLabel
              value="project"
              control={<Radio />}
              label="Project (.claude/)"
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallItem(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInstall}
            disabled={installSkill.isPending}
          >
            {installSkill.isPending ? "Installing..." : "Install"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Uninstall Confirmation Dialog */}
      <Dialog
        open={!!uninstallItem}
        onClose={() => setUninstallItem(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Uninstall {uninstallItem?.item_type === "skill" ? "Skill" : "Command"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to uninstall <strong>{uninstallItem?.name}</strong>? A
            backup will be created.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallItem(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleUninstall}
            disabled={uninstallSkill.isPending}
          >
            {uninstallSkill.isPending ? "Uninstalling..." : "Uninstall"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
