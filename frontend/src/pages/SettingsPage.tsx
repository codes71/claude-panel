import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Link,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useSettings, useUpdateSettings } from "../api/settings";
import { CLAUDE_ENV_CATALOG, ENV_CATALOG_CATEGORIES, DOC_URL } from "../data/claudeEnvCatalog";
import { filterClaudeEnvCatalog } from "../lib/envCatalogFilter";

interface EnvRow {
  key: string;
  value: string;
}

export default function SettingsPage() {
  const { data, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();

  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [savedEnvRows, setSavedEnvRows] = useState<EnvRow[]>([]);
  const [dangerousMode, setDangerousMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogPreviewOnly, setCatalogPreviewOnly] = useState(false);

  const filteredCatalog = useMemo(
    () =>
      filterClaudeEnvCatalog(CLAUDE_ENV_CATALOG, {
        search: catalogSearch,
        category: catalogCategory,
        previewOnly: catalogPreviewOnly,
      }),
    [catalogSearch, catalogCategory, catalogPreviewOnly],
  );

  useEffect(() => {
    if (data) {
      const rows = Object.entries(data.env ?? {}).map(([key, value]) => ({ key, value }));
      const initial = rows.length > 0 ? rows : [{ key: "", value: "" }];
      setEnvRows(initial);
      setSavedEnvRows(initial);
      setDangerousMode(data.skipDangerousModePermissionPrompt ?? false);
    }
  }, [data]);

  const envDirty = JSON.stringify(envRows) !== JSON.stringify(savedEnvRows);

  const addRow = () => setEnvRows([...envRows, { key: "", value: "" }]);

  const removeRow = (index: number) => {
    setEnvRows(envRows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: "key" | "value", val: string) => {
    setEnvRows(envRows.map((r, i) => (i === index ? { ...r, [field]: val } : r)));
  };

  const handleSaveEnv = () => {
    const envUpdates: { key: string; value: string | null }[] = envRows
      .filter((r) => r.key.trim() !== "")
      .map((r) => ({ key: r.key, value: r.value }));

    // Find deleted keys
    if (data) {
      const currentKeys = new Set(envUpdates.map((e) => e.key));
      for (const key of Object.keys(data.env ?? {})) {
        if (!currentKeys.has(key)) {
          envUpdates.push({ key, value: null });
        }
      }
    }

    updateSettings.mutate(
      { env: envUpdates },
      {
        onSuccess: () => {
          setSavedEnvRows([...envRows]);
          setToast({ msg: "Environment variables saved", severity: "success" });
        },
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const openCatalog = () => {
    setCatalogSearch("");
    setCatalogCategory("");
    setCatalogPreviewOnly(false);
    setCatalogOpen(true);
  };

  const applyCatalogEntry = (key: string) => {
    const exists = envRows.some((r) => r.key === key && r.key.trim() !== "");
    if (exists) {
      setToast({ msg: `${key} is already in the table`, severity: "error" });
      return;
    }
    const emptyIdx = envRows.findIndex((r) => r.key.trim() === "" && r.value.trim() === "");
    if (emptyIdx >= 0) {
      setEnvRows(envRows.map((r, i) => (i === emptyIdx ? { key, value: "" } : r)));
    } else {
      setEnvRows([...envRows, { key, value: "" }]);
    }
    setCatalogOpen(false);
    setToast({ msg: `Added ${key} — set value and Save`, severity: "success" });
  };

  const handleToggleDangerous = (checked: boolean) => {
    setDangerousMode(checked);
    updateSettings.mutate(
      { skipDangerousModePermissionPrompt: checked },
      {
        onSuccess: () => setToast({ msg: "Permission setting updated", severity: "success" }),
        onError: (e) => {
          setDangerousMode(!checked);
          setToast({ msg: (e as Error).message, severity: "error" });
        },
      },
    );
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load settings: {(error as Error).message}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Environment Variables */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h4">Environment Variables</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button size="small" startIcon={<MenuBookIcon />} onClick={openCatalog} variant="outlined">
                Add from catalog
              </Button>
              <Button size="small" startIcon={<AddIcon />} onClick={addRow} variant="outlined">
                Add
              </Button>
              <Button
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSaveEnv}
                variant="contained"
                disabled={updateSettings.isPending || !envDirty}
              >
                {envDirty ? "Save*" : "Save"}
              </Button>
            </Box>
          </Box>

          {isLoading ? (
            <Box>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {envRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ py: 0.5 }}>
                      <TextField
                        value={row.key}
                        onChange={(e) => updateRow(i, "key", e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="VARIABLE_NAME"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <TextField
                        value={row.value}
                        onChange={(e) => updateRow(i, "value", e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="value"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => removeRow(i)}
                        sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={catalogOpen} onClose={() => setCatalogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Claude Code environment variables</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Link href={DOC_URL} target="_blank" rel="noopener noreferrer" variant="body2">
            Official reference (opens in new tab)
          </Link>
          <TextField
            size="small"
            label="Search"
            placeholder="Key or description"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={catalogCategory || "__all__"}
              label="Category"
              onChange={(e) => setCatalogCategory(e.target.value === "__all__" ? "" : e.target.value)}
            >
              <MenuItem value="__all__">All categories</MenuItem>
              {ENV_CATALOG_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={catalogPreviewOnly}
                onChange={(_, v) => setCatalogPreviewOnly(v)}
                size="small"
              />
            }
            label="Preview and experimental only"
          />
          <Typography variant="caption" color="text.secondary">
            {filteredCatalog.length} variable{filteredCatalog.length !== 1 ? "s" : ""} shown
          </Typography>
          <List
            dense
            sx={{
              maxHeight: 360,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            {filteredCatalog.map((e) => (
              <ListItemButton key={e.key} onClick={() => applyCatalogEntry(e.key)}>
                <ListItemText
                  primary={
                    <Typography component="span" variant="body2" sx={{ fontFamily: "monospace" }}>
                      {e.key}
                      {e.tags?.includes("deprecated") ? " (deprecated)" : ""}
                    </Typography>
                  }
                  secondary={e.description.slice(0, 200) + (e.description.length > 200 ? "…" : "")}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatalogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Status Line Config (read-only) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Status Line
          </Typography>
          {isLoading ? (
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
          ) : data?.statusLine ? (
            <Box
              sx={{
                p: 2,
                bgcolor: "background.default",
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.8rem",
              }}
            >
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                Type
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                {data.statusLine.type}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                Command
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {data.statusLine.command || "(empty)"}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No status line configured
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Permissions
          </Typography>
          {isLoading ? (
            <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
          ) : (
            <FormControlLabel
              control={
                <Switch
                  checked={!dangerousMode}
                  onChange={(_, checked) => handleToggleDangerous(!checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Confirm before dangerous commands</Typography>
                  <Typography variant="body2" color="text.secondary">
                    When enabled, Claude Code asks for confirmation before running potentially
                    dangerous commands
                  </Typography>
                </Box>
              }
            />
          )}
        </CardContent>
      </Card>

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
