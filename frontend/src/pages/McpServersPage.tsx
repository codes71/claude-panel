import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TerminalIcon from "@mui/icons-material/Terminal";
import WifiIcon from "@mui/icons-material/Wifi";
import {
  useMcpServers,
  useToggleMcpServer,
  useCreateMcpServer,
  useDeleteMcpServer,
  useUpdateMcpServer,
  useProjectPaths,
} from "../api/mcp";
import type { McpServer } from "../types";
import McpServerCard from "../components/McpServerCard";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingCard from "../components/LoadingCard";

type DialogMode = "create" | "edit" | null;

export default function McpServersPage() {
  const { data, isLoading, error } = useMcpServers();
  const { data: projectData } = useProjectPaths();
  const servers = data?.servers ?? [];
  const projectPaths = projectData?.projects ?? [];
  const globalServers = servers.filter((server) => server.scope === "global");
  const projectServers = servers.filter((server) => server.scope === "project");
  const pluginServers = servers.filter((server) => server.scope === "plugin");
  const toggleServer = useToggleMcpServer();
  const createServer = useCreateMcpServer();
  const deleteServer = useDeleteMcpServer();
  const updateServer = useUpdateMcpServer();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formServerType, setFormServerType] = useState<"stdio" | "http">("stdio");
  const [formCommand, setFormCommand] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formArgs, setFormArgs] = useState("");
  const [formEnv, setFormEnv] = useState("");
  const [formScope, setFormScope] = useState<"global" | "project">("global");
  const [formProjectPath, setFormProjectPath] = useState("");

  const openCreate = () => {
    resetForm();
    setDialogMode("create");
  };

  const openEdit = (server: McpServer) => {
    setDialogMode("edit");
    setEditingName(server.name);
    setFormName(server.name);
    setFormServerType(server.server_type === "http" ? "http" : "stdio");
    setFormCommand(server.command ?? "");
    setFormUrl(server.url ?? "");
    setFormArgs(server.args.join("\n"));
    setFormEnv(
      Object.entries(server.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n"),
    );
    setFormScope(server.scope === "project" ? "project" : "global");
    setFormProjectPath(server.project_path ?? "");
  };

  const resetForm = () => {
    setDialogMode(null);
    setEditingName(null);
    setFormName("");
    setFormServerType("stdio");
    setFormCommand("");
    setFormUrl("");
    setFormArgs("");
    setFormEnv("");
    setFormScope("global");
    setFormProjectPath("");
  };

  const parseEnv = (raw: string): Record<string, string> => {
    if (!raw.trim()) return {};
    try {
      return Object.fromEntries(
        raw
          .split("\n")
          .filter((l) => l.includes("="))
          .map((l) => {
            const idx = l.indexOf("=");
            return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
          }),
      );
    } catch {
      return {};
    }
  };

  const parseArgs = (raw: string): string[] =>
    raw
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

  const handleToggle = (name: string, enabled: boolean) => {
    toggleServer.mutate(
      { name, enabled },
      {
        onSuccess: () =>
          setToast({ msg: `${name} ${enabled ? "enabled" : "disabled"}`, severity: "success" }),
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteServer.mutate(deleteTarget, {
      onSuccess: () => {
        setToast({ msg: `${deleteTarget} deleted`, severity: "success" });
        setDeleteTarget(null);
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
        setDeleteTarget(null);
      },
    });
  };

  const handleSubmit = () => {
    const env = parseEnv(formEnv);
    const args = parseArgs(formArgs);

    if (dialogMode === "create") {
      createServer.mutate(
        {
          name: formName,
          server_type: formServerType,
          command: formServerType === "stdio" ? formCommand : undefined,
          url: formServerType === "http" ? formUrl : undefined,
          args: formServerType === "stdio" ? args : undefined,
          env,
          scope: formScope,
          project_path: formScope === "project" ? formProjectPath : null,
        },
        {
          onSuccess: () => {
            setToast({ msg: `${formName} created`, severity: "success" });
            resetForm();
          },
          onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
        },
      );
    } else if (dialogMode === "edit" && editingName) {
      updateServer.mutate(
        {
          name: editingName,
          data: {
            new_name: formName !== editingName ? formName : undefined,
            server_type: formServerType,
            command: formServerType === "stdio" ? formCommand : undefined,
            url: formServerType === "http" ? formUrl : undefined,
            args: formServerType === "stdio" ? args : undefined,
            env,
            scope: formScope,
            project_path: formScope === "project" ? formProjectPath : null,
          },
        },
        {
          onSuccess: () => {
            setToast({ msg: `${formName} updated`, severity: "success" });
            resetForm();
          },
          onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
        },
      );
    }
  };

  const isFormValid =
    formName.trim() &&
    (formServerType === "stdio" ? formCommand.trim() : formUrl.trim()) &&
    (formScope === "project" ? formProjectPath : true);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load MCP servers: {(error as Error).message}</Alert>
      </Box>
    );
  }

  const renderSection = (title: string, items: typeof servers, badge: string) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h4">{title}</Typography>
        <Chip label={badge} size="small" variant="outlined" />
      </Box>
      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <LoadingCard />
            </Grid>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No servers configured
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map((s) => (
            <Grid key={`${s.scope}:${s.project_path ?? ""}:${s.name}`} size={{ xs: 12, md: 6 }}>
              <McpServerCard
                server={s}
                onToggle={handleToggle}
                onDelete={setDeleteTarget}
                onEdit={openEdit}
                toggling={toggleServer.isPending}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Server
        </Button>
      </Box>

      {renderSection("Global MCP Servers", globalServers, "~/.claude.json")}
      {renderSection("Project MCP Servers", projectServers, "projects[*].mcpServers")}
      {pluginServers.length > 0 && renderSection("Plugin MCP Servers", pluginServers, "plugins")}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === "edit" ? "Edit Server" : "Add MCP Server"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Server Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            fullWidth
            size="small"
          />

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", mb: 0.5, display: "block" }}>
              Server Type
            </Typography>
            <ToggleButtonGroup
              value={formServerType}
              exclusive
              onChange={(_, val) => val && setFormServerType(val)}
              size="small"
              fullWidth
            >
              <ToggleButton value="stdio">
                <TerminalIcon sx={{ fontSize: 16, mr: 0.5 }} /> stdio
              </ToggleButton>
              <ToggleButton value="http">
                <WifiIcon sx={{ fontSize: 16, mr: 0.5 }} /> http
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {formServerType === "stdio" ? (
            <>
              <TextField
                label="Command"
                value={formCommand}
                onChange={(e) => setFormCommand(e.target.value)}
                fullWidth
                size="small"
                placeholder="npx -y @modelcontextprotocol/server-name"
              />
              <TextField
                label="Arguments (one per line)"
                value={formArgs}
                onChange={(e) => setFormArgs(e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={3}
                placeholder={"--port\n3000"}
              />
            </>
          ) : (
            <TextField
              label="URL"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://example.com/mcp"
            />
          )}

          <TextField
            label="Environment Variables (KEY=VALUE, one per line)"
            value={formEnv}
            onChange={(e) => setFormEnv(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder={"API_KEY=your-key\nDEBUG=true"}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Scope</InputLabel>
            <Select
              value={formScope === "project" ? `project:${formProjectPath}` : "global"}
              label="Scope"
              onChange={(e) => {
                const val = e.target.value;
                if (val === "global") {
                  setFormScope("global");
                  setFormProjectPath("");
                } else if (val.startsWith("project:")) {
                  setFormScope("project");
                  setFormProjectPath(val.slice("project:".length));
                }
              }}
              renderValue={(selected) => {
                if (selected === "global") return "Global";
                const path = selected.replace("project:", "");
                return `Project: ${path.split("/").pop()}`;
              }}
            >
              <MenuItem value="global">Global</MenuItem>
              {projectPaths.map((p) => (
                <MenuItem key={p} value={`project:${p}`}>
                  <Typography
                    sx={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.8rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={resetForm} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isFormValid || createServer.isPending || updateServer.isPending}
          >
            {dialogMode === "edit" ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete MCP Server"
        message={`Are you sure you want to remove "${deleteTarget}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

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
