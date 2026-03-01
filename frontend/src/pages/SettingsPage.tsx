import { useState, useEffect } from "react";
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import { useSettings, useUpdateSettings } from "../api/settings";

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

  useEffect(() => {
    if (data) {
      const rows = Object.entries(data.env).map(([key, value]) => ({ key, value }));
      const initial = rows.length > 0 ? rows : [{ key: "", value: "" }];
      setEnvRows(initial);
      setSavedEnvRows(initial);
      setDangerousMode(data.skipDangerousModePermissionPrompt);
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
      for (const key of Object.keys(data.env)) {
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
      <Typography variant="h1" sx={{ mb: 0.5 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage environment variables and permissions
      </Typography>

      {/* Environment Variables */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h4">Environment Variables</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
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
